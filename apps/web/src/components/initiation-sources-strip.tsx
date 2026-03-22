"use client";

import { useState } from "react";

const sources = [
  {
    label: "Human initiated",
    desc: "Capture approvals, policy checks, and execution evidence for manual payment operations.",
  },
  {
    label: "Workflow initiated",
    desc: "Preserve orchestration context and rules applied inside automated financial workflows.",
  },
  {
    label: "API initiated",
    desc: "Record the service, policy version, and controls that governed money movement triggered by applications.",
  },
  {
    label: "AI agent initiated",
    desc: "Track the agent, instruction reference, approvals, and controls applied before an autonomous action moved funds.",
  },
];

export function InitiationSourcesStrip() {
  const [active, setActive] = useState(3);

  return (
    <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
            Initiation Sources
          </span>
          <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
            One evidence layer across every initiation path
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {sources.map((src, i) => (
            <button
              key={src.label}
              onClick={() => setActive(i)}
              className={`rounded-full border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors ${
                active === i
                  ? "border-[var(--ic-accent)] bg-[var(--ic-accent-dim)] text-[var(--ic-accent)]"
                  : "border-[var(--ic-border)] text-[var(--ic-text-dim)] hover:border-[var(--ic-accent)]/30 hover:text-[var(--ic-text-muted)]"
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-6 max-w-lg text-center">
          <p className="text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            {sources[active]?.desc}
          </p>
        </div>
      </div>
    </section>
  );
}
