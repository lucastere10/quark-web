"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { SessionSummary } from "@/store/simulation-store"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

interface SimulationSummaryDialogProps {
  summary: SessionSummary | null
  open: boolean
  onClose: () => void
}

export function SimulationSummaryDialog({
  summary,
  open,
  onClose,
}: SimulationSummaryDialogProps) {
  if (!summary) return null

  const chartData = summary.statsHistory.map((point, index) => ({
    index,
    fitness: point.bestFitness,
    population: point.population,
  }))

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="border-[var(--quark-border)] bg-[#0a0a14] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[var(--quark-accent)]">
            Simulation Complete
          </DialogTitle>
          <DialogDescription>
            Here is how your ecosystem evolved during this session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Generations", value: summary.generationsReached },
            { label: "Peak Fitness", value: summary.peakFitness.toFixed(1) },
            { label: "Final Population", value: summary.finalPopulation },
            { label: "Peak Population", value: summary.peakPopulation },
            {
              label: "Survival Rate",
              value: `${(summary.survivalRate * 100).toFixed(0)}%`,
            },
            {
              label: "Avg Lifespan",
              value: summary.averageLifespan.toFixed(0),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border border-[var(--quark-border)] bg-black/30 px-3 py-2"
            >
              <p className="text-[10px] uppercase text-[var(--quark-muted)]">
                {stat.label}
              </p>
              <p className="font-mono text-lg text-[var(--quark-accent)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {chartData.length > 1 && (
          <div className="rounded-md border border-[var(--quark-border)] bg-black/30 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
              Fitness Over Time
            </p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    stroke="rgba(0,229,204,0.08)"
                    strokeDasharray="3 3"
                  />
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a14",
                      border: "1px solid rgba(0,229,204,0.2)",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    labelFormatter={() => ""}
                  />
                  <Line
                    type="monotone"
                    dataKey="fitness"
                    stroke="#00e5cc"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            className="w-full bg-[var(--quark-accent)] text-[#06060f] hover:bg-[var(--quark-accent)]/90"
            onClick={onClose}
          >
            Start New Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
