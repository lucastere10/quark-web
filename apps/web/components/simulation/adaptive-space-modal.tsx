"use client"

import { useMemo } from "react"
import { X } from "lucide-react"

import { buildAdaptiveSpaceData } from "@/lib/adaptive-space"
import { useSimulationStore } from "@/store/simulation-store"

import { AdaptiveSpaceChart } from "./adaptive-space-chart"

interface AdaptiveSpaceModalProps {
  open: boolean
  onClose: () => void
}

export function AdaptiveSpaceModal({ open, onClose }: AdaptiveSpaceModalProps) {
  if (!open) return null

  return <AdaptiveSpaceModalContent onClose={onClose} />
}

function AdaptiveSpaceModalContent({
  onClose,
}: Omit<AdaptiveSpaceModalProps, "open">) {
  const creatures = useSimulationStore((s) => s.creatures)
  const data = useMemo(() => buildAdaptiveSpaceData(creatures), [creatures])

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 mx-auto w-[min(760px,calc(100%-2rem))]">
      <div className="pointer-events-auto quark-panel rounded-lg border border-[var(--quark-border)] shadow-xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-[var(--quark-border)] px-3 py-2">
          <div>
            <p className="font-display text-sm text-[var(--quark-accent)]">
              Adaptive Space
            </p>
            <p className="text-[10px] text-[var(--quark-muted)]">
              X Perception · Y Biomechanics · Z Metabolism
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--quark-muted)] transition-colors hover:bg-black/30 hover:text-foreground"
            aria-label="Close adaptive space"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-2">
          <AdaptiveSpaceChart data={data} height={420} interactive />
        </div>
      </div>
    </div>
  )
}
