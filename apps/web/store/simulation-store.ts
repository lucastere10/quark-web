import { create } from "zustand"

import {
  getScenarioById,
  randomizeConfig as generateRandomConfig,
} from "@/engine/scenarios"
import type { SimulationConfig, WorldStats } from "@/engine/world"
import { DEFAULT_CONFIG } from "@/engine/world"

export type SimulationPhase = "idle" | "active" | "ended"

export interface CreatureSnapshot {
  id: number
  x: number
  y: number
  angle: number
  energy: number
  maxEnergy: number
  age: number
  generation: number
  fitness: number
  size: number
  dnaHash: string
  alive: boolean
  foodEaten: number
  distanceTraveled: number
  ticksSinceMove: number
  visionRange: number
  visionHalfAngle: number
  maxSpeed: number
  metabolism: number
  isResting: boolean
  inputs: number[]
  outputs: number[]
  hidden: number[]
  weights: number[]
}

export interface ResourceRenderSnapshot {
  id: number
  x: number
  y: number
  type: "food" | "poison"
}

export interface ObstacleRenderSnapshot {
  id: number
  x: number
  y: number
  radius: number
}

export interface StatsHistoryPoint extends WorldStats {
  timestamp: number
}

export interface SessionSummary {
  generationsReached: number
  peakFitness: number
  finalPopulation: number
  averageLifespan: number
  survivalRate: number
  peakPopulation: number
  finalAverageSize: number
  finalAverageVision: number
  finalAverageVisionAngle: number
  finalAverageSpeed: number
  finalAverageMetabolism: number
  peakAverageSize: number
  peakAverageVision: number
  statsHistory: StatsHistoryPoint[]
}

interface SimulationStore {
  config: SimulationConfig
  stats: WorldStats
  creatures: CreatureSnapshot[]
  resources: ResourceRenderSnapshot[]
  obstacles: ObstacleRenderSnapshot[]
  statsHistory: StatsHistoryPoint[]
  selectedCreatureId: number | null
  selectedScenarioId: string | null
  isRunning: boolean
  isInitialized: boolean
  phase: SimulationPhase
  simulationSpeed: number
  sessionSummary: SessionSummary | null
  brainPanelOpen: boolean
  previewSpawnToken: number

  setConfig: (partial: Partial<SimulationConfig>) => void
  setStats: (stats: WorldStats) => void
  setCreatures: (creatures: CreatureSnapshot[]) => void
  setResources: (resources: ResourceRenderSnapshot[]) => void
  setObstacles: (obstacles: ObstacleRenderSnapshot[]) => void
  pushStatsHistory: (stats: WorldStats) => void
  selectCreature: (id: number | null) => void
  setRunning: (running: boolean) => void
  setInitialized: (initialized: boolean) => void
  resetHistory: () => void
  setPhase: (phase: SimulationPhase) => void
  setSimulationSpeed: (speed: number) => void
  setSessionSummary: (summary: SessionSummary | null) => void
  setBrainPanelOpen: (open: boolean) => void
  applyScenario: (scenarioId: string) => void
  randomizeConfig: () => void
  enterIdlePreview: () => void
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  config: { ...DEFAULT_CONFIG },
  stats: {
    generation: 0,
    population: 0,
    bestFitness: 0,
    averageFitness: 0,
    averageFoodEaten: 0,
    survivalRate: 0,
    averageLifespan: 0,
    speciesDiversity: 0,
    tick: 0,
    averageSize: 0,
    averageVisionRange: 0,
    averageVisionHalfAngle: 0,
    averageMaxSpeed: 0,
    averageMetabolism: 0,
  },
  creatures: [],
  resources: [],
  obstacles: [],
  statsHistory: [],
  selectedCreatureId: null,
  selectedScenarioId: "laboratory",
  isRunning: false,
  isInitialized: false,
  phase: "idle",
  simulationSpeed: 1,
  sessionSummary: null,
  brainPanelOpen: false,
  previewSpawnToken: 0,

  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  setStats: (stats) => set({ stats }),

  setCreatures: (creatures) => set({ creatures }),

  setResources: (resources) => set({ resources }),

  setObstacles: (obstacles) => set({ obstacles }),

  pushStatsHistory: (stats) =>
    set((state) => {
      const point: StatsHistoryPoint = {
        ...stats,
        timestamp: Date.now(),
      }
      const history = [...state.statsHistory, point]
      if (history.length > 240) {
        history.shift()
      }
      return { statsHistory: history }
    }),

  selectCreature: (id) =>
    set({ selectedCreatureId: id, brainPanelOpen: false }),

  setRunning: (running) => set({ isRunning: running }),

  setInitialized: (initialized) => set({ isInitialized: initialized }),

  resetHistory: () => set({ statsHistory: [] }),

  setPhase: (phase) => set({ phase }),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  setSessionSummary: (summary) => set({ sessionSummary: summary }),

  setBrainPanelOpen: (open) => set({ brainPanelOpen: open }),

  applyScenario: (scenarioId) => {
    const scenario = getScenarioById(scenarioId)
    if (!scenario) return
    set((state) => ({
      config: { ...state.config, ...scenario.config },
      selectedScenarioId: scenarioId,
      previewSpawnToken: state.previewSpawnToken + 1,
    }))
  },

  randomizeConfig: () => {
    const randomConfig = generateRandomConfig()
    set((state) => ({
      config: { ...state.config, ...randomConfig },
      selectedScenarioId: null,
      previewSpawnToken: state.previewSpawnToken + 1,
    }))
  },

  enterIdlePreview: () =>
    set({
      phase: "idle",
      isRunning: false,
      sessionSummary: null,
      selectedCreatureId: null,
      brainPanelOpen: false,
    }),
}))
