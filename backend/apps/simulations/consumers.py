import asyncio
import logging
from datetime import timedelta

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from .orchestrator import (
    ScenarioOrchestrator,
    MissionNotFound,
    UnauthorizedAction,
    MissionAlreadyComplete,
    PhaseTimedOut,
)
from .models import IncidentRun, MissionParticipant
from .state_machine import MissionStateMachine

logger = logging.getLogger(__name__)


class MissionConsumer(AsyncJsonWebsocketConsumer):
    """
    Real-time mission state channel for simulation runs.
    URL: ws/mission/<run_id>/
    Auth: JWT token in ?token= query string
    Group: mission_{run_id}

    This is SEPARATE from MeetingConsumer — it handles incident
    state only, not WebRTC.
    """

    async def connect(self):
        """
        Authenticate, ensure MissionParticipant (fallback if HTTP join was skipped),
        join channel group, send state_snapshot, broadcast roster/state to the group.
        """
        self.user = await self.get_user_from_token()
        if not self.user or isinstance(self.user, AnonymousUser):
            await self.close(code=4001)
            return

        run_id = self.scope['url_route']['kwargs']['run_id']
        self.run = await self.get_run(run_id)
        if not self.run:
            await self.close(code=4004)
            return

        orchestrator = ScenarioOrchestrator()
        try:
            await database_sync_to_async(orchestrator.join_mission)(
                str(run_id), self.user, 'support_operator'
            )
        except MissionAlreadyComplete:
            logger.info(
                'mission.ws_connect_denied_ended run_id=%s user_id=%s',
                run_id,
                self.user.pk,
            )
            await self.close(code=4005)
            return
        except MissionNotFound:
            await self.close(code=4004)
            return

        self.participant = await self.get_participant(run_id, self.user.id)
        if not self.participant:
            await self.close(code=4004)
            return

        self.run_id = str(run_id)
        self.group_name = f'mission_{self.run_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        state = await database_sync_to_async(orchestrator.get_current_state)(self.run_id)
        await self.send_json({'type': 'state_snapshot', 'data': state})

        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'mission_event',
                'event': {
                    'event_type': 'participant_joined',
                    'username': self.user.username,
                    'user_id': self.user.pk,
                },
            },
        )

        self._timer_task = asyncio.create_task(self._schedule_timer_warning())
        logger.info(
            'mission.ws_connected run_id=%s user_id=%s',
            self.run_id,
            self.user.pk,
        )

    async def disconnect(self, code):
        """
        Stamp presence offline (last_heartbeat), notify group, push updated mission state,
        then leave the channel group.
        """
        try:
            if hasattr(self, '_timer_task') and self._timer_task:
                self._timer_task.cancel()
        except Exception:
            pass

        if hasattr(self, 'run_id') and hasattr(self, 'user'):
            await self.mark_participant_disconnected(self.run_id, self.user.id)
            try:
                await self.channel_layer.group_send(
                    f'mission_{self.run_id}',
                    {
                        'type': 'mission_event',
                        'event': {
                            'event_type': 'participant_left',
                            'username': self.user.username,
                            'user_id': self.user.pk,
                        },
                    },
                )
            except Exception:
                pass
            try:
                ScenarioOrchestrator().broadcast_mission_state_update(self.run_id)
            except Exception:
                logger.exception('mission.ws_disconnect_broadcast_failed run_id=%s', self.run_id)
            logger.info(
                'mission.ws_disconnected run_id=%s user_id=%s code=%s',
                self.run_id,
                self.user.pk,
                code,
            )

        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        """
        Route incoming WS messages by content['type']:
          'submit_action'           → handle_submit_action(content)
          'acknowledge_briefing'    → handle_acknowledge_briefing(content)
          'request_hint'            → handle_request_hint(content)
          'abandon'                 → handle_abandon(content)
          'supervisor_intervention' → handle_supervisor_intervention(content)
          'get_state'               → send state to this connection only
          unknown type              → send error message back
        """
        try:
            msg_type = (content or {}).get('type')
            handlers = {
                'submit_action': self.handle_submit_action,
                'acknowledge_briefing': self.handle_acknowledge_briefing,
                'request_hint': self.handle_request_hint,
                'abandon': self.handle_abandon,
                'supervisor_intervention': self.handle_supervisor_intervention,
                'get_state': self._handle_get_state,
                'heartbeat': self.handle_heartbeat,
                'ping': self.handle_heartbeat,
            }
            handler = handlers.get(msg_type)
            if handler:
                await handler(content or {})
            else:
                await self.send_json({'type': 'error', 'message': 'Unknown message type'})
        except Exception as e:
            logger.error(f"Error handling message: {e}")

    async def handle_submit_action(self, content):
        """
        1. Call orchestrator.submit_action() via database_sync_to_async
        2. On PhaseTimedOut exception: send timeout message to group
        3. On UnauthorizedAction: send error to this connection only
        4. On success: result is already broadcast by orchestrator
           — also send personal confirmation to this connection
        """
        orchestrator = ScenarioOrchestrator()
        payload = content.get('payload') or content
        try:
            result = await database_sync_to_async(orchestrator.submit_action)(
                self.run_id, self.user, payload
            )
        except PhaseTimedOut:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'mission_event',
                    'event': {'event_type': 'timeout_occurred', 'phase': getattr(self.run, 'phase', None)},
                }
            )
            return
        except UnauthorizedAction:
            await self.send_json({'type': 'error', 'message': 'Unauthorized'})
            return
        except (MissionNotFound, MissionAlreadyComplete) as e:
            await self.send_json({'type': 'error', 'message': str(e)})
            return

        await self.send_json({'type': 'action_received', 'data': result})

    async def handle_supervisor_intervention(self, content):
        """
        1. Verify self.user.role in ['supervisor', 'admin']
           If not: send {'type': 'error', 'message': 'Unauthorized'}
           and close with code 4003
        2. Call orchestrator.apply_supervisor_intervention()
        3. Result is broadcast by orchestrator
        """
        if getattr(self.user, 'role', None) not in ['supervisor', 'admin']:
            await self.send_json({'type': 'error', 'message': 'Unauthorized'})
            await self.close(code=4003)
            return

        orchestrator = ScenarioOrchestrator()
        intervention_type = content.get('intervention_type') or (content.get('payload') or {}).get('type')
        data = content.get('data') or (content.get('payload') or {}).get('data') or {}
        await database_sync_to_async(orchestrator.apply_supervisor_intervention)(
            self.run_id, self.user, intervention_type, data
        )

    async def handle_acknowledge_briefing(self, content):
        """Call orchestrator.acknowledge_briefing() and send result"""
        orchestrator = ScenarioOrchestrator()
        result = await database_sync_to_async(orchestrator.acknowledge_briefing)(self.run_id, self.user)
        await self.send_json({'type': 'acknowledge_result', 'data': result})

    async def handle_request_hint(self, content):
        """Call orchestrator.request_hint() and send result"""
        orchestrator = ScenarioOrchestrator()
        result = await database_sync_to_async(orchestrator.request_hint)(self.run_id, self.user)
        await self.send_json({'type': 'hint', 'data': result})

    async def handle_abandon(self, content):
        """Call orchestrator.abandon_mission() and send result"""
        orchestrator = ScenarioOrchestrator()
        result = await database_sync_to_async(orchestrator.abandon_mission)(self.run_id, self.user)
        await self.send_json({'type': 'abandoned', 'data': result})

    async def _handle_get_state(self, content):
        """Send current state snapshot to this connection only."""
        orchestrator = ScenarioOrchestrator()
        state = await database_sync_to_async(orchestrator.get_current_state)(self.run_id)
        await self.send_json({'type': 'state_snapshot', 'data': state})

    async def handle_heartbeat(self, content):
        """Refresh last_heartbeat; optional light broadcast for presence UIs."""
        orchestrator = ScenarioOrchestrator()
        await database_sync_to_async(orchestrator.touch_participant_heartbeat)(
            self.run_id, self.user
        )
        await self.send_json({'type': 'heartbeat_ack', 'ok': True})

    async def _schedule_timer_warning(self):
        """
        Background task that schedules a timer warning when 15 seconds remain.
        """
        try:
            run = await self.get_run(self.run_id)
            if not run:
                return
            sm = MissionStateMachine(run.phase)
            remaining = sm.get_time_remaining(run.phase_started_at)
            if remaining is None:
                return
            if remaining <= 15:
                await self.channel_layer.group_send(
                    self.group_name,
                    {'type': 'timer_warning', 'seconds_remaining': int(remaining), 'phase': run.phase}
                )
                return
            await asyncio.sleep(max(0, remaining - 15))
            run = await self.get_run(self.run_id)
            if not run:
                return
            await self.channel_layer.group_send(
                self.group_name,
                {'type': 'timer_warning', 'seconds_remaining': 15, 'phase': run.phase}
            )
        except asyncio.CancelledError:
            return
        except Exception:
            return

    # --- Channel layer broadcast receivers ---
    # These are called by the orchestrator via channel_layer.group_send()
    # They forward the message to the WebSocket client

    async def mission_event(self, event):
        """Forward any IncidentEvent to all group members."""
        await self.send_json({'type': 'mission_event', 'event': event['event']})

    async def state_update(self, event):
        """Send full state snapshot to all group members."""
        await self.send_json({'type': 'state_update', 'data': event['data']})

    async def participants_updated(self, event):
        """Roster-only refresh for clients that prefer a smaller payload."""
        await self.send_json(
            {
                'type': 'participants_updated',
                'participants': event.get('participants') or [],
            }
        )

    async def timer_warning(self, event):
        """
        Broadcast when 15 seconds remain in current phase.
        Orchestrator calls this — also set up a background task
        in connect() to trigger this at the right time.
        """
        await self.send_json(
            {
                'type': 'timer_warning',
                'seconds_remaining': event['seconds_remaining'],
                'phase': event['phase'],
            }
        )

    # =========================================================================
    # DATABASE HELPERS (JWT pattern copied from meetings consumer)
    # =========================================================================

    @database_sync_to_async
    def get_user_from_token(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            qs = self.scope['query_string'].decode()
            params = dict(p.split('=') for p in qs.split('&') if '=' in p)
            token = params.get('token')
            if not token:
                return AnonymousUser()
            payload = AccessToken(token)
            return User.objects.get(id=payload['user_id'])
        except Exception:
            return AnonymousUser()

    @database_sync_to_async
    def get_run(self, run_id):
        try:
            return IncidentRun.objects.select_related('scenario').get(id=run_id)
        except IncidentRun.DoesNotExist:
            return None

    @database_sync_to_async
    def get_participant(self, run_id, user_id):
        try:
            return MissionParticipant.objects.select_related('user').get(run_id=run_id, user_id=user_id)
        except MissionParticipant.DoesNotExist:
            return None

    @database_sync_to_async
    def mark_participant_disconnected(self, run_id, user_id):
        """
        Mark WebSocket presence as stale (does not remove mission membership).
        """
        try:
            stale = timezone.now() - timedelta(seconds=120)
            MissionParticipant.objects.filter(run_id=run_id, user_id=user_id).update(
                last_heartbeat=stale
            )
        except Exception:
            return

