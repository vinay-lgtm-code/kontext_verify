"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Check, X, Minus } from "lucide-react";
import { AssessmentDrawer } from "@/components/assessment/assessment-drawer";
import { track } from "@/lib/analytics";

const captures = [
  { title: "Initiator type", desc: "Whether the payment was initiated by a human, workflow, API, or AI agent." },
  { title: "Agent ID / service identity", desc: "The specific agent or service that triggered the payment action." },
  { title: "Task or instruction reference", desc: "The batch, task, or instruction that prompted the payment." },
  { title: "Policy checks evaluated", desc: "Which rules applied, what thresholds were evaluated, and whether they passed." },
  { title: "Approval or override chain", desc: "Who or what approved the action, under which authority, and when." },
  { title: "Execution and export record", desc: "Transaction hash, settlement confirmation, and exportable evidence packet." },
];

const scenarios = [
  { title: "Treasury rebalancing", desc: "Agent moves funds between wallets to maintain target balances." },
  { title: "Vendor payout automation", desc: "Scheduled or triggered vendor payments based on invoice approval." },
  { title: "Invoice payment execution", desc: "Agent validates and executes payments against approved invoices." },
  { title: "Payout batch review", desc: "Bulk disbursements where each payment needs individual evidence." },
  { title: "Cross-border routing decisions", desc: "Agent selects optimal corridor and rail for international transfers." },
  { title: "Autonomous exception handling", desc: "Agent escalates or resolves payment exceptions within policy bounds." },
];

const comparisonRows = [
  { label: "Initiator identity", logs: false, txRecords: false, kontext: true },
  { label: "Instruction trace", logs: "partial", txRecords: false, kontext: true },
  { label: "Policy version", logs: false, txRecords: false, kontext: true },
  { label: "Approvals", logs: "partial", txRecords: false, kontext: true },
  { label: "Screening evidence", logs: false, txRecords: "partial", kontext: true },
  { label: "Reviewer export", logs: false, txRecords: false, kontext: true },
];

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={16} className="text-[var(--ic-green)]" />;
  if (value === "partial") return <Minus size={16} className="text-[var(--ic-amber)]" />;
  return <X size={16} className="text-[var(--ic-red)]" />;
}

export default function AIAgentsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              AI Agents
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Controls and evidence for AI agents moving money
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Kontext helps teams prove what an AI agent was allowed to do, what
              checks ran before execution, and how the payment decision was
              approved, blocked, or escalated.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/sample-ai-initiated-payment-packet">
                  See AI-initiated payment packet
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/use-cases/agentic-payments-controls">
                  Explore use case
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Autonomous actions create a new review burden
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            When AI agents can initiate, recommend, or execute payment actions,
            the speed of money movement increases — but the review and
            compliance obligations don&apos;t disappear. Sponsor banks, auditors,
            and enterprise partners still need to know who or what initiated a
            payment, what controls were in place, and whether screening and
            approvals ran before funds moved.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Most teams handle this with application logs and transaction
            receipts. That works until someone asks for the full decision
            context — and reconstructing it takes hours instead of seconds.
          </p>
        </div>
      </section>

      {/* What Kontext captures */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Evidence Fields
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              What Kontext captures for agent-initiated payments
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {captures.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <ShieldCheck size={20} className="text-[var(--ic-accent)]" />
                <h3 className="mt-3 text-[15px] font-semibold text-[var(--ic-text)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common scenarios */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Scenarios
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              Common scenarios for AI-initiated payments
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((s) => (
              <div
                key={s.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <h3 className="text-[15px] font-semibold text-[var(--ic-text)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why not just logs? */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Comparison
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              Why not just logs?
            </h2>
          </div>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ic-border)]">
                  <th className="pb-3 text-left font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                    Evidence
                  </th>
                  <th className="pb-3 text-center font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                    Raw Logs
                  </th>
                  <th className="pb-3 text-center font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                    Tx Records
                  </th>
                  <th className="pb-3 text-center font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-accent)]">
                    Kontext
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-[var(--ic-border)]/50"
                  >
                    <td className="py-3 text-[var(--ic-text-muted)]">
                      {row.label}
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex justify-center">
                        <ComparisonCell value={row.logs} />
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex justify-center">
                        <ComparisonCell value={row.txRecords} />
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex justify-center">
                        <ComparisonCell value={row.kontext} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Run an agentic payments readiness assessment
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              See how your payment controls stack up when AI agents are part of
              the flow.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={() => {
                  track("ai_agents_assessment_click");
                  setDrawerOpen(true);
                }}
              >
                Run Readiness Assessment
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Book a Demo</Link>
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
                href="/sample-ai-initiated-payment-packet"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                AI-initiated payment packet →
              </Link>
              <Link
                href="/use-cases/incident-review"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                Incident review →
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
