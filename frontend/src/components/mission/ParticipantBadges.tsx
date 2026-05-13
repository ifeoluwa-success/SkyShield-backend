import React from 'react';
import type { MissionParticipant } from '../../types/incident';

interface ParticipantBadgesProps {
  participants: MissionParticipant[];
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const ParticipantBadges: React.FC<ParticipantBadgesProps> = ({ participants }) => {
  return (
    <div
      className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-3"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <div className="mb-2 text-xs tracking-[0.22em] text-slate-300">PARTICIPANTS</div>

      {participants.length === 0 ? (
        <div className="text-xs text-slate-500">No participants.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {participants.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/30 px-3 py-1"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.is_active ? '#22c55e' : '#64748b' }}
              />
              <span className="text-xs text-slate-200">{truncate(p.username || 'user', 10)}</span>
              <span className="text-[10px] text-slate-400">{p.role.replace(/_/g, ' ')}</span>
              {p.is_ready && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                  READY
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

