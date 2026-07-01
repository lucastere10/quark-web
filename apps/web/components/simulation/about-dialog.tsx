"use client"

import type { ComponentType } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Code2, ExternalLink, User } from "lucide-react"

const DEV_LINKS = {
  github: "https://github.com/lucastere10",
  portfolio: "https://portfolio.caldasdev.store/",
  linkedin: "https://www.linkedin.com/in/lucas-caldas50/",
} as const

const OTHER_PROJECTS = [
  {
    name: "DROP",
    href: "https://drop.caldasdev.store/",
    description:
      "Spreadsheet ingestion with LLM-generated insights and ML analysis pipelines.",
  },
  {
    name: "PassaNOTA",
    href: "http://passanota.caldasdev.store/",
    description:
      "Capture product receipts with AI, extract line items, and build cost breakdowns and analysis.",
  },
  {
    name: "Newsletter AI",
    href: "https://newsletter-ai.caldasdev.store/",
    description:
      "AI newsletter system driven by predefined options and user actions. Pulls from RSS and primarily EXA for research and content tuning.",
  },
] as const

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 4.126 0 2.063 2.063 0 0 1-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function LinkButton({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--quark-border)] bg-black/20 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-[var(--quark-accent)]/50 hover:bg-[var(--quark-accent)]/10"
    >
      <Icon className="size-3.5 text-[var(--quark-accent)]" />
      {label}
      <ExternalLink className="size-3 text-[var(--quark-muted)]" />
    </a>
  )
}

export function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs">
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-[var(--quark-border)] bg-[#0a0a14] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[var(--quark-accent)]">
            About Quark
          </DialogTitle>
          <DialogDescription>
            Artificial life simulation — intelligence emerging from evolution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="mb-2 font-medium">The project</h3>
            <p className="text-xs leading-relaxed text-[var(--quark-muted)]">
              Quark is an interactive web experiment where creatures survive
              with small feed-forward neural networks and genetic algorithms. No
              behaviors are scripted — each agent senses food, poison, and
              obstacles, decides how to move, and passes mutated brains to the
              next generation if it performs well enough.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--quark-muted)]">
              Built with Next.js, React, TypeScript, PixiJS, and a neural
              network implemented from scratch. The expanded brain inspector
              shows inputs, outputs, activations, and connections in real time.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-medium">Developer</h3>
            <p className="text-sm font-medium text-foreground">Lucas Caldas</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--quark-muted)]">
              Software developer interested in simulations, frontend
              architecture, and applied AI — from emergent systems to practical
              ML and LLM tooling.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton
                href={DEV_LINKS.github}
                icon={Code2}
                label="GitHub"
              />
              <LinkButton
                href={DEV_LINKS.portfolio}
                icon={User}
                label="Portfolio"
              />
              <LinkButton
                href={DEV_LINKS.linkedin}
                icon={LinkedInIcon}
                label="LinkedIn"
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-medium">Other projects</h3>
            <ul className="space-y-3">
              {OTHER_PROJECTS.map((project) => (
                <li key={project.name}>
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-md border border-[var(--quark-border)] bg-black/20 px-3 py-2.5 transition-colors hover:border-[var(--quark-accent)]/50 hover:bg-[var(--quark-accent)]/5"
                  >
                    <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--quark-accent)]">
                      {project.name}
                      <ExternalLink className="size-3 text-[var(--quark-muted)] opacity-60" />
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--quark-muted)]">
                      {project.description}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
