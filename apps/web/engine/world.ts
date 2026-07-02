import {
  Creature,
  resetCreatureIds,
  type ObstacleSnapshot,
  type ResourceSnapshot,
  type TraitCaps,
} from "./creature"
import { type CreatureTraits } from "./genetics"
import {
  evolveGeneration,
  spawnInitialPopulation,
} from "./evolution"

export type FoodDistribution = "uniform" | "cluster"

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
  noiseStrength: number
  foodDistribution: FoodDistribution
  obstacleCount: number
  eliteCount: number
}

export interface WorldStats {
  generation: number
  population: number
  bestFitness: number
  averageFitness: number
  averageFoodEaten: number
  survivalRate: number
  averageLifespan: number
  speciesDiversity: number
  tick: number
  averageSize: number
  averageVisionRange: number
  averageVisionHalfAngle: number
  averageMaxSpeed: number
  averageMetabolism: number
}

export const DEFAULT_CONFIG: SimulationConfig = {
  populationSize: 80,
  mutationRate: 0.05,
  mutationStrength: 0.3,
  selectionPressure: 0.7,
  generationLength: 900,
  foodDensity: 120,
  poisonDensity: 25,
  worldWidth: 1200,
  worldHeight: 800,
  initialEnergy: 100,
  visionRange: 120,
  maxSpeed: 2.5,
  noiseStrength: 0.15,
  foodDistribution: "uniform",
  obstacleCount: 0,
  eliteCount: 2,
}

let nextResourceId = 1
let nextObstacleId = 1

interface ClusterCenter {
  x: number
  y: number
}

export class World {
  config: SimulationConfig
  creatures: Creature[] = []
  resources: ResourceSnapshot[] = []
  obstacles: ObstacleSnapshot[] = []
  generation = 0
  tick = 0
  running = false
  private lastSurvivalRate = 0
  private lastAverageLifespan = 0
  private justEvolved = false
  private lastWorldWidth = 0
  private lastWorldHeight = 0
  private foodClusterCenters: ClusterCenter[] = []

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.reset()
  }

  reset(): void {
    resetCreatureIds()
    nextResourceId = 1
    nextObstacleId = 1
    this.generation = 0
    this.tick = 0
    this.lastSurvivalRate = 0
    this.lastAverageLifespan = 0
    this.lastWorldWidth = this.config.worldWidth
    this.lastWorldHeight = this.config.worldHeight
    this.foodClusterCenters = this.generateClusterCenters()
    this.creatures = spawnInitialPopulation(
      this.config.populationSize,
      this.config.initialEnergy,
      this.config.worldWidth,
      this.config.worldHeight,
      this.traitDefaults(),
    )
    this.resources = this.generateResources()
    this.obstacles = this.generateObstacles()
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
    this.syncPreviewObstacles()
    this.syncPreviewPopulation()
    this.refreshPreviewInputs()
  }

  private traitDefaults(): Partial<CreatureTraits> {
    return {
      visionRange: this.config.visionRange,
      maxSpeed: this.config.maxSpeed,
    }
  }

  private traitCaps(): TraitCaps {
    return {
      visionRange: this.config.visionRange,
      maxSpeed: this.config.maxSpeed,
      noiseStrength: this.config.noiseStrength,
    }
  }

  private refreshPreviewInputs(): void {
    if (this.running) return

    const caps = this.traitCaps()
    for (const creature of this.creatures) {
      creature.think(
        this.config.worldWidth,
        this.config.worldHeight,
        this.resources,
        this.obstacles,
        caps,
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

      for (const obstacle of this.obstacles) {
        obstacle.x *= scaleX
        obstacle.y *= scaleY
      }

      for (const center of this.foodClusterCenters) {
        center.x *= scaleX
        center.y *= scaleY
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
    if (this.config.foodDistribution === "cluster") {
      this.foodClusterCenters = this.generateClusterCenters()
    }

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

  syncPreviewObstacles(): void {
    while (this.obstacles.length > this.config.obstacleCount) {
      this.obstacles.pop()
    }
    while (this.obstacles.length < this.config.obstacleCount) {
      this.obstacles.push(this.createObstacle())
    }
  }

  syncPreviewPopulation(): void {
    const target = this.config.populationSize
    const defaults = this.traitDefaults()

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
          defaults,
        ),
      )
    }
  }

  resetToPreview(): void {
    this.pause()
    this.reset()
    this.syncPreview()
  }

  get evolutionJustOccurred(): boolean {
    return this.justEvolved
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
    const caps = this.traitCaps()

    for (const creature of this.creatures) {
      if (!creature.alive) continue

      creature.syncRestingState()

      if (creature.isResting) {
        creature.processResting(1)
        creature.tryPoison(this.resources)
        continue
      }

      creature.think(
        this.config.worldWidth,
        this.config.worldHeight,
        this.resources,
        this.obstacles,
        caps,
      )
      creature.act(1)
      creature.tryEat(this.resources)
      creature.tryPoison(this.resources)
      creature.resolveObstacleCollisions(this.obstacles)
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
        eliteCount: this.config.eliteCount,
      },
      this.config.worldWidth,
      this.config.worldHeight,
      this.traitDefaults(),
    )

    this.generation++
    this.tick = 0
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
    if (this.config.foodDistribution === "cluster") {
      this.foodClusterCenters = this.generateClusterCenters()
    }

    const resources: ResourceSnapshot[] = []
    for (let i = 0; i < this.config.foodDensity; i++) {
      resources.push(this.createResource("food"))
    }
    for (let i = 0; i < this.config.poisonDensity; i++) {
      resources.push(this.createResource("poison"))
    }
    return resources
  }

  private generateObstacles(): ObstacleSnapshot[] {
    const obstacles: ObstacleSnapshot[] = []
    for (let i = 0; i < this.config.obstacleCount; i++) {
      obstacles.push(this.createObstacle())
    }
    return obstacles
  }

  private generateClusterCenters(): ClusterCenter[] {
    const count = 4 + Math.floor(Math.random() * 5)
    const margin = 80
    const centers: ClusterCenter[] = []

    for (let i = 0; i < count; i++) {
      centers.push({
        x: margin + Math.random() * (this.config.worldWidth - margin * 2),
        y: margin + Math.random() * (this.config.worldHeight - margin * 2),
      })
    }

    return centers
  }

  private createResource(type: "food" | "poison"): ResourceSnapshot {
    const position = this.randomResourcePosition(type)
    return {
      id: nextResourceId++,
      x: position.x,
      y: position.y,
      type,
    }
  }

  private randomResourcePosition(type: "food" | "poison"): { x: number; y: number } {
    const margin = 4

    if (
      type === "food" &&
      this.config.foodDistribution === "cluster" &&
      this.foodClusterCenters.length > 0 &&
      Math.random() < 0.7
    ) {
      const center =
        this.foodClusterCenters[
          Math.floor(Math.random() * this.foodClusterCenters.length)
        ]!
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 80
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      return {
        x: Math.max(margin, Math.min(this.config.worldWidth - margin, x)),
        y: Math.max(margin, Math.min(this.config.worldHeight - margin, y)),
      }
    }

    return {
      x: margin + Math.random() * (this.config.worldWidth - margin * 2),
      y: margin + Math.random() * (this.config.worldHeight - margin * 2),
    }
  }

  private createObstacle(): ObstacleSnapshot {
    const margin = 40
    const radius = 12 + Math.random() * 18
    return {
      id: nextObstacleId++,
      x: margin + Math.random() * (this.config.worldWidth - margin * 2),
      y: margin + Math.random() * (this.config.worldHeight - margin * 2),
      radius,
    }
  }

  getStats(): WorldStats {
    const fitnesses = this.creatures.map((c) => c.computeFitness())
    const foodEaten = this.creatures.map((c) => c.foodEaten)
    const bestFitness = fitnesses.length > 0 ? Math.max(...fitnesses) : 0
    const averageFitness =
      fitnesses.length > 0
        ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
        : 0
    const averageFoodEaten =
      foodEaten.length > 0
        ? foodEaten.reduce((a, b) => a + b, 0) / foodEaten.length
        : 0

    const avg = (values: number[]) =>
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

    const hashes = new Set(this.creatures.map((c) => c.dnaHash))

    return {
      generation: this.generation,
      population: this.creatures.length,
      bestFitness,
      averageFitness,
      averageFoodEaten,
      survivalRate: this.lastSurvivalRate,
      averageLifespan: this.lastAverageLifespan,
      speciesDiversity: hashes.size,
      tick: this.tick,
      averageSize: avg(this.creatures.map((c) => c.traits.size)),
      averageVisionRange: avg(this.creatures.map((c) => c.traits.visionRange)),
      averageVisionHalfAngle: avg(
        this.creatures.map((c) => c.traits.visionHalfAngle),
      ),
      averageMaxSpeed: avg(this.creatures.map((c) => c.traits.maxSpeed)),
      averageMetabolism: avg(this.creatures.map((c) => c.traits.metabolism)),
    }
  }
}
