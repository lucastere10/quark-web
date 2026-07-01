# Quark

> **From simple rules emerges intelligence.**

Interactive artificial life simulation where creatures survive with small neural networks and genetic algorithms — no scripted behaviors, no pathfinding, no hand-tuned AI.

[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![pnpm](https://img.shields.io/badge/pnpm-8.15-blue)](package.json)

## What it does

Each creature starts with a random feed-forward neural network and zero knowledge of its environment. Every tick it senses food, poison, walls, and obstacles, decides how to move, spends energy, and tries to survive until the generation ends. The fittest reproduce; offspring inherit mutated brains and physical traits.

You can watch evolution in real time, tweak parameters (mutation rate, food density, selection pressure, noise, and more), inspect any creature's brain live, and compare stats across generations.

## Features

- **Neuroevolution** — MLP (7 → 12 → 6) with sigmoid activations, implemented from scratch
- **Genetic algorithm** — tournament selection, crossover, mutation, elitism
- **Evolving traits** — vision, speed, size, metabolism encoded in DNA
- **Interactive world** — food clusters, poison, static obstacles, multiple scenarios
- **Brain inspector** — inputs, outputs, activations, and connections in real time
- **Expanded brain panel** — resizable side panel with React Flow visualization
- **Live stats** — population, fitness, diversity, food eaten

## Tech stack

| Layer | Tools |
|-------|-------|
| App | Next.js 16, React 19, TypeScript |
| Simulation | Custom engine (`engine/`) — creatures, world, genetics, evolution |
| Rendering | PixiJS |
| State | Zustand |
| UI | Tailwind CSS, shadcn/ui, Recharts, React Flow |
| Monorepo | pnpm workspaces, Turborepo |

## Getting started

**Requirements:** Node.js ≥ 20, pnpm 8 (via Corepack: `corepack enable && corepack install`)

```bash
git clone <repo-url>
cd quark-web
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), adjust sliders in preview mode, then press **Start**.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (all apps via Turbo) |
| `pnpm build` | Production build |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | TypeScript check |

## Project structure

```
quark-web/
├── apps/web/                 # Next.js app
│   ├── app/                  # Routes and layout
│   ├── components/simulation/  # UI, canvas, panels, dialogs
│   ├── engine/               # Simulation core
│   │   ├── neural-network.ts
│   │   ├── creature.ts
│   │   ├── world.ts
│   │   ├── evolution.ts
│   │   └── genetics.ts
│   ├── hooks/
│   └── store/
├── packages/ui/              # Shared UI components (shadcn)
├── cloudbuild.yaml           # GCP Cloud Build pipeline
├── Dockerfile                # Cloud Run image
└── docs/gcp-deploy.md        # Deploy guide
```

## Neural network (per creature)

```
Inputs (7)          Hidden (12)         Outputs (6)
─────────────────   ───────────────     ─────────────────
Food distance       sigmoid neurons     Turn left / right
Food direction                          Accelerate / brake
Poison distance                         Eat
Poison direction                        Rest
Wall distance
Energy
Noise
```

Fitness rewards eating and survival; stagnation and empty survival are penalized. Lab sliders (`visionRange`, `maxSpeed`) act as ceilings on evolved DNA traits.

## Deploy (GCP)

The app deploys to **Cloud Run** via **Cloud Build** on push to the connected GitHub repo.

See **[docs/gcp-deploy.md](docs/gcp-deploy.md)** for:

- Enabling APIs and creating Artifact Registry
- Cloud Build IAM permissions
- Setting up the GitHub trigger
- Manual deploy with `gcloud builds submit`

Default GCP project: `caldas-projects-dev` · Region: `southamerica-east1` · Service: `quark-web`

## Vision & roadmap

Full product vision, future ideas (predators, species, NEAT, RL), and design philosophy are documented in **[project.md](project.md)**.

## Author

**Lucas Caldas** — software developer interested in simulations, frontend architecture, and applied AI.

## License

Private project. All rights reserved unless otherwise noted.
