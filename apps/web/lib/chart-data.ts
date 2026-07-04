import type { StatsHistoryPoint } from "@/store/simulation-store"

export type TraitStatKey =
  | "averagePerceptionScore"
  | "averageBiomechanicsScore"
  | "averageMetabolismScore"
  | "averagePredationDrive"
  | "averageSize"

export type ChartAxisMode = "tick" | "generation"

const MAX_RENDERED_CHART_POINTS = 120

export interface TraitRange {
  min: number
  max: number
  label: string
  color: string
}

export const TRAIT_RANGES: Record<TraitStatKey, TraitRange> = {
  averagePerceptionScore: {
    min: 0,
    max: 100,
    label: "X Perception",
    color: "#22ff77",
  },
  averageBiomechanicsScore: {
    min: 0,
    max: 100,
    label: "Y Biomechanics",
    color: "#00e5cc",
  },
  averageMetabolismScore: {
    min: 0,
    max: 100,
    label: "Z Metabolism",
    color: "#ff9900",
  },
  averagePredationDrive: {
    min: 0,
    max: 1,
    label: "Predation",
    color: "#ff2244",
  },
  averageSize: {
    min: 2,
    max: 16,
    label: "Size",
    color: "#9933ff",
  },
}

export const TRAIT_STAT_KEYS = Object.keys(TRAIT_RANGES) as TraitStatKey[]

export const TRAIT_NORM_KEYS: Record<TraitStatKey, string> = {
  averagePerceptionScore: "averagePerceptionScoreNorm",
  averageBiomechanicsScore: "averageBiomechanicsScoreNorm",
  averageMetabolismScore: "averageMetabolismScoreNorm",
  averagePredationDrive: "averagePredationDriveNorm",
  averageSize: "averageSizeNorm",
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
  omnivorePopulation: number
  carnivorePopulation: number
  bestFitness: number
  averageFitness: number
  speciesDiversity: number
  averageFoodEaten: number
  averageMeatEaten: number
  averageCarrionEaten: number
  averageKillCount: number
  survivalRate: number
  averageSize: number
  averageVisionRange: number
  averageVisionHalfAngle: number
  averageMaxSpeed: number
  averageMetabolism: number
  averagePerceptionScore: number
  averageBiomechanicsScore: number
  averageMetabolismScore: number
  averagePredationDrive: number
  averageCarrionDigestEfficiency: number
  averageToxinResistance: number
  carrionResources: number
  totalBirths: number
  totalDeaths: number
  speciesFamilies: StatsHistoryPoint["speciesFamilies"]
  averagePerceptionScoreNorm: number
  averageBiomechanicsScoreNorm: number
  averageMetabolismScoreNorm: number
  averagePredationDriveNorm: number
  averageSizeNorm: number
}

export interface TickChartPoint extends GenerationChartPoint {
  x: number
}

export function formatTraitValue(key: TraitStatKey, value: number): string {
  switch (key) {
    case "averagePerceptionScore":
    case "averageBiomechanicsScore":
    case "averageMetabolismScore":
      return value.toFixed(0)
    case "averagePredationDrive":
      return value.toFixed(2)
    case "averageSize":
      return value.toFixed(1)
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
    omnivorePopulation: point.omnivorePopulation,
    carnivorePopulation: point.carnivorePopulation,
    bestFitness: point.bestFitness,
    averageFitness: point.averageFitness,
    speciesDiversity: point.speciesDiversity,
    averageFoodEaten: point.averageFoodEaten,
    averageMeatEaten: point.averageMeatEaten,
    averageCarrionEaten: point.averageCarrionEaten,
    averageKillCount: point.averageKillCount,
    survivalRate: point.survivalRate,
    averageSize: point.averageSize,
    averageVisionRange: point.averageVisionRange,
    averageVisionHalfAngle: point.averageVisionHalfAngle,
    averageMaxSpeed: point.averageMaxSpeed,
    averageMetabolism: point.averageMetabolism,
    averagePerceptionScore: point.averagePerceptionScore,
    averageBiomechanicsScore: point.averageBiomechanicsScore,
    averageMetabolismScore: point.averageMetabolismScore,
    averagePredationDrive: point.averagePredationDrive,
    averageCarrionDigestEfficiency: point.averageCarrionDigestEfficiency,
    averageToxinResistance: point.averageToxinResistance,
    carrionResources: point.carrionResources,
    totalBirths: point.totalBirths,
    totalDeaths: point.totalDeaths,
    speciesFamilies: point.speciesFamilies,
    averagePerceptionScoreNorm: normalizeTrait(
      point.averagePerceptionScore,
      "averagePerceptionScore",
    ),
    averageBiomechanicsScoreNorm: normalizeTrait(
      point.averageBiomechanicsScore,
      "averageBiomechanicsScore",
    ),
    averageMetabolismScoreNorm: normalizeTrait(
      point.averageMetabolismScore,
      "averageMetabolismScore",
    ),
    averagePredationDriveNorm: normalizeTrait(
      point.averagePredationDrive,
      "averagePredationDrive",
    ),
    averageSizeNorm: normalizeTrait(point.averageSize, "averageSize"),
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
  const series = history.map((point) => ({
    ...pointFromStats(point),
    x: point.generation * generationLength + point.tick,
    label: `Gen ${point.generation} · Tick ${point.tick}`,
  }))
  return downsampleSeries(series, MAX_RENDERED_CHART_POINTS)
}

function downsampleSeries<T>(series: T[], maxPoints: number): T[] {
  if (series.length <= maxPoints) return series

  const step = Math.ceil(series.length / maxPoints)
  const sampled: T[] = []
  for (let index = 0; index < series.length; index += step) {
    sampled.push(series[index]!)
  }

  const last = series[series.length - 1]!
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last)
  }

  return sampled
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

export interface SpeciesSeriesMeta {
  id: string
  label: string
  color: string
  dietClass: "herbivore" | "omnivore" | "carnivore"
}

export interface SpeciesPopulationPoint {
  x: number
  label: string
  generation: number
  tick: number
  [familyId: string]: string | number
}

export function buildSpeciesPopulationSeries(
  history: StatsHistoryPoint[],
  mode: ChartAxisMode,
  generationLength: number,
): {
  data: SpeciesPopulationPoint[]
  families: SpeciesSeriesMeta[]
} {
  const chartSeries = buildChartSeries(history, mode, generationLength)
  const familyMeta = new Map<string, SpeciesSeriesMeta>()
  const peakPopulation = new Map<string, number>()

  for (const point of chartSeries) {
    for (const family of point.speciesFamilies) {
      if (!familyMeta.has(family.id)) {
        familyMeta.set(family.id, {
          id: family.id,
          label: family.label,
          color: family.color,
          dietClass: family.dietClass,
        })
      }
      peakPopulation.set(
        family.id,
        Math.max(peakPopulation.get(family.id) ?? 0, family.population),
      )
    }
  }

  const latestFamilies = new Map(
    (chartSeries[chartSeries.length - 1]?.speciesFamilies ?? []).map((family) => [
      family.id,
      family.population,
    ]),
  )
  const families = Array.from(familyMeta.values())
    .sort((a, b) => {
      const latestDelta =
        (latestFamilies.get(b.id) ?? 0) - (latestFamilies.get(a.id) ?? 0)
      if (latestDelta !== 0) return latestDelta

      const peakDelta =
        (peakPopulation.get(b.id) ?? 0) - (peakPopulation.get(a.id) ?? 0)
      if (peakDelta !== 0) return peakDelta

      return a.label.localeCompare(b.label)
    })
    .slice(0, 8)
  const data = chartSeries.map((point) => {
    const populations = new Map(
      point.speciesFamilies.map((family) => [family.id, family.population]),
    )
    const row: SpeciesPopulationPoint = {
      x: mode === "generation" ? point.generation : (point as TickChartPoint).x,
      label: point.label,
      generation: point.generation,
      tick: point.tick,
    }
    for (const family of families) {
      row[family.id] = populations.get(family.id) ?? 0
    }
    return row
  })

  return { data, families }
}
