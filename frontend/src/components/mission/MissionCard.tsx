import React, { useMemo, useState } from 'react';
import type { IncidentRun, SupervisorIntervention } from '../../types/incident';
import { PhaseBar } from './PhaseBar';

interface MissionCardProps {
  run: IncidentRun;
  onSelect: (runId: string) => void;
  onIntervene: (runId: string, intervention: SupervisorIntervention) => void;
}

const minsInPhase = (startedAt: string | null) => {
  if (!startedAt) return 0;
  const d = new Date(startedAt);
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.floor(ms / 60_000));
};

const statusBadge = (status: IncidentRun['status']) => {
  switch (status) {
    case 'in_progress':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    case 'paused':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-200';
    case 'completed':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-200';
    case 'failed':
      return 'border-red-500/50 bg-red-500/10 text-red-200';
    case 'abandoned':
      return 'border-slate-600/40 bg-slate-900/20 text-slate-300';
    default:
      return 'border-slate-700/50 bg-slate-900/20 text-slate-300';
  }
};

export const MissionCard: React.FC<MissionCardProps> = ({ run, onSelect, onIntervene }) => {
  const [showInject, setShowInject] = useState(false);
  const [injectLabel, setInjectLabel] = useState('Threat Inject');
  const [injectSeverity, setInjectSeverity] = useState(3);

  const threats = useMemo(() => {
    const ss = run.session_state ?? {};
    const active = ss.active_threats;
    if (Array.isArray(active)) return active.length;
    if (typeof ss.active_threat_count === 'number') return ss.active_threat_count;
    return 0;
  }, [run.session_state]);

  const threatPill = useMemo(() => {
    if (threats <= 0) return { label: 'Nominal', cls: 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10' };
    if (threats === 1) return { label: 'Elevated', cls: 'text-amber-200 border-amber-500/50 bg-amber-500/10' };
    return { label: 'Critical', cls: 'text-red-200 border-red-500/50 bg-red-500/10 animate-pulse' };
  }, [threats]);

  return (
    <div
      className="rounded-2xl border border-slate-800/70 bg-[#0f1729] p-4 shadow-xl transition hover:border-amber-500/50"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">{run.scenario.title}</div>
          <div className="mt-1 text-xs text-slate-400">{run.id}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] ${statusBadge(run.status)}`}>
          {run.status}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-800/60">
        <PhaseBar currentPhase={run.phase} timeRemaining={run.time_remaining} score={run.score ?? 0} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-3">
          <div className="text-slate-400">Score</div>
          <div className="mt-1 text-slate-200">{run.score ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-3">
          <div className="text-slate-400">Participants</div>
          <div className="mt-1 text-slate-200">{run.participant_count}</div>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-3">
          <div className="text-slate-400">Time in phase</div>
          <div className="mt-1 text-slate-200">{minsInPhase(run.phase_started_at)}m</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`rounded-full border px-3 py-1 text-[11px] ${threatPill.cls}`}>
          {threatPill.label}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-2 py-2 text-slate-200 hover:border-amber-500/50 transition"
            title="Pause"
            onClick={() => onIntervene(run.id, { type: 'PAUSE' })}
          >
            ⏸
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-2 py-2 text-slate-200 hover:border-amber-500/50 transition"
            title="Inject threat"
            onClick={() => setShowInject(v => !v)}
          >
            ⚡
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-2 py-2 text-slate-200 hover:border-amber-500/50 transition"
            title="Force phase"
            onClick={() => onIntervene(run.id, { type: 'FORCE_PHASE' })}
          >
            ⏭
          </button>
        </div>
      </div>

      {showInject && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="text-[11px] tracking-[0.18em] text-amber-300">INJECT THREAT</div>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input
              value={injectLabel}
              onChange={e => setInjectLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-500/60"
              placeholder="Label"
            />
            <select
              value={injectSeverity}
              onChange={e => setInjectSeverity(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-500/60"
            >
              {[1, 2, 3, 4, 5].map(v => (
                <option key={v} value={v}>
                  Severity {v}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/30 transition"
                onClick={() => setShowInject(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15 transition"
                onClick={() =>
                  onIntervene(run.id, { type: 'INJECT_THREAT', data: { label: injectLabel, severity: injectSeverity } })
                }
              >
                Inject
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="mt-4 w-full rounded-xl border border-slate-800/70 bg-slate-950/20 px-4 py-3 text-sm text-slate-200 hover:border-amber-500/50 hover:bg-slate-900/20 transition"
        onClick={() => onSelect(run.id)}
      >
        VIEW LIVE →
      </button>
    </div>
  );
};

