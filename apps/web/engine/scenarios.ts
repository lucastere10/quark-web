import type { SimulationConfig } from "./world"
import { DEFAULT_CONFIG } from "./world"

export interface Scenario {
  id: string
  name: string
  description: string
  config: Partial<SimulationConfig>
}

export const SCENARIOS: Scenario[] = [
  {
    id: "laboratory",
    name: "Laboratory",
    description: "Balanced defaults for general experimentation.",
    config: { ...DEFAULT_CONFIG },
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
      initialEnergy: 120,
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
  {
    id: "rocky-terrain",
    name: "Rocky Terrain",
    description: "Obstacles block direct paths — navigation must evolve.",
    config: {
      obstacleCount: 12,
      foodDensity: 90,
      poisonDensity: 12,
      selectionPressure: 0.55,
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
    populationSize: randomInt(20, 200, 10),
    mutationRate: randomFloat(0.01, 0.3, 0.01),
    mutationStrength: randomFloat(0.1, 0.5, 0.05),
    selectionPressure: randomFloat(0.1, 0.9, 0.05),
    generationLength: randomInt(200, 1200, 50),
    foodDensity: randomInt(30, 250, 10),
    poisonDensity: randomInt(0, 80, 5),
    worldWidth: randomInt(800, 1600, 50),
    worldHeight: randomInt(500, 1000, 50),
    initialEnergy: randomInt(50, 150, 5),
    visionRange: randomInt(40, 250, 10),
    maxSpeed: randomFloat(0.5, 5, 0.1),
    noiseStrength: randomFloat(0, 0.5, 0.05),
    foodDistribution: Math.random() < 0.5 ? "uniform" : "cluster",
    obstacleCount: randomInt(0, 16, 2),
    eliteCount: randomInt(0, 5, 1),
  }
}
