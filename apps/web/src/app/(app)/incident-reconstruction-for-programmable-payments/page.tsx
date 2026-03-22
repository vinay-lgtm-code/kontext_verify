"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";
import { AssessmentDrawer } from "@/components/assessment/assessment-drawer";
import { track } from "@/lib/analytics";

export default function IncidentReconstructionPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Guide
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Incident reconstruction for programmable payments
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              When a payment is flagged, disputed, or goes wrong, you need to
              reconstruct what happened — who approved it, what checks ran, and
              whether the right policies were in force. That process shouldn&apos;t
              take hours.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Why incident review is slow
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Most payment teams store compliance evidence across multiple
            systems: transaction data in one database, screening results in
            another, approval records in chat or email, and policy
            configurations in version-controlled config files. When an incident
            happens, someone has to manually correlate data from all these
            sources, reconstruct the timeline, and produce a narrative for
            stakeholders.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            This process takes hours or days — time you don&apos;t have when a
            partner is asking questions or a regulator needs a response. The
            risk isn&apos;t just speed: it&apos;s that the reconstructed
            timeline might be wrong, incomplete, or impossible to verify.
          </p>
        </div>
      </section>

      {/* Artifact */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Incident case packet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Kontext produces a complete case packet for any payment in
              seconds — no log-diving required.
            </p>
          </div>
          <div className="mt-10">
            <PaymentDecisionPacket variant="compact" />
          </div>
        </div>
      </section>

      {/* How it helps */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            How Kontext makes reconstruction instant
          </h2>
          <ul className="mt-6 space-y-4">
            {[
              "Every payment decision is captured as a single, structured record at execution time — not reconstructed later",
              "Screening results, approval chains, and policy checks are bound to the payment record with timestamps",
              "The tamper-evident digest chain proves the record hasn't been modified after the incident",
              "Case packets export in structured formats for internal review, partner response, or regulatory filing",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-accent)]" />
                <span className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              How fast could you reconstruct an incident?
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={() => {
                  track("incident_reconstruction_assessment_click");
                  setDrawerOpen(true);
                }}
              >
                Run a Readiness Assessment
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Book a Demo</Link>
              </Button>
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
