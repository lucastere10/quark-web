"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Maximize2, Minimize2, X } from "lucide-react"

import { getBehaviorHint } from "@/lib/behavior-hint"
import { useSimulationStore } from "@/store/simulation-store"

import { BrainExpandButton } from "./brain-panel"
import { IOBars } from "./io-bars"
import { NeuralNetworkView } from "./neural-network-view"

export function CreatureInspector() {
  const selectedCreatureId = useSimulationStore((s) => s.selectedCreatureId)
  const creatures = useSimulationStore((s) => s.creatures)
  const inspectorMinimized = useSimulationStore((s) => s.inspectorMinimized)
  const selectCreature = useSimulationStore((s) => s.selectCreature)
  const setInspectorMinimized = useSimulationStore(
    (s) => s.setInspectorMinimized,
  )

  const creature = creatures.find((c) => c.id === selectedCreatureId)

  if (!creature) return null

  const behaviorHint = getBehaviorHint(creature)
  const speciesLabel =
    creature.species === "carnivore" ? "Carnivore" : "Herbivore"
  const speciesClassName =
    creature.species === "carnivore"
      ? "border-[#ff6633]/50 font-mono text-[10px] text-[#ff6633]"
      : "border-[#22ff77]/50 font-mono text-[10px] text-[#22ff77]"

  if (inspectorMinimized) {
    return (
      <div className="quark-panel quark-inspector animate-in slide-in-from-bottom-4 absolute inset-x-4 bottom-4 z-20 rounded-lg px-3 py-2 duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-medium text-[var(--quark-accent)]">
              #{creature.id}
            </h3>
            <Badge variant="outline" className={speciesClassName}>
              {speciesLabel}
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--quark-border)] font-mono text-[10px]"
            >
              Gen {creature.generation}
            </Badge>
            <p className="min-w-0 truncate text-xs text-[var(--quark-accent)]/90">
              {behaviorHint}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <BrainExpandButton />
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setInspectorMinimized(false)}
              title="Expand inspector"
            >
              <Maximize2 className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => selectCreature(null)}
              title="Close inspector"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="quark-panel quark-inspector animate-in slide-in-from-bottom-4 absolute inset-x-4 bottom-4 z-20 max-h-[40vh] overflow-y-auto rounded-lg p-4 duration-300">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-medium text-[var(--quark-accent)]">
              Creature #{creature.id}
            </h3>
            <Badge
              variant="outline"
              className={speciesClassName}
            >
              {speciesLabel}
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--quark-border)] font-mono text-[10px]"
            >
              Gen {creature.generation}
            </Badge>
            {creature.isSprinting && (
              <Badge
                variant="outline"
                className="border-[#ffcc00]/50 font-mono text-[10px] text-[#ffcc00]"
              >
                Sprinting
              </Badge>
            )}
            {creature.isResting && (
              <Badge
                variant="outline"
                className="border-[#ff9900]/50 font-mono text-[10px] text-[#ff9900]"
              >
                Resting
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--quark-muted)]">
            DNA: {creature.dnaHash}
          </p>
          <p className="mt-1 text-xs text-[var(--quark-accent)]/90">
            {behaviorHint}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BrainExpandButton />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setInspectorMinimized(true)}
            title="Minimize inspector"
          >
            <Minimize2 className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => selectCreature(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Age", value: creature.age },
          {
            label: "Energy",
            value: `${creature.energy.toFixed(1)} / ${creature.maxEnergy.toFixed(0)}`,
          },
          { label: "Fitness", value: creature.fitness.toFixed(1) },
          { label: "Food Eaten", value: creature.foodEaten },
          ...(creature.species === "carnivore"
            ? [{ label: "Kills", value: creature.killCount }]
            : [{ label: "Times Attacked", value: creature.timesAttacked }]),
          { label: "Distance", value: creature.distanceTraveled.toFixed(0) },
          { label: "Vision", value: creature.visionRange.toFixed(0) },
          {
            label: "Vision Angle",
            value: `${creature.visionHalfAngle.toFixed(0)}°`,
          },
          { label: "Scent", value: creature.scentRange.toFixed(0) },
          { label: "Hearing", value: creature.hearingRange.toFixed(0) },
          { label: "Noise", value: creature.noiseEmission.toFixed(2) },
          { label: "Speed Cap", value: creature.maxSpeed.toFixed(1) },
          { label: "Size", value: creature.size.toFixed(1) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded border border-[var(--quark-border)] bg-black/20 px-3 py-2"
          >
            <p className="text-[10px] uppercase text-[var(--quark-muted)]">
              {stat.label}
            </p>
            <p className="font-mono text-sm">{stat.value}</p>
          </div>
        ))}
      </div>

      <IOBars creature={creature} compact />
      <NeuralNetworkView creature={creature} mode="compact" height={144} />
    </div>
  )
}
