import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";

const risks = [
  "Sponsor banks require per-transaction compliance evidence that BaaS platforms struggle to produce",
  "Embedded payment flows share infrastructure but need isolated audit trails per program",
  "No structured way to prove policy version and screening results at partner review time",
  "Evidence collection for diligence is manual, time-consuming, and inconsistent",
];

const captures = [
  "Per-transaction compliance evidence mapped to sponsor bank requirements",
  "Policy version capture at decision time — no retroactive guessing about which rules applied",
  "Structured examiner-ready exports for partner diligence and bank review",
  "Role-based access so compliance, risk, and audit teams see what they need",
  "Tamper-evident trail that proves evidence integrity to external reviewers",
];

export default function EmbeddedFinancePage() {
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
              Compliance evidence for embedded finance and BaaS
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Sponsor banks need proof that your embedded payment flows run
              proper compliance checks. Kontext creates that proof automatically
              for every transaction.
            </p>
          </div>
        </div>
      </section>

      {/* Risks */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Typical risks
          </h2>
          <ul className="mt-6 space-y-4">
            {risks.map((r) => (
              <li key={r} className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--ic-red)]"
                />
                <span className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {r}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What Kontext captures */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            What Kontext captures
          </h2>
          <ul className="mt-6 space-y-4">
            {captures.map((c) => (
              <li key={c} className="flex items-start gap-3">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--ic-green)]"
                />
                <span className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {c}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Evidence output */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Evidence output for an embedded payment
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              Every embedded transaction produces a structured evidence record
              ready for bank review.
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
              See a case packet for embedded finance
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Book a Demo
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/use-cases">All Use Cases</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-[13px]">
              <Link href="/sample-payment-decision-packet" className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]">Sample evidence packet →</Link>
              <Link href="/bank-readiness" className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]">Bank readiness →</Link>
              <Link href="/assessment" className="text-[var(--ic-text-muted)] hover:text-[var(--ic-accent)]">Readiness assessment →</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
