import { distance } from "./collision"
import {
  Creature,
  resetCreatureIds,
  type CreatureSenseSnapshot,
  type ObstacleSnapshot,
  type ResourceSnapshot,
  type ResourceType,
  type ThinkOptions,
  type TraitCaps,
} from "./creature"
import {
  CARNIVORE_TRAITS,
  HERBIVORE_TRAITS,
  type CreatureTraits,
} from "./genetics"
import {
  evolveGeneration,
  spawnInitialPopulation,
} from "./evolution"

export type FoodDistribution = "uniform" | "cluster"

export interface FertilityCellSnapshot {
  x: number
  y: number
  size: number
  value: number
}

export interface KillEventSnapshot {
  id: number
  x: number
  y: number
  size: number
}

export interface SimulationConfig {
  populationSize: number
  herbivorePop: number
  carnivorePop: number
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
  sprintCostMultiplier: number
  digestSlowdown: number
  minFoodToReproduce: number
  reproductionCooldownTicks: number
  ecosystemMode: boolean
  vegetationGrowthRate: number
  vegetationSpreadRadius: number
  fertilityDriftRate: number
}

export interface WorldStats {
  generation: number
  population: number
  herbivorePopulation: number
  carnivorePopulation: number
  bestFitness: number
  averageFitness: number
  averageFoodEaten: number
  averageKillCount: number
  survivalRate: number
  averageLifespan: number
  speciesDiversity: number
  tick: number
  averageSize: number
  averageVisionRange: number
  averageVisionHalfAngle: number
  averageMaxSpeed: number
  averageMetabolism: number
  totalBirths: number
  totalDeaths: number
}

export const DEFAULT_CONFIG: SimulationConfig = {
  populationSize: 20,
  herbivorePop: 20,
  carnivorePop: 0,
  mutationRate: 0.05,
  mutationStrength: 0.3,
  selectionPressure: 0.7,
  generationLength: 600,
  foodDensity: 120,
  poisonDensity: 25,
  worldWidth: 1200,
  worldHeight: 800,
  initialEnergy: 70,
  visionRange: 120,
  maxSpeed: 2.5,
  noiseStrength: 0.15,
  foodDistribution: "uniform",
  obstacleCount: 0,
  eliteCount: 2,
  sprintCostMultiplier: 1.45,
  digestSlowdown: 0.5,
  minFoodToReproduce: 3,
  reproductionCooldownTicks: 250,
  ecosystemMode: true,
  vegetationGrowthRate: 200,
  vegetationSpreadRadius: 80,
  fertilityDriftRate: 0.3,
}

let nextResourceId = 1
let nextObstacleId = 1
let nextKillEventId = 1

interface ClusterCenter {
  x: number
  y: number
}

interface FertilityPatch {
  x: number
  y: number
  vx: number
  vy: number
}

const FERTILITY_CELL_SIZE = 40
const FERTILITY_PATCH_COUNT = 6
const FERTILITY_DECAY = 0.999
const FERTILITY_DIFFUSION_INTERVAL = 30
const FERTILITY_PATCH_RADIUS = 120
const FERTILITY_PATCH_STRENGTH = 0.012
const FERTILITY_BOOST_FROM_EATING = 0.1
const FERTILITY_MIN_SEED_CHANCE = 0.2
const MIN_KILLS_TO_REPRODUCE = 3
const POPULATION_SAFETY_CAP = 300
const MEAT_LIFESPAN_TICKS = 500
const MIN_MEAT_PELLETS = 3
const MAX_MEAT_PELLETS = 14
const MEAT_SCATTER_RADIUS = 22

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export class World {
  config: SimulationConfig
  herbivores: Creature[] = []
  carnivores: Creature[] = []
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
  private fertilityGrid = new Float32Array()
  private fertilityCols = 0
  private fertilityRows = 0
  private fertilityPatches: FertilityPatch[] = []
  private fertilityBoosts: ClusterCenter[] = []
  private totalBirths = 0
  private totalDeaths = 0
  private totalDeathAge = 0
  private initialPopulation = 0
  private killEvents: KillEventSnapshot[] = []

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.syncPopulationConfig()
    this.reset()
  }

  get creatures(): Creature[] {
    return [...this.herbivores, ...this.carnivores]
  }

  reset(): void {
    resetCreatureIds()
    nextResourceId = 1
    nextObstacleId = 1
    nextKillEventId = 1
    this.generation = 0
    this.tick = 0
    this.lastSurvivalRate = 0
    this.lastAverageLifespan = 0
    this.lastWorldWidth = this.config.worldWidth
    this.lastWorldHeight = this.config.worldHeight
    this.totalBirths = 0
    this.totalDeaths = 0
    this.totalDeathAge = 0
    this.initialPopulation = 0
    this.killEvents = []
    this.initializeFertility()
    this.foodClusterCenters = this.generateClusterCenters()
    this.spawnPopulations()
    this.initialPopulation = this.creatures.length
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
    this.syncPopulationConfig()
  }

  syncPreview(): void {
    this.syncPreviewBounds()
    this.syncPreviewResources()
    this.syncPreviewObstacles()
    this.syncPreviewPopulation()
    this.refreshPreviewInputs()
  }

  private syncPopulationConfig(): void {
    if (this.config.carnivorePop <= 0) {
      this.config.herbivorePop = this.config.populationSize
      this.config.carnivorePop = 0
    } else {
      this.config.populationSize =
        this.config.herbivorePop + this.config.carnivorePop
    }
  }

  private spawnPopulations(): void {
    this.herbivores = spawnInitialPopulation(
      this.config.herbivorePop,
      this.config.initialEnergy,
      this.config.worldWidth,
      this.config.worldHeight,
      this.herbivoreTraitDefaults(),
      "herbivore",
    )
    this.carnivores =
      this.config.carnivorePop > 0
        ? spawnInitialPopulation(
            this.config.carnivorePop,
            this.config.initialEnergy,
            this.config.worldWidth,
            this.config.worldHeight,
            this.carnivoreTraitDefaults(),
            "carnivore",
          )
        : []
  }

  private herbivoreTraitDefaults(): Partial<CreatureTraits> {
    return {
      ...HERBIVORE_TRAITS,
      visionRange: Math.min(this.config.visionRange * 0.75, 180),
      maxSpeed: this.config.maxSpeed,
    }
  }

  private carnivoreTraitDefaults(): Partial<CreatureTraits> {
    return {
      ...CARNIVORE_TRAITS,
      visionRange: Math.min(this.config.visionRange * 1.5, 300),
      maxSpeed: Math.min(this.config.maxSpeed * 1.2, 5),
    }
  }

  private traitCaps(species: "herbivore" | "carnivore"): TraitCaps {
    if (species === "carnivore") {
      return {
        visionRange: Math.min(this.config.visionRange * 1.5, 300),
        maxSpeed: Math.min(this.config.maxSpeed * 1.2, 5),
        noiseStrength: this.config.noiseStrength,
      }
    }

    return {
      visionRange: Math.min(this.config.visionRange * 0.85, 220),
      maxSpeed: this.config.maxSpeed,
      noiseStrength: this.config.noiseStrength,
    }
  }

  private fertilityPatchMargin(): number {
    const halfShortestSide = Math.min(
      this.config.worldWidth,
      this.config.worldHeight,
    ) / 2
    return Math.max(
      0,
      Math.min(FERTILITY_PATCH_RADIUS * 0.6, halfShortestSide - FERTILITY_CELL_SIZE),
    )
  }

  private randomFertilityPatchPosition(): ClusterCenter {
    const margin = this.fertilityPatchMargin()
    const width = Math.max(0, this.config.worldWidth - margin * 2)
    const height = Math.max(0, this.config.worldHeight - margin * 2)

    return {
      x: margin + Math.random() * width,
      y: margin + Math.random() * height,
    }
  }

  private initializeFertility(): void {
    this.fertilityCols = Math.max(
      1,
      Math.ceil(this.config.worldWidth / FERTILITY_CELL_SIZE),
    )
    this.fertilityRows = Math.max(
      1,
      Math.ceil(this.config.worldHeight / FERTILITY_CELL_SIZE),
    )
    this.fertilityGrid = new Float32Array(this.fertilityCols * this.fertilityRows)
    this.fertilityPatches = []
    this.fertilityBoosts = []

    for (let i = 0; i < this.fertilityGrid.length; i++) {
      this.fertilityGrid[i] = 0.12 + Math.random() * 0.18
    }

    for (let i = 0; i < FERTILITY_PATCH_COUNT; i++) {
      const position = this.randomFertilityPatchPosition()
      this.fertilityPatches.push({
        x: position.x,
        y: position.y,
        vx: Math.random() * 2 - 1,
        vy: Math.random() * 2 - 1,
      })
    }

    for (const patch of this.fertilityPatches) {
      this.applyFertilityBump(patch.x, patch.y, 0.18, FERTILITY_PATCH_RADIUS)
    }
  }

  private fertilityIndex(col: number, row: number): number {
    return row * this.fertilityCols + col
  }

  private fertilityCellAt(x: number, y: number): { col: number; row: number } {
    return {
      col: Math.max(
        0,
        Math.min(this.fertilityCols - 1, Math.floor(x / FERTILITY_CELL_SIZE)),
      ),
      row: Math.max(
        0,
        Math.min(this.fertilityRows - 1, Math.floor(y / FERTILITY_CELL_SIZE)),
      ),
    }
  }

  private fertilityAt(x: number, y: number): number {
    if (this.fertilityGrid.length === 0) return 0
    const { col, row } = this.fertilityCellAt(x, y)
    return this.fertilityGrid[this.fertilityIndex(col, row)] ?? 0
  }

  private applyFertilityBump(
    x: number,
    y: number,
    strength: number,
    radius = FERTILITY_CELL_SIZE,
  ): void {
    if (this.fertilityGrid.length === 0) return

    const minCol = Math.max(0, Math.floor((x - radius) / FERTILITY_CELL_SIZE))
    const maxCol = Math.min(
      this.fertilityCols - 1,
      Math.ceil((x + radius) / FERTILITY_CELL_SIZE),
    )
    const minRow = Math.max(0, Math.floor((y - radius) / FERTILITY_CELL_SIZE))
    const maxRow = Math.min(
      this.fertilityRows - 1,
      Math.ceil((y + radius) / FERTILITY_CELL_SIZE),
    )

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellX = col * FERTILITY_CELL_SIZE + FERTILITY_CELL_SIZE / 2
        const cellY = row * FERTILITY_CELL_SIZE + FERTILITY_CELL_SIZE / 2
        const dist = distance(x, y, cellX, cellY)
        if (dist > radius) continue

        const falloff = 1 - dist / radius
        const index = this.fertilityIndex(col, row)
        this.fertilityGrid[index] = Math.min(
          1,
          (this.fertilityGrid[index] ?? 0) + strength * falloff,
        )
      }
    }
  }

  private recordFertilityBoost(x: number, y: number): void {
    if (!this.config.ecosystemMode) return
    this.fertilityBoosts.push({ x, y })
  }

  private edibleResources(): ResourceSnapshot[] {
    if (!this.config.ecosystemMode) return this.resources

    return this.resources.filter(
      (resource) =>
        resource.type !== "food" ||
        (resource.age ?? this.config.vegetationGrowthRate) >=
          this.config.vegetationGrowthRate,
    )
  }

  private refreshPreviewInputs(): void {
    if (this.running) return

    const herbivoreCaps = this.traitCaps("herbivore")
    const carnivoreCaps = this.traitCaps("carnivore")
    const resources = this.edibleResources()
    const herbivoreThreats = this.carnivores.map((c) => c.toSenseSnapshot())
    const carnivoreThreats = this.herbivores.map((c) => c.toSenseSnapshot())
    const lockedPreyIds = new Set(
      this.carnivores
        .map((c) => c.lockedTargetId)
        .filter((id): id is number => id !== null),
    )

    for (const creature of this.herbivores) {
      creature.think(
        this.config.worldWidth,
        this.config.worldHeight,
        resources,
        this.obstacles,
        herbivoreCaps,
        herbivoreThreats,
        { targetedByPredator: lockedPreyIds.has(creature.id) },
      )
    }

    for (const creature of this.carnivores) {
      creature.think(
        this.config.worldWidth,
        this.config.worldHeight,
        resources,
        this.obstacles,
        carnivoreCaps,
        carnivoreThreats,
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

      this.initializeFertility()
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

    const food = this.resources.filter((r) => r.type === "food")
    const poison = this.resources.filter((r) => r.type === "poison")

    if (this.config.ecosystemMode) {
      for (const resource of food) {
        resource.age ??= this.config.vegetationGrowthRate
      }
    }

    while (food.length > this.config.foodDensity) {
      food.pop()
    }
    while (food.length < this.config.foodDensity) {
      food.push(
        this.createResource(
          "food",
          this.config.ecosystemMode ? this.config.vegetationGrowthRate : undefined,
        ),
      )
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
    this.syncPopulationConfig()
    this.syncSpeciesPopulation(
      this.herbivores,
      this.config.herbivorePop,
      this.herbivoreTraitDefaults(),
      "herbivore",
    )
    this.syncSpeciesPopulation(
      this.carnivores,
      this.config.carnivorePop,
      this.carnivoreTraitDefaults(),
      "carnivore",
    )
  }

  private syncSpeciesPopulation(
    pool: Creature[],
    target: number,
    traitDefaults: Partial<CreatureTraits>,
    species: "herbivore" | "carnivore",
  ): void {
    while (pool.length > target) {
      pool.pop()
    }

    while (pool.length < target) {
      pool.push(
        new Creature(
          Math.random() * this.config.worldWidth,
          Math.random() * this.config.worldHeight,
          undefined,
          0,
          this.config.initialEnergy,
          traitDefaults,
          species,
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
    if (!this.config.ecosystemMode && this.tick >= this.config.generationLength) {
      this.runEvolution()
      this.justEvolved = true
    }

    this.updateCreatures()
    this.updateMeat()
    if (this.config.ecosystemMode) {
      this.updateFertility()
      this.updateVegetation()
    } else {
      this.replenishResources()
    }
    return this.getStats()
  }

  getCreatureById(id: number): Creature | undefined {
    return this.creatures.find((c) => c.id === id)
  }

  drainKillEvents(): KillEventSnapshot[] {
    const events = this.killEvents
    this.killEvents = []
    return events
  }

  getFertilitySnapshot(): FertilityCellSnapshot[] {
    if (!this.config.ecosystemMode || this.fertilityGrid.length === 0) return []

    const cells: FertilityCellSnapshot[] = []
    for (let row = 0; row < this.fertilityRows; row++) {
      for (let col = 0; col < this.fertilityCols; col++) {
        const value = this.fertilityGrid[this.fertilityIndex(col, row)] ?? 0
        if (value <= 0.05) continue
        cells.push({
          x: col * FERTILITY_CELL_SIZE,
          y: row * FERTILITY_CELL_SIZE,
          size: FERTILITY_CELL_SIZE,
          value,
        })
      }
    }
    return cells
  }

  private updateCreatures(): void {
    const herbivoreCaps = this.traitCaps("herbivore")
    const carnivoreCaps = this.traitCaps("carnivore")
    const resources = this.edibleResources()
    const herbivoreThreats = this.carnivores.map((c) => c.toSenseSnapshot())
    const carnivoreThreats = this.herbivores.map((c) => c.toSenseSnapshot())
    const lockedPreyIds = new Set(
      this.carnivores
        .map((c) => c.lockedTargetId)
        .filter((id): id is number => id !== null),
    )

    for (const creature of this.herbivores) {
      if (!creature.alive) continue
      this.updateCreature(creature, herbivoreCaps, herbivoreThreats, resources, {
        targetedByPredator: lockedPreyIds.has(creature.id),
      })
    }

    for (const creature of this.carnivores) {
      if (!creature.alive) continue
      this.updateCreature(creature, carnivoreCaps, carnivoreThreats, resources)
    }

    this.processPredation()
    this.resolveSpeciesSeparation()

    this.herbivores = this.removeDeadCreatures(this.herbivores)
    this.carnivores = this.removeDeadCreatures(this.carnivores)

    if (
      this.creatures.length === 0 &&
      !this.justEvolved &&
      !this.config.ecosystemMode
    ) {
      this.runEvolution()
    }
  }

  private removeDeadCreatures(creatures: Creature[]): Creature[] {
    const alive: Creature[] = []
    for (const creature of creatures) {
      if (creature.alive) {
        alive.push(creature)
        continue
      }

      this.totalDeaths += 1
      this.totalDeathAge += creature.age
      if (
        creature.species === "herbivore" &&
        creature.energy <= 0 &&
        !creature.meatDropped
      ) {
        this.spawnMeatFromCreature(creature, {
          showKillEvent: false,
          energyRatio: 0.35,
        })
      }
    }
    return alive
  }

  private updateCreature(
    creature: Creature,
    caps: TraitCaps,
    threats: CreatureSenseSnapshot[],
    resources: ResourceSnapshot[],
    thinkOptions: ThinkOptions = {},
  ): void {
    creature.syncRestingState()

    if (creature.isResting) {
      creature.processResting(1, this.config.digestSlowdown)
      creature.tryPoison(this.resources)
      return
    }

    creature.think(
      this.config.worldWidth,
      this.config.worldHeight,
      resources,
      this.obstacles,
      caps,
      threats,
      thinkOptions,
    )
    creature.act(1, {
      sprintCostMultiplier: this.config.sprintCostMultiplier,
    })

    const eaten = creature.tryEat(this.resources, {
      minFoodAge: this.config.ecosystemMode
        ? this.config.vegetationGrowthRate
        : undefined,
    })
    if (eaten?.type === "food") {
      this.recordFertilityBoost(eaten.x, eaten.y)
    }

    if (creature.species === "herbivore") {
      const child = creature.tryReproduce(
        {
          mutationRate: this.config.mutationRate,
          mutationStrength: this.config.mutationStrength,
          minFoodToReproduce: this.config.minFoodToReproduce,
          reproductionCooldownTicks: this.config.reproductionCooldownTicks,
          maxPopulation: POPULATION_SAFETY_CAP,
          currentPopulation: this.herbivores.length,
          worldWidth: this.config.worldWidth,
          worldHeight: this.config.worldHeight,
        },
        this.herbivoreTraitDefaults(),
      )
      if (child) {
        this.herbivores.push(child)
        this.totalBirths += 1
      }
    } else if (creature.species === "carnivore") {
      const child = creature.tryReproduce(
        {
          mutationRate: this.config.mutationRate,
          mutationStrength: this.config.mutationStrength,
          minFoodToReproduce: this.config.minFoodToReproduce,
          minKillsToReproduce: MIN_KILLS_TO_REPRODUCE,
          reproductionCooldownTicks: this.config.reproductionCooldownTicks,
          maxPopulation: POPULATION_SAFETY_CAP,
          currentPopulation: this.carnivores.length,
          worldWidth: this.config.worldWidth,
          worldHeight: this.config.worldHeight,
        },
        this.carnivoreTraitDefaults(),
      )
      if (child) {
        this.carnivores.push(child)
        this.totalBirths += 1
      }
    }

    creature.tryPoison(this.resources)
    creature.resolveObstacleCollisions(this.obstacles)
    creature.clampToWorld(this.config.worldWidth, this.config.worldHeight)
  }

  private processPredation(): void {
    for (const carnivore of this.carnivores) {
      if (!carnivore.alive || carnivore.isResting) continue
      const prey = carnivore.tryAttack(this.herbivores)
      if (prey && !prey.alive) {
        this.spawnMeatFromCreature(prey, {
          showKillEvent: true,
          energyRatio: 0.55,
        })
      }
    }
  }

  private spawnMeatFromCreature(
    creature: Creature,
    options: { showKillEvent: boolean; energyRatio: number },
  ): void {
    if (creature.meatDropped) return
    creature.meatDropped = true

    const pelletCount = clamp(
      Math.round(creature.traits.size / 1.2),
      MIN_MEAT_PELLETS,
      MAX_MEAT_PELLETS,
    )
    const totalEnergy = Math.max(18, creature.maxEnergy * options.energyRatio)
    const pelletEnergy = totalEnergy / pelletCount

    if (options.showKillEvent) {
      this.killEvents.push({
        id: nextKillEventId++,
        x: creature.x,
        y: creature.y,
        size: creature.traits.size,
      })
    }

    for (let i = 0; i < pelletCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * MEAT_SCATTER_RADIUS
      const x = clamp(
        creature.x + Math.cos(angle) * radius,
        4,
        this.config.worldWidth - 4,
      )
      const y = clamp(
        creature.y + Math.sin(angle) * radius,
        4,
        this.config.worldHeight - 4,
      )

      this.resources.push(
        this.createResource("meat", 0, {
          x,
          y,
          energy: pelletEnergy,
        }),
      )
    }
  }

  private clampPositionOnly(
    creature: Creature,
    width: number,
    height: number,
  ): void {
    const margin = creature.traits.size
    creature.x = Math.max(margin, Math.min(width - margin, creature.x))
    creature.y = Math.max(margin, Math.min(height - margin, creature.y))
  }

  private resolveSpeciesSeparation(): void {
    for (const herbivore of this.herbivores) {
      if (!herbivore.alive) continue

      for (const carnivore of this.carnivores) {
        if (!carnivore.alive) continue

        const dist = distance(herbivore.x, herbivore.y, carnivore.x, carnivore.y)
        const minDist = herbivore.traits.size + carnivore.traits.size
        if (dist >= minDist || dist === 0) continue

        const nx = (herbivore.x - carnivore.x) / dist
        const ny = (herbivore.y - carnivore.y) / dist
        const overlap = minDist - dist
        const push = overlap / 2

        herbivore.x += nx * push
        herbivore.y += ny * push
        carnivore.x -= nx * push
        carnivore.y -= ny * push

        this.clampPositionOnly(
          herbivore,
          this.config.worldWidth,
          this.config.worldHeight,
        )
        this.clampPositionOnly(
          carnivore,
          this.config.worldWidth,
          this.config.worldHeight,
        )
      }
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

    const evolutionConfig = {
      mutationRate: this.config.mutationRate,
      mutationStrength: this.config.mutationStrength,
      initialEnergy: this.config.initialEnergy,
      selectionPressure: this.config.selectionPressure,
      eliteCount: this.config.eliteCount,
    }

    this.herbivores = evolveGeneration(
      this.herbivores,
      {
        ...evolutionConfig,
        populationSize: this.config.herbivorePop,
      },
      this.config.worldWidth,
      this.config.worldHeight,
      this.herbivoreTraitDefaults(),
      "herbivore",
    )

    if (this.config.carnivorePop > 0) {
      this.carnivores = evolveGeneration(
        this.carnivores,
        {
          ...evolutionConfig,
          populationSize: this.config.carnivorePop,
        },
        this.config.worldWidth,
        this.config.worldHeight,
        this.carnivoreTraitDefaults(),
        "carnivore",
      )
    } else {
      this.carnivores = []
    }

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

  private updateMeat(): void {
    for (const resource of this.resources) {
      if (resource.type !== "meat") continue
      resource.age = (resource.age ?? 0) + 1
    }

    this.resources = this.resources.filter(
      (resource) =>
        resource.type !== "meat" ||
        (resource.age ?? 0) <= MEAT_LIFESPAN_TICKS,
    )
  }

  private updateFertility(): void {
    if (this.fertilityGrid.length === 0) {
      this.initializeFertility()
    }

    for (let i = 0; i < this.fertilityGrid.length; i++) {
      this.fertilityGrid[i] = (this.fertilityGrid[i] ?? 0) * FERTILITY_DECAY
    }

    for (const boost of this.fertilityBoosts) {
      this.applyFertilityBump(
        boost.x,
        boost.y,
        FERTILITY_BOOST_FROM_EATING,
        FERTILITY_CELL_SIZE * 1.5,
      )
    }
    this.fertilityBoosts = []

    for (const patch of this.fertilityPatches) {
      const drift = this.config.fertilityDriftRate
      const margin = this.fertilityPatchMargin()
      const minX = margin
      const maxX = this.config.worldWidth - margin
      const minY = margin
      const maxY = this.config.worldHeight - margin

      patch.vx = patch.vx * 0.94 + (Math.random() * 2 - 1) * 0.06
      patch.vy = patch.vy * 0.94 + (Math.random() * 2 - 1) * 0.06

      if (margin > 0) {
        if (patch.x < minX) patch.vx += ((minX - patch.x) / margin) * 0.18
        if (patch.x > maxX) patch.vx -= ((patch.x - maxX) / margin) * 0.18
        if (patch.y < minY) patch.vy += ((minY - patch.y) / margin) * 0.18
        if (patch.y > maxY) patch.vy -= ((patch.y - maxY) / margin) * 0.18
      }

      patch.x += patch.vx * drift
      patch.y += patch.vy * drift

      if (patch.x < minX || patch.x > maxX) {
        patch.vx *= 0.35
      }
      if (patch.y < minY || patch.y > maxY) {
        patch.vy *= 0.35
      }

      patch.x = clamp(patch.x, minX, maxX)
      patch.y = clamp(patch.y, minY, maxY)
      this.applyFertilityBump(
        patch.x,
        patch.y,
        FERTILITY_PATCH_STRENGTH,
        FERTILITY_PATCH_RADIUS,
      )
    }

    if (this.tick % FERTILITY_DIFFUSION_INTERVAL === 0) {
      this.diffuseFertility()
    }
  }

  private diffuseFertility(): void {
    const next = new Float32Array(this.fertilityGrid.length)

    for (let row = 0; row < this.fertilityRows; row++) {
      for (let col = 0; col < this.fertilityCols; col++) {
        let total = 0
        let count = 0

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = col + dx
            const ny = row + dy
            if (
              nx < 0 ||
              ny < 0 ||
              nx >= this.fertilityCols ||
              ny >= this.fertilityRows
            ) {
              continue
            }
            total += this.fertilityGrid[this.fertilityIndex(nx, ny)] ?? 0
            count += 1
          }
        }

        next[this.fertilityIndex(col, row)] = count > 0 ? total / count : 0
      }
    }

    this.fertilityGrid = next
  }

  private updateVegetation(): void {
    const food = this.resources.filter((r) => r.type === "food")
    const matureFood = food.filter(
      (r) => (r.age ?? this.config.vegetationGrowthRate) >= this.config.vegetationGrowthRate,
    )
    const targetFood = this.config.foodDensity
    const foodCap = Math.ceil(targetFood * 1.5)

    for (const resource of food) {
      resource.age = (resource.age ?? 0) + 1
    }

    if (food.length < targetFood) {
      while (food.length < targetFood) {
        const seed = this.createResource("food", 0)
        this.resources.push(seed)
        food.push(seed)
      }
    }

    for (const parent of matureFood) {
      if (food.length >= foodCap) break

      const fertility = this.fertilityAt(parent.x, parent.y)
      const spreadChance = 0.004 + fertility * 0.018
      if (Math.random() > spreadChance) continue

      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * this.config.vegetationSpreadRadius
      const seedX = Math.max(
        4,
        Math.min(this.config.worldWidth - 4, parent.x + Math.cos(angle) * radius),
      )
      const seedY = Math.max(
        4,
        Math.min(this.config.worldHeight - 4, parent.y + Math.sin(angle) * radius),
      )
      const seedChance =
        FERTILITY_MIN_SEED_CHANCE + this.fertilityAt(seedX, seedY) * 0.8
      if (Math.random() > seedChance) continue

      const seed = this.createResource("food", 0, { x: seedX, y: seedY })
      this.resources.push(seed)
      food.push(seed)
    }

    if (food.length > foodCap) {
      const removeIds = new Set(
        [...food]
          .sort(
            (a, b) =>
              (this.fertilityAt(a.x, a.y) - this.fertilityAt(b.x, b.y)) ||
              ((b.age ?? 0) - (a.age ?? 0)),
          )
          .slice(0, food.length - foodCap)
          .map((r) => r.id),
      )
      this.resources = this.resources.filter((r) => !removeIds.has(r.id))
    }

    let poisonCount = this.resources.filter((r) => r.type === "poison").length
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

  private createResource(
    type: ResourceType,
    age?: number,
    position: { x: number; y: number; energy?: number } =
      this.randomResourcePosition(type === "meat" ? "food" : type),
  ): ResourceSnapshot {
    const resource: ResourceSnapshot = {
      id: nextResourceId++,
      x: position.x,
      y: position.y,
      type,
    }

    if (position.energy !== undefined) {
      resource.energy = position.energy
    }

    if (type === "food" && this.config.ecosystemMode) {
      resource.age = age ?? this.config.vegetationGrowthRate
    } else if (type === "meat") {
      resource.age = age ?? 0
    }

    return resource
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
    const killCounts = this.carnivores.map((c) => c.killCount)
    const bestFitness = fitnesses.length > 0 ? Math.max(...fitnesses) : 0
    const averageFitness =
      fitnesses.length > 0
        ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
        : 0
    const averageFoodEaten =
      foodEaten.length > 0
        ? foodEaten.reduce((a, b) => a + b, 0) / foodEaten.length
        : 0
    const averageKillCount =
      killCounts.length > 0
        ? killCounts.reduce((a, b) => a + b, 0) / killCounts.length
        : 0

    const avg = (values: number[]) =>
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

    const hashes = new Set(this.creatures.map((c) => c.dnaHash))
    const ecosystemSurvivalBase = this.initialPopulation + this.totalBirths
    const survivalRate = this.config.ecosystemMode
      ? ecosystemSurvivalBase > 0
        ? this.creatures.length / ecosystemSurvivalBase
        : 0
      : this.lastSurvivalRate
    const averageLifespan = this.config.ecosystemMode
      ? this.totalDeaths > 0
        ? this.totalDeathAge / this.totalDeaths
        : avg(this.creatures.map((c) => c.age))
      : this.lastAverageLifespan

    return {
      generation: this.generation,
      population: this.creatures.length,
      herbivorePopulation: this.herbivores.length,
      carnivorePopulation: this.carnivores.length,
      bestFitness,
      averageFitness,
      averageFoodEaten,
      averageKillCount,
      survivalRate,
      averageLifespan,
      speciesDiversity: hashes.size,
      tick: this.tick,
      averageSize: avg(this.creatures.map((c) => c.traits.size)),
      averageVisionRange: avg(this.creatures.map((c) => c.traits.visionRange)),
      averageVisionHalfAngle: avg(
        this.creatures.map((c) => c.traits.visionHalfAngle),
      ),
      averageMaxSpeed: avg(this.creatures.map((c) => c.traits.maxSpeed)),
      averageMetabolism: avg(this.creatures.map((c) => c.traits.metabolism)),
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
    }
  }
}
