import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Copy, Link2, LogOut, Radio, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMissionSocket } from '../../hooks/useMissionSocket';
import type { FinalScore, IncidentEvent, MissionPhase, MissionParticipant, MissionState, ScenarioStep } from '../../types/incident';
import type { User } from '../../types/auth';
import {
  abandonMission,
  acknowledgeBriefing,
  getFinalScore,
  getMissionState,
  getParticipants,
  joinMissionRun,
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
import Toast from '../../components/Toast';
import { Spinner } from '../../components/ui/Loading';

const phaseOrder: MissionPhase[] = [
  'briefing',
  'detection',
  'investigation',
  'containment',
  'recovery',
  'review',
];

type PreflightStatus = 'idle' | 'checking' | 'joining' | 'ready' | 'error';

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();

function userIsParticipant(participants: MissionParticipant[], user: User): boolean {
  const email = norm(user.email);
  const uname = norm(user.username);
  return participants.some(p => norm(p.email) === email || norm(p.username) === uname);
}

/** Radar (ATC-style) vs operations console — maps backend / product roles. */
const getOperatorMode = (role: string | undefined, jobTitle: string | undefined) => {
  const r = (role ?? '').toLowerCase();
  const j = (jobTitle ?? '').toLowerCase();
  if (r === 'operations_officer' || r === 'support_operator') return 'ops';
  if (j.includes('operation') || /\bops\b/.test(j)) return 'ops';
  if (j.includes('air traffic') || j.includes('atc')) return 'atc';
  return 'atc';
};

const extractCurrentStep = (state: MissionState | null): ScenarioStep | null => {
  if (!state?.run?.scenario?.steps?.length) return null;
  const steps = state.run.scenario.steps;
  const ss = state.run.session_state ?? {};

  const curObj =
    ss.current_step && typeof ss.current_step === 'object' && !Array.isArray(ss.current_step)
      ? (ss.current_step as Record<string, unknown>)
      : null;

  const pickId = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    return null;
  };

  const stepId =
    pickId(ss.current_step_id) ??
    pickId(ss.step_id) ??
    pickId(ss.active_step_id) ??
    (curObj ? pickId(curObj.step_id) ?? pickId(curObj.id) : null);

  if (stepId) {
    const found = steps.find(s => s.step_id === stepId);
    if (found) return found;
  }

  const num = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    return null;
  };

  const idxRaw =
    num(ss.current_step_number) ??
    num(ss.step_number) ??
    num(ss.current_step_index) ??
    (curObj ? num(curObj.index) ?? num(curObj.number) : null);

  if (idxRaw !== null) {
    const asOneBased = idxRaw >= 1 && idxRaw <= steps.length;
    const idx = asOneBased ? idxRaw - 1 : Math.min(Math.max(0, Math.floor(idxRaw)), steps.length - 1);
    const byIdx = steps[idx];
    if (byIdx) return byIdx;
  }

  const runPhase = state.run?.phase;
  const statePhase = state.phase;
  return steps.find(s => s.phase === statePhase) ?? steps.find(s => s.phase === runPhase) ?? steps[0] ?? null;
};

function pickLongerString(a: string | undefined, b: string | undefined): string {
  const sa = (a ?? '').trim();
  const sb = (b ?? '').trim();
  return sa.length >= sb.length ? sa : sb;
}

function mergeSessionState(
  boot: Record<string, unknown>,
  ws: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...boot, ...ws };
  for (const k of ['briefing_narrative', 'briefing', 'briefing_text'] as const) {
    const b = boot[k];
    const w = ws[k];
    if (typeof b !== 'string' && typeof w !== 'string') continue;
    const sb = typeof b === 'string' ? b : '';
    const sw = typeof w === 'string' ? w : '';
    if (sb.length === 0 && sw.length === 0) continue;
    out[k] = sb.length >= sw.length ? sb : sw;
  }
  return out;
}

function mergeMissionState(ws: MissionState | null, boot: MissionState | null): MissionState | null {
  if (!ws && !boot) return null;
  if (!ws) return boot;
  if (!boot) return ws;

  const wsSteps = ws.run?.scenario?.steps ?? [];
  const bootSteps = boot.run?.scenario?.steps ?? [];
  const steps = wsSteps.length > 0 ? wsSteps : bootSteps;

  const bss = boot.run.session_state ?? {};
  const wss = ws.run.session_state ?? {};

  return {
    ...boot,
    ...ws,
    run: {
      ...boot.run,
      ...ws.run,
      scenario: {
        ...boot.run.scenario,
        ...ws.run.scenario,
        steps,
        description: pickLongerString(boot.run.scenario?.description, ws.run.scenario?.description),
      },
      session_state: mergeSessionState(
        bss as Record<string, unknown>,
        wss as Record<string, unknown>,
      ),
    },
    participants:
      (ws.participants?.length ?? 0) >= (boot.participants?.length ?? 0) ? ws.participants : boot.participants,
    last_5_events:
      (ws.last_5_events?.length ?? 0) >= (boot.last_5_events?.length ?? 0) ? ws.last_5_events : boot.last_5_events,
    active_threats:
      (ws.active_threats?.length ?? 0) >= (boot.active_threats?.length ?? 0) ? ws.active_threats : boot.active_threats,
    phase: ws.phase ?? boot.phase,
    status: ws.status ?? boot.status,
    time_remaining: ws.time_remaining ?? boot.time_remaining,
    score_so_far: ws.score_so_far ?? boot.score_so_far,
  };
}

function normalizePanelOptions(step: ScenarioStep | null): { id: string; text: string }[] {
  if (!step?.options?.length) return [];
  return step.options.map((o, i) => {
    const r = o as unknown as Record<string, unknown>;
    const id = String(r.id ?? r.option_id ?? r.value ?? r.key ?? `opt-${i}`);
    const text = String(r.text ?? r.label ?? r.title ?? r.name ?? `Option ${i + 1}`);
    return { id, text };
  });
}

function formatApiError(err: unknown, fallback: string): string {
  const ax = err as AxiosError<Record<string, string | string[] | undefined> | { error?: string; detail?: string }>;
  const data = ax.response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if ('error' in data && typeof data.error === 'string') return data.error;
    if ('detail' in data && typeof data.detail === 'string') return data.detail;
    const parts = Object.entries(data)
      .map(([k, v]) => {
        if (v == null) return '';
        const s = Array.isArray(v) ? v.join(', ') : String(v);
        return s ? `${k}: ${s}` : '';
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  return fallback;
}

const shareInviteButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/20 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20';

const MissionPlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { runId } = useParams<{ runId: string }>();
  const { token, user } = useAuth();

  const returnToPath = useMemo(() => {
    const st = (location.state as { returnTo?: string } | null)?.returnTo;
    if (typeof st === 'string' && st.startsWith('/')) return st;
    const q = searchParams.get('returnTo');
    if (q) {
      try {
        const decoded = decodeURIComponent(q);
        if (decoded.startsWith('/')) return decoded;
      } catch {
        /* ignore */
      }
    }
    return null;
  }, [location.state, searchParams]);

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
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [preflightStatus, setPreflightStatus] = useState<PreflightStatus>('checking');
  const [bootstrappedState, setBootstrappedState] = useState<MissionState | null>(null);

  const eventListRef = useRef<IncidentEvent[]>([]);
  const [events, setEvents] = useState<IncidentEvent[]>([]);

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
    setToast({ type: 'info', message: 'Phase timer elapsed.' });
  }, []);

  const fetchScoreAndReview = useCallback(async () => {
    if (!safeRunId) return;
    try {
      const s = await getFinalScore(safeRunId);
      setFinalScore(s);
    } catch {
      setToast({ type: 'error', message: 'Could not load final score yet. You can retry from the review screen.' });
    }
    setShowReview(true);
  }, [safeRunId]);

  const onMissionCompleteWs = useCallback(
    (_score: number, _passed: boolean) => {
      void fetchScoreAndReview();
    },
    [fetchScoreAndReview],
  );

  const socketEnabled = preflightStatus === 'ready' && Boolean(safeRunId && safeToken);

  const { missionState: wsMissionState, isConnected, lastEvent, timerWarning } = useMissionSocket({
    runId: socketEnabled ? safeRunId : '',
    token: socketEnabled ? safeToken : '',
    onPhaseChange,
    onEscalation,
    onTimeout,
    onMissionComplete: onMissionCompleteWs,
  });

  const missionState = useMemo(
    () => mergeMissionState(wsMissionState, bootstrappedState),
    [wsMissionState, bootstrappedState],
  );

  /** Prefer longest non-empty source so partial WS payloads never replace the full briefing. */
  const briefingNarrative = useMemo(() => {
    const ss = missionState?.run?.session_state ?? {};
    const sc = missionState?.run?.scenario;
    const candidates = [
      ss.briefing_narrative,
      ss.briefing,
      ss.briefing_text,
      ss.narrative,
      sc?.description,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    if (candidates.length === 0) return '';
    return candidates.reduce((a, b) => (b.trim().length > a.trim().length ? b : a)).trim();
  }, [missionState]);

  const resolvedStep = useMemo(() => extractCurrentStep(missionState), [missionState]);
  const panelOptions = useMemo(() => normalizePanelOptions(resolvedStep), [resolvedStep]);

  useEffect(() => {
    if (!safeRunId || !safeToken || !user) {
      setPreflightStatus('idle');
      return;
    }

    let cancelled = false;

    const runPreflight = async () => {
      setPreflightStatus('checking');
      setBootError(null);

      try {
        let state = await getMissionState(safeRunId);
        if (cancelled) return;
        setBootstrappedState(state);

        let participants: MissionParticipant[] = state.participants ?? [];
        try {
          const list = await getParticipants(safeRunId);
          if (list.length > 0) participants = list;
        } catch {
          /* use mission state participants */
        }

        if (!userIsParticipant(participants, user)) {
          setPreflightStatus('joining');
          try {
            await joinMissionRun(safeRunId, {});
          } catch (e) {
            const msg = formatApiError(e, '');
            if (!/already|joined|participant|exists|duplicate|member/i.test(msg)) {
              throw e;
            }
          }
          if (cancelled) return;
          state = await getMissionState(safeRunId);
          if (!cancelled) setBootstrappedState(state);
        }

        if (!cancelled) setPreflightStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setBootstrappedState(null);
          setBootError(formatApiError(e, 'Could not load mission state.'));
          setPreflightStatus('error');
        }
      }
    };

    void runPreflight();
    return () => {
      cancelled = true;
    };
  }, [safeRunId, safeToken, user]);

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

  const mode = useMemo(() => getOperatorMode(user?.role, user?.job_title), [user?.role, user?.job_title]);

  const currentPhase = missionState?.phase ?? 'briefing';
  const timeRemaining = missionState?.time_remaining ?? missionState?.run?.time_remaining ?? null;
  const score = missionState?.score_so_far ?? missionState?.run?.score ?? 0;

  const phaseTimeLimit = useMemo(() => {
    const fromStep = resolvedStep?.time_limit_seconds;
    if (typeof fromStep === 'number' && fromStep > 0) return fromStep;
    const ss = missionState?.run?.session_state ?? {};
    const maybe = ss.phase_time_limit;
    if (typeof maybe === 'number' && maybe > 0) return maybe;
    return 60;
  }, [resolvedStep?.time_limit_seconds, missionState?.run?.session_state]);

  const scenarioTitle = missionState?.run?.scenario?.title ?? 'Mission Scenario';
  const threatType = missionState?.run?.scenario?.threat_type ?? 'unknown';
  const operatorRoleLabel = user?.role ?? 'operator';

  const participants = missionState?.participants ?? [];
  const participantCount = Math.max(participants.length, missionState?.run?.participant_count ?? 0);
  const teamActive = participantCount >= 2;
  const soloWaiting = !showBriefing && !showReview && participantCount <= 1;
  const standbyMode = !showBriefing && !showReview && events.length === 0;

  const handleCopyMissionLink = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      setToast({ type: 'success', message: 'Mission link copied. Send it to your crew.' });
    } catch {
      setToast({ type: 'info', message: url || 'Could not copy automatically.' });
    }
  }, []);

  const inviteButton = (
    <button type="button" className={shareInviteButtonClass} onClick={() => void handleCopyMissionLink()}>
      <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Copy invite link
    </button>
  );

  const handleAcknowledge = useCallback(async () => {
    if (!safeRunId) return;
    try {
      const r = await acknowledgeBriefing(safeRunId);
      setAllReady(Boolean(r.all_ready));
      if (r.all_ready) {
        setShowBriefing(false);
      }
    } catch (err) {
      setToast({ type: 'error', message: formatApiError(err, 'Could not acknowledge briefing.') });
    }
  }, [safeRunId]);

  const handleSubmitOption = useCallback(
    async (optionId: string) => {
      if (!safeRunId || !resolvedStep) return;
      try {
        setIsSubmitting(true);
        setHintText(null);
        const res = await submitAction(safeRunId, {
          action_type: 'decision',
          step_id: resolvedStep.step_id,
          decision_data: { option_id: optionId },
          timestamp_client: Date.now(),
        });
        if (res?.current_state) {
          setBootstrappedState(prev =>
            prev ? mergeMissionState(res.current_state, prev) ?? res.current_state : res.current_state,
          );
        } else {
          try {
            const fresh = await getMissionState(safeRunId);
            setBootstrappedState(prev =>
              prev ? mergeMissionState(fresh, prev) ?? fresh : fresh,
            );
          } catch {
            /* rely on WebSocket */
          }
        }
        if (res?.event) {
          eventListRef.current = [res.event, ...eventListRef.current].slice(0, 50);
          setEvents([...eventListRef.current]);
        }
      } catch (err) {
        setToast({ type: 'error', message: formatApiError(err, 'Action could not be submitted.') });
      } finally {
        setIsSubmitting(false);
      }
    },
    [resolvedStep, safeRunId],
  );

  const handleRequestHint = useCallback(async () => {
    if (!safeRunId) return;
    try {
      const r = await requestHint(safeRunId);
      setHintText(r.hint);
      setHintsUsed(r.hints_used);
      try {
        const fresh = await getMissionState(safeRunId);
        setBootstrappedState(prev =>
          prev ? mergeMissionState(fresh, prev) ?? fresh : fresh,
        );
      } catch {
        /* WebSocket may still push */
      }
    } catch (err) {
      setToast({ type: 'error', message: formatApiError(err, 'Hint not available.') });
    }
  }, [safeRunId]);

  const handleAbandon = useCallback(async () => {
    if (!safeRunId) return;
    if (!window.confirm('Leave this mission? Progress may be lost.')) return;
    try {
      await abandonMission(safeRunId);
      navigate(returnToPath ?? '/dashboard/simulations');
    } catch (err) {
      setToast({ type: 'error', message: formatApiError(err, 'Could not abandon mission.') });
    }
  }, [safeRunId, navigate, returnToPath]);

  const handleExitHeader = useCallback(() => {
    navigate(returnToPath ?? '/dashboard/simulations');
  }, [navigate, returnToPath]);

  const glitchOverlay = glitchActive ? (
    <div className="pointer-events-none absolute inset-0 z-10 rounded-xl">
      <div className="absolute inset-0 animate-pulse rounded-xl bg-red-500/15" />
    </div>
  ) : null;

  const escalBanner = escalationAlert ? (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[55] -translate-x-1/2 px-4">
      <div className="rounded-lg border border-red-400/50 bg-red-950/90 px-4 py-2 text-sm font-medium text-red-100 shadow-lg shadow-red-900/40 animate-pulse dark:bg-red-950/95">
        {escalationAlert}
      </div>
    </div>
  ) : null;

  if (!safeRunId) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-zinc-100 text-zinc-700 dark:bg-slate-950 dark:text-slate-200">
        <p className="text-sm font-medium">Missing mission run in the URL.</p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          onClick={() => navigate('/dashboard/simulations')}
        >
          Back to simulations
        </button>
      </div>
    );
  }

  if (!safeToken || !user) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-zinc-100 px-6 text-center dark:bg-slate-950">
        <ShieldAlert className="mb-3 text-amber-600 dark:text-amber-400" size={40} />
        <p className="text-sm font-medium text-zinc-800 dark:text-slate-100">Sign in required to join the live mission channel.</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          onClick={() => navigate('/login')}
        >
          Go to login
        </button>
      </div>
    );
  }

  if (preflightStatus === 'checking' || preflightStatus === 'joining') {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-100 to-slate-200 text-slate-700 dark:from-slate-950 dark:to-slate-900 dark:text-slate-200">
        <div className="relative">
          <Spinner size="xl" />
          {preflightStatus === 'joining' && (
            <span className="absolute -inset-3 rounded-full border border-emerald-500/30 animate-ping" aria-hidden />
          )}
        </div>
        <div className="max-w-sm px-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
            {preflightStatus === 'joining' ? 'Joining mission…' : 'Loading mission…'}
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {preflightStatus === 'joining'
              ? 'Registering you on this run so teammates see you in the roster.'
              : 'Fetching scenario state and operator roster.'}
          </p>
        </div>
      </div>
    );
  }

  if (preflightStatus === 'error' && !missionState) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-zinc-100 px-6 text-center dark:bg-slate-950">
        <p className="max-w-md text-sm text-red-700 dark:text-red-400">{bootError}</p>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          onClick={() => navigate(returnToPath ?? '/dashboard/simulations')}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-zinc-100 text-zinc-900 dark:bg-slate-950 dark:text-slate-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {escalBanner}

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            <Radio size={18} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-slate-400 sm:text-xs">
              Immersive mission
            </p>
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-slate-50">{scenarioTitle}</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => void handleCopyMissionLink()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:px-3 sm:text-xs"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Copy link</span>
            <span className="sm:hidden">Link</span>
          </button>
          <span
            className={[
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              teamActive
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300',
              isConnected ? '' : 'opacity-80',
            ].join(' ')}
          >
            <Users className="h-3 w-3 shrink-0" aria-hidden />
            {participantCount}
          </span>
          <span
            className={[
              'hidden rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline',
              isConnected
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200',
            ].join(' ')}
          >
            {isConnected ? 'Channel live' : 'Reconnecting…'}
          </span>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3 sm:text-xs"
            onClick={handleExitHeader}
          >
            Exit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80 sm:px-3 sm:text-xs"
            onClick={() => void handleAbandon()}
          >
            <LogOut size={14} aria-hidden />
            Abandon
          </button>
        </div>
      </header>

      {showBriefing ? (
        <BriefingScreen
          narrative={briefingNarrative}
          scenarioTitle={scenarioTitle}
          threatType={threatType}
          operatorRole={operatorRoleLabel}
          onAcknowledge={handleAcknowledge}
          isReady={allReady}
          inviteSlot={inviteButton}
        />
      ) : null}

      {showReview ? (
        <ReviewScreen
          variant="studio"
          score={finalScore}
          scenarioTitle={scenarioTitle}
          onRetry={() => navigate('/dashboard/simulations')}
          onBackToDashboard={() => navigate('/dashboard')}
          onReturnToTraining={returnToPath ? () => navigate(returnToPath) : undefined}
        />
      ) : null}

      {!showBriefing && !showReview && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <PhaseBar variant="studio" currentPhase={currentPhase} timeRemaining={timeRemaining} score={score} />

          {soloWaiting && (
            <div className="shrink-0 border-b border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent px-3 py-2.5 dark:from-amber-500/15 dark:via-amber-500/5 sm:px-4">
              <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Waiting for other operators</p>
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                      You are the first on this channel. Share the link so teammates appear in the roster and the mission can
                      coordinate in real time.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyMissionLink()}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500 sm:self-center"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Share mission URL
                </button>
              </div>
            </div>
          )}

          {teamActive && (
            <div className="pointer-events-none absolute left-1/2 top-14 z-[5] -translate-x-1/2 sm:top-16">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800 shadow-sm animate-pulse dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Mission active — multi-operator
              </span>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-2 sm:p-3 lg:flex-row lg:gap-4 lg:p-4">
            <div className="relative flex min-h-[280px] flex-1 flex-col sm:min-h-[320px] lg:min-h-0">
              <div
                className={[
                  'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-md',
                  'border-slate-800/80 bg-slate-950 dark:border-slate-700/90',
                  teamActive ? 'ring-2 ring-emerald-500/25 ring-offset-2 ring-offset-slate-950 dark:ring-emerald-500/30' : '',
                ].join(' ')}
              >
                <div className="relative z-0 min-h-0 flex-1 p-2 sm:p-3">
                  {mode === 'atc' ? (
                    <RadarScope
                      threatType={threatType}
                      currentPhase={currentPhase}
                      sessionState={missionState?.run?.session_state ?? {}}
                      glitchActive={glitchActive}
                      isEscalated={isEscalated}
                      teamActive={teamActive}
                      standbyMode={standbyMode}
                    />
                  ) : (
                    <OpsDashboard
                      threatType={threatType}
                      currentPhase={currentPhase}
                      glitchActive={glitchActive}
                      isEscalated={isEscalated}
                      appearance="immersive"
                      standbyMode={standbyMode}
                      teamActive={teamActive}
                    />
                  )}
                </div>
                {glitchOverlay}
              </div>
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[min(100%,320px)] xl:w-[340px]">
              <div className="min-h-[180px] flex-1 sm:min-h-[200px] lg:min-h-0">
                <EventFeed events={events} />
              </div>
              <ParticipantBadges
                variant="studio"
                participants={participants}
                currentUserEmail={user?.email}
                currentUserUsername={user?.username}
                socketConnected={isConnected}
              />

              <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-xs text-slate-300 shadow-inner backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wide text-slate-400">Telemetry</span>
                  <span className={isConnected ? 'font-medium text-emerald-400' : 'font-medium text-amber-300'}>
                    {isConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-700/50 pt-2">
                  <span className="text-slate-500">Phase</span>
                  <span className="font-mono text-slate-100">{phaseOrder.indexOf(currentPhase) + 1}/6</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Timer stress</span>
                  <span className={timerWarning ? 'font-medium text-amber-300' : 'text-slate-500'}>
                    {timerWarning ? 'Elevated' : 'Normal'}
                  </span>
                </div>
              </div>
            </aside>
          </div>

          <DecisionPanel
            key={resolvedStep?.step_id ?? 'no-step'}
            description={resolvedStep?.description}
            options={panelOptions}
            onSubmitAction={handleSubmitOption}
            onRequestHint={handleRequestHint}
            isSubmitting={isSubmitting}
            hintText={hintText}
            hintsUsed={hintsUsed}
            channelConnected={isConnected}
            awaitingNextStep={isSubmitting}
          />
        </div>
      )}

      <StressHUD
        surface="studio"
        timeRemaining={timeRemaining}
        phaseTimeLimit={phaseTimeLimit}
        isEscalated={isEscalated}
      />
    </div>
  );
};

export default MissionPlayerPage;
