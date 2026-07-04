import type { SimulationConfig } from "./world"
import { DEFAULT_CONFIG } from "./world"

export type SimulationDynamics = "evolutionary" | "predator-prey"

export interface Scenario {
  id: string
  name: string
  description: string
  config: Partial<SimulationConfig>
}

const PREDATOR_RATIO = 0.2

function splitPredatorPreyPopulation(totalPopulation: number): {
  herbivorePop: number
  carnivorePop: number
} {
  const population = Math.max(1, Math.round(totalPopulation))
  const maxCarnivores = Math.max(0, population - 2)
  const targetCarnivores = Math.max(2, Math.round(population * PREDATOR_RATIO))
  const carnivorePop = Math.min(targetCarnivores, maxCarnivores)

  return {
    herbivorePop: Math.max(1, population - carnivorePop),
    carnivorePop,
  }
}

export function applyDynamics(
  config: SimulationConfig,
  dynamics: SimulationDynamics,
): SimulationConfig {
  if (dynamics === "evolutionary") {
    return {
      ...config,
      herbivorePop: config.populationSize,
      carnivorePop: 0,
    }
  }

  return {
    ...config,
    ...splitPredatorPreyPopulation(config.populationSize),
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: "laboratory",
    name: "Laboratory",
    description: "Balanced defaults for general experimentation.",
    config: {
      populationSize: DEFAULT_CONFIG.populationSize,
      mutationRate: DEFAULT_CONFIG.mutationRate,
      mutationStrength: DEFAULT_CONFIG.mutationStrength,
      selectionPressure: DEFAULT_CONFIG.selectionPressure,
      generationLength: DEFAULT_CONFIG.generationLength,
      foodDensity: DEFAULT_CONFIG.foodDensity,
      poisonDensity: DEFAULT_CONFIG.poisonDensity,
      worldWidth: DEFAULT_CONFIG.worldWidth,
      worldHeight: DEFAULT_CONFIG.worldHeight,
      initialEnergy: DEFAULT_CONFIG.initialEnergy,
      visionRange: DEFAULT_CONFIG.visionRange,
      maxSpeed: DEFAULT_CONFIG.maxSpeed,
      noiseStrength: DEFAULT_CONFIG.noiseStrength,
      foodDistribution: DEFAULT_CONFIG.foodDistribution,
      obstacleCount: DEFAULT_CONFIG.obstacleCount,
      eliteCount: DEFAULT_CONFIG.eliteCount,
      sprintCostMultiplier: DEFAULT_CONFIG.sprintCostMultiplier,
      digestSlowdown: DEFAULT_CONFIG.digestSlowdown,
      minFoodToReproduce: DEFAULT_CONFIG.minFoodToReproduce,
      reproductionCooldownTicks: DEFAULT_CONFIG.reproductionCooldownTicks,
      vegetationGrowthRate: DEFAULT_CONFIG.vegetationGrowthRate,
      vegetationSpreadRadius: DEFAULT_CONFIG.vegetationSpreadRadius,
      fertilityDriftRate: DEFAULT_CONFIG.fertilityDriftRate,
    },
  },
  {
    id: "garden",
    name: "Garden",
    description: "Abundant food, minimal poison — easy survival.",
    config: {
      foodDensity: 200,
      poisonDensity: 5,
      selectionPressure: 0.3,
    },
  },
  {
    id: "toxic-marsh",
    name: "Toxic Marsh",
    description: "Scarce food, heavy poison — only the cautious survive.",
    config: {
      foodDensity: 50,
      poisonDensity: 60,
      initialEnergy: 70,
    },
  },
  {
    id: "fast-evolution",
    name: "Fast Evolution",
    description: "Short generations and high mutation for rapid change.",
    config: {
      generationLength: 300,
      mutationRate: 0.2,
      mutationStrength: 0.4,
    },
  },
  {
    id: "harsh-selection",
    name: "Harsh Selection",
    description: "Strong selection pressure with limited resources.",
    config: {
      selectionPressure: 0.8,
      foodDensity: 60,
      poisonDensity: 30,
      herbivorePop: 15,
      populationSize: 15,
    },
  },
  {
    id: "open-plains",
    name: "Open Plains",
    description: "Large world, fast creatures, sparse food.",
    config: {
      worldWidth: 1600,
      worldHeight: 1000,
      foodDensity: 70,
      poisonDensity: 10,
      maxSpeed: 4,
      visionRange: 180,
      herbivorePop: 15,
      populationSize: 15,
    },
  },
  {
    id: "foraging-grounds",
    name: "Foraging Grounds",
    description: "Clustered food patches reward migration and local search.",
    config: {
      foodDistribution: "cluster",
      foodDensity: 100,
      poisonDensity: 15,
      selectionPressure: 0.45,
    },
  },
]

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

function randomInt(min: number, max: number, step: number): number {
  const steps = Math.floor((max - min) / step)
  return min + Math.floor(Math.random() * (steps + 1)) * step
}

function randomFloat(min: number, max: number, step: number): number {
  const value = min + Math.random() * (max - min)
  return Math.round(value / step) * step
}

export function randomizeConfig(): Partial<SimulationConfig> {
  return {
    populationSize: randomInt(10, 60, 5),
    mutationRate: randomFloat(0.01, 0.3, 0.01),
    mutationStrength: randomFloat(0.1, 0.5, 0.05),
    selectionPressure: randomFloat(0.1, 0.9, 0.05),
    generationLength: randomInt(200, 1200, 50),
    foodDensity: randomInt(30, 250, 10),
    poisonDensity: randomInt(0, 80, 5),
    worldWidth: randomInt(800, 1600, 50),
    worldHeight: randomInt(500, 1000, 50),
    initialEnergy: randomInt(50, 100, 5),
    visionRange: randomInt(40, 250, 10),
    maxSpeed: randomFloat(0.5, 5, 0.1),
    noiseStrength: randomFloat(0, 0.5, 0.05),
    foodDistribution: Math.random() < 0.5 ? "uniform" : "cluster",
    obstacleCount: randomInt(0, 16, 2),
    eliteCount: randomInt(0, 5, 1),
    minFoodToReproduce: randomInt(2, 6, 1),
    reproductionCooldownTicks: randomInt(150, 400, 25),
    ecosystemMode: Math.random() < 0.25,
    vegetationGrowthRate: randomInt(80, 360, 20),
    vegetationSpreadRadius: randomInt(30, 160, 10),
    fertilityDriftRate: randomFloat(0, 1.5, 0.1),
  }
}
