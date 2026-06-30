"use client"

import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { Dices, Pause, Play, RotateCcw, Square } from "lucide-react"

import { useSimulationStore } from "@/store/simulation-store"

import { CollapsibleSection } from "./collapsible-section"
import { ScenarioPicker } from "./scenario-picker"
import { SimulationInfoDialog } from "./simulation-info-dialog"
import { SliderWithHint } from "./slider-with-hint"

interface ControlPanelProps {
  onStart: () => void
  onQuit: () => void
  onReset: () => void
}

export function ControlPanel({ onStart, onQuit, onReset }: ControlPanelProps) {
  const config = useSimulationStore((s) => s.config)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const phase = useSimulationStore((s) => s.phase)
  const simulationSpeed = useSimulationStore((s) => s.simulationSpeed)
  const setConfig = useSimulationStore((s) => s.setConfig)
  const setRunning = useSimulationStore((s) => s.setRunning)
  const setSimulationSpeed = useSimulationStore((s) => s.setSimulationSpeed)
  const randomizeConfig = useSimulationStore((s) => s.randomizeConfig)

  const controlsDisabled = phase === "active"
  const isIdle = phase === "idle"
  const isActive = phase === "active"

  return (
    <aside className="quark-panel flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--quark-border)] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight text-[var(--quark-accent)]">
              Quark
            </h1>
            <p className="mt-1 text-xs text-[var(--quark-muted)]">
              Intelligence emerges from evolution
            </p>
          </div>
          <SimulationInfoDialog />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isIdle && (
            <Button
              size="sm"
              className="flex-1 bg-[var(--quark-accent)] text-[#06060f] hover:bg-[var(--quark-accent)]/90"
              onClick={onStart}
            >
              <Play className="size-3.5" />
              Start
            </Button>
          )}

          {isActive && (
            <>
              <Button
                size="sm"
                className="flex-1"
                variant="outline"
                onClick={() => setRunning(!isRunning)}
              >
                {isRunning ? (
                  <>
                    <Pause className="size-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" /> Resume
                  </>
                )}
              </Button>
              <Button size="sm" variant="destructive" onClick={onQuit}>
                <Square className="size-3.5" />
                Quit
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            title="Reset to preview"
          >
            <RotateCcw className="size-3.5" />
          </Button>

          {isIdle && (
            <Button
              size="sm"
              variant="outline"
              onClick={randomizeConfig}
              title="Randomize scenario"
            >
              <Dices className="size-3.5" />
            </Button>
          )}
        </div>

        {isActive && (
          <div className="mt-4">
            <SliderWithHint
              hintKey="simulationSpeed"
              label="Simulation Speed"
              value={simulationSpeed}
              min={0.25}
              max={4}
              step={0.25}
              format={(v) => `${v}x`}
              onChange={setSimulationSpeed}
            />
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4 pb-8">
          <CollapsibleSection title="Scenarios" defaultOpen>
            <ScenarioPicker />
          </CollapsibleSection>

          <Separator className="bg-[var(--quark-border)]" />

          <CollapsibleSection title="Evolution" defaultOpen>
            <div className="space-y-4">
              <SliderWithHint
                hintKey="populationSize"
                label="Population Size"
                value={config.populationSize}
                min={20}
                max={200}
                step={10}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ populationSize: v })}
              />
              <SliderWithHint
                hintKey="mutationRate"
                label="Mutation Rate"
                value={config.mutationRate}
                min={0.01}
                max={0.3}
                step={0.01}
                disabled={controlsDisabled}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={(v) => setConfig({ mutationRate: v })}
              />
              <SliderWithHint
                hintKey="selectionPressure"
                label="Selection Pressure"
                value={config.selectionPressure}
                min={0.1}
                max={0.9}
                step={0.05}
                disabled={controlsDisabled}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={(v) => setConfig({ selectionPressure: v })}
              />
              <SliderWithHint
                hintKey="generationLength"
                label="Generation Length"
                value={config.generationLength}
                min={200}
                max={1200}
                step={50}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ generationLength: v })}
              />
            </div>
          </CollapsibleSection>

          <Separator className="bg-[var(--quark-border)]" />

          <CollapsibleSection title="Environment">
            <div className="space-y-4">
              <SliderWithHint
                hintKey="foodDensity"
                label="Food Density"
                value={config.foodDensity}
                min={30}
                max={250}
                step={10}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ foodDensity: v })}
              />
              <SliderWithHint
                hintKey="poisonDensity"
                label="Poison Density"
                value={config.poisonDensity}
                min={0}
                max={80}
                step={5}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ poisonDensity: v })}
              />
              <SliderWithHint
                hintKey="worldWidth"
                label="World Width"
                value={config.worldWidth}
                min={800}
                max={1600}
                step={50}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ worldWidth: v })}
              />
              <SliderWithHint
                hintKey="worldHeight"
                label="World Height"
                value={config.worldHeight}
                min={500}
                max={1000}
                step={50}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ worldHeight: v })}
              />
            </div>
          </CollapsibleSection>

          <Separator className="bg-[var(--quark-border)]" />

          <CollapsibleSection title="Creature">
            <div className="space-y-4">
              <SliderWithHint
                hintKey="visionRange"
                label="Vision Range"
                value={config.visionRange}
                min={40}
                max={250}
                step={10}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ visionRange: v })}
              />
              <SliderWithHint
                hintKey="maxSpeed"
                label="Max Speed"
                value={config.maxSpeed}
                min={0.5}
                max={5}
                step={0.1}
                disabled={controlsDisabled}
                format={(v) => v.toFixed(1)}
                onChange={(v) => setConfig({ maxSpeed: v })}
              />
              <SliderWithHint
                hintKey="initialEnergy"
                label="Initial Energy"
                value={config.initialEnergy}
                min={50}
                max={150}
                step={5}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ initialEnergy: v })}
              />
            </div>
          </CollapsibleSection>
        </div>
      </ScrollArea>
    </aside>
  )
}
