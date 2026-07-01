"use client"

import { useEffect, useRef, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Brain } from "lucide-react"

import { useSimulationStore } from "@/store/simulation-store"
import { cn } from "@workspace/ui/lib/utils"

import { IOBars } from "./io-bars"
import { NeuralNetworkView } from "./neural-network-view"

const MIN_PANEL_WIDTH = 520
const DEFAULT_PANEL_WIDTH = 880
const MAX_PANEL_WIDTH_RATIO = 0.95

function usePanelResize(initialWidth: number) {
  const [width, setWidth] = useState(initialWidth)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!resizeRef.current) return

      const delta = resizeRef.current.startX - event.clientX
      const maxWidth = window.innerWidth * MAX_PANEL_WIDTH_RATIO
      setWidth(
        Math.min(
          maxWidth,
          Math.max(MIN_PANEL_WIDTH, resizeRef.current.startWidth + delta),
        ),
      )
    }

    const endResize = () => {
      resizeRef.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", endResize)
    window.addEventListener("pointercancel", endResize)

    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", endResize)
      window.removeEventListener("pointercancel", endResize)
    }
  }, [])

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeRef.current = { startX: event.clientX, startWidth: width }
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"
  }

  return { width, startResize }
}

function useCreature() {
  const selectedCreatureId = useSimulationStore((s) => s.selectedCreatureId)
  const creatures = useSimulationStore((s) => s.creatures)
  return creatures.find((c) => c.id === selectedCreatureId) ?? null
}

export function BrainPanel() {
  const brainPanelOpen = useSimulationStore((s) => s.brainPanelOpen)
  const setBrainPanelOpen = useSimulationStore((s) => s.setBrainPanelOpen)
  const creature = useCreature()
  const { width, startResize } = usePanelResize(DEFAULT_PANEL_WIDTH)

  if (!creature) return null

  return (
    <Sheet open={brainPanelOpen} onOpenChange={setBrainPanelOpen}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-full max-w-none flex-col gap-0 border-[var(--quark-border)] bg-[#0a0a14] p-0",
          "data-[side=right]:w-auto data-[side=right]:sm:max-w-none",
        )}
        style={{ width }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize brain panel"
          className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[var(--quark-border)] before:transition-colors hover:before:bg-[var(--quark-accent)]/60 active:before:bg-[var(--quark-accent)]"
          onPointerDown={startResize}
        />

        <SheetHeader className="shrink-0 space-y-1 border-b border-[var(--quark-border)] px-5 py-4 pr-14">
          <SheetTitle className="flex items-center gap-2 font-display text-base text-[var(--quark-accent)]">
            <Brain className="size-4" />
            Brain — Creature #{creature.id}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            DNA {creature.dnaHash} · Gen {creature.generation}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <IOBars creature={creature} />
          <NeuralNetworkView
            creature={creature}
            mode="full"
            height="calc(100vh - 11rem)"
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
