import React, { useEffect, useMemo, useState } from 'react';

interface BriefingScreenProps {
  narrative: string;
  scenarioTitle: string;
  threatType: string;
  operatorRole: string;
  onAcknowledge: () => void;
  isReady: boolean;
}

export const BriefingScreen: React.FC<BriefingScreenProps> = ({
  narrative,
  scenarioTitle,
  threatType,
  operatorRole,
  onAcknowledge,
  isReady,
}) => {
  const text = useMemo(() => narrative?.trim() ?? '', [narrative]);
  const [visibleChars, setVisibleChars] = useState(0);
  const [finished, setFinished] = useState(false);
  const [clickedReady, setClickedReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisibleChars(0);
      setFinished(false);
      setClickedReady(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (!text) {
      const t = window.setTimeout(() => setFinished(true), 0);
      return () => window.clearTimeout(t);
    }
    if (finished) return;
    const tick = window.setInterval(() => {
      setVisibleChars(prev => {
        const next = Math.min(prev + 1, text.length);
        if (next >= text.length) {
          window.clearInterval(tick);
          setFinished(true);
        }
        return next;
      });
    }, 14);
    return () => window.clearInterval(tick);
  }, [text, finished]);

  const canClick = finished && !clickedReady;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: '#0a0f1e', fontFamily: "'Courier New', monospace" }}
    >
      <div className="w-full max-w-4xl px-6">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/40 p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm tracking-[0.25em] text-amber-400">MISSION BRIEFING</div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                {threatType || 'UNKNOWN THREAT'}
              </span>
              <span className="rounded-full border border-slate-600/50 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
                {operatorRole}
              </span>
            </div>
          </div>

          <div className="mt-6 text-2xl font-semibold text-slate-100">{scenarioTitle || 'Mission'}</div>

          <div className="mt-6 rounded-xl border border-amber-500/20 bg-slate-950/40 p-5 text-amber-200">
            <div className="whitespace-pre-wrap leading-relaxed">
              {text.slice(0, visibleChars)}
              {!finished && <span className="ml-1 inline-block w-2 animate-pulse bg-amber-400/80">&nbsp;</span>}
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {clickedReady && !isReady ? 'Waiting for other participants...' : ' '}
            </div>

            <button
              type="button"
              disabled={!canClick}
              onClick={() => {
                setClickedReady(true);
                onAcknowledge();
              }}
              className={[
                'rounded-lg px-5 py-3 text-sm font-semibold tracking-wide transition',
                'border border-amber-500/40',
                canClick
                  ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                  : 'cursor-not-allowed bg-slate-900/30 text-slate-500',
              ].join(' ')}
            >
              I AM READY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

