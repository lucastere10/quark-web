import { angleTo, distance } from "./collision"
import {
  createRandomDNA,
  dnaHash,
  extractTraits,
  extractWeights,
  type CreatureTraits,
} from "./genetics"
import { INPUT_COUNT, NeuralNetwork, OUTPUT_COUNT } from "./neural-network"

let nextCreatureId = 1

export interface ResourceSnapshot {
  id: number
  x: number
  y: number
  type: "food" | "poison"
}

export interface ObstacleSnapshot {
  id: number
  x: number
  y: number
  radius: number
}

export interface TraitCaps {
  visionRange: number
  maxSpeed: number
  noiseStrength: number
}

const MOVE_THRESHOLD = 0.3
const BASE_FOOD_ENERGY = 25
const REF_SIZE = 7
const VISION_CONE_CENTERS = [-Math.PI / 3, 0, Math.PI / 3] as const
const MAX_STEER = 0.12
const MAX_THROTTLE = 0.3
const DRAG = 0.92
const REST_BRAKE = 0.85
const EAT_SPEED_MAX = 0.6
const EAT_SPEED_CLOSE = 1.0
const EAT_CLOSE_DIST = 2
const EAT_ALIGNMENT = Math.PI / 2
const REST_DRAIN_RATE = 0.8
const PROXIMITY_FOOD_DIST = 0.15

export function computeMaxEnergy(size: number): number {
  return 50 + size * 12
}

export class Creature {
  readonly id: number
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
  distanceTraveled: number
  cumulativeTurn: number
  ticksSinceMove: number
  effectiveVision: number
  effectiveMaxSpeed: number
  effectiveVisionHalfAngle: number
  maxEnergy: number
  isResting: boolean
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
  ) {
    this.id = nextCreatureId++
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
    this.distanceTraveled = 0
    this.cumulativeTurn = 0
    this.ticksSinceMove = 0
    this.effectiveVision = this.traits.visionRange
    this.effectiveMaxSpeed = this.traits.maxSpeed
    this.effectiveVisionHalfAngle = (this.traits.visionHalfAngle * Math.PI) / 180
    this.isResting = false
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
    }
  }

  think(
    worldWidth: number,
    worldHeight: number,
    resources: ResourceSnapshot[],
    obstacles: ObstacleSnapshot[],
    caps: TraitCaps,
  ): void {
    this.syncRestingState()
    this.effectiveVision = Math.min(this.traits.visionRange, caps.visionRange)
    this.effectiveVisionHalfAngle = (this.traits.visionHalfAngle * Math.PI) / 180
    const baseSpeed = Math.min(this.traits.maxSpeed, caps.maxSpeed)
    this.effectiveMaxSpeed = baseSpeed * (REF_SIZE / this.traits.size)

    const visionCone = this.computeVisionCone(resources, this.effectiveVision)
    const foodScent = this.computeFoodScent(resources, this.effectiveVision)
    const food = this.findNearestResource(resources, "food", this.effectiveVision)
    const poison = this.findNearestResource(
      resources,
      "poison",
      this.effectiveVision,
    )
    const wall = this.computeWallProximity(
      worldWidth,
      worldHeight,
      this.effectiveVision,
    )
    const obstacle = this.findNearestObstacle(obstacles, this.effectiveVision)

    this.lastInputs[0] = visionCone[0]!
    this.lastInputs[1] = visionCone[1]!
    this.lastInputs[2] = visionCone[2]!
    this.lastInputs[3] = foodScent
    this.lastInputs[4] = food
      ? this.normalizeDistance(food.dist, this.effectiveVision)
      : 1
    this.lastInputs[5] = food ? this.normalizeAngle(food.angle) : 0
    this.lastInputs[6] = poison
      ? this.normalizeDistance(poison.dist, this.effectiveVision)
      : 1
    this.lastInputs[7] = poison ? this.normalizeAngle(poison.angle) : 0
    this.lastInputs[8] = wall.dist
    this.lastInputs[9] = wall.dir
    this.lastInputs[10] = obstacle
      ? this.normalizeDistance(obstacle.dist, this.effectiveVision)
      : 1
    this.lastInputs[11] = obstacle ? this.normalizeAngle(obstacle.angle) : 0
    this.lastInputs[12] =
      this.maxEnergy > 0 ? this.energy / this.maxEnergy : 0
    this.lastInputs[13] =
      this.effectiveMaxSpeed > 0 ? this.speed / this.effectiveMaxSpeed : 0

    const outputs = this.brain.forward(this.lastInputs)
    for (let i = 0; i < OUTPUT_COUNT; i++) {
      this.lastOutputs[i] = outputs[i] ?? 0
    }
  }

  act(deltaMetabolism: number): void {
    const [steerOut, throttleOut, , restOut] = this.lastOutputs

    const prevX = this.x
    const prevY = this.y

    const steer = ((steerOut ?? 0.5) - 0.5) * 2 * MAX_STEER
    this.angle += steer
    this.cumulativeTurn += Math.abs(steer)

    const throttle = ((throttleOut ?? 0.5) - 0.5) * 2 * MAX_THROTTLE
    this.speed += throttle
    this.speed *= DRAG

    const nearestFoodDist = this.lastInputs[4] ?? 1
    if (nearestFoodDist < PROXIMITY_FOOD_DIST) {
      this.speed *= 0.85
    }

    if ((restOut ?? 0) > 0.6) {
      this.speed *= REST_BRAKE
    }

    this.speed = Math.max(
      0,
      Math.min(this.speed, this.effectiveMaxSpeed),
    )

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
    const movementCost =
      this.speed * 0.01 * deltaMetabolism * (0.5 + speedRatio * 0.5) * sizeFactor
    const restBonus = (restOut ?? 0) > 0.6 ? -0.005 * deltaMetabolism : 0

    this.energy -= metabolism + movementCost + restBonus
    this.age += 1

    if (this.energy <= 0) {
      this.alive = false
    }
  }

  processResting(deltaMetabolism: number): void {
    this.speed = 0
    this.energy -= REST_DRAIN_RATE * deltaMetabolism
    this.age += 1
    this.ticksSinceMove += 1

    this.syncRestingState()

    if (this.energy <= 0) {
      this.alive = false
    }
  }

  tryEat(resources: ResourceSnapshot[]): boolean {
    const eatSignal = this.lastOutputs[2] ?? 0
    if (eatSignal <= 0.5) return false

    for (let i = resources.length - 1; i >= 0; i--) {
      const resource = resources[i]!
      if (resource.type !== "food") continue

      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist >= this.traits.size + 4) continue

      const isClose = dist < this.traits.size + EAT_CLOSE_DIST
      const speedLimit = isClose ? EAT_SPEED_CLOSE : EAT_SPEED_MAX
      if (this.speed >= speedLimit) continue

      if (!isClose) {
        const foodAngle = angleTo(this.x, this.y, resource.x, resource.y)
        const alignment = Math.abs(this.normalizeAngle(foodAngle) * Math.PI)
        if (alignment >= EAT_ALIGNMENT) continue
      }

      const foodEnergy = BASE_FOOD_ENERGY * (this.traits.size / REF_SIZE)
      this.energy += foodEnergy
      this.foodEaten += 1
      resources.splice(i, 1)
      this.syncRestingState()
      return true
    }

    return false
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
      dnaHash: this.dnaHash,
      alive: this.alive,
      foodEaten: this.foodEaten,
      distanceTraveled: this.distanceTraveled,
      cumulativeTurn: this.cumulativeTurn,
      ticksSinceMove: this.ticksSinceMove,
      visionRange: this.effectiveVision,
      visionHalfAngle: this.traits.visionHalfAngle,
      maxSpeed: this.effectiveMaxSpeed,
      metabolism: this.traits.metabolism,
      isResting: this.isResting,
      inputs: Array.from(this.lastInputs),
      outputs: Array.from(this.lastOutputs),
      hidden: Array.from(this.brain.hidden),
      weights: Array.from(this.brain.weights),
    }
  }

  private computeVisionCone(
    resources: ResourceSnapshot[],
    visionRange: number,
  ): [number, number, number] {
    const cone: [number, number, number] = [0, 0, 0]
    const halfAngle = this.effectiveVisionHalfAngle

    for (const resource of resources) {
      if (resource.type !== "food") continue

      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist > visionRange) continue

      const resourceAngle = angleTo(this.x, this.y, resource.x, resource.y)
      const relativeAngle = this.relativeAngle(resourceAngle)
      const signal = 1 - this.normalizeDistance(dist, visionRange)

      for (let i = 0; i < VISION_CONE_CENTERS.length; i++) {
        const center = VISION_CONE_CENTERS[i]!
        const delta = this.wrapAngle(relativeAngle - center)
        if (Math.abs(delta) <= halfAngle) {
          cone[i] = Math.max(cone[i]!, signal)
        }
      }
    }

    return cone
  }

  private computeFoodScent(
    resources: ResourceSnapshot[],
    visionRange: number,
  ): number {
    let sumX = 0
    let sumY = 0

    for (const resource of resources) {
      if (resource.type !== "food") continue

      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist > visionRange || dist < 1) continue

      const weight = 1 / (dist * dist)
      const resourceAngle = angleTo(this.x, this.y, resource.x, resource.y)
      sumX += Math.cos(resourceAngle) * weight
      sumY += Math.sin(resourceAngle) * weight
    }

    if (sumX === 0 && sumY === 0) return 0

    const scentAngle = Math.atan2(sumY, sumX)
    return this.normalizeAngle(scentAngle)
  }

  private computeWallProximity(
    worldWidth: number,
    worldHeight: number,
    visionRange: number,
  ): { dist: number; dir: number } {
    const left = this.x
    const right = worldWidth - this.x
    const top = this.y
    const bottom = worldHeight - this.y

    const wallDist = Math.min(left, right, top, bottom)
    const dist = 1 - this.normalizeDistance(wallDist, visionRange)

    let escapeAngle = this.angle

    if (wallDist === left) {
      escapeAngle = 0
    } else if (wallDist === right) {
      escapeAngle = Math.PI
    } else if (wallDist === top) {
      escapeAngle = Math.PI / 2
    } else if (wallDist === bottom) {
      escapeAngle = -Math.PI / 2
    }

    return {
      dist,
      dir: this.normalizeAngle(escapeAngle),
    }
  }

  private findNearestObstacle(
    obstacles: ObstacleSnapshot[],
    visionRange: number,
  ): { dist: number; angle: number } | null {
    let nearestEdgeDist = Infinity
    let nearestAngle = 0

    for (const obstacle of obstacles) {
      const centerDist = distance(this.x, this.y, obstacle.x, obstacle.y)
      const edgeDist = centerDist - obstacle.radius - this.traits.size
      if (edgeDist > visionRange || edgeDist >= nearestEdgeDist) continue

      nearestEdgeDist = edgeDist
      nearestAngle = angleTo(this.x, this.y, obstacle.x, obstacle.y)
    }

    if (nearestEdgeDist === Infinity) return null
    return {
      dist: Math.max(0, nearestEdgeDist),
      angle: nearestAngle,
    }
  }

  private findNearestResource(
    resources: ResourceSnapshot[],
    type: "food" | "poison",
    visionRange: number,
  ): { dist: number; angle: number } | null {
    let nearestDist = Infinity
    let nearestAngle = 0

    for (const resource of resources) {
      if (resource.type !== type) continue
      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist <= visionRange && dist < nearestDist) {
        nearestDist = dist
        nearestAngle = angleTo(this.x, this.y, resource.x, resource.y)
      }
    }

    if (nearestDist === Infinity) return null
    return { dist: nearestDist, angle: nearestAngle }
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
