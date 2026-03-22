"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";
import { AssessmentDrawer } from "@/components/assessment/assessment-drawer";
import { track } from "@/lib/analytics";

const risks = [
  {
    title: "Actions can outpace manual oversight",
    desc: "AI agents execute payment decisions faster than any human reviewer can monitor in real time.",
  },
  {
    title: "Decision context gets fragmented",
    desc: "Agent reasoning, policy evaluation, and execution evidence end up in different systems.",
  },
  {
    title: "Reviewers ask different questions",
    desc: "Partner banks and auditors want to know who or what initiated the payment — not just who owns the wallet.",
  },
  {
    title: "Reconstruction becomes expensive",
    desc: "Without structured evidence, incident response means weeks of log reconstruction across services.",
  },
];

const evidenceFields = [
  { field: "Initiator type", desc: "Human, workflow, API, or AI agent" },
  { field: "Agent ID", desc: "Specific agent or service identity" },
  { field: "Instruction reference", desc: "Task, batch, or instruction that triggered the action" },
  { field: "Requested action", desc: "Transfer amount, destination, and payment type" },
  { field: "Policy version", desc: "Rules and thresholds in force at decision time" },
  { field: "Threshold evaluation", desc: "Whether amount triggered additional controls" },
  { field: "Counterparty check result", desc: "Screening result with list version and timestamp" },
  { field: "Approval chain", desc: "Who or what approved, authority level, and timing" },
  { field: "Exception disposition", desc: "How flagged items were resolved or escalated" },
  { field: "Execution metadata", desc: "Transaction hash, settlement confirmation, chain" },
  { field: "Export record", desc: "Examiner-ready packet with integrity marker" },
];

const patterns = [
  {
    title: "Agent proposes, human approves",
    desc: "Agent recommends a payment action. Human reviewer approves or rejects before execution.",
  },
  {
    title: "Agent executes within policy bounds",
    desc: "Agent autonomously executes payments that fall within pre-defined policy thresholds.",
  },
  {
    title: "Agent escalates exceptions",
    desc: "Agent identifies unusual conditions and escalates to human review before proceeding.",
  },
  {
    title: "Multi-step workflow execution",
    desc: "Agent orchestrates a sequence of checks, approvals, and transfers across multiple steps.",
  },
];

export default function AgenticPaymentsControlsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Use Case
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Make AI-initiated payments explainable
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              When AI agents initiate or influence payment decisions, Kontext
              captures the full decision trail — from instruction to screening
              to approval to execution.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/sample-ai-initiated-payment-packet">
                  See sample AI-initiated packet
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Talk to the team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Built for teams deploying autonomy into money movement
          </h2>
          <ul className="mt-6 space-y-3">
            {[
              "Stablecoin payment infrastructure",
              "Treasury automation platforms",
              "Embedded finance products",
              "Cross-border payout systems",
              "Internal finance automation teams",
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

      {/* Risks */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Risks unique to agentic payments
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {risks.map((r) => (
              <div
                key={r.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <AlertTriangle
                  size={20}
                  className="text-[var(--ic-red)]"
                />
                <h3 className="mt-3 text-[15px] font-semibold text-[var(--ic-text)]">
                  {r.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evidence fields */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              What Kontext captures
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Every agent-initiated payment produces a structured evidence
              record with these fields.
            </p>
          </div>
          <div className="mt-10 space-y-3">
            {evidenceFields.map((ef) => (
              <div
                key={ef.field}
                className="flex items-start gap-4 rounded-md border border-[var(--ic-border)] bg-[hsl(var(--background))] px-4 py-3"
              >
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--ic-green)]"
                />
                <div>
                  <span className="text-[13px] font-medium text-[var(--ic-text)]">
                    {ef.field}
                  </span>
                  <span className="ml-2 text-[13px] text-[var(--ic-text-muted)]">
                    — {ef.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample artifact */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Sample evidence packet for an agent-initiated payment
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              This is what a reviewer sees when they look up a payment that was
              initiated by an AI agent.
            </p>
          </div>
          <div className="mt-10">
            <PaymentDecisionPacket variant="full" />
          </div>
        </div>
      </section>

      {/* Implementation patterns */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Implementation patterns
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Common patterns for how teams deploy AI agents with payment
              controls.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {patterns.map((p) => (
              <div
                key={p.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <h3 className="text-[15px] font-semibold text-[var(--ic-text)]">
                  {p.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Deploy autonomous payment workflows with evidence built in
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/sample-ai-initiated-payment-packet">
                  See sample packet
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  track("agentic_uc_assessment_click");
                  setDrawerOpen(true);
                }}
              >
                Run readiness assessment
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-[13px]">
              <Link
                href="/ai-agents"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                AI agents overview →
              </Link>
              <Link
                href="/sample-ai-initiated-payment-packet"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                AI payment packet →
              </Link>
              <Link
                href="/assessment"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                Readiness assessment →
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
