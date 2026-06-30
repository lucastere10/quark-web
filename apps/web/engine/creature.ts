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
  alive: boolean

  lastInputs: Float32Array
  lastOutputs: Float32Array

  constructor(
    x: number,
    y: number,
    dna?: Float32Array,
    generation = 0,
    initialEnergy = 100,
  ) {
    this.id = nextCreatureId++
    this.dna = dna ?? createRandomDNA()
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
    visionRange: number,
  ): void {
    const food = this.findNearestResource(resources, "food", visionRange)
    const poison = this.findNearestResource(resources, "poison", visionRange)

    const wallDist = Math.min(
      this.x,
      this.y,
      worldWidth - this.x,
      worldHeight - this.y,
    )

    this.lastInputs[0] = food ? this.normalizeDistance(food.dist, visionRange) : 1
    this.lastInputs[1] = food ? this.normalizeAngle(food.angle) : 0
    this.lastInputs[2] = poison
      ? this.normalizeDistance(poison.dist, visionRange)
      : 1
    this.lastInputs[3] = poison ? this.normalizeAngle(poison.angle) : 0
    this.lastInputs[4] = 1 - this.normalizeDistance(wallDist, visionRange)
    this.lastInputs[5] = this.energy / 100
    this.lastInputs[6] = Math.random() * 2 - 1

    const outputs = this.brain.forward(this.lastInputs)
    for (let i = 0; i < OUTPUT_COUNT; i++) {
      this.lastOutputs[i] = outputs[i] ?? 0
    }
  }

  act(deltaMetabolism: number): void {
    const [turnLeft, turnRight, accelerate, brake, , rest] = this.lastOutputs

    const turnForce = (turnRight! - turnLeft!) * 0.15
    this.angle += turnForce

    const accel = (accelerate! - brake!) * 0.3
    if (rest! > 0.6) {
      this.speed *= 0.9
    } else {
      this.speed += accel
    }

    this.speed = Math.max(0, Math.min(this.speed, this.traits.maxSpeed))

    this.x += Math.cos(this.angle) * this.speed
    this.y += Math.sin(this.angle) * this.speed

    const metabolism = this.traits.metabolism * deltaMetabolism
    const movementCost = this.speed * 0.01 * deltaMetabolism
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
        this.energy = Math.min(100, this.energy + 30)
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
    return (
      this.foodEaten * 2 +
      this.age * 0.1 +
      this.offspringCount * 5 +
      this.energy * 0.05
    )
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
