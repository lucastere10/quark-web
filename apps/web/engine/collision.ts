export interface SpatialEntity {
  id: number
  x: number
  y: number
}

export class SpatialGrid<T extends SpatialEntity> {
  private readonly cellSize: number
  private readonly width: number
  private readonly height: number
  private readonly cols: number
  private readonly rows: number
  private readonly cells: Map<number, T[]>

  constructor(worldWidth: number, worldHeight: number, cellSize = 64) {
    this.cellSize = cellSize
    this.width = worldWidth
    this.height = worldHeight
    this.cols = Math.ceil(worldWidth / cellSize)
    this.rows = Math.ceil(worldHeight / cellSize)
    this.cells = new Map()
  }

  clear(): void {
    this.cells.clear()
  }

  insert(entity: T): void {
    const key = this.getKey(entity.x, entity.y)
    const bucket = this.cells.get(key)
    if (bucket) {
      bucket.push(entity)
    } else {
      this.cells.set(key, [entity])
    }
  }

  queryRadius(x: number, y: number, radius: number): T[] {
    const results: T[] = []
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize))
    const maxCol = Math.min(
      this.cols - 1,
      Math.floor((x + radius) / this.cellSize),
    )
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize))
    const maxRow = Math.min(
      this.rows - 1,
      Math.floor((y + radius) / this.cellSize),
    )

    const radiusSq = radius * radius

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const bucket = this.cells.get(row * this.cols + col)
        if (!bucket) continue

        for (const entity of bucket) {
          const dx = entity.x - x
          const dy = entity.y - y
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(entity)
          }
        }
      }
    }

    return results
  }

  findNearest(
    x: number,
    y: number,
    radius: number,
    filter?: (entity: T) => boolean,
  ): T | null {
    const nearby = this.queryRadius(x, y, radius)
    let nearest: T | null = null
    let nearestDistSq = Infinity

    for (const entity of nearby) {
      if (filter && !filter(entity)) continue
      const dx = entity.x - x
      const dy = entity.y - y
      const distSq = dx * dx + dy * dy
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq
        nearest = entity
      }
    }

    return nearest
  }

  private getKey(x: number, y: number): number {
    const col = Math.min(
      this.cols - 1,
      Math.max(0, Math.floor(x / this.cellSize)),
    )
    const row = Math.min(
      this.rows - 1,
      Math.max(0, Math.floor(y / this.cellSize)),
    )
    return row * this.cols + col
  }
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

export function angleTo(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1)
}
