"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

import type { AdaptiveSpaceData } from "@/lib/adaptive-space"

interface AdaptiveSpaceChartProps {
  data: AdaptiveSpaceData
  height?: number
  interactive?: boolean
  emptyMessage?: string
}

function colorToThree(color: string): THREE.Color {
  return new THREE.Color(color)
}

function createAxis(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number,
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
  return new THREE.Line(geometry, material)
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose())
    } else if (material) {
      material.dispose()
    }
  })
}

export function AdaptiveSpaceChart({
  data,
  height = 220,
  interactive = true,
  emptyMessage = "Adaptive space appears as creatures evolve",
}: AdaptiveSpaceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pointsRef = useRef<THREE.Points | null>(null)
  const cloudsRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#05070d")
    scene.fog = new THREE.Fog("#05070d", 3.2, 7)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20)
    camera.position.set(2.4, 2.2, 3.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enableZoom = interactive
    controls.enablePan = interactive
    controls.enableRotate = interactive
    controls.autoRotate = !interactive
    controls.autoRotateSpeed = 0.8

    const axes = new THREE.Group()
    axes.add(createAxis(new THREE.Vector3(-1.2, 0, 0), new THREE.Vector3(1.2, 0, 0), 0x22ff77))
    axes.add(createAxis(new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(0, 1.2, 0), 0x00e5cc))
    axes.add(createAxis(new THREE.Vector3(0, 0, -1.2), new THREE.Vector3(0, 0, 1.2), 0xff9900))
    scene.add(axes)

    const grid = new THREE.GridHelper(2.4, 8, 0x12333c, 0x0a1b22)
    grid.rotation.x = Math.PI / 2
    scene.add(grid)

    const ambient = new THREE.AmbientLight(0xffffff, 0.75)
    scene.add(ambient)

    const clouds = new THREE.Group()
    cloudsRef.current = clouds
    scene.add(clouds)

    const geometry = new THREE.BufferGeometry()
    const material = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    })
    const points = new THREE.Points(geometry, material)
    pointsRef.current = points
    scene.add(points)

    const resize = () => {
      const width = Math.max(1, container.clientWidth)
      const chartHeight = Math.max(1, container.clientHeight)
      renderer.setSize(width, chartHeight, false)
      camera.aspect = width / chartHeight
      camera.updateProjectionMatrix()
    }

    let frameId = 0
    const render = () => {
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(render)
    }

    resize()
    render()
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("resize", resize)
      controls.dispose()
      disposeObject(scene)
      renderer.dispose()
      renderer.domElement.remove()
      pointsRef.current = null
      cloudsRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    const points = pointsRef.current
    if (!points) return

    const positions = new Float32Array(data.points.length * 3)
    const colors = new Float32Array(data.points.length * 3)

    data.points.forEach((point, index) => {
      const offset = index * 3
      positions[offset] = point.x
      positions[offset + 1] = point.y
      positions[offset + 2] = point.z

      const color = colorToThree(point.color)
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    })

    points.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    points.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    points.geometry.computeBoundingSphere()
  }, [data.points])

  useEffect(() => {
    const clouds = cloudsRef.current
    if (!clouds) return

    disposeObject(clouds)
    clouds.clear()
    for (const family of data.families) {
      const geometry = new THREE.SphereGeometry(0.035 + Math.min(0.08, family.population * 0.006), 12, 8)
      const material = new THREE.MeshBasicMaterial({
        color: colorToThree(family.color),
        transparent: true,
        opacity: 0.45,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(family.x, family.y, family.z)
      clouds.add(mesh)
    }
  }, [data.families])

  return (
    <div
      className="relative overflow-hidden rounded-md border border-[var(--quark-border)] bg-[#05070d]"
      style={{ height }}
    >
      {data.points.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-center text-[10px] text-[var(--quark-muted)]">
          {emptyMessage}
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-between text-[9px] uppercase tracking-wider text-[var(--quark-muted)]">
        <span>X Perception</span>
        <span>Y Biomech</span>
        <span>Z Metabolism</span>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-1 text-[9px]">
        <span className="rounded bg-[#22ff77]/15 px-1.5 py-0.5 text-[#22ff77]">Herb</span>
        <span className="rounded bg-[#2b8cff]/15 px-1.5 py-0.5 text-[#2b8cff]">Omni</span>
        <span className="rounded bg-[#ff3d2e]/15 px-1.5 py-0.5 text-[#ff3d2e]">Carn</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">Trait color</span>
      </div>
    </div>
  )
}
