"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Info } from "lucide-react"

function LegendCreature({ fitness }: { fitness: "low" | "high" }) {
  const color = fitness === "low" ? "#00e5cc" : "#ff9900"
  const size = fitness === "low" ? 6 : 10

  return (
    <svg width="80" height="60" viewBox="0 0 80 60" className="shrink-0">
      <circle cx="40" cy="30" r={size} fill={color} opacity={0.85} />
      <line
        x1="40"
        y1="30"
        x2={40 + Math.cos(-0.5) * (size + 6)}
        y2={30 + Math.sin(-0.5) * (size + 6)}
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r={label === "Food" ? 4 : 5} fill={color} />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  )
}

function NeuralDiagram() {
  return (
    <svg viewBox="0 0 320 80" className="w-full max-w-sm">
      {[
        { x: 20, labels: ["Cone", "Hazard", "Energy"] },
        { x: 140, labels: ["H1", "H2", "H3"] },
        { x: 260, labels: ["Steer", "Eat", "Rest"] },
      ].map((col, ci) => (
        <g key={ci}>
          {col.labels.map((label, i) => (
            <g key={label}>
              <circle
                cx={col.x}
                cy={20 + i * 22}
                r="8"
                fill={
                  ci === 0 ? "#00e5cc" : ci === 1 ? "#9933ff" : "#ff9900"
                }
                opacity="0.7"
              />
              <text
                x={col.x}
                y={20 + i * 22 + 28}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize="8"
              >
                {label}
              </text>
            </g>
          ))}
        </g>
      ))}
      <text x="20" y="78" fill="rgba(0,229,204,0.6)" fontSize="9">
        Inputs (8)
      </text>
      <text x="140" y="78" fill="rgba(153,51,255,0.6)" fontSize="9">
        Hidden (8)
      </text>
      <text x="260" y="78" fill="rgba(255,153,0,0.6)" fontSize="9">
        Outputs (4)
      </text>
    </svg>
  )
}

export function SimulationInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="outline" aria-label="How Quark works">
          <Info className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-[var(--quark-border)] bg-[#0a0a14] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[var(--quark-accent)]">
            How Quark Works
          </DialogTitle>
          <DialogDescription>
            Intelligence is not programmed — it evolves from simple rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="mb-2 font-medium">Creatures</h3>
            <div className="flex items-center gap-6 rounded-md border border-[var(--quark-border)] bg-black/30 p-4">
              <div className="text-center">
                <LegendCreature fitness="low" />
                <p className="mt-1 text-[10px] text-[var(--quark-muted)]">
                  Low fitness
                </p>
              </div>
              <div className="text-center">
                <LegendCreature fitness="high" />
                <p className="mt-1 text-[10px] text-[var(--quark-muted)]">
                  High fitness
                </p>
              </div>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-[var(--quark-muted)]">
              <li>
                <strong className="text-foreground">Size</strong> — circle
                radius reflects the creature&apos;s body size trait.
              </li>
              <li>
                <strong className="text-foreground">Color</strong> — cyan to
                amber gradient shows relative fitness (how well it survives).
              </li>
              <li>
                <strong className="text-foreground">Direction line</strong> —
                points where the creature is facing.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-medium">Resources</h3>
            <div className="flex gap-8 rounded-md border border-[var(--quark-border)] bg-black/30 p-4">
              <LegendDot color="#22ff77" label="Food" />
              <LegendDot color="#ff2244" label="Poison" />
            </div>
            <p className="mt-2 text-xs text-[var(--quark-muted)]">
              Creatures must eat food to gain energy. Poison drains energy on
              contact. Over generations, brains learn to seek food and avoid
              poison.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-medium">Evolution Loop</h3>
            <p className="text-xs leading-relaxed text-[var(--quark-muted)]">
              Each creature starts with a random neural network. Every tick it
              senses its surroundings, decides how to move, and spends energy.
              When a generation ends, the weakest are removed. Survivors
              reproduce with mutated brains. No behavior is scripted — strategies
              emerge naturally.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-medium">Neural Network</h3>
            <div className="rounded-md border border-[var(--quark-border)] bg-black/30 p-4">
              <NeuralDiagram />
            </div>
            <p className="mt-2 text-xs text-[var(--quark-muted)]">
              Click any creature to inspect its brain. Brighter neurons and
              animated connections show active decision-making in real time.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
