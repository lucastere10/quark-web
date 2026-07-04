import type { CreatureSnapshot } from "@/store/simulation-store"

export function getBehaviorHint(creature: CreatureSnapshot): string {
  if (creature.isResting) {
    return creature.species !== "herbivore"
      ? "Digesting prey — cannot move"
      : "Digesting — cannot move"
  }

  if (creature.isSprinting) {
    return creature.species !== "herbivore"
      ? "Sprinting to catch prey"
      : "Bursting away from threat"
  }

  const plantDist = creature.inputs[0] ?? 1
  const meatDist = creature.inputs[2] ?? 1
  const carrionDist = creature.inputs[4] ?? 1
  const preyDist = creature.inputs[6] ?? 1
  const predatorDist = creature.inputs[8] ?? 1
  const dangerDist = creature.inputs[10] ?? 1
  const energy = creature.inputs[12] ?? 0
  const speed = creature.inputs[13] ?? 0
  const [, throttle, eat, rest] = creature.outputs

  if (creature.species !== "herbivore") {
    if (creature.isLocked && preyDist < 0.28 && (throttle ?? 0.5) > 0.6) {
      return "Chasing locked prey"
    }

    if (creature.isLocked) {
      return "Locked on prey - stalking"
    }

    if ((eat ?? 0) > 0.5 && preyDist < 0.2) {
      return "Attempting to attack"
    }

    if (preyDist < 0.35 && (throttle ?? 0.5) > 0.55) {
      return "Stalking prey"
    }

    if (preyDist < 0.5) {
      return "Prey detected"
    }

    if (meatDist < 0.55) {
      return creature.species === "omnivore"
        ? "Exploring fresh meat"
        : "Following fresh meat"
    }

    if (carrionDist < 0.55) {
      return "Scavenging carrion"
    }
  } else {
    if (predatorDist < 0.35 && (throttle ?? 0.5) > 0.55) {
      return "Fleeing from predator"
    }

    if (predatorDist < 0.5) {
      return "Predator nearby"
    }

    if (dangerDist < 0.2) {
      return "Danger detected - avoid"
    }

    if ((eat ?? 0) > 0.5 && plantDist < 0.12) {
      return "Attempting to eat"
    }

    if (plantDist < 0.55 && (throttle ?? 0.5) <= 0.55) {
      return "Approaching food"
    }

    if (plantDist < 0.75) {
      return "Food detected"
    }

    if (plantDist >= 0.95 && predatorDist >= 0.99) {
      return "No food in range"
    }
  }

  if (dangerDist < 0.2) {
    return "Near hazard — steering away"
  }

  if (creature.ticksSinceMove > 40 || (speed < 0.08 && creature.distanceTraveled < 50)) {
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
