import type { CreatureSnapshot } from "@/store/simulation-store"

export function getBehaviorHint(creature: CreatureSnapshot): string {
  const foodDistance = creature.inputs[0] ?? 1
  const foodDirection = Math.abs(creature.inputs[1] ?? 0)
  const energy = creature.inputs[5] ?? 0
  const [, , accelerate, , , rest] = creature.outputs

  if (creature.foodEaten > 0 && foodDistance < 0.4) {
    return "Seeking food"
  }

  if (foodDistance >= 0.99) {
    return "No food in range"
  }

  if (foodDistance < 0.5 && foodDirection > 0.2) {
    return "Seeking food"
  }

  if (creature.ticksSinceMove > 40 && creature.distanceTraveled < 50) {
    return "Likely circling (low displacement)"
  }

  if ((rest ?? 0) > 0.6 && energy < 0.4) {
    return "Low energy — resting"
  }

  if ((accelerate ?? 0) > 0.4) {
    return "Exploring"
  }

  return "Idle"
}
