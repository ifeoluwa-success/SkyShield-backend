import React, { useMemo } from 'react';
import type { MissionPhase } from '../../types/incident';

interface PhaseBarProps {
  currentPhase: MissionPhase;
  timeRemaining: number | null;
  score: number;
  /** `studio` = light dashboard chrome; `cockpit` = dark HUD (default). */
  variant?: 'cockpit' | 'studio';
}

const phases: Array<{ key: MissionPhase; label: string }> = [
  { key: 'briefing', label: 'BRIEFING' },
  { key: 'detection', label: 'DETECTION' },
  { key: 'investigation', label: 'INVESTIGATION' },
  { key: 'containment', label: 'CONTAINMENT' },
  { key: 'recovery', label: 'RECOVERY' },
  { key: 'review', label: 'REVIEW' },
];

const formatMMSS = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

export const PhaseBar: React.FC<PhaseBarProps> = ({
  currentPhase,
  timeRemaining,
  score,
  variant = 'cockpit',
}) => {
  const currentIdx = useMemo(() => phases.findIndex(p => p.key === currentPhase), [currentPhase]);
  const isLow = (timeRemaining ?? 9999) < 15;

  const studio = variant === 'studio';

  return (
    <div
      className={[
        'w-full border-b px-4 py-3',
        studio ? 'border-zinc-200 bg-white' : 'border-slate-800/70',
      ].join(' ')}
      style={
        studio
          ? { fontFamily: 'ui-sans-serif, system-ui, sans-serif' }
          : { backgroundColor: '#0a0f1e', fontFamily: "'Courier New', monospace" }
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {phases.map((p, idx) => {
            const isCurrent = idx === currentIdx;
            const isCompleted = currentIdx > idx;
            const base =
              'rounded-full px-3 py-1 text-[11px] tracking-[0.12em] border transition-colors';
            const cls = studio
              ? isCurrent
                ? 'border-amber-500/80 bg-amber-50 text-amber-900'
                : isCompleted
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500'
              : isCurrent
                ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                : isCompleted
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-700/60 bg-slate-900/30 text-slate-400';
            return (
              <span key={p.key} className={`${base} ${cls}`}>
                {p.label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <div
            className={[
              'rounded-md border px-3 py-1 text-xs',
              studio
                ? isLow
                  ? 'border-red-300 bg-red-50 text-red-800 animate-pulse'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-800'
                : isLow
                  ? 'border-red-500/60 bg-red-500/10 text-red-200'
                  : 'border-slate-700/60 bg-slate-900/30 text-slate-200',
              !studio && isLow ? 'animate-pulse' : '',
            ].join(' ')}
          >
            {timeRemaining == null ? '--:--' : formatMMSS(timeRemaining)}
          </div>

          <div className={studio ? 'text-xs text-zinc-600' : 'text-xs text-slate-200'}>
            Score:{' '}
            <span className={studio ? 'font-semibold text-amber-800' : 'font-semibold text-amber-200'}>
              {Number.isFinite(score) ? score : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

