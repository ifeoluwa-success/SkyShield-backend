"use client"

import { useMemo } from "react"
import { cn } from "../../lib/utils"
import { 
  Satellite, 
  Radio, 
  Radar, 
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"

type Phase = "briefing" | "detection" | "investigation" | "containment" | "recovery" | "review"
type LogLevel = "INFO" | "WARN" | "ERROR"

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  system: string
  message: string
}

interface OpsDashboardProps {
  currentPhase?: Phase
  glitchActive?: boolean
  isEscalated?: boolean
  customLogs?: LogEntry[]
  threatType?: string
  /** Dark console panels for mission player */
  appearance?: "default" | "immersive"
  /** Calm copy when no events yet */
  standbyMode?: boolean
  /** Linked operators — subtle live chrome */
  teamActive?: boolean
}

const pad2 = (n: number) => n.toString().padStart(2, "0")
const nowTs = () => {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

const StatusIcon = ({ state }: { state: "good" | "warn" | "bad" }) => {
  if (state === "good") return <CheckCircle className="h-4 w-4 text-emerald-500" />
  if (state === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />
  return <XCircle className="h-4 w-4 text-red-500" />
}

export function OpsDashboard({
  currentPhase = "detection",
  glitchActive = false,
  isEscalated = false,
  customLogs,
  threatType,
  appearance = "default",
  standbyMode = false,
  teamActive = false,
}: OpsDashboardProps) {
  const immersive = appearance === "immersive"
  const metrics = useMemo(() => {
    const phaseIdx = ["briefing", "detection", "investigation", "containment", "recovery", "review"].indexOf(currentPhase)
    const base = Math.max(0, phaseIdx)
    const packetLoss = Math.min(12, base * 2.1 + (glitchActive ? 3 : 0) + (isEscalated ? 4 : 0))
    const signal = Math.max(10, 92 - base * 12 - (glitchActive ? 15 : 0) - (isEscalated ? 20 : 0))
    const attempts = 6 + base * 9 + (glitchActive ? 18 : 0)
    const gpsStatus = isEscalated ? "CRITICAL" : base >= 2 ? "DEGRADED" : "NOMINAL"
    return { packetLoss, signal, attempts, gpsStatus }
  }, [currentPhase, glitchActive, isEscalated])

  const logs = useMemo<LogEntry[]>(() => {
    if (customLogs) return customLogs
    const entries: LogEntry[] = [
      { id: "l1", timestamp: nowTs(), level: "INFO", system: "GPS-REC", message: "Signal nominal" },
      { id: "l2", timestamp: nowTs(), level: "WARN", system: "COMM", message: `Packet loss ${metrics.packetLoss.toFixed(1)}%` },
    ]
    if (["investigation", "containment", "recovery"].includes(currentPhase) || isEscalated) {
      entries.unshift({ id: "l3", timestamp: nowTs(), level: "ERROR", system: "GPS-REC", message: "Spoofing signature detected" })
    }
    if (glitchActive) {
      entries.unshift(
        { id: "g1", timestamp: nowTs(), level: "ERROR", system: "AUTH", message: "Credential replay pattern observed" },
        { id: "g2", timestamp: nowTs(), level: "ERROR", system: "RADAR-NET", message: "Telemetry jitter exceeded threshold" }
      )
    }
    return entries
  }, [currentPhase, metrics.packetLoss, glitchActive, isEscalated, customLogs])

  const gpsState: "good" | "warn" | "bad" = metrics.gpsStatus === "NOMINAL" ? "good" : metrics.gpsStatus === "DEGRADED" ? "warn" : "bad"
  const commState: "good" | "warn" | "bad" = metrics.packetLoss < 2 ? "good" : metrics.packetLoss < 6 ? "warn" : "bad"
  const radarState: "good" | "warn" | "bad" = metrics.signal > 70 ? "good" : metrics.signal > 40 ? "warn" : "bad"
  const authState: "good" | "warn" | "bad" = metrics.attempts < 20 ? "good" : metrics.attempts < 60 ? "warn" : "bad"

  const statCards = [
    { label: "GPS System", icon: Satellite, state: gpsState, value: metrics.gpsStatus },
    { label: "Comm Links", icon: Radio, state: commState, value: `${metrics.packetLoss.toFixed(1)}% loss` },
    { label: "Radar Net", icon: Radar, state: radarState, value: `${Math.round(metrics.signal)}% signal` },
    { label: "Auth Systems", icon: ShieldCheck, state: authState, value: `${metrics.attempts} attempts` },
  ]

  return (
    <div
      className={cn(
        "w-full max-w-5xl mx-auto space-y-4",
        teamActive && immersive && "rounded-xl p-1 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-slate-950 animate-[opsLivePulse_2.4s_ease-in-out_infinite]",
      )}
    >
      <style>{`
        @keyframes opsLivePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.12); }
          50% { box-shadow: 0 0 24px 2px rgba(34, 197, 94, 0.2); }
        }
      `}</style>

      {standbyMode && immersive && (
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/35 px-3 py-2 text-center text-[11px] text-cyan-100/90">
          <span className="font-mono tracking-wide text-cyan-300/95">OPS CONSOLE</span>
          <span className="mx-2 text-cyan-600">·</span>
          <span className="text-cyan-200/80">
            {threatType ? `Threat vector: ${threatType}. ` : ""}Awaiting coordinated actions from your team.
          </span>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "rounded-xl border p-4 transition-all",
              immersive
                ? "border-slate-700/80 bg-slate-900/85 backdrop-blur-sm"
                : "bg-white",
              glitchActive && (immersive ? "animate-pulse border-red-500/50 bg-red-950/40" : "animate-pulse border-red-200 bg-red-50/50"),
              !glitchActive && !immersive && "border-neutral-200",
              !glitchActive && immersive && "border-slate-700/60",
            )}
          >
            <div className={cn("flex items-center gap-2", immersive ? "text-slate-400" : "text-neutral-500")}>
              <card.icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={cn(
                "text-sm font-semibold",
                card.state === "good" && (immersive ? "text-emerald-400" : "text-emerald-600"),
                card.state === "warn" && (immersive ? "text-amber-400" : "text-amber-600"),
                card.state === "bad" && (immersive ? "text-red-400" : "text-red-600")
              )}>
                {card.value}
              </span>
              <StatusIcon state={card.state} />
            </div>
          </div>
        ))}
      </div>

      {/* Network & Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Network Topology */}
        <div
          className={cn(
            "rounded-xl border p-5",
            immersive ? "border-slate-700/80 bg-slate-900/85" : "border-neutral-200 bg-white",
          )}
        >
          <div className={cn("flex items-center gap-2 mb-4", immersive ? "text-slate-400" : "text-neutral-500")}>
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Network Topology</span>
          </div>
          <div className={cn("rounded-lg p-4", immersive ? "bg-slate-950/80" : "bg-neutral-50")}>
            <svg viewBox="0 0 240 140" className="w-full h-44">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Connection Lines */}
              {[
                { a: [30, 70], b: [80, 30], idx: 0 },
                { a: [30, 70], b: [80, 110], idx: 1 },
                { a: [80, 30], b: [155, 45], idx: 2 },
                { a: [80, 110], b: [155, 95], idx: 3 },
                { a: [155, 45], b: [155, 95], idx: 4 },
              ].map((l) => {
                const bad = isEscalated || (glitchActive && l.idx % 2 === 0) || currentPhase === "containment"
                const warn = !bad && (currentPhase === "investigation" || currentPhase === "recovery")
                const stroke = bad ? "#ef4444" : warn ? "#f59e0b" : "#22c55e"
                return (
                  <line
                    key={l.idx}
                    x1={l.a[0]}
                    y1={l.a[1]}
                    x2={l.b[0]}
                    y2={l.b[1]}
                    stroke={stroke}
                    strokeWidth="2"
                    opacity={0.6}
                    strokeLinecap="round"
                  />
                )
              })}

              {/* Nodes */}
              {[
                { id: "TOWER", x: 30, y: 70 },
                { id: "COMM", x: 80, y: 30 },
                { id: "GPS", x: 80, y: 110 },
                { id: "SRV-A", x: 155, y: 45 },
                { id: "SRV-B", x: 155, y: 95 },
              ].map((n) => (
                <g key={n.id}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="12"
                    fill={immersive ? "#0f172a" : "white"}
                    stroke={immersive ? "#334155" : "#d4d4d4"}
                    strokeWidth="2"
                  />
                  <circle cx={n.x} cy={n.y} r="4" fill={immersive ? "#64748b" : "#a3a3a3"} />
                  <text
                    x={n.x}
                    y={n.y - 18}
                    fontSize="9"
                    textAnchor="middle"
                    fill={immersive ? "#94a3b8" : "#525252"}
                    fontWeight="500"
                  >
                    {n.id}
                  </text>
                </g>
              ))}

              {/* Animated Packet */}
              <circle r="4" fill="#3b82f6" filter="url(#glow)">
                <animateMotion dur="3s" repeatCount="indefinite" path="M30,70 L80,30 L155,45 L155,95 L80,110 L30,70" />
              </circle>
            </svg>
          </div>
        </div>

        {/* Live Log Feed */}
        <div
          className={cn(
            "rounded-xl border p-5",
            immersive ? "border-slate-700/80 bg-slate-900/85" : "border-neutral-200 bg-white",
          )}
        >
          <div className={cn("flex items-center gap-2 mb-4", immersive ? "text-slate-400" : "text-neutral-500")}>
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Live Log Feed</span>
          </div>
          <div className="bg-neutral-900 rounded-lg p-4 h-44 overflow-hidden">
            <div className="space-y-1.5 font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2",
                    log.level === "ERROR" && "text-red-400",
                    log.level === "WARN" && "text-amber-400",
                    log.level === "INFO" && "text-neutral-400"
                  )}
                >
                  <span className="text-neutral-600">[{log.timestamp}]</span>
                  <span className={cn(
                    "font-semibold w-12",
                    log.level === "ERROR" && "text-red-500",
                    log.level === "WARN" && "text-amber-500",
                    log.level === "INFO" && "text-emerald-500"
                  )}>
                    {log.level}
                  </span>
                  <span className="text-neutral-500">{log.system}:</span>
                  <span className="text-neutral-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
