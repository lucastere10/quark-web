"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Brain } from "lucide-react"

import { useSimulationStore } from "@/store/simulation-store"

import { IOBars } from "./io-bars"
import { NeuralNetworkView } from "./neural-network-view"

function useCreature() {
  const selectedCreatureId = useSimulationStore((s) => s.selectedCreatureId)
  const creatures = useSimulationStore((s) => s.creatures)
  return creatures.find((c) => c.id === selectedCreatureId) ?? null
}

export function BrainPanel() {
  const brainPanelOpen = useSimulationStore((s) => s.brainPanelOpen)
  const setBrainPanelOpen = useSimulationStore((s) => s.setBrainPanelOpen)
  const creature = useCreature()

  if (!creature) return null

  return (
    <Sheet open={brainPanelOpen} onOpenChange={setBrainPanelOpen}>
      <SheetContent
        side="right"
        className="w-full border-[var(--quark-border)] bg-[#0a0a14] sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display text-[var(--quark-accent)]">
            <Brain className="size-4" />
            Brain — Creature #{creature.id}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            DNA {creature.dnaHash} · Gen {creature.generation}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 overflow-y-auto pb-6">
          <IOBars creature={creature} />
          <NeuralNetworkView
            creature={creature}
            mode="full"
            height="50vh"
            interactive
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function BrainExpandButton() {
  const creature = useCreature()
  const setBrainPanelOpen = useSimulationStore((s) => s.setBrainPanelOpen)

  if (!creature) return null

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--quark-accent)]/40 px-2.5 py-1 text-xs text-[var(--quark-accent)] transition-colors hover:bg-[var(--quark-accent)]/10"
      onClick={() => setBrainPanelOpen(true)}
    >
      <Brain className="size-3.5" />
      Expand Brain
    </button>
  )
}
