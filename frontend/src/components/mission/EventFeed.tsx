"use client"

import React, { useMemo } from "react"
import { cn } from "../../lib/utils"
import { 
  Activity, 
  Send, 
  ArrowRight, 
  AlertTriangle, 
  Lightbulb, 
  Zap, 
  Clock,
  UserPlus,
  UserMinus
} from "lucide-react"
import type { EventType, IncidentEvent } from "../../types/incident"

interface EventFeedProps {
  events?: IncidentEvent[]
  maxVisible?: number
}

const pad2 = (n: number) => n.toString().padStart(2, "0")

const formatHHMMSS = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "--:--:--"
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

const eventConfig: Record<EventType, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  action_submitted: { icon: Send, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  phase_changed: { icon: ArrowRight, color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  escalation_triggered: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
  hint_requested: { icon: Lightbulb, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  intervention_applied: { icon: Zap, color: "text-violet-600", bgColor: "bg-violet-50", borderColor: "border-violet-200" },
  timeout_occurred: { icon: Clock, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  participant_joined: { icon: UserPlus, color: "text-neutral-600", bgColor: "bg-neutral-50", borderColor: "border-neutral-200" },
  participant_left: { icon: UserMinus, color: "text-neutral-600", bgColor: "bg-neutral-50", borderColor: "border-neutral-200" },
  system: { icon: Activity, color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
}

const describeEvent = (e: IncidentEvent) => {
  const msg = e.payload?.message
  if (typeof msg === "string" && msg.trim()) return msg
  if (e.event_type === "phase_changed") {
    const to = e.payload?.to
    if (typeof to === "string") return `Phase → ${to}`
  }
  if (e.actor_username) return `${e.event_type.replace(/_/g, " ")} by ${e.actor_username}`
  return e.event_type.replace(/_/g, " ")
}

export function EventFeed({ events = [], maxVisible = 8 }: EventFeedProps) {
  const visible = useMemo(() => events.slice(0, maxVisible), [events, maxVisible])

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-neutral-500 mb-4">
        <Activity className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">Event Feed</span>
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="text-center py-8 text-sm text-neutral-400">
            No events yet
          </div>
        ) : (
          visible.map((e) => {
            const config = eventConfig[e.event_type] || eventConfig.action_submitted
            const Icon = config.icon

            return (
              <div
                key={e.id}
                className={cn(
                  "rounded-lg border p-3 transition-all animate-in slide-in-from-top-2 duration-200",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-full p-1.5", config.bgColor)}>
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-xs font-medium capitalize", config.color)}>
                        {e.event_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {formatHHMMSS(e.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-700 truncate">
                      {describeEvent(e)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
