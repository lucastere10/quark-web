"use client"

import { type ReactNode, useMemo } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  buildGenerationSeries,
  buildSessionGenerationSeries,
} from "@/lib/chart-data"
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

import { TraitEvolutionChart } from "./trait-evolution-chart"

interface SimulationSummaryDialogProps {
  summary: SessionSummary | null
  open: boolean
  onClose: () => void
}

function SummaryChart({
  title,
  children,
  height = 140,
}: {
  title: string
  children: ReactNode
  height?: number
}) {
  return (
    <div className="rounded-md border border-[var(--quark-border)] bg-black/30 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--quark-muted)]">
        {title}
      </p>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

export function SimulationSummaryDialog({
  summary,
  open,
  onClose,
}: SimulationSummaryDialogProps) {
  const chartData = useMemo(
    () => (summary ? buildGenerationSeries(summary.statsHistory) : []),
    [summary],
  )

  const traitChartData = useMemo(
    () => (summary ? buildSessionGenerationSeries(summary.statsHistory) : []),
    [summary],
  )

  if (!summary) return null

  const hasCharts = chartData.length > 1

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[var(--quark-border)] bg-[#0a0a14] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-[var(--quark-accent)]">
            Simulation Complete
          </DialogTitle>
          <DialogDescription>
            Evolution from Gen 0 to Gen {summary.generationsReached} — per
            generation summary.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            {
              label: "Final Avg Size",
              value: summary.finalAverageSize.toFixed(1),
            },
            {
              label: "Final Avg Vision",
              value: summary.finalAverageVision.toFixed(0),
            },
            {
              label: "Final Avg Speed",
              value: summary.finalAverageSpeed.toFixed(2),
            },
            {
              label: "Peak Avg Size",
              value: summary.peakAverageSize.toFixed(1),
            },
            {
              label: "Peak Avg Vision",
              value: summary.peakAverageVision.toFixed(0),
            },
            {
              label: "Final Metabolism",
              value: summary.finalAverageMetabolism.toFixed(3),
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

        {hasCharts && (
          <div className="space-y-4">
            <SummaryChart title="Evolution Overview (per generation)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    stroke="rgba(0,229,204,0.08)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="generation"
                    tick={{ fontSize: 9, fill: "rgba(0,229,204,0.5)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide yAxisId="left" domain={["auto", "auto"]} />
                  <YAxis hide yAxisId="right" orientation="right" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a14",
                      border: "1px solid rgba(0,229,204,0.2)",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload as { label?: string } | undefined
                      return item?.label ?? ""
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bestFitness"
                    name="Best Fitness"
                    stroke="#00e5cc"
                    strokeWidth={1.5}
                    dot={chartData.length <= 20}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="population"
                    name="Population"
                    stroke="#ff9900"
                    strokeWidth={1.5}
                    dot={chartData.length <= 20}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </SummaryChart>

            <TraitEvolutionChart
              data={traitChartData}
              axisMode="generation"
              height={140}
              emptyMessage="No trait data beyond Gen 0"
            />

            <SummaryChart title="Ecosystem Health (per generation)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData.map((point) => ({
                    ...point,
                    survivalRatePct: point.survivalRate * 100,
                  }))}
                >
                  <CartesianGrid
                    stroke="rgba(0,229,204,0.08)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="generation"
                    tick={{ fontSize: 9, fill: "rgba(0,229,204,0.5)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a14",
                      border: "1px solid rgba(0,229,204,0.2)",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload as { label?: string } | undefined
                      return item?.label ?? ""
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line
                    type="monotone"
                    dataKey="speciesDiversity"
                    name="Diversity"
                    stroke="#9933ff"
                    strokeWidth={1.5}
                    dot={chartData.length <= 20}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageFoodEaten"
                    name="Avg Food Eaten"
                    stroke="#22ff77"
                    strokeWidth={1.5}
                    dot={chartData.length <= 20}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="survivalRatePct"
                    name="Survival Rate %"
                    stroke="#ff2244"
                    strokeWidth={1.5}
                    dot={chartData.length <= 20}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </SummaryChart>
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
