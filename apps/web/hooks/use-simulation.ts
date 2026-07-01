"use client"

import { useCallback, useEffect, useRef } from "react"

import { World } from "@/engine/world"
import {
  type CreatureSnapshot,
  type ObstacleRenderSnapshot,
  type ResourceRenderSnapshot,
  type SessionSummary,
  useSimulationStore,
} from "@/store/simulation-store"

const BASE_TICKS_PER_FRAME = 2
const STATS_INTERVAL = 10
const PREVIEW_SPAWN_INTERVAL_MS = 35
const PREVIEW_CREATURES_PER_TICK = 4
const PREVIEW_RESOURCES_PER_TICK = 12

function syncWorldToStore(world: World) {
  const store = useSimulationStore.getState()
  store.setStats(world.getStats())
  store.setCreatures(world.creatures.map((c) => c.toSnapshot()))
  store.setResources([...world.resources])
  store.setObstacles([...world.obstacles])
}

function buildSessionSummary(
  statsHistory: SessionSummary["statsHistory"],
  finalStats: ReturnType<World["getStats"]>,
): SessionSummary {
  const peakFitness = statsHistory.reduce(
    (max, point) => Math.max(max, point.bestFitness),
    finalStats.bestFitness,
  )
  const peakPopulation = statsHistory.reduce(
    (max, point) => Math.max(max, point.population),
    finalStats.population,
  )

  return {
    generationsReached: finalStats.generation,
    peakFitness,
    finalPopulation: finalStats.population,
    averageLifespan: finalStats.averageLifespan,
    survivalRate: finalStats.survivalRate,
    peakPopulation,
    statsHistory: [...statsHistory],
  }
}

export function useSimulation() {
  const worldRef = useRef<World | null>(null)
  const frameRef = useRef<number | null>(null)
  const tickCounterRef = useRef(0)
  const tickAccumulatorRef = useRef(0)
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSpawnTokenRef = useRef(0)

  const config = useSimulationStore((s) => s.config)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isInitialized = useSimulationStore((s) => s.isInitialized)
  const phase = useSimulationStore((s) => s.phase)
  const simulationSpeed = useSimulationStore((s) => s.simulationSpeed)
  const previewSpawnToken = useSimulationStore((s) => s.previewSpawnToken)

  const cancelPreviewTransition = useCallback(() => {
    if (previewTimerRef.current !== null) {
      clearInterval(previewTimerRef.current)
      previewTimerRef.current = null
    }
  }, [])

  const startPreviewTransition = useCallback(
    (
      allCreatures: CreatureSnapshot[],
      allResources: ResourceRenderSnapshot[],
      allObstacles: ObstacleRenderSnapshot[],
      stats: ReturnType<World["getStats"]>,
    ) => {
      cancelPreviewTransition()

      const store = useSimulationStore.getState()
      store.setStats(stats)
      store.setCreatures([])
      store.setResources([])
      store.setObstacles(allObstacles)
      store.selectCreature(null)

      let creatureIndex = 0
      let resourceIndex = 0

      previewTimerRef.current = setInterval(() => {
        creatureIndex = Math.min(
          allCreatures.length,
          creatureIndex + PREVIEW_CREATURES_PER_TICK,
        )
        resourceIndex = Math.min(
          allResources.length,
          resourceIndex + PREVIEW_RESOURCES_PER_TICK,
        )

        store.setCreatures(allCreatures.slice(0, creatureIndex))
        store.setResources(allResources.slice(0, resourceIndex))

        if (
          creatureIndex >= allCreatures.length &&
          resourceIndex >= allResources.length
        ) {
          cancelPreviewTransition()
        }
      }, PREVIEW_SPAWN_INTERVAL_MS)
    },
    [cancelPreviewTransition],
  )

  const syncPreview = useCallback(() => {
    const world = worldRef.current
    if (!world) return
    world.syncPreview()
    syncWorldToStore(world)
  }, [])

  useEffect(() => {
    if (!worldRef.current) {
      worldRef.current = new World(useSimulationStore.getState().config)
      const world = worldRef.current
      const store = useSimulationStore.getState()
      store.setInitialized(true)
      store.setPhase("idle")
      syncWorldToStore(world)
    }

    return () => {
      cancelPreviewTransition()
    }
  }, [cancelPreviewTransition])

  useEffect(() => {
    if (!worldRef.current || phase !== "idle") return

    worldRef.current.updateConfig(config)
    worldRef.current.syncPreview()

    if (previewSpawnToken === lastSpawnTokenRef.current) {
      syncWorldToStore(worldRef.current)
    }
  }, [config, phase, previewSpawnToken])

  useEffect(() => {
    if (!worldRef.current || phase !== "idle") return
    if (previewSpawnToken === 0 || previewSpawnToken === lastSpawnTokenRef.current) {
      return
    }

    lastSpawnTokenRef.current = previewSpawnToken

    const world = worldRef.current
    world.updateConfig(config)
    world.syncPreview()

    const allCreatures = world.creatures.map((c) => c.toSnapshot())
    const allResources = [...world.resources]
    const allObstacles = [...world.obstacles]
    const stats = world.getStats()

    startPreviewTransition(allCreatures, allResources, allObstacles, stats)
  }, [previewSpawnToken, phase, config, startPreviewTransition])

  useEffect(() => {
    const world = worldRef.current
    if (!world) return

    if (isRunning && phase === "active") {
      world.start()
    } else {
      world.pause()
    }
  }, [isRunning, phase])

  useEffect(() => {
    if (!isInitialized) return

    const loop = () => {
      const world = worldRef.current
      const store = useSimulationStore.getState()

      if (world && world.running && store.phase === "active") {
        tickAccumulatorRef.current += simulationSpeed * BASE_TICKS_PER_FRAME

        while (tickAccumulatorRef.current >= 1) {
          world.step()
          tickAccumulatorRef.current -= 1
        }

        store.setCreatures(world.creatures.map((c) => c.toSnapshot()))
        store.setResources([...world.resources])
        store.setObstacles([...world.obstacles])

        tickCounterRef.current++
        if (tickCounterRef.current % STATS_INTERVAL === 0) {
          const stats = world.getStats()
          store.setStats(stats)
          store.pushStatsHistory(stats)
        }
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isInitialized, simulationSpeed])

  const startSimulation = () => {
    cancelPreviewTransition()
    const store = useSimulationStore.getState()
    worldRef.current = new World(store.config)
    worldRef.current.start()
    store.resetHistory()
    store.setPhase("active")
    store.setRunning(true)
    store.setSessionSummary(null)
    store.selectCreature(null)
    tickCounterRef.current = 0
    tickAccumulatorRef.current = 0
    syncWorldToStore(worldRef.current)
  }

  const quitSimulation = () => {
    const store = useSimulationStore.getState()
    const world = worldRef.current
    if (!world) return

    world.pause()
    const finalStats = world.getStats()
    const summary = buildSessionSummary(store.statsHistory, finalStats)
    store.setSessionSummary(summary)
    store.setRunning(false)
    store.setPhase("ended")
    store.selectCreature(null)
    store.setBrainPanelOpen(false)
  }

  const enterIdlePreview = () => {
    cancelPreviewTransition()
    const store = useSimulationStore.getState()
    worldRef.current = new World(store.config)
    store.enterIdlePreview()
    store.resetHistory()
    tickCounterRef.current = 0
    tickAccumulatorRef.current = 0
    lastSpawnTokenRef.current = 0
    syncWorldToStore(worldRef.current)
  }

  const resetToPreview = () => {
    enterIdlePreview()
  }

  return {
    startSimulation,
    quitSimulation,
    enterIdlePreview,
    resetToPreview,
    syncPreview,
    getWorld: () => worldRef.current,
  }
}
