import {
  createRandomDNA,
  crossoverDNA,
  mutateDNA,
  type CreatureTraits,
} from "./genetics"
import { Creature, type Species } from "./creature"

export function calculateFitness(creature: Creature): number {
  creature.fitness = creature.computeFitness()
  return creature.fitness
}

export function tournamentSelect(
  creatures: Creature[],
  tournamentSize: number,
): Creature {
  let best: Creature | null = null

  for (let i = 0; i < tournamentSize; i++) {
    const candidate =
      creatures[Math.floor(Math.random() * creatures.length)]!

    if (!best) {
      best = candidate
      continue
    }

    if (candidate.fitness > best.fitness) {
      best = candidate
      continue
    }

    const fitnessClose =
      Math.abs(candidate.fitness - best.fitness) <= best.fitness * 0.05

    if (
      fitnessClose &&
      Math.random() < 0.2 &&
      candidate.dnaHash !== best.dnaHash
    ) {
      best = candidate
    }
  }

  return best!
}

export function evolveGeneration(
  creatures: Creature[],
  config: {
    populationSize: number
    mutationRate: number
    mutationStrength: number
    initialEnergy: number
    selectionPressure: number
    eliteCount: number
  },
  worldWidth: number,
  worldHeight: number,
  traitDefaults?: Partial<CreatureTraits>,
  species: Species = "herbivore",
): Creature[] {
  const alive = creatures.filter((c) => c.alive)
  alive.forEach((c) => calculateFitness(c))

  if (alive.length === 0) {
    return spawnInitialPopulation(
      config.populationSize,
      config.initialEnergy,
      worldWidth,
      worldHeight,
      traitDefaults,
      species,
    )
  }

  alive.sort((a, b) => b.fitness - a.fitness)

  const survivalCount = Math.max(
    2,
    Math.floor(alive.length * (1 - config.selectionPressure)),
  )
  const survivors = alive.slice(0, survivalCount)
  const nextGeneration: Creature[] = []

  const eliteCount = Math.min(config.eliteCount, survivors.length)
  for (let i = 0; i < eliteCount; i++) {
    const elite = survivors[i]!
    const clone = new Creature(
      elite.x,
      elite.y,
      new Float32Array(elite.dna),
      elite.generation + 1,
      config.initialEnergy,
      traitDefaults,
      species,
    )
    nextGeneration.push(clone)
  }

  while (nextGeneration.length < config.populationSize) {
    const parentA = tournamentSelect(survivors, 3)
    const parentB = tournamentSelect(survivors, 3)

    let childDna = crossoverDNA(parentA.dna, parentB.dna)
    childDna = mutateDNA(
      childDna,
      config.mutationRate,
      config.mutationStrength,
    )

    const child = new Creature(
      Math.random() * worldWidth,
      Math.random() * worldHeight,
      childDna,
      Math.max(parentA.generation, parentB.generation) + 1,
      config.initialEnergy,
      traitDefaults,
      species,
    )

    parentA.offspringCount += 1
    parentB.offspringCount += 1
    nextGeneration.push(child)
  }

  return nextGeneration
}

export function spawnInitialPopulation(
  populationSize: number,
  initialEnergy: number,
  worldWidth: number,
  worldHeight: number,
  traitDefaults?: Partial<CreatureTraits>,
  species: Species = "herbivore",
): Creature[] {
  const creatures: Creature[] = []
  for (let i = 0; i < populationSize; i++) {
    creatures.push(
      new Creature(
        Math.random() * worldWidth,
        Math.random() * worldHeight,
        createRandomDNA(traitDefaults),
        0,
        initialEnergy,
        traitDefaults,
        species,
      ),
    )
  }
  return creatures
}
