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
    area: "Initiation Source Tracking",
    items: [
      "Every payment records whether it was initiated by a human, workflow, API, or AI agent",
      "Agent identity or service ID is captured at decision time",
      "Instruction reference (task, batch, or prompt) is linked to the payment record",
    ],
  },
  {
    area: "Agent Identity Capture",
    items: [
      "Each agent has a unique, persistent identifier in the evidence trail",
      "Agent version or configuration is recorded alongside the payment decision",
      "Initiator type is distinguishable in audit exports and reviewer-facing reports",
    ],
  },
  {
    area: "Approval Workflows for Autonomous Actions",
    items: [
      "Payments above policy thresholds require human approval before execution",
      "Approval authority, timestamp, and policy reference are captured",
      "Override and escalation decisions are recorded with reviewer identity",
    ],
  },
  {
    area: "Policy-Bound Execution Controls",
    items: [
      "Policy version in force at decision time is captured for every payment",
      "Threshold evaluations (amount, frequency, destination) are recorded",
      "Screening results (OFAC/SDN) are tied to the specific payment record",
    ],
  },
  {
    area: "Evidence Export for Agent-Initiated Payments",
    items: [
      "Structured evidence packets can be generated for any agent-initiated payment",
      "Exports include initiation source, policy checks, approvals, and integrity markers",
      "Evidence format is consistent across human-initiated and agent-initiated flows",
    ],
  },
];

export default function AgenticPaymentsReadinessChecklistPage() {
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
              Agentic payments readiness checklist
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              If AI agents can initiate, recommend, or execute payment
              actions in your system, these are the evidence and control
              requirements most teams miss.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Deploying AI agents into payment workflows adds speed and
            automation — but it also creates new evidence requirements.
            Sponsor banks and partner reviewers expect to see who or what
            initiated a payment, what controls were in place, and whether
            the evidence trail distinguishes autonomous actions from manual
            ones.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Use this checklist to evaluate whether your current
            infrastructure captures the evidence needed for agent-initiated
            payment flows.
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
              What &ldquo;ready&rdquo; looks like for agent-initiated payments
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Kontext produces a structured evidence record for every payment
              — including initiation source, agent identity, and approval chain.
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
              Score your agentic payments readiness
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={() => {
                  track("agentic_checklist_assessment_click");
                  setDrawerOpen(true);
                }}
              >
                Run a Readiness Assessment
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/ai-agents">AI Agents Overview</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-[13px]">
              <Link
                href="/why-ai-agents-moving-money-need-controls"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                Why agents need controls →
              </Link>
              <Link
                href="/sample-ai-initiated-payment-packet"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                AI-initiated payment packet →
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
