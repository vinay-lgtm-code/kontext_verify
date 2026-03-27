"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";
import { ReviewerQuestions } from "@/components/reviewer-questions";
import { AssessmentDrawer } from "@/components/assessment/assessment-drawer";
import { track } from "@/lib/analytics";

const partnerQuestions = [
  {
    question: "Who or what initiated this payment?",
    what: "Initiation source tracking for human, workflow, API, or AI-agent actions, including the service or agent identity and instruction reference.",
  },
  {
    question: "Who approved this payment?",
    what: "Full approval chain with timestamps, authority level, and policy reference for every payment decision.",
  },
  {
    question: "What checks ran before funds moved?",
    what: "OFAC/SDN screening results, EDD threshold checks, and counterparty verification — all with proof they ran before execution.",
  },
  {
    question: "Was the payment blocked, approved, or escalated?",
    what: "Explicit enforcement mode and disposition tracking so reviewers can see whether a payment stayed advisory, was blocked, or was routed into human review.",
  },
  {
    question: "Which policy version was in force?",
    what: "Exact policy rules evaluated at decision time — threshold values, approval requirements, screening configurations.",
  },
  {
    question: "Can this record be independently verified?",
    what: "Digest proof returned with events and portable export files that can be verified by auditors, counterparties, or regulators.",
  },
  {
    question: "How do you handle GDPR, erasure, and redaction?",
    what: "PII separation, subject access exports, erasure workflow logging, and redacted export modes for non-compliance audiences.",
  },
  {
    question: "Can you export the evidence?",
    what: "Structured case packets in JSON, CSV, examiner-ready, partner diligence, incident review, or redacted formats.",
  },
];

const commonGaps = [
  "No tamper-evident proof that compliance checks ran before payment execution",
  "Audit trails reconstructed after the fact from application logs",
  "Screening evidence stored separately from payment records",
  "No structured export format — diligence responses built from screenshots",
  "Policy versions not captured at decision time, making retroactive review unreliable",
  "No clear answer for right-to-erasure or redacted diligence exports",
];

export default function BankReadinessPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Bank Readiness
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Pass partner diligence with real evidence, not screenshots
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Sponsor banks and enterprise partners ask hard questions about your
              payment controls. Kontext gives you examiner-ready answers backed
              by enforcement records, reviewer-ready exports, and verifiable
              proof.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={() => {
                  track("bank_readiness_assessment_click");
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

      {/* What partners ask */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Partner Diligence
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              What sponsor banks and partners usually ask
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Every question maps to controls and evidence Kontext captures automatically.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {partnerQuestions.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <p className="text-[14px] font-medium italic text-[var(--ic-text)]">
                  &ldquo;{item.question}&rdquo;
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {item.what}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample diligence packet */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Evidence Output
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)]">
              A sample diligence packet for a single payment
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Every payment decision produces a structured evidence record with
              initiation source, enforcement state, policy checks, screening
              results, export controls, and verification proof.
            </p>
          </div>
          <div className="mt-10">
            <PaymentDecisionPacket variant="full" />
          </div>
        </div>
      </section>

      {/* Common gaps */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Common Gaps
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)]">
              Where most payment startups fall short
            </h2>
          </div>
          <ul className="mt-10 space-y-4">
            {commonGaps.map((gap) => (
              <li key={gap} className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--ic-red)]"
                />
                <span className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {gap}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FFIEC request letter mapping */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Mapped to What Examiners Actually Request
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              FFIEC BSA/AML first-request letter items
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-[var(--ic-text-muted)]">
              The FFIEC BSA/AML Examination Manual (Appendix H) defines 130+
              document categories in a standard first-request letter. Here is how
              Kontext maps to the most common third-party payment processor items.
            </p>
          </div>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ic-border)]">
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]">
                    FFIEC Request Item
                  </th>
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]">
                    What Examiners Want
                  </th>
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-red)]">
                    Without Kontext
                  </th>
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-green)]">
                    With Kontext
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Processor policies & procedures",
                    "Written controls documentation",
                    "Confluence, Google Docs, scattered",
                    "Policy version captured per decision",
                  ],
                  [
                    "Transaction details & volume",
                    "Activity records with amounts, parties, dates",
                    "Core banking + blockchain explorer + processor dashboard",
                    "Unified activity view across all rails",
                  ],
                  [
                    "SARs filed on processor relationships",
                    "Filing history with supporting docs",
                    "Case management + FinCEN BSA E-Filing",
                    "SAR workflow with linked evidence packets",
                  ],
                  [
                    "NACHA return correspondence",
                    "High return rate documentation",
                    "Email + NACHA portal",
                    "Alert evidence linked to payment records",
                  ],
                  [
                    "Screening results",
                    "OFAC/SDN check evidence",
                    "Screening vendor dashboard",
                    "Timestamped, cryptographically linked to each payment",
                  ],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-[var(--ic-border)]/50">
                    <td className="py-3 text-[var(--ic-text)]">{row[0]}</td>
                    <td className="py-3 text-[var(--ic-text-muted)]">{row[1]}</td>
                    <td className="py-3 text-[var(--ic-text-muted)]">{row[2]}</td>
                    <td className="py-3 text-[var(--ic-text-muted)]">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AI agents subsection */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            When AI agents are part of the payment flow
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            If software agents can initiate, recommend, or influence payment
            actions, reviewers often need additional clarity on initiation
            source, control boundaries, approval requirements, and exception
            handling. Kontext packages this context into the same evidence
            workflow used for broader diligence and audit preparation.
          </p>
          <div className="mt-4">
            <Link
              href="/ai-agents"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ic-accent)] transition-colors hover:text-[var(--ic-accent)]/80"
            >
              Learn more about AI agent controls
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Governance + Verification
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              Evidence reviewers can verify, govern, and export
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6">
              <h3 className="text-[15px] font-semibold text-[var(--ic-text)]">
                Independent verification
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  "Digest proof returned with verification events",
                  "Export files that third parties can validate independently",
                  "Portable evidence across wallet, processor, and banking stacks",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ic-green)]" />
                    <span className="text-[13px] text-[var(--ic-text-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6">
              <h3 className="text-[15px] font-semibold text-[var(--ic-text)]">
                GDPR and data governance
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  "PII separation from the cryptographic audit record",
                  "Subject access exports and redacted diligence packets",
                  "Erasure workflow logging without breaking audit integrity",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ic-accent)]" />
                    <span className="text-[13px] text-[var(--ic-text-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center font-serif text-2xl font-normal text-[var(--ic-text)]">
            Diligence prep before and after Kontext
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-red)]">
                Before Kontext
              </span>
              <ul className="mt-3 space-y-3">
                {[
                  "Weeks of manual evidence collection",
                  "Screenshots and spreadsheets for reviewers",
                  "No proof screening happened before execution",
                  "Inconsistent formats across payment rails",
                  "Re-do prep every time a partner asks",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-red)]" />
                    <span className="text-[13px] text-[var(--ic-text-muted)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-green)]">
                With Kontext
              </span>
              <ul className="mt-3 space-y-3">
                {[
                  "Structured evidence packets generated automatically",
                  "Examiner-ready exports replace ad hoc collection",
                  "Cryptographic proof of screening sequence",
                  "Unified evidence format across all payment rails",
                  "Diligence responses backed by verifiable evidence",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-green)]" />
                    <span className="text-[13px] text-[var(--ic-text-muted)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Reviewer Questions */}
      <section className="border-t border-border bg-background">
        <ReviewerQuestions />
      </section>

      {/* Related resources */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
            Related Resources
          </span>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              href="/bank-readiness-checklist"
              className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-4 text-[13px] text-[var(--ic-text-muted)] transition-colors hover:border-[var(--ic-accent)]/30 hover:text-[var(--ic-text)]"
            >
              Bank readiness checklist →
            </Link>
            <Link
              href="/sample-payment-decision-packet"
              className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-4 text-[13px] text-[var(--ic-text-muted)] transition-colors hover:border-[var(--ic-accent)]/30 hover:text-[var(--ic-text)]"
            >
              Sample evidence packet →
            </Link>
            <Link
              href="/how-to-answer-who-approved-this-payment"
              className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-4 text-[13px] text-[var(--ic-text-muted)] transition-colors hover:border-[var(--ic-accent)]/30 hover:text-[var(--ic-text)]"
            >
              Who approved this payment? →
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Be ready for your next partner review
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              See how your payment stack scores against common diligence
              requirements.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={() => {
                  track("bank_readiness_bottom_assessment_click");
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
