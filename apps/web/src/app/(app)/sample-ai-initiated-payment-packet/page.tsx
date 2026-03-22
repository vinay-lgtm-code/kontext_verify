"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";
import { AssessmentDrawer } from "@/components/assessment/assessment-drawer";
import { track } from "@/lib/analytics";

const requiredFields = [
  "Initiator type (human, workflow, API, or AI agent)",
  "Agent ID or service identity",
  "Instruction context (task, batch, or prompt reference)",
  "Approval chain with authority and timestamps",
  "Policy trace — rules evaluated and results",
  "Execution metadata (transaction hash, chain, settlement)",
];

export default function SampleAIInitiatedPacketPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Evidence Artifact
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              See what an AI-initiated payment packet looks like
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              When an AI agent initiates a payment, reviewers need to see
              exactly what happened — the agent identity, instruction context,
              policy checks, approvals, and execution evidence.
            </p>
          </div>
        </div>
      </section>

      {/* Context */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Why AI-initiated packets include additional fields
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Standard payment evidence captures what checks ran and whether
            the payment was approved. When an AI agent initiates the payment,
            reviewers also need to know which agent acted, what instruction
            triggered the action, and what authority the agent had at decision
            time.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Kontext adds initiation source fields to every evidence packet
            automatically — no additional integration required. The same
            packet format works whether the payment was initiated by a human,
            workflow, API, or AI agent.
          </p>
        </div>
      </section>

      {/* Full packet */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Sample AI-initiated evidence packet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              This packet shows a $48,200 USDC vendor payout initiated by
              treasury-rebalancer-v2. Every field is captured automatically.
            </p>
          </div>
          <div className="mt-10">
            <PaymentDecisionPacket variant="full" />
          </div>
        </div>
      </section>

      {/* Required fields */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Required fields for AI-initiated payments
          </h2>
          <ul className="mt-6 space-y-3">
            {requiredFields.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--ic-green)]"
                />
                <span className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {f}
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
              Check your readiness for AI-initiated payments
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={() => {
                  track("ai_packet_assessment_click");
                  setDrawerOpen(true);
                }}
              >
                Run Readiness Assessment
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/ai-agents">AI Agents Overview</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-[13px]">
              <Link
                href="/use-cases/agentic-payments-controls"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                Agentic payments use case →
              </Link>
              <Link
                href="/sample-payment-decision-packet"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                Standard evidence packet →
              </Link>
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
