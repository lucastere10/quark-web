"use client"

import { useEffect, useRef, useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"

import {
  type SimulationEventSnapshot,
  useSimulationStore,
} from "@/store/simulation-store"

const EVENT_ACCENTS: Record<SimulationEventSnapshot["type"], string> = {
  "climate-shift": "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
  "new-family": "border-emerald-300/40 bg-emerald-400/10 text-emerald-100",
  "population-risk": "border-red-300/45 bg-red-400/10 text-red-100",
}

const MINIMIZED_KEY = "quark.simulationAlerts.minimized"

export function SimulationEventToasts() {
  const events = useSimulationStore((s) => s.simulationEvents)
  const [visibleEvents, setVisibleEvents] = useState<SimulationEventSnapshot[]>([])
  const [minimized, setMinimized] = useState(false)
  const seenIdsRef = useRef(new Set<number>())
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

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

  useEffect(() => {
    const newEvents = events.filter((event) => !seenIdsRef.current.has(event.id))
    if (newEvents.length === 0) return

    for (const event of newEvents) {
      seenIdsRef.current.add(event.id)
      const timer = setTimeout(() => {
        setVisibleEvents((current) =>
          current.filter((visible) => visible.id !== event.id),
        )
      }, 5200)
      timersRef.current.push(timer)
    }

    setVisibleEvents((current) => [...newEvents, ...current].slice(0, 4))
  }, [events])

  useEffect(
    () => () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer)
      }
    },
    [],
  )

  if (minimized) {
    return (
      <button
        type="button"
        onClick={toggleMinimized}
        className="pointer-events-auto absolute right-5 top-5 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-[#071016]/82 px-3 py-2 text-xs text-foreground shadow-2xl shadow-black/35 backdrop-blur-md transition-colors hover:border-[var(--quark-accent)]/40"
        aria-label="Expand simulation alerts"
      >
        <Maximize2 className="size-3.5 text-[var(--quark-accent)]" />
        <span className="font-semibold">Alerts</span>
        {visibleEvents.length > 0 && (
          <span className="rounded-full bg-[var(--quark-accent)] px-1.5 py-0.5 font-mono text-[9px] text-black">
            {visibleEvents.length}
          </span>
        )}
      </button>
    )
  }

  if (visibleEvents.length === 0) return null

  return (
    <div className="pointer-events-none absolute right-5 top-5 z-30 flex w-72 flex-col gap-2">
      <button
        type="button"
        onClick={toggleMinimized}
        className="pointer-events-auto ml-auto rounded-full border border-white/10 bg-[#071016]/82 p-1.5 text-[var(--quark-muted)] shadow-xl shadow-black/30 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-foreground"
        aria-label="Minimize simulation alerts"
      >
        <Minimize2 className="size-3.5" />
      </button>
      {visibleEvents.map((event) => (
        <div
          key={event.id}
          className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-2xl shadow-black/35 backdrop-blur-md ${EVENT_ACCENTS[event.type]}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">
            {event.type.replace("-", " ")}
          </p>
          <p className="mt-1 text-xs font-semibold">{event.title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">
            {event.message}
          </p>
        </div>
      ))}
    </div>
  )
}
