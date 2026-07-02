import type { CreatureSnapshot } from "@/store/simulation-store"

export function getBehaviorHint(creature: CreatureSnapshot): string {
  if (creature.isResting) {
    return "Digesting — cannot move"
  }

  const coneLeft = creature.inputs[0] ?? 0
  const coneFront = creature.inputs[1] ?? 0
  const coneRight = creature.inputs[2] ?? 0
  const nearestFoodDist = creature.inputs[4] ?? 1
  const foodScent = Math.abs(creature.inputs[3] ?? 0)
  const energy = creature.inputs[12] ?? 0
  const [, throttle, eat, rest] = creature.outputs
  const strongestCone = Math.max(coneLeft, coneFront, coneRight)

  if ((eat ?? 0) > 0.5 && nearestFoodDist < 0.2) {
    return "Attempting to eat"
  }

  if (
    nearestFoodDist < 0.35 &&
    (throttle ?? 0.5) <= 0.55 &&
    strongestCone > 0.2
  ) {
    return "Approaching food"
  }

  if (strongestCone > 0.3 || nearestFoodDist < 0.5) {
    return "Food detected"
  }

  if (foodScent > 0.15) {
    return "Following scent"
  }

  if (strongestCone === 0 && nearestFoodDist >= 0.99 && foodScent < 0.05) {
    return "No food in range"
  }

  if (creature.ticksSinceMove > 40 && creature.distanceTraveled < 50) {
    return "Likely circling (low displacement)"
  }

  if ((rest ?? 0) > 0.6 && energy < 0.4) {
    return "Low energy — resting"
  }

  if ((throttle ?? 0.5) > 0.55) {
    return "Exploring"
  }

  return "Idle"
}
