import React, { useEffect, useMemo, useState } from 'react';
import type { FinalScore } from '../../types/incident';

interface ReviewScreenProps {
  score: FinalScore | null;
  scenarioTitle: string;
  onRetry: () => void;
  onBackToDashboard: () => void;
}

const gradeColor = (g: FinalScore['grade']) => {
  if (g === 'A') return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200';
  if (g === 'B') return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-100';
  if (g === 'C') return 'border-amber-500/50 bg-amber-500/10 text-amber-200';
  if (g === 'D') return 'border-orange-500/50 bg-orange-500/10 text-orange-200';
  return 'border-red-500/60 bg-red-500/10 text-red-200';
};

/** Renders only when `score` is defined — mount/remount drives counter reset without setState-in-effect. */
const ReviewScoreBody: React.FC<{
  score: FinalScore;
  scenarioTitle: string;
  onRetry: () => void;
  onBackToDashboard: () => void;
}> = ({ score, scenarioTitle, onRetry, onBackToDashboard }) => {
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
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{ backgroundColor: '#0a0f1e', fontFamily: "'Courier New', monospace" }}
    >
      <div className="w-full max-w-4xl">
        <div
          className={[
            'rounded-2xl border p-6 shadow-2xl',
            score.passed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5',
          ].join(' ')}
        >
          <div
            className={[
              'rounded-xl border px-4 py-3 text-sm tracking-[0.18em]',
              score.passed
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/60 bg-red-500/10 text-red-200',
            ].join(' ')}
          >
            {score.passed ? 'MISSION COMPLETE' : 'MISSION FAILED'}
          </div>

          <div className="mt-4 text-xl text-slate-100">{scenarioTitle}</div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6">
              <div className="text-xs tracking-[0.22em] text-slate-300">FINAL SCORE</div>
              <div className="mt-2 text-6xl font-bold text-slate-100">{display}</div>
              <div className="mt-4 flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs ${gradeColor(score.grade)}`}>
                  GRADE {score.grade}
                </span>
                <span
                  className={[
                    'rounded-md border px-3 py-1 text-xs tracking-[0.2em]',
                    score.passed
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/60 bg-red-500/10 text-red-200',
                  ].join(' ')}
                >
                  {score.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6">
              <div className="text-xs tracking-[0.22em] text-slate-300">STATS</div>
              <div className="mt-3 text-sm text-slate-200">
                Decisions Correct:{' '}
                <span className="text-amber-200">
                  {score.breakdown.decisions_correct} / {score.breakdown.decisions_total}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-6">
            <div className="text-xs tracking-[0.22em] text-slate-300">BREAKDOWN</div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <span>Accuracy Score</span>
                <span className="text-slate-100">{score.breakdown.accuracy_score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Speed Bonus</span>
                <span className="text-emerald-200">+{score.breakdown.time_bonus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hint Penalty</span>
                <span className="text-red-200">-{score.breakdown.hint_penalty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Escalation Penalty</span>
                <span className="text-red-200">-{score.breakdown.escalation_penalty}</span>
              </div>
              <div className="my-2 h-px w-full bg-slate-800/70" />
              <div className="flex items-center justify-between text-base">
                <span className="text-slate-100">Final Score</span>
                <span className="text-amber-200">{score.score}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/15 transition"
            >
              TRY AGAIN
            </button>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/40 transition"
            >
              BACK TO DASHBOARD
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
}) => {
  if (!score) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center px-6"
        style={{ backgroundColor: '#0a0f1e', fontFamily: "'Courier New', monospace" }}
      >
        <div className="max-w-md text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" />
          <p className="text-sm tracking-[0.2em] text-amber-200/90">COMPUTING MISSION SCORE</p>
          <p className="mt-2 text-xs text-slate-500">{scenarioTitle}</p>
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
    />
  );
};
