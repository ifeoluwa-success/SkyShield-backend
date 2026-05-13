import React, { useMemo } from 'react';
import type { MissionPhase } from '../../types/incident';

interface OpsDashboardProps {
  threatType: string;
  currentPhase: MissionPhase;
  sessionState: Record<string, unknown>;
  glitchActive: boolean;
  isEscalated: boolean;
}

type LogEntry = {
  id: string;
  ts: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  system: string;
  message: string;
};

const pad2 = (n: number) => n.toString().padStart(2, '0');
const nowTs = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const levelColor = (level: LogEntry['level']) => {
  if (level === 'ERROR') return 'text-red-200';
  if (level === 'WARN') return 'text-amber-200';
  return 'text-slate-200';
};

export const OpsDashboard: React.FC<OpsDashboardProps> = ({
  currentPhase,
  sessionState,
  glitchActive,
  isEscalated,
}) => {
  const derived = useMemo(() => {
    const phaseIdx = ['briefing', 'detection', 'investigation', 'containment', 'recovery', 'review'].indexOf(
      currentPhase,
    );
    const base = Math.max(0, phaseIdx);
    const packetLoss = Math.min(12, base * 2.1 + (glitchActive ? 3 : 0) + (isEscalated ? 4 : 0));
    const signal = Math.max(10, 92 - base * 12 - (glitchActive ? 15 : 0) - (isEscalated ? 20 : 0));
    const attempts = 6 + base * 9 + (glitchActive ? 18 : 0);
    const gpsStatus = isEscalated ? 'CRITICAL' : base >= 2 ? 'DEGRADED' : 'NOMINAL';
    return { packetLoss, signal, attempts, gpsStatus };
  }, [currentPhase, glitchActive, isEscalated]);

  const logs = useMemo<LogEntry[]>(() => {
    const base: LogEntry[] = [
      { id: 'l1', ts: nowTs(), level: 'INFO', system: 'GPS-REC', message: 'Signal nominal' },
      { id: 'l2', ts: nowTs(), level: 'WARN', system: 'COMM', message: `Packet loss ${derived.packetLoss.toFixed(1)}%` },
    ];
    if (currentPhase === 'investigation' || currentPhase === 'containment' || currentPhase === 'recovery' || isEscalated) {
      base.unshift({
        id: 'l3',
        ts: nowTs(),
        level: 'ERROR',
        system: 'GPS-REC',
        message: 'Spoofing signature detected',
      });
    }
    if (glitchActive) {
      base.unshift(
        { id: 'g1', ts: nowTs(), level: 'ERROR', system: 'AUTH', message: 'Credential replay pattern observed' },
        { id: 'g2', ts: nowTs(), level: 'ERROR', system: 'RADAR-NET', message: 'Telemetry jitter exceeded threshold' },
      );
    }
    const extra = typeof sessionState?.log_burst === 'string' ? sessionState.log_burst : null;
    if (extra) {
      base.unshift({ id: 'x1', ts: nowTs(), level: 'WARN', system: 'SYS', message: extra });
    }
    return base;
  }, [currentPhase, derived.packetLoss, glitchActive, isEscalated, sessionState]);

  const statusDot = (state: 'good' | 'warn' | 'bad') => {
    const c = state === 'good' ? '#22c55e' : state === 'warn' ? '#f59e0b' : '#ef4444';
    return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c }} />;
  };

  const gpsState: 'good' | 'warn' | 'bad' =
    derived.gpsStatus === 'NOMINAL' ? 'good' : derived.gpsStatus === 'DEGRADED' ? 'warn' : 'bad';
  const commState: 'good' | 'warn' | 'bad' = derived.packetLoss < 2 ? 'good' : derived.packetLoss < 6 ? 'warn' : 'bad';
  const radarState: 'good' | 'warn' | 'bad' = derived.signal > 70 ? 'good' : derived.signal > 40 ? 'warn' : 'bad';
  const authState: 'good' | 'warn' | 'bad' = derived.attempts < 20 ? 'good' : derived.attempts < 60 ? 'warn' : 'bad';

  return (
    <div className="h-full w-full rounded-2xl border border-slate-800/70 bg-[#0d0d0d] p-5 shadow-xl">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ fontFamily: "'Courier New', monospace" }}>
        <div className={['rounded-xl border p-4', glitchActive ? 'animate-pulse border-red-500/50 bg-red-500/10' : 'border-slate-800/60 bg-slate-950/30'].join(' ')}>
          <div className="text-xs tracking-[0.2em] text-slate-400">GPS SYSTEM</div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
            {statusDot(gpsState)}
            <span className={gpsState === 'bad' ? 'text-red-200' : gpsState === 'warn' ? 'text-amber-200' : 'text-emerald-200'}>
              {derived.gpsStatus}
            </span>
          </div>
        </div>
        <div className={['rounded-xl border p-4', glitchActive ? 'animate-pulse border-red-500/50 bg-red-500/10' : 'border-slate-800/60 bg-slate-950/30'].join(' ')}>
          <div className="text-xs tracking-[0.2em] text-slate-400">COMM LINKS</div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
            {statusDot(commState)}
            <span>Packet loss</span>
            <span className={commState === 'bad' ? 'text-red-200' : commState === 'warn' ? 'text-amber-200' : 'text-emerald-200'}>
              {derived.packetLoss.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className={['rounded-xl border p-4', glitchActive ? 'animate-pulse border-red-500/50 bg-red-500/10' : 'border-slate-800/60 bg-slate-950/30'].join(' ')}>
          <div className="text-xs tracking-[0.2em] text-slate-400">RADAR NET</div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
            {statusDot(radarState)}
            <span>Signal</span>
            <span className={radarState === 'bad' ? 'text-red-200' : radarState === 'warn' ? 'text-amber-200' : 'text-emerald-200'}>
              {Math.round(derived.signal)}%
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-sm"
                style={{
                  backgroundColor: i < Math.round(derived.signal / 10) ? '#22c55e' : '#1f2937',
                  opacity: i < Math.round(derived.signal / 10) ? 0.9 : 0.5,
                }}
              />
            ))}
          </div>
        </div>
        <div className={['rounded-xl border p-4', glitchActive ? 'animate-pulse border-red-500/50 bg-red-500/10' : 'border-slate-800/60 bg-slate-950/30'].join(' ')}>
          <div className="text-xs tracking-[0.2em] text-slate-400">AUTH SYSTEMS</div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
            {statusDot(authState)}
            <span>Login attempts</span>
            <span className={authState === 'bad' ? 'text-red-200' : authState === 'warn' ? 'text-amber-200' : 'text-emerald-200'}>
              {derived.attempts}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ fontFamily: "'Courier New', monospace" }}>
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-4">
          <div className="mb-2 text-xs tracking-[0.22em] text-slate-300">NETWORK TOPOLOGY</div>
          <svg viewBox="0 0 240 140" className="h-[220px] w-full">
            <defs>
              <circle id="node" r="9" />
            </defs>

            {[
              { id: 'TOWER', x: 30, y: 70 },
              { id: 'COMM-HUB', x: 80, y: 30 },
              { id: 'GPS-REC', x: 80, y: 110 },
              { id: 'SERVER-A', x: 155, y: 45 },
              { id: 'SERVER-B', x: 155, y: 95 },
            ].map(n => (
              <g key={n.id}>
                <use href="#node" x={n.x} y={n.y} fill="#0b1220" stroke="#334155" strokeWidth="2" />
                <text x={n.x} y={n.y - 14} fontSize="9" textAnchor="middle" fill="#e2e8f0">
                  {n.id}
                </text>
              </g>
            ))}

            {[
              { a: [30, 70], b: [80, 30] },
              { a: [30, 70], b: [80, 110] },
              { a: [80, 30], b: [155, 45] },
              { a: [80, 110], b: [155, 95] },
              { a: [155, 45], b: [155, 95] },
            ].map((l, i) => {
              const bad = isEscalated || (glitchActive && i % 2 === 0) || currentPhase === 'containment';
              const warn = !bad && (currentPhase === 'investigation' || currentPhase === 'recovery');
              const stroke = bad ? '#ef4444' : warn ? '#f59e0b' : '#22c55e';
              return (
                <line
                  key={i}
                  x1={l.a[0]}
                  y1={l.a[1]}
                  x2={l.b[0]}
                  y2={l.b[1]}
                  stroke={stroke}
                  strokeWidth="2"
                  opacity={glitchActive ? 0.7 : 0.9}
                  className={glitchActive ? 'animate-pulse' : ''}
                />
              );
            })}

            {/* packet */}
            <circle cx="30" cy="70" r="3" fill="#e2e8f0">
              <animateMotion dur="2.4s" repeatCount="indefinite" path="M30,70 L80,30 L155,45" />
            </circle>
          </svg>
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-4">
          <div className="mb-2 text-xs tracking-[0.22em] text-slate-300">LIVE LOG FEED</div>
          <div className="relative h-[220px] overflow-hidden rounded-lg border border-slate-800/50 bg-black/30">
            <div className="absolute inset-x-0 bottom-0 animate-[logScroll_12s_linear_infinite] space-y-1 p-3">
              {logs.concat(logs).map((l, idx) => (
                <div
                  key={`${l.id}-${idx}`}
                  className={[
                    'text-xs',
                    levelColor(l.level),
                    l.level === 'ERROR' ? 'animate-[errFlash_2s_ease-out]' : '',
                  ].join(' ')}
                >
                  <span className="text-slate-400">[{l.ts}]</span>{' '}
                  <span className={l.level === 'ERROR' ? 'text-red-300' : l.level === 'WARN' ? 'text-amber-300' : 'text-slate-200'}>
                    {l.level}
                  </span>{' '}
                  <span className="text-slate-300">{l.system}:</span> {l.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logScroll {
          from { transform: translateY(0); }
          to { transform: translateY(-45%); }
        }
        @keyframes errFlash {
          0% { background: rgba(239, 68, 68, 0.15); }
          100% { background: transparent; }
        }
      `}</style>
    </div>
  );
};

