"use client"

import { useEffect, useRef } from "react"
import { Application, Circle, Container, Graphics } from "pixi.js"

import { useSimulationStore } from "@/store/simulation-store"

const COLORS = {
  background: 0x06060f,
  food: 0x22ff77,
  poison: 0xff2244,
  creatureLow: 0x00e5cc,
  creatureHigh: 0xff9900,
  selected: 0xffffff,
}

const FADE_DURATION_MS = 450

interface WorldTransform {
  scale: number
  offsetX: number
  offsetY: number
}

function fitnessColor(fitness: number, maxFitness: number): number {
  const t = maxFitness > 0 ? Math.min(1, fitness / maxFitness) : 0
  const r = Math.round(
    ((COLORS.creatureLow >> 16) & 0xff) * (1 - t) +
      ((COLORS.creatureHigh >> 16) & 0xff) * t,
  )
  const g = Math.round(
    ((COLORS.creatureLow >> 8) & 0xff) * (1 - t) +
      ((COLORS.creatureHigh >> 8) & 0xff) * t,
  )
  const b = Math.round(
    (COLORS.creatureLow & 0xff) * (1 - t) + (COLORS.creatureHigh & 0xff) * t,
  )
  return (r << 16) | (g << 8) | b
}

function fadeAlpha(spawnTime: number, now: number): number {
  return Math.min(1, (now - spawnTime) / FADE_DURATION_MS)
}

export function SimulationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const worldLayerRef = useRef<Container | null>(null)
  const creatureGraphicsRef = useRef<Map<number, Graphics>>(new Map())
  const resourceGraphicsRef = useRef<Map<number, Graphics>>(new Map())
  const spawnTimesRef = useRef<Map<number, number>>(new Map())
  const transformRef = useRef<WorldTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  })
  const renderStateRef = useRef({
    creatures: useSimulationStore.getState().creatures,
    resources: useSimulationStore.getState().resources,
    selectedCreatureId: null as number | null,
    config: useSimulationStore.getState().config,
  })

  const creatures = useSimulationStore((s) => s.creatures)
  const resources = useSimulationStore((s) => s.resources)
  const config = useSimulationStore((s) => s.config)
  const phase = useSimulationStore((s) => s.phase)
  const selectedCreatureId = useSimulationStore((s) => s.selectedCreatureId)

  renderStateRef.current = {
    creatures,
    resources,
    selectedCreatureId,
    config,
  }

  const screenToWorld = (clientX: number, clientY: number) => {
    const app = appRef.current
    if (!app) return null

    const rect = app.canvas.getBoundingClientRect()
    const cssScaleX = app.screen.width / rect.width
    const cssScaleY = app.screen.height / rect.height
    const canvasX = (clientX - rect.left) * cssScaleX
    const canvasY = (clientY - rect.top) * cssScaleY
    const { scale, offsetX, offsetY } = transformRef.current

    return {
      x: (canvasX - offsetX) / scale,
      y: (canvasY - offsetY) / scale,
    }
  }

  const redrawScene = (now: number) => {
    const worldLayer = worldLayerRef.current
    if (!worldLayer) return

    const { creatures, resources, selectedCreatureId, config } =
      renderStateRef.current
    const maxFitness = Math.max(...creatures.map((c) => c.fitness), 1)
    const activeCreatureIds = new Set(creatures.map((c) => c.id))
    const activeResourceIds = new Set(resources.map((r) => r.id))

    for (const id of spawnTimesRef.current.keys()) {
      if (!activeCreatureIds.has(id) && !activeResourceIds.has(id)) {
        spawnTimesRef.current.delete(id)
      }
    }

    for (const [id, gfx] of resourceGraphicsRef.current) {
      if (!activeResourceIds.has(id)) {
        worldLayer.removeChild(gfx)
        gfx.destroy()
        resourceGraphicsRef.current.delete(id)
      }
    }

    for (const resource of resources) {
      if (!spawnTimesRef.current.has(resource.id)) {
        spawnTimesRef.current.set(resource.id, now)
      }

      let gfx = resourceGraphicsRef.current.get(resource.id)
      if (!gfx) {
        gfx = new Graphics()
        resourceGraphicsRef.current.set(resource.id, gfx)
        worldLayer.addChildAt(gfx, 0)
      }

      const alpha =
        fadeAlpha(spawnTimesRef.current.get(resource.id) ?? now, now) *
        (resource.type === "food" ? 0.9 : 0.85)
      const color = resource.type === "food" ? COLORS.food : COLORS.poison
      const radius = resource.type === "food" ? 3 : 4

      gfx.clear()
      gfx.circle(resource.x, resource.y, radius)
      gfx.fill({ color, alpha })
    }

    for (const [id, gfx] of creatureGraphicsRef.current) {
      if (!activeCreatureIds.has(id)) {
        worldLayer.removeChild(gfx)
        gfx.destroy()
        creatureGraphicsRef.current.delete(id)
      }
    }

    for (const creature of creatures) {
      if (!spawnTimesRef.current.has(creature.id)) {
        spawnTimesRef.current.set(creature.id, now)
      }

      let gfx = creatureGraphicsRef.current.get(creature.id)
      if (!gfx) {
        gfx = new Graphics()
        gfx.eventMode = "static"
        gfx.cursor = "pointer"
        creatureGraphicsRef.current.set(creature.id, gfx)
        worldLayer.addChild(gfx)

        const creatureId = creature.id
        gfx.on("pointertap", () => {
          useSimulationStore.getState().selectCreature(creatureId)
        })
      }

      const entityAlpha = fadeAlpha(
        spawnTimesRef.current.get(creature.id) ?? now,
        now,
      )
      const color = fitnessColor(creature.fitness, maxFitness)
      const isSelected = creature.id === selectedCreatureId

      gfx.clear()
      gfx.hitArea = new Circle(creature.x, creature.y, creature.size + 8)

      gfx.circle(creature.x, creature.y, creature.size)
      gfx.fill({ color, alpha: 0.85 * entityAlpha })

      if (isSelected) {
        gfx.circle(creature.x, creature.y, creature.size + 4)
        gfx.stroke({ color: COLORS.selected, width: 1.5, alpha: 0.9 * entityAlpha })
      }

      const tipX = creature.x + Math.cos(creature.angle) * (creature.size + 4)
      const tipY = creature.y + Math.sin(creature.angle) * (creature.size + 4)
      gfx.moveTo(creature.x, creature.y)
      gfx.lineTo(tipX, tipY)
      gfx.stroke({ color, width: 1.5, alpha: 0.9 * entityAlpha })
    }
  }

  useEffect(() => {
    let destroyed = false

    const init = async () => {
      if (!containerRef.current || appRef.current) return

      const app = new Application()
      await app.init({
        background: COLORS.background,
        antialias: true,
        resizeTo: containerRef.current,
      })

      if (destroyed) {
        app.destroy(true)
        return
      }

      containerRef.current.appendChild(app.canvas)
      appRef.current = app

      const worldLayer = new Container()
      worldLayer.eventMode = "static"
      app.stage.addChild(worldLayer)
      worldLayerRef.current = worldLayer

      app.canvas.style.cursor = "crosshair"
      app.canvas.addEventListener("click", (event) => {
        const world = screenToWorld(event.clientX, event.clientY)
        if (!world) return

        const store = useSimulationStore.getState()
        let closestId: number | null = null
        let closestDist = Infinity

        for (const creature of store.creatures) {
          const dx = creature.x - world.x
          const dy = creature.y - world.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < creature.size + 10 && dist < closestDist) {
            closestDist = dist
            closestId = creature.id
          }
        }

        if (closestId !== null) {
          store.selectCreature(closestId)
        }
      })

      app.ticker.add(() => {
        redrawScene(performance.now())
      })
    }

    void init()

    return () => {
      destroyed = true
      if (appRef.current) {
        appRef.current.destroy(true)
        appRef.current = null
      }
      worldLayerRef.current = null
      creatureGraphicsRef.current.clear()
      resourceGraphicsRef.current.clear()
      spawnTimesRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const app = appRef.current
    const worldLayer = worldLayerRef.current
    if (!app || !worldLayer) return

    const scaleX = app.screen.width / config.worldWidth
    const scaleY = app.screen.height / config.worldHeight
    const scale = Math.min(scaleX, scaleY)
    const offsetX = (app.screen.width - config.worldWidth * scale) / 2
    const offsetY = (app.screen.height - config.worldHeight * scale) / 2

    worldLayer.scale.set(scale)
    worldLayer.position.set(offsetX, offsetY)
    transformRef.current = { scale, offsetX, offsetY }
  }, [config.worldWidth, config.worldHeight, creatures.length, resources.length])

  useEffect(() => {
    redrawScene(performance.now())
  }, [creatures, resources, selectedCreatureId])

  return (
    <div
      ref={containerRef}
      className="simulation-canvas relative h-full w-full overflow-hidden rounded-lg border border-[var(--quark-border)] bg-[#06060f]"
    >
      {phase === "idle" && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-[var(--quark-border)] bg-black/60 px-2.5 py-1 backdrop-blur-sm">
          <span className="text-[10px] uppercase tracking-wider text-[var(--quark-accent)]">
            Preview Mode
          </span>
        </div>
      )}
    </div>
  )
}
