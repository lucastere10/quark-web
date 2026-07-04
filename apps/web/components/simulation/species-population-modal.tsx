"use client"

import { useMemo } from "react"
import { X } from "lucide-react"

import {
  type ChartAxisMode,
  buildSpeciesPopulationSeries,
} from "@/lib/chart-data"
import { useSimulationStore } from "@/store/simulation-store"

import { SpeciesPopulationChart } from "./species-population-chart"

interface SpeciesPopulationModalProps {
  open: boolean
  onClose: () => void
  axisMode: ChartAxisMode
}

export function SpeciesPopulationModal({
  open,
  onClose,
  axisMode,
}: SpeciesPopulationModalProps) {
  if (!open) return null

  return <SpeciesPopulationModalContent onClose={onClose} axisMode={axisMode} />
}

function SpeciesPopulationModalContent({
  onClose,
  axisMode,
}: Omit<SpeciesPopulationModalProps, "open">) {
  const statsHistory = useSimulationStore((s) => s.statsHistory)
  const generationLength = useSimulationStore((s) => s.config.generationLength)

  const { data, families } = useMemo(
    () => buildSpeciesPopulationSeries(statsHistory, axisMode, generationLength),
    [statsHistory, axisMode, generationLength],
  )

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30 w-[520px] max-w-[calc(100%-2rem)]">
      <div className="pointer-events-auto quark-panel rounded-lg border border-[var(--quark-border)] shadow-xl shadow-black/40">
        <div className="flex items-center justify-end border-b border-[var(--quark-border)] px-2 py-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--quark-muted)] transition-colors hover:bg-black/30 hover:text-foreground"
            aria-label="Close expanded species chart"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-2">
          <SpeciesPopulationChart
            data={data}
            families={families}
            axisMode={axisMode}
            height={320}
          />
        </div>
      </div>
    </div>
  )
}
