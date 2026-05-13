import React, { useMemo } from 'react';
import type { MissionPhase } from '../../types/incident';

interface RadarScopeProps {
  threatType: string;
  currentPhase: MissionPhase;
  sessionState: Record<string, unknown>;
  glitchActive: boolean;
  isEscalated: boolean;
}

type Blip = {
  id: string;
  x: number; // -1..1
  y: number; // -1..1
  callSign: string;
  altitude: number;
  drift: number; // seconds
};

const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const seededRand01 = (seed: number) => {
  // xorshift32
  let x = seed || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 10_000) / 10_000;
};

export const RadarScope: React.FC<RadarScopeProps> = ({
  threatType,
  currentPhase,
  sessionState,
  glitchActive,
  isEscalated,
}) => {
  const seedBase = useMemo(() => {
    const raw = JSON.stringify(sessionState ?? {});
    return hashString(`${threatType}-${raw}-${currentPhase}`);
  }, [currentPhase, sessionState, threatType]);

  const blips = useMemo<Blip[]>(() => {
    const count = 6;
    const out: Blip[] = [];
    for (let i = 0; i < count; i += 1) {
      const s = seedBase + i * 101;
      const x = seededRand01(s) * 1.6 - 0.8;
      const y = seededRand01(s + 17) * 1.6 - 0.8;
      const altitude = 180 + Math.floor(seededRand01(s + 23) * 220);
      out.push({
        id: `b${i}`,
        x,
        y,
        callSign: `SHD-${300 + i * 2}`,
        altitude,
        drift: 6 + i * 1.3,
      });
    }
    return out;
  }, [seedBase]);

  const hasAnomaly = currentPhase !== 'briefing';
  const ghostCount = isEscalated ? 2 : 1;

  return (
    <div className="relative h-full w-full">
      <div
        className={[
          'relative mx-auto aspect-square h-full max-h-[calc(100vh-140px)] w-auto',
          'rounded-full border border-emerald-500/20 shadow-[0_0_40px_rgba(34,197,94,0.08)]',
          glitchActive ? 'animate-[radarGlitch_350ms_ease-in-out_infinite]' : '',
        ].join(' ')}
        style={{
          backgroundColor: '#0a1a0a',
          filter: glitchActive ? 'hue-rotate(35deg) contrast(1.2)' : 'none',
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <radialGradient id="scopeGlow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="rgba(34,197,94,0.18)" />
              <stop offset="70%" stopColor="rgba(34,197,94,0.05)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(34,197,94,0)" />
              <stop offset="70%" stopColor={isEscalated ? 'rgba(245,158,11,0.0)' : 'rgba(34,197,94,0.0)'} />
              <stop offset="100%" stopColor={isEscalated ? 'rgba(245,158,11,0.45)' : 'rgba(34,197,94,0.45)'} />
            </linearGradient>
          </defs>

          <circle cx="50" cy="50" r="49" fill="url(#scopeGlow)" />

          {/* rings */}
          {[25, 50, 75].map(r => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r * 0.5}
              fill="none"
              stroke="#1a3a1a"
              strokeWidth="0.5"
            />
          ))}

          {/* crosshair */}
          <line x1="50" y1="2" x2="50" y2="98" stroke="#1a3a1a" strokeWidth="0.5" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#1a3a1a" strokeWidth="0.5" />

          {/* compass */}
          <text x="50" y="8" textAnchor="middle" fontSize="4" fill="#86efac" opacity="0.8">
            N
          </text>
          <text x="50" y="98" textAnchor="middle" fontSize="4" fill="#86efac" opacity="0.8">
            S
          </text>
          <text x="95" y="52" textAnchor="end" fontSize="4" fill="#86efac" opacity="0.8">
            E
          </text>
          <text x="5" y="52" textAnchor="start" fontSize="4" fill="#86efac" opacity="0.8">
            W
          </text>

          {/* blips */}
          {blips.map((b, idx) => {
            const baseX = 50 + b.x * 38;
            const baseY = 50 + b.y * 38;
            const jump = glitchActive && idx % 2 === 0 ? (idx % 4 === 0 ? 1.5 : -1.5) : 0;
            return (
              <g key={b.id} className="animate-[blipDrift_var(--d)_ease-in-out_infinite] [--d:8s]">
                <circle cx={baseX + jump} cy={baseY - jump} r="1.2" fill="#22c55e" />
                <circle
                  cx={baseX + jump}
                  cy={baseY - jump}
                  r="2.6"
                  fill="none"
                  stroke="rgba(34,197,94,0.22)"
                  strokeWidth="0.6"
                />
                <text
                  x={baseX + 2.5}
                  y={baseY - 2}
                  fontSize="2.8"
                  fill="#86efac"
                  opacity="0.85"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {b.callSign}
                </text>
                <text
                  x={baseX + 2.5}
                  y={baseY + 2}
                  fontSize="2.6"
                  fill="#86efac"
                  opacity="0.75"
                  className={idx === 2 && hasAnomaly ? 'animate-[altFlicker_180ms_linear_infinite]' : ''}
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {idx === 2 && hasAnomaly ? `${b.altitude + (idx * 37)}` : `${b.altitude}`}
                </text>
              </g>
            );
          })}

          {/* unknown edge blip */}
          {hasAnomaly && (
            <g className="animate-[ghostFlicker_500ms_ease-in-out_infinite]">
              <circle cx="92" cy="22" r="1.3" fill="rgba(34,197,94,0.6)" />
              <text
                x="88"
                y="18"
                fontSize="2.8"
                fill="rgba(226,232,240,0.9)"
                textAnchor="end"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                [UNKNOWN]
              </text>
            </g>
          )}

          {/* ghost blips */}
          {hasAnomaly &&
            Array.from({ length: ghostCount }).map((_, i) => (
              <g
                key={`ghost-${i}`}
                className="animate-[ghostFlicker_420ms_ease-in-out_infinite]"
                opacity={0.6 - i * 0.15}
              >
                <circle cx={24 + i * 10} cy={18 + i * 8} r="1.2" fill="#86efac" />
                <circle cx={24 + i * 10} cy={18 + i * 8} r="3.2" fill="none" stroke="rgba(134,239,172,0.22)" strokeWidth="0.6" />
              </g>
            ))}
        </svg>

        {/* sweep line */}
        <div className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 h-1 w-1"
            style={{
              transformOrigin: '0% 50%',
              transform: 'translate(-50%, -50%) rotate(0deg)',
              animation: 'sweep 4s linear infinite',
            }}
          >
            <div
              style={{
                width: '46vmin',
                maxWidth: '480px',
                height: '2px',
                background: `linear-gradient(90deg, rgba(0,0,0,0), ${
                  isEscalated ? 'rgba(245,158,11,0.6)' : 'rgba(34,197,94,0.6)'
                })`,
              }}
            />
          </div>
        </div>

        {(glitchActive || isEscalated) && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2">
            <div
              className={[
                'rounded-md border px-3 py-1 text-xs tracking-[0.16em]',
                isEscalated
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                  : 'border-red-500/60 bg-red-500/10 text-red-200',
              ].join(' ')}
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              {isEscalated ? 'WARNING: MULTIPLE ANOMALIES' : 'SIGNAL ANOMALY DETECTED'}
            </div>
          </div>
        )}

        <style>{`
          @keyframes sweep { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
          @keyframes ghostFlicker { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
          @keyframes altFlicker { 0% { opacity: 0.25; } 100% { opacity: 1; } }
          @keyframes radarGlitch { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(0.8px,-0.6px); } }
          @keyframes blipDrift { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(1px,-1px); } }
        `}</style>
      </div>
    </div>
  );
};

