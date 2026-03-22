"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";
import { AssessmentDrawer } from "@/components/assessment/assessment-drawer";
import { track } from "@/lib/analytics";

const checklistItems = [
  {
    area: "Transaction Screening",
    items: [
      "OFAC/SDN screening runs on every payment before execution",
      "Screening results are timestamped and tied to the specific transaction",
      "Screening list versions are recorded for audit reference",
    ],
  },
  {
    area: "Approval Controls",
    items: [
      "Every payment above threshold has a recorded approval chain",
      "Approver identity, authority level, and timestamp are captured",
      "Policy version in force at decision time is preserved",
    ],
  },
  {
    area: "Audit Trail Integrity",
    items: [
      "Audit records are tamper-evident (modification is detectable)",
      "Evidence trail is continuous — no gaps between screening and execution",
      "Records can be independently verified by external reviewers",
    ],
  },
  {
    area: "Export & Reporting",
    items: [
      "Structured export formats available (not just raw logs)",
      "Examiner-ready packets can be generated on demand",
      "SAR/CTR templates are available for regulatory filings",
    ],
  },
];

export default function BankReadinessChecklistPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Checklist
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Bank readiness checklist for payment startups
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Sponsor banks and payment partners evaluate your compliance
              controls before approving your program. This checklist covers the
              evidence requirements most teams miss.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Most payment startups build strong products but weak evidence
            trails. When a sponsor bank or enterprise partner asks to see your
            compliance controls, the answer shouldn&apos;t be &ldquo;let me pull
            some logs together.&rdquo; It should be a structured evidence packet
            that proves checks ran, policies were followed, and records
            haven&apos;t been tampered with.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            The checklist below covers the most common areas where payment
            startups have gaps. Use it to evaluate your current state and
            identify what to fix before your next review.
          </p>
        </div>
      </section>

      {/* Checklist */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {checklistItems.map((group) => (
              <div key={group.area}>
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--ic-accent)]">
                  {group.area}
                </h2>
                <ul className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-4 w-4 flex-shrink-0 rounded border border-[var(--ic-border)] bg-[hsl(var(--background))]" />
                      <span className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artifact */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              What &ldquo;ready&rdquo; looks like
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Kontext produces a structured evidence record for every payment
              decision — the artifact that answers reviewer questions.
            </p>
          </div>
          <div className="mt-10">
            <PaymentDecisionPacket variant="compact" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Score your readiness in 2 minutes
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={() => {
                  track("checklist_assessment_click");
                  setDrawerOpen(true);
                }}
              >
                Run a Readiness Assessment
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/bank-readiness">Bank Readiness Guide</Link>
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
