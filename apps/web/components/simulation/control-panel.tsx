"use client"

import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { Dices, Pause, Play, RotateCcw, Square } from "lucide-react"

import { SLIDER_HINTS } from "@/lib/slider-hints"
import { useSimulationStore } from "@/store/simulation-store"
import packageJson from "../../package.json"

import { AboutDialog } from "./about-dialog"
import { CollapsibleSection } from "./collapsible-section"
import { ScenarioPicker } from "./scenario-picker"
import { SimulationInfoDialog } from "./simulation-info-dialog"
import { SliderWithHint } from "./slider-with-hint"

interface ControlPanelProps {
  onStart: () => void
  onQuit: () => void
  onReset: () => void
}

interface ModeOptionProps {
  title: string
  description: string
  active: boolean
  disabled: boolean
  onClick: () => void
}

function ModeOption({
  title,
  description,
  active,
  disabled,
  onClick,
}: ModeOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-[var(--quark-accent)] bg-[var(--quark-accent)]/10 text-[var(--quark-accent)]"
          : "border-[var(--quark-border)] bg-black/20 text-foreground hover:border-[var(--quark-accent)]/40"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="block text-xs font-medium">{title}</span>
      <span className="mt-1 block text-[10px] leading-relaxed text-[var(--quark-muted)]">
        {description}
      </span>
    </button>
  )
}

export function ControlPanel({ onStart, onQuit, onReset }: ControlPanelProps) {
  const config = useSimulationStore((s) => s.config)
  const isRunning = useSimulationStore((s) => s.isRunning)
  const phase = useSimulationStore((s) => s.phase)
  const simulationSpeed = useSimulationStore((s) => s.simulationSpeed)
  const simulationDynamics = useSimulationStore((s) => s.simulationDynamics)
  const setConfig = useSimulationStore((s) => s.setConfig)
  const setDynamics = useSimulationStore((s) => s.setDynamics)
  const setRunning = useSimulationStore((s) => s.setRunning)
  const setSimulationSpeed = useSimulationStore((s) => s.setSimulationSpeed)
  const randomizeConfig = useSimulationStore((s) => s.randomizeConfig)

  const controlsDisabled = phase === "active"
  const ecosystemControlsDisabled = controlsDisabled || !config.ecosystemMode
  const generationalControlsDisabled = controlsDisabled || config.ecosystemMode
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
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-mono tracking-wide text-[var(--quark-muted)]">
              v{packageJson.version}
            </span>
            <AboutDialog />
            <SimulationInfoDialog />
          </div>
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

          <CollapsibleSection title="Ecosystem">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-[var(--quark-muted)]">
                  Simulation Mode
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ModeOption
                    title="Ecosystem"
                    description="Continuous world with births, deaths, and spreading vegetation."
                    active={config.ecosystemMode}
                    disabled={controlsDisabled}
                    onClick={() => setConfig({ ecosystemMode: true })}
                  />
                  <ModeOption
                    title="Generational"
                    description="Controlled cycles where survivors seed each next generation."
                    active={!config.ecosystemMode}
                    disabled={controlsDisabled}
                    onClick={() => setConfig({ ecosystemMode: false })}
                  />
                </div>
                <p className="text-[10px] leading-relaxed text-[var(--quark-muted)]/80">
                  {SLIDER_HINTS.ecosystemMode}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-[var(--quark-muted)]">Dynamics</p>
                <div className="grid grid-cols-2 gap-2">
                  <ModeOption
                    title="Evolutionary"
                    description="Herbivores may evolve into omnivores or carnivores over time."
                    active={simulationDynamics === "evolutionary"}
                    disabled={controlsDisabled}
                    onClick={() => setDynamics("evolutionary")}
                  />
                  <ModeOption
                    title="Emergent Predation"
                    description="Seeds a few predators and favors hunting niches when prey is abundant."
                    active={simulationDynamics === "predator-prey"}
                    disabled={controlsDisabled}
                    onClick={() => setDynamics("predator-prey")}
                  />
                </div>
                <p className="text-[10px] leading-relaxed text-[var(--quark-muted)]/80">
                  {SLIDER_HINTS.simulationDynamics}
                </p>
              </div>
              <SliderWithHint
                hintKey="vegetationGrowthRate"
                label="Vegetation Growth"
                value={config.vegetationGrowthRate}
                min={60}
                max={500}
                step={20}
                disabled={ecosystemControlsDisabled}
                onChange={(v) => setConfig({ vegetationGrowthRate: v })}
              />
              <SliderWithHint
                hintKey="vegetationSpreadRadius"
                label="Seed Spread Radius"
                value={config.vegetationSpreadRadius}
                min={20}
                max={180}
                step={10}
                disabled={ecosystemControlsDisabled}
                onChange={(v) => setConfig({ vegetationSpreadRadius: v })}
              />
              <SliderWithHint
                hintKey="fertilityDriftRate"
                label="Fertility Drift"
                value={config.fertilityDriftRate}
                min={0}
                max={2}
                step={0.1}
                disabled={ecosystemControlsDisabled}
                format={(v) => v.toFixed(1)}
                onChange={(v) => setConfig({ fertilityDriftRate: v })}
              />
              <SliderWithHint
                hintKey="climateVolatility"
                label="Climate Volatility"
                value={config.climateVolatility}
                min={0}
                max={1}
                step={0.05}
                disabled={ecosystemControlsDisabled}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={(v) => setConfig({ climateVolatility: v })}
              />
              <SliderWithHint
                hintKey="rainBias"
                label="Rain Bias"
                value={config.rainBias}
                min={-1}
                max={1}
                step={0.05}
                disabled={ecosystemControlsDisabled}
                format={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%`}
                onChange={(v) => setConfig({ rainBias: v })}
              />
            </div>
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
                disabled={generationalControlsDisabled}
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
                disabled={generationalControlsDisabled}
                onChange={(v) => setConfig({ generationLength: v })}
              />
              <SliderWithHint
                hintKey="eliteCount"
                label="Elite Count"
                value={config.eliteCount}
                min={0}
                max={5}
                step={1}
                disabled={generationalControlsDisabled}
                onChange={(v) => setConfig({ eliteCount: v })}
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
                max={10}
                step={1}
                disabled={controlsDisabled}
                onChange={(v) => setConfig({ poisonDensity: v })}
              />
              <div className="space-y-2">
                <p className="text-xs text-[var(--quark-muted)]">
                  Food Distribution
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["uniform", "cluster"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={controlsDisabled}
                      onClick={() => setConfig({ foodDistribution: mode })}
                      className={`rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                        config.foodDistribution === mode
                          ? "border-[var(--quark-accent)] bg-[var(--quark-accent)]/10 text-[var(--quark-accent)]"
                          : "border-[var(--quark-border)] bg-black/20 text-foreground hover:border-[var(--quark-accent)]/40"
                      } ${controlsDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-[var(--quark-muted)]/80">
                  {SLIDER_HINTS.foodDistribution}
                </p>
              </div>
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
              <SliderWithHint
                hintKey="noiseStrength"
                label="Noise Strength"
                value={config.noiseStrength}
                min={0}
                max={0.5}
                step={0.05}
                disabled={controlsDisabled}
                format={(v) => v.toFixed(2)}
                onChange={(v) => setConfig({ noiseStrength: v })}
              />
              <SliderWithHint
                hintKey="predationMaxPreySizeRatio"
                label="Prey Size Ratio"
                value={config.predationMaxPreySizeRatio}
                min={0.4}
                max={0.7}
                step={0.05}
                disabled={controlsDisabled}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={(v) => setConfig({ predationMaxPreySizeRatio: v })}
              />
            </div>
          </CollapsibleSection>
        </div>
      </ScrollArea>
    </aside>
  )
}
