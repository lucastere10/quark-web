"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { StatsHistoryPoint } from "@/store/simulation-store"
import { useSimulationStore } from "@/store/simulation-store"
import { cn } from "@workspace/ui/lib/utils"

export type ChartAxisMode = "tick" | "generation"

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="rounded-md border border-[var(--quark-border)] bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
        {label}
      </p>
      <p
        className={`font-mono text-lg ${accent ? "text-[var(--quark-accent)]" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  )
}

function buildChartData(
  history: StatsHistoryPoint[],
  mode: ChartAxisMode,
  dataKey: "population" | "averageFitness" | "speciesDiversity",
  generationLength: number,
) {
  if (history.length === 0) return []

  if (mode === "generation") {
    const byGeneration = new Map<number, StatsHistoryPoint>()
    for (const point of history) {
      byGeneration.set(point.generation, point)
    }

    return Array.from(byGeneration.entries())
      .sort(([a], [b]) => a - b)
      .map(([generation, point]) => ({
        x: generation,
        label: `Gen ${generation}`,
        value: point[dataKey],
      }))
  }

  return history.map((point) => ({
    x: point.generation * generationLength + point.tick,
    label: `Gen ${point.generation} · Tick ${point.tick}`,
    value: point[dataKey],
  }))
}

function AxisToggle({
  mode,
  onChange,
}: {
  mode: ChartAxisMode
  onChange: (mode: ChartAxisMode) => void
}) {
  return (
    <div className="flex rounded-md border border-[var(--quark-border)] p-0.5">
      {(
        [
          { id: "tick" as const, label: "Tick" },
          { id: "generation" as const, label: "Generation" },
        ] as const
      ).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
            mode === id
              ? "bg-[var(--quark-accent)] text-[#06060f]"
              : "text-[var(--quark-muted)] hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function MiniChart({
  title,
  dataKey,
  color,
  axisMode,
  generationLength,
}: {
  title: string
  dataKey: "population" | "averageFitness" | "speciesDiversity"
  color: string
  axisMode: ChartAxisMode
  generationLength: number
}) {
  const statsHistory = useSimulationStore((s) => s.statsHistory)

  const data = useMemo(
    () => buildChartData(statsHistory, axisMode, dataKey, generationLength),
    [statsHistory, axisMode, dataKey, generationLength],
  )

  const generationMarkers = useMemo(() => {
    if (axisMode !== "tick" || data.length === 0) return []
    const maxX = Math.max(...data.map((d) => d.x))
    const markers: number[] = []
    for (let x = generationLength; x <= maxX; x += generationLength) {
      markers.push(x)
    }
    return markers
  }, [axisMode, data, generationLength])

  const xLabel = axisMode === "tick" ? "Tick" : "Generation"

  return (
    <div className="rounded-md border border-[var(--quark-border)] bg-black/20 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
        {title}
      </p>
      <div className="h-24">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[10px] text-[var(--quark-muted)]">
            Start simulation to see data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                stroke="rgba(0,229,204,0.08)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="x"
                hide={data.length > 24}
                tick={{ fontSize: 9, fill: "rgba(0,229,204,0.5)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide domain={["auto", "auto"]} />
              {generationMarkers.map((x) => (
                <ReferenceLine
                  key={x}
                  x={x}
                  stroke="rgba(0,229,204,0.15)"
                  strokeDasharray="2 4"
                />
              ))}
              <Tooltip
                contentStyle={{
                  background: "#0a0a14",
                  border: "1px solid rgba(0,229,204,0.2)",
                  borderRadius: 6,
                  fontSize: 11,
                }}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as
                    | { label?: string }
                    | undefined
                  return item?.label ?? xLabel
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                dot={data.length <= 20}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export function StatsPanel() {
  const stats = useSimulationStore((s) => s.stats)
  const generationLength = useSimulationStore((s) => s.config.generationLength)
  const [chartAxisMode, setChartAxisMode] = useState<ChartAxisMode>("generation")

  return (
    <aside className="quark-panel flex h-full flex-col">
      <div className="border-b border-[var(--quark-border)] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-medium text-[var(--quark-accent)]">
              Statistics
            </h2>
            <p className="text-xs text-[var(--quark-muted)]">
              Live evolutionary metrics
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
            Chart axis
          </span>
          <AxisToggle mode={chartAxisMode} onChange={setChartAxisMode} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Generation" value={stats.generation} accent />
          <StatCard label="Population" value={stats.population} />
          <StatCard
            label="Best Fitness"
            value={stats.bestFitness.toFixed(1)}
            accent
          />
          <StatCard
            label="Avg Fitness"
            value={stats.averageFitness.toFixed(1)}
          />
          <StatCard
            label="Survival Rate"
            value={`${(stats.survivalRate * 100).toFixed(0)}%`}
          />
          <StatCard
            label="Avg Lifespan"
            value={stats.averageLifespan.toFixed(0)}
          />
          <StatCard
            label="Avg Food Eaten"
            value={stats.averageFoodEaten.toFixed(1)}
          />
          <StatCard label="Diversity" value={stats.speciesDiversity} />
          <StatCard label="Tick" value={stats.tick} />
        </div>

        <MiniChart
          title="Population"
          dataKey="population"
          color="#00e5cc"
          axisMode={chartAxisMode}
          generationLength={generationLength}
        />
        <MiniChart
          title="Average Fitness"
          dataKey="averageFitness"
          color="#ff9900"
          axisMode={chartAxisMode}
          generationLength={generationLength}
        />
        <MiniChart
          title="Species Diversity"
          dataKey="speciesDiversity"
          color="#9933ff"
          axisMode={chartAxisMode}
          generationLength={generationLength}
        />
      </div>
    </aside>
  )
}
