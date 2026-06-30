"use client"

import { INPUT_LABELS, OUTPUT_LABELS } from "@/engine/neural-network"
import type { CreatureSnapshot } from "@/store/simulation-store"

function barWidthPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.abs(value) * 100))
}

interface IOBarsProps {
  creature: CreatureSnapshot
  compact?: boolean
}

export function IOBars({ creature, compact = false }: IOBarsProps) {
  const labelWidth = compact ? "w-20" : "w-28"

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
          Inputs
        </p>
        <div className="space-y-1.5">
          {creature.inputs.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`${labelWidth} shrink-0 truncate text-[10px] text-[var(--quark-muted)]`}
                title={INPUT_LABELS[i]}
              >
                {INPUT_LABELS[i]}
              </span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-[#00e5cc]"
                  style={{ width: `${barWidthPercent(value)}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-[10px]">
                {value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
          Outputs
        </p>
        <div className="space-y-1.5">
          {creature.outputs.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`${labelWidth} shrink-0 truncate text-[10px] text-[var(--quark-muted)]`}
                title={OUTPUT_LABELS[i]}
              >
                {OUTPUT_LABELS[i]}
              </span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-[#ff9900]"
                  style={{ width: `${barWidthPercent(value)}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-[10px]">
                {value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
