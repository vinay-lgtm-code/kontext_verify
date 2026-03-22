import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const useCases = [
  {
    title: "Stablecoin treasury and payouts",
    pain: "Treasury agents move USDC across wallets with no audit trail connecting the decision to the transfer.",
    artifacts: [
      "Payment decision record with approval chain",
      "OFAC screening evidence with timestamps",
      "Tamper-evident audit trail across all payouts",
    ],
    href: "/use-cases/stablecoin-infrastructure",
  },
  {
    title: "Cross-border disbursements",
    pain: "Multi-rail cross-border flows generate compliance evidence in different formats across different systems.",
    artifacts: [
      "Unified evidence format across CCTP and fiat rails",
      "Travel Rule compliance records for $3K+ transfers",
      "Cross-chain transfer lineage with screening proof",
    ],
    href: "/use-cases/cross-border",
  },
  {
    title: "Embedded finance and BaaS controls",
    pain: "Embedded finance platforms can't prove to sponsor banks that compliance checks ran on every transaction.",
    artifacts: [
      "Per-transaction compliance evidence for bank review",
      "Policy version capture at decision time",
      "Examiner-ready export for partner diligence",
    ],
    href: "/use-cases/embedded-finance",
  },
  {
    title: "Agentic payments controls",
    pain: "AI agents and automated workflows can initiate payments faster than manual finance operations — but reviewers still need evidence of what controls ran.",
    artifacts: [
      "Agent / workflow identity",
      "Approval rules and overrides",
      "Reviewer-ready export",
    ],
    href: "/use-cases/agentic-payments-controls",
  },
];

export default function UseCasesPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Use Cases
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Compliance evidence for every payment workflow
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Kontext creates examiner-ready evidence wherever programmable
              payments flow — stablecoin treasury, cross-border, embedded
              finance, and incident response.
            </p>
          </div>
        </div>
      </section>

      {/* Use case tiles */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="flex flex-col rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <h2 className="text-lg font-semibold text-[var(--ic-text)]">
                  {uc.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {uc.pain}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {uc.artifacts.map((a) => (
                    <li
                      key={a}
                      className="flex items-start gap-2 text-[13px] text-[var(--ic-text-muted)]"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-accent)]" />
                      {a}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Button variant="outline" className="gap-2" asChild>
                    <Link href={uc.href}>
                      View use case
                      <ArrowRight size={14} />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              See how Kontext works for your payment flow
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Every payment decision gets a structured evidence record — policy
              checks, screening results, and cryptographic proof.
            </p>
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
