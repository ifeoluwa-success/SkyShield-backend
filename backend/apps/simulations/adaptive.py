from statistics import mean

from datetime import timedelta
from django.utils import timezone

from .models import IncidentRun, MissionParticipant, IncidentEvent, ThreatNode, Scenario
from apps.analytics.models import UserPerformance, SkillAssessment, PerformanceTrend
from apps.simulations.models import UserDecision

from .state_machine import PHASE_TIME_LIMITS


class AdaptiveLearningService:
    """
    Service that updates user performance profiles, recommends scenarios, and computes mission stress.
    """

    def update_user_profile(self, user, session_or_run):
        """
        Update user performance based on either a completed SimulationSession or an IncidentRun.

        Called after SimulationSession completes (pass session)
        OR after IncidentRun.finalize_mission (pass run).
        Works with both types.
        """
        score = getattr(session_or_run, 'score', None)
        if score is None:
            score = 0.0
        score = float(score or 0.0)

        performance, _ = UserPerformance.objects.get_or_create(user=user)
        old_avg = float(getattr(performance, 'average_score', 0) or 0)
        new_avg = 0.3 * score + 0.7 * old_avg

        if hasattr(performance, 'average_score'):
            performance.average_score = new_avg
        if hasattr(performance, 'total_simulations'):
            performance.total_simulations = int(getattr(performance, 'total_simulations') or 0) + 1
        performance.save()

        weak = list(SkillAssessment.objects.filter(user=user, score__lt=50).values_list('skill', flat=True))
        strong = list(SkillAssessment.objects.filter(user=user, score__gte=80).values_list('skill', flat=True))

        if hasattr(user, 'weak_areas'):
            user.weak_areas = weak
        if hasattr(user, 'strong_areas'):
            user.strong_areas = strong
        user.save()

    def get_recommended_scenarios(self, user, limit=5):
        """
        Recommend scenarios based on the user's skill gaps, recent completions, and average performance.

        This is intended to replace the placeholder logic in an existing recommended endpoint.
        """
        assessments = list(SkillAssessment.objects.filter(user=user).order_by('score'))
        if not assessments:
            return Scenario.objects.order_by('?')[:limit]

        weakest = assessments[:2]
        weak_skills = [a.skill for a in weakest]

        user_avg = float(getattr(user, 'total_score', 0) or 0)
        recently_completed_ids = set()

        week_ago = timezone.now() - timedelta(days=7)
        recent_runs = IncidentRun.objects.filter(
            mission_participants__user=user,
            completed_at__gte=week_ago,
        ).values_list('scenario_id', flat=True)
        recently_completed_ids.update(list(recent_runs))

        def threat_to_skill_axis(threat_type):
            return threat_type

        scored = []
        for scenario in Scenario.objects.filter(is_active=True):
            skill_axis = threat_to_skill_axis(scenario.threat_type)
            skill_match = 1.0 if skill_axis in weak_skills else 0.0

            difficulty_match = 0.0
            difficulty = getattr(scenario, 'difficulty', None)
            if isinstance(difficulty, (int, float)):
                if user_avg > 80:
                    difficulty_match = 1.0 if difficulty >= 3 else 0.0
                elif user_avg < 50:
                    difficulty_match = 1.0 if difficulty <= 2 else 0.0
                else:
                    difficulty_match = 0.5
            else:
                difficulty_match = 0.5

            recent_penalty = 0.5 if scenario.id in recently_completed_ids else 0.0
            total_score = skill_match + difficulty_match - recent_penalty
            scored.append((total_score, scenario))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored[:limit]]

    def compute_stress_index(self, run_id):
        """
        Compute a normalized stress index (0..1) based on action latency relative to phase time limits.
        """
        events = IncidentEvent.objects.filter(run_id=run_id, event_type='action_submitted').order_by('timestamp')
        ratios = []
        for ev in events:
            payload = ev.payload or {}
            latency_ms = payload.get('latency_ms')
            phase = payload.get('phase')
            if not phase:
                phase = IncidentRun.objects.filter(id=run_id).values_list('phase', flat=True).first()
            limit_s = PHASE_TIME_LIMITS.get(phase) or 0
            if not isinstance(latency_ms, (int, float)) or limit_s <= 0:
                continue
            ratios.append(float(latency_ms) / (float(limit_s) * 1000.0))

        stress_index = 0.0
        if ratios:
            stress_index = max(0.0, min(1.0, float(mean(ratios))))

        run = IncidentRun.objects.filter(id=run_id).prefetch_related('mission_participants').first()
        if run is None:
            return stress_index

        participant = MissionParticipant.objects.filter(run=run).select_related('user').order_by('joined_at').first()
        if participant is None:
            return stress_index
        user = participant.user

        recent_runs = (
            IncidentRun.objects.filter(mission_participants__user=user)
            .order_by('-started_at')[:3]
        )
        recent_indices = []
        for r in recent_runs:
            evs = IncidentEvent.objects.filter(run=r, event_type='action_submitted')
            local = []
            for e in evs:
                p = e.payload or {}
                lat = p.get('latency_ms')
                ph = p.get('phase') or r.phase
                lim = PHASE_TIME_LIMITS.get(ph) or 0
                if isinstance(lat, (int, float)) and lim > 0:
                    local.append(float(lat) / (float(lim) * 1000.0))
            if local:
                recent_indices.append(max(0.0, min(1.0, float(mean(local)))))

        if len(recent_indices) == 3 and all(x > 0.7 for x in recent_indices):
            performance, _ = UserPerformance.objects.get_or_create(user=user)
            if hasattr(performance, 'recommended_scenarios'):
                flag = performance.recommended_scenarios or {}
                if not isinstance(flag, dict):
                    flag = {}
                flag['reduce_next_difficulty'] = True
                performance.recommended_scenarios = flag
                performance.save()

        return stress_index

