import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";

export default function WhoApprovedPage() {
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
              How to answer &ldquo;who approved this payment?&rdquo;
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              This is the first question sponsor banks and auditors ask. If your
              answer involves digging through logs and asking teammates, you have
              an evidence gap.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            The problem
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Programmable payments execute fast — often automatically, driven by
            agents or automated rules. When a reviewer asks who or what approved
            a specific payment, the answer is usually scattered across
            application logs, Slack threads, and memory. The approval happened,
            but the evidence trail doesn&apos;t exist in a structured,
            reviewable format.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            This matters because sponsor banks, internal auditors, and
            enterprise partners don&apos;t just want to know the payment went
            through. They want to see the approval chain: who authorized it,
            under what policy, at what time, and whether the required checks ran
            first.
          </p>
        </div>
      </section>

      {/* Artifact */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              The answer Kontext gives you
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Every payment decision includes a structured approval chain with
              timestamps, authority level, and policy reference.
            </p>
          </div>
          <div className="mt-10">
            <PaymentDecisionPacket variant="compact" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            How Kontext captures approvals
          </h2>
          <ul className="mt-6 space-y-4">
            {[
              "Records whether the approver was a human operator, automated system, or multi-step escalation",
              "Captures the policy version in force at decision time — not a retroactive guess",
              "Links the approval to screening results and compliance checks that ran first",
              "Produces a tamper-evident record that proves the approval chain hasn't been modified",
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
              Be ready to answer every payment question
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Book a Demo
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/bank-readiness">Bank Readiness</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
