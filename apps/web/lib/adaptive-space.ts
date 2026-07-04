import type { CreatureSnapshot } from "@/store/simulation-store"

export type AdaptiveHabit = "herbivore" | "omnivore" | "carnivore"

export interface AdaptiveSpacePoint {
  id: number
  familyId: string
  label: string
  habit: AdaptiveHabit
  x: number
  y: number
  z: number
  color: string
  size: number
  fitness: number
}

export interface AdaptiveFamilyCloud {
  familyId: string
  x: number
  y: number
  z: number
  color: string
  population: number
}

export interface AdaptiveSpaceData {
  points: AdaptiveSpacePoint[]
  families: AdaptiveFamilyCloud[]
}

const HABIT_COLORS: Record<AdaptiveHabit, [number, number, number]> = {
  herbivore: [0.13, 1, 0.47],
  omnivore: [0.15, 0.55, 1],
  carnivore: [1, 0.24, 0.18],
}

function scoreToAxis(value: number): number {
  return Math.max(-1, Math.min(1, value / 50 - 1))
}

function habitFor(creature: CreatureSnapshot): AdaptiveHabit {
  return creature.species
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return clamp01((value - min) / (max - min))
}

function colorFor(creature: CreatureSnapshot): string {
  const habit = habitFor(creature)
  const [dietR, dietG, dietB] = HABIT_COLORS[habit]
  const perception = clamp01(creature.perceptionScore / 100)
  const biomechanics = clamp01(creature.biomechanicsScore / 100)
  const metabolism = clamp01(creature.metabolismScore / 100)
  const predation = clamp01(creature.predationDrive)
  const toxin = clamp01(creature.toxinResistance)
  const size = normalize(creature.size, 2, 16)
  const meat = normalize(creature.meatDigestEfficiency, 0.05, 1.7)
  const plant = normalize(creature.plantDigestEfficiency, 0.2, 1.6)

  const r = clamp01(
    dietR * 0.28 +
      metabolism * 0.28 +
      predation * 0.3 +
      meat * 0.14,
  )
  const g = clamp01(
    dietG * 0.28 +
      perception * 0.34 +
      plant * 0.24 +
      toxin * 0.14,
  )
  const b = clamp01(
    dietB * 0.26 +
      biomechanics * 0.36 +
      toxin * 0.22 +
      size * 0.16,
  )
  const brighten = 0.78 + Math.max(perception, biomechanics, metabolism) * 0.28

  return `rgb(${Math.round(Math.min(1, r * brighten) * 255)}, ${Math.round(
    Math.min(1, g * brighten) * 255,
  )}, ${Math.round(Math.min(1, b * brighten) * 255)})`
}

function pointSize(creature: CreatureSnapshot): number {
  const energyRatio =
    creature.maxEnergy > 0 ? Math.max(0, creature.energy / creature.maxEnergy) : 0
  const fitnessSignal = Math.max(0, Math.min(1, creature.fitness / 120))
  return 0.035 + energyRatio * 0.025 + fitnessSignal * 0.025
}

export function buildAdaptiveSpaceData(
  creatures: CreatureSnapshot[],
): AdaptiveSpaceData {
  const points = creatures.map((creature) => ({
    id: creature.id,
    familyId: creature.familyId,
    label: `#${creature.id} ${creature.familyId} · ${creature.species} · P${creature.perceptionScore} B${creature.biomechanicsScore} M${creature.metabolismScore}`,
    habit: habitFor(creature),
    x: scoreToAxis(creature.perceptionScore),
    y: scoreToAxis(creature.biomechanicsScore),
    z: scoreToAxis(creature.metabolismScore),
    color: colorFor(creature),
    size: pointSize(creature),
    fitness: creature.fitness,
  }))

  const byFamily = new Map<string, AdaptiveSpacePoint[]>()
  for (const point of points) {
    const family = byFamily.get(point.familyId) ?? []
    family.push(point)
    byFamily.set(point.familyId, family)
  }

  const families = Array.from(byFamily.entries())
    .map(([familyId, familyPoints]) => {
      const inv = 1 / familyPoints.length
      return {
        familyId,
        x: familyPoints.reduce((sum, point) => sum + point.x, 0) * inv,
        y: familyPoints.reduce((sum, point) => sum + point.y, 0) * inv,
        z: familyPoints.reduce((sum, point) => sum + point.z, 0) * inv,
        color: familyPoints[0]?.color ?? "rgb(0, 229, 204)",
        population: familyPoints.length,
      }
    })
    .sort((a, b) => b.population - a.population)
    .slice(0, 12)

  return { points, families }
}
