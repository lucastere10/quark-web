import { angleTo, distance } from "./collision"
import {
  classifyDiet,
  computeTraitAxes,
  createRandomDNA,
  dnaHash,
  extractTraits,
  extractWeights,
  mutateDNA,
  type DietClass,
  type MutationBiasOptions,
  type TraitAxes,
  type CreatureTraits,
} from "./genetics"
import { INPUT_COUNT, NeuralNetwork, OUTPUT_COUNT } from "./neural-network"

let nextCreatureId = 1

export type Species = DietClass
export type ResourceType = "food" | "poison" | "meat" | "carrion"

export interface ResourceSnapshot {
  id: number
  x: number
  y: number
  type: ResourceType
  age?: number
  energy?: number
}

export interface CreatureSenseSnapshot {
  id: number
  x: number
  y: number
  angle: number
  speed: number
  size: number
  species: Species
  noiseEmission: number
}

export interface TraitCaps {
  visionRange: number
  maxSpeed: number
  noiseStrength: number
}

export interface ActOptions {
  sprintCostMultiplier?: number
  metabolismModifier?: number
}

export interface ThinkOptions {
  visionModifier?: number
  scentModifier?: number
  localFertility?: number
  growthModifier?: number
  minFoodAge?: number
}

interface SignalPair {
  dist: number
  angle: number
}

interface ResourceSignals {
  plant: SignalPair
  meat: SignalPair
  carrion: SignalPair
  danger: SignalPair
}

const MOVE_THRESHOLD = 0.3
const BASE_FOOD_ENERGY = 25
const REF_SIZE = 7
const MAX_STEER = 0.12
const STEER_DEADZONE = 0.1
const MAX_THROTTLE = 0.3
const DRAG = 0.92
const REST_BRAKE = 0.85
const EAT_SPEED_MAX = 0.6
const EAT_SPEED_CLOSE = 1.0
const EAT_CLOSE_DIST = 2
const EAT_ALIGNMENT = Math.PI / 2
const REST_DRAIN_RATE = 0.8
const PROXIMITY_FOOD_SIGNAL = 0.75
const REPRODUCTION_ENERGY_RATIO = 0.8
const REPRODUCTION_ENERGY_COST_RATIO = 0.45
const CHILD_ENERGY_RATIO = 0.4
const CHILD_SPAWN_RADIUS = 25
const SPRINT_THROTTLE_THRESHOLD = 0.85
const SPRINT_SPEED_MULTIPLIER = 1.2
const SPRINT_DURATION_TICKS = 5
const ATTACK_ENERGY_LOSS = 42
const KILL_FEED_ENERGY_RATIO = 0.35
const ATTACK_MIN_SPEED = 0.28
const ATTACK_REACH_BONUS = 4
const LOCKED_ATTACK_REACH_BONUS = 3
const ATTACK_INSTINCT_DIST = 0.4
const LOCK_ACQUIRE_RATIO = 0.85
const LOCK_LEASH_RATIO = 1.4
const MAX_LOCK_TICKS = 400
const SEARCH_THROTTLE_FLOOR = 0.58
const SCENT_THROTTLE_FLOOR = 0.55
const PREDATION_DRIVE_THRESHOLD = 0.1
const MEAT_HUNT_THRESHOLD = 0.12
const POISON_ENERGY_LOSS = 18
const CARRION_TOXIN_RISK = 6
const STUCK_TICKS_THRESHOLD = 55
const SPIN_REPRODUCTION_LIMIT = 0.55

export function computeMaxEnergy(
  size: number,
  energyStorage = 1,
  endurance = 1,
): number {
  return (45 + size * 11) * energyStorage * (0.9 + endurance * 0.1)
}

export class Creature {
  readonly id: number
  familyId: string
  dna: Float32Array
  brain: NeuralNetwork
  traits: CreatureTraits

  x: number
  y: number
  angle: number
  speed: number
  energy: number
  age: number
  generation: number
  fitness: number
  offspringCount: number
  foodEaten: number
  meatEaten: number
  carrionEaten: number
  killCount: number
  attackAttempts: number
  failedAttackAttempts: number
  timesAttacked: number
  distanceTraveled: number
  cumulativeTurn: number
  ticksSinceMove: number
  effectiveVision: number
  effectiveMaxSpeed: number
  effectiveVisionHalfAngle: number
  effectiveScentRange: number
  effectiveHearingRange: number
  maxEnergy: number
  isResting: boolean
  isSprinting: boolean
  sprintTicksRemaining: number
  reproductionCooldown: number
  lockedTargetId: number | null
  lockedTicks: number
  meatDropped: boolean
  alive: boolean

  lastInputs: Float32Array
  lastOutputs: Float32Array

  constructor(
    x: number,
    y: number,
    dna?: Float32Array,
    generation = 0,
    initialEnergy = 100,
    traitDefaults?: Partial<CreatureTraits>,
    _species: Species = "herbivore",
    familyId?: string,
  ) {
    void _species
    this.id = nextCreatureId++
    this.familyId = familyId ?? `F${this.id.toString(36).toUpperCase()}`
    this.dna = dna ?? createRandomDNA(traitDefaults)
    this.brain = new NeuralNetwork(extractWeights(this.dna))
    this.traits = extractTraits(this.dna)

    this.x = x
    this.y = y
    this.angle = Math.random() * Math.PI * 2
    this.speed = 0
    this.maxEnergy = computeMaxEnergy(
      this.traits.size,
      this.traits.energyStorage,
      this.traits.endurance,
    )
    this.energy = Math.min(initialEnergy, this.maxEnergy)
    this.age = 0
    this.generation = generation
    this.fitness = 0
    this.offspringCount = 0
    this.foodEaten = 0
    this.meatEaten = 0
    this.carrionEaten = 0
    this.killCount = 0
    this.attackAttempts = 0
    this.failedAttackAttempts = 0
    this.timesAttacked = 0
    this.distanceTraveled = 0
    this.cumulativeTurn = 0
    this.ticksSinceMove = 0
    this.effectiveVision = this.traits.visionRange
    this.effectiveMaxSpeed = this.traits.maxSpeed
    this.effectiveVisionHalfAngle = (this.traits.visionHalfAngle * Math.PI) / 180
    this.effectiveScentRange = this.traits.scentRange
    this.effectiveHearingRange = this.traits.hearingRange
    this.isResting = false
    this.isSprinting = false
    this.sprintTicksRemaining = 0
    this.reproductionCooldown = 0
    this.lockedTargetId = null
    this.lockedTicks = 0
    this.meatDropped = false
    this.alive = true

    this.lastInputs = new Float32Array(INPUT_COUNT)
    this.lastOutputs = new Float32Array(OUTPUT_COUNT)
    this.syncRestingState()
  }

  get dnaHash(): string {
    return dnaHash(this.dna)
  }

  get species(): Species {
    return classifyDiet(this.traits)
  }

  get traitAxes(): TraitAxes {
    return computeTraitAxes(this.traits)
  }

  get canHunt(): boolean {
    return (
      this.traits.predationDrive >= PREDATION_DRIVE_THRESHOLD &&
      this.traits.meatDigestEfficiency >= MEAT_HUNT_THRESHOLD
    )
  }

  syncRestingState(): void {
    this.maxEnergy = computeMaxEnergy(
      this.traits.size,
      this.traits.energyStorage,
      this.traits.endurance,
    )
    this.isResting = this.energy > this.maxEnergy
    if (this.isResting) {
      this.speed = 0
      this.isSprinting = false
      this.sprintTicksRemaining = 0
    }
  }

  think(
    worldWidth: number,
    worldHeight: number,
    resources: ResourceSnapshot[],
    caps: TraitCaps,
    preySignals: CreatureSenseSnapshot[] = [],
    predatorSignals: CreatureSenseSnapshot[] = [],
    options: ThinkOptions = {},
  ): void {
    this.syncRestingState()
    const visionModifier = options.visionModifier ?? 1
    const scentModifier = options.scentModifier ?? 1
    this.effectiveVision =
      Math.min(this.traits.visionRange, caps.visionRange) * visionModifier
    this.effectiveVisionHalfAngle = (this.traits.visionHalfAngle * Math.PI) / 180
    this.effectiveScentRange = this.traits.scentRange * scentModifier
    this.effectiveHearingRange = this.traits.hearingRange
    const baseSpeed = Math.min(this.traits.maxSpeed, caps.maxSpeed)
    const sizeDrag = Math.sqrt(REF_SIZE / this.traits.size)
    const enduranceBoost = 0.85 + this.traits.endurance * 0.12
    this.effectiveMaxSpeed = baseSpeed * sizeDrag * enduranceBoost

    const resourceSignals = this.computeResourceSignals(resources, {
      visionRange: this.effectiveVision,
      scentRange: this.effectiveScentRange,
      localFertility: options.localFertility ?? 0.5,
      growthModifier: options.growthModifier ?? 1,
      minFoodAge: options.minFoodAge,
    })
    const danger = this.computeDangerSignal(
      worldWidth,
      worldHeight,
      resources,
      this.effectiveVision,
    )
    const prey = this.computePreySignal(
      preySignals,
      this.effectiveVision,
    )
    const predator = this.computeNearestCreatureSignal(
      predatorSignals,
      Math.max(this.effectiveVision, this.effectiveHearingRange * 0.85),
    )

    this.lastInputs[0] = resourceSignals.plant.dist
    this.lastInputs[1] = resourceSignals.plant.angle
    this.lastInputs[2] = resourceSignals.meat.dist
    this.lastInputs[3] = resourceSignals.meat.angle
    this.lastInputs[4] = resourceSignals.carrion.dist
    this.lastInputs[5] = resourceSignals.carrion.angle
    this.lastInputs[6] = prey.dist
    this.lastInputs[7] = prey.angle
    this.lastInputs[8] = predator.dist
    this.lastInputs[9] = predator.angle
    this.lastInputs[10] =
      danger.dist < resourceSignals.danger.dist ? danger.dist : resourceSignals.danger.dist
    this.lastInputs[11] =
      danger.dist < resourceSignals.danger.dist ? danger.angle : resourceSignals.danger.angle
    this.lastInputs[12] =
      this.maxEnergy > 0 ? this.energy / this.maxEnergy : 0
    this.lastInputs[13] =
      this.effectiveMaxSpeed > 0 ? this.speed / this.effectiveMaxSpeed : 0

    const outputs = this.brain.forward(this.lastInputs)
    for (let i = 0; i < OUTPUT_COUNT; i++) {
      this.lastOutputs[i] = outputs[i] ?? 0
    }
    this.applySpeciesInstinct()
  }

  private applySpeciesInstinct(): void {
    const plantDist = this.lastInputs[0] ?? 1
    const plantDir = this.lastInputs[1] ?? 0
    const meatDist = this.lastInputs[2] ?? 1
    const meatDir = this.lastInputs[3] ?? 0
    const carrionDist = this.lastInputs[4] ?? 1
    const carrionDir = this.lastInputs[5] ?? 0
    const preyDist = this.lastInputs[6] ?? 1
    const preyDir = this.lastInputs[7] ?? 0
    const predatorDist = this.lastInputs[8] ?? 1
    const predatorDir = this.lastInputs[9] ?? 0
    const dangerDist = this.lastInputs[10] ?? 1
    const dangerDir = this.lastInputs[11] ?? 0
    const steer = this.lastOutputs[0] ?? 0.5
    const throttle = this.lastOutputs[1] ?? 0.5

    if (dangerDist < 0.16 && predatorDist >= 0.35) {
      const urgency = Math.min(1, (0.16 - dangerDist) / 0.16)
      const avoidSteer = 0.5 + dangerDir * 0.42
      this.lastOutputs[0] =
        steer * (1 - urgency * 0.55) + avoidSteer * (urgency * 0.55)
      this.lastOutputs[1] = Math.max(throttle, 0.5 + urgency * 0.18)
      return
    }

    if (predatorDist < 0.9 && !this.canHunt) {
      const urgency = Math.min(1, (0.9 - predatorDist) / 0.6)
      const fleeSteer = 0.5 - predatorDir * 0.4
      const fleeThrottle = 0.55 + urgency * 0.3
      this.lastOutputs[0] =
        steer * (1 - urgency * 0.65) + fleeSteer * (urgency * 0.65)
      this.lastOutputs[1] =
        throttle * (1 - urgency * 0.5) + fleeThrottle * (urgency * 0.5)
      return
    }

    if (!this.canHunt) {
      if (plantDist < 0.85) {
        const plantSignal = 1 - plantDist
        const plantBlend = Math.min(0.55, plantSignal * 0.5)
        this.lastOutputs[0] =
          steer * (1 - plantBlend) + (0.5 + plantDir * 0.35) * plantBlend
        this.lastOutputs[1] = Math.max(throttle, 0.48 + plantSignal * 0.18)
        if (plantDist < 0.12) {
          this.lastOutputs[2] = Math.max(this.lastOutputs[2] ?? 0, 0.72)
        }
      }
      return
    }

    if (preyDist >= 0.9) {
      const foodTargets = [
        { dist: meatDist, dir: meatDir, eatBias: 0.8 },
        { dist: carrionDist, dir: carrionDir, eatBias: 0.68 },
        { dist: plantDist, dir: plantDir, eatBias: 0.55 },
      ]
      const bestFood = foodTargets.reduce((best, item) =>
        item.dist < best.dist ? item : best,
      )

      if (bestFood.dist < 0.88) {
        const signal = 1 - bestFood.dist
        const blend = Math.min(0.72, 0.32 + signal * 0.38)
        this.lastOutputs[0] =
          steer * (1 - blend) + (0.5 + bestFood.dir * 0.4) * blend
        this.lastOutputs[1] = Math.max(
          throttle,
          SCENT_THROTTLE_FLOOR + signal * 0.22,
        )
        if (bestFood.dist < 0.12) {
          this.lastOutputs[2] = Math.max(this.lastOutputs[2] ?? 0, bestFood.eatBias)
        }
      } else {
        this.lastOutputs[0] = steer * 0.4 + 0.5 * 0.6
        this.lastOutputs[1] = Math.max(throttle, SEARCH_THROTTLE_FLOOR)
      }
      return
    }

    const urgency = Math.min(1, (0.9 - preyDist) / 0.6)
    const steerAuthority = 0.46
    const steerBlend = this.lockedTargetId !== null ? 0.92 : 0.82
    const huntSteer = 0.5 + preyDir * steerAuthority
    const huntThrottle = preyDist < 0.06 ? 0.62 : 0.76 + urgency * 0.16
    const huntAttack = 0.65 + urgency * 0.3

    this.lastOutputs[0] =
      steer * (1 - steerBlend) + huntSteer * steerBlend
    this.lastOutputs[1] = Math.max(throttle, huntThrottle)
    this.lastOutputs[2] = Math.max(this.lastOutputs[2] ?? 0, huntAttack)
  }

  act(deltaMetabolism: number, options: ActOptions = {}): void {
    const [steerOut, throttleOut, , restOut] = this.lastOutputs
    const sprintCostMultiplier = options.sprintCostMultiplier ?? 1.8
    const metabolismModifier = options.metabolismModifier ?? 1

    const prevX = this.x
    const prevY = this.y

    const throttleIntent = Math.max(0, ((throttleOut ?? 0.5) - 0.5) * 2)
    const steerRaw = ((steerOut ?? 0.5) - 0.5) * 2
    const steerAuthority =
      (0.35 + throttleIntent * 0.65) *
      (this.ticksSinceMove > STUCK_TICKS_THRESHOLD ? 0.55 : 1)
    const steer =
      Math.abs(steerRaw) < STEER_DEADZONE ? 0 : steerRaw * MAX_STEER * steerAuthority
    this.angle += steer
    this.cumulativeTurn += Math.abs(steer)

    const acceleration =
      MAX_THROTTLE *
      this.traits.acceleration *
      (0.75 + (REF_SIZE / this.traits.size) * 0.25)
    let throttle = ((throttleOut ?? 0.5) - 0.5) * 2 * acceleration
    if (this.ticksSinceMove > STUCK_TICKS_THRESHOLD) {
      throttle = Math.max(throttle, acceleration * 0.42)
    }
    this.speed += throttle
    const sizeDrag = Math.min(0.08, Math.max(0, this.traits.size - REF_SIZE) * 0.008)
    this.speed *= DRAG - sizeDrag

    const plantDistance = this.lastInputs[0] ?? 1
    if (plantDistance < 1 - PROXIMITY_FOOD_SIGNAL) {
      this.speed *= 0.85
    }

    if ((restOut ?? 0) > 0.6) {
      this.speed *= REST_BRAKE
    }

    const wantsSprint =
      this.canHunt &&
      (throttleOut ?? 0) > SPRINT_THROTTLE_THRESHOLD

    if (wantsSprint) {
      this.isSprinting = true
      this.sprintTicksRemaining = SPRINT_DURATION_TICKS
    } else if (this.sprintTicksRemaining > 0) {
      this.sprintTicksRemaining -= 1
      this.isSprinting = true
    } else {
      this.isSprinting = false
    }

    const speedCap = this.isSprinting
      ? this.effectiveMaxSpeed * SPRINT_SPEED_MULTIPLIER
      : this.effectiveMaxSpeed

    this.speed = Math.max(0, Math.min(this.speed, speedCap))

    this.x += Math.cos(this.angle) * this.speed
    this.y += Math.sin(this.angle) * this.speed

    const displacement = distance(prevX, prevY, this.x, this.y)
    this.distanceTraveled += displacement

    if (displacement < MOVE_THRESHOLD) {
      this.ticksSinceMove += 1
    } else {
      this.ticksSinceMove = 0
    }

    const speedRatio =
      this.effectiveMaxSpeed > 0 ? this.speed / this.effectiveMaxSpeed : 0
    const metabolism =
      this.traits.metabolism *
      deltaMetabolism *
      metabolismModifier *
      (0.92 + this.traits.size / (REF_SIZE * 10)) *
      (1.08 - Math.min(0.42, this.traits.endurance * 0.18))
    const sizeFactor = this.traits.size / REF_SIZE
    let movementCost =
      this.speed *
      0.009 *
      deltaMetabolism *
      metabolismModifier *
      (0.45 + speedRatio * 0.55) *
      sizeFactor *
      (1.1 - Math.min(0.45, this.traits.endurance * 0.18))

    if (this.isSprinting) {
      movementCost *= sprintCostMultiplier
    }

    const restBonus =
      (restOut ?? 0) > 0.6 ? -0.005 * deltaMetabolism * metabolismModifier : 0

    this.energy -= metabolism + movementCost + restBonus
    this.age += 1

    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown -= 1
    }

    if (this.energy <= 0) {
      this.alive = false
    }
  }

  processResting(
    deltaMetabolism: number,
    digestSlowdown = 1,
    metabolismModifier = 1,
  ): void {
    this.speed = 0
    this.isSprinting = false
    this.sprintTicksRemaining = 0
    const drainRate = REST_DRAIN_RATE * (this.canHunt ? digestSlowdown : 1)
    this.energy -= drainRate * deltaMetabolism * metabolismModifier
    this.age += 1
    this.ticksSinceMove += 1

    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown -= 1
    }

    this.syncRestingState()

    if (this.energy <= 0) {
      this.alive = false
    }
  }

  tryEat(
    resources: ResourceSnapshot[],
    options: { minFoodAge?: number } = {},
  ): ResourceSnapshot | null {
    const eatSignal = this.lastOutputs[2] ?? 0
    if (eatSignal <= 0.5) return null

    let bestIndex = -1
    let bestScore = 0
    for (let i = resources.length - 1; i >= 0; i--) {
      const resource = resources[i]!
      const preference = this.resourcePreference(resource.type)
      if (preference <= 0) continue
      if (
        resource.type === "food" &&
        options.minFoodAge !== undefined &&
        (resource.age ?? options.minFoodAge) < options.minFoodAge
      ) {
        continue
      }

      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist >= this.traits.size + 4) continue

      const isClose = dist < this.traits.size + EAT_CLOSE_DIST
      const speedLimit =
        resource.type === "meat" || resource.type === "carrion"
          ? this.effectiveMaxSpeed * SPRINT_SPEED_MULTIPLIER
          : isClose
            ? EAT_SPEED_CLOSE
            : EAT_SPEED_MAX
      if (this.speed >= speedLimit) continue

      if (!isClose && resource.type !== "meat" && resource.type !== "carrion") {
        const foodAngle = angleTo(this.x, this.y, resource.x, resource.y)
        const alignment = Math.abs(this.normalizeAngle(foodAngle) * Math.PI)
        if (alignment >= EAT_ALIGNMENT) continue
      }

      const score = preference * (1 - Math.min(1, dist / (this.traits.size + 4)))
      if (score > bestScore) {
        bestScore = score
        bestIndex = i
      }
    }

    if (bestIndex < 0) return null

    const resource = resources[bestIndex]!
    const digestEfficiency = this.digestEfficiency(resource.type)
    const resourceEnergy =
      resource.energy ?? BASE_FOOD_ENERGY * (this.traits.size / REF_SIZE)
    this.energy += resourceEnergy * digestEfficiency
    if (resource.type === "food") {
      this.foodEaten += 1
    } else if (resource.type === "meat") {
      this.meatEaten += 1
    } else if (resource.type === "carrion") {
      this.carrionEaten += 1
      const toxinRisk =
        CARRION_TOXIN_RISK * Math.max(0.1, 1 - this.traits.toxinResistance)
      this.energy -= toxinRisk
    }
    const eaten = { ...resource }
    resources.splice(bestIndex, 1)
    this.syncRestingState()
    return eaten
  }

  tryAttack(
    potentialPrey: Creature[],
    options: { maxPreySizeRatio?: number } = {},
  ): Creature | null {
    if (!this.canHunt || this.isResting) return null

    const attackSignal = this.lastOutputs[2] ?? 0
    const preyProximity = this.lastInputs[6] ?? 1
    const instinctAttack = preyProximity < ATTACK_INSTINCT_DIST
    const lockedAttack =
      this.lockedTargetId !== null && preyProximity < ATTACK_INSTINCT_DIST * 1.4
    if (attackSignal <= 0.5 && !instinctAttack && !lockedAttack) return null

    const lockedPrey =
      this.lockedTargetId === null
        ? null
        : potentialPrey.find((prey) => prey.id === this.lockedTargetId)
    const candidates = lockedPrey
      ? [lockedPrey, ...potentialPrey.filter((prey) => prey.id !== lockedPrey.id)]
      : potentialPrey

    for (const prey of candidates) {
      if (!prey.alive || prey.id === this.id) continue
      if (!this.canPreyOn(prey, options.maxPreySizeRatio)) continue

      const dist = distance(this.x, this.y, prey.x, prey.y)
      const isLockedPrey = prey.id === this.lockedTargetId
      const attackReach =
        this.traits.size +
        prey.traits.size +
        ATTACK_REACH_BONUS +
        (isLockedPrey ? LOCKED_ATTACK_REACH_BONUS : 0)
      if (dist > attackReach) continue

      const inMelee = dist <= this.traits.size + prey.traits.size + 2
      const minAttackSpeed = isLockedPrey ? ATTACK_MIN_SPEED * 0.5 : ATTACK_MIN_SPEED
      if (!inMelee && this.speed < minAttackSpeed) continue

      this.attackAttempts += 1
      const attackDamage =
        ATTACK_ENERGY_LOSS *
        (0.75 + this.traits.strength * 0.25) *
        (this.traits.size / REF_SIZE)
      const attackCost =
        1.8 +
        this.traits.metabolism * 58 +
        this.traits.size * 0.18 +
        this.traits.predationDrive * 0.9
      prey.energy -= attackDamage
      this.energy -= attackCost
      prey.timesAttacked += 1
      const killed = prey.energy <= 0
      if (killed) {
        prey.alive = false
        this.energy +=
          prey.maxEnergy *
          KILL_FEED_ENERGY_RATIO *
          Math.min(1.6, this.traits.meatDigestEfficiency + this.traits.predationDrive * 0.18)
        this.killCount += 1
        this.meatEaten += 1
        if (this.lockedTargetId === prey.id) {
          this.lockedTargetId = null
          this.lockedTicks = 0
        }
      }
      if (!killed) {
        this.failedAttackAttempts += 1
      }

      this.speed *= 0.7
      this.syncRestingState()
      if (this.energy <= 0) this.alive = false
      return prey
    }

    return null
  }

  tryPoison(resources: ResourceSnapshot[]): boolean {
    for (let index = resources.length - 1; index >= 0; index--) {
      const resource = resources[index]!
      if (resource.type !== "poison") continue
      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist < this.traits.size + 3) {
        const poisonDamage =
          POISON_ENERGY_LOSS * Math.max(0.12, 1.05 - this.traits.toxinResistance)
        this.energy -= poisonDamage
        resources.splice(index, 1)
        this.syncRestingState()
        if (this.energy <= 0) this.alive = false
        return true
      }
    }
    return false
  }

  tryReproduce(
    config: {
      mutationRate: number
      mutationStrength: number
      minFoodToReproduce: number
      minKillsToReproduce?: number
      reproductionCooldownTicks: number
      maxPopulation: number
      currentPopulation: number
      worldWidth: number
      worldHeight: number
      mutationBias?: MutationBiasOptions
    },
    traitDefaults?: Partial<CreatureTraits>,
  ): Creature | null {
    if (!this.alive) return null
    if (config.currentPopulation >= config.maxPopulation) return null
    if (this.reproductionCooldown > 0) return null
    const nutritionScore =
      this.foodEaten * this.traits.plantDigestEfficiency +
      this.meatEaten * this.traits.meatDigestEfficiency * 1.45 +
      this.carrionEaten *
        this.traits.carrionDigestEfficiency *
        (1.0 + this.traits.toxinResistance * 0.35) +
      this.killCount * 1.05
    const requiredNutrition =
      this.canHunt && this.killCount > 0
        ? config.minFoodToReproduce * 0.68
        : this.canHunt
          ? config.minFoodToReproduce * 0.86
          : config.minFoodToReproduce
    if (nutritionScore < requiredNutrition) return null
    if (this.energy < REPRODUCTION_ENERGY_RATIO * this.maxEnergy) return null
    const spinRatio = this.cumulativeTurn / Math.max(this.distanceTraveled, 1)
    if (
      this.age > 80 &&
      (this.ticksSinceMove > STUCK_TICKS_THRESHOLD * 1.6 ||
        (spinRatio > SPIN_REPRODUCTION_LIMIT && this.distanceTraveled < this.age * 0.22))
    ) {
      return null
    }

    const childDna = mutateDNA(
      this.dna,
      config.mutationRate,
      config.mutationStrength,
      {
        ...config.mutationBias,
        meatExperience: this.meatEaten,
        carrionExperience: this.carrionEaten,
        killExperience: this.killCount,
      },
    )

    const spawnAngle = Math.random() * Math.PI * 2
    const spawnDist = Math.random() * CHILD_SPAWN_RADIUS
    const margin = this.traits.size
    const childX = Math.max(
      margin,
      Math.min(
        config.worldWidth - margin,
        this.x + Math.cos(spawnAngle) * spawnDist,
      ),
    )
    const childY = Math.max(
      margin,
      Math.min(
        config.worldHeight - margin,
        this.y + Math.sin(spawnAngle) * spawnDist,
      ),
    )

    const child = new Creature(
      childX,
      childY,
      childDna,
      this.generation + 1,
      0,
      traitDefaults,
      this.species,
      this.familyId,
    )
    child.energy = child.maxEnergy * CHILD_ENERGY_RATIO
    child.foodEaten = 0
    child.meatEaten = 0
    child.carrionEaten = 0
    child.reproductionCooldown = config.reproductionCooldownTicks

    this.energy -= this.maxEnergy * REPRODUCTION_ENERGY_COST_RATIO
    this.reproductionCooldown = config.reproductionCooldownTicks
    this.offspringCount += 1
    this.syncRestingState()

    return child
  }

  clampToWorld(width: number, height: number): void {
    const margin = this.traits.size
    if (this.x < margin) {
      this.x = margin
      this.angle = Math.PI - this.angle
    }
    if (this.x > width - margin) {
      this.x = width - margin
      this.angle = Math.PI - this.angle
    }
    if (this.y < margin) {
      this.y = margin
      this.angle = -this.angle
    }
    if (this.y > height - margin) {
      this.y = height - margin
      this.angle = -this.angle
    }
  }

  computeFitness(): number {
    let score =
      this.foodEaten * 8 * this.traits.plantDigestEfficiency +
      this.meatEaten * 13 * this.traits.meatDigestEfficiency +
      this.carrionEaten * 7 * this.traits.carrionDigestEfficiency +
      this.killCount * 18 +
      this.offspringCount * 6 +
      (this.maxEnergy > 0 ? (this.energy / this.maxEnergy) * 8 : 0)

    const nutrition = this.foodEaten + this.meatEaten + this.carrionEaten
    if (nutrition > 0) {
      score += this.age * 0.015
      const efficiency = nutrition / Math.max(1, this.distanceTraveled / 100)
      score += efficiency * 2.5
    }

    score -= this.timesAttacked * 4

    const spinRatio = this.cumulativeTurn / Math.max(this.distanceTraveled, 1)
    score -= spinRatio * 5
    if (spinRatio > 0.45 && this.distanceTraveled < this.age * 0.3) {
      score -= (spinRatio - 0.45) * this.age * 0.16
    }

    if (this.ticksSinceMove > 40) {
      score -= (this.ticksSinceMove - 40) * 0.12
    }

    if (nutrition === 0) {
      score -= this.age * 0.02
      if (this.age > 150) {
        score -= 10 + (this.age - 150) * 0.05
      }
    }

    if (this.traits.predationDrive > 0.34 && this.killCount === 0) {
      score -= (this.traits.predationDrive - 0.34) * this.age * 0.012
    }
    if (this.failedAttackAttempts > this.killCount + 2) {
      score -= (this.failedAttackAttempts - this.killCount - 2) * 0.8
    }
    if (this.meatEaten > 0) {
      score += this.meatEaten * Math.max(0, this.traits.meatDigestEfficiency - 0.08) * 8
    }
    if (this.carrionEaten > 0) {
      score +=
        this.carrionEaten *
        Math.max(0, this.traits.carrionDigestEfficiency - 0.1) *
        (3 + this.traits.toxinResistance * 3)
    }

    if (this.carrionEaten === 0) {
      score -= Math.max(0, this.traits.carrionDigestEfficiency - 0.35) * this.age * 0.01
    }

    score -= Math.max(0, this.traits.metabolism - 0.02) * this.age * 0.2

    return score
  }

  toSenseSnapshot(): CreatureSenseSnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      speed: this.speed,
      size: this.traits.size,
      species: this.species,
      noiseEmission: this.traits.noiseEmission,
    }
  }

  toSnapshot() {
    const axes = this.traitAxes
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      age: this.age,
      generation: this.generation,
      fitness: this.computeFitness(),
      size: this.traits.size,
      species: this.species,
      familyId: this.familyId,
      dnaHash: this.dnaHash,
      alive: this.alive,
      foodEaten: this.foodEaten,
      meatEaten: this.meatEaten,
      carrionEaten: this.carrionEaten,
      killCount: this.killCount,
      timesAttacked: this.timesAttacked,
      distanceTraveled: this.distanceTraveled,
      cumulativeTurn: this.cumulativeTurn,
      ticksSinceMove: this.ticksSinceMove,
      visionRange: this.effectiveVision,
      visionHalfAngle: this.traits.visionHalfAngle,
      scentRange: this.effectiveScentRange,
      hearingRange: this.effectiveHearingRange,
      noiseEmission: this.traits.noiseEmission,
      maxSpeed: this.effectiveMaxSpeed,
      metabolism: this.traits.metabolism,
      perceptionScore: axes.perception,
      biomechanicsScore: axes.biomechanics,
      metabolismScore: axes.metabolism,
      perceptionAccuracy: this.traits.perceptionAccuracy,
      acceleration: this.traits.acceleration,
      agility: this.traits.agility,
      strength: this.traits.strength,
      endurance: this.traits.endurance,
      plantDigestEfficiency: this.traits.plantDigestEfficiency,
      meatDigestEfficiency: this.traits.meatDigestEfficiency,
      carrionDigestEfficiency: this.traits.carrionDigestEfficiency,
      toxinResistance: this.traits.toxinResistance,
      energyStorage: this.traits.energyStorage,
      predationDrive: this.traits.predationDrive,
      isResting: this.isResting,
      isSprinting: this.isSprinting,
      isLocked: this.lockedTargetId !== null,
      lockedTargetId: this.lockedTargetId,
      lockedTicks: this.lockedTicks,
      inputs: Array.from(this.lastInputs),
      outputs: Array.from(this.lastOutputs),
      hidden: Array.from(this.brain.hidden),
      weights: Array.from(this.brain.weights),
    }
  }

  canPreyOn(prey: Creature, maxPreySizeRatio = 0.55): boolean {
    if (!this.canHunt || !prey.alive || prey.id === this.id) return false
    if (this.energy < this.maxEnergy * 0.1) return false
    if (prey.traits.size > this.traits.size * (maxPreySizeRatio + 0.08)) {
      return false
    }
    return this.traits.strength * this.traits.size >= prey.traits.size * 0.62
  }

  private digestEfficiency(type: ResourceType): number {
    if (type === "food") return this.traits.plantDigestEfficiency
    if (type === "meat") return this.traits.meatDigestEfficiency
    if (type === "carrion") return this.traits.carrionDigestEfficiency
    return 0
  }

  private resourcePreference(type: ResourceType): number {
    if (type === "poison") return 0
    if (type === "food") {
      return this.species === "carnivore"
        ? Math.max(0, this.traits.plantDigestEfficiency - 0.45) * 0.35
        : this.traits.plantDigestEfficiency
    }
    if (type === "meat") {
      return this.species === "herbivore"
        ? Math.max(0.04, this.traits.meatDigestEfficiency - 0.12) * 0.55
        : this.traits.meatDigestEfficiency * (0.8 + this.traits.predationDrive)
    }
    if (type === "carrion") {
      const basePreference =
        this.traits.carrionDigestEfficiency * (0.7 + this.traits.toxinResistance * 0.6)
      if (this.species === "herbivore") {
        return Math.max(0.025, basePreference - 0.1) * 0.5
      }
      if (this.species === "carnivore") {
        return basePreference * 0.75
      }
      return basePreference
    }
    return 0
  }

  private computeResourceSignals(
    resources: ResourceSnapshot[],
    options: {
      visionRange: number
      scentRange: number
      localFertility: number
      growthModifier: number
      minFoodAge?: number
    },
  ): ResourceSignals {
    const signals: ResourceSignals = {
      plant: { dist: 1, angle: 0 },
      meat: { dist: 1, angle: 0 },
      carrion: { dist: 1, angle: 0 },
      danger: { dist: 1, angle: 0 },
    }
    const scores = {
      plant: 0,
      meat: 0,
      carrion: 0,
      danger: 0,
    }

    for (const resource of resources) {
      const rawDist = distance(this.x, this.y, resource.x, resource.y)
      const resourceAngle = angleTo(this.x, this.y, resource.x, resource.y)
      const normalizedAngle = this.normalizeAngle(resourceAngle)

      if (resource.type === "food") {
        if (rawDist > options.visionRange) continue

        const maturity =
          options.minFoodAge === undefined
            ? 1
            : Math.min(1, (resource.age ?? options.minFoodAge) / options.minFoodAge)
        const normalizedDist = this.normalizeDistance(rawDist, options.visionRange)
        const quality =
          this.resourcePreference("food") *
          maturity *
          (0.65 + options.localFertility * 0.35) *
          Math.min(1.35, options.growthModifier)
        const score = (1 - normalizedDist) * quality
        if (score > scores.plant) {
          scores.plant = score
          signals.plant = {
            dist: Math.min(1, normalizedDist / Math.max(0.45, quality)),
            angle: normalizedAngle,
          }
        }
        continue
      }

      if (resource.type === "poison") {
        if (rawDist > options.visionRange) continue

        const normalizedDist = this.normalizeDistance(rawDist, options.visionRange)
        const score = 1 - normalizedDist
        if (score > scores.danger) {
          scores.danger = score
          signals.danger = {
            dist: normalizedDist,
            angle: this.normalizeAngle(angleTo(resource.x, resource.y, this.x, this.y)),
          }
        }
        continue
      }

      const range = Math.max(options.visionRange * 0.75, options.scentRange)
      if (rawDist > range) continue

      const normalizedDist = this.normalizeDistance(rawDist, range)
      const energyWeight = Math.min(
        1.5,
        (resource.energy ?? BASE_FOOD_ENERGY) / BASE_FOOD_ENERGY,
      )
      const quality = this.resourcePreference(resource.type) * energyWeight
      const score = (1 - normalizedDist) * quality
      const signal = {
        dist: Math.min(1, normalizedDist / Math.max(0.45, quality)),
        angle: normalizedAngle,
      }

      if (resource.type === "meat" && score > scores.meat) {
        scores.meat = score
        signals.meat = signal
      }
      if (resource.type === "carrion" && score > scores.carrion) {
        scores.carrion = score
        signals.carrion = signal
      }
    }

    return signals
  }

  private computeDangerSignal(
    worldWidth: number,
    worldHeight: number,
    resources: ResourceSnapshot[],
    visionRange: number,
  ): SignalPair {
    const margin = this.traits.size
    const left = this.x - margin
    const right = worldWidth - margin - this.x
    const top = this.y - margin
    const bottom = worldHeight - margin - this.y

    let nearestEdgeDist = Math.min(left, right, top, bottom)
    let escapeAngle = this.angle

    if (nearestEdgeDist === left) {
      escapeAngle = 0
    } else if (nearestEdgeDist === right) {
      escapeAngle = Math.PI
    } else if (nearestEdgeDist === top) {
      escapeAngle = Math.PI / 2
    } else if (nearestEdgeDist === bottom) {
      escapeAngle = -Math.PI / 2
    }

    for (const resource of resources) {
      if (resource.type !== "poison") continue
      const poisonDist = distance(this.x, this.y, resource.x, resource.y)
      if (poisonDist < nearestEdgeDist) {
        nearestEdgeDist = poisonDist
        escapeAngle = angleTo(resource.x, resource.y, this.x, this.y)
      }
    }

    return {
      dist: this.normalizeDistance(nearestEdgeDist, visionRange),
      angle: this.normalizeAngle(escapeAngle),
    }
  }

  private findNearestCreature(
    creatures: CreatureSenseSnapshot[],
    visionRange: number,
  ): { id: number; dist: number; angle: number } | null {
    let nearestDist = Infinity
    let nearestAngle = 0
    let nearestId = 0

    for (const other of creatures) {
      if (other.id === this.id) continue

      const dist = distance(this.x, this.y, other.x, other.y) - other.size
      if (dist > visionRange || dist >= nearestDist) continue

      nearestDist = Math.max(0, dist)
      nearestAngle = angleTo(this.x, this.y, other.x, other.y)
      nearestId = other.id
    }

    if (nearestDist === Infinity) return null
    return { id: nearestId, dist: nearestDist, angle: nearestAngle }
  }

  private findCreatureById(
    creatures: CreatureSenseSnapshot[],
    id: number,
  ): CreatureSenseSnapshot | null {
    return creatures.find((creature) => creature.id === id) ?? null
  }

  private creatureSignalFromTarget(
    target: CreatureSenseSnapshot,
    visionRange: number,
  ): SignalPair {
    const targetDist = Math.max(
      0,
      distance(this.x, this.y, target.x, target.y) - target.size,
    )

    return {
      dist: this.normalizeDistance(targetDist, visionRange),
      angle: this.normalizeAngle(angleTo(this.x, this.y, target.x, target.y)),
    }
  }

  private computePreySignal(
    creatures: CreatureSenseSnapshot[],
    visionRange: number,
  ): SignalPair {
    if (!this.canHunt) {
      this.lockedTargetId = null
      this.lockedTicks = 0
      return { dist: 1, angle: 0 }
    }

    if (this.lockedTargetId !== null) {
      const lockedTarget = this.findCreatureById(creatures, this.lockedTargetId)
      if (lockedTarget) {
        const lockDist =
          distance(this.x, this.y, lockedTarget.x, lockedTarget.y) -
          lockedTarget.size
        if (
          lockDist <= visionRange * LOCK_LEASH_RATIO &&
          this.lockedTicks < MAX_LOCK_TICKS
        ) {
          this.lockedTicks += 1
          return this.creatureSignalFromTarget(lockedTarget, visionRange)
        }
      }
    }

    this.lockedTargetId = null
    this.lockedTicks = 0

    const nearest = this.findNearestCreature(creatures, visionRange)
    if (!nearest) {
      return { dist: 1, angle: 0 }
    }

    if (nearest.dist <= visionRange * LOCK_ACQUIRE_RATIO) {
      this.lockedTargetId = nearest.id
      this.lockedTicks = 1
      const target = this.findCreatureById(creatures, nearest.id)
      if (target) {
        return this.creatureSignalFromTarget(target, visionRange)
      }
    }

    return {
      dist: this.normalizeDistance(nearest.dist, visionRange),
      angle: this.normalizeAngle(nearest.angle),
    }
  }

  private computeNearestCreatureSignal(
    creatures: CreatureSenseSnapshot[],
    range: number,
  ): SignalPair {
    const nearest = this.findNearestCreature(creatures, range)
    if (!nearest) return { dist: 1, angle: 0 }
    return {
      dist: this.normalizeDistance(nearest.dist, range),
      angle: this.normalizeAngle(nearest.angle),
    }
  }

  private wrapAngle(angle: number): number {
    let diff = angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return diff
  }

  private normalizeDistance(dist: number, max: number): number {
    return max <= 0 ? 1 : Math.min(1, Math.max(0, dist / max))
  }

  private normalizeAngle(targetAngle: number): number {
    return this.wrapAngle(targetAngle - this.angle) / Math.PI
  }
}

export function resetCreatureIds(): void {
  nextCreatureId = 1
}
