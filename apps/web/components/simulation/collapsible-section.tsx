"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className="font-display text-xs font-medium uppercase tracking-widest text-[var(--quark-muted)]">
          {title}
        </h2>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-[var(--quark-muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && children}
    </section>
  )
}
