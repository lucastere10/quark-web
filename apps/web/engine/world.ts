import { Creature, resetCreatureIds, type ResourceSnapshot } from "./creature"
import {
  evolveGeneration,
  spawnInitialPopulation,
} from "./evolution"

export interface SimulationConfig {
  populationSize: number
  mutationRate: number
  mutationStrength: number
  selectionPressure: number
  generationLength: number
  foodDensity: number
  poisonDensity: number
  worldWidth: number
  worldHeight: number
  initialEnergy: number
  visionRange: number
  maxSpeed: number
}

export interface WorldStats {
  generation: number
  population: number
  bestFitness: number
  averageFitness: number
  survivalRate: number
  averageLifespan: number
  speciesDiversity: number
  tick: number
}

export const DEFAULT_CONFIG: SimulationConfig = {
  populationSize: 80,
  mutationRate: 0.08,
  mutationStrength: 0.3,
  selectionPressure: 0.5,
  generationLength: 600,
  foodDensity: 120,
  poisonDensity: 25,
  worldWidth: 1200,
  worldHeight: 800,
  initialEnergy: 100,
  visionRange: 120,
  maxSpeed: 2.5,
}

let nextResourceId = 1

export class World {
  config: SimulationConfig
  creatures: Creature[] = []
  resources: ResourceSnapshot[] = []
  generation = 0
  tick = 0
  running = false
  private lastSurvivalRate = 0
  private lastAverageLifespan = 0
  private justEvolved = false
  private lastWorldWidth = 0
  private lastWorldHeight = 0

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.reset()
  }

  reset(): void {
    resetCreatureIds()
    nextResourceId = 1
    this.generation = 0
    this.tick = 0
    this.lastSurvivalRate = 0
    this.lastAverageLifespan = 0
    this.lastWorldWidth = this.config.worldWidth
    this.lastWorldHeight = this.config.worldHeight
    this.creatures = spawnInitialPopulation(
      this.config.populationSize,
      this.config.initialEnergy,
      this.config.worldWidth,
      this.config.worldHeight,
    )
    this.resources = this.generateResources()
  }

  start(): void {
    this.running = true
  }

  pause(): void {
    this.running = false
  }

  updateConfig(partial: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...partial }
  }

  syncPreview(): void {
    this.syncPreviewBounds()
    this.syncPreviewResources()
    this.syncPreviewPopulation()
    this.refreshPreviewInputs()
  }

  private refreshPreviewInputs(): void {
    if (this.running) return

    for (const creature of this.creatures) {
      creature.think(
        this.config.worldWidth,
        this.config.worldHeight,
        this.resources,
        this.config.visionRange,
      )
    }
  }

  syncPreviewBounds(): void {
    const { worldWidth, worldHeight } = this.config
    const prevW = this.lastWorldWidth || worldWidth
    const prevH = this.lastWorldHeight || worldHeight

    if (
      this.lastWorldWidth > 0 &&
      this.lastWorldHeight > 0 &&
      (prevW !== worldWidth || prevH !== worldHeight)
    ) {
      const scaleX = worldWidth / prevW
      const scaleY = worldHeight / prevH

      for (const creature of this.creatures) {
        creature.x *= scaleX
        creature.y *= scaleY
      }

      for (const resource of this.resources) {
        resource.x *= scaleX
        resource.y *= scaleY
      }
    }

    const margin = 4

    for (const creature of this.creatures) {
      creature.clampToWorld(worldWidth, worldHeight)
    }

    for (const resource of this.resources) {
      resource.x = Math.max(margin, Math.min(worldWidth - margin, resource.x))
      resource.y = Math.max(margin, Math.min(worldHeight - margin, resource.y))
    }

    this.lastWorldWidth = worldWidth
    this.lastWorldHeight = worldHeight
  }

  syncPreviewResources(): void {
    let food = this.resources.filter((r) => r.type === "food")
    let poison = this.resources.filter((r) => r.type === "poison")

    while (food.length > this.config.foodDensity) {
      food.pop()
    }
    while (food.length < this.config.foodDensity) {
      food.push(this.createResource("food"))
    }

    while (poison.length > this.config.poisonDensity) {
      poison.pop()
    }
    while (poison.length < this.config.poisonDensity) {
      poison.push(this.createResource("poison"))
    }

    this.resources = [...food, ...poison]
  }

  syncPreviewPopulation(): void {
    const target = this.config.populationSize

    while (this.creatures.length > target) {
      this.creatures.pop()
    }

    while (this.creatures.length < target) {
      this.creatures.push(
        new Creature(
          Math.random() * this.config.worldWidth,
          Math.random() * this.config.worldHeight,
          undefined,
          0,
          this.config.initialEnergy,
        ),
      )
    }
  }

  resetToPreview(): void {
    this.pause()
    this.reset()
    this.syncPreview()
  }

  step(): WorldStats {
    if (!this.running) {
      return this.getStats()
    }

    this.tick++

    this.justEvolved = false
    if (this.tick >= this.config.generationLength) {
      this.runEvolution()
      this.justEvolved = true
    }

    this.updateCreatures()
    this.replenishResources()
    return this.getStats()
  }

  getCreatureById(id: number): Creature | undefined {
    return this.creatures.find((c) => c.id === id)
  }

  private updateCreatures(): void {
    for (const creature of this.creatures) {
      if (!creature.alive) continue

      creature.think(
        this.config.worldWidth,
        this.config.worldHeight,
        this.resources,
        this.config.visionRange,
      )
      creature.act(1)
      creature.tryEat(this.resources, 0.4)
      creature.tryPoison(this.resources)
      creature.clampToWorld(this.config.worldWidth, this.config.worldHeight)
    }

    this.creatures = this.creatures.filter((c) => c.alive)

    if (this.creatures.length === 0 && !this.justEvolved) {
      this.runEvolution()
    }
  }

  private runEvolution(): void {
    const totalPop = this.config.populationSize
    const survived = this.creatures.filter((c) => c.alive).length
    const avgAge =
      this.creatures.length > 0
        ? this.creatures.reduce((sum, c) => sum + c.age, 0) /
          this.creatures.length
        : 0

    this.lastSurvivalRate = totalPop > 0 ? survived / totalPop : 0
    this.lastAverageLifespan = avgAge

    this.creatures = evolveGeneration(
      this.creatures,
      {
        populationSize: this.config.populationSize,
        mutationRate: this.config.mutationRate,
        mutationStrength: this.config.mutationStrength,
        initialEnergy: this.config.initialEnergy,
        selectionPressure: this.config.selectionPressure,
      },
      this.config.worldWidth,
      this.config.worldHeight,
    )

    this.generation++
    this.tick = 0
    this.resources = this.generateResources()
  }

  private replenishResources(): void {
    let foodCount = this.resources.filter((r) => r.type === "food").length
    let poisonCount = this.resources.filter((r) => r.type === "poison").length

    while (foodCount < this.config.foodDensity) {
      this.resources.push(this.createResource("food"))
      foodCount++
    }
    while (poisonCount < this.config.poisonDensity) {
      this.resources.push(this.createResource("poison"))
      poisonCount++
    }
  }

  private generateResources(): ResourceSnapshot[] {
    const resources: ResourceSnapshot[] = []
    for (let i = 0; i < this.config.foodDensity; i++) {
      resources.push(this.createResource("food"))
    }
    for (let i = 0; i < this.config.poisonDensity; i++) {
      resources.push(this.createResource("poison"))
    }
    return resources
  }

  private createResource(type: "food" | "poison"): ResourceSnapshot {
    return {
      id: nextResourceId++,
      x: Math.random() * this.config.worldWidth,
      y: Math.random() * this.config.worldHeight,
      type,
    }
  }

  getStats(): WorldStats {
    const fitnesses = this.creatures.map((c) => c.computeFitness())
    const bestFitness = fitnesses.length > 0 ? Math.max(...fitnesses) : 0
    const averageFitness =
      fitnesses.length > 0
        ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
        : 0

    const hashes = new Set(this.creatures.map((c) => c.dnaHash))

    return {
      generation: this.generation,
      population: this.creatures.length,
      bestFitness,
      averageFitness,
      survivalRate: this.lastSurvivalRate,
      averageLifespan: this.lastAverageLifespan,
      speciesDiversity: hashes.size,
      tick: this.tick,
    }
  }
}
