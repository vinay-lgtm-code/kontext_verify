"use client";

import { useState } from "react";
import { LogoStrip } from "@/components/logo-strip";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";
import { AssessmentDrawer } from "@/components/assessment/assessment-drawer";
import { track } from "@/lib/analytics";

export function HeroSection() {
  const [assessmentOpen, setAssessmentOpen] = useState(false);

  return (
    <>
      <section className="relative px-4 pt-24 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow */}
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)] opacity-0 animate-fade-up">
            Payment evidence is scattered across 5–8 systems. Examiners don't wait.
          </p>

          {/* Headline */}
          <h1 className="mt-4 font-serif text-4xl font-normal leading-[1.1] tracking-tight text-[var(--ic-text)] sm:text-5xl lg:text-6xl opacity-0 animate-fade-up">
            The missing evidence layer between your payment stack and the examiner's desk
          </h1>

          {/* Subheadline */}
          <p
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--ic-text-muted)] opacity-0 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            Every new payment rail — stablecoins, real-time payments, AI-agent
            initiated flows — adds another system your compliance team must
            reconcile before an examiner asks. Kontext captures the decision,
            the checks, the approval, and the proof in one reviewer-ready
            record. No more assembling evidence from 5 systems at 11pm before
            an OCC exam.
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex items-center justify-center gap-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <a
              href="#evidence-package"
              onClick={() => track("hero_cta_examiner_evidence")}
              className="inline-flex items-center rounded-lg bg-[var(--ic-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              See what your examiner would get
            </a>
            <button
              onClick={() => {
                track("hero_cta_evidence_gaps");
                setAssessmentOpen(true);
              }}
              className="inline-flex items-center rounded-lg border border-[var(--ic-border)] px-6 py-3 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)] hover:text-[var(--ic-text)]"
            >
              Score your evidence gaps in 3 minutes
            </button>
          </div>

          {/* Proof strip */}
          <p
            className="mx-auto mt-6 max-w-lg text-[13px] text-[var(--ic-text-dim)] opacity-0 animate-fade-up"
            style={{ animationDelay: "350ms" }}
          >
            Built for controls enforcement, partner diligence, incident
            reconstruction, and reviewer-ready exports
          </p>

          {/* Payment Decision Packet visual */}
          <div
            className="mx-auto mt-12 max-w-4xl pointer-events-auto select-none opacity-0 animate-slide-up"
            style={{ animationDelay: "400ms" }}
          >
            <PaymentDecisionPacket variant="full" />
          </div>

          {/* Logo strip */}
          <div
            className="mt-12 opacity-0 animate-fade-in"
            style={{ animationDelay: "500ms" }}
          >
            <LogoStrip />
          </div>
        </div>
      </section>

      <AssessmentDrawer
        open={assessmentOpen}
        onClose={() => setAssessmentOpen(false)}
      />
    </>
  );
}
