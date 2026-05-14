import logging

from rest_framework import status, viewsets, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import IncidentRun, MissionParticipant
from .orchestrator import (
    ScenarioOrchestrator,
    MissionNotFound,
    UnauthorizedAction,
    MissionAlreadyComplete,
    PhaseTimedOut,
)
from .serializers import (
    IncidentRunListSerializer,
    IncidentRunSerializer,
    MissionActionSerializer,
    SupervisorInterventionSerializer,
    IncidentEventSerializer,
    MissionParticipantSerializer,
)


class StartMissionSerializer(serializers.Serializer):
    scenario_id = serializers.UUIDField(required=True)
    use_genie = serializers.BooleanField(required=False, default=False)
    operator_role = serializers.CharField(required=False, default='lead_operator')


logger = logging.getLogger(__name__)

LOBBY_ACTIONS = frozenset(
    {
        'join',
        'state',
        'participants',
    }
)


class JoinMissionSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            ('lead_operator', 'Lead Operator'),
            ('support_operator', 'Support Operator'),
            ('observer', 'Observer'),
            ('supervisor', 'Supervisor'),
        ],
        required=False,
        default='support_operator',
    )


class GenieGenerateSerializer(serializers.Serializer):
    threat_type = serializers.CharField(required=False, default='GPS spoofing')
    difficulty = serializers.IntegerField(required=False, default=3, min_value=1, max_value=5)
    airport_context = serializers.CharField(required=False, default='international airport')


class GenieVariationSerializer(serializers.Serializer):
    scenario_id = serializers.UUIDField(required=True)
    seed = serializers.CharField(required=False, allow_null=True)


class IsSupervisorOrAdmin:
    """
    Local permission helper for supervisor-only incident interventions.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) in ['supervisor', 'admin']
        )


class IncidentRunViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = (
            IncidentRun.objects.select_related('scenario')
            .prefetch_related('mission_participants', 'events')
        )
        if getattr(user, 'role', None) in ['supervisor', 'admin']:
            return base.all()
        action = getattr(self, 'action', None) or ''
        if action in LOBBY_ACTIONS:
            return base.exclude(status__in=['completed', 'failed', 'abandoned'])
        return base.filter(mission_participants__user=user)

    def get_serializer_class(self):
        if self.action == 'list':
            return IncidentRunListSerializer
        return IncidentRunSerializer

    @extend_schema(
        description="POST /incidents/ — start a new mission run.",
        request=StartMissionSerializer,
        responses={
            201: OpenApiResponse(description="Mission started"),
            404: OpenApiResponse(description="Scenario not found"),
        },
    )
    def create(self, request):
        """POST /incidents/ — calls orchestrator.start_mission()"""
        scenario_id = request.data.get('scenario_id')
        use_genie = request.data.get('use_genie', False)
        operator_role = request.data.get('operator_role', 'lead_operator')
        orchestrator = ScenarioOrchestrator()
        try:
            result = orchestrator.start_mission(scenario_id, request.user, use_genie, operator_role)
            return Response(result, status=201)
        except MissionNotFound:
            return Response({'error': 'Scenario not found'}, status=404)

    @extend_schema(
        description="POST /incidents/{id}/actions/ — submit a decision/action for the mission.",
        request=MissionActionSerializer,
        responses={200: OpenApiResponse(description="Action processed")},
    )
    @action(detail=True, methods=['post'])
    def actions(self, request, pk=None):
        """POST /incidents/{id}/actions/ — submit a decision"""
        serializer = MissionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        orchestrator = ScenarioOrchestrator()
        try:
            result = orchestrator.submit_action(pk, request.user, serializer.validated_data)
            return Response(result)
        except MissionNotFound:
            return Response({'error': 'Mission not found'}, status=404)
        except UnauthorizedAction:
            return Response({'error': 'Not a participant'}, status=403)
        except MissionAlreadyComplete:
            return Response({'error': 'Mission already ended'}, status=400)
        except PhaseTimedOut:
            return Response({'error': 'Phase timed out'}, status=408)

    @extend_schema(
        description="GET /incidents/{id}/state/ — current mission state snapshot.",
        responses={200: OpenApiResponse(description="State snapshot")},
    )
    @action(detail=True, methods=['get'])
    def state(self, request, pk=None):
        """GET /incidents/{id}/state/"""
        orchestrator = ScenarioOrchestrator()
        return Response(orchestrator.get_current_state(pk))

    @extend_schema(
        description="GET /incidents/{id}/events/ — list mission events.",
        responses={200: IncidentEventSerializer(many=True)},
    )
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """GET /incidents/{id}/events/ — paginated event list"""
        run = self.get_object()
        events = run.events.all()
        serializer = IncidentEventSerializer(events, many=True)
        return Response(serializer.data)

    @extend_schema(
        description="GET /incidents/{id}/timeline/ — full ordered mission timeline.",
        responses={200: IncidentEventSerializer(many=True)},
    )
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """GET /incidents/{id}/timeline/ — full ordered timeline"""
        run = self.get_object()
        events = run.events.order_by('timestamp')
        return Response(IncidentEventSerializer(events, many=True).data)

    @extend_schema(
        description="POST /incidents/{id}/acknowledge/ — acknowledge briefing readiness.",
        responses={200: OpenApiResponse(description="Acknowledged")},
    )
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """POST /incidents/{id}/acknowledge/"""
        orchestrator = ScenarioOrchestrator()
        result = orchestrator.acknowledge_briefing(pk, request.user)
        return Response(result)

    @extend_schema(
        description="POST /incidents/{id}/abandon/ — abandon the mission.",
        responses={200: OpenApiResponse(description="Abandoned")},
    )
    @action(detail=True, methods=['post'])
    def abandon(self, request, pk=None):
        """POST /incidents/{id}/abandon/"""
        orchestrator = ScenarioOrchestrator()
        result = orchestrator.abandon_mission(pk, request.user)
        return Response(result)

    @extend_schema(
        description="POST /incidents/{id}/intervention/ — supervisor/admin intervention.",
        request=SupervisorInterventionSerializer,
        responses={200: OpenApiResponse(description="Intervention applied")},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsSupervisorOrAdmin])
    def intervention(self, request, pk=None):
        """POST /incidents/{id}/intervention/ — supervisor only"""
        serializer = SupervisorInterventionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        orchestrator = ScenarioOrchestrator()
        try:
            result = orchestrator.apply_supervisor_intervention(
                pk,
                request.user,
                serializer.validated_data['type'],
                serializer.validated_data.get('data', {}),
            )
            return Response(result)
        except UnauthorizedAction:
            return Response({'error': 'Insufficient permissions'}, status=403)

    @extend_schema(
        description="GET /incidents/{id}/participants/ — list participants.",
        responses={200: MissionParticipantSerializer(many=True)},
    )
    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """GET /incidents/{id}/participants/"""
        run = self.get_object()
        participants = run.mission_participants.select_related('user').all()
        return Response(MissionParticipantSerializer(participants, many=True).data)

    @extend_schema(
        description="POST /incidents/{id}/join/ — join a mission run.",
        request=JoinMissionSerializer,
        responses={200: OpenApiResponse(description="Joined")},
    )
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """POST /incidents/{id}/join/ — idempotent; broadcasts roster via WebSocket."""
        self.get_object()
        serializer = JoinMissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data.get('role', 'support_operator')
        orchestrator = ScenarioOrchestrator()
        try:
            participant, created = orchestrator.join_mission(pk, request.user, role)
        except MissionNotFound:
            return Response({'error': 'Mission not found'}, status=404)
        except MissionAlreadyComplete:
            return Response(
                {'error': 'Mission has ended; new participants are not accepted'},
                status=400,
            )
        logger.info(
            'mission.http_join run_id=%s user_id=%s created=%s',
            pk,
            request.user.pk,
            created,
        )
        participants_qs = MissionParticipant.objects.filter(run_id=pk).select_related('user')
        return Response(
            {
                'joined': created,
                'participant': MissionParticipantSerializer(participant).data,
                'participants': MissionParticipantSerializer(participants_qs, many=True).data,
                'ws_url': f'/ws/mission/{pk}/',
            }
        )

    @extend_schema(
        description="GET /incidents/{id}/score/ — final score breakdown (requires completed/failed).",
        responses={200: OpenApiResponse(description="Score breakdown")},
    )
    @action(detail=True, methods=['get'])
    def score(self, request, pk=None):
        """GET /incidents/{id}/score/ — final score breakdown"""
        run = self.get_object()
        if run.status not in ['completed', 'failed']:
            return Response({'error': 'Mission not yet complete'}, status=400)
        # Compute inline (no imports outside .models/.serializers/.orchestrator)
        submitted = run.events.filter(event_type='action_submitted')
        total = submitted.count()
        correct = submitted.filter(payload__is_correct=True).count()
        accuracy_score = (correct / total * 100) if total else 0.0

        latencies = []
        for ev in submitted:
            payload = ev.payload or {}
            latency = payload.get('latency_ms')
            if isinstance(latency, (int, float)):
                latencies.append(float(latency))
        avg_latency = (sum(latencies) / len(latencies)) if latencies else 0.0
        time_bonus = 10.0 if total and avg_latency < 30000 else 0.0

        hint_count = run.events.filter(event_type='hint_requested').count()
        escalation_count = run.events.filter(event_type='escalation_triggered').count()
        hint_penalty = float(hint_count) * 5.0
        escalation_penalty = float(escalation_count) * 15.0

        raw = accuracy_score + time_bonus - hint_penalty - escalation_penalty
        final_score = max(0.0, min(100.0, float(raw)))
        passed = final_score >= float(run.scenario.passing_score)

        if final_score >= 90:
            grade = 'A'
        elif final_score >= 80:
            grade = 'B'
        elif final_score >= 70:
            grade = 'C'
        elif final_score >= 60:
            grade = 'D'
        else:
            grade = 'F'

        return Response(
            {
                'score': float(final_score),
                'passed': bool(passed),
                'grade': grade,
                'breakdown': {
                    'accuracy_score': float(accuracy_score),
                    'time_bonus': float(time_bonus),
                    'hint_penalty': float(hint_penalty),
                    'escalation_penalty': float(escalation_penalty),
                    'decisions_correct': int(correct),
                    'decisions_total': int(total),
                },
            }
        )


class GenieViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        description="POST /genie/generate/ — generate a new AI scenario payload.",
        request=GenieGenerateSerializer,
        responses={200: OpenApiResponse(description="Generated steps payload")},
    )
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """POST /genie/generate/ — generate a new AI scenario"""
        from .genie_service import GenieScenarioGenerator
        gen = GenieScenarioGenerator()
        threat_type = request.data.get('threat_type', 'GPS spoofing')
        difficulty = request.data.get('difficulty', 3)
        context = request.data.get('airport_context', 'international airport')
        steps = gen.generate_incident(threat_type, difficulty, context)
        return Response({'generated_steps': steps})

    @extend_schema(
        description="POST /genie/variation/ — generate a variation of an existing scenario.",
        request=GenieVariationSerializer,
        responses={200: OpenApiResponse(description="Generated variation payload")},
    )
    @action(detail=False, methods=['post'])
    def variation(self, request):
        """POST /genie/variation/ — generate variation of existing scenario"""
        from .genie_service import GenieScenarioGenerator
        gen = GenieScenarioGenerator()
        scenario_id = request.data.get('scenario_id')
        seed = request.data.get('seed', None)
        steps = gen.generate_threat_variation(scenario_id, seed)
        return Response({'generated_steps': steps})

    @extend_schema(
        description="GET /genie/status/ — check if Genie API is reachable.",
        responses={200: OpenApiResponse(description="Genie health status")},
    )
    @action(detail=False, methods=['get'])
    def status(self, request):
        """GET /genie/status/ — check if Genie API is reachable"""
        from .genie_service import GenieScenarioGenerator
        gen = GenieScenarioGenerator()
        healthy = gen.health_check()
        return Response({'genie_api': 'healthy' if healthy else 'unavailable'})

