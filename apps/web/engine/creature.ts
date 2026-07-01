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
const BASE_FOOD_ENERGY = 30
const REFERENCE_METABOLISM = 0.02

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
  ticksSinceMove: number
  effectiveVision: number
  effectiveMaxSpeed: number
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
    this.energy = initialEnergy
    this.age = 0
    this.generation = generation
    this.fitness = 0
    this.offspringCount = 0
    this.foodEaten = 0
    this.distanceTraveled = 0
    this.ticksSinceMove = 0
    this.effectiveVision = this.traits.visionRange
    this.effectiveMaxSpeed = this.traits.maxSpeed
    this.alive = true

    this.lastInputs = new Float32Array(INPUT_COUNT)
    this.lastOutputs = new Float32Array(OUTPUT_COUNT)
  }

  get dnaHash(): string {
    return dnaHash(this.dna)
  }

  think(
    worldWidth: number,
    worldHeight: number,
    resources: ResourceSnapshot[],
    caps: TraitCaps,
  ): void {
    this.effectiveVision = Math.min(this.traits.visionRange, caps.visionRange)
    this.effectiveMaxSpeed = Math.min(this.traits.maxSpeed, caps.maxSpeed)

    const food = this.findNearestResource(resources, "food", this.effectiveVision)
    const poison = this.findNearestResource(
      resources,
      "poison",
      this.effectiveVision,
    )

    const wallDist = Math.min(
      this.x,
      this.y,
      worldWidth - this.x,
      worldHeight - this.y,
    )

    this.lastInputs[0] = food
      ? this.normalizeDistance(food.dist, this.effectiveVision)
      : 1
    this.lastInputs[1] = food ? this.normalizeAngle(food.angle) : 0
    this.lastInputs[2] = poison
      ? this.normalizeDistance(poison.dist, this.effectiveVision)
      : 1
    this.lastInputs[3] = poison ? this.normalizeAngle(poison.angle) : 0
    this.lastInputs[4] = 1 - this.normalizeDistance(wallDist, this.effectiveVision)
    this.lastInputs[5] = this.energy / 100
    this.lastInputs[6] = caps.noiseStrength * (Math.random() * 2 - 1)

    const outputs = this.brain.forward(this.lastInputs)
    for (let i = 0; i < OUTPUT_COUNT; i++) {
      this.lastOutputs[i] = outputs[i] ?? 0
    }
  }

  act(deltaMetabolism: number): void {
    const [turnLeft, turnRight, accelerate, brake, , rest] = this.lastOutputs

    const prevX = this.x
    const prevY = this.y

    const turnForce = (turnRight! - turnLeft!) * 0.15
    this.angle += turnForce

    const accel = (accelerate! - brake!) * 0.3
    if (rest! > 0.6) {
      this.speed *= 0.9
    } else {
      this.speed += accel
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
    const movementCost =
      this.speed * 0.01 * deltaMetabolism * (0.5 + speedRatio * 0.5)
    const restBonus = rest! > 0.6 ? -0.005 * deltaMetabolism : 0

    this.energy -= metabolism + movementCost + restBonus
    this.age += 1

    if (this.energy <= 0) {
      this.alive = false
    }
  }

  tryEat(resources: ResourceSnapshot[], eatThreshold: number): boolean {
    const eatSignal = this.lastOutputs[4] ?? 0
    if (eatSignal < eatThreshold) return false

    for (let i = resources.length - 1; i >= 0; i--) {
      const resource = resources[i]!
      if (resource.type !== "food") continue

      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist < this.traits.size + 4) {
        const foodEnergy =
          BASE_FOOD_ENERGY *
          (REFERENCE_METABOLISM / this.traits.metabolism)
        this.energy = Math.min(100, this.energy + foodEnergy)
        this.foodEaten += 1
        resources.splice(i, 1)
        return true
      }
    }

    return false
  }

  tryPoison(resources: ResourceSnapshot[]): boolean {
    for (const resource of resources) {
      if (resource.type !== "poison") continue
      const dist = distance(this.x, this.y, resource.x, resource.y)
      if (dist < this.traits.size + 3) {
        this.energy -= 40
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
      this.foodEaten * 8 +
      this.age * 0.02 +
      this.offspringCount * 5 +
      this.energy * 0.05

    if (this.ticksSinceMove > 40) {
      score -= (this.ticksSinceMove - 40) * 0.05
    }

    if (this.foodEaten === 0 && this.age > 150) {
      score -= 10 + (this.age - 150) * 0.05
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
      age: this.age,
      generation: this.generation,
      fitness: this.computeFitness(),
      size: this.traits.size,
      dnaHash: this.dnaHash,
      alive: this.alive,
      foodEaten: this.foodEaten,
      distanceTraveled: this.distanceTraveled,
      ticksSinceMove: this.ticksSinceMove,
      visionRange: this.effectiveVision,
      maxSpeed: this.effectiveMaxSpeed,
      metabolism: this.traits.metabolism,
      inputs: Array.from(this.lastInputs),
      outputs: Array.from(this.lastOutputs),
      hidden: Array.from(this.brain.hidden),
      weights: Array.from(this.brain.weights),
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

  private normalizeDistance(dist: number, max: number): number {
    return Math.min(1, dist / max)
  }

  private normalizeAngle(targetAngle: number): number {
    let diff = targetAngle - this.angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return diff / Math.PI
  }
}

export function resetCreatureIds(): void {
  nextCreatureId = 1
}
