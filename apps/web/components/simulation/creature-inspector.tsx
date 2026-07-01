"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { X } from "lucide-react"

import { getBehaviorHint } from "@/lib/behavior-hint"
import { useSimulationStore } from "@/store/simulation-store"

import { BrainExpandButton } from "./brain-panel"
import { IOBars } from "./io-bars"
import { NeuralNetworkView } from "./neural-network-view"

export function CreatureInspector() {
  const selectedCreatureId = useSimulationStore((s) => s.selectedCreatureId)
  const creatures = useSimulationStore((s) => s.creatures)
  const selectCreature = useSimulationStore((s) => s.selectCreature)

  const creature = creatures.find((c) => c.id === selectedCreatureId)

  if (!creature) return null

  const behaviorHint = getBehaviorHint(creature)

  return (
    <div className="quark-panel quark-inspector animate-in slide-in-from-bottom-4 absolute inset-x-4 bottom-4 z-20 max-h-[40vh] overflow-y-auto rounded-lg p-4 duration-300">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-medium text-[var(--quark-accent)]">
              Creature #{creature.id}
            </h3>
            <Badge
              variant="outline"
              className="border-[var(--quark-border)] font-mono text-[10px]"
            >
              Gen {creature.generation}
            </Badge>
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
            onClick={() => selectCreature(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Age", value: creature.age },
          { label: "Energy", value: creature.energy.toFixed(1) },
          { label: "Fitness", value: creature.fitness.toFixed(1) },
          { label: "Food Eaten", value: creature.foodEaten },
          { label: "Distance", value: creature.distanceTraveled.toFixed(0) },
          { label: "Vision", value: creature.visionRange.toFixed(0) },
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
