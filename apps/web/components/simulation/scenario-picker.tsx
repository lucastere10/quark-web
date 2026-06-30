"use client"

import { SCENARIOS, getScenarioById } from "@/engine/scenarios"
import { useSimulationStore } from "@/store/simulation-store"
import { cn } from "@workspace/ui/lib/utils"

export function ScenarioPicker() {
  const phase = useSimulationStore((s) => s.phase)
  const selectedScenarioId = useSimulationStore((s) => s.selectedScenarioId)
  const applyScenario = useSimulationStore((s) => s.applyScenario)

  const disabled = phase === "active"
  const selectedScenario = selectedScenarioId
    ? getScenarioById(selectedScenarioId)
    : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((scenario) => {
          const isSelected = selectedScenarioId === scenario.id

          return (
            <button
              key={scenario.id}
              type="button"
              disabled={disabled}
              onClick={() => applyScenario(scenario.id)}
              className={cn(
                "rounded-md border px-2.5 py-2 text-left transition-colors",
                isSelected
                  ? "border-[var(--quark-accent)] bg-[var(--quark-accent)]/10"
                  : "border-[var(--quark-border)] bg-black/20 hover:border-[var(--quark-accent)]/40",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <p className="text-xs font-medium text-foreground">
                {scenario.name}
              </p>
            </button>
          )
        })}
      </div>

      {selectedScenario && (
        <div className="rounded-md border border-[var(--quark-accent)]/25 bg-[var(--quark-accent)]/5 px-3 py-2.5">
          <p className="text-xs font-medium text-[var(--quark-accent)]">
            {selectedScenario.name}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--quark-muted)]">
            {selectedScenario.description}
          </p>
        </div>
      )}

      {!selectedScenario && (
        <p className="text-[10px] leading-relaxed text-[var(--quark-muted)]/80">
          Select a preset to load tuned parameters. Use Randomize for a custom
          mix.
        </p>
      )}
    </div>
  )
}
