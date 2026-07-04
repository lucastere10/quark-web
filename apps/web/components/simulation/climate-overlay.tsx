"use client"

import { useEffect, useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"

import { useSimulationStore } from "@/store/simulation-store"

const MINIMIZED_KEY = "quark.climateOverlay.minimized"

const TREND_LABELS = {
  stable: "Stable",
  rain: "Rain",
  drought: "Drought",
  heat: "Heat",
  cold: "Cold",
} as const

const TREND_CLASSES = {
  stable: "border-slate-200/20 bg-slate-300/10 text-slate-100",
  rain: "border-cyan-200/35 bg-cyan-300/10 text-cyan-100",
  drought: "border-amber-200/35 bg-amber-300/10 text-amber-100",
  heat: "border-orange-200/35 bg-orange-300/10 text-orange-100",
  cold: "border-blue-200/35 bg-blue-300/10 text-blue-100",
} as const

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatDelta(value: number): string {
  const delta = Math.round((value - 1) * 100)
  return `${delta >= 0 ? "+" : ""}${delta}%`
}

function ClimateBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-[10px] text-[var(--quark-muted)]">
        <span>{label}</span>
        <span className="font-mono text-[9px] text-foreground/80">
          {formatPercent(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[var(--quark-accent)]/80"
          style={{ width: formatPercent(value) }}
        />
      </div>
    </div>
  )
}

export function ClimateOverlay() {
  const climate = useSimulationStore((s) => s.stats.climate)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimized(window.localStorage.getItem(MINIMIZED_KEY) === "true")
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const toggleMinimized = () => {
    setMinimized((current) => {
      const next = !current
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MINIMIZED_KEY, String(next))
      }
      return next
    })
  }

  if (minimized) {
    return (
      <button
        type="button"
        onClick={toggleMinimized}
        className="pointer-events-auto absolute left-5 top-5 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-[#071016]/82 px-3 py-2 text-xs text-foreground shadow-2xl shadow-black/35 backdrop-blur-md transition-colors hover:border-[var(--quark-accent)]/40"
        aria-label="Expand climate overlay"
      >
        <Maximize2 className="size-3.5 text-[var(--quark-accent)]" />
        <span className="font-semibold">{TREND_LABELS[climate.trend]}</span>
        <span className="font-mono text-[10px] text-[var(--quark-muted)]">
          Rain {formatPercent(climate.rainfall)}
        </span>
      </button>
    )
  }

  return (
    <div className="pointer-events-auto absolute left-5 top-5 z-20 w-64 rounded-2xl border border-white/10 bg-[#071016]/82 p-3 shadow-2xl shadow-black/35 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--quark-muted)]">
            Climate
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {TREND_LABELS[climate.trend]}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${TREND_CLASSES[climate.trend]}`}
        >
          {climate.trend}
        </span>
        <button
          type="button"
          onClick={toggleMinimized}
          className="rounded p-1 text-[var(--quark-muted)] transition-colors hover:bg-white/10 hover:text-foreground"
          aria-label="Minimize climate overlay"
        >
          <Minimize2 className="size-3.5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <ClimateBar label="Humidity" value={climate.humidity} />
        <ClimateBar label="Rain" value={climate.rainfall} />
        <ClimateBar label="Drought" value={climate.drought} />
        <ClimateBar label="Temp" value={climate.temperature} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
        <div className="rounded-lg bg-emerald-400/10 px-1.5 py-1 text-emerald-100">
          Growth {formatDelta(climate.growthModifier)}
        </div>
        <div className="rounded-lg bg-orange-400/10 px-1.5 py-1 text-orange-100">
          Metab {formatDelta(climate.metabolismModifier)}
        </div>
        <div className="rounded-lg bg-cyan-400/10 px-1.5 py-1 text-cyan-100">
          Vision {formatDelta(climate.visionModifier)}
        </div>
      </div>
    </div>
  )
}
