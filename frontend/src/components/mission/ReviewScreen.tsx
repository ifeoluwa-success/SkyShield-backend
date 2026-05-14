import React, { useEffect, useMemo, useState } from 'react';
import type { FinalScore } from '../../types/incident';
import { Spinner } from '../ui/Loading';

interface ReviewScreenProps {
  score: FinalScore | null;
  scenarioTitle: string;
  onRetry: () => void;
  onBackToDashboard: () => void;
  onReturnToTraining?: () => void;
  variant?: 'cockpit' | 'studio';
}

const gradeColor = (g: FinalScore['grade'], studio: boolean) => {
  if (studio) {
    if (g === 'A') return 'border-emerald-300 bg-emerald-50 text-emerald-900';
    if (g === 'B') return 'border-emerald-200 bg-emerald-50/80 text-emerald-900';
    if (g === 'C') return 'border-amber-200 bg-amber-50 text-amber-900';
    if (g === 'D') return 'border-orange-200 bg-orange-50 text-orange-900';
    return 'border-red-200 bg-red-50 text-red-900';
  }
  if (g === 'A') return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200';
  if (g === 'B') return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-100';
  if (g === 'C') return 'border-amber-500/50 bg-amber-500/10 text-amber-200';
  if (g === 'D') return 'border-orange-500/50 bg-orange-500/10 text-orange-200';
  return 'border-red-500/60 bg-red-500/10 text-red-200';
};

const ReviewScoreBody: React.FC<{
  score: FinalScore;
  scenarioTitle: string;
  onRetry: () => void;
  onBackToDashboard: () => void;
  onReturnToTraining?: () => void;
  variant: 'cockpit' | 'studio';
}> = ({ score, scenarioTitle, onRetry, onBackToDashboard, onReturnToTraining, variant }) => {
  const studio = variant === 'studio';
  const target = useMemo(() => Math.max(0, Math.floor(score.score)), [score.score]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(Math.floor(target * p));
      if (p < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [target]);

  return (
    <div
      className={['fixed inset-0 z-[60] flex items-center justify-center px-6', studio ? 'bg-zinc-100' : ''].join(
        ' ',
      )}
      style={studio ? { fontFamily: 'ui-sans-serif, system-ui, sans-serif' } : { backgroundColor: '#0a0f1e', fontFamily: "'Courier New', monospace" }}
    >
      <div className="w-full max-w-4xl">
        <div
          className={[
            'rounded-2xl border p-6 shadow-xl',
            studio
              ? score.passed
                ? 'border-emerald-200 bg-white'
                : 'border-red-200 bg-white'
              : score.passed
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-red-500/40 bg-red-500/5',
          ].join(' ')}
        >
          <div
            className={[
              'rounded-xl border px-4 py-3 text-sm tracking-wide',
              studio
                ? score.passed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
                : score.passed
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/60 bg-red-500/10 text-red-200',
            ].join(' ')}
          >
            {score.passed ? 'Mission complete' : 'Mission failed'}
          </div>

          <div className={studio ? 'mt-4 text-xl font-semibold text-zinc-900' : 'mt-4 text-xl text-slate-100'}>
            {scenarioTitle}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              className={
                studio
                  ? 'md:col-span-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-6'
                  : 'md:col-span-2 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6'
              }
            >
              <div className={studio ? 'text-xs font-semibold uppercase tracking-widest text-zinc-500' : 'text-xs tracking-[0.22em] text-slate-300'}>
                Final score
              </div>
              <div className={studio ? 'mt-2 text-6xl font-bold text-zinc-900' : 'mt-2 text-6xl font-bold text-slate-100'}>
                {display}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs ${gradeColor(score.grade, studio)}`}>
                  Grade {score.grade}
                </span>
                <span
                  className={[
                    'rounded-md border px-3 py-1 text-xs tracking-wide',
                    studio
                      ? score.passed
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                      : score.passed
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/60 bg-red-500/10 text-red-200',
                  ].join(' ')}
                >
                  {score.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            </div>

            <div className={studio ? 'rounded-2xl border border-zinc-200 bg-zinc-50 p-6' : 'rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6'}>
              <div className={studio ? 'text-xs font-semibold uppercase tracking-widest text-zinc-500' : 'text-xs tracking-[0.22em] text-slate-300'}>
                Stats
              </div>
              <div className={studio ? 'mt-3 text-sm text-zinc-700' : 'mt-3 text-sm text-slate-200'}>
                Decisions correct:{' '}
                <span className={studio ? 'font-semibold text-amber-800' : 'text-amber-200'}>
                  {score.breakdown.decisions_correct} / {score.breakdown.decisions_total}
                </span>
              </div>
            </div>
          </div>

          <div className={studio ? 'mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6' : 'mt-6 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6'}>
            <div className={studio ? 'text-xs font-semibold uppercase tracking-widest text-zinc-500' : 'text-xs tracking-[0.22em] text-slate-300'}>
              Breakdown
            </div>
            <div className={studio ? 'mt-4 grid grid-cols-1 gap-2 text-sm text-zinc-700' : 'mt-4 grid grid-cols-1 gap-2 text-sm text-slate-200'}>
              <div className="flex items-center justify-between">
                <span>Accuracy score</span>
                <span className={studio ? 'font-medium text-zinc-900' : 'text-slate-100'}>{score.breakdown.accuracy_score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Speed bonus</span>
                <span className={studio ? 'text-emerald-700' : 'text-emerald-200'}>+{score.breakdown.time_bonus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hint penalty</span>
                <span className={studio ? 'text-red-700' : 'text-red-200'}>-{score.breakdown.hint_penalty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Escalation penalty</span>
                <span className={studio ? 'text-red-700' : 'text-red-200'}>-{score.breakdown.escalation_penalty}</span>
              </div>
              <div className={studio ? 'my-2 h-px w-full bg-zinc-200' : 'my-2 h-px w-full bg-slate-800/70'} />
              <div className="flex items-center justify-between text-base">
                <span className={studio ? 'font-medium text-zinc-900' : 'text-slate-100'}>Final score</span>
                <span className={studio ? 'font-semibold text-amber-800' : 'text-amber-200'}>{score.score}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onRetry}
              className={
                studio
                  ? 'rounded-lg border border-amber-600 bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition'
                  : 'rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/15 transition'
              }
            >
              Try again
            </button>
            {onReturnToTraining ? (
              <button
                type="button"
                onClick={onReturnToTraining}
                className={
                  studio
                    ? 'rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 transition'
                    : 'rounded-lg border border-slate-600 bg-slate-900/40 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/60 transition'
                }
              >
                Return to training
              </button>
            ) : null}
            <button
              type="button"
              onClick={onBackToDashboard}
              className={
                studio
                  ? 'rounded-lg border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 transition'
                  : 'rounded-lg border border-slate-700/60 bg-slate-950/30 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/40 transition'
              }
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  score,
  scenarioTitle,
  onRetry,
  onBackToDashboard,
  onReturnToTraining,
  variant = 'cockpit',
}) => {
  const studio = variant === 'studio';

  if (!score) {
    return (
      <div
        className={['fixed inset-0 z-[60] flex items-center justify-center px-6', studio ? 'bg-zinc-100' : ''].join(' ')}
        style={studio ? { fontFamily: 'ui-sans-serif, system-ui, sans-serif' } : { backgroundColor: '#0a0f1e', fontFamily: "'Courier New', monospace" }}
      >
        <div className="max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <Spinner size="lg" className={studio ? 'text-amber-600' : 'text-amber-400'} />
          </div>
          <p className={studio ? 'text-sm font-medium text-zinc-700' : 'text-sm tracking-[0.2em] text-amber-200/90'}>
            Computing mission score…
          </p>
          <p className={studio ? 'mt-2 text-xs text-zinc-500' : 'mt-2 text-xs text-slate-500'}>{scenarioTitle}</p>
        </div>
      </div>
    );
  }

  const scoreKey = `${score.score}-${score.passed}-${score.grade}-${score.breakdown.decisions_total}`;

  return (
    <ReviewScoreBody
      key={scoreKey}
      score={score}
      scenarioTitle={scenarioTitle}
      onRetry={onRetry}
      onBackToDashboard={onBackToDashboard}
      onReturnToTraining={onReturnToTraining}
      variant={variant}
    />
  );
};
