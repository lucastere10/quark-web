# Quark

> **From simple rules emerges intelligence.**

An interactive artificial life simulation where intelligence is not programmed—it evolves.

---

# Vision

Quark is an interactive web application that demonstrates how complex and intelligent behavior can emerge from simple neural networks through evolution.

Every creature in the simulation begins with a randomly initialized brain and no knowledge of its environment. There are no handcrafted behaviors, pathfinding algorithms, or scripted AI.

The only rule is simple:

> Creatures that survive and reproduce pass their genes to the next generation.

Everything else emerges naturally.

---

# The Goal

Most AI demonstrations focus on showing the final result.

Quark focuses on showing **the process**.

Instead of asking:

> *"Can an AI solve this?"*

Quark asks:

> **"How does intelligence emerge?"**

The project allows users to observe evolution in real time while experimenting with the parameters that shape it.

---

# Core Concept

Each creature is an autonomous agent composed of:

* A small feed-forward neural network
* A DNA sequence
* Internal state (energy, health, age)
* Physical properties (speed, vision, size)

Every simulation tick:

1. The creature observes its environment.
2. Inputs are fed into its neural network.
3. The network produces movement decisions.
4. The creature interacts with the world.
5. Successful individuals reproduce.
6. The next generation inherits mutated versions of their parents' brains.

No behavior is explicitly programmed.

---

# World Simulation

The world contains resources and hazards that create evolutionary pressure.

Examples include:

* 🌱 Food
* ☠️ Poison
* 🪨 Obstacles
* 🌊 Water
* 🔥 Dangerous areas
* 🦅 Predators (future feature)

Each environment naturally favors different strategies.

---

# Creature Brain

Each creature owns a tiny neural network.

Example architecture:

```
Inputs

Food Distance
Food Direction
Obstacle Distance
Energy
Speed
Age
Random Noise

↓

Hidden Layer

12 Neurons

↓

Outputs

Move Forward
Turn Left
Turn Right
Sprint
Eat
Rest
```

The network is intentionally simple so users can understand how decisions are made.

---

# Evolution

At the end of every generation:

* Fitness is calculated from food eaten, age, offspring, energy, and stagnation penalties
* Weak individuals disappear
* Top elites pass unchanged; the rest reproduce via tournament selection
* Offspring inherit mutated neural networks and physical traits

Fitness formula (higher is better):

```
foodEaten × 8 + age × 0.02 + offspringCount × 5 + energy × 0.05
− stagnation penalty (when barely moving)
− empty survival penalty (old age without eating)
```

Laboratory sliders (`visionRange`, `maxSpeed`) act as **ceilings** on evolved DNA traits. Each creature uses `min(DNA trait, slider cap)`.

Mutations may affect:

* Neural weights
* Vision distance
* Speed
* Body size
* Metabolism (movement cost and feeding efficiency)

Over hundreds of generations, unexpected behaviors emerge naturally.

---

# Environment

Resources replenish gradually between generations (no full map reset).

* **Uniform** — food spread evenly across the world
* **Cluster** — food grouped in patches (favors foraging and migration)
* **Obstacles** — static circles with reflection physics (no scripted pathfinding)

---

# Interactive Features

Users can modify the simulation while it is running.

Examples:

## Evolution

* Mutation Rate
* Population Size
* Selection Pressure
* Generation Length
* Elite Count

## Environment

* Food Density
* Poison Density
* Food Distribution (uniform / cluster)
* Obstacle Count
* World Size

## Creature

* Vision Range (evolutionary ceiling)
* Maximum Speed (evolutionary ceiling)
* Initial Energy
* Noise Strength

Every change immediately influences the evolutionary process.

---

# Neural Network Inspector

One of the project's main features is the ability to inspect any living creature.

Selecting a creature opens a detailed panel showing:

* Current age
* Current energy
* Generation
* DNA
* Fitness
* Live neural network
* Current inputs
* Current outputs

Neuron activations and connections are animated in real time, allowing users to understand exactly why a creature makes each decision.

---

# Evolution Timeline

Users can move through previous generations using a timeline.

```
Generation

0 ────── 25 ────── 75 ────── 150 ────── 300
```

This allows users to compare how behaviors evolve over time.

---

# Statistics Dashboard

The simulation continuously records statistics such as:

* Current Generation
* Population
* Best Fitness
* Average Fitness
* Survival Rate
* Average Lifespan
* Species Diversity
* Mutation Rate

Interactive charts allow users to visualize evolutionary progress.

---

# Long-Term Vision

Future versions may introduce:

## Species Formation

Over time, creatures may diverge into distinct species with different survival strategies.

---

## Predators and Prey

Evolutionary arms races naturally emerge.

Fast prey.

Smarter predators.

Cooperation.

Ambush behavior.

---

## Ecosystems

Different environments may coexist:

* Forest
* Desert
* Ice
* Swamp
* Cave

Each ecosystem favors different adaptations.

---

## Genetics

Instead of mutating only neural weights, evolution can also modify physical traits such as:

* Vision
* Speed
* Size
* Metabolism
* Lifespan
* Reproduction Cost

---

## Multiplayer Experiments

Users can share simulations using deterministic world seeds.

```
quark.dev/simulation/4A82DF
```

Anyone opening the link can replay the exact same experiment.

---

# Technical Goals

Beyond demonstrating AI concepts, Quark is intended to showcase software engineering practices.

The project demonstrates experience with:

* Interactive simulations
* Neural Networks
* Genetic Algorithms
* Data Visualization
* High-performance rendering
* Game loops
* State management
* Scalable frontend architecture
* Clean software design

---

# Suggested Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* TailwindCSS
* PixiJS
* Zustand
* React Flow (Brain Visualization)
* Recharts

## Simulation Engine

Custom implementation written in TypeScript.

Modules:

```
engine/
    world.ts
    creature.ts
    evolution.ts
    genetics.ts
    neural-network.ts
    collision.ts
    renderer.ts
```

No external machine learning libraries are required.

The neural network implementation is intentionally built from scratch to demonstrate understanding of the underlying algorithms.

---

# Design Philosophy

Quark is not a game.

It is not a machine learning playground.

It is a digital ecosystem.

The objective is not to create the smartest agent possible, but to let visitors witness something fascinating:

> Intelligence emerging from randomness through evolution.

---

# Hero Section

> **Can intelligence emerge without being programmed?**

Every creature you see begins with a random neural network.

None of them know how to survive.

Some will die.

Some will adapt.

Some will evolve.

Press **Start Simulation** and watch artificial life emerge.

---

# Future Research Ideas

* Reinforcement Learning agents
* NEAT (NeuroEvolution of Augmenting Topologies)
* Sexual reproduction
* Evolution of communication
* Swarm intelligence
* Memory neurons
* Recurrent neural networks
* User-created environments
* Plugin system for new evolutionary rules

---

# Inspiration

Quark is inspired by the intersection of:

* Artificial Life (ALife)
* Evolutionary Computation
* Neural Networks
* Emergent Systems
* Complex Adaptive Systems
* Cellular Automata
* Evolutionary Biology

The project aims to make these concepts intuitive, interactive, and visually engaging for anyone curious about how intelligence can emerge from simple rules.
