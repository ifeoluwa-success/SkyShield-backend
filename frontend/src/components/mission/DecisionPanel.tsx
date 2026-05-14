"use client"

import { useEffect, useState } from "react"
import { cn } from "../../lib/utils"
import { Lightbulb, CheckCircle2, Radio } from "lucide-react"
import { Spinner } from "../ui/Loading"

interface Option {
  id: string
  text: string
}

interface DecisionPanelProps {
  description?: string
  options?: Option[]
  onSubmitAction?: (optionId: string) => void
  onRequestHint?: () => void
  isSubmitting?: boolean
  hintText?: string | null
  hintsUsed?: number
  maxHints?: number
  /** Mission WebSocket connected — used for empty-state copy */
  channelConnected?: boolean
  /** After submitting a decision, before next step arrives */
  awaitingNextStep?: boolean
}

export function DecisionPanel({
  description,
  options = [],
  onSubmitAction,
  onRequestHint,
  isSubmitting = false,
  hintText = null,
  hintsUsed = 0,
  maxHints = 3,
  channelConnected = false,
  awaitingNextStep = false,
}: DecisionPanelProps) {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setSelected(null)
  }, [options])

  const canHint = hintsUsed < maxHints && !isSubmitting
  const hasOptions = options.length > 0

  const handleSelect = (optionId: string) => {
    if (isSubmitting) return
    setSelected(optionId)
    onSubmitAction?.(optionId)
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-neutral-700 tracking-wide uppercase">
                Incident Response
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">
                Hints: <span className="font-semibold text-amber-600">{hintsUsed}/{maxHints}</span>
              </span>
              <button
                type="button"
                disabled={!canHint}
                onClick={() => onRequestHint?.()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  canHint
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                )}
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Get Hint
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-5">
          {(awaitingNextStep || isSubmitting) && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
              <Spinner size="sm" />
              <span>{awaitingNextStep ? "Locking in decision — syncing mission state…" : "Submitting…"}</span>
            </div>
          )}

          <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4">
            {description ? (
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            ) : (
              <p className="text-sm text-neutral-400 italic">
                {channelConnected
                  ? "Awaiting step instructions from mission control…"
                  : "Reconnect to receive the next incident step."}
              </p>
            )}
          </div>

          {/* Options */}
          {hasOptions ? (
            <div className="mt-5 space-y-2">
              {options.map((opt) => {
                const isSelected = selected === opt.id
                const disabled = isSubmitting && !isSelected

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      "group w-full rounded-xl border px-4 py-3.5 text-left text-sm transition-all duration-200",
                      isSelected
                        ? "border-amber-500 bg-amber-50 text-neutral-900 ring-2 ring-amber-500/20"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-amber-300 hover:bg-amber-50/50",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{opt.text}</span>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-10 text-center">
              <Radio className="h-8 w-8 text-neutral-300" aria-hidden />
              <div>
                <p className="text-sm font-medium text-neutral-600">No response options yet</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {channelConnected
                    ? "The next step should appear automatically when the server advances the mission. If this persists, check your connection or wait for the lead operator."
                    : "Connect to the live channel to receive decision options in real time."}
                </p>
              </div>
              {(awaitingNextStep || isSubmitting) && (
                <div className="flex items-center gap-2 text-xs text-amber-800">
                  <Spinner size="sm" />
                  Waiting for next step…
                </div>
              )}
            </div>
          )}

          {/* Hint Display */}
          {hintText && (
            <div className="mt-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-1.5">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Hint
                  </p>
                  <p className="text-sm text-amber-900">{hintText}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
