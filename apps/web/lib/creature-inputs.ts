import { INPUT_LABELS } from "@/engine/neural-network"
import type { CreatureSnapshot } from "@/store/simulation-store"

export interface CreatureInputRow {
  index: number
  label: string
  value: number
}

const INPUT_GROUPS = {
  plant: [0, 1],
  meat: [2, 3],
  carrion: [4, 5],
  prey: [6, 7],
  predator: [8, 9],
  danger: [10, 11],
  state: [12, 13],
} as const

function relevantInputIndices(creature: CreatureSnapshot): number[] {
  if (creature.species === "carnivore") {
    return [
      ...INPUT_GROUPS.meat,
      ...INPUT_GROUPS.prey,
      ...INPUT_GROUPS.predator,
      ...INPUT_GROUPS.danger,
      ...INPUT_GROUPS.state,
    ]
  }

  if (creature.species === "omnivore") {
    return [
      ...INPUT_GROUPS.plant,
      ...INPUT_GROUPS.meat,
      ...INPUT_GROUPS.carrion,
      ...INPUT_GROUPS.prey,
      ...INPUT_GROUPS.predator,
      ...INPUT_GROUPS.danger,
      ...INPUT_GROUPS.state,
    ]
  }

  return [
    ...INPUT_GROUPS.plant,
    ...INPUT_GROUPS.predator,
    ...INPUT_GROUPS.danger,
    ...INPUT_GROUPS.state,
  ]
}

export function getCreatureInputRows(
  creature: CreatureSnapshot,
  showAll = false,
): CreatureInputRow[] {
  const indices = showAll
    ? creature.inputs.map((_, index) => index)
    : relevantInputIndices(creature)

  return indices.map((index) => ({
    index,
    label: INPUT_LABELS[index] ?? `Input ${index + 1}`,
    value: creature.inputs[index] ?? 0,
  }))
}
