"use client"

import { Maximize2 } from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartAxisMode,
  CHART_TOOLTIP_STYLE,
  type SpeciesPopulationPoint,
  type SpeciesSeriesMeta,
} from "@/lib/chart-data"

interface SpeciesPopulationChartProps {
  data: SpeciesPopulationPoint[]
  families: SpeciesSeriesMeta[]
  axisMode: ChartAxisMode
  height?: number
  showExpand?: boolean
  onExpand?: () => void
  emptyMessage?: string
}

function dietLabel(dietClass: SpeciesSeriesMeta["dietClass"]): string {
  if (dietClass === "carnivore") return "Carnivore"
  if (dietClass === "omnivore") return "Omnivore"
  return "Herbivore"
}

export function SpeciesPopulationChart({
  data,
  families,
  axisMode,
  height = 144,
  showExpand = false,
  onExpand,
  emptyMessage = "Families appear after the simulation starts",
}: SpeciesPopulationChartProps) {
  const xKey = axisMode === "generation" ? "generation" : "x"

  return (
    <div className="rounded-md border border-[var(--quark-border)] bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
          Species Families
        </p>
        {showExpand && onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="rounded p-1 text-[var(--quark-muted)] transition-colors hover:bg-[var(--quark-accent)]/10 hover:text-[var(--quark-accent)]"
            aria-label="Expand species family chart"
          >
            <Maximize2 className="size-3.5" />
          </button>
        )}
      </div>

      <div style={{ height }}>
        {data.length === 0 || families.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[10px] text-[var(--quark-muted)]">
            {emptyMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                stroke="rgba(0,229,204,0.08)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey={xKey}
                hide={data.length > 24}
                tick={{ fontSize: 9, fill: "rgba(0,229,204,0.5)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Legend
                wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
                formatter={(value) => {
                  const family = families.find((item) => item.id === value)
                  return family
                    ? `${family.label} ${dietLabel(family.dietClass)}`
                    : value
                }}
              />
              {families.map((family) => (
                <Line
                  key={family.id}
                  type="monotone"
                  dataKey={family.id}
                  name={family.id}
                  stroke={family.color}
                  strokeWidth={1.5}
                  dot={data.length <= 16}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
