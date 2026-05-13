import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMissionSocket } from '../../hooks/useMissionSocket';
import type { FinalScore, IncidentEvent, MissionPhase, MissionState, ScenarioStep } from '../../types/incident';
import {
  acknowledgeBriefing,
  getFinalScore,
  getMissionState,
  requestHint,
  submitAction,
} from '../../services/incidentService';
import { BriefingScreen } from '../../components/mission/BriefingScreen';
import { PhaseBar } from '../../components/mission/PhaseBar';
import { RadarScope } from '../../components/mission/RadarScope';
import { OpsDashboard } from '../../components/mission/OpsDashboard';
import { StressHUD } from '../../components/mission/StressHUD';
import { DecisionPanel } from '../../components/mission/DecisionPanel';
import { EventFeed } from '../../components/mission/EventFeed';
import { ParticipantBadges } from '../../components/mission/ParticipantBadges';
import { ReviewScreen } from '../../components/mission/ReviewScreen';

const phaseOrder: MissionPhase[] = [
  'briefing',
  'detection',
  'investigation',
  'containment',
  'recovery',
  'review',
];

/** Radar (ATC) vs ops console — trainees default to radar experience. */
const getOperatorMode = (role: string | undefined) => {
  const r = (role ?? '').toLowerCase();
  if (r === 'operations_officer' || r === 'support_operator') return 'ops';
  if (
    r === 'air_traffic_controller' ||
    r === 'lead_operator' ||
    r === 'trainee' ||
    r === 'supervisor' ||
    r === 'admin' ||
    r === 'instructor'
  ) {
    return 'atc';
  }
  return 'atc';
};

const extractCurrentStep = (state: MissionState | null): ScenarioStep | null => {
  if (!state) return null;
  const steps = state.run?.scenario?.steps ?? [];
  if (steps.length === 0) return null;

  const ss = state.run?.session_state ?? {};
  const candidates = [
    ss.current_step_id,
    ss.step_id,
    (ss.current_step as { step_id?: unknown } | undefined)?.step_id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const found = steps.find(s => s.step_id === c);
      if (found) return found;
    }
  }

  const phase = state.phase;
  const phaseStep = steps.find(s => s.phase === phase);
  return phaseStep ?? steps[0] ?? null;
};

export const MissionPlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const { runId } = useParams<{ runId: string }>();
  const { token, user } = useAuth();

  const [currentStep, setCurrentStep] = useState<ScenarioStep | null>(null);
  const [briefingNarrative, setBriefingNarrative] = useState('');
  const [showBriefing, setShowBriefing] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [escalationAlert, setEscalationAlert] = useState<string | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [finalScore, setFinalScore] = useState<FinalScore | null>(null);
  const [allReady, setAllReady] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);

  const eventListRef = useRef<IncidentEvent[]>([]);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [bootstrappedState, setBootstrappedState] = useState<MissionState | null>(null);

  const safeRunId = runId ?? '';
  const safeToken = token ?? '';

  const onPhaseChange = useCallback((phase: MissionPhase) => {
    if (phase !== 'briefing') setShowBriefing(false);
    setShowReview(phase === 'review');
  }, []);

  const onEscalation = useCallback((event: IncidentEvent) => {
    setIsEscalated(true);
    const msg = event.payload?.message;
    setEscalationAlert(typeof msg === 'string' ? msg : 'Escalation triggered');
    setGlitchActive(true);
    window.setTimeout(() => setGlitchActive(false), 3000);
  }, []);

  const onTimeout = useCallback(() => {
    setEscalationAlert('Timeout occurred');
  }, []);

  const onMissionComplete = useCallback(async () => {
    if (!safeRunId) return;
    try {
      const s = await getFinalScore(safeRunId);
      setFinalScore(s);
      setShowReview(true);
    } catch {
      // ignore: ReviewScreen can still render later when score is available
    }
  }, [safeRunId]);

  const { missionState: wsMissionState, isConnected, lastEvent, timerWarning } = useMissionSocket({
    runId: safeRunId,
    token: safeToken,
    onPhaseChange,
    onEscalation,
    onTimeout,
    onMissionComplete: () => void onMissionComplete(),
  });

  const missionState = wsMissionState ?? bootstrappedState;

  useEffect(() => {
    if (!safeRunId) return;
    let cancelled = false;
    void getMissionState(safeRunId)
      .then(s => {
        if (!cancelled) setBootstrappedState(s);
      })
      .catch(() => {
        if (!cancelled) setBootstrappedState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [safeRunId]);

  useEffect(() => {
    if (!showReview || !safeRunId || finalScore) return;
    let cancelled = false;
    void getFinalScore(safeRunId)
      .then(s => {
        if (!cancelled) setFinalScore(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showReview, safeRunId, finalScore]);

  useEffect(() => {
    const next = extractCurrentStep(missionState);
    setCurrentStep(next);

    const narrative = missionState?.run?.session_state?.briefing_narrative;
    if (typeof narrative === 'string') setBriefingNarrative(narrative);

    const phase = missionState?.phase;
    if (phase) {
      setShowBriefing(phase === 'briefing');
      setShowReview(phase === 'review');
      if (phase !== 'briefing') setAllReady(true);
    }
  }, [missionState]);

  useEffect(() => {
    if (!lastEvent) return;
    const existing = eventListRef.current;
    const next = [lastEvent, ...existing].slice(0, 50);
    eventListRef.current = next;
    setEvents(next);
  }, [lastEvent]);

  useEffect(() => {
    const base = missionState?.last_5_events ?? [];
    if (base.length === 0) return;
    const merged = [...base]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
    eventListRef.current = merged;
    setEvents(merged);
  }, [missionState?.last_5_events]);

  const mode = useMemo(() => getOperatorMode(user?.role), [user?.role]);

  const currentPhase = missionState?.phase ?? 'briefing';
  const timeRemaining = missionState?.time_remaining ?? missionState?.run?.time_remaining ?? null;
  const score = missionState?.score_so_far ?? missionState?.run?.score ?? 0;

  const phaseTimeLimit = useMemo(() => {
    const fromStep = currentStep?.time_limit_seconds;
    if (typeof fromStep === 'number' && fromStep > 0) return fromStep;
    const ss = missionState?.run?.session_state ?? {};
    const maybe = ss.phase_time_limit;
    if (typeof maybe === 'number' && maybe > 0) return maybe;
    return 60;
  }, [currentStep?.time_limit_seconds, missionState?.run?.session_state]);

  const scenarioTitle = missionState?.run?.scenario?.title ?? 'Mission Scenario';
  const threatType = missionState?.run?.scenario?.threat_type ?? 'unknown';
  const operatorRoleLabel = user?.role ?? 'operator';

  const handleAcknowledge = useCallback(async () => {
    if (!safeRunId) return;
    try {
      const r = await acknowledgeBriefing(safeRunId);
      setAllReady(Boolean(r.all_ready));
      if (r.all_ready) {
        setShowBriefing(false);
      }
    } catch {
      // ignore
    }
  }, [safeRunId]);

  const handleSubmitOption = useCallback(
    async (optionId: string) => {
      if (!safeRunId || !currentStep) return;
      try {
        setIsSubmitting(true);
        setHintText(null);
        await submitAction(safeRunId, {
          action_type: 'decision',
          step_id: currentStep.step_id,
          decision_data: { option_id: optionId },
          timestamp_client: Date.now(),
        });
      } catch {
        // ignore
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentStep, safeRunId],
  );

  const handleRequestHint = useCallback(async () => {
    if (!safeRunId) return;
    try {
      const r = await requestHint(safeRunId);
      setHintText(r.hint);
      setHintsUsed(r.hints_used);
    } catch {
      // ignore
    }
  }, [safeRunId]);

  const glitchOverlay = glitchActive ? (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
      <div className="absolute inset-0" style={{ backdropFilter: 'contrast(1.15) hue-rotate(8deg)' }} />
    </div>
  ) : null;

  const escalBanner = escalationAlert ? (
    <div className="pointer-events-none fixed left-1/2 top-16 z-[55] -translate-x-1/2">
      <div
        className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-200 animate-pulse"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {escalationAlert}
      </div>
    </div>
  ) : null;

  if (!safeRunId) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: '#0a0f1e' }}>
        <div className="text-slate-200" style={{ fontFamily: "'Courier New', monospace" }}>
          Missing runId.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40" style={{ backgroundColor: '#0a0f1e' }}>
      {escalBanner}

      {showBriefing ? (
        <BriefingScreen
          narrative={briefingNarrative}
          scenarioTitle={scenarioTitle}
          threatType={threatType}
          operatorRole={operatorRoleLabel}
          onAcknowledge={handleAcknowledge}
          isReady={allReady}
        />
      ) : null}

      {showReview ? (
        <ReviewScreen
          score={finalScore}
          scenarioTitle={scenarioTitle}
          onRetry={() => navigate('/dashboard/simulations')}
          onBackToDashboard={() => navigate('/dashboard')}
        />
      ) : null}

      {!showBriefing && !showReview && (
        <div className="relative z-40 flex h-full flex-col">
          <PhaseBar currentPhase={currentPhase} timeRemaining={timeRemaining} score={score} />

          <div className="flex flex-1 gap-4 p-4">
            <div className="relative w-3/4">
              <div className="absolute inset-0 rounded-2xl border border-slate-800/70 bg-slate-950/30" />
              <div className="relative z-0 h-full p-3">
                {mode === 'atc' ? (
                  <RadarScope
                    threatType={threatType}
                    currentPhase={currentPhase}
                    sessionState={missionState?.run?.session_state ?? {}}
                    glitchActive={glitchActive}
                    isEscalated={isEscalated}
                  />
                ) : (
                  <OpsDashboard
                    threatType={threatType}
                    currentPhase={currentPhase}
                    sessionState={missionState?.run?.session_state ?? {}}
                    glitchActive={glitchActive}
                    isEscalated={isEscalated}
                  />
                )}
              </div>
              {glitchOverlay}
            </div>

            <div className="flex w-1/4 flex-col gap-3">
              <div className="flex-1 min-h-0">
                <EventFeed events={events} />
              </div>
              <ParticipantBadges participants={missionState?.participants ?? []} />

              <div
                className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-3 text-xs text-slate-400"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <div className="flex items-center justify-between">
                  <span>WS</span>
                  <span className={isConnected ? 'text-emerald-200' : 'text-red-200'}>
                    {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>PHASE IDX</span>
                  <span className="text-slate-200">{phaseOrder.indexOf(currentPhase) + 1}/6</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>TIMER WARN</span>
                  <span className={timerWarning ? 'text-amber-200' : 'text-slate-500'}>
                    {timerWarning ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DecisionPanel
            key={currentStep?.step_id ?? 'no-step'}
            currentStep={currentStep}
            onSubmitAction={handleSubmitOption}
            onRequestHint={handleRequestHint}
            isSubmitting={isSubmitting}
            hintText={hintText}
            hintsUsed={hintsUsed}
            phase={currentPhase}
          />
        </div>
      )}

      <StressHUD
        timeRemaining={timeRemaining}
        phaseTimeLimit={phaseTimeLimit}
        isEscalated={isEscalated}
      />
    </div>
  );
};

export default MissionPlayerPage;

