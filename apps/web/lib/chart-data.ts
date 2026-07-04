import type { StatsHistoryPoint } from "@/store/simulation-store"

export type TraitStatKey =
  | "averageSize"
  | "averageVisionRange"
  | "averageVisionHalfAngle"
  | "averageMaxSpeed"
  | "averageMetabolism"

export type ChartAxisMode = "tick" | "generation"

export interface TraitRange {
  min: number
  max: number
  label: string
  color: string
}

export const TRAIT_RANGES: Record<TraitStatKey, TraitRange> = {
  averageSize: {
    min: 2,
    max: 16,
    label: "Size",
    color: "#00e5cc",
  },
  averageVisionRange: {
    min: 50,
    max: 280,
    label: "Vision",
    color: "#22ff77",
  },
  averageVisionHalfAngle: {
    min: 15,
    max: 80,
    label: "Vision Angle",
    color: "#9933ff",
  },
  averageMaxSpeed: {
    min: 0.5,
    max: 5,
    label: "Speed",
    color: "#ff9900",
  },
  averageMetabolism: {
    min: 0.005,
    max: 0.08,
    label: "Metabolism",
    color: "#ff2244",
  },
}

export const TRAIT_STAT_KEYS = Object.keys(TRAIT_RANGES) as TraitStatKey[]

export const TRAIT_NORM_KEYS: Record<TraitStatKey, string> = {
  averageSize: "averageSizeNorm",
  averageVisionRange: "averageVisionRangeNorm",
  averageVisionHalfAngle: "averageVisionHalfAngleNorm",
  averageMaxSpeed: "averageMaxSpeedNorm",
  averageMetabolism: "averageMetabolismNorm",
}

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#0a0a14",
    border: "1px solid rgba(0,229,204,0.35)",
    borderRadius: 6,
    fontSize: 11,
    opacity: 1,
  },
  wrapperStyle: { opacity: 1, outline: "none" },
  itemStyle: { color: "#e8e8f0" },
  labelStyle: { color: "#00e5cc", fontWeight: 600 },
} as const

export interface GenerationChartPoint {
  generation: number
  label: string
  tick: number
  population: number
  herbivorePopulation: number
  carnivorePopulation: number
  bestFitness: number
  averageFitness: number
  speciesDiversity: number
  averageFoodEaten: number
  averageKillCount: number
  survivalRate: number
  averageSize: number
  averageVisionRange: number
  averageVisionHalfAngle: number
  averageMaxSpeed: number
  averageMetabolism: number
  totalBirths: number
  totalDeaths: number
  averageSizeNorm: number
  averageVisionRangeNorm: number
  averageVisionHalfAngleNorm: number
  averageMaxSpeedNorm: number
  averageMetabolismNorm: number
}

export interface TickChartPoint extends GenerationChartPoint {
  x: number
}

export function formatTraitValue(key: TraitStatKey, value: number): string {
  switch (key) {
    case "averageSize":
    case "averageVisionRange":
    case "averageVisionHalfAngle":
      return value.toFixed(1)
    case "averageMaxSpeed":
      return value.toFixed(2)
    case "averageMetabolism":
      return value.toFixed(3)
    default:
      return String(value)
  }
}

export function normalizeTrait(value: number, key: TraitStatKey): number {
  const { min, max } = TRAIT_RANGES[key]
  if (max <= min) return 0
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

function pointFromStats(point: StatsHistoryPoint): GenerationChartPoint {
  return {
    generation: point.generation,
    label: `Gen ${point.generation}`,
    tick: point.tick,
    population: point.population,
    herbivorePopulation: point.herbivorePopulation,
    carnivorePopulation: point.carnivorePopulation,
    bestFitness: point.bestFitness,
    averageFitness: point.averageFitness,
    speciesDiversity: point.speciesDiversity,
    averageFoodEaten: point.averageFoodEaten,
    averageKillCount: point.averageKillCount,
    survivalRate: point.survivalRate,
    averageSize: point.averageSize,
    averageVisionRange: point.averageVisionRange,
    averageVisionHalfAngle: point.averageVisionHalfAngle,
    averageMaxSpeed: point.averageMaxSpeed,
    averageMetabolism: point.averageMetabolism,
    totalBirths: point.totalBirths,
    totalDeaths: point.totalDeaths,
    averageSizeNorm: normalizeTrait(point.averageSize, "averageSize"),
    averageVisionRangeNorm: normalizeTrait(
      point.averageVisionRange,
      "averageVisionRange",
    ),
    averageVisionHalfAngleNorm: normalizeTrait(
      point.averageVisionHalfAngle,
      "averageVisionHalfAngle",
    ),
    averageMaxSpeedNorm: normalizeTrait(point.averageMaxSpeed, "averageMaxSpeed"),
    averageMetabolismNorm: normalizeTrait(
      point.averageMetabolism,
      "averageMetabolism",
    ),
  }
}

/** One point per generation (last sample wins). Sorted Gen 0..N. */
export function buildGenerationSeries(
  history: StatsHistoryPoint[],
): GenerationChartPoint[] {
  if (history.length === 0) return []

  const byGeneration = new Map<number, StatsHistoryPoint>()
  for (const point of history) {
    byGeneration.set(point.generation, point)
  }

  return Array.from(byGeneration.entries())
    .sort(([a], [b]) => a - b)
    .map(([, point]) => pointFromStats(point))
}

/** Session summary: Gen 1 through final (excludes Gen 0). */
export function buildSessionGenerationSeries(
  history: StatsHistoryPoint[],
): GenerationChartPoint[] {
  return buildGenerationSeries(history)
    .filter((point) => point.generation >= 1)
    .map((point) => ({
      ...point,
      label: `Gen ${point.generation}`,
    }))
}

export function buildTickSeries(
  history: StatsHistoryPoint[],
  generationLength: number,
): TickChartPoint[] {
  return history.map((point) => ({
    ...pointFromStats(point),
    x: point.generation * generationLength + point.tick,
    label: `Gen ${point.generation} · Tick ${point.tick}`,
  }))
}

export function buildChartSeries(
  history: StatsHistoryPoint[],
  mode: ChartAxisMode,
  generationLength: number,
): GenerationChartPoint[] | TickChartPoint[] {
  if (mode === "generation") {
    return buildGenerationSeries(history)
  }
  return buildTickSeries(history, generationLength)
}

export function getLastGenerationPoint(
  history: StatsHistoryPoint[],
): GenerationChartPoint | null {
  const series = buildGenerationSeries(history)
  return series.length > 0 ? series[series.length - 1]! : null
}

export function peakTraitValue(
  series: GenerationChartPoint[],
  key: TraitStatKey,
): number {
  if (series.length === 0) return 0
  return Math.max(...series.map((point) => point[key]))
}
