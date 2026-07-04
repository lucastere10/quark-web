"use client"

import { useEffect, useState, type ReactNode } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import type { SimulationDynamics } from "@/engine/scenarios"
import type { SimulationPhase } from "@/store/simulation-store"

const DISMISSED_KEY = "quark.modeDialog.dismissed"

interface SimulationModeDialogProps {
  phase: SimulationPhase
  onSelectMode: (
    ecosystemMode: boolean,
    dynamics: SimulationDynamics,
  ) => void
  onStart: () => void
}

function EcosystemPreview() {
  return (
    <div className="relative h-32 overflow-hidden rounded-lg border border-[var(--quark-border)] bg-[#06120c]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_42%,rgba(34,255,119,0.28),transparent_24%),radial-gradient(circle_at_72%_58%,rgba(0,229,204,0.18),transparent_26%)]" />
      <div className="absolute left-5 top-6 size-2 rounded-full bg-[#22ff77] shadow-[0_0_18px_#22ff77]" />
      <div className="absolute left-12 top-12 size-1.5 rounded-full bg-[#22ff77]/80" />
      <div className="absolute bottom-7 left-20 size-2 rounded-full bg-[#22ff77]/70" />
      <div className="absolute right-12 top-7 size-2 rounded-full bg-[#22ff77]/90" />
      <div className="absolute bottom-8 right-16 size-3 rounded-full bg-[#4ecf7a]" />
      <div className="absolute left-14 top-20 size-3 rounded-full border border-[#a8ffcc] bg-[#4ecf7a]" />
      <div className="absolute right-9 top-16 h-0 w-0 border-y-[5px] border-l-[10px] border-y-transparent border-l-[#ff6633]" />
      <div className="absolute bottom-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#22ff77]/50 to-transparent" />
    </div>
  )
}

function GenerationalPreview() {
  return (
    <div className="relative h-32 overflow-hidden rounded-lg border border-[var(--quark-border)] bg-[#0b0b18]">
      <div className="absolute inset-x-5 top-7 flex items-end justify-between">
        {[20, 34, 18, 45, 28].map((height, index) => (
          <div
            key={index}
            className="w-2 rounded-t-full bg-[var(--quark-accent)]/70"
            style={{ height }}
          />
        ))}
      </div>
      <div className="absolute inset-x-5 bottom-9 flex items-center justify-between">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex items-center">
            <div className="size-3 rounded-full border border-[var(--quark-accent)] bg-black" />
            {index < 3 && (
              <div className="h-px w-10 bg-[var(--quark-accent)]/35" />
            )}
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-5 rounded border border-[var(--quark-accent)]/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--quark-accent)]">
        Gen cycle
      </div>
    </div>
  )
}

function EvolutionaryPreview() {
  return (
    <div className="relative h-28 overflow-hidden rounded-lg border border-[var(--quark-border)] bg-[#07110d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(34,255,119,0.22),transparent_26%),radial-gradient(circle_at_70%_65%,rgba(168,255,204,0.12),transparent_24%)]" />
      {[18, 36, 58, 80, 104].map((left, index) => (
        <div
          key={left}
          className="absolute size-3 rounded-full border border-[#a8ffcc]/50 bg-[#4ecf7a]"
          style={{ left, top: 30 + (index % 2) * 24 }}
        />
      ))}
      <div className="absolute bottom-3 left-4 rounded border border-[#22ff77]/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#22ff77]">
        Single niche
      </div>
    </div>
  )
}

function PredatorPreyPreview() {
  return (
    <div className="relative h-28 overflow-hidden rounded-lg border border-[var(--quark-border)] bg-[#130908]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_52%,rgba(34,255,119,0.18),transparent_26%),radial-gradient(circle_at_76%_42%,rgba(255,102,51,0.2),transparent_25%)]" />
      <div className="absolute left-7 top-12 size-3 rounded-full border border-[#a8ffcc]/50 bg-[#4ecf7a]" />
      <div className="absolute left-16 top-8 size-2.5 rounded-full border border-[#a8ffcc]/40 bg-[#4ecf7a]" />
      <div className="absolute right-12 top-12 h-0 w-0 border-y-[6px] border-l-[13px] border-y-transparent border-l-[#ff6633] drop-shadow-[0_0_10px_rgba(255,102,51,0.8)]" />
      <div className="absolute left-10 top-14 h-px w-28 rotate-[-8deg] bg-gradient-to-r from-[#ff6633]/70 to-transparent" />
      <div className="absolute bottom-3 left-4 rounded border border-[#ff6633]/35 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#ff6633]">
        Hunt pressure
      </div>
    </div>
  )
}

function ModeComparisonCard({
  title,
  eyebrow,
  description,
  points,
  preview,
  active,
  onClick,
}: {
  title: string
  eyebrow: string
  description: string
  points: string[]
  preview: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border p-3 text-left transition-all ${
        active
          ? "border-[var(--quark-accent)] bg-[var(--quark-accent)]/10 shadow-[0_0_28px_rgba(0,229,204,0.16)]"
          : "border-[var(--quark-border)] bg-black/25 hover:border-[var(--quark-accent)]/50 hover:bg-black/35"
      }`}
      aria-pressed={active}
    >
      {preview}
      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
          {eyebrow}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm text-[var(--quark-accent)]">
            {title}
          </h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--quark-muted)]">
          {description}
        </p>
        <ul className="mt-3 space-y-1 text-[10px] leading-relaxed text-foreground/80">
          {points.map((point) => (
            <li key={point}>- {point}</li>
          ))}
        </ul>
      </div>
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--quark-muted)]">
      {children}
    </p>
  )
}

export function SimulationModeDialog({
  phase,
  onSelectMode,
  onStart,
}: SimulationModeDialogProps) {
  const [visible, setVisible] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [selectedEcosystemMode, setSelectedEcosystemMode] = useState(true)
  const [selectedDynamics, setSelectedDynamics] =
    useState<SimulationDynamics>("evolutionary")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(window.localStorage.getItem(DISMISSED_KEY) !== "true")
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const open = phase === "idle" && visible

  const close = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_KEY, "true")
    }
    setVisible(false)
  }

  const startSelectedMode = () => {
    onSelectMode(selectedEcosystemMode, selectedDynamics)
    close()
    onStart()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="max-h-[min(860px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))] max-w-none overflow-y-auto border border-[var(--quark-border)] bg-[#080812] p-6 text-[#d8dce6] sm:!max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-[var(--quark-accent)]">
            Choose a simulation mode
          </DialogTitle>
          <DialogDescription>
            Quark can run as a continuous ecosystem or as a controlled
            generational experiment, with emergent dietary pressure.
            You can switch both later from the control panel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <SectionLabel>Simulation mode</SectionLabel>
            <div className="grid gap-3 md:grid-cols-2">
              <ModeComparisonCard
                eyebrow="Default mode"
                title="Ecosystem Mode"
                description="Continuous world. Animals reproduce when fed. Vegetation grows and spreads."
                points={[
                  "No generation reset",
                  "Births and deaths happen live",
                  "Plant patches emerge from fertility",
                ]}
                preview={<EcosystemPreview />}
                active={selectedEcosystemMode}
                onClick={() => setSelectedEcosystemMode(true)}
              />
              <ModeComparisonCard
                eyebrow="Classic mode"
                title="Generational Mode"
                description="Controlled experiments. Survivors seed the next generation after each cycle."
                points={[
                  "Fixed generation length",
                  "Selection pressure drives resets",
                  "Best performers shape offspring",
                ]}
                preview={<GenerationalPreview />}
                active={!selectedEcosystemMode}
                onClick={() => setSelectedEcosystemMode(false)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>Dynamics</SectionLabel>
            <div className="grid gap-3 md:grid-cols-2">
              <ModeComparisonCard
                eyebrow="Pure evolution"
                title="Evolutionary"
                description="Herbivores start alone and may branch into omnivores or carnivores."
                points={[
                  "Starts herbivore-only",
                  "Diet can evolve",
                  "Works in every scenario",
                ]}
                preview={<EvolutionaryPreview />}
                active={selectedDynamics === "evolutionary"}
                onClick={() => setSelectedDynamics("evolutionary")}
              />
              <ModeComparisonCard
                eyebrow="Emergent predation"
                title="Predation Pressure"
                description="Starts with a small predator seed and looser prey-size rules so hunting niches can stabilize."
                points={[
                  "Seeds a few predators",
                  "Omnivores can still emerge",
                  "Predators thrive when prey is abundant",
                ]}
                preview={<PredatorPreyPreview />}
                active={selectedDynamics === "predator-prey"}
                onClick={() => setSelectedDynamics("predator-prey")}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="items-center justify-between gap-3 sm:flex-row">
          <label className="flex items-center gap-2 text-[11px] text-[var(--quark-muted)]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.currentTarget.checked)}
              className="size-3 accent-[var(--quark-accent)]"
            />
            Don&apos;t show me again
          </label>
          <Button
            className="bg-[var(--quark-accent)] px-6 text-[#06060f] hover:bg-[var(--quark-accent)]/90"
            onClick={startSelectedMode}
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
