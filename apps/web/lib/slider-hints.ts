export const SLIDER_HINTS = {
  simulationSpeed:
    "Controls how many simulation ticks run per frame. Lower values slow evolution so you can observe individual behaviors.",
  populationSize:
    "Number of creatures alive at the start of each generation. Larger populations increase diversity but cost performance.",
  mutationRate:
    "Probability that each neural weight mutates when offspring are born. Higher rates explore more but can destabilize learned behavior.",
  selectionPressure:
    "Fraction of the population removed each generation. Higher pressure means only the fittest survive to reproduce.",
  generationLength:
    "How many ticks pass before evolution culls the weak and spawns the next generation.",
  foodDensity:
    "Target number of food dots in the world. More food makes survival easier and reduces evolutionary pressure.",
  poisonDensity:
    "Number of poison dots. Creatures that touch poison lose energy — favors avoidance strategies.",
  worldWidth:
    "Horizontal size of the simulation arena. Larger worlds spread resources and increase travel distance.",
  worldHeight:
    "Vertical size of the simulation arena.",
  visionRange:
    "How far creatures can sense food and poison. Higher vision gives more neural input but may not always help.",
  maxSpeed:
    "Upper speed limit for creatures. Faster movement costs more energy per tick.",
  initialEnergy:
    "Starting energy for each creature at birth. Low energy creates immediate survival pressure.",
} as const

export type SliderHintKey = keyof typeof SLIDER_HINTS
