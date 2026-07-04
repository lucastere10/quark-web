import { angleTo, distance } from "./collision"
import {
  createRandomDNA,
  dnaHash,
  extractTraits,
  extractWeights,
  mutateDNA,
  type CreatureTraits,
} from "./genetics"
import { INPUT_COUNT, NeuralNetwork, OUTPUT_COUNT } from "./neural-network"

let nextCreatureId = 1

export type Species = "herbivore" | "carnivore"
export type ResourceType = "food" | "poison" | "meat"

export interface ResourceSnapshot {
  id: number
  x: number
  y: number
  type: ResourceType
  age?: number
  energy?: number
}

export interface ObstacleSnapshot {
  id: number
  x: number
  y: number
  radius: number
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
}

export interface ThinkOptions {
  targetedByPredator?: boolean
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
const ATTACK_ENERGY_LOSS = 55
const KILL_FEED_ENERGY_RATIO = 0.18
const ATTACK_MIN_SPEED = 0.5
const ATTACK_REACH_BONUS = 4
const LOCKED_ATTACK_REACH_BONUS = 3
const ATTACK_INSTINCT_DIST = 0.4
const LOCK_ACQUIRE_RATIO = 0.85
const LOCK_LEASH_RATIO = 1.4
const MAX_LOCK_TICKS = 400
const SEARCH_THROTTLE_FLOOR = 0.58
const SCENT_THROTTLE_FLOOR = 0.55
const SCENT_EAT_SIGNAL = 0.72

export function computeMaxEnergy(size: number): number {
  return 50 + size * 12
}

export class Creature {
  readonly id: number
  readonly species: Species
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
  killCount: number
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
    species: Species = "herbivore",
  ) {
    this.id = nextCreatureId++
    this.species = species
    this.dna = dna ?? createRandomDNA(traitDefaults)
    this.brain = new NeuralNetwork(extractWeights(this.dna))
    this.traits = extractTraits(this.dna)

    this.x = x
    this.y = y
    this.angle = Math.random() * Math.PI * 2
    this.speed = 0
    this.maxEnergy = computeMaxEnergy(this.traits.size)
    this.energy = Math.min(initialEnergy, this.maxEnergy)
    this.age = 0
    this.generation = generation
    this.fitness = 0
    this.offspringCount = 0
    this.foodEaten = 0
    this.killCount = 0
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

  syncRestingState(): void {
    this.maxEnergy = computeMaxEnergy(this.traits.size)
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
    obstacles: ObstacleSnapshot[],
    caps: TraitCaps,
    threats: CreatureSenseSnapshot[] = [],
    options: ThinkOptions = {},
  ): void {
    this.syncRestingState()
    this.effectiveVision = Math.min(this.traits.visionRange, caps.visionRange)
    this.effectiveVisionHalfAngle = (this.traits.visionHalfAngle * Math.PI) / 180
    this.effectiveScentRange = this.traits.scentRange
    this.effectiveHearingRange = this.traits.hearingRange
    const baseSpeed = Math.min(this.traits.maxSpeed, caps.maxSpeed)
    this.effectiveMaxSpeed = baseSpeed * (REF_SIZE / this.traits.size)

    const cone = this.computeConeSignal(resources, this.effectiveVision)
    const scent = this.computeScentSignal(resources, this.effectiveScentRange)
    const hazard = this.computeNearestHazard(
      worldWidth,
      worldHeight,
      obstacles,
      this.effectiveVision,
    )
    const creatureSignal = this.computeCreatureSignal(
      threats,
      this.effectiveVision,
      options.targetedByPredator ?? false,
    )
    const hearing = this.computeHearingSignal(threats, this.effectiveHearingRange)

    this.lastInputs[0] = cone.signal
    this.lastInputs[1] = cone.angle
    this.lastInputs[2] = hazard.dist
    this.lastInputs[3] = hazard.dir
    this.lastInputs[4] =
      this.maxEnergy > 0 ? this.energy / this.maxEnergy : 0
    this.lastInputs[5] =
      this.effectiveMaxSpeed > 0 ? this.speed / this.effectiveMaxSpeed : 0
    this.lastInputs[6] = creatureSignal.dist
    this.lastInputs[7] = creatureSignal.angle
    this.lastInputs[8] = creatureSignal.lockedOn
    this.lastInputs[9] = creatureSignal.lockProgress
    this.lastInputs[10] = scent.signal
    this.lastInputs[11] = scent.angle
    this.lastInputs[12] = hearing.signal
    this.lastInputs[13] = hearing.angle

    const outputs = this.brain.forward(this.lastInputs)
    for (let i = 0; i < OUTPUT_COUNT; i++) {
      this.lastOutputs[i] = outputs[i] ?? 0
    }
    this.applySpeciesInstinct()
  }

  private applySpeciesInstinct(): void {
    const threatDist = this.lastInputs[6] ?? 1
    const threatDir = this.lastInputs[7] ?? 0
    const lockedOn = (this.lastInputs[8] ?? 0) > 0.5
    const scentSignal = this.lastInputs[10] ?? 0
    const scentDir = this.lastInputs[11] ?? 0
    const steer = this.lastOutputs[0] ?? 0.5
    const throttle = this.lastOutputs[1] ?? 0.5

    if (threatDist >= 0.9) {
      if (this.species === "carnivore") {
        if (scentSignal > 0.08) {
          const scentBlend = Math.min(0.75, 0.35 + scentSignal * 0.45)
          const scentSteer = 0.5 + scentDir * 0.4
          this.lastOutputs[0] =
            steer * (1 - scentBlend) + scentSteer * scentBlend
          this.lastOutputs[1] = Math.max(
            throttle,
            SCENT_THROTTLE_FLOOR + scentSignal * 0.22,
          )
          if (scentSignal > SCENT_EAT_SIGNAL) {
            this.lastOutputs[2] = Math.max(this.lastOutputs[2] ?? 0, 0.75)
          }
        } else {
          this.lastOutputs[0] = steer * 0.4 + 0.5 * 0.6
          this.lastOutputs[1] = Math.max(
            throttle,
            SEARCH_THROTTLE_FLOOR,
          )
        }
      }
      return
    }

    const urgency = Math.min(1, (0.9 - threatDist) / 0.6)

    if (this.species === "herbivore") {
      const fleeSteer = 0.5 - threatDir * 0.4
      const fleeThrottle = 0.55 + urgency * 0.3
      this.lastOutputs[0] =
        steer * (1 - urgency * 0.65) + fleeSteer * (urgency * 0.65)
      this.lastOutputs[1] =
        throttle * (1 - urgency * 0.5) + fleeThrottle * (urgency * 0.5)
      return
    }

    const steerAuthority = 0.46
    const steerBlend = lockedOn ? 0.92 : 0.82
    const huntSteer = 0.5 + threatDir * steerAuthority
    const huntThrottle = threatDist < 0.06 ? 0.62 : 0.76 + urgency * 0.16
    const huntAttack = 0.65 + urgency * 0.3

    this.lastOutputs[0] =
      steer * (1 - steerBlend) + huntSteer * steerBlend
    this.lastOutputs[1] = Math.max(throttle, huntThrottle)
    this.lastOutputs[2] = Math.max(this.lastOutputs[2] ?? 0, huntAttack)
  }

  act(deltaMetabolism: number, options: ActOptions = {}): void {
    const [steerOut, throttleOut, , restOut] = this.lastOutputs
    const sprintCostMultiplier = options.sprintCostMultiplier ?? 1.8

    const prevX = this.x
    const prevY = this.y

    const steerRaw = ((steerOut ?? 0.5) - 0.5) * 2
    const steer =
      Math.abs(steerRaw) < STEER_DEADZONE ? 0 : steerRaw * MAX_STEER
    this.angle += steer
    this.cumulativeTurn += Math.abs(steer)

    const throttle = ((throttleOut ?? 0.5) - 0.5) * 2 * MAX_THROTTLE
    this.speed += throttle
    this.speed *= DRAG

    const coneSignal = this.lastInputs[0] ?? 0
    if (coneSignal > PROXIMITY_FOOD_SIGNAL) {
      this.speed *= 0.85
    }

    if ((restOut ?? 0) > 0.6) {
      this.speed *= REST_BRAKE
    }

    const wantsSprint =
      this.species === "carnivore" &&
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
    const metabolism = this.traits.metabolism * deltaMetabolism
    const sizeFactor = this.traits.size / REF_SIZE
    let movementCost =
      this.speed * 0.01 * deltaMetabolism * (0.5 + speedRatio * 0.5) * sizeFactor

    if (this.isSprinting) {
      movementCost *= sprintCostMultiplier
    }

    const restBonus = (restOut ?? 0) > 0.6 ? -0.005 * deltaMetabolism : 0

    this.energy -= metabolism + movementCost + restBonus
    this.age += 1

    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown -= 1
    }

    if (this.energy <= 0) {
      this.alive = false
    }
  }

  processResting(deltaMetabolism: number, digestSlowdown = 1): void {
    this.speed = 0
    this.isSprinting = false
    this.sprintTicksRemaining = 0
    const drainRate =
      this.species === "carnivore"
        ? REST_DRAIN_RATE * digestSlowdown
        : REST_DRAIN_RATE
    this.energy -= drainRate * deltaMetabolism
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

    const targetType: ResourceType =
      this.species === "herbivore" ? "food" : "meat"

    for (let i = resources.length - 1; i >= 0; i--) {
      const resource = resources[i]!
      if (resource.type !== targetType) continue
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
        resource.type === "meat"
          ? this.effectiveMaxSpeed * SPRINT_SPEED_MULTIPLIER
          : isClose
            ? EAT_SPEED_CLOSE
            : EAT_SPEED_MAX
      if (this.speed >= speedLimit) continue

      if (!isClose && resource.type !== "meat") {
        const foodAngle = angleTo(this.x, this.y, resource.x, resource.y)
        const alignment = Math.abs(this.normalizeAngle(foodAngle) * Math.PI)
        if (alignment >= EAT_ALIGNMENT) continue
      }

      const resourceEnergy =
        resource.energy ?? BASE_FOOD_ENERGY * (this.traits.size / REF_SIZE)
      this.energy += resourceEnergy
      if (this.species === "herbivore") {
        this.foodEaten += 1
      }
      const eaten = { ...resource }
      resources.splice(i, 1)
      this.syncRestingState()
      return eaten
    }

    return null
  }

  tryAttack(herbivores: Creature[]): Creature | null {
    if (this.species !== "carnivore" || this.isResting) return null

    const attackSignal = this.lastOutputs[2] ?? 0
    const preyProximity = this.lastInputs[6] ?? 1
    const instinctAttack = preyProximity < ATTACK_INSTINCT_DIST
    const lockedAttack =
      this.lockedTargetId !== null && preyProximity < ATTACK_INSTINCT_DIST * 1.4
    if (attackSignal <= 0.5 && !instinctAttack && !lockedAttack) return null

    const lockedPrey =
      this.lockedTargetId === null
        ? null
        : herbivores.find((prey) => prey.id === this.lockedTargetId)
    const candidates = lockedPrey
      ? [lockedPrey, ...herbivores.filter((prey) => prey.id !== lockedPrey.id)]
      : herbivores

    for (const prey of candidates) {
      if (!prey.alive || prey.id === this.id) continue

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

      prey.energy -= ATTACK_ENERGY_LOSS
      prey.timesAttacked += 1
      const killed = prey.energy <= 0
      if (killed) {
        prey.alive = false
        this.energy += prey.maxEnergy * KILL_FEED_ENERGY_RATIO
        this.killCount += 1
        if (this.lockedTargetId === prey.id) {
          this.lockedTargetId = null
          this.lockedTicks = 0
        }
      }

      this.speed *= 0.7
      this.syncRestingState()
      return prey
    }

    return null
  }

  tryPoison(resources: ResourceSnapshot[]): boolean {
    for (const resource of resources) {
      if (resource.type !== "poison") continue
      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist < this.traits.size + 3) {
        this.energy -= 40
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
    },
    traitDefaults?: Partial<CreatureTraits>,
  ): Creature | null {
    if (!this.alive) return null
    if (config.currentPopulation >= config.maxPopulation) return null
    if (this.reproductionCooldown > 0) return null
    const meetsReproductionThreshold =
      this.species === "herbivore"
        ? this.foodEaten >= config.minFoodToReproduce
        : this.killCount >= (config.minKillsToReproduce ?? 3)
    if (!meetsReproductionThreshold) return null
    if (this.energy < REPRODUCTION_ENERGY_RATIO * this.maxEnergy) return null

    const childDna = mutateDNA(
      this.dna,
      config.mutationRate,
      config.mutationStrength,
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
    )
    child.energy = child.maxEnergy * CHILD_ENERGY_RATIO
    child.foodEaten = 0
    child.reproductionCooldown = config.reproductionCooldownTicks

    this.energy -= this.maxEnergy * REPRODUCTION_ENERGY_COST_RATIO
    this.reproductionCooldown = config.reproductionCooldownTicks
    this.offspringCount += 1
    this.syncRestingState()

    return child
  }

  resolveObstacleCollisions(obstacles: ObstacleSnapshot[]): void {
    for (const obstacle of obstacles) {
      const dist = distance(this.x, this.y, obstacle.x, obstacle.y)
      const minDist = this.traits.size + obstacle.radius
      if (dist >= minDist || dist === 0) continue

      const nx = (this.x - obstacle.x) / dist
      const ny = (this.y - obstacle.y) / dist
      this.x = obstacle.x + nx * minDist
      this.y = obstacle.y + ny * minDist

      const vx = Math.cos(this.angle)
      const vy = Math.sin(this.angle)
      const dot = vx * nx + vy * ny
      const rx = vx - 2 * dot * nx
      const ry = vy - 2 * dot * ny
      this.angle = Math.atan2(ry, rx)
    }
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
    if (this.species === "carnivore") {
      let score =
        this.killCount * 15 +
        (this.maxEnergy > 0 ? (this.energy / this.maxEnergy) * 8 : 0) +
        this.age * 0.01

      score -= this.foodEaten * 2

      const spinRatio = this.cumulativeTurn / Math.max(this.distanceTraveled, 1)
      score -= spinRatio * 2

      if (this.ticksSinceMove > 40) {
        score -= (this.ticksSinceMove - 40) * 0.05
      }

      if (this.killCount === 0) {
        score -= this.age * 0.02
        if (this.age > 150) {
          score -= 10 + (this.age - 150) * 0.05
        }
      }

      return score
    }

    let score =
      this.foodEaten * 10 +
      this.offspringCount * 5 +
      (this.maxEnergy > 0 ? (this.energy / this.maxEnergy) * 5 : 0)

    if (this.foodEaten > 0) {
      score += this.age * 0.02
      const efficiency =
        this.foodEaten / Math.max(1, this.distanceTraveled / 100)
      score += efficiency * 3
    }

    score -= this.timesAttacked * 5

    const spinRatio = this.cumulativeTurn / Math.max(this.distanceTraveled, 1)
    score -= spinRatio * 2

    if (this.ticksSinceMove > 40) {
      score -= (this.ticksSinceMove - 40) * 0.05
    }

    if (this.foodEaten === 0) {
      score -= this.age * 0.02
      if (this.age > 150) {
        score -= 10 + (this.age - 150) * 0.05
      }
    }

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
      dnaHash: this.dnaHash,
      alive: this.alive,
      foodEaten: this.foodEaten,
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

  private computeConeSignal(
    resources: ResourceSnapshot[],
    visionRange: number,
  ): { signal: number; angle: number } {
    const halfAngle = this.effectiveVisionHalfAngle
    let bestSignal = 0
    let bestAngle = 0

    for (const resource of resources) {
      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist > visionRange) continue

      const resourceAngle = angleTo(this.x, this.y, resource.x, resource.y)
      const relativeAngle = this.relativeAngle(resourceAngle)
      if (Math.abs(relativeAngle) > halfAngle) continue

      const strength = 1 - this.normalizeDistance(dist, visionRange)
      let signed = 0
      if (resource.type === "poison") {
        signed = -strength
      } else if (this.species === "herbivore" && resource.type === "food") {
        signed = strength
      } else if (this.species === "carnivore" && resource.type === "meat") {
        signed = strength
      }

      if (Math.abs(signed) > Math.abs(bestSignal)) {
        bestSignal = signed
        bestAngle = this.normalizeAngle(resourceAngle)
      }
    }

    return { signal: bestSignal, angle: bestAngle }
  }

  private computeScentSignal(
    resources: ResourceSnapshot[],
    scentRange: number,
  ): { signal: number; angle: number } {
    const targetType: ResourceType =
      this.species === "herbivore" ? "food" : "meat"
    let bestSignal = 0
    let bestAngle = 0

    for (const resource of resources) {
      if (resource.type !== targetType) continue

      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist > scentRange) continue

      const resourceAngle = angleTo(this.x, this.y, resource.x, resource.y)
      const strength = 1 - this.normalizeDistance(dist, scentRange)
      const energyWeight =
        resource.type === "meat"
          ? Math.min(1.5, (resource.energy ?? BASE_FOOD_ENERGY) / BASE_FOOD_ENERGY)
          : 1
      const signal = Math.min(1, strength * energyWeight)

      if (signal > bestSignal) {
        bestSignal = signal
        bestAngle = this.normalizeAngle(resourceAngle)
      }
    }

    return { signal: bestSignal, angle: bestAngle }
  }

  private computeHearingSignal(
    creatures: CreatureSenseSnapshot[],
    hearingRange: number,
  ): { signal: number; angle: number } {
    let bestSignal = 0
    let bestAngle = 0

    for (const other of creatures) {
      if (other.id === this.id) continue

      const dist = distance(this.x, this.y, other.x, other.y) - other.size
      if (dist > hearingRange) continue

      const targetAngle = angleTo(this.x, this.y, other.x, other.y)
      const speedNoise = Math.min(1, other.speed / 3)
      const noise = other.noiseEmission * (0.35 + speedNoise * 0.65)
      const signal = Math.min(
        1,
        (1 - this.normalizeDistance(Math.max(0, dist), hearingRange)) * noise,
      )

      if (signal > bestSignal) {
        bestSignal = signal
        bestAngle = this.normalizeAngle(targetAngle)
      }
    }

    return { signal: bestSignal, angle: bestAngle }
  }

  private computeNearestHazard(
    worldWidth: number,
    worldHeight: number,
    obstacles: ObstacleSnapshot[],
    visionRange: number,
  ): { dist: number; dir: number } {
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

    for (const obstacle of obstacles) {
      const centerDist = distance(this.x, this.y, obstacle.x, obstacle.y)
      const edgeDist = centerDist - obstacle.radius - this.traits.size
      if (edgeDist < nearestEdgeDist) {
        nearestEdgeDist = Math.max(0, edgeDist)
        escapeAngle = angleTo(obstacle.x, obstacle.y, this.x, this.y)
      }
    }

    return {
      dist: 1 - this.normalizeDistance(nearestEdgeDist, visionRange),
      dir: this.normalizeAngle(escapeAngle),
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
    lockedOn: number,
  ): {
    dist: number
    angle: number
    lockedOn: number
    lockProgress: number
  } {
    const targetDist = Math.max(
      0,
      distance(this.x, this.y, target.x, target.y) - target.size,
    )

    return {
      dist: this.normalizeDistance(targetDist, visionRange),
      angle: this.normalizeAngle(angleTo(this.x, this.y, target.x, target.y)),
      lockedOn,
      lockProgress: lockedOn ? Math.min(1, this.lockedTicks / MAX_LOCK_TICKS) : 0,
    }
  }

  private computeCreatureSignal(
    creatures: CreatureSenseSnapshot[],
    visionRange: number,
    targetedByPredator: boolean,
  ): {
    dist: number
    angle: number
    lockedOn: number
    lockProgress: number
  } {
    if (this.species !== "carnivore") {
      const nearest = this.findNearestCreature(creatures, visionRange)
      return {
        dist: nearest ? this.normalizeDistance(nearest.dist, visionRange) : 1,
        angle: nearest ? this.normalizeAngle(nearest.angle) : 0,
        lockedOn: targetedByPredator ? 1 : 0,
        lockProgress: 0,
      }
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
          return this.creatureSignalFromTarget(lockedTarget, visionRange, 1)
        }
      }
    }

    this.lockedTargetId = null
    this.lockedTicks = 0

    const nearest = this.findNearestCreature(creatures, visionRange)
    if (!nearest) {
      return { dist: 1, angle: 0, lockedOn: 0, lockProgress: 0 }
    }

    if (nearest.dist <= visionRange * LOCK_ACQUIRE_RATIO) {
      this.lockedTargetId = nearest.id
      this.lockedTicks = 1
      const target = this.findCreatureById(creatures, nearest.id)
      if (target) {
        return this.creatureSignalFromTarget(target, visionRange, 1)
      }
    }

    return {
      dist: this.normalizeDistance(nearest.dist, visionRange),
      angle: this.normalizeAngle(nearest.angle),
      lockedOn: 0,
      lockProgress: 0,
    }
  }

  private relativeAngle(targetAngle: number): number {
    return this.wrapAngle(targetAngle - this.angle)
  }

  private wrapAngle(angle: number): number {
    let diff = angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return diff
  }

  private normalizeDistance(dist: number, max: number): number {
    return Math.min(1, dist / max)
  }

  private normalizeAngle(targetAngle: number): number {
    return this.wrapAngle(targetAngle - this.angle) / Math.PI
  }
}

export function resetCreatureIds(): void {
  nextCreatureId = 1
}
