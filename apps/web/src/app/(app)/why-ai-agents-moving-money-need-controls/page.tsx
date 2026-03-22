import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, ShieldCheck } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";

const riskAreas = [
  {
    title: "No initiator identity in the audit trail",
    desc: "Transaction records show wallet addresses, not whether a human or an AI agent triggered the payment. Reviewers can't distinguish autonomous actions from manual ones.",
  },
  {
    title: "Policy enforcement happens outside the evidence trail",
    desc: "Agents may check thresholds and screening results in application code, but the evidence of those checks isn't tied to the payment record.",
  },
  {
    title: "Approval chains are implicit, not recorded",
    desc: "When an agent acts within policy bounds, there's often no structured record of which policy applied, what the bounds were, or whether a human reviewed the decision.",
  },
  {
    title: "Reconstruction after an incident is expensive",
    desc: "Without structured evidence, investigating a flagged agent-initiated payment means correlating logs across multiple services manually.",
  },
];

export default function WhyAIAgentsNeedControlsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Buyer Education
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Why AI agents moving money need controls
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              AI agents can initiate, recommend, and execute payment actions at
              machine speed. The compliance and review obligations don&apos;t
              move any faster.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            The evidence gap when agents move money
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Payment infrastructure teams are deploying AI agents for treasury
            management, vendor payouts, cross-border disbursements, and
            automated invoice processing. The agents work — money moves. But
            when a sponsor bank, auditor, or compliance officer asks what
            happened with a specific payment, the answer is scattered across
            application logs, transaction receipts, and team memory.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            This isn&apos;t a hypothetical problem. It&apos;s the gap between
            &ldquo;our agent processed the payment&rdquo; and &ldquo;here&apos;s
            the structured evidence showing what checks ran, who approved it,
            and that the record hasn&apos;t been modified.&rdquo;
          </p>
        </div>
      </section>

      {/* Risk areas */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Where the risks show up
          </h2>
          <div className="mt-8 space-y-6">
            {riskAreas.map((r) => (
              <div key={r.title} className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--ic-red)]"
                />
                <div>
                  <p className="text-[14px] font-medium text-[var(--ic-text)]">
                    {r.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Kontext helps */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            How Kontext fills the gap
          </h2>
          <ul className="mt-6 space-y-4">
            {[
              "Captures initiator type, agent ID, and instruction reference for every payment",
              "Records policy checks, screening results, and approval chain in a structured format",
              "Links every record cryptographically in a tamper-evident digest chain",
              "Exports examiner-ready evidence packets on demand",
              "Works across human, workflow, API, and AI agent initiation paths",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--ic-green)]"
                />
                <span className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Evidence output */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              What the evidence looks like
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Every agent-initiated payment produces a structured evidence
              record with initiation source, policy checks, and integrity proof.
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
              See how Kontext handles AI-initiated payments
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Book a Demo
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/ai-agents">AI Agents Overview</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-[13px]">
              <Link
                href="/sample-ai-initiated-payment-packet"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                AI-initiated payment packet →
              </Link>
              <Link
                href="/agentic-payments-readiness-checklist"
                className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]"
              >
                Readiness checklist →
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
    </>
  );
}
