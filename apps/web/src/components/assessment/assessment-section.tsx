"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { AssessmentDrawer } from "./assessment-drawer";

export function AssessmentSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Assess Your Stack
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Can your stack explain why a payment was allowed?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Assess one payment flow in under 5 minutes. See your evidence
              gaps, audit readiness score, and a remediation roadmap — no signup
              required.
            </p>

            {/* Feature bullets */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                "Audit readiness score",
                "Top evidence gaps",
                "AI operator summary",
                "Evidence schema",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--ic-accent)]" />
                  <span className="text-[13px] text-[var(--ic-text-muted)]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[var(--ic-accent)] px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              <ClipboardCheck size={16} />
              Start Assessment
            </button>
            <p className="mt-3 text-[13px] text-[var(--ic-text-dim)]">
              No signup required for your initial results.
            </p>
          </div>
        </div>
      </section>

      <AssessmentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
