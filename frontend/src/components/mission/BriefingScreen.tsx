"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "../../lib/utils"
import { Shield, User, AlertTriangle, CheckCircle2, ChevronsDown } from "lucide-react"
import { Spinner } from "../ui/Loading"

/** Above this length, show text immediately (typewriter is too slow and confuses users). */
const TYPEWRITER_MAX_CHARS = 900
const TYPEWRITER_MS = 10

interface BriefingScreenProps {
  narrative?: string
  scenarioTitle?: string
  threatType?: string
  operatorRole?: string
  onAcknowledge?: () => void
  isReady?: boolean
  /** e.g. copy invite link — shown in footer row */
  inviteSlot?: React.ReactNode
}

export function BriefingScreen({
  narrative = "",
  scenarioTitle = "Mission",
  threatType = "Unknown Threat",
  operatorRole = "Operator",
  onAcknowledge,
  isReady = false,
  inviteSlot,
}: BriefingScreenProps) {
  const text = useMemo(() => narrative?.trim() ?? "", [narrative])
  const instantMode = text.length > TYPEWRITER_MAX_CHARS
  const [visibleChars, setVisibleChars] = useState(0)
  const [revealComplete, setRevealComplete] = useState(false)
  const [clickedReady, setClickedReady] = useState(false)
  const revealIntervalRef = useRef<number | null>(null)

  const clearRevealInterval = useCallback(() => {
    if (revealIntervalRef.current != null) {
      window.clearInterval(revealIntervalRef.current)
      revealIntervalRef.current = null
    }
  }, [])

  const showFullBriefingNow = useCallback(() => {
    clearRevealInterval()
    setVisibleChars(text.length)
    setRevealComplete(true)
  }, [clearRevealInterval, text])

  useEffect(() => {
    clearRevealInterval()
    if (!text) {
      setVisibleChars(0)
      setRevealComplete(true)
      return
    }
    if (instantMode) {
      setVisibleChars(text.length)
      setRevealComplete(true)
      return
    }

    setVisibleChars(0)
    setRevealComplete(false)

    revealIntervalRef.current = window.setInterval(() => {
      setVisibleChars(prev => {
        const next = Math.min(prev + 1, text.length)
        if (next >= text.length) {
          clearRevealInterval()
          setRevealComplete(true)
        }
        return next
      })
    }, TYPEWRITER_MS)

    return () => clearRevealInterval()
  }, [text, instantMode, clearRevealInterval])

  const canClick = revealComplete && !clickedReady

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-50/95 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-2xl">
          <div className="flex max-h-[min(92vh,56rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-500/20 p-2">
                    <Shield className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-amber-400 tracking-wider uppercase">
                    Mission Briefing
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    {threatType}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
                    <User className="h-3 w-3" />
                    {operatorRole}
                  </span>
                </div>
              </div>
              <h1 className="mt-3 text-xl font-bold text-white sm:mt-4 sm:text-2xl">{scenarioTitle}</h1>
            </div>

            {/* Scrollable narrative */}
            <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
              <div className="flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
                <div className="flex items-center justify-between border-b border-neutral-100/80 bg-neutral-100/50 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Intelligence package
                  </span>
                  {!instantMode && text.length > 0 && !revealComplete && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-50"
                      onClick={showFullBriefingNow}
                    >
                      <ChevronsDown className="h-3 w-3" />
                      Show all
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap break-words">
                    {revealComplete || instantMode ? text : text.slice(0, visibleChars)}
                    {!revealComplete && text.length > 0 && (
                      <span className="inline-block w-0.5 h-4 ml-0.5 bg-amber-500 animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm text-neutral-500">
                    {clickedReady && !isReady && (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                        Waiting for other participants...
                      </span>
                    )}
                  </div>
                  {inviteSlot ? <div className="flex shrink-0">{inviteSlot}</div> : null}
                </div>
                <button
                  type="button"
                  disabled={!canClick}
                  onClick={() => {
                    setClickedReady(true)
                    onAcknowledge?.()
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200",
                    canClick
                      ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/25"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed",
                  )}
                >
                  {clickedReady ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Ready
                    </>
                  ) : (
                    "I am Ready"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
