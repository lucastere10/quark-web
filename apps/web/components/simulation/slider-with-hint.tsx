"use client"

import { Info } from "lucide-react"

import { type SliderHintKey, SLIDER_HINTS } from "@/lib/slider-hints"
import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

interface SliderWithHintProps {
  hintKey: SliderHintKey
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  disabled?: boolean
  onChange: (v: number) => void
}

export function SliderWithHint({
  hintKey,
  label,
  value,
  min,
  max,
  step,
  format,
  disabled,
  onChange,
}: SliderWithHintProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Label className="truncate text-xs text-[var(--quark-muted)]">
            {label}
          </Label>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-sm text-[var(--quark-muted)] transition-colors hover:text-[var(--quark-accent)]"
                aria-label={`About ${label}`}
              >
                <Info className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              className="max-w-56 border border-[var(--quark-border)] bg-[#12121f] text-[#d8dce6] shadow-lg [&>svg]:!bg-[#12121f] [&>svg]:!fill-[#12121f]"
            >
              {SLIDER_HINTS[hintKey]}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="shrink-0 font-mono text-xs text-[var(--quark-accent)]">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => onChange(v ?? value)}
      />
    </div>
  )
}
