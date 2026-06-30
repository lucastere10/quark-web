"use client"

import { useMemo } from "react"
import {
  Background,
  Controls,
  type Edge,
  Handle,
  type Node,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  HIDDEN_COUNT,
  INPUT_COUNT,
  INPUT_LABELS,
  OUTPUT_COUNT,
  OUTPUT_LABELS,
} from "@/engine/neural-network"
import type { CreatureSnapshot } from "@/store/simulation-store"
import { cn } from "@workspace/ui/lib/utils"

function NeuronNode({
  data,
}: {
  data: {
    label: string
    activation: number
    layer: "input" | "hidden" | "output"
    compact?: boolean
  }
}) {
  const intensity = Math.max(0.2, Math.min(1, data.activation))
  const color =
    data.layer === "input"
      ? `rgba(0, 229, 204, ${intensity})`
      : data.layer === "hidden"
        ? `rgba(153, 51, 255, ${intensity})`
        : `rgba(255, 153, 0, ${intensity})`

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-md border text-center",
        data.compact ? "min-w-[56px] px-1.5 py-1" : "min-w-[80px] px-2 py-1.5",
      )}
      style={{
        borderColor: color,
        background: color.replace(/[\d.]+\)$/, "0.18)"),
        boxShadow: `0 0 ${intensity * 16}px ${color.replace(/[\d.]+\)$/, "0.45)")}`,
      }}
    >
      {data.layer !== "input" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-[var(--quark-accent)]"
        />
      )}
      <span className="text-[9px] text-[var(--quark-muted)]">{data.label}</span>
      <span className="font-mono text-[10px] text-foreground">
        {data.activation.toFixed(2)}
      </span>
      {data.layer !== "output" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-[var(--quark-accent)]"
        />
      )}
    </div>
  )
}

const nodeTypes = { neuron: NeuronNode }

interface NeuralNetworkViewProps {
  creature: CreatureSnapshot
  mode?: "compact" | "full"
  height?: number | string
  interactive?: boolean
}

function buildGraph(creature: CreatureSnapshot, simplified: boolean) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  if (simplified) {
    const avgInput =
      creature.inputs.reduce((a, b) => a + Math.abs(b), 0) / INPUT_COUNT
    const avgHidden =
      creature.hidden.reduce((a, b) => a + b, 0) / HIDDEN_COUNT
    const avgOutput =
      creature.outputs.reduce((a, b) => a + b, 0) / OUTPUT_COUNT

    nodes.push(
      {
        id: "layer-input",
        type: "neuron",
        position: { x: 0, y: 40 },
        data: {
          label: `Inputs (${INPUT_COUNT})`,
          activation: avgInput,
          layer: "input",
        },
      },
      {
        id: "layer-hidden",
        type: "neuron",
        position: { x: 180, y: 40 },
        data: {
          label: `Hidden (${HIDDEN_COUNT})`,
          activation: avgHidden,
          layer: "hidden",
        },
      },
      {
        id: "layer-output",
        type: "neuron",
        position: { x: 360, y: 40 },
        data: {
          label: `Outputs (${OUTPUT_COUNT})`,
          activation: avgOutput,
          layer: "output",
        },
      },
    )

    edges.push(
      {
        id: "e-in-hid",
        source: "layer-input",
        target: "layer-hidden",
        style: { stroke: "rgba(153,51,255,0.5)", strokeWidth: 2 },
        animated: avgHidden > 0.4,
      },
      {
        id: "e-hid-out",
        source: "layer-hidden",
        target: "layer-output",
        style: { stroke: "rgba(255,153,0,0.5)", strokeWidth: 2 },
        animated: avgOutput > 0.4,
      },
    )

    return { nodes, edges }
  }

  const inputX = 0
  const hiddenX = 220
  const outputX = 440

  for (let i = 0; i < INPUT_COUNT; i++) {
    nodes.push({
      id: `in-${i}`,
      type: "neuron",
      position: { x: inputX, y: i * 56 },
      data: {
        label: INPUT_LABELS[i],
        activation: creature.inputs[i] ?? 0,
        layer: "input",
      },
    })
  }

  for (let h = 0; h < HIDDEN_COUNT; h++) {
    nodes.push({
      id: `hid-${h}`,
      type: "neuron",
      position: { x: hiddenX, y: h * 36 - 20 },
      data: {
        label: `H${h + 1}`,
        activation: creature.hidden[h] ?? 0,
        layer: "hidden",
      },
    })
  }

  for (let o = 0; o < OUTPUT_COUNT; o++) {
    nodes.push({
      id: `out-${o}`,
      type: "neuron",
      position: { x: outputX, y: o * 56 },
      data: {
        label: OUTPUT_LABELS[o],
        activation: creature.outputs[o] ?? 0,
        layer: "output",
      },
    })
  }

  for (let i = 0; i < INPUT_COUNT; i++) {
    for (let h = 0; h < HIDDEN_COUNT; h++) {
      const active = (creature.hidden[h] ?? 0) > 0.5
      edges.push({
        id: `e-in${i}-h${h}`,
        source: `in-${i}`,
        target: `hid-${h}`,
        style: {
          stroke: active ? "rgba(153,51,255,0.6)" : "rgba(153,51,255,0.15)",
          strokeWidth: active ? 2 : 1,
        },
        animated: active,
      })
    }
  }

  for (let h = 0; h < HIDDEN_COUNT; h++) {
    for (let o = 0; o < OUTPUT_COUNT; o++) {
      const active = (creature.outputs[o] ?? 0) > 0.5
      edges.push({
        id: `e-h${h}-o${o}`,
        source: `hid-${h}`,
        target: `out-${o}`,
        style: {
          stroke: active ? "rgba(255,153,0,0.6)" : "rgba(255,153,0,0.15)",
          strokeWidth: active ? 2 : 1,
        },
        animated: active,
      })
    }
  }

  return { nodes, edges }
}

function LayerSummaryBars({ creature }: { creature: CreatureSnapshot }) {
  const avgHidden =
    creature.hidden.reduce((a, b) => a + b, 0) / HIDDEN_COUNT

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        {
          label: "Inputs",
          value:
            creature.inputs.reduce((a, b) => a + Math.abs(b), 0) / INPUT_COUNT,
          color: "#00e5cc",
        },
        { label: "Hidden", value: avgHidden, color: "#9933ff" },
        {
          label: "Outputs",
          value:
            creature.outputs.reduce((a, b) => a + b, 0) / OUTPUT_COUNT,
          color: "#ff9900",
        },
      ].map((layer) => (
        <div
          key={layer.label}
          className="rounded border border-[var(--quark-border)] bg-black/20 p-2"
        >
          <p className="text-[9px] uppercase text-[var(--quark-muted)]">
            {layer.label}
          </p>
          <div className="mt-1 h-2 rounded-full bg-black/40">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${layer.value * 100}%`,
                backgroundColor: layer.color,
              }}
            />
          </div>
          <p className="mt-0.5 font-mono text-[10px]">{layer.value.toFixed(2)}</p>
        </div>
      ))}
    </div>
  )
}

function FlowCanvas({
  nodes,
  edges,
  interactive,
}: {
  nodes: Node[]
  edges: Edge[]
  interactive: boolean
}) {
  return (
    <ReactFlow
      className="!h-full !w-full"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={interactive}
      zoomOnScroll={interactive}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="rgba(0,229,204,0.05)" gap={20} />
      {interactive && <Controls showInteractive={false} />}
    </ReactFlow>
  )
}

function FlowContainer({
  height,
  children,
}: {
  height: number | string
  children: React.ReactNode
}) {
  const resolvedHeight = typeof height === "number" ? `${height}px` : height

  return (
    <div
      className="w-full shrink-0 overflow-hidden rounded-md border border-[var(--quark-border)] bg-black/30"
      style={{ height: resolvedHeight, minHeight: resolvedHeight }}
    >
      <ReactFlowProvider>
        <div style={{ width: "100%", height: resolvedHeight }}>{children}</div>
      </ReactFlowProvider>
    </div>
  )
}

export function NeuralNetworkView({
  creature,
  mode = "full",
  height = 256,
  interactive = false,
}: NeuralNetworkViewProps) {
  const simplified = mode === "compact"

  const { nodes, edges } = useMemo(
    () => buildGraph(creature, simplified),
    [creature, simplified],
  )

  const flowHeight = mode === "compact" ? 144 : height

  if (mode === "compact") {
    return (
      <div className="space-y-3">
        <LayerSummaryBars creature={creature} />
        <FlowContainer height={flowHeight}>
          <FlowCanvas nodes={nodes} edges={edges} interactive={false} />
        </FlowContainer>
      </div>
    )
  }

  return (
    <FlowContainer height={flowHeight}>
      <FlowCanvas nodes={nodes} edges={edges} interactive={interactive} />
    </FlowContainer>
  )
}

export { LayerSummaryBars }
