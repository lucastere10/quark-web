"use client"

import { useState } from "react"
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
  type GenerationChartPoint,
  TRAIT_NORM_KEYS,
  TRAIT_RANGES,
  TRAIT_STAT_KEYS,
  type TickChartPoint,
  type TraitStatKey,
  formatTraitValue,
} from "@/lib/chart-data"
import { cn } from "@workspace/ui/lib/utils"

export interface TraitEvolutionChartProps {
  data: GenerationChartPoint[] | TickChartPoint[]
  axisMode: ChartAxisMode
  height?: number
  showExpand?: boolean
  onExpand?: () => void
  selectedTrait?: TraitStatKey | null
  onSelectedTraitChange?: (trait: TraitStatKey | null) => void
  emptyMessage?: string
}

function TraitSelector({
  selectedTrait,
  onSelect,
}: {
  selectedTrait: TraitStatKey | null
  onSelect: (trait: TraitStatKey) => void
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {TRAIT_STAT_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider transition-colors",
            selectedTrait === key
              ? "border-[var(--quark-accent)] bg-[var(--quark-accent)]/15 text-[var(--quark-accent)]"
              : "border-[var(--quark-border)] text-[var(--quark-muted)] hover:border-[var(--quark-accent)]/40 hover:text-foreground",
          )}
        >
          {TRAIT_RANGES[key].label}
        </button>
      ))}
    </div>
  )
}

function TraitTooltipContent({
  active,
  payload,
  selectedTrait,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload: GenerationChartPoint }>
  selectedTrait: TraitStatKey | null
}) {
  if (!active || !payload?.length) return null

  const point = payload[0]!.payload
  const traits = selectedTrait ? [selectedTrait] : TRAIT_STAT_KEYS

  return (
    <div
      className="rounded-md border border-[rgba(0,229,204,0.35)] px-2.5 py-2"
      style={{ backgroundColor: "#0a0a14", opacity: 1 }}
    >
      <p className="mb-1.5 text-[11px] font-semibold text-[#00e5cc]">
        {point.label}
      </p>
      <div className="space-y-0.5">
        {traits.map((key) => {
          const raw = point[key]
          const normKey = TRAIT_NORM_KEYS[key] as keyof GenerationChartPoint
          const norm = point[normKey] as number
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4 text-[11px]"
            >
              <span style={{ color: TRAIT_RANGES[key].color }}>
                {TRAIT_RANGES[key].label}
              </span>
              <span className="font-mono text-[#e8e8f0]">
                {selectedTrait
                  ? formatTraitValue(key, raw)
                  : `${formatTraitValue(key, raw)} (${norm.toFixed(0)}%)`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TraitEvolutionChart({
  data,
  axisMode,
  height = 144,
  showExpand = false,
  onExpand,
  selectedTrait: controlledTrait,
  onSelectedTraitChange,
  emptyMessage = "Start simulation to see data",
}: TraitEvolutionChartProps) {
  const [internalTrait, setInternalTrait] = useState<TraitStatKey | null>(null)
  const selectedTrait = controlledTrait ?? internalTrait
  const setSelectedTrait = onSelectedTraitChange ?? setInternalTrait

  const handleTraitSelect = (key: TraitStatKey) => {
    setSelectedTrait(selectedTrait === key ? null : key)
  }

  const xKey = axisMode === "generation" ? "generation" : "x"
  const title = selectedTrait
    ? `Trait Evolution — ${TRAIT_RANGES[selectedTrait].label} (raw)`
    : "Trait Evolution"

  const visibleKeys = selectedTrait ? [selectedTrait] : TRAIT_STAT_KEYS
  const yDomain: [number | "auto", number | "auto"] = selectedTrait
    ? ["auto", "auto"]
    : [0, 100]

  return (
    <div className="rounded-md border border-[var(--quark-border)] bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
          {title}
        </p>
        {showExpand && onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="rounded p-1 text-[var(--quark-muted)] transition-colors hover:bg-[var(--quark-accent)]/10 hover:text-[var(--quark-accent)]"
            aria-label="Expand trait evolution chart"
          >
            <Maximize2 className="size-3.5" />
          </button>
        )}
      </div>

      <TraitSelector
        selectedTrait={selectedTrait}
        onSelect={handleTraitSelect}
      />

      <div style={{ height }}>
        {data.length === 0 ? (
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
              <YAxis hide domain={yDomain} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                content={(props) => (
                  <TraitTooltipContent
                    active={props.active}
                    payload={
                      props.payload as ReadonlyArray<{
                        payload: GenerationChartPoint
                      }> | undefined
                    }
                    selectedTrait={selectedTrait}
                  />
                )}
              />
              {!selectedTrait && (
                <Legend
                  wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
                  formatter={(value) => {
                    const key = TRAIT_STAT_KEYS.find(
                      (k) => TRAIT_NORM_KEYS[k] === value,
                    )
                    return key ? TRAIT_RANGES[key].label : value
                  }}
                />
              )}
              {visibleKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={selectedTrait ? key : TRAIT_NORM_KEYS[key]}
                  name={selectedTrait ? TRAIT_RANGES[key].label : TRAIT_NORM_KEYS[key]}
                  stroke={TRAIT_RANGES[key].color}
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
