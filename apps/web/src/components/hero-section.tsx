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
            For payment, treasury, risk, and compliance teams
          </p>

          {/* Headline */}
          <h1 className="mt-4 font-serif text-4xl font-normal leading-[1.1] tracking-tight text-[var(--ic-text)] sm:text-5xl lg:text-6xl opacity-0 animate-fade-up">
            Explain every payment decision.
          </h1>

          {/* Subheadline */}
          <p
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--ic-text-muted)] opacity-0 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            Kontext helps payment, treasury, risk, and compliance teams enforce
            policy, screen counterparties, and generate reviewer-ready evidence
            across stablecoin, ACH, wire, and card flows. Approve, block, or
            escalate payment decisions with a trail built for launch reviews,
            partner diligence, and audit prep.
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex items-center justify-center gap-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <a
              href="#evidence-package"
              onClick={() => track("hero_cta_sample_packet")}
              className="inline-flex items-center rounded-lg bg-[var(--ic-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              See a sample case packet
            </a>
            <button
              onClick={() => {
                track("hero_cta_assessment");
                setAssessmentOpen(true);
              }}
              className="inline-flex items-center rounded-lg border border-[var(--ic-border)] px-6 py-3 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)] hover:text-[var(--ic-text)]"
            >
              Run a readiness assessment
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
