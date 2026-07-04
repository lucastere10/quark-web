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
  eliteCount:
    "Top survivors copied unchanged into the next generation. Preserves the best strategies while the rest evolve.",
  foodDensity:
    "Target number of food dots in the world. More food makes survival easier and reduces evolutionary pressure.",
  poisonDensity:
    "Small number of poison dots. Touching poison drains energy based on each creature's toxin resistance.",
  foodDistribution:
    "Uniform spreads food evenly. Cluster groups food into patches, favoring foraging and migration strategies.",
  worldWidth:
    "Horizontal size of the simulation arena. Larger worlds spread resources and increase travel distance.",
  worldHeight:
    "Vertical size of the simulation arena.",
  visionRange:
    "Laboratory ceiling for evolved vision. Each creature uses the minimum of its DNA trait and this cap.",
  maxSpeed:
    "Laboratory ceiling for evolved speed. Each creature uses the minimum of its DNA trait and this cap.",
  noiseStrength:
    "Random noise injected into the neural network each tick. Lower values produce steadier movement.",
  predationMaxPreySizeRatio:
    "Largest prey size a hunter can attack relative to its own body. Lower values make predation rarer and safer for small animals.",
  initialEnergy:
    "Starting energy for each creature at birth. Low energy creates immediate survival pressure.",
  ecosystemMode:
    "Runs the world continuously without generation resets. Animals survive, die, and reproduce inside the same timeline.",
  simulationDynamics:
    "Chooses how strongly the world favors predation. Emergent Predation starts with a small predator seed.",
  vegetationGrowthRate:
    "Ticks required for new plants to mature. Slower growth makes grazing pressure more visible.",
  vegetationSpreadRadius:
    "Maximum seed spread distance from mature plants. Larger values create wider and faster-moving patches.",
  fertilityDriftRate:
    "Speed of moving fertile regions. Higher values make vegetation hotspots migrate through the world.",
  climateVolatility:
    "How quickly climate seasons shift. Higher values create sharper rain, drought, heat, and cold transitions.",
  rainBias:
    "Overall weather tendency. Negative values favor dry seasons, positive values favor humid and rainy seasons.",
} as const

export type SliderHintKey = keyof typeof SLIDER_HINTS
