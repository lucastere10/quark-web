import { NeuralNetwork, WEIGHT_COUNT } from "./neural-network"

export const TRAIT_COUNT = 8
export const DNA_LENGTH = WEIGHT_COUNT + TRAIT_COUNT

export interface CreatureTraits {
  visionRange: number
  maxSpeed: number
  size: number
  metabolism: number
  visionHalfAngle: number
  scentRange: number
  hearingRange: number
  noiseEmission: number
}

export const DEFAULT_TRAITS: CreatureTraits = {
  visionRange: 120,
  maxSpeed: 2.5,
  size: 7,
  metabolism: 0.02,
  visionHalfAngle: 80,
  scentRange: 120,
  hearingRange: 140,
  noiseEmission: 1,
}

export const HERBIVORE_TRAITS: Partial<CreatureTraits> = {
  visionRange: 85,
  visionHalfAngle: 165,
  maxSpeed: 2.0,
  size: 6,
  metabolism: 0.018,
  scentRange: 110,
  hearingRange: 170,
  noiseEmission: 0.75,
}

export const CARNIVORE_TRAITS: Partial<CreatureTraits> = {
  visionRange: 200,
  visionHalfAngle: 35,
  maxSpeed: 3.0,
  size: 9,
  metabolism: 0.022,
  scentRange: 220,
  hearingRange: 190,
  noiseEmission: 1.1,
}

const TRAIT_MUTATION_SCALES = [10, 10, 10, 0.015, 12, 12, 12, 0.08] as const

function gaussianRandom(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function createRandomDNA(
  traitDefaults: Partial<CreatureTraits> = {},
): Float32Array {
  const traits = { ...DEFAULT_TRAITS, ...traitDefaults }
  const dna = new Float32Array(DNA_LENGTH)
  const weights = NeuralNetwork.createRandomWeights()
  dna.set(weights, 0)
  dna[WEIGHT_COUNT] = traits.visionRange
  dna[WEIGHT_COUNT + 1] = traits.maxSpeed
  dna[WEIGHT_COUNT + 2] = traits.size
  dna[WEIGHT_COUNT + 3] = traits.metabolism
  dna[WEIGHT_COUNT + 4] = traits.visionHalfAngle
  dna[WEIGHT_COUNT + 5] = traits.scentRange
  dna[WEIGHT_COUNT + 6] = traits.hearingRange
  dna[WEIGHT_COUNT + 7] = traits.noiseEmission
  return dna
}

export function extractTraits(dna: Float32Array): CreatureTraits {
  return {
    visionRange: clamp(dna[WEIGHT_COUNT] ?? DEFAULT_TRAITS.visionRange, 50, 300),
    maxSpeed: clamp(dna[WEIGHT_COUNT + 1] ?? DEFAULT_TRAITS.maxSpeed, 0.5, 5),
    size: clamp(dna[WEIGHT_COUNT + 2] ?? DEFAULT_TRAITS.size, 2, 16),
    metabolism: clamp(
      dna[WEIGHT_COUNT + 3] ?? DEFAULT_TRAITS.metabolism,
      0.005,
      0.08,
    ),
    visionHalfAngle: clamp(
      dna[WEIGHT_COUNT + 4] ?? DEFAULT_TRAITS.visionHalfAngle,
      20,
      175,
    ),
    scentRange: clamp(dna[WEIGHT_COUNT + 5] ?? DEFAULT_TRAITS.scentRange, 30, 320),
    hearingRange: clamp(
      dna[WEIGHT_COUNT + 6] ?? DEFAULT_TRAITS.hearingRange,
      30,
      320,
    ),
    noiseEmission: clamp(
      dna[WEIGHT_COUNT + 7] ?? DEFAULT_TRAITS.noiseEmission,
      0.25,
      2,
    ),
  }
}

export function extractWeights(dna: Float32Array): Float32Array {
  return dna.slice(0, WEIGHT_COUNT)
}

export function mutateDNA(
  dna: Float32Array,
  mutationRate: number,
  mutationStrength: number,
): Float32Array {
  const mutated = new Float32Array(dna)

  for (let i = 0; i < WEIGHT_COUNT; i++) {
    if (Math.random() < mutationRate) {
      mutated[i] = (mutated[i] ?? 0) + gaussianRandom() * mutationStrength
    }
  }

  for (let i = WEIGHT_COUNT; i < DNA_LENGTH; i++) {
    if (Math.random() < mutationRate * 0.5) {
      const traitIndex = i - WEIGHT_COUNT
      const scale = TRAIT_MUTATION_SCALES[traitIndex] ?? 10
      mutated[i] = (mutated[i] ?? 0) + gaussianRandom() * mutationStrength * scale
    }
  }

  return mutated
}

export function crossoverDNA(
  parentA: Float32Array,
  parentB: Float32Array,
): Float32Array {
  const child = new Float32Array(DNA_LENGTH)
  const crossoverPoint = Math.floor(Math.random() * DNA_LENGTH)

  for (let i = 0; i < DNA_LENGTH; i++) {
    child[i] = i < crossoverPoint ? parentA[i]! : parentB[i]!
  }

  return child
}

export function dnaHash(dna: Float32Array): string {
  let hash = 0
  for (let i = 0; i < Math.min(dna.length, 32); i++) {
    const value = Math.floor((dna[i] ?? 0) * 1000)
    hash = (hash << 5) - hash + value
    hash |= 0
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(6, "0")
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
