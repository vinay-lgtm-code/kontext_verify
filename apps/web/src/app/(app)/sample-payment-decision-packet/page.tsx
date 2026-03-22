import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";

export default function SamplePacketPage() {
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
              What a payment decision packet looks like
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Every payment decision monitored by Kontext produces a structured
              evidence record. This is what a reviewer, auditor, or partner sees
              when they ask &ldquo;what happened with this payment?&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Context */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            Why evidence packets matter
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            When a sponsor bank reviewer, internal auditor, or enterprise
            partner asks about a specific payment, they need more than a
            transaction hash. They need to see the full decision context: what
            checks ran, what the results were, who approved it, and proof that
            the record hasn&apos;t been modified.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            A payment decision packet is the structured artifact that answers
            these questions. It combines the payment summary, compliance checks,
            sanctions screening, approval chain, and a cryptographic integrity
            marker into a single exportable record.
          </p>
        </div>
      </section>

      {/* Full packet */}
      <section
        id="sample-packet"
        className="border-t border-border bg-[var(--ic-surface-2)]"
      >
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Sample evidence packet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[var(--ic-text-muted)]">
              This is a representative packet for a $25,000 USDC payout on
              Base. Every field is captured automatically by Kontext.
            </p>
          </div>
          <div className="mt-10">
            <PaymentDecisionPacket variant="full" />
          </div>
        </div>
      </section>

      {/* How Kontext helps */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
            How Kontext creates these packets
          </h2>
          <ul className="mt-6 space-y-4">
            {[
              "One integration captures payment summary, policy checks, screening results, and approval chain automatically",
              "Every record is cryptographically linked in a tamper-evident digest chain",
              "Packets export in JSON, CSV, or examiner-ready formats",
              "Evidence is structured — not reconstructed from logs after the fact",
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
              See a live sample for your payment flow
            </h2>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Book a Demo
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/use-cases">Use Cases</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
