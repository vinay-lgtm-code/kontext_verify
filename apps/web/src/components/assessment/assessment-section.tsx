"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { AssessmentDrawer } from "./assessment-drawer";
import { track } from "@/lib/analytics";

export function AssessmentSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Payment Review Readiness Assessment
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Could your team survive a real payment review tomorrow?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Assess one payment flow in 3-8 minutes. Identify the evidence gaps
              most likely to slow launch, partner diligence, or incident
              response — and get a concrete remediation plan.
            </p>

            {/* Feature bullets */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                "Readiness tier and sub-scores",
                "Likely reviewer blockers",
                "Missing evidence artifacts",
                "30/60/90-day remediation plan",
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
              onClick={() => {
                setDrawerOpen(true);
                track("assessment_opened");
              }}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[var(--ic-accent)] px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              <ClipboardCheck size={16} />
              Run Review Readiness Assessment
            </button>
            <p className="mt-3 text-[13px] text-[var(--ic-text-dim)]">
              No document upload required. Initial results are shown
              immediately.
            </p>

            {/* Trust explainer */}
            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--ic-border)] px-4 py-3">
                <p className="text-[12px] leading-relaxed text-[var(--ic-text-muted)]">
                  Best for stablecoin infra, cross-border payouts, embedded
                  finance, treasury automation, and agentic payment systems
                </p>
              </div>
              <div className="rounded-lg border border-[var(--ic-border)] px-4 py-3">
                <p className="text-[12px] leading-relaxed text-[var(--ic-text-muted)]">
                  Covers human, API, workflow, and AI-agent initiated payment
                  flows
                </p>
              </div>
            </div>
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
