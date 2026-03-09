import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Kontext — Payment Control Plane",
  description:
    "Payment infrastructure is fragmented. Every provider has its own data model, lifecycle states, and audit format. Kontext unifies them into a canonical 8-stage payment lifecycle with policy enforcement and cryptographic proof.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              ABOUT KONTEXT
            </h1>
            <p className="mt-6 text-sm text-[var(--term-text-2)] leading-relaxed">
              Payment infrastructure is fragmented. Every provider has its own
              data model, its own lifecycle states, its own audit format.
              Kontext unifies them.
            </p>
            <p className="mt-4 text-sm text-[var(--term-text-2)] leading-relaxed">
              One SDK. One lifecycle. Every payment auditable from intent to
              settlement.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="prose-kontext max-w-3xl">
            <h2><span className="text-[var(--term-green)]">$</span> THE PROBLEM</h2>
            <p>
              Every payment platform speaks a different language. Circle
              Programmable Wallets use one lifecycle model. Bridge uses another.
              Modern Treasury a third. On-chain USDC transfers via EVM or
              Solana have no lifecycle model at all -- just raw transactions
              and block confirmations.
            </p>
            <p>
              If you integrate two providers, you have two data models. If you
              integrate five, you have five. There is no unified view of a
              payment from the moment someone expresses intent to the moment
              the recipient is credited and the books are reconciled.
            </p>
            <p>
              This is not just an engineering inconvenience. It is a
              compliance gap. Auditors ask &quot;show me the lifecycle of this
              payment.&quot; If your answer requires stitching together
              webhooks from three providers and two block explorers, you do
              not have a compliance story. You have a forensics project.
            </p>

            <Separator className="my-12" />

            <h2><span className="text-[var(--term-green)]">$</span> THE SOLUTION</h2>
            <p>
              Kontext is the Payment Control Plane -- a TypeScript SDK that
              normalizes payment events from any provider into a canonical
              8-stage lifecycle:
            </p>
            <ol>
              <li>
                <strong>Intent</strong> -- a payment is requested
              </li>
              <li>
                <strong>Authorize</strong> -- policy engine evaluates
                sanctions, limits, and metadata requirements
              </li>
              <li>
                <strong>Prepare</strong> -- transaction is constructed and
                ready for submission
              </li>
              <li>
                <strong>Transmit</strong> -- transaction is broadcast to the
                network or provider
              </li>
              <li>
                <strong>Confirm</strong> -- on-chain or provider confirmation
                received
              </li>
              <li>
                <strong>Recipient Credit</strong> -- funds are credited to
                the recipient
              </li>
              <li>
                <strong>Reconcile</strong> -- payment is matched against
                internal records
              </li>
              <li>
                <strong>Retry or Refund</strong> -- failed payments are
                retried or reversed
              </li>
            </ol>
            <p>
              Every payment becomes a <strong>PaymentAttempt</strong> -- a
              single object containing an ordered list
              of <strong>StageEvents</strong>, each recording who acted, what
              happened, and when. The attempt reaches
              a <strong>FinalState</strong>: succeeded, failed, review,
              blocked, or refunded.
            </p>
            <p>
              Provider adapters handle the translation. Circle webhooks,
              Bridge callbacks, Modern Treasury events, raw EVM transactions,
              Solana confirmations, x402 payment headers -- each adapter
              implements <code>normalizeEvent()</code> to map provider-specific
              data into the canonical StageEvent format. You write your
              business logic against one model regardless of how many
              providers you integrate.
            </p>

            <Separator className="my-12" />

            <h2><span className="text-[var(--term-green)]">$</span> POLICY ENGINE</h2>
            <p>
              At the <strong>authorize</strong> stage, the policy engine
              evaluates every payment against configurable rules before it
              moves forward. Checks include:
            </p>
            <ol>
              <li>
                <strong>OFAC sanctions screening</strong> -- sender and
                recipient addresses checked against the Treasury SDN list
              </li>
              <li>
                <strong>Transaction limits</strong> -- per-transaction
                maximums and daily aggregate caps
              </li>
              <li>
                <strong>Blocklist / allowlist</strong> -- explicit recipient
                and sender controls
              </li>
              <li>
                <strong>Metadata requirements</strong> -- enforce that
                payroll payments include employee ID and pay period,
                remittances include recipient country and purpose, invoices
                include invoice ID and vendor ID
              </li>
              <li>
                <strong>Review thresholds</strong> -- amounts above a
                configurable threshold require human approval
              </li>
            </ol>
            <p>
              The result is a <strong>PaymentReceipt</strong> with a clear
              decision: <code>allow</code>, <code>block</code>,
              {" "}<code>review</code>, or <code>collect_info</code>. Every
              check is recorded. Every violation is documented. The receipt
              includes a digest proof linking it to the full audit history.
            </p>
            <p>
              The GENIUS Act (S. 1582, signed July 2025) treats payment
              stablecoin issuers as financial institutions under the BSA, with
              implementing regulations due July 2026. The policy engine gives
              developers the technical infrastructure to enforce compliance
              rules programmatically -- sanctions screening, transaction
              thresholds, and audit trails built into the payment flow rather
              than bolted on after the fact.
            </p>

            <Separator className="my-12" />

            <h2><span className="text-[var(--term-green)]">$</span> WORKSPACE PROFILES</h2>
            <p>
              Not every payment has the same compliance requirements. Payroll
              needs employee metadata. Cross-border remittance needs recipient
              country and purpose. B2B invoicing needs invoice IDs and vendor
              references. Micropayments need high throughput with lower
              per-transaction scrutiny.
            </p>
            <p>
              Workspace profiles let you declare your payment archetypes
              upfront -- payroll, remittance, invoicing, treasury,
              micropayments -- and Kontext applies the right policy preset to
              each. Presets configure transaction limits, daily aggregate
              caps, review thresholds, required metadata fields, and
              notification triggers. You can customize any preset or define
              your own from scratch.
            </p>
            <p>
              A single workspace can operate multiple archetypes. The profile
              also specifies which chains and settlement assets are active,
              whether the policy engine runs in monitor mode (log violations
              but do not block) or enforce mode (block non-compliant
              payments), and how retry logic behaves on failure.
            </p>

            <Separator className="my-12" />

            <h2><span className="text-[var(--term-green)]">$</span> TAMPER-EVIDENT AUDIT</h2>
            <p>
              Every PaymentReceipt is SHA-256 linked to the one before it,
              forming a digest chain. Modify a single record and the chain
              breaks. This is your tamper-evident audit trail -- verifiable
              locally without any external service.
            </p>
            <p>
              The digest chain answers the question auditors actually ask:
              &quot;Can you prove this compliance check ran and was not
              altered after the fact?&quot; The answer is a cryptographic
              verification that takes milliseconds.
            </p>

            <Separator className="my-12" />

            <h2><span className="text-[var(--term-green)]">$</span> VISION</h2>
            <p>
              Every payment, regardless of provider or chain, should follow
              the same auditable lifecycle. A payroll disbursement through
              Circle, a cross-border remittance through Bridge, and a raw
              USDC transfer on Solana should all produce the same data
              structure, pass through the same policy checks, and generate
              the same audit artifacts.
            </p>
            <p>
              Kontext exists because payment infrastructure should not
              dictate your compliance architecture. You pick the providers.
              You pick the chains. Kontext gives you one control plane across
              all of them.
            </p>
            <p>
              The SDK is open source under the MIT license, has zero runtime
              dependencies, and installs with <code>npm install</code>. We
              are building in the open. If you are moving money
              programmatically and need a unified lifecycle with policy
              enforcement, we would like to hear from you.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-16 flex flex-col items-start gap-4 sm:flex-row">
            <Button size="lg" className="gap-2" asChild>
              <a
                href="https://github.com/Legaci-Labs/kontext"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </Button>
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <Link href="/docs">
                Read the Docs
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <a
                href="https://x.com/kontextverify"
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow on X
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
