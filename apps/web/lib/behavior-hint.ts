import type { CreatureSnapshot } from "@/store/simulation-store"

export function getBehaviorHint(creature: CreatureSnapshot): string {
  if (creature.isResting) {
    return creature.species === "carnivore"
      ? "Digesting prey — cannot move"
      : "Digesting — cannot move"
  }

  if (creature.isSprinting) {
    return creature.species === "carnivore"
      ? "Sprinting to catch prey"
      : "Bursting away from threat"
  }

  const coneSignal = creature.inputs[0] ?? 0
  const hazardDist = creature.inputs[2] ?? 0
  const threatDist = creature.inputs[6] ?? 1
  const energy = creature.inputs[4] ?? 0
  const scentSignal = creature.inputs[10] ?? 0
  const hearingSignal = creature.inputs[12] ?? 0
  const [, throttle, eat, rest] = creature.outputs

  if (creature.species === "carnivore") {
    if (creature.isLocked && threatDist < 0.28 && (throttle ?? 0.5) > 0.6) {
      return "Chasing locked prey"
    }

    if (creature.isLocked) {
      return "Locked on prey - stalking"
    }

    if ((eat ?? 0) > 0.5 && threatDist < 0.2) {
      return "Attempting to attack"
    }

    if (threatDist < 0.35 && (throttle ?? 0.5) > 0.55) {
      return "Stalking prey"
    }

    if (threatDist < 0.5) {
      return "Prey detected"
    }

    if (scentSignal > 0.35) {
      return "Following meat scent"
    }

    if (hearingSignal > 0.35) {
      return "Hearing movement"
    }
  } else {
    if (threatDist < 0.35 && (throttle ?? 0.5) > 0.55) {
      return "Fleeing from predator"
    }

    if (threatDist < 0.5) {
      return "Predator nearby"
    }

    if (hearingSignal > 0.35) {
      return "Hearing predator movement"
    }

    if (coneSignal < -0.25) {
      return "Poison detected — avoid"
    }

    if ((eat ?? 0) > 0.5 && coneSignal > 0.6) {
      return "Attempting to eat"
    }

    if (coneSignal > 0.2 && (throttle ?? 0.5) <= 0.55) {
      return "Approaching food"
    }

    if (coneSignal > 0.15) {
      return "Food detected"
    }

    if (coneSignal <= 0.05 && threatDist >= 0.99) {
      return "No food in range"
    }
  }

  if (hazardDist > 0.5) {
    return "Near hazard — steering away"
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
