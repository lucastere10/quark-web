"use client"

import { useEffect, useState } from "react"

import type { SimulationDynamics } from "@/engine/scenarios"
import { useSimulation } from "@/hooks/use-simulation"
import type { ChartAxisMode, TraitStatKey } from "@/lib/chart-data"
import { useSimulationStore } from "@/store/simulation-store"

import { BrainPanel } from "./brain-panel"
import { ControlPanel } from "./control-panel"
import { CreatureInspector } from "./creature-inspector"
import { SimulationCanvas } from "./simulation-canvas"
import { SimulationModeDialog } from "./simulation-mode-dialog"
import { SimulationSummaryDialog } from "./simulation-summary-dialog"
import { StatsPanel } from "./stats-panel"
import { TraitEvolutionModal } from "./trait-evolution-modal"

export function SimulationView() {
  const { startSimulation, quitSimulation, resetToPreview } = useSimulation()
  const phase = useSimulationStore((s) => s.phase)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const sessionSummary = useSimulationStore((s) => s.sessionSummary)
  const ecosystemMode = useSimulationStore((s) => s.config.ecosystemMode)
  const setConfig = useSimulationStore((s) => s.setConfig)
  const setDynamics = useSimulationStore((s) => s.setDynamics)

  const [chartAxisMode, setChartAxisMode] = useState<ChartAxisMode>("generation")
  const [traitChartExpanded, setTraitChartExpanded] = useState(false)
  const [selectedTrait, setSelectedTrait] = useState<TraitStatKey | null>(null)

  useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  const effectiveChartAxisMode = ecosystemMode ? "tick" : chartAxisMode

  const handleCloseSummary = () => {
    resetToPreview()
  }

  const handleSelectMode = (
    nextEcosystemMode: boolean,
    nextDynamics: SimulationDynamics,
  ) => {
    setConfig({ ecosystemMode: nextEcosystemMode })
    setDynamics(nextDynamics)
  }

  return (
    <div className="quark-app relative flex h-svh w-full overflow-hidden">
      <div className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-[var(--quark-border)]">
        <ControlPanel
          onStart={startSimulation}
          onQuit={quitSimulation}
          onReset={resetToPreview}
        />
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[var(--quark-border)] px-6 py-3">
          <p className="font-display text-sm text-[var(--quark-muted)]">
            Can intelligence emerge without being programmed?
          </p>
          <p className="text-xs text-[var(--quark-muted)]/70">
            {phase === "idle" &&
              "Adjust sliders to preview the world, then press Start."}
            {phase === "active" &&
              (isRunning
                ? "Simulation running — click a creature to inspect its brain."
                : "Paused — adjust speed or press Resume.")}
            {phase === "ended" && "Session ended — review your results."}
          </p>
        </div>

        <div className="relative min-h-0 flex-1 p-4">
          <SimulationCanvas />
          <CreatureInspector />
          <TraitEvolutionModal
            open={traitChartExpanded}
            onClose={() => setTraitChartExpanded(false)}
            axisMode={effectiveChartAxisMode}
            selectedTrait={selectedTrait}
            onSelectedTraitChange={setSelectedTrait}
          />
        </div>
      </main>

      <div className="w-72 shrink-0 border-l border-[var(--quark-border)]">
        <StatsPanel
          chartAxisMode={effectiveChartAxisMode}
          onChartAxisModeChange={setChartAxisMode}
          showTraitExpand={phase === "active"}
          onExpandTraitChart={() => setTraitChartExpanded(true)}
          selectedTrait={selectedTrait}
          onSelectedTraitChange={setSelectedTrait}
        />
      </div>

      <BrainPanel />
      <SimulationModeDialog
        phase={phase}
        onSelectMode={handleSelectMode}
        onStart={startSimulation}
      />
      <SimulationSummaryDialog
        summary={sessionSummary}
        open={phase === "ended" && sessionSummary !== null}
        onClose={handleCloseSummary}
      />
    </div>
  )
}
