"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartAxisMode,
  buildChartSeries,
  buildSpeciesPopulationSeries,
  type GenerationChartPoint,
  type TickChartPoint,
  type TraitStatKey,
} from "@/lib/chart-data"
import { buildAdaptiveSpaceData } from "@/lib/adaptive-space"
import { useSimulationStore } from "@/store/simulation-store"
import { cn } from "@workspace/ui/lib/utils"

import { AdaptiveSpaceChart } from "./adaptive-space-chart"
import { TraitEvolutionChart } from "./trait-evolution-chart"
import { SpeciesPopulationChart } from "./species-population-chart"

export type { ChartAxisMode }

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

type PanelTab = "cards" | "charts"

function PanelTabToggle({
  activeTab,
  onChange,
}: {
  activeTab: PanelTab
  onChange: (tab: PanelTab) => void
}) {
  return (
    <div className="grid grid-cols-2 rounded-md border border-[var(--quark-border)] p-0.5">
      {(
        [
          { id: "cards" as const, label: "Cards" },
          { id: "charts" as const, label: "Charts" },
        ] as const
      ).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
            activeTab === id
              ? "bg-[var(--quark-accent)] text-[#06060f]"
              : "text-[var(--quark-muted)] hover:text-foreground",
          )}
          aria-pressed={activeTab === id}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

type ChartPoint = GenerationChartPoint | TickChartPoint
type MiniChartKey = "population" | "averageFitness" | "speciesDiversity"

function pointX(point: ChartPoint, axisMode: ChartAxisMode): number {
  return axisMode === "generation" ? point.generation : (point as TickChartPoint).x
}

function buildGenerationMarkers(
  data: { x: number }[],
  axisMode: ChartAxisMode,
  generationLength: number,
  showGenerationMarkers: boolean,
): number[] {
  if (
    !showGenerationMarkers ||
    axisMode !== "tick" ||
    data.length === 0 ||
    generationLength <= 0
  ) {
    return []
  }

  const maxX = Math.max(...data.map((d) => d.x))
  const markers: number[] = []
  for (let x = generationLength; x <= maxX; x += generationLength) {
    markers.push(x)
  }
  return markers
}

function DualPopulationChart({
  axisMode,
  generationLength,
  data,
  showGenerationMarkers = true,
}: {
  axisMode: ChartAxisMode
  generationLength: number
  data: {
    x: number
    label: string
    herbivores: number
    carnivores: number
  }[]
  showGenerationMarkers?: boolean
}) {
  const generationMarkers = useMemo(
    () =>
      buildGenerationMarkers(
        data,
        axisMode,
        generationLength,
        showGenerationMarkers,
      ),
    [axisMode, data, generationLength, showGenerationMarkers],
  )
  const xLabel = axisMode === "tick" ? "Tick" : "Generation"

  return (
    <div className="rounded-md border border-[var(--quark-border)] bg-black/20 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
        Herbivores vs Carnivores
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
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                formatter={(value) =>
                  value === "herbivores" ? "Herbivores" : "Carnivores"
                }
              />
              <Line
                type="monotone"
                dataKey="herbivores"
                stroke="#22ff77"
                strokeWidth={1.5}
                dot={data.length <= 20}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="carnivores"
                stroke="#ff6633"
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

function MiniChart({
  title,
  color,
  axisMode,
  generationLength,
  data,
  showGenerationMarkers = true,
}: {
  title: string
  color: string
  axisMode: ChartAxisMode
  generationLength: number
  data: { x: number; label: string; value: number }[]
  showGenerationMarkers?: boolean
}) {
  const generationMarkers = useMemo(
    () =>
      buildGenerationMarkers(
        data,
        axisMode,
        generationLength,
        showGenerationMarkers,
      ),
    [axisMode, data, generationLength, showGenerationMarkers],
  )
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

interface StatsPanelProps {
  chartAxisMode?: ChartAxisMode
  onChartAxisModeChange?: (mode: ChartAxisMode) => void
  showTraitExpand?: boolean
  onExpandTraitChart?: () => void
  onExpandSpeciesChart?: () => void
  onExpandAdaptiveSpace?: () => void
  selectedTrait?: TraitStatKey | null
  onSelectedTraitChange?: (trait: TraitStatKey | null) => void
}

export function StatsPanel({
  chartAxisMode: controlledAxisMode,
  onChartAxisModeChange,
  showTraitExpand = false,
  onExpandTraitChart,
  onExpandSpeciesChart,
  onExpandAdaptiveSpace,
  selectedTrait,
  onSelectedTraitChange,
}: StatsPanelProps = {}) {
  const stats = useSimulationStore((s) => s.stats)
  const statsHistory = useSimulationStore((s) => s.statsHistory)
  const creatures = useSimulationStore((s) => s.creatures)
  const generationLength = useSimulationStore((s) => s.config.generationLength)
  const ecosystemMode = useSimulationStore((s) => s.config.ecosystemMode)
  const [internalAxisMode, setInternalAxisMode] =
    useState<ChartAxisMode>("generation")
  const [activeTab, setActiveTab] = useState<PanelTab>("charts")

  const chartAxisMode = ecosystemMode
    ? "tick"
    : controlledAxisMode ?? internalAxisMode
  const setChartAxisMode = onChartAxisModeChange ?? setInternalAxisMode

  const traitChartData = useMemo(
    () => buildChartSeries(statsHistory, chartAxisMode, generationLength),
    [statsHistory, chartAxisMode, generationLength],
  )
  const miniChartData = useMemo(() => {
    const makeMini = (key: MiniChartKey) =>
      traitChartData.map((point) => ({
        x: pointX(point, chartAxisMode),
        label: point.label,
        value: point[key],
      }))

    return {
      population: makeMini("population"),
      averageFitness: makeMini("averageFitness"),
      speciesDiversity: makeMini("speciesDiversity"),
      dualPopulation: traitChartData.map((point) => ({
        x: pointX(point, chartAxisMode),
        label: point.label,
        herbivores: point.herbivorePopulation,
        carnivores: point.carnivorePopulation,
      })),
    }
  }, [chartAxisMode, traitChartData])
  const speciesChart = useMemo(
    () => buildSpeciesPopulationSeries(statsHistory, chartAxisMode, generationLength),
    [statsHistory, chartAxisMode, generationLength],
  )
  const adaptiveSpaceData = useMemo(
    () => buildAdaptiveSpaceData(creatures),
    [creatures],
  )

  return (
    <aside className="quark-panel flex h-full flex-col">
      <div className="border-b border-[var(--quark-border)] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-medium text-[var(--quark-accent)]">
              Statistics
            </h2>
            <p className="text-xs text-[var(--quark-muted)]">
              {ecosystemMode ? "Live ecosystem metrics" : "Live evolutionary metrics"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
            View
          </span>
          <PanelTabToggle activeTab={activeTab} onChange={setActiveTab} />
        </div>
        {activeTab === "charts" && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
              Chart axis
            </span>
            <AxisToggle mode={chartAxisMode} onChange={setChartAxisMode} />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {activeTab === "cards" ? (
          <div className="grid grid-cols-2 gap-2">
          {ecosystemMode ? (
            <>
              <StatCard label="Tick" value={stats.tick} accent />
              <StatCard label="Population" value={stats.population} />
              <StatCard label="Births" value={stats.totalBirths} accent />
              <StatCard label="Deaths" value={stats.totalDeaths} />
              <StatCard label="Generation" value={stats.generation} />
            </>
          ) : (
            <>
              <StatCard label="Generation" value={stats.generation} accent />
              <StatCard label="Population" value={stats.population} />
            </>
          )}
          {(stats.omnivorePopulation > 0 || stats.carnivorePopulation > 0) && (
            <>
              <StatCard
                label="Herbivores"
                value={stats.herbivorePopulation}
              />
              <StatCard
                label="Omnivores"
                value={stats.omnivorePopulation}
              />
              <StatCard
                label="Carnivores"
                value={stats.carnivorePopulation}
              />
            </>
          )}
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
          <StatCard
            label="Avg Meat Eaten"
            value={stats.averageMeatEaten.toFixed(1)}
          />
          <StatCard
              label="Avg Rotten"
            value={stats.averageCarrionEaten.toFixed(1)}
          />
            <StatCard label="Rotten Map" value={stats.carrionResources} />
          <StatCard
            label="Potential Hunters"
            value={stats.potentialHunterPopulation}
          />
          <StatCard label="Meat Capable" value={stats.meatCapablePopulation} />
          <StatCard label="Failed Hunts" value={stats.failedAttackEvents} />
          {(stats.omnivorePopulation > 0 || stats.carnivorePopulation > 0) && (
            <StatCard
              label="Avg Kills"
              value={stats.averageKillCount.toFixed(1)}
            />
          )}
          <StatCard label="Diversity" value={stats.speciesDiversity} />
          <StatCard
            label="X Perception"
            value={stats.averagePerceptionScore.toFixed(0)}
          />
          <StatCard
            label="Y Biomech"
            value={stats.averageBiomechanicsScore.toFixed(0)}
          />
          <StatCard
            label="Z Metabolism"
            value={stats.averageMetabolismScore.toFixed(0)}
          />
          <StatCard label="Avg Size" value={stats.averageSize.toFixed(1)} />
          <StatCard
            label="Predation"
            value={stats.averagePredationDrive.toFixed(2)}
          />
          <StatCard
            label="Toxin Resist"
            value={stats.averageToxinResistance.toFixed(2)}
          />
          {!ecosystemMode && <StatCard label="Tick" value={stats.tick} />}
          </div>
        ) : (
          <>

        <MiniChart
          title="Population"
          color="#00e5cc"
          data={miniChartData.population}
          axisMode={chartAxisMode}
          generationLength={generationLength}
          showGenerationMarkers={!ecosystemMode}
        />
        {stats.carnivorePopulation > 0 && (
          <DualPopulationChart
            data={miniChartData.dualPopulation}
            axisMode={chartAxisMode}
            generationLength={generationLength}
            showGenerationMarkers={!ecosystemMode}
          />
        )}
        <div className="rounded-md border border-[var(--quark-border)] bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
                Adaptive Space
              </p>
              <p className="text-[9px] text-[var(--quark-muted)]/80">
                Perception · Biomechanics · Metabolism
              </p>
            </div>
            {showTraitExpand && onExpandAdaptiveSpace && (
              <button
                type="button"
                onClick={onExpandAdaptiveSpace}
                className="rounded px-2 py-1 text-[10px] text-[var(--quark-accent)] transition-colors hover:bg-[var(--quark-accent)]/10"
              >
                Expand
              </button>
            )}
          </div>
          <AdaptiveSpaceChart
            data={adaptiveSpaceData}
            height={170}
            interactive={false}
          />
        </div>
        <SpeciesPopulationChart
          data={speciesChart.data}
          families={speciesChart.families}
          axisMode={chartAxisMode}
          showExpand={showTraitExpand}
          onExpand={onExpandSpeciesChart}
        />
        <MiniChart
          title="Average Fitness"
          color="#ff9900"
          data={miniChartData.averageFitness}
          axisMode={chartAxisMode}
          generationLength={generationLength}
          showGenerationMarkers={!ecosystemMode}
        />
        <MiniChart
          title="Species Diversity"
          color="#9933ff"
          data={miniChartData.speciesDiversity}
          axisMode={chartAxisMode}
          generationLength={generationLength}
          showGenerationMarkers={!ecosystemMode}
        />
        <TraitEvolutionChart
          data={traitChartData}
          axisMode={chartAxisMode}
          showExpand={showTraitExpand}
          onExpand={onExpandTraitChart}
          selectedTrait={selectedTrait}
          onSelectedTraitChange={onSelectedTraitChange}
        />
          </>
        )}
      </div>
    </aside>
  )
}
