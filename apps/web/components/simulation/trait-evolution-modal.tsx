"use client"

import { useMemo } from "react"
import { X } from "lucide-react"

import {
  type ChartAxisMode,
  type TraitStatKey,
  buildChartSeries,
} from "@/lib/chart-data"
import { useSimulationStore } from "@/store/simulation-store"

import { TraitEvolutionChart } from "./trait-evolution-chart"

interface TraitEvolutionModalProps {
  open: boolean
  onClose: () => void
  axisMode: ChartAxisMode
  selectedTrait?: TraitStatKey | null
  onSelectedTraitChange?: (trait: TraitStatKey | null) => void
}

export function TraitEvolutionModal({
  open,
  onClose,
  axisMode,
  selectedTrait,
  onSelectedTraitChange,
}: TraitEvolutionModalProps) {
  const statsHistory = useSimulationStore((s) => s.statsHistory)
  const generationLength = useSimulationStore((s) => s.config.generationLength)

  const data = useMemo(
    () => buildChartSeries(statsHistory, axisMode, generationLength),
    [statsHistory, axisMode, generationLength],
  )

  if (!open) return null

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30 w-[480px] max-w-[calc(100%-2rem)]">
      <div className="pointer-events-auto quark-panel rounded-lg border border-[var(--quark-border)] shadow-xl shadow-black/40">
        <div className="flex items-center justify-end border-b border-[var(--quark-border)] px-2 py-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--quark-muted)] transition-colors hover:bg-black/30 hover:text-foreground"
            aria-label="Close expanded chart"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-2">
          <TraitEvolutionChart
            data={data}
            axisMode={axisMode}
            height={320}
            showExpand={false}
            selectedTrait={selectedTrait}
            onSelectedTraitChange={onSelectedTraitChange}
          />
        </div>
      </div>
    </div>
  )
}
