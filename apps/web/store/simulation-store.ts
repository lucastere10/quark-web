import { create } from "zustand"

import {
  applyDynamics,
  getScenarioById,
  randomizeConfig as generateRandomConfig,
  type SimulationDynamics,
} from "@/engine/scenarios"
import type {
  ClimateState,
  FertilityCellSnapshot,
  KillEventSnapshot,
  SimulationConfig,
  SimulationEvent,
  WorldStats,
} from "@/engine/world"
import { DEFAULT_CONFIG } from "@/engine/world"

export type SimulationPhase = "idle" | "active" | "ended"

const DEFAULT_SCENARIO_ID = "laboratory"
const DEFAULT_DYNAMICS: SimulationDynamics = "evolutionary"
const INSPECTOR_MINIMIZED_KEY = "quark.creatureInspector.minimized"
const MAX_STATS_HISTORY_POINTS = 180
const defaultScenario = getScenarioById(DEFAULT_SCENARIO_ID)

function getStoredInspectorMinimized(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(INSPECTOR_MINIMIZED_KEY) === "true"
}

function storeInspectorMinimized(minimized: boolean): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(INSPECTOR_MINIMIZED_KEY, String(minimized))
}

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
  species: "herbivore" | "omnivore" | "carnivore"
  familyId: string
  dnaHash: string
  alive: boolean
  foodEaten: number
  meatEaten: number
  carrionEaten: number
  killCount: number
  timesAttacked: number
  distanceTraveled: number
  ticksSinceMove: number
  visionRange: number
  visionHalfAngle: number
  scentRange: number
  hearingRange: number
  noiseEmission: number
  maxSpeed: number
  metabolism: number
  perceptionScore: number
  biomechanicsScore: number
  metabolismScore: number
  perceptionAccuracy: number
  acceleration: number
  agility: number
  strength: number
  endurance: number
  plantDigestEfficiency: number
  meatDigestEfficiency: number
  carrionDigestEfficiency: number
  toxinResistance: number
  energyStorage: number
  predationDrive: number
  isResting: boolean
  isSprinting: boolean
  isLocked: boolean
  lockedTargetId: number | null
  lockedTicks: number
  inputs: number[]
  outputs: number[]
  hidden: number[]
  weights: number[]
}

export interface ResourceRenderSnapshot {
  id: number
  x: number
  y: number
  type: "food" | "poison" | "meat" | "carrion"
  age?: number
  energy?: number
}

export type KillEventRenderSnapshot = KillEventSnapshot
export type SimulationEventSnapshot = SimulationEvent

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
  finalAveragePerception: number
  finalAverageBiomechanics: number
  finalAverageMetabolismScore: number
  finalAveragePredationDrive: number
  peakAverageSize: number
  peakAveragePerception: number
  statsHistory: StatsHistoryPoint[]
}

interface SimulationStore {
  config: SimulationConfig
  stats: WorldStats
  creatures: CreatureSnapshot[]
  resources: ResourceRenderSnapshot[]
  killEvents: KillEventRenderSnapshot[]
  simulationEvents: SimulationEventSnapshot[]
  fertility: FertilityCellSnapshot[]
  statsHistory: StatsHistoryPoint[]
  selectedCreatureId: number | null
  selectedScenarioId: string | null
  simulationDynamics: SimulationDynamics
  isRunning: boolean
  isInitialized: boolean
  phase: SimulationPhase
  simulationSpeed: number
  sessionSummary: SessionSummary | null
  brainPanelOpen: boolean
  inspectorMinimized: boolean
  previewSpawnToken: number

  setConfig: (partial: Partial<SimulationConfig>) => void
  setStats: (stats: WorldStats) => void
  setCreatures: (creatures: CreatureSnapshot[]) => void
  setResources: (resources: ResourceRenderSnapshot[]) => void
  setKillEvents: (events: KillEventRenderSnapshot[]) => void
  pushSimulationEvents: (events: SimulationEventSnapshot[]) => void
  setFertility: (fertility: FertilityCellSnapshot[]) => void
  recordStatsSample: (stats: WorldStats) => void
  pushStatsHistory: (stats: WorldStats) => void
  selectCreature: (id: number | null) => void
  setRunning: (running: boolean) => void
  setInitialized: (initialized: boolean) => void
  resetHistory: () => void
  setPhase: (phase: SimulationPhase) => void
  setSimulationSpeed: (speed: number) => void
  setSessionSummary: (summary: SessionSummary | null) => void
  setBrainPanelOpen: (open: boolean) => void
  setInspectorMinimized: (minimized: boolean) => void
  hydrateInspectorMinimized: () => void
  setDynamics: (dynamics: SimulationDynamics) => void
  applyScenario: (scenarioId: string) => void
  randomizeConfig: () => void
  enterIdlePreview: () => void
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  config: applyDynamics(
    { ...DEFAULT_CONFIG, ...defaultScenario?.config },
    DEFAULT_DYNAMICS,
  ),
  stats: {
    generation: 0,
    population: 0,
    herbivorePopulation: 0,
    omnivorePopulation: 0,
    carnivorePopulation: 0,
    bestFitness: 0,
    averageFitness: 0,
    averageFoodEaten: 0,
    averageMeatEaten: 0,
    averageCarrionEaten: 0,
    averageKillCount: 0,
    survivalRate: 0,
    averageLifespan: 0,
    speciesDiversity: 0,
    tick: 0,
    averageSize: 0,
    averageVisionRange: 0,
    averageVisionHalfAngle: 0,
    averageMaxSpeed: 0,
    averageMetabolism: 0,
    averagePerceptionScore: 0,
    averageBiomechanicsScore: 0,
    averageMetabolismScore: 0,
    averagePredationDrive: 0,
    averageCarrionDigestEfficiency: 0,
    averageToxinResistance: 0,
    potentialHunterPopulation: 0,
    meatCapablePopulation: 0,
    failedAttackEvents: 0,
    carrionResources: 0,
    totalBirths: 0,
    totalDeaths: 0,
    climate: {
      humidity: 0.55,
      temperature: 0.5,
      rainfall: 0.25,
      drought: 0.35,
      trend: "stable",
      growthModifier: 1,
      metabolismModifier: 1,
      visionModifier: 1,
      scentModifier: 1,
      decayModifier: 1,
    } satisfies ClimateState,
    speciesFamilies: [],
  },
  creatures: [],
  resources: [],
  killEvents: [],
  simulationEvents: [],
  fertility: [],
  statsHistory: [],
  selectedCreatureId: null,
  selectedScenarioId: DEFAULT_SCENARIO_ID,
  simulationDynamics: DEFAULT_DYNAMICS,
  isRunning: false,
  isInitialized: false,
  phase: "idle",
  simulationSpeed: 1,
  sessionSummary: null,
  brainPanelOpen: false,
  inspectorMinimized: false,
  previewSpawnToken: 0,

  setConfig: (partial) =>
    set((state) => ({
      config: applyDynamics(
        { ...state.config, ...partial },
        state.simulationDynamics,
      ),
    })),

  setStats: (stats) => set({ stats }),

  setCreatures: (creatures) => set({ creatures }),

  setResources: (resources) => set({ resources }),

  setKillEvents: (killEvents) => set({ killEvents }),

  pushSimulationEvents: (events) =>
    set((state) => ({
      simulationEvents: [...state.simulationEvents, ...events].slice(-6),
    })),

  setFertility: (fertility) => set({ fertility }),

  recordStatsSample: (stats) =>
    set((state) => {
      const point: StatsHistoryPoint = {
        ...stats,
        timestamp: Date.now(),
      }
      const history = [...state.statsHistory, point]
      if (history.length > MAX_STATS_HISTORY_POINTS) {
        history.shift()
      }
      return { stats, statsHistory: history }
    }),

  pushStatsHistory: (stats) =>
    set((state) => {
      const point: StatsHistoryPoint = {
        ...stats,
        timestamp: Date.now(),
      }
      const history = [...state.statsHistory, point]
      if (history.length > MAX_STATS_HISTORY_POINTS) {
        history.shift()
      }
      return { statsHistory: history }
    }),

  selectCreature: (id) =>
    set({
      selectedCreatureId: id,
      brainPanelOpen: false,
    }),

  setRunning: (running) => set({ isRunning: running }),

  setInitialized: (initialized) => set({ isInitialized: initialized }),

  resetHistory: () => set({ statsHistory: [], simulationEvents: [] }),

  setPhase: (phase) => set({ phase }),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  setSessionSummary: (summary) => set({ sessionSummary: summary }),

  setBrainPanelOpen: (open) => set({ brainPanelOpen: open }),

  setInspectorMinimized: (inspectorMinimized) => {
    storeInspectorMinimized(inspectorMinimized)
    set({ inspectorMinimized })
  },

  hydrateInspectorMinimized: () =>
    set({ inspectorMinimized: getStoredInspectorMinimized() }),

  setDynamics: (simulationDynamics) =>
    set((state) => ({
      simulationDynamics,
      config: applyDynamics(state.config, simulationDynamics),
      previewSpawnToken: state.previewSpawnToken + 1,
    })),

  applyScenario: (scenarioId) => {
    const scenario = getScenarioById(scenarioId)
    if (!scenario) return
    set((state) => ({
      config: applyDynamics(
        { ...state.config, ...scenario.config },
        state.simulationDynamics,
      ),
      selectedScenarioId: scenarioId,
      previewSpawnToken: state.previewSpawnToken + 1,
    }))
  },

  randomizeConfig: () => {
    const randomConfig = generateRandomConfig()
    set((state) => ({
      config: applyDynamics(
        { ...state.config, ...randomConfig },
        state.simulationDynamics,
      ),
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
      killEvents: [],
      simulationEvents: [],
    }),
}))
