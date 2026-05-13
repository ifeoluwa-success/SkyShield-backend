import React, { useMemo, useState } from 'react';
import type { MissionPhase, ScenarioStep } from '../../types/incident';

interface DecisionPanelProps {
  currentStep: ScenarioStep | null;
  onSubmitAction: (optionId: string) => void;
  onRequestHint: () => void;
  isSubmitting: boolean;
  hintText: string | null;
  hintsUsed: number;
  phase: MissionPhase;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  currentStep,
  onSubmitAction,
  onRequestHint,
  isSubmitting,
  hintText,
  hintsUsed,
  phase,
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  const hidden = phase === 'briefing' || phase === 'review';

  const options = useMemo(() => currentStep?.options ?? [], [currentStep]);
  const canHint = hintsUsed < 3 && !isSubmitting && !hidden;

  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <div className="mx-auto max-w-7xl px-4 pb-4">
        <div className="translate-y-0 rounded-2xl border border-slate-800/70 bg-[#0f1729] shadow-2xl transition-transform">
          <div className="h-0.5 w-full bg-amber-500" />

          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="text-xs tracking-[0.24em] text-amber-300">
              INCIDENT RESPONSE REQUIRED
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-200">
                HINTS USED: <span className="text-amber-200">{hintsUsed}</span>
              </div>
              <button
                type="button"
                disabled={!canHint}
                onClick={onRequestHint}
                className={[
                  'rounded-md border px-3 py-1 text-xs transition',
                  canHint
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
                    : 'cursor-not-allowed border-slate-700/60 bg-slate-900/20 text-slate-500',
                ].join(' ')}
              >
                REQUEST HINT
              </button>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-xl border border-amber-500/15 bg-slate-950/30 p-4 text-amber-200">
              {currentStep?.description ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{currentStep.description}</div>
              ) : (
                <div className="text-sm text-slate-400">Awaiting next incident event...</div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {options.map(opt => {
                const isSelected = selected === opt.id;
                const disabled = isSubmitting || (selected !== null && !isSelected);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelected(opt.id);
                      onSubmitAction(opt.id);
                    }}
                    className={[
                      'w-full rounded-xl border px-4 py-3 text-left text-sm transition',
                      isSelected
                        ? 'border-amber-500/70 bg-amber-500/15 text-amber-100'
                        : 'border-slate-700/60 bg-slate-950/20 text-slate-200 hover:border-amber-500/50 hover:bg-slate-900/30',
                      disabled && !isSelected ? 'cursor-not-allowed opacity-60' : '',
                    ].join(' ')}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {hintText && (
              <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="text-xs tracking-[0.18em] text-amber-300">HINT</div>
                <div className="mt-1 text-sm text-amber-100">{hintText}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

