import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentView } from "@/components/agent-view";

const authorizeAllowed = `{
  decision: 'allow',
  allowed: true,
  checksRun: [
    { name: 'Sanctions screening', passed: true },
    { name: 'Max transaction amount', passed: true },
    { name: 'Daily aggregate limit', passed: true },
  ],
  violations: [],
  digestProof: { valid: true, chainLength: 12 },
}`;

const authorizeReview = `{
  decision: 'review',
  allowed: false,
  checksRun: [
    { name: 'Sanctions screening', passed: true },
    { name: 'Human approval threshold', passed: false },
  ],
  violations: [
    { code: 'REQUIRES_HUMAN_APPROVAL', severity: 'medium' }
  ],
  requiredActions: [
    { code: 'REQUEST_APPROVAL', message: 'Collect human approval' }
  ],
}`;

const authorizeBlocked = `{
  decision: 'block',
  allowed: false,
  checksRun: [
    { name: 'Sanctions screening (recipient)', passed: false },
  ],
  violations: [
    { code: 'SANCTIONED_RECIPIENT', severity: 'critical' }
  ],
  requiredActions: [
    { code: 'CHANGE_RECIPIENT', message: 'Do not send to this recipient' }
  ],
}`;

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="pt-16 pb-8 md:pt-24 md:pb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-[var(--term-green)]">$</span>{" "}
              kontext — payment lifecycle management for{" "}
              <span className="text-[var(--term-green)] glow">modern fintech</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[var(--term-text-2)] max-w-3xl">
              8-stage payment lifecycle. Policy engine with OFAC sanctions screening.
              6 provider adapters. From <code className="text-[var(--term-green)]">intent</code> to{" "}
              <code className="text-[var(--term-green)]">reconciliation</code> in one SDK.
              TypeScript-first. Zero dependencies.
            </p>
          </div>

          {/* 5-Tab Hero */}
          <AgentView />
        </div>
      </section>

      {/* What start() + authorize() Returns */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="text-[var(--term-green)]">$</span> What authorize() returns
            </h2>
            <p className="mt-2 text-sm text-[var(--term-text-2)]">
              Three outcomes. One policy engine call each.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-[var(--term-green)] bg-[var(--term-surface)]">
              <div className="border-b border-[var(--term-green)] px-4 py-2 flex items-center gap-2">
                <span className="led-green" />
                <span className="text-xs text-[var(--term-green)]">
                  $500 USDC — Allowed
                </span>
              </div>
              <div className="p-4">
                <pre className="text-[11px] text-[var(--term-text-2)] leading-relaxed whitespace-pre-wrap font-mono">
                  {authorizeAllowed}
                </pre>
              </div>
            </div>

            <div className="border border-[var(--term-amber)] bg-[var(--term-surface)]">
              <div className="border-b border-[var(--term-amber)] px-4 py-2 flex items-center gap-2">
                <span className="led-amber" />
                <span className="text-xs text-[var(--term-amber)]">
                  $15K USDC — Review Required
                </span>
              </div>
              <div className="p-4">
                <pre className="text-[11px] text-[var(--term-text-2)] leading-relaxed whitespace-pre-wrap font-mono">
                  {authorizeReview}
                </pre>
              </div>
            </div>

            <div className="border border-[var(--term-red)] bg-[var(--term-surface)]">
              <div className="border-b border-[var(--term-red)] px-4 py-2 flex items-center gap-2">
                <span className="led-red" />
                <span className="text-xs text-[var(--term-red)]">
                  Sanctioned — Blocked
                </span>
              </div>
              <div className="p-4">
                <pre className="text-[11px] text-[var(--term-text-2)] leading-relaxed whitespace-pre-wrap font-mono">
                  {authorizeBlocked}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8-Stage Payment Lifecycle */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="text-[var(--term-green)]">$</span> 8-stage payment lifecycle
            </h2>
            <p className="mt-2 text-sm text-[var(--term-text-2)]">
              Every payment follows the same path. Every stage is logged.
            </p>
          </div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            {[
              { num: "1", name: "intent", method: "start()" },
              { num: "2", name: "authorize", method: "authorize()" },
              { num: "3", name: "prepare", method: "record()" },
              { num: "4", name: "transmit", method: "broadcast()" },
              { num: "5", name: "confirm", method: "confirm()" },
              { num: "6", name: "recipient_credit", method: "credit()" },
              { num: "7", name: "reconcile", method: "record()" },
              { num: "8", name: "retry_or_refund", method: "refund()" },
            ].map((stage) => (
              <div
                key={stage.name}
                className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] p-3 text-center"
              >
                <span className="text-[var(--term-green)] text-lg font-bold">
                  {stage.num}
                </span>
                <p className="text-[10px] text-[var(--term-text-2)] mt-1 font-mono">
                  {stage.name}
                </p>
                <p className="text-[10px] text-[var(--term-text-3)] mt-0.5">
                  {stage.method}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Engine — Compliance */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] p-6 sm:p-8">
            <h2 className="text-sm font-medium mb-4">
              <span className="text-[var(--term-green)]">$</span> Policy engine — compliance at every authorize()
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 text-xs text-[var(--term-text-2)]">
              <div className="space-y-2">
                <p>
                  The policy engine runs at the <code>authorize</code> stage. Every payment
                  is checked against configurable rules before transmission.
                </p>
                <p className="mt-4 text-[var(--term-text-3)]">
                  GENIUS Act (S. 1582) regulations due{" "}
                  <span className="text-[var(--term-amber)]">July 2026</span>.
                  Kontext policy engine covers BSA requirements out of the box.
                </p>
              </div>
              <div className="space-y-1.5">
                <p>
                  <span className="text-[var(--term-green)]">+</span> OFAC sanctions screening (sender + recipient)
                </p>
                <p>
                  <span className="text-[var(--term-green)]">+</span> Amount limits (max transaction, daily aggregate)
                </p>
                <p>
                  <span className="text-[var(--term-green)]">+</span> Blocklist / allowlist enforcement
                </p>
                <p>
                  <span className="text-[var(--term-green)]">+</span> Required metadata by payment type
                </p>
                <p>
                  <span className="text-[var(--term-green)]">+</span> Human approval thresholds
                </p>
                <p>
                  <span className="text-[var(--term-green)]">+</span> Tamper-evident digest chain on every receipt
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="text-[var(--term-green)]">$</span> Pricing
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] p-6">
              <h3 className="text-sm font-medium mb-1">FREE</h3>
              <p className="text-2xl font-bold text-[var(--term-green)] mb-4">$0 forever</p>
              <ul className="space-y-1.5 text-xs text-[var(--term-text-2)]">
                <li>20K payment stage events/month</li>
                <li>Core lifecycle (8 stages)</li>
                <li>Policy engine (OFAC, limits, blocklists)</li>
                <li>Digest chain</li>
                <li>5 workspace profiles</li>
                <li>JSON export</li>
                <li>Base chain</li>
              </ul>
              <div className="mt-6">
                <Button size="sm" className="w-full" asChild>
                  <Link href="/docs">$ npm install kontext-sdk</Link>
                </Button>
              </div>
            </div>

            <div className="border border-[var(--term-border-bright)] bg-[var(--term-surface)] p-6">
              <h3 className="text-sm font-medium mb-1">PAY AS YOU GO</h3>
              <p className="text-2xl font-bold mb-4">
                $0.002{" "}
                <span className="text-sm font-normal text-[var(--term-text-3)]">
                  / payment stage event above 20K
                </span>
              </p>
              <ul className="space-y-1.5 text-xs text-[var(--term-text-2)]">
                <li>First 20K events free every month</li>
                <li>All chains (Base, Ethereum, Solana)</li>
                <li>CSV export</li>
                <li>Ops dashboard (5 views)</li>
                <li>Slack + email notifications</li>
                <li>Advanced policy configurations</li>
                <li>6 provider adapters</li>
              </ul>
              <div className="mt-6">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/pricing">$ Get API Key</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--term-text-3)]">
            {[
              "MIT Licensed",
              "Patented Digest Chain",
              "8-Stage Lifecycle",
              "Policy Engine",
              "6 Provider Adapters",
              "5 Workspace Profiles",
              "Ops Dashboard",
              "Open Source",
              "Zero Dependencies",
            ].map((item, i) => (
              <span key={item} className="flex items-center gap-2">
                {item}
                {i < 8 && (
                  <span className="text-[var(--term-surface-3)]">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold">
            Ship payment infrastructure in minutes.
          </h2>
          <p className="mt-3 text-sm text-[var(--term-text-2)] max-w-xl mx-auto">
            npm install. Kontext.init(). start(). authorize(). 8 stages, fully logged.
            Open source, TypeScript-first, free tier included.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/docs">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/Legaci-Labs/kontext"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
