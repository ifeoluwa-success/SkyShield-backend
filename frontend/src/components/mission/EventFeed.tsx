import React, { useMemo } from 'react';
import type { IncidentEvent } from '../../types/incident';

interface EventFeedProps {
  events: IncidentEvent[];
  maxVisible?: number;
}

const pad2 = (n: number) => n.toString().padStart(2, '0');

const formatHHMMSS = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const badgeClass = (type: IncidentEvent['event_type']) => {
  switch (type) {
    case 'action_submitted':
      return 'bg-blue-500/15 text-blue-200 border-blue-500/30';
    case 'phase_changed':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
    case 'escalation_triggered':
      return 'bg-red-500/15 text-red-200 border-red-500/30 animate-pulse';
    case 'hint_requested':
      return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
    case 'intervention_applied':
      return 'bg-purple-500/15 text-purple-200 border-purple-500/30';
    case 'timeout_occurred':
      return 'bg-orange-500/15 text-orange-200 border-orange-500/30';
    case 'participant_joined':
    case 'participant_left':
      return 'bg-slate-500/15 text-slate-200 border-slate-500/30';
    default:
      return 'bg-slate-500/10 text-slate-200 border-slate-500/25';
  }
};

const describeEvent = (e: IncidentEvent) => {
  const msg = e.payload?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (e.event_type === 'phase_changed') {
    const to = e.payload?.to;
    if (typeof to === 'string') return `Phase → ${to}`;
  }
  if (e.actor_username) return `${e.event_type} by ${e.actor_username}`;
  return e.event_type.replace(/_/g, ' ');
};

export const EventFeed: React.FC<EventFeedProps> = ({ events, maxVisible = 8 }) => {
  const visible = useMemo(() => events.slice(0, maxVisible), [events, maxVisible]);

  return (
    <div
      className="h-full rounded-xl border border-slate-800/70 bg-slate-950/40 p-3"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <div className="mb-2 text-xs tracking-[0.22em] text-slate-300">EVENT FEED</div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="text-xs text-slate-500">No events yet.</div>
        ) : (
          visible.map(e => (
            <div
              key={e.id}
              className="animate-[missionSlideIn_180ms_ease-out] rounded-lg border border-slate-800/50 bg-slate-950/30 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">{formatHHMMSS(e.timestamp)}</div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeClass(e.event_type)}`}>
                  {e.event_type}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-200">{describeEvent(e)}</div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes missionSlideIn {
          from { transform: translateY(-6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

