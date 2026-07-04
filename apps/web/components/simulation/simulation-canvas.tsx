"use client"

import { useEffect, useRef } from "react"
import { Application, Circle, Container, Graphics } from "pixi.js"

import { useSimulationStore } from "@/store/simulation-store"

const COLORS = {
  background: 0x06060f,
  food: 0x22ff77,
  poison: 0xaa55ff,
  meat: 0xff2244,
  carrion: 0xd6b13f,
  herbivoreLow: 0x3d5c34,
  herbivoreMid: 0x4ecf7a,
  herbivoreHigh: 0xa8ffcc,
  carnivoreLow: 0x5c1a1a,
  carnivoreMid: 0xe63e1a,
  carnivoreHigh: 0xffaa55,
  omnivoreLow: 0x4d3a18,
  omnivoreMid: 0xff9900,
  omnivoreHigh: 0xffe08a,
  selected: 0xffffff,
  elite: 0xffcc00,
  visionHerbivore: 0x4ecf7a,
  visionCarnivore: 0xff6633,
  visionOmnivore: 0xff9900,
  threatHerbivore: 0xcc44ff,
  threatCarnivore: 0xff2244,
  threatOmnivore: 0xffaa55,
  sprint: 0xffcc00,
  restingHerbivore: 0x7dffb3,
  restingCarnivore: 0xff8844,
  restingOmnivore: 0xffcc66,
}

const FADE_DURATION_MS = 450
const KILL_EVENT_DURATION_MS = 420
const TRAIL_LENGTH = 20
interface WorldTransform {
  scale: number
  offsetX: number
  offsetY: number
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function lerpColor(from: number, to: number, t: number): number {
  const safeT = Math.max(0, Math.min(1, t))
  const r = clampChannel(
    ((from >> 16) & 0xff) * (1 - safeT) + ((to >> 16) & 0xff) * safeT,
  )
  const g = clampChannel(
    ((from >> 8) & 0xff) * (1 - safeT) + ((to >> 8) & 0xff) * safeT,
  )
  const b = clampChannel((from & 0xff) * (1 - safeT) + (to & 0xff) * safeT)
  return (r << 16) | (g << 8) | b
}

function energyColor(energy: number, maxEnergy: number): number {
  const ratio =
    maxEnergy > 0 ? Math.max(0, Math.min(1, energy / maxEnergy)) : 0

  if (ratio >= 0.5) {
    return lerpColor(
      COLORS.herbivoreMid,
      COLORS.herbivoreHigh,
      (ratio - 0.5) * 2,
    )
  }

  return lerpColor(COLORS.herbivoreLow, COLORS.herbivoreMid, ratio * 2)
}

function creatureBodyColor(creature: {
  species: "herbivore" | "omnivore" | "carnivore"
  energy: number
  maxEnergy: number
}): number {
  const ratio =
    creature.maxEnergy > 0
      ? Math.max(0, Math.min(1, creature.energy / creature.maxEnergy))
      : 0

  if (creature.species === "carnivore") {
    if (ratio >= 0.5) {
      return lerpColor(
        COLORS.carnivoreMid,
        COLORS.carnivoreHigh,
        (ratio - 0.5) * 2,
      )
    }
    return lerpColor(COLORS.carnivoreLow, COLORS.carnivoreMid, ratio * 2)
  }

  if (creature.species === "omnivore") {
    if (ratio >= 0.5) {
      return lerpColor(
        COLORS.omnivoreMid,
        COLORS.omnivoreHigh,
        (ratio - 0.5) * 2,
      )
    }
    return lerpColor(COLORS.omnivoreLow, COLORS.omnivoreMid, ratio * 2)
  }

  return energyColor(creature.energy, creature.maxEnergy)
}

function drawCarnivoreBody(
  gfx: Graphics,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: number,
  alpha: number,
): void {
  const tipX = x + Math.cos(angle) * size * 1.35
  const tipY = y + Math.sin(angle) * size * 1.35
  const wing = size * 0.95
  const backAngleL = angle + (2 * Math.PI) / 3
  const backAngleR = angle - (2 * Math.PI) / 3
  const leftX = x + Math.cos(backAngleL) * wing
  const leftY = y + Math.sin(backAngleL) * wing
  const rightX = x + Math.cos(backAngleR) * wing
  const rightY = y + Math.sin(backAngleR) * wing

  gfx.moveTo(tipX, tipY)
  gfx.lineTo(leftX, leftY)
  gfx.lineTo(rightX, rightY)
  gfx.closePath()
  gfx.fill({ color, alpha })
  gfx.stroke({ color, width: 1.2, alpha: alpha * 0.75 })
}

function drawOmnivoreBody(
  gfx: Graphics,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: number,
  alpha: number,
): void {
  const tipX = x + Math.cos(angle) * size * 1.22
  const tipY = y + Math.sin(angle) * size * 1.22
  const leftAngle = angle + (2 * Math.PI) / 3
  const rightAngle = angle - (2 * Math.PI) / 3
  const leftX = x + Math.cos(leftAngle) * size * 0.92
  const leftY = y + Math.sin(leftAngle) * size * 0.92
  const rightX = x + Math.cos(rightAngle) * size * 0.92
  const rightY = y + Math.sin(rightAngle) * size * 0.92
  const backX = x - Math.cos(angle) * size * 0.34
  const backY = y - Math.sin(angle) * size * 0.34

  gfx.moveTo(tipX, tipY)
  gfx.quadraticCurveTo(
    x + Math.cos(angle + 0.7) * size * 0.8,
    y + Math.sin(angle + 0.7) * size * 0.8,
    leftX,
    leftY,
  )
  gfx.quadraticCurveTo(backX, backY, rightX, rightY)
  gfx.quadraticCurveTo(
    x + Math.cos(angle - 0.7) * size * 0.8,
    y + Math.sin(angle - 0.7) * size * 0.8,
    tipX,
    tipY,
  )
  gfx.closePath()
  gfx.fill({ color, alpha })
  gfx.stroke({ color, width: 1.1, alpha: alpha * 0.72 })
}

function drawCreatureBody(
  gfx: Graphics,
  creature: {
    species: "herbivore" | "omnivore" | "carnivore"
    x: number
    y: number
    angle: number
    size: number
  },
  color: number,
  alpha: number,
): void {
  if (creature.species === "carnivore") {
    drawCarnivoreBody(
      gfx,
      creature.x,
      creature.y,
      creature.angle,
      creature.size,
      color,
      alpha,
    )
    return
  }

  if (creature.species === "omnivore") {
    drawOmnivoreBody(
      gfx,
      creature.x,
      creature.y,
      creature.angle,
      creature.size,
      color,
      alpha,
    )
    return
  }

  gfx.circle(creature.x, creature.y, creature.size)
  gfx.fill({ color, alpha })
}

function fadeAlpha(spawnTime: number, now: number): number {
  return Math.min(1, (now - spawnTime) / FADE_DURATION_MS)
}

function drawVisionWedge(
  gfx: Graphics,
  x: number,
  y: number,
  heading: number,
  range: number,
  centerOffset: number,
  halfAngleRad: number,
  fillAlpha: number,
  strokeAlpha: number,
  color: number = COLORS.visionHerbivore,
): void {
  const start = heading + centerOffset - halfAngleRad
  const end = heading + centerOffset + halfAngleRad

  gfx.moveTo(x, y)
  gfx.arc(x, y, range, start, end)
  gfx.lineTo(x, y)
  gfx.closePath()
  gfx.fill({ color, alpha: fillAlpha })
  gfx.moveTo(x, y)
  gfx.arc(x, y, range, start, end)
  gfx.lineTo(x, y)
  gfx.closePath()
  gfx.stroke({ color, width: 1, alpha: strokeAlpha })
}

export function SimulationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const worldLayerRef = useRef<Container | null>(null)
  const creatureGraphicsRef = useRef<Map<number, Graphics>>(new Map())
  const resourceGraphicsRef = useRef<Map<number, Graphics>>(new Map())
  const fertilityGraphicsRef = useRef<Graphics | null>(null)
  const killEventGraphicsRef = useRef<Graphics | null>(null)
  const killEventAnimationsRef = useRef<
    Map<number, { x: number; y: number; size: number; startedAt: number }>
  >(new Map())
  const spawnTimesRef = useRef<Map<number, number>>(new Map())
  const trailRef = useRef<Map<number, { x: number; y: number }[]>>(new Map())
  const transformRef = useRef<WorldTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  })
  const renderStateRef = useRef({
    creatures: useSimulationStore.getState().creatures,
    resources: useSimulationStore.getState().resources,
    fertility: useSimulationStore.getState().fertility,
    selectedCreatureId: null as number | null,
    config: useSimulationStore.getState().config,
  })

  const creatures = useSimulationStore((s) => s.creatures)
  const resources = useSimulationStore((s) => s.resources)
  const killEvents = useSimulationStore((s) => s.killEvents)
  const fertility = useSimulationStore((s) => s.fertility)
  const config = useSimulationStore((s) => s.config)
  const phase = useSimulationStore((s) => s.phase)
  const selectedCreatureId = useSimulationStore((s) => s.selectedCreatureId)

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

    const { creatures, resources, fertility, selectedCreatureId, config } =
      renderStateRef.current
    const activeCreatureIds = new Set(creatures.map((c) => c.id))
    const activeResourceIds = new Set(resources.map((r) => r.id))

    const topEliteIds = new Set(
      [...creatures]
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, 3)
        .map((c) => c.id),
    )

    let fertilityGfx = fertilityGraphicsRef.current
    if (!fertilityGfx) {
      fertilityGfx = new Graphics()
      fertilityGraphicsRef.current = fertilityGfx
      worldLayer.addChildAt(fertilityGfx, 0)
    }

    fertilityGfx.clear()
    if (config.ecosystemMode) {
      for (const cell of fertility) {
        const value = Math.max(0, Math.min(1, cell.value))
        if (value <= 0.05) continue

        fertilityGfx.rect(cell.x, cell.y, cell.size, cell.size)
        fertilityGfx.fill({
          color: lerpColor(0x001a00, COLORS.food, value),
          alpha: value * 0.12,
        })
      }
    }

    let killEventGfx = killEventGraphicsRef.current
    if (!killEventGfx) {
      killEventGfx = new Graphics()
      killEventGraphicsRef.current = killEventGfx
      worldLayer.addChildAt(killEventGfx, Math.min(2, worldLayer.children.length))
    }

    killEventGfx.clear()
    for (const [id, event] of killEventAnimationsRef.current) {
      const progress = (now - event.startedAt) / KILL_EVENT_DURATION_MS
      if (progress >= 1) {
        killEventAnimationsRef.current.delete(id)
        continue
      }

      const alpha = (1 - progress) * 0.75
      const radius = event.size + progress * 28
      killEventGfx.circle(event.x, event.y, radius)
      killEventGfx.stroke({
        color: COLORS.meat,
        width: 2,
        alpha,
      })
      killEventGfx.circle(event.x, event.y, Math.max(2, radius * 0.35))
      killEventGfx.fill({
        color: COLORS.meat,
        alpha: alpha * 0.18,
      })
    }

    for (const id of spawnTimesRef.current.keys()) {
      if (
        !activeCreatureIds.has(id) &&
        !activeResourceIds.has(id)
      ) {
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
        worldLayer.addChildAt(gfx, 1)
      }

      const maturity =
        resource.type === "food" && resource.age !== undefined
          ? Math.min(1, resource.age / config.vegetationGrowthRate)
          : 1
      const alpha =
        fadeAlpha(spawnTimesRef.current.get(resource.id) ?? now, now) *
        (resource.type === "food" ? 0.25 + maturity * 0.65 : 0.85)
      const color =
        resource.type === "food"
          ? COLORS.food
          : resource.type === "meat"
            ? COLORS.meat
            : resource.type === "carrion"
              ? COLORS.carrion
              : COLORS.poison
      const radius =
        resource.type === "food"
          ? 1.5 + maturity * 1.5
          : resource.type === "meat"
            ? 2.5
            : resource.type === "carrion"
              ? 2.75
              : 4

      gfx.clear()
      gfx.circle(resource.x, resource.y, radius)
      gfx.fill({ color, alpha })
    }

    for (const [id, gfx] of creatureGraphicsRef.current) {
      if (!activeCreatureIds.has(id)) {
        worldLayer.removeChild(gfx)
        gfx.destroy()
        creatureGraphicsRef.current.delete(id)
        trailRef.current.delete(id)
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

      const spawnAlpha = fadeAlpha(
        spawnTimesRef.current.get(creature.id) ?? now,
        now,
      )
      const color = creatureBodyColor(creature)
      const isSelected = creature.id === selectedCreatureId
      const isElite = topEliteIds.has(creature.id)
      const bodyAlpha = (creature.isResting ? 0.55 : 0.85) * spawnAlpha

      if (isSelected) {
        const trail = trailRef.current.get(creature.id) ?? []
        trail.push({ x: creature.x, y: creature.y })
        if (trail.length > TRAIL_LENGTH) trail.shift()
        trailRef.current.set(creature.id, trail)
      }

      gfx.clear()
      gfx.hitArea = new Circle(creature.x, creature.y, creature.size + 8)

      if (isSelected) {
        const trail = trailRef.current.get(creature.id) ?? []
        if (trail.length > 1) {
          gfx.moveTo(trail[0]!.x, trail[0]!.y)
          for (let i = 1; i < trail.length; i++) {
            gfx.lineTo(trail[i]!.x, trail[i]!.y)
          }
          gfx.stroke({
            color,
            width: 1,
            alpha: 0.35 * spawnAlpha,
          })
        }

        const visionColor =
          creature.species === "herbivore"
            ? COLORS.visionHerbivore
            : creature.species === "omnivore"
              ? COLORS.visionOmnivore
              : COLORS.visionCarnivore
        const halfAngleRad = (creature.visionHalfAngle * Math.PI) / 180
        const coneSignal = Math.abs(creature.inputs[0] ?? 0)
        const fillAlpha = (0.05 + coneSignal * 0.1) * spawnAlpha
        const strokeAlpha = (0.2 + coneSignal * 0.25) * spawnAlpha
        drawVisionWedge(
          gfx,
          creature.x,
          creature.y,
          creature.angle,
          creature.visionRange,
          0,
          halfAngleRad,
          fillAlpha,
          strokeAlpha,
          visionColor,
        )

        const threatDist = creature.inputs[6] ?? 1
        if (threatDist < 0.99) {
          const threatSignal = 1 - threatDist
          const threatColor =
            creature.species === "herbivore"
              ? COLORS.threatHerbivore
              : creature.species === "omnivore"
                ? COLORS.threatOmnivore
                : COLORS.threatCarnivore
          drawVisionWedge(
            gfx,
            creature.x,
            creature.y,
            creature.angle,
            creature.visionRange * threatSignal,
            0,
            halfAngleRad,
            (0.05 + threatSignal * 0.1) * spawnAlpha,
            (0.2 + threatSignal * 0.25) * spawnAlpha,
            threatColor,
          )
        }
      }

      if (creature.isSprinting) {
        const pulse = 0.45 + Math.sin(now / 120) * 0.2
        gfx.circle(creature.x, creature.y, creature.size + 10)
        gfx.stroke({
          color: COLORS.sprint,
          width: 2,
          alpha: pulse * spawnAlpha,
        })
      }

      if (creature.isResting) {
        const pulse = 0.35 + Math.sin(now / 300) * 0.15
        const restingColor =
          creature.species === "herbivore"
            ? COLORS.restingHerbivore
            : creature.species === "omnivore"
              ? COLORS.restingOmnivore
              : COLORS.restingCarnivore
        gfx.circle(creature.x, creature.y, creature.size + 8)
        gfx.stroke({
          color: restingColor,
          width: 1.5,
          alpha: pulse * spawnAlpha,
        })
      }

      if (isElite && !isSelected) {
        gfx.circle(creature.x, creature.y, creature.size + 6)
        gfx.stroke({
          color: COLORS.elite,
          width: 1.5,
          alpha: 0.75 * spawnAlpha,
        })
      }

      drawCreatureBody(gfx, creature, color, bodyAlpha)

      if (isSelected) {
        gfx.circle(creature.x, creature.y, creature.size + 4)
        gfx.stroke({
          color: COLORS.selected,
          width: 1.5,
          alpha: 0.9 * spawnAlpha,
        })
      }

      if (creature.species === "herbivore") {
        const tipX = creature.x + Math.cos(creature.angle) * (creature.size + 4)
        const tipY = creature.y + Math.sin(creature.angle) * (creature.size + 4)
        gfx.moveTo(creature.x, creature.y)
        gfx.lineTo(tipX, tipY)
        gfx.stroke({ color, width: 1.5, alpha: bodyAlpha })
      }
    }
  }

  useEffect(() => {
    let destroyed = false
    const creatureGraphics = creatureGraphicsRef.current
    const resourceGraphics = resourceGraphicsRef.current
    const spawnTimes = spawnTimesRef.current
    const trails = trailRef.current
    const killEventAnimations = killEventAnimationsRef.current

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
      creatureGraphics.clear()
      resourceGraphics.clear()
      fertilityGraphicsRef.current?.destroy()
      fertilityGraphicsRef.current = null
      killEventGraphicsRef.current?.destroy()
      killEventGraphicsRef.current = null
      killEventAnimations.clear()
      spawnTimes.clear()
      trails.clear()
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
  }, [
    config.worldWidth,
    config.worldHeight,
    creatures.length,
    resources.length,
  ])

  useEffect(() => {
    renderStateRef.current = {
      creatures,
      resources,
      fertility,
      selectedCreatureId,
      config,
    }
    redrawScene(performance.now())
  }, [creatures, resources, fertility, selectedCreatureId, config])

  useEffect(() => {
    if (killEvents.length === 0) return

    const now = performance.now()
    for (const event of killEvents) {
      killEventAnimationsRef.current.set(event.id, {
        ...event,
        startedAt: now,
      })
    }
    redrawScene(now)
  }, [killEvents])

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
