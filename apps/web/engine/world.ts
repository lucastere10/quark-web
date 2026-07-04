import { distance } from "./collision"
import {
  Creature,
  resetCreatureIds,
  type CreatureSenseSnapshot,
  type ResourceSnapshot,
  type ResourceType,
  type ThinkOptions,
  type TraitCaps,
} from "./creature"
import { CARNIVORE_TRAITS, HERBIVORE_TRAITS, type CreatureTraits } from "./genetics"
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
  eliteCount: number
  sprintCostMultiplier: number
  digestSlowdown: number
  minFoodToReproduce: number
  reproductionCooldownTicks: number
  ecosystemMode: boolean
  vegetationGrowthRate: number
  vegetationSpreadRadius: number
  fertilityDriftRate: number
  predationMaxPreySizeRatio: number
  climateVolatility: number
  rainBias: number
}

export type ClimateTrend = "stable" | "rain" | "drought" | "heat" | "cold"

export interface ClimateState {
  humidity: number
  temperature: number
  rainfall: number
  drought: number
  trend: ClimateTrend
  growthModifier: number
  metabolismModifier: number
  visionModifier: number
  scentModifier: number
  decayModifier: number
}

export interface SimulationEvent {
  id: number
  type:
    | "climate-shift"
    | "new-family"
    | "population-risk"
  title: string
  message: string
  tick: number
}

export interface SpeciesFamilyStats {
  id: string
  label: string
  color: string
  population: number
  dietClass: "herbivore" | "omnivore" | "carnivore"
  perception: number
  biomechanics: number
  metabolism: number
}

export interface WorldStats {
  generation: number
  population: number
  herbivorePopulation: number
  omnivorePopulation: number
  carnivorePopulation: number
  bestFitness: number
  averageFitness: number
  averageFoodEaten: number
  averageMeatEaten: number
  averageCarrionEaten: number
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
  averagePerceptionScore: number
  averageBiomechanicsScore: number
  averageMetabolismScore: number
  averagePredationDrive: number
  averageCarrionDigestEfficiency: number
  averageToxinResistance: number
  potentialHunterPopulation: number
  meatCapablePopulation: number
  failedAttackEvents: number
  carrionResources: number
  totalBirths: number
  totalDeaths: number
  climate: ClimateState
  speciesFamilies: SpeciesFamilyStats[]
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
  poisonDensity: 3,
  worldWidth: 1200,
  worldHeight: 800,
  initialEnergy: 70,
  visionRange: 120,
  maxSpeed: 2.5,
  noiseStrength: 0.15,
  foodDistribution: "uniform",
  eliteCount: 2,
  sprintCostMultiplier: 1.45,
  digestSlowdown: 0.5,
  minFoodToReproduce: 3,
  reproductionCooldownTicks: 250,
  ecosystemMode: true,
  vegetationGrowthRate: 200,
  vegetationSpreadRadius: 80,
  fertilityDriftRate: 0.3,
  predationMaxPreySizeRatio: 0.62,
  climateVolatility: 0.45,
  rainBias: 0,
}

let nextResourceId = 1
let nextKillEventId = 1
let nextSimulationEventId = 1

interface ClusterCenter {
  x: number
  y: number
}

interface FertilityPatch {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  strength: number
  age: number
  stability: number
}

interface FamilyPhenotypeProfile {
  dietClass: Creature["species"]
  perception: number
  biomechanics: number
  metabolism: number
  size: number
  predationDrive: number
  plantDigestEfficiency: number
  meatDigestEfficiency: number
  carrionDigestEfficiency: number
  meatEaten: number
  carrionEaten: number
  killCount: number
}

const FERTILITY_CELL_SIZE = 40
const FERTILITY_PATCH_COUNT = 6
const FERTILITY_PATCH_MIN_COUNT = 4
const FERTILITY_PATCH_MAX_COUNT = 10
const FERTILITY_DECAY = 0.999
const FERTILITY_DIFFUSION_INTERVAL = 30
const FERTILITY_PATCH_RADIUS = 120
const FERTILITY_PATCH_STRENGTH = 0.012
const FERTILITY_BOOST_FROM_EATING = 0.1
const FERTILITY_MIN_SEED_CHANCE = 0.2
const FAMILY_PROFILE_MIN_MEMBERS = 8
const SPECIATION_DISTANCE_THRESHOLD = 36
const DIET_SPECIATION_DISTANCE_THRESHOLD = 22
const EARLY_FAMILY_DISTANCE_THRESHOLD = 44
const EARLY_DIET_DISTANCE_THRESHOLD = 30
const MIN_PARENT_AGE_FOR_SPECIATION = 220
const MIN_PARENT_GENERATION_FOR_SPECIATION = 2
const MIN_KILLS_TO_REPRODUCE = 3
const POPULATION_SAFETY_CAP = 300
const MEAT_DECAY_TICKS = 1600
const CARRION_LIFESPAN_TICKS = 1200
const CARRION_ENERGY_RATIO = 0.55
const MIN_MEAT_PELLETS = 3
const MAX_MEAT_PELLETS = 14
const MEAT_SCATTER_RADIUS = 22
const PLANT_DECAY_TICKS = 2200
const PLANT_DECAY_CHANCE = 0.0018
const PLANT_CARRION_ENERGY = 12
const PLANT_MIN_SPACING = 24
const CLUSTER_RESOURCE_CHANCE = 0.42
const POISON_SPAWN_CHANCE = 0.015

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function createClimateState(
  humidity = 0.55,
  temperature = 0.5,
  rainfall = 0.25,
): ClimateState {
  const safeHumidity = clamp(humidity, 0, 1)
  const safeTemperature = clamp(temperature, 0, 1)
  const safeRainfall = clamp(rainfall, 0, 1)
  const drought = clamp(1 - safeHumidity * 0.72 - safeRainfall * 0.45, 0, 1)
  const trend: ClimateTrend =
    safeRainfall > 0.62
      ? "rain"
      : drought > 0.58
        ? "drought"
        : safeTemperature > 0.72
          ? "heat"
          : safeTemperature < 0.28
            ? "cold"
            : "stable"
  const growthModifier = clamp(
    0.65 + safeHumidity * 0.48 + safeRainfall * 0.34 - drought * 0.52,
    0.38,
    1.65,
  )
  const metabolismModifier = clamp(
    0.92 + drought * 0.2 + Math.abs(safeTemperature - 0.5) * 0.18 - safeRainfall * 0.06,
    0.85,
    1.25,
  )
  const visionModifier = clamp(1 - safeRainfall * 0.22 - drought * 0.05, 0.72, 1.04)
  const scentModifier = clamp(0.88 + safeHumidity * 0.25 - drought * 0.22, 0.65, 1.18)
  const decayModifier = clamp(
    0.75 + safeTemperature * 0.45 + safeHumidity * 0.22 + safeRainfall * 0.18,
    0.55,
    1.65,
  )

  return {
    humidity: safeHumidity,
    temperature: safeTemperature,
    rainfall: safeRainfall,
    drought,
    trend,
    growthModifier,
    metabolismModifier,
    visionModifier,
    scentModifier,
    decayModifier,
  }
}

export class World {
  config: SimulationConfig
  herbivores: Creature[] = []
  carnivores: Creature[] = []
  resources: ResourceSnapshot[] = []
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
  private events: SimulationEvent[] = []
  private lastEventTicks = new Map<SimulationEvent["type"], number>()
  private nextFamilyIndex = 1
  private familyColors = new Map<string, string>()
  private climate = createClimateState()
  private climatePhase = Math.random() * Math.PI * 2
  private climateShock = 0
  private climateShockTicks = 0

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
    this.events = []
    this.lastEventTicks = new Map()
    this.nextFamilyIndex = 1
    this.familyColors = new Map()
    this.climatePhase = Math.random() * Math.PI * 2
    this.climateShock = 0
    this.climateShockTicks = 0
    this.climate = createClimateState(
      0.52 + this.config.rainBias * 0.18,
      0.5,
      0.25 + Math.max(0, this.config.rainBias) * 0.18,
    )
    this.initializeFertility()
    this.foodClusterCenters = this.generateClusterCenters()
    this.spawnPopulations()
    this.seedInitialFamilies()
    this.initialPopulation = this.creatures.length
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
    this.syncPopulationConfig()
  }

  syncPreview(): void {
    this.syncPreviewBounds()
    this.syncPreviewResources()
    this.syncPreviewPopulation()
    this.refreshPreviewInputs()
  }

  private syncPopulationConfig(): void {
    const carnivorePop = clamp(
      Math.round(this.config.carnivorePop),
      0,
      Math.max(0, this.config.populationSize - 1),
    )
    this.config.carnivorePop = carnivorePop
    this.config.herbivorePop = this.config.populationSize - carnivorePop
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
    this.carnivores = spawnInitialPopulation(
      this.config.carnivorePop,
      this.config.initialEnergy,
      this.config.worldWidth,
      this.config.worldHeight,
      this.carnivoreTraitDefaults(),
      "carnivore",
    )
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
      visionRange: Math.min(this.config.visionRange * 1.45, 300),
      maxSpeed: Math.min(this.config.maxSpeed * 1.15, 5),
    }
  }

  private seedInitialFamilies(): void {
    if (this.herbivores.length > 0) {
      const familyId = this.allocateFamilyId()
      for (const creature of this.herbivores) {
        creature.familyId = familyId
      }
    }

    if (this.carnivores.length > 0) {
      const familyId = this.allocateFamilyId()
      for (const creature of this.carnivores) {
        creature.familyId = familyId
      }
    }
  }

  private allocateFamilyId(): string {
    const id = `F${this.nextFamilyIndex++}`
    this.familyColors.set(id, this.familyColor(id))
    return id
  }

  private familyColor(familyId: string): string {
    const cached = this.familyColors.get(familyId)
    if (cached) return cached

    let hash = 0
    for (let i = 0; i < familyId.length; i++) {
      hash = (hash << 5) - hash + familyId.charCodeAt(i)
      hash |= 0
    }
    const palette = [
      "#22ff77",
      "#00e5cc",
      "#ff6633",
      "#ff9900",
      "#9933ff",
      "#a8ffcc",
      "#ff2244",
      "#4ecf7a",
    ]
    return palette[Math.abs(hash) % palette.length]!
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
        radius: FERTILITY_PATCH_RADIUS * (0.75 + Math.random() * 0.5),
        strength: FERTILITY_PATCH_STRENGTH * (0.8 + Math.random() * 0.5),
        age: 0,
        stability: 0.45 + Math.random() * 0.45,
      })
    }

    for (const patch of this.fertilityPatches) {
      this.applyFertilityBump(patch.x, patch.y, 0.18, patch.radius)
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

    const resources = this.edibleResources()
    const liveCreatures = this.creatures.filter((c) => c.alive)
    const predators = liveCreatures.filter((c) => c.canHunt)

    for (const creature of this.creatures) {
      const isHunter = creature.canHunt
      const caps = this.traitCaps(isHunter ? "carnivore" : "herbivore")
      const preySignals = isHunter
        ? liveCreatures
            .filter((prey) =>
              creature.canPreyOn(prey, this.config.predationMaxPreySizeRatio),
            )
            .map((c) => c.toSenseSnapshot())
        : []
      const predatorSignals = predators
        .filter((predator) =>
          predator.canPreyOn(creature, this.config.predationMaxPreySizeRatio),
        )
        .map((c) => c.toSenseSnapshot())
      creature.think(
        this.config.worldWidth,
        this.config.worldHeight,
        resources,
        caps,
        preySignals,
        predatorSignals,
        {
          visionModifier: this.climate.visionModifier,
          scentModifier: this.climate.scentModifier,
          localFertility: this.config.ecosystemMode
            ? this.fertilityAt(creature.x, creature.y)
            : 0.5,
          growthModifier: this.climate.growthModifier,
          minFoodAge: this.config.ecosystemMode
            ? this.config.vegetationGrowthRate
            : undefined,
        },
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
    if (poison.length < this.config.poisonDensity && Math.random() < 0.35) {
      poison.push(this.createResource("poison"))
    }

    this.resources = [...food, ...poison]
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
    if (this.creatures.some((creature) => !creature.familyId)) {
      this.seedInitialFamilies()
    }
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
      const familyId = pool[0]?.familyId ?? this.allocateFamilyId()
      pool.push(
        new Creature(
          Math.random() * this.config.worldWidth,
          Math.random() * this.config.worldHeight,
          undefined,
          0,
          this.config.initialEnergy,
          traitDefaults,
          species,
          familyId,
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

  step(): void {
    if (!this.running) {
      return
    }

    this.tick++
    this.updateClimate()

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
    this.checkPopulationRisk()
  }

  getCreatureById(id: number): Creature | undefined {
    return this.creatures.find((c) => c.id === id)
  }

  drainKillEvents(): KillEventSnapshot[] {
    const events = this.killEvents
    this.killEvents = []
    return events
  }

  drainEvents(): SimulationEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  private emitEvent(
    type: SimulationEvent["type"],
    title: string,
    message: string,
    cooldownTicks = 450,
  ): void {
    const lastTick = this.lastEventTicks.get(type) ?? -Infinity
    if (this.tick - lastTick < cooldownTicks) return
    this.lastEventTicks.set(type, this.tick)
    this.events.push({
      id: nextSimulationEventId++,
      type,
      title,
      message,
      tick: this.tick,
    })
  }

  private updateClimate(): void {
    const volatility = this.config.climateVolatility
    const driftSpeed = 0.0008 + volatility * 0.0018
    this.climatePhase += driftSpeed

    const rainWave = Math.sin(this.climatePhase)
    const tempWave = Math.sin(this.climatePhase * 0.61 + 1.7)
    const humidityWave = Math.sin(this.climatePhase * 0.83 + 0.6)
    const eventChance = 0.00005 * volatility
    if (this.climateShockTicks <= 0 && Math.random() < eventChance) {
      this.climateShock = (Math.random() * 2 - 1) * (0.28 + volatility * 0.24)
      this.climateShockTicks = 180 + Math.floor(Math.random() * 220)
      this.emitEvent(
        "climate-shift",
        this.climateShock > 0 ? "Rain front arrived" : "Dry front arrived",
        this.climateShock > 0
          ? "A short wet pulse is changing growth and visibility."
          : "A short dry pulse is stressing vegetation and metabolism.",
        650,
      )
    }

    const eventPulse =
      this.climateShockTicks > 0
        ? this.climateShock * (this.climateShockTicks / 400)
        : 0
    if (this.climateShockTicks > 0) {
      this.climateShockTicks -= 1
    }

    const targetRainfall = clamp(
      0.28 + rainWave * 0.16 + this.config.rainBias * 0.22 + eventPulse,
      0,
      1,
    )
    const targetTemperature = clamp(
      0.5 + tempWave * 0.16 - this.config.rainBias * 0.06 - targetRainfall * 0.06,
      0,
      1,
    )
    const targetHumidity = clamp(
      0.5 +
        humidityWave * 0.14 +
        targetRainfall * 0.26 +
        this.config.rainBias * 0.12 -
        targetTemperature * 0.08,
      0,
      1,
    )

    const smoothing = 0.005 + volatility * 0.01
    this.climate = createClimateState(
      this.climate.humidity + (targetHumidity - this.climate.humidity) * smoothing,
      this.climate.temperature +
        (targetTemperature - this.climate.temperature) * smoothing,
      this.climate.rainfall + (targetRainfall - this.climate.rainfall) * smoothing,
    )

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
    const resources = this.edibleResources()
    const liveCreatures = this.creatures.filter((c) => c.alive)
    const predators = liveCreatures.filter((c) => c.canHunt)

    for (const creature of this.creatures) {
      if (!creature.alive) continue
      const isHunter = creature.canHunt
      const caps = this.traitCaps(isHunter ? "carnivore" : "herbivore")
      const preySignals = isHunter
        ? liveCreatures
            .filter((prey) =>
              creature.canPreyOn(prey, this.config.predationMaxPreySizeRatio),
            )
            .map((c) => c.toSenseSnapshot())
        : []
      const predatorSignals = predators
        .filter((predator) =>
          predator.canPreyOn(creature, this.config.predationMaxPreySizeRatio),
        )
        .map((c) => c.toSenseSnapshot())
      this.updateCreature(creature, caps, preySignals, predatorSignals, resources)
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
      if (creature.energy <= 0 && !creature.meatDropped) {
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
    preySignals: CreatureSenseSnapshot[],
    predatorSignals: CreatureSenseSnapshot[],
    resources: ResourceSnapshot[],
    thinkOptions: ThinkOptions = {},
  ): void {
    creature.syncRestingState()

    if (creature.isResting) {
      creature.processResting(
        1,
        this.config.digestSlowdown,
        this.climate.metabolismModifier,
      )
      creature.tryPoison(this.resources)
      return
    }

    const minFoodAge = this.config.ecosystemMode
      ? Math.ceil(
          this.config.vegetationGrowthRate /
            clamp(
              this.climate.growthModifier + this.climate.rainfall * 0.18,
              0.5,
              1.75,
            ),
        )
      : undefined

    creature.think(
      this.config.worldWidth,
      this.config.worldHeight,
      resources,
      caps,
      preySignals,
      predatorSignals,
      {
        ...thinkOptions,
        visionModifier: this.climate.visionModifier,
        scentModifier: this.climate.scentModifier,
        localFertility: this.config.ecosystemMode
          ? this.fertilityAt(creature.x, creature.y)
          : 0.5,
        growthModifier: this.climate.growthModifier,
        minFoodAge,
      },
    )
    creature.act(1, {
      sprintCostMultiplier: this.config.sprintCostMultiplier,
      metabolismModifier: this.climate.metabolismModifier,
    })

    const eaten = creature.tryEat(this.resources, {
      minFoodAge,
    })
    if (eaten?.type === "food") {
      this.recordFertilityBoost(eaten.x, eaten.y)
    }

    const child = creature.tryReproduce(
      {
        mutationRate: this.config.mutationRate,
        mutationStrength: this.config.mutationStrength,
        minFoodToReproduce: this.config.minFoodToReproduce,
        minKillsToReproduce: MIN_KILLS_TO_REPRODUCE,
        reproductionCooldownTicks: this.config.reproductionCooldownTicks,
        maxPopulation: POPULATION_SAFETY_CAP,
        currentPopulation: this.creatures.length,
        worldWidth: this.config.worldWidth,
        worldHeight: this.config.worldHeight,
        mutationBias: {
          predationPressure: this.predationPressureFor(creature),
          carrionPressure: this.carrionPressure(),
        },
      },
      this.herbivoreTraitDefaults(),
    )
    if (child) {
      this.maybeSpeciate(child, creature)
      this.herbivores.push(child)
      this.totalBirths += 1
    }

    creature.tryPoison(this.resources)
    creature.clampToWorld(this.config.worldWidth, this.config.worldHeight)
  }

  private potentialPreyFor(predator: Creature): Creature[] {
    return this.creatures.filter((creature) =>
      predator.canPreyOn(creature, this.config.predationMaxPreySizeRatio),
    )
  }

  private predationPressureFor(creature: Creature): number {
    const liveCreatures = this.creatures.filter((candidate) => candidate.alive)
    if (liveCreatures.length === 0) return 0

    const preyPopulation = liveCreatures.filter(
      (candidate) => candidate.species === "herbivore" || candidate.species === "omnivore",
    ).length
    const predatorPopulation = liveCreatures.filter(
      (candidate) => candidate.species === "carnivore",
    ).length
    const preySurplus = clamp(
      (preyPopulation - predatorPopulation * 3) / Math.max(8, preyPopulation),
      0,
      1,
    )
    const abundance = clamp((preyPopulation - 10) / 34, 0, 1)
    const meatHistory = clamp((creature.meatEaten + creature.killCount * 2) / 6, 0, 1)
    const dietBridge =
      creature.species === "omnivore" || creature.canHunt || meatHistory > 0 ? 1 : 0.35

    return clamp(preySurplus * abundance * (0.35 + meatHistory * 0.65) * dietBridge, 0, 1)
  }

  private carrionPressure(): number {
    const carrionCount = this.resources.filter((resource) => resource.type === "carrion").length
    return clamp(carrionCount / Math.max(8, this.creatures.length * 0.35), 0, 1)
  }

  private maybeSpeciate(child: Creature, parent: Creature): void {
    if (
      parent.age < MIN_PARENT_AGE_FOR_SPECIATION &&
      parent.generation < MIN_PARENT_GENERATION_FOR_SPECIATION
    ) {
      return
    }

    const familyProfile = this.familyProfileFor(parent.familyId, child.id)
    const distance = familyProfile
      ? this.phenotypeDistanceToProfile(child, familyProfile)
      : this.phenotypeDistance(child, parent)
    const dietChanged = familyProfile
      ? child.species !== familyProfile.dietClass
      : child.species !== parent.species
    const distanceThreshold = familyProfile
      ? SPECIATION_DISTANCE_THRESHOLD
      : EARLY_FAMILY_DISTANCE_THRESHOLD
    const dietDistanceThreshold = familyProfile
      ? DIET_SPECIATION_DISTANCE_THRESHOLD
      : EARLY_DIET_DISTANCE_THRESHOLD

    if (distance > distanceThreshold || (dietChanged && distance > dietDistanceThreshold)) {
      child.familyId = this.allocateFamilyId()
      this.emitEvent(
        "new-family",
        "New family emerged",
        `${child.familyId} diverged into a ${child.species} niche.`,
        220,
      )
    }
  }

  private familyProfileFor(
    familyId: string,
    excludeCreatureId?: number,
  ): FamilyPhenotypeProfile | null {
    const members = this.creatures.filter(
      (creature) => creature.familyId === familyId && creature.id !== excludeCreatureId,
    )
    if (members.length < FAMILY_PROFILE_MIN_MEMBERS) return null

    const avg = (values: number[]) =>
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const dietCounts = {
      herbivore: members.filter((c) => c.species === "herbivore").length,
      omnivore: members.filter((c) => c.species === "omnivore").length,
      carnivore: members.filter((c) => c.species === "carnivore").length,
    }
    const dietClass = (Object.entries(dietCounts).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0] ?? "herbivore") as Creature["species"]

    return {
      dietClass,
      perception: avg(members.map((c) => c.traitAxes.perception)),
      biomechanics: avg(members.map((c) => c.traitAxes.biomechanics)),
      metabolism: avg(members.map((c) => c.traitAxes.metabolism)),
      size: avg(members.map((c) => c.traits.size)),
      predationDrive: avg(members.map((c) => c.traits.predationDrive)),
      plantDigestEfficiency: avg(members.map((c) => c.traits.plantDigestEfficiency)),
      meatDigestEfficiency: avg(members.map((c) => c.traits.meatDigestEfficiency)),
      carrionDigestEfficiency: avg(members.map((c) => c.traits.carrionDigestEfficiency)),
      meatEaten: avg(members.map((c) => c.meatEaten)),
      carrionEaten: avg(members.map((c) => c.carrionEaten)),
      killCount: avg(members.map((c) => c.killCount)),
    }
  }

  private phenotypeDistanceToProfile(
    creature: Creature,
    profile: FamilyPhenotypeProfile,
  ): number {
    const axes = creature.traitAxes
    return (
      Math.abs(axes.perception - profile.perception) * 0.3 +
      Math.abs(axes.biomechanics - profile.biomechanics) * 0.3 +
      Math.abs(axes.metabolism - profile.metabolism) * 0.25 +
      Math.abs(creature.traits.size - profile.size) * 4 +
      Math.abs(creature.traits.predationDrive - profile.predationDrive) * 42 +
      Math.abs(creature.traits.meatDigestEfficiency - profile.meatDigestEfficiency) * 10 +
      Math.abs(creature.traits.carrionDigestEfficiency - profile.carrionDigestEfficiency) * 8 +
      Math.abs(creature.traits.plantDigestEfficiency - profile.plantDigestEfficiency) * 6 +
      Math.abs(creature.meatEaten - profile.meatEaten) * 1.4 +
      Math.abs(creature.carrionEaten - profile.carrionEaten) * 1.2 +
      Math.abs(creature.killCount - profile.killCount) * 2.2
    )
  }

  private checkPopulationRisk(): void {
    if (this.tick < 120 || this.creatures.length === 0) return

    const livePopulation = this.creatures.filter((creature) => creature.alive).length
    const riskThreshold = Math.max(4, Math.ceil(this.config.populationSize * 0.18))
    if (livePopulation <= riskThreshold) {
      this.emitEvent(
        "population-risk",
        "Population risk",
        "The living population is close to collapse.",
        800,
      )
    }
  }

  private phenotypeDistance(a: Creature, b: Creature): number {
    const axesA = a.traitAxes
    const axesB = b.traitAxes
    const sizeDelta = Math.abs(a.traits.size - b.traits.size) * 4
    const dietDelta = Math.abs(a.traits.predationDrive - b.traits.predationDrive) * 35
    return (
      Math.abs(axesA.perception - axesB.perception) * 0.35 +
      Math.abs(axesA.biomechanics - axesB.biomechanics) * 0.35 +
      Math.abs(axesA.metabolism - axesB.metabolism) * 0.3 +
      sizeDelta +
      dietDelta
    )
  }

  private refreshFamilyDivergence(): void {
    const representatives = new Map<string, Creature>()
    for (const creature of this.creatures) {
      const representative = representatives.get(creature.familyId)
      if (!representative) {
        representatives.set(creature.familyId, creature)
        continue
      }
      this.maybeSpeciate(creature, representative)
    }
  }

  private processPredation(): void {
    for (const carnivore of this.creatures) {
      if (!carnivore.alive || !carnivore.canHunt || carnivore.isResting) continue
      const prey = carnivore.tryAttack(this.potentialPreyFor(carnivore), {
        maxPreySizeRatio: this.config.predationMaxPreySizeRatio,
      })
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
    const creatures = this.creatures
    for (let i = 0; i < creatures.length; i++) {
      const first = creatures[i]!
      if (!first.alive) continue

      for (let j = i + 1; j < creatures.length; j++) {
        const second = creatures[j]!
        if (!second.alive) continue

        const dist = distance(first.x, first.y, second.x, second.y)
        const minDist = first.traits.size + second.traits.size
        if (dist >= minDist || dist === 0) continue

        const nx = (first.x - second.x) / dist
        const ny = (first.y - second.y) / dist
        const overlap = minDist - dist
        const push = overlap / 2

        first.x += nx * push
        first.y += ny * push
        second.x -= nx * push
        second.y -= ny * push

        this.clampPositionOnly(
          first,
          this.config.worldWidth,
          this.config.worldHeight,
        )
        this.clampPositionOnly(
          second,
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
      this.creatures,
      {
        ...evolutionConfig,
        populationSize: this.config.populationSize,
      },
      this.config.worldWidth,
      this.config.worldHeight,
      this.herbivoreTraitDefaults(),
      "herbivore",
    )
    this.carnivores = []
    this.refreshFamilyDivergence()

    this.generation++
    this.tick = 0
  }

  private replenishResources(): void {
    let foodCount = this.resources.filter((r) => r.type === "food").length
    const poisonCount = this.resources.filter((r) => r.type === "poison").length

    while (foodCount < this.config.foodDensity) {
      this.resources.push(this.createResource("food"))
      foodCount++
    }
    if (poisonCount < this.config.poisonDensity && Math.random() < 0.25) {
      this.resources.push(this.createResource("poison"))
    }
  }

  private updateMeat(): void {
    const meatDecayTicks = Math.ceil(
      MEAT_DECAY_TICKS /
        clamp(
          this.climate.decayModifier +
            this.climate.temperature * 0.18 -
            (this.climate.trend === "cold" ? 0.18 : 0),
          0.55,
          1.9,
        ),
    )
    const carrionLifespanTicks = Math.ceil(
      CARRION_LIFESPAN_TICKS /
        clamp(
          0.76 +
            this.climate.drought * 0.46 +
            this.climate.temperature * 0.28 -
            (this.climate.trend === "cold" ? 0.22 : 0),
          0.58,
          1.7,
        ),
    )

    for (const resource of this.resources) {
      if (resource.type !== "meat" && resource.type !== "carrion") continue
      resource.age = (resource.age ?? 0) + 1
      if (resource.type === "meat" && resource.age >= meatDecayTicks) {
        resource.type = "carrion"
        resource.age = 0
        resource.energy = (resource.energy ?? 0) * CARRION_ENERGY_RATIO
      }
    }

    this.resources = this.resources.filter(
      (resource) =>
        resource.type !== "carrion" ||
        (resource.age ?? 0) <= carrionLifespanTicks,
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

    const newPatches: FertilityPatch[] = []

    for (const patch of this.fertilityPatches) {
      patch.age += 1
      patch.strength = clamp(
        patch.strength *
          (1 + this.climate.rainfall * 0.003 - this.climate.drought * 0.0045),
        FERTILITY_PATCH_STRENGTH * 0.35,
        FERTILITY_PATCH_STRENGTH * 2.2,
      )
      patch.radius = clamp(
        patch.radius +
          this.climate.rainfall * 0.12 -
          this.climate.drought * 0.18 +
          this.climate.humidity * 0.03,
        FERTILITY_PATCH_RADIUS * 0.45,
        FERTILITY_PATCH_RADIUS * 1.8,
      )
      patch.stability = clamp(
        patch.stability + this.climate.humidity * 0.001 - this.climate.drought * 0.002,
        0,
        1,
      )

      const transitionDrift =
        this.climate.trend === "stable" ? 1 : 1.25 + this.config.climateVolatility * 0.5
      const drift =
        this.config.fertilityDriftRate *
        transitionDrift *
        clamp(0.75 + (1 - patch.stability) * 0.8, 0.55, 1.55)
      const margin = this.fertilityPatchMargin()
      const minX = margin
      const maxX = this.config.worldWidth - margin
      const minY = margin
      const maxY = this.config.worldHeight - margin

      patch.vx =
        patch.vx * 0.94 +
        (Math.random() * 2 - 1) * (0.04 + this.config.climateVolatility * 0.04)
      patch.vy =
        patch.vy * 0.94 +
        (Math.random() * 2 - 1) * (0.04 + this.config.climateVolatility * 0.04)

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
        patch.strength,
        patch.radius,
      )

      const splitChance =
        this.fertilityPatches.length + newPatches.length < FERTILITY_PATCH_MAX_COUNT
          ? this.climate.rainfall * this.climate.humidity * 0.00035
          : 0
      if (
        patch.age > 900 &&
        patch.strength > FERTILITY_PATCH_STRENGTH * 1.1 &&
        Math.random() < splitChance
      ) {
        const angle = Math.random() * Math.PI * 2
        const childRadius = patch.radius * 0.72
        newPatches.push({
          x: clamp(patch.x + Math.cos(angle) * patch.radius, minX, maxX),
          y: clamp(patch.y + Math.sin(angle) * patch.radius, minY, maxY),
          vx: Math.cos(angle) * 0.8,
          vy: Math.sin(angle) * 0.8,
          radius: childRadius,
          strength: patch.strength * 0.72,
          age: 0,
          stability: patch.stability * 0.85,
        })
        patch.strength *= 0.82
        patch.radius *= 0.9
      }
    }

    if (newPatches.length > 0) {
      this.fertilityPatches.push(...newPatches)
    }

    this.fertilityPatches = this.fertilityPatches.filter(
      (patch, index) =>
        this.fertilityPatches.length <= FERTILITY_PATCH_MIN_COUNT ||
        patch.strength > FERTILITY_PATCH_STRENGTH * 0.45 ||
        index < FERTILITY_PATCH_MIN_COUNT,
    )

    while (this.fertilityPatches.length < FERTILITY_PATCH_MIN_COUNT) {
      const position = this.randomFertilityPatchPosition()
      this.fertilityPatches.push({
        x: position.x,
        y: position.y,
        vx: Math.random() * 2 - 1,
        vy: Math.random() * 2 - 1,
        radius: FERTILITY_PATCH_RADIUS * 0.65,
        strength: FERTILITY_PATCH_STRENGTH * 0.7,
        age: 0,
        stability: 0.35 + Math.random() * 0.35,
      })
    }

    const diffusionInterval = Math.max(
      12,
      Math.round(FERTILITY_DIFFUSION_INTERVAL / clamp(0.7 + this.climate.rainfall, 0.7, 1.6)),
    )
    if (this.tick % diffusionInterval === 0) {
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
    const baseTarget = this.config.foodDensity
    const effectiveGrowthRate = Math.ceil(
      this.config.vegetationGrowthRate /
        clamp(this.climate.growthModifier + this.climate.rainfall * 0.18, 0.5, 1.75),
    )
    const matureFood = food.filter(
      (r) => (r.age ?? effectiveGrowthRate) >= effectiveGrowthRate,
    )
    const effectiveFoodTarget = Math.ceil(
      baseTarget *
        clamp(
          0.58 +
            this.climate.growthModifier * 0.45 +
            this.climate.rainfall * 0.14 -
            this.climate.drought * 0.22,
          0.45,
          1.28,
        ),
    )
    const minimumFood = Math.ceil(
      baseTarget * clamp(0.22 + this.climate.humidity * 0.26, 0.18, 0.52),
    )
    const foodCap = Math.ceil(
      baseTarget *
        clamp(
          1.02 + this.climate.growthModifier * 0.32 + this.climate.rainfall * 0.16,
          1.05,
          1.72,
        ),
    )
    const seedBudget = Math.ceil(
      clamp(
        1 + baseTarget * (0.01 + this.climate.growthModifier * 0.012),
        2,
        10,
      ),
    )

    for (const resource of food) {
      resource.age = (resource.age ?? 0) + 1
    }

    const plantDecayAge =
      effectiveGrowthRate +
      Math.ceil(
        PLANT_DECAY_TICKS /
          clamp(this.climate.decayModifier + this.climate.temperature * 0.18, 0.7, 1.8),
      )
    const plantDecayChance =
      PLANT_DECAY_CHANCE *
      clamp(0.65 + this.climate.drought * 0.65 + this.climate.temperature * 0.35, 0.45, 1.7)
    for (const resource of food) {
      if ((resource.age ?? 0) < plantDecayAge) continue
      if (Math.random() < plantDecayChance) {
        this.convertPlantToCarrion(resource)
      }
    }

    if (food.length < minimumFood) {
      const seedsNeeded = Math.min(minimumFood - food.length, seedBudget)
      for (let i = 0; i < seedsNeeded; i++) {
        const seed = this.createResource("food", 0)
        this.resources.push(seed)
        food.push(seed)
      }
    }

    const spreadRadius =
      this.config.vegetationSpreadRadius *
      clamp(0.78 + this.climate.rainfall * 0.48 - this.climate.drought * 0.18, 0.55, 1.45)
    let seedsCreated = 0

    for (const parent of matureFood) {
      if (parent.type !== "food") continue
      if (food.length >= foodCap) break
      if (food.length >= effectiveFoodTarget && Math.random() < 0.65) continue
      if (seedsCreated >= seedBudget) break

      const fertility = this.fertilityAt(parent.x, parent.y)
      const spreadChance =
        0.002 +
        fertility * 0.018 * this.climate.growthModifier +
        this.climate.rainfall * 0.004 -
        this.climate.drought * 0.006
      if (Math.random() > spreadChance) continue

      const randomDispersal = Math.random() < 0.28
      const angle = Math.random() * Math.PI * 2
      const radius = Math.sqrt(Math.random()) * spreadRadius
      const randomPosition = this.randomResourcePosition("food")
      const seedX = randomDispersal
        ? randomPosition.x
        : Math.max(
            4,
            Math.min(this.config.worldWidth - 4, parent.x + Math.cos(angle) * radius),
          )
      const seedY = randomDispersal
        ? randomPosition.y
        : Math.max(
            4,
            Math.min(this.config.worldHeight - 4, parent.y + Math.sin(angle) * radius),
          )
      const seedChance =
        FERTILITY_MIN_SEED_CHANCE +
        this.fertilityAt(seedX, seedY) * 0.72 +
        this.climate.humidity * 0.16 -
        this.climate.drought * 0.18
      if (Math.random() > seedChance) continue

      const seed = this.createResource("food", 0, { x: seedX, y: seedY })
      this.resources.push(seed)
      food.push(seed)
      seedsCreated++
    }

    if (food.length > foodCap) {
      const overflow = [...food]
        .filter((resource) => resource.type === "food")
        .sort(
          (a, b) =>
            (this.fertilityAt(a.x, a.y) - this.fertilityAt(b.x, b.y)) ||
            ((b.age ?? 0) - (a.age ?? 0)),
        )
        .slice(0, food.length - foodCap)
      const carrionConversions = Math.ceil(overflow.length * 0.35)
      for (const resource of overflow.slice(0, carrionConversions)) {
        this.convertPlantToCarrion(resource)
      }
      const removeIds = new Set(overflow.slice(carrionConversions).map((r) => r.id))
      this.resources = this.resources.filter((r) => !removeIds.has(r.id))
    }

    const poisonCount = this.resources.filter((r) => r.type === "poison").length
    if (poisonCount < this.config.poisonDensity && Math.random() < POISON_SPAWN_CHANCE) {
      this.resources.push(this.createResource("poison"))
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

  private generateClusterCenters(): ClusterCenter[] {
    const count = 6 + Math.floor(Math.random() * 5)
    const margin = 80
    const centers: ClusterCenter[] = []
    const minDistance = Math.min(this.config.worldWidth, this.config.worldHeight) * 0.22

    for (let i = 0; i < count; i++) {
      let bestCandidate: ClusterCenter | null = null
      let bestDistance = -Infinity

      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = {
          x: margin + Math.random() * (this.config.worldWidth - margin * 2),
          y: margin + Math.random() * (this.config.worldHeight - margin * 2),
        }
        const nearest =
          centers.length === 0
            ? minDistance
            : Math.min(...centers.map((center) => distance(center.x, center.y, candidate.x, candidate.y)))
        if (nearest > bestDistance) {
          bestCandidate = candidate
          bestDistance = nearest
        }
        if (nearest >= minDistance) break
      }

      centers.push(bestCandidate!)
    }

    return centers
  }

  private createResource(
    type: ResourceType,
    age?: number,
    position: { x: number; y: number; energy?: number } = this.randomResourcePosition(
      type === "meat" || type === "carrion" ? "food" : type,
    ),
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
    } else if (type === "carrion") {
      resource.age = age ?? 0
    }

    return resource
  }

  private convertPlantToCarrion(resource: ResourceSnapshot): void {
    if (resource.type !== "food") return

    const fertility = this.fertilityAt(resource.x, resource.y)
    resource.type = "carrion"
    resource.age = 0
    resource.energy = PLANT_CARRION_ENERGY * clamp(0.75 + fertility * 0.7, 0.75, 1.45)
  }

  private randomResourcePosition(type: "food" | "poison"): { x: number; y: number } {
    const margin = 4
    const food = type === "food" ? this.resources.filter((resource) => resource.type === "food") : []
    const randomOpenPosition = () => ({
      x: margin + Math.random() * (this.config.worldWidth - margin * 2),
      y: margin + Math.random() * (this.config.worldHeight - margin * 2),
    })
    const scoreSpacing = (position: { x: number; y: number }) =>
      food.length === 0
        ? PLANT_MIN_SPACING
        : Math.min(...food.map((resource) => distance(resource.x, resource.y, position.x, position.y)))

    if (
      type === "food" &&
      this.config.foodDistribution === "cluster" &&
      this.foodClusterCenters.length > 0 &&
      Math.random() < CLUSTER_RESOURCE_CHANCE
    ) {
      const center =
        this.foodClusterCenters[
          Math.floor(Math.random() * this.foodClusterCenters.length)
        ]!
      let bestCandidate = randomOpenPosition()
      let bestScore = -Infinity

      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.sqrt(Math.random()) * Math.max(110, this.config.vegetationSpreadRadius * 1.25)
        const candidate = {
          x: Math.max(margin, Math.min(this.config.worldWidth - margin, center.x + Math.cos(angle) * radius)),
          y: Math.max(margin, Math.min(this.config.worldHeight - margin, center.y + Math.sin(angle) * radius)),
        }
        const spacing = scoreSpacing(candidate)
        if (spacing > bestScore) {
          bestCandidate = candidate
          bestScore = spacing
        }
        if (spacing >= PLANT_MIN_SPACING) break
      }

      return bestCandidate
    }

    let bestCandidate = randomOpenPosition()
    let bestScore = -Infinity
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = randomOpenPosition()
      const spacing = scoreSpacing(candidate)
      if (spacing > bestScore) {
        bestCandidate = candidate
        bestScore = spacing
      }
      if (spacing >= PLANT_MIN_SPACING) break
    }
    return bestCandidate
  }

  private getFamilyStats(): SpeciesFamilyStats[] {
    const byFamily = new Map<string, Creature[]>()
    for (const creature of this.creatures) {
      const group = byFamily.get(creature.familyId) ?? []
      group.push(creature)
      byFamily.set(creature.familyId, group)
    }

    const avg = (values: number[]) =>
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

    return Array.from(byFamily.entries())
      .map(([id, members]) => {
        const dietCounts = {
          herbivore: members.filter((c) => c.species === "herbivore").length,
          omnivore: members.filter((c) => c.species === "omnivore").length,
          carnivore: members.filter((c) => c.species === "carnivore").length,
        }
        const dietClass = (Object.entries(dietCounts).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0] ?? "herbivore") as SpeciesFamilyStats["dietClass"]
        return {
          id,
          label: id,
          color: this.familyColor(id),
          population: members.length,
          dietClass,
          perception: Math.round(avg(members.map((c) => c.traitAxes.perception))),
          biomechanics: Math.round(avg(members.map((c) => c.traitAxes.biomechanics))),
          metabolism: Math.round(avg(members.map((c) => c.traitAxes.metabolism))),
        }
      })
      .sort((a, b) => b.population - a.population)
      .slice(0, 8)
  }

  getStats(): WorldStats {
    const creatures = this.creatures
    const fitnesses = creatures.map((c) => c.computeFitness())
    const foodEaten = creatures.map((c) => c.foodEaten)
    const meatEaten = creatures.map((c) => c.meatEaten)
    const carrionEaten = creatures.map((c) => c.carrionEaten)
    const killCounts = creatures.filter((c) => c.canHunt).map((c) => c.killCount)
    const bestFitness = fitnesses.length > 0 ? Math.max(...fitnesses) : 0
    const averageFitness =
      fitnesses.length > 0
        ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
        : 0
    const averageFoodEaten =
      foodEaten.length > 0
        ? foodEaten.reduce((a, b) => a + b, 0) / foodEaten.length
        : 0
    const averageMeatEaten =
      meatEaten.length > 0
        ? meatEaten.reduce((a, b) => a + b, 0) / meatEaten.length
        : 0
    const averageCarrionEaten =
      carrionEaten.length > 0
        ? carrionEaten.reduce((a, b) => a + b, 0) / carrionEaten.length
        : 0
    const averageKillCount =
      killCounts.length > 0
        ? killCounts.reduce((a, b) => a + b, 0) / killCounts.length
        : 0

    const avg = (values: number[]) =>
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

    const herbivorePopulation = creatures.filter((c) => c.species === "herbivore").length
    const omnivorePopulation = creatures.filter((c) => c.species === "omnivore").length
    const carnivorePopulation = creatures.filter((c) => c.species === "carnivore").length
    const potentialHunterPopulation = creatures.filter(
      (c) =>
        c.traits.predationDrive >= 0.1 &&
        c.traits.meatDigestEfficiency >= 0.12 &&
        c.traits.size >= 3.4,
    ).length
    const meatCapablePopulation = creatures.filter(
      (c) => c.traits.meatDigestEfficiency >= 0.18,
    ).length
    const failedAttackEvents = creatures.reduce(
      (sum, creature) => sum + creature.failedAttackAttempts,
      0,
    )
    const families = this.getFamilyStats()
    const ecosystemSurvivalBase = this.initialPopulation + this.totalBirths
    const survivalRate = this.config.ecosystemMode
      ? ecosystemSurvivalBase > 0
        ? creatures.length / ecosystemSurvivalBase
        : 0
      : this.lastSurvivalRate
    const averageLifespan = this.config.ecosystemMode
      ? this.totalDeaths > 0
        ? this.totalDeathAge / this.totalDeaths
        : avg(creatures.map((c) => c.age))
      : this.lastAverageLifespan

    return {
      generation: this.generation,
      population: creatures.length,
      herbivorePopulation,
      omnivorePopulation,
      carnivorePopulation,
      bestFitness,
      averageFitness,
      averageFoodEaten,
      averageMeatEaten,
      averageCarrionEaten,
      averageKillCount,
      survivalRate,
      averageLifespan,
      speciesDiversity: families.length,
      tick: this.tick,
      averageSize: avg(creatures.map((c) => c.traits.size)),
      averageVisionRange: avg(creatures.map((c) => c.traits.visionRange)),
      averageVisionHalfAngle: avg(
        creatures.map((c) => c.traits.visionHalfAngle),
      ),
      averageMaxSpeed: avg(creatures.map((c) => c.traits.maxSpeed)),
      averageMetabolism: avg(creatures.map((c) => c.traits.metabolism)),
      averagePerceptionScore: avg(creatures.map((c) => c.traitAxes.perception)),
      averageBiomechanicsScore: avg(creatures.map((c) => c.traitAxes.biomechanics)),
      averageMetabolismScore: avg(creatures.map((c) => c.traitAxes.metabolism)),
      averagePredationDrive: avg(creatures.map((c) => c.traits.predationDrive)),
      averageCarrionDigestEfficiency: avg(
        creatures.map((c) => c.traits.carrionDigestEfficiency),
      ),
      averageToxinResistance: avg(creatures.map((c) => c.traits.toxinResistance)),
      potentialHunterPopulation,
      meatCapablePopulation,
      failedAttackEvents,
      carrionResources: this.resources.filter((resource) => resource.type === "carrion")
        .length,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      climate: this.climate,
      speciesFamilies: families,
    }
  }
}
