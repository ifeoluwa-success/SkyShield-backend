import logging
from datetime import datetime, timezone, timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Avg, Q

from .engine import SimulationEngine
from .state_machine import MissionStateMachine, PHASE_TIME_LIMITS, VALID_TRANSITIONS
from .models import IncidentRun, MissionParticipant, IncidentEvent, ThreatNode, Scenario
from apps.analytics.models import UserPerformance, SkillAssessment, PerformanceTrend
from apps.simulations.models import UserDecision, SimulationSession


class MissionNotFound(Exception):
    pass


class InvalidPhaseTransition(Exception):
    pass


class UnauthorizedAction(Exception):
    pass


class MissionAlreadyComplete(Exception):
    pass


class PhaseTimedOut(Exception):
    pass


logger = logging.getLogger(__name__)

MISSION_PARTICIPANT_ROLES = frozenset(
    {'lead_operator', 'support_operator', 'observer', 'supervisor'}
)


class ScenarioOrchestrator:
    """
    High-level coordinator that manages IncidentRun lifecycle,
    participants, phase transitions, broadcasts, and scoring.
    """

    def start_mission(self, scenario_id, user, use_genie=False, operator_role='lead_operator'):
        """
        Start a new mission run for a scenario (optionally via Genie scenario generation).

        Returns a payload containing run id, briefing narrative, time limits, first step, and ws URL.
        """
        try:
            scenario = Scenario.objects.get(id=scenario_id)
        except Scenario.DoesNotExist as exc:
            raise MissionNotFound("Scenario not found") from exc

        gen = None
        if use_genie:
            from .genie_service import GenieScenarioGenerator
            gen = GenieScenarioGenerator()
            steps_data = gen.generate_incident(scenario.threat_type, scenario.difficulty, 'airport')

            scenario = Scenario.objects.create(
                title=steps_data.get('title') or f"{scenario.title} (Genie)",
                description=steps_data.get('description') or scenario.description,
                category=steps_data.get('category') or scenario.category,
                threat_type=steps_data.get('threat_type') or scenario.threat_type,
                difficulty=steps_data.get('difficulty') or scenario.difficulty,
                initial_state=steps_data.get('initial_state') or scenario.initial_state,
                steps=steps_data.get('steps') or scenario.steps,
                correct_actions=steps_data.get('correct_actions') or scenario.correct_actions,
                hints=steps_data.get('hints') or scenario.hints,
                learning_objectives=steps_data.get('learning_objectives') or scenario.learning_objectives,
                estimated_time=int(steps_data.get('estimated_time') or scenario.estimated_time),
                points_possible=int(steps_data.get('points_possible') or scenario.points_possible),
                passing_score=int(steps_data.get('passing_score') or scenario.passing_score),
                max_attempts=int(steps_data.get('max_attempts') or scenario.max_attempts),
                graph=steps_data.get('graph') or {},
                escalation_rules=steps_data.get('escalation_rules') or [],
                is_genie_generated=True,
            )

        run = IncidentRun.objects.create(
            scenario=scenario,
            phase='briefing',
            status='in_progress',
            session_state={'current_step': 0, 'current_score': 0, 'decisions': [], 'hints_used': 0},
            phase_started_at=None,
            is_genie_generated=bool(use_genie),
            genie_scenario_data={},
        )

        MissionParticipant.objects.create(
            run=run,
            user=user,
            role=operator_role,
            last_heartbeat=datetime.now(timezone.utc),
        )

        IncidentEvent.objects.create(
            run=run,
            event_type='participant_joined',
            actor=user,
            payload={'role': operator_role},
        )

        if use_genie and gen is not None:
            briefing = gen.generate_briefing_narrative(scenario, operator_role)
        else:
            briefing = scenario.description

        steps = scenario.steps or []
        first_step = steps[0] if steps else None

        return {
            'run_id': str(run.id),
            'briefing_narrative': briefing,
            'time_limits': PHASE_TIME_LIMITS,
            'first_step': first_step,
            'ws_url': f'/ws/mission/{run.id}/',
        }

    def acknowledge_briefing(self, run_id, user):
        """
        Mark a participant as ready and, if all are ready, transition run to detection and broadcast it.
        """
        try:
            run = IncidentRun.objects.select_related('scenario').get(id=run_id)
        except IncidentRun.DoesNotExist as exc:
            raise MissionNotFound("Mission run not found") from exc

        try:
            participant = MissionParticipant.objects.get(run=run, user=user)
        except MissionParticipant.DoesNotExist as exc:
            raise UnauthorizedAction("User is not a mission participant") from exc

        participant.is_ready = True
        participant.save()

        all_ready = not MissionParticipant.objects.filter(run=run, is_ready=False).exists()
        sm = MissionStateMachine(run.phase)

        if all_ready:
            prev = run.phase
            run.phase = 'detection'
            run.phase_started_at = datetime.now(timezone.utc)
            run.save()

            event = IncidentEvent.objects.create(
                run=run,
                event_type='phase_changed',
                actor=user,
                payload={'from': prev, 'to': run.phase},
            )

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'mission_{run_id}',
                {'type': 'mission_event', 'event': self._serialize_event(event)},
            )

        return {
            'run_id': str(run.id),
            'phase': run.phase,
            'time_remaining': sm.get_time_remaining(run.phase_started_at),
            'all_ready': bool(all_ready),
        }

    def submit_action(self, run_id, user, action_payload):
        """
        Validate and process an action submission, then broadcast the resulting event.
        """
        try:
            run = (
                IncidentRun.objects.select_related('scenario')
                .prefetch_related('mission_participants', 'events')
                .get(id=run_id)
            )
        except IncidentRun.DoesNotExist as exc:
            raise MissionNotFound("Mission run not found") from exc

        if run.status in ['completed', 'failed', 'abandoned']:
            raise MissionAlreadyComplete("Mission is already complete")

        if not MissionParticipant.objects.filter(run=run, user=user).exists():
            raise UnauthorizedAction("User is not authorized for this mission")

        sm = MissionStateMachine(run.phase)
        if sm.is_timed_out(run.phase_started_at):
            self.handle_timeout(run)
            raise PhaseTimedOut("Phase timed out before action submitted")

        engine = SimulationEngine()
        action_payload = dict(action_payload or {})
        action_payload['user'] = user
        event = engine.apply_action(run, action_payload)

        steps = run.scenario.steps or []
        current_step_idx = int((run.session_state or {}).get('current_step', 0) or 0)
        if current_step_idx >= len(steps):
            # Timeout can set phase to review without finalize; repair on next action.
            if run.phase == 'review' and run.status == 'in_progress':
                self.finalize_mission(run)
            else:
                allowed = VALID_TRANSITIONS.get(run.phase) or []
                if allowed:
                    next_phase = allowed[0]
                    if next_phase != run.phase:
                        self.advance_phase(run, next_phase)

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'mission_{run_id}',
            {'type': 'mission_event', 'event': self._serialize_event(event)},
        )

        return {
            'event': self._serialize_event(event),
            'current_state': self.get_current_state(run_id),
            'time_remaining': sm.get_time_remaining(run.phase_started_at),
            'score_so_far': (run.session_state or {}).get('current_score', 0),
        }

    def handle_timeout(self, run):
        """
        Record a timeout, apply penalties, force phase transition, broadcast, and save the run.
        """
        run_id = str(run.id)

        timeout_event = IncidentEvent.objects.create(
            run=run,
            event_type='timeout_occurred',
            actor=None,
            payload={'phase': run.phase},
        )

        state = run.session_state or {}
        current_score = float(state.get('current_score', 0) or 0)
        state['current_score'] = current_score - 20.0
        run.session_state = state

        if run.phase == 'detection':
            forced_next = 'review'
        else:
            allowed = VALID_TRANSITIONS.get(run.phase) or []
            forced_next = allowed[0] if allowed else run.phase

        prev = run.phase
        run.phase = forced_next
        run.phase_started_at = datetime.now(timezone.utc)
        run.save()

        phase_event = IncidentEvent.objects.create(
            run=run,
            event_type='phase_changed',
            actor=None,
            payload={'from': prev, 'to': run.phase, 'reason': 'timeout'},
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'mission_{run_id}',
            {'type': 'mission_event', 'event': self._serialize_event(timeout_event)},
        )
        async_to_sync(channel_layer.group_send)(
            f'mission_{run_id}',
            {'type': 'mission_event', 'event': self._serialize_event(phase_event)},
        )

        if forced_next == 'review':
            self.finalize_mission(run)

    def advance_phase(self, run, new_phase):
        """
        Move the mission to a new phase using the state machine, persist, emit an event, and broadcast.
        """
        sm = MissionStateMachine(run.phase)
        target_phase, is_valid, reason, side_effects = sm.transition(new_phase)
        if not is_valid:
            raise InvalidPhaseTransition(reason)

        prev = run.phase
        run.phase = target_phase
        run.phase_started_at = datetime.now(timezone.utc)
        run.save()

        event = IncidentEvent.objects.create(
            run=run,
            event_type='phase_changed',
            actor=None,
            payload={'from': prev, 'to': target_phase, 'side_effects': side_effects},
        )

        if target_phase == 'review':
            self.finalize_mission(run)

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'mission_{run.id}',
            {'type': 'mission_event', 'event': self._serialize_event(event)},
        )

        return {
            'phase': target_phase,
            'time_remaining': sm.get_time_remaining(run.phase_started_at),
            'side_effects': side_effects,
        }

    def finalize_mission(self, run):
        """
        Compute final score, update run completion fields, update user analytics profiles, and emit a review event.
        """
        if run.status in ('completed', 'failed'):
            engine = SimulationEngine()
            return engine.compute_final_score(run)

        engine = SimulationEngine()
        result = engine.compute_final_score(run)

        run.score = result['score']
        run.passed = result['passed']
        run.status = 'completed' if result['passed'] else 'failed'
        run.completed_at = datetime.now(timezone.utc)
        run.save()

        lead = MissionParticipant.objects.filter(run=run).select_related('user').order_by('joined_at').first()
        if lead is None:
            return result
        user = lead.user

        if hasattr(user, 'simulations_completed'):
            user.simulations_completed = int(getattr(user, 'simulations_completed') or 0) + 1
        if hasattr(user, 'total_score'):
            old_total = float(getattr(user, 'total_score') or 0)
            user.total_score = (old_total + float(run.score or 0)) / 2.0

        all_action_events = IncidentEvent.objects.filter(
            run__mission_participants__user=user,
            event_type='action_submitted',
        )
        total = all_action_events.count()
        correct = all_action_events.filter(payload__is_correct=True).count()
        if hasattr(user, 'accuracy_rate'):
            user.accuracy_rate = (correct / total * 100) if total else 0.0
        user.save()

        performance, created = UserPerformance.objects.get_or_create(user=user)
        if hasattr(performance, 'total_simulations'):
            performance.total_simulations = int(getattr(performance, 'total_simulations') or 0) + 1
        if hasattr(performance, 'average_score'):
            old_avg = float(getattr(performance, 'average_score') or 0)
            performance.average_score = 0.3 * float(run.score or 0) + 0.7 * old_avg
        performance.save()

        alpha = 0.3
        for assessment in SkillAssessment.objects.filter(user=user):
            old = float(getattr(assessment, 'score', 0) or 0)
            assessment.score = alpha * float(run.score or 0) + (1 - alpha) * old
            assessment.save()

        weak = list(SkillAssessment.objects.filter(user=user, score__lt=50).values_list('skill', flat=True))
        strong = list(SkillAssessment.objects.filter(user=user, score__gte=80).values_list('skill', flat=True))
        if hasattr(user, 'weak_areas'):
            user.weak_areas = weak
        if hasattr(user, 'strong_areas'):
            user.strong_areas = strong
        user.save()

        IncidentEvent.objects.create(
            run=run,
            event_type='phase_changed',
            actor=None,
            payload={'to': 'review', **result},
        )
        return result

    def request_hint(self, run_id, user):
        """
        Provide a hint for the current phase, apply the scoring penalty, and record a hint_requested event.
        """
        try:
            run = IncidentRun.objects.select_related('scenario').get(id=run_id)
        except IncidentRun.DoesNotExist as exc:
            raise MissionNotFound("Mission run not found") from exc

        if not MissionParticipant.objects.filter(run=run, user=user).exists():
            raise UnauthorizedAction("User is not authorized for this mission")

        hints = run.scenario.hints
        hint_text = None
        if isinstance(hints, dict):
            hint_text = hints.get(run.phase)
        elif isinstance(hints, list):
            idx = int((run.session_state or {}).get('current_step', 0) or 0)
            hint_text = hints[idx] if idx < len(hints) else None

        if hint_text is None:
            hint_text = "No hint available for this step."

        state = run.session_state or {}
        state['hints_used'] = int(state.get('hints_used', 0) or 0) + 1
        state['current_score'] = float(state.get('current_score', 0) or 0) - 5.0
        run.session_state = state
        run.save()

        IncidentEvent.objects.create(
            run=run,
            event_type='hint_requested',
            actor=user,
            payload={'phase': run.phase, 'hint_text': hint_text},
        )

        return {'hint': hint_text, 'hints_used': state['hints_used'], 'score_penalty': -5}

    def abandon_mission(self, run_id, user):
        """
        Mark a mission as abandoned by the user, record an event, broadcast, and return status.
        """
        try:
            run = IncidentRun.objects.get(id=run_id)
        except IncidentRun.DoesNotExist as exc:
            raise MissionNotFound("Mission run not found") from exc

        if not MissionParticipant.objects.filter(run=run, user=user).exists():
            raise UnauthorizedAction("User is not authorized for this mission")

        run.status = 'abandoned'
        run.completed_at = datetime.now(timezone.utc)
        run.save()

        event = IncidentEvent.objects.create(
            run=run,
            event_type='system',
            actor=user,
            payload={'reason': 'user_abandoned'},
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'mission_{run_id}',
            {'type': 'mission_event', 'event': self._serialize_event(event)},
        )

        return {'run_id': str(run.id), 'status': 'abandoned'}

    def join_mission(self, run_id, user, role='support_operator'):
        """
        Idempotently add user as MissionParticipant, log, optionally record event,
        and broadcast updated mission state to the WebSocket group.
        """
        rid = str(run_id)
        try:
            run = (
                IncidentRun.objects.select_related('scenario')
                .prefetch_related('mission_participants')
                .get(id=rid)
            )
        except IncidentRun.DoesNotExist as exc:
            raise MissionNotFound("Mission run not found") from exc

        if run.status in ('completed', 'failed', 'abandoned'):
            raise MissionAlreadyComplete("Mission is no longer accepting participants")

        if role not in MISSION_PARTICIPANT_ROLES:
            role = 'support_operator'

        now = datetime.now(timezone.utc)
        participant, created = MissionParticipant.objects.get_or_create(
            run=run,
            user=user,
            defaults={
                'role': role,
                'is_active': True,
                'is_ready': False,
                'last_heartbeat': now,
            },
        )
        participant.is_active = True
        participant.last_heartbeat = now
        participant.save()

        if created:
            IncidentEvent.objects.create(
                run=run,
                event_type='participant_joined',
                actor=user,
                payload={'role': participant.role, 'source': 'join'},
            )

        logger.info(
            'mission.join_mission run_id=%s user_id=%s username=%s created=%s role=%s',
            rid,
            user.pk,
            getattr(user, 'username', ''),
            created,
            participant.role,
        )

        self.broadcast_mission_state_update(rid)
        return participant, created

    def touch_participant_heartbeat(self, run_id, user):
        """Update last_heartbeat for WebSocket presence (best-effort)."""
        now = datetime.now(timezone.utc)
        MissionParticipant.objects.filter(run_id=run_id, user=user).update(last_heartbeat=now)

    def broadcast_mission_state_update(self, run_id):
        """
        Push full mission snapshot to all sockets in mission_{run_id}.
        Also emits a lightweight participants_updated payload for UIs that only refresh roster.
        """
        rid = str(run_id)
        try:
            state = self.get_current_state(rid)
        except MissionNotFound:
            return
        channel_layer = get_channel_layer()
        participants = state.get('participants') or []
        async_to_sync(channel_layer.group_send)(
            f'mission_{rid}',
            {'type': 'state_update', 'data': state},
        )
        async_to_sync(channel_layer.group_send)(
            f'mission_{rid}',
            {'type': 'participants_updated', 'participants': participants},
        )

    def apply_supervisor_intervention(self, run_id, supervisor, intervention_type, data):
        """
        Apply a supervisor/admin intervention to a mission run, record and broadcast it, then return current state.
        """
        try:
            run = IncidentRun.objects.select_related('scenario').get(id=run_id)
        except IncidentRun.DoesNotExist as exc:
            raise MissionNotFound("Mission run not found") from exc

        role = getattr(supervisor, 'role', None)
        if role not in ['supervisor', 'admin']:
            raise UnauthorizedAction("Supervisor role required")

        data = data or {}

        if intervention_type == 'INJECT_THREAT':
            threat = ThreatNode.objects.create(
                scenario=run.scenario,
                label=data.get('label'),
                severity=int(data.get('severity') or 3),
                trigger_condition={},
                consequence_payload=data,
                parent=None,
                phase=run.phase,
            )
            state = run.session_state or {}
            active = state.get('active_threats') or []
            if not isinstance(active, list):
                active = []
            active.append({'id': str(threat.id), 'label': threat.label, 'severity': threat.severity, 'phase': run.phase})
            state['active_threats'] = active
            run.session_state = state
            run.save()
        elif intervention_type == 'PAUSE':
            run.status = 'paused'
            run.save()
        elif intervention_type == 'FORCE_PHASE':
            self.advance_phase(run, data.get('target_phase'))
        elif intervention_type == 'OVERRIDE_DECISION':
            last = IncidentEvent.objects.filter(run=run, event_type='action_submitted').order_by('-timestamp').first()
            if last is not None:
                state = run.session_state or {}
                overrides = state.get('overrides') or []
                if not isinstance(overrides, list):
                    overrides = []
                overrides.append({'event_id': str(last.id), 'override': data})
                state['overrides'] = overrides
                run.session_state = state
                run.save()
        elif intervention_type == 'REDUCE_TIMER':
            limit_s = PHASE_TIME_LIMITS.get(run.phase)
            if limit_s and run.phase_started_at:
                sm = MissionStateMachine(run.phase)
                remaining = sm.get_time_remaining(run.phase_started_at)
                if remaining is not None:
                    new_remaining = remaining / 2.0
                    now = datetime.now(timezone.utc)
                    run.phase_started_at = now - timedelta(seconds=(limit_s - new_remaining))
                    run.save()

        event = IncidentEvent.objects.create(
            run=run,
            event_type='intervention_applied',
            actor=supervisor,
            payload={'type': intervention_type, 'data': data},
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'mission_{run_id}',
            {'type': 'mission_event', 'event': self._serialize_event(event)},
        )

        return self.get_current_state(run_id)

    def get_current_state(self, run_id):
        """
        Return a mission snapshot including run, timing, participants, recent events, score, and active threats.
        """
        try:
            run = (
                IncidentRun.objects.select_related('scenario')
                .prefetch_related('events', 'mission_participants', 'mission_participants__user')
                .get(id=run_id)
            )
        except IncidentRun.DoesNotExist as exc:
            raise MissionNotFound("Mission run not found") from exc

        sm = MissionStateMachine(run.phase)
        last_events = run.events.order_by('-timestamp')[:5]
        active_threats = ThreatNode.objects.filter(scenario=run.scenario, phase=run.phase)

        return {
            'run': self._serialize_run(run),
            'phase': run.phase,
            'status': run.status,
            'time_remaining': sm.get_time_remaining(run.phase_started_at),
            'participants': self._serialize_participants(run.mission_participants.all()),
            'last_5_events': self._serialize_events(list(last_events)),
            'score_so_far': (run.session_state or {}).get('current_score', 0),
            'active_threats': self._serialize_threats(list(active_threats)),
        }

    def _serialize_event(self, event):
        """
        Serialize an IncidentEvent using serializers if present, otherwise return a minimal dict.
        """
        try:
            from .serializers import IncidentEventSerializer
            return IncidentEventSerializer(event).data
        except Exception:
            return {
                'id': str(event.id),
                'event_type': event.event_type,
                'actor_id': getattr(event.actor, 'id', None),
                'payload': event.payload,
                'timestamp': event.timestamp.isoformat() if event.timestamp else None,
            }

    def _serialize_events(self, events):
        """
        Serialize a list of IncidentEvents.
        """
        try:
            from .serializers import IncidentEventSerializer
            return IncidentEventSerializer(events, many=True).data
        except Exception:
            return [self._serialize_event(e) for e in events]

    def _serialize_run(self, run):
        """
        Serialize an IncidentRun using serializers if present, otherwise return a minimal dict.
        """
        try:
            from .serializers import IncidentRunSerializer
            return IncidentRunSerializer(run).data
        except Exception:
            return {
                'id': str(run.id),
                'scenario_id': str(run.scenario_id),
                'phase': run.phase,
                'status': run.status,
                'session_state': run.session_state,
                'phase_started_at': run.phase_started_at.isoformat() if run.phase_started_at else None,
                'started_at': run.started_at.isoformat() if run.started_at else None,
                'completed_at': run.completed_at.isoformat() if run.completed_at else None,
                'score': run.score,
                'passed': run.passed,
            }

    def _serialize_participants(self, participants):
        """
        Serialize mission participants using serializers if present, otherwise return minimal dicts.
        """
        try:
            from .serializers import MissionParticipantSerializer
            return MissionParticipantSerializer(participants, many=True).data
        except Exception:
            out = []
            for p in participants:
                out.append({
                    'id': str(p.id),
                    'run_id': str(p.run_id),
                    'user_id': str(p.user_id),
                    'role': p.role,
                    'is_active': p.is_active,
                    'is_ready': p.is_ready,
                    'joined_at': p.joined_at.isoformat() if p.joined_at else None,
                    'last_seen': p.last_seen.isoformat() if p.last_seen else None,
                    'last_heartbeat': (
                        p.last_heartbeat.isoformat() if getattr(p, 'last_heartbeat', None) else None
                    ),
                })
            return out

    def _serialize_threats(self, threats):
        """
        Serialize ThreatNodes using serializers if present, otherwise return minimal dicts.
        """
        try:
            from .serializers import ThreatNodeSerializer
            return ThreatNodeSerializer(threats, many=True).data
        except Exception:
            return [
                {
                    'id': str(t.id),
                    'scenario_id': str(t.scenario_id),
                    'label': t.label,
                    'severity': t.severity,
                    'phase': t.phase,
                    'parent_id': str(t.parent_id) if t.parent_id else None,
                }
                for t in threats
            ]

