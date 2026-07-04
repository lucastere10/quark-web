import { NeuralNetwork, WEIGHT_COUNT } from "./neural-network"

export type DietClass = "herbivore" | "omnivore" | "carnivore"

export interface TraitAxes {
  perception: number
  biomechanics: number
  metabolism: number
}

export interface CreatureTraits {
  visionRange: number
  maxSpeed: number
  size: number
  metabolism: number
  visionHalfAngle: number
  scentRange: number
  hearingRange: number
  noiseEmission: number
  perceptionAccuracy: number
  acceleration: number
  agility: number
  strength: number
  endurance: number
  plantDigestEfficiency: number
  meatDigestEfficiency: number
  carrionDigestEfficiency: number
  toxinResistance: number
  energyStorage: number
  predationDrive: number
}

export interface MutationBiasOptions {
  predationPressure?: number
  carrionPressure?: number
  meatExperience?: number
  carrionExperience?: number
  killExperience?: number
}

export const TRAIT_COUNT = 19
export const DNA_LENGTH = WEIGHT_COUNT + TRAIT_COUNT

export const DEFAULT_TRAITS: CreatureTraits = {
  visionRange: 120,
  maxSpeed: 2.5,
  size: 7,
  metabolism: 0.02,
  visionHalfAngle: 80,
  scentRange: 120,
  hearingRange: 140,
  noiseEmission: 1,
  perceptionAccuracy: 0.75,
  acceleration: 1,
  agility: 1,
  strength: 1,
  endurance: 1,
  plantDigestEfficiency: 1,
  meatDigestEfficiency: 0.18,
  carrionDigestEfficiency: 0.12,
  toxinResistance: 0.08,
  energyStorage: 1,
  predationDrive: 0.08,
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
  perceptionAccuracy: 0.72,
  acceleration: 1.05,
  agility: 1.15,
  strength: 0.8,
  endurance: 1.1,
  plantDigestEfficiency: 1.05,
  meatDigestEfficiency: 0.14,
  carrionDigestEfficiency: 0.1,
  toxinResistance: 0.08,
  energyStorage: 1.05,
  predationDrive: 0.06,
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
  perceptionAccuracy: 1.15,
  acceleration: 1.2,
  agility: 1,
  strength: 1.35,
  endurance: 0.95,
  plantDigestEfficiency: 0.35,
  meatDigestEfficiency: 1.15,
  carrionDigestEfficiency: 0.28,
  toxinResistance: 0.12,
  energyStorage: 1.1,
  predationDrive: 0.78,
}

const TRAIT_MUTATION_SCALES = [
  10,
  10,
  10,
  0.015,
  12,
  12,
  12,
  0.08,
  0.12,
  0.12,
  0.12,
  0.16,
  0.14,
  0.12,
  0.2,
  0.14,
  0.12,
  0.1,
  0.14,
] as const

const PLANT_DIGEST_INDEX = WEIGHT_COUNT + 13
const MEAT_DIGEST_INDEX = WEIGHT_COUNT + 14
const CARRION_DIGEST_INDEX = WEIGHT_COUNT + 15
const PREDATION_DRIVE_INDEX = WEIGHT_COUNT + 18

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
  dna[WEIGHT_COUNT + 8] = traits.perceptionAccuracy
  dna[WEIGHT_COUNT + 9] = traits.acceleration
  dna[WEIGHT_COUNT + 10] = traits.agility
  dna[WEIGHT_COUNT + 11] = traits.strength
  dna[WEIGHT_COUNT + 12] = traits.endurance
  dna[WEIGHT_COUNT + 13] = traits.plantDigestEfficiency
  dna[WEIGHT_COUNT + 14] = traits.meatDigestEfficiency
  dna[WEIGHT_COUNT + 15] = traits.carrionDigestEfficiency
  dna[WEIGHT_COUNT + 16] = traits.toxinResistance
  dna[WEIGHT_COUNT + 17] = traits.energyStorage
  dna[WEIGHT_COUNT + 18] = traits.predationDrive
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
    perceptionAccuracy: clamp(
      dna[WEIGHT_COUNT + 8] ?? DEFAULT_TRAITS.perceptionAccuracy,
      0.3,
      1.5,
    ),
    acceleration: clamp(dna[WEIGHT_COUNT + 9] ?? DEFAULT_TRAITS.acceleration, 0.45, 1.8),
    agility: clamp(dna[WEIGHT_COUNT + 10] ?? DEFAULT_TRAITS.agility, 0.4, 1.7),
    strength: clamp(dna[WEIGHT_COUNT + 11] ?? DEFAULT_TRAITS.strength, 0.45, 2.2),
    endurance: clamp(dna[WEIGHT_COUNT + 12] ?? DEFAULT_TRAITS.endurance, 0.45, 2),
    plantDigestEfficiency: clamp(
      dna[WEIGHT_COUNT + 13] ?? DEFAULT_TRAITS.plantDigestEfficiency,
      0.2,
      1.6,
    ),
    meatDigestEfficiency: clamp(
      dna[WEIGHT_COUNT + 14] ?? DEFAULT_TRAITS.meatDigestEfficiency,
      0.05,
      1.7,
    ),
    carrionDigestEfficiency: clamp(
      dna[WEIGHT_COUNT + 15] ?? DEFAULT_TRAITS.carrionDigestEfficiency,
      0.02,
      1.6,
    ),
    toxinResistance: clamp(
      dna[WEIGHT_COUNT + 16] ?? DEFAULT_TRAITS.toxinResistance,
      0,
      1,
    ),
    energyStorage: clamp(
      dna[WEIGHT_COUNT + 17] ?? DEFAULT_TRAITS.energyStorage,
      0.55,
      1.9,
    ),
    predationDrive: clamp(
      dna[WEIGHT_COUNT + 18] ?? DEFAULT_TRAITS.predationDrive,
      0,
      1,
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
  options: MutationBiasOptions = {},
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

  biasOmnivoreTowardPredation(mutated, mutationRate, mutationStrength, options)
  biasTowardRotResistance(mutated, mutationRate, mutationStrength, options)

  return mutated
}

function biasOmnivoreTowardPredation(
  dna: Float32Array,
  mutationRate: number,
  mutationStrength: number,
  options: MutationBiasOptions,
): void {
  const plant = dna[PLANT_DIGEST_INDEX] ?? DEFAULT_TRAITS.plantDigestEfficiency
  const meat = dna[MEAT_DIGEST_INDEX] ?? DEFAULT_TRAITS.meatDigestEfficiency
  const carrion = dna[CARRION_DIGEST_INDEX] ?? DEFAULT_TRAITS.carrionDigestEfficiency
  const predation = dna[PREDATION_DRIVE_INDEX] ?? DEFAULT_TRAITS.predationDrive
  const meatPreference =
    Math.max(meat, carrion * 0.75) /
    Math.max(0.1, meat + carrion * 0.75 + plant)
  const omnivoreBridge =
    predation >= 0.12 || meatPreference >= 0.19 || meat >= 0.24 || carrion >= 0.34
  const pressure = options.predationPressure ?? 0
  const meatExperience = Math.min(
    1,
    ((options.meatExperience ?? 0) + (options.killExperience ?? 0) * 2) / 6,
  )

  if (!omnivoreBridge) return

  if (
    predation < 0.82 &&
    Math.random() < mutationRate * (1.35 + pressure * (0.75 + meatExperience))
  ) {
    dna[PREDATION_DRIVE_INDEX] =
      predation +
      Math.abs(gaussianRandom()) *
        mutationStrength *
        (0.18 + pressure * (0.08 + meatExperience * 0.08))
  }

  if (
    meat < 1.45 &&
    Math.random() < mutationRate * (1.2 + pressure * (0.7 + meatExperience))
  ) {
    dna[MEAT_DIGEST_INDEX] =
      meat +
      Math.abs(gaussianRandom()) *
        mutationStrength *
        (0.18 + pressure * (0.08 + meatExperience * 0.08))
  }

  if (
    predation > 0.26 &&
    meatPreference > 0.24 &&
    plant > 0.38 &&
    Math.random() < mutationRate * 0.75
  ) {
    dna[PLANT_DIGEST_INDEX] =
      plant - Math.abs(gaussianRandom()) * mutationStrength * 0.12
  }
}

function biasTowardRotResistance(
  dna: Float32Array,
  mutationRate: number,
  mutationStrength: number,
  options: MutationBiasOptions,
): void {
  const toxin = dna[WEIGHT_COUNT + 16] ?? DEFAULT_TRAITS.toxinResistance
  const pressure = options.carrionPressure ?? 0
  const experience = Math.min(1, (options.carrionExperience ?? 0) / 5)
  const opportunity = pressure * 0.55 + experience * 0.45

  if (opportunity <= 0.08) return

  if (toxin < 0.9 && Math.random() < mutationRate * (0.65 + opportunity * 1.2)) {
    dna[WEIGHT_COUNT + 16] =
      toxin + Math.abs(gaussianRandom()) * mutationStrength * (0.1 + opportunity * 0.1)
  }
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

export function classifyDiet(traits: CreatureTraits): DietClass {
  const meatPreference =
    Math.max(traits.meatDigestEfficiency, traits.carrionDigestEfficiency * 0.75) /
    Math.max(
      0.1,
      traits.meatDigestEfficiency +
        traits.carrionDigestEfficiency * 0.75 +
        traits.plantDigestEfficiency,
    )
  const predation = traits.predationDrive

  if (predation >= 0.48 && meatPreference >= 0.34) {
    return "carnivore"
  }
  if (predation >= 0.13 || meatPreference >= 0.19) {
    return "omnivore"
  }
  return "herbivore"
}

export function computeTraitAxes(traits: CreatureTraits): TraitAxes {
  const vision = normalize(traits.visionRange, 50, 300)
  const fieldOfView = normalize(traits.visionHalfAngle, 20, 175)
  const scent = normalize(traits.scentRange, 30, 320)
  const hearing = normalize(traits.hearingRange, 30, 320)
  const accuracy = normalize(traits.perceptionAccuracy, 0.3, 1.5)
  const stealthPenalty = normalize(traits.noiseEmission, 0.25, 2) * 0.12
  const perception = clamp01(
    vision * 0.24 +
      fieldOfView * 0.16 +
      scent * 0.2 +
      hearing * 0.18 +
      accuracy * 0.22 -
      stealthPenalty,
  )

  const size = normalize(traits.size, 2, 16)
  const speed = normalize(traits.maxSpeed, 0.5, 5)
  const acceleration = normalize(traits.acceleration, 0.45, 1.8)
  const agility = normalize(traits.agility, 0.4, 1.7)
  const strength = clamp01(normalize(traits.strength, 0.45, 2.2) * 0.65 + size * 0.35)
  const endurance = normalize(traits.endurance, 0.45, 2)
  const biomechanics = clamp01(
    speed * 0.22 +
      acceleration * 0.18 +
      agility * 0.16 +
      strength * 0.22 +
      endurance * 0.14 +
      size * 0.08,
  )

  const lowBasal = 1 - normalize(traits.metabolism, 0.005, 0.08)
  const plant = normalize(traits.plantDigestEfficiency, 0.2, 1.6)
  const meat = normalize(traits.meatDigestEfficiency, 0.05, 1.7)
  const carrion = normalize(traits.carrionDigestEfficiency, 0.02, 1.6)
  const storage = normalize(traits.energyStorage, 0.55, 1.9)
  const toxin = normalize(traits.toxinResistance, 0, 1)
  const metabolicEndurance = normalize(traits.endurance, 0.45, 2)
  const metabolism = clamp01(
    lowBasal * 0.3 +
      Math.max(plant, meat, carrion) * 0.2 +
      storage * 0.24 +
      metabolicEndurance * 0.2 +
      toxin * 0.06,
  )

  return {
    perception: Math.round(perception * 100),
    biomechanics: Math.round(biomechanics * 100),
    metabolism: Math.round(metabolism * 100),
  }
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return clamp01((value - min) / (max - min))
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
