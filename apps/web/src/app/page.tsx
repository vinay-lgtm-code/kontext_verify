import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentView } from "@/components/agent-view";

const verifyClean = `{
  compliant: true,
  riskLevel: 'low',
  checks: [
    { name: 'OFAC Sanctions', passed: true },
    { name: 'Amount Threshold', passed: true },
  ],
  trustScore: { score: 92, level: 'high' },
  digestProof: { valid: true, chainLength: 42 },
}`;

const verifyAlert = `{
  compliant: true,
  riskLevel: 'medium',
  checks: [
    { name: 'OFAC Sanctions', passed: true },
    { name: 'Amount Threshold (CTR)', passed: true,
      details: 'Above $10K CTR threshold' },
  ],
  recommendations: ['File CTR within 15 days'],
  trustScore: { score: 71, level: 'medium' },
}`;

const verifyBlocked = `{
  compliant: false,
  riskLevel: 'critical',
  checks: [
    { name: 'OFAC Sanctions', passed: false,
      details: 'Address on SDN list' },
  ],
  recommendations: ['Block transaction', 'File SAR'],
  trustScore: { score: 12, level: 'untrusted' },
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
              kontext — trust infrastructure for agents that move{" "}
              <span className="text-[var(--term-green)] glow">USDC</span> on{" "}
              <span className="text-[var(--term-green)] glow">Base</span> &amp;{" "}
              <span className="text-[var(--term-green)] glow">Arc</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[var(--term-text-2)] max-w-3xl">
              One call — <code className="text-[var(--term-green)]">verify()</code> — runs
              OFAC screening, logs into a tamper-evident digest chain, computes trust
              score, and returns structured compliance. Zero dependencies. Free on Base + Arc.
            </p>
          </div>

          {/* 5-Tab Hero */}
          <AgentView />
        </div>
      </section>

      {/* What verify() Returns */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="text-[var(--term-green)]">$</span> What verify() returns
            </h2>
            <p className="mt-2 text-sm text-[var(--term-text-2)]">
              Three scenarios. One function call each.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-[var(--term-green)] bg-[var(--term-surface)]">
              <div className="border-b border-[var(--term-green)] px-4 py-2 flex items-center gap-2">
                <span className="led-green" />
                <span className="text-xs text-[var(--term-green)]">
                  $500 USDC — Clean
                </span>
              </div>
              <div className="p-4">
                <pre className="text-[11px] text-[var(--term-text-2)] leading-relaxed whitespace-pre-wrap font-mono">
                  {verifyClean}
                </pre>
              </div>
            </div>

            <div className="border border-[var(--term-amber)] bg-[var(--term-surface)]">
              <div className="border-b border-[var(--term-amber)] px-4 py-2 flex items-center gap-2">
                <span className="led-amber" />
                <span className="text-xs text-[var(--term-amber)]">
                  $15K USDC — CTR Alert
                </span>
              </div>
              <div className="p-4">
                <pre className="text-[11px] text-[var(--term-text-2)] leading-relaxed whitespace-pre-wrap font-mono">
                  {verifyAlert}
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
                  {verifyBlocked}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Layers of Proof */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="text-[var(--term-green)]">$</span> Three layers of proof
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] p-6">
              <h3 className="text-sm font-medium mb-3">
                <span className="text-[var(--term-text-3)]">1.</span> DIGEST CHAIN
              </h3>
              <p className="text-xs text-[var(--term-text-2)] leading-relaxed mb-4">
                SHA-256 hash chain linking every action. Tamper = chain breaks.
              </p>
              <pre className="text-[11px] text-[var(--term-text-3)] font-mono">
{`getTerminalDigest()
verifyDigestChain()
exportDigestChain()`}
              </pre>
            </div>

            <div className="border border-[var(--term-green)] bg-[var(--term-surface)] p-6">
              <h3 className="text-sm font-medium mb-3">
                <span className="text-[var(--term-text-3)]">2.</span> ON-CHAIN ANCHOR
              </h3>
              <p className="text-[10px] text-[var(--term-green)] uppercase tracking-wider mb-2">
                Batch Optimized
              </p>
              <pre className="text-[11px] text-[var(--term-text-2)] font-mono leading-relaxed">
{`batchAnchor(digests, {
  batchSize: 50
})

One tx anchors 50 events
~$0.001 total on Base`}
              </pre>
            </div>

            <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] p-6">
              <h3 className="text-sm font-medium mb-3">
                <span className="text-[var(--term-text-3)]">3.</span> A2A ATTESTATION
              </h3>
              <p className="text-xs text-[var(--term-text-2)] leading-relaxed mb-4">
                Bilateral compliance proof between agent pairs via x402. Cryptographic.
              </p>
              <pre className="text-[11px] text-[var(--term-text-3)] font-mono">
{`exchangeAttestation()
fetchAgentCard()
/.well-known/kontext`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Regulatory Context */}
      <section className="border-t border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] p-6 sm:p-8">
            <h2 className="text-sm font-medium mb-4">
              <span className="text-[var(--term-green)]">$</span> GENIUS ACT (S. 1582) — signed July 18, 2025
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 text-xs text-[var(--term-text-2)]">
              <div className="space-y-2">
                <p>
                  <span className="text-[var(--term-text-3)]">Implementing regulations:</span>{" "}
                  <span className="text-[var(--term-amber)]">July 2026</span>
                </p>
                <p>
                  <span className="text-[var(--term-text-3)]">Prohibitions effective:</span>{" "}
                  <span className="text-[var(--term-red)]">November 2026</span>
                </p>
                <p className="mt-4 leading-relaxed">
                  Payment stablecoin issuers are financial institutions under the BSA.
                  Agents handling $3K+ transfers need:
                </p>
              </div>
              <div className="space-y-1.5">
                <p>
                  <span className="text-[var(--term-green)]">✓</span> OFAC screening{" "}
                  <span className="text-[var(--term-text-3)]">← verify() does this</span>
                </p>
                <p>
                  <span className="text-[var(--term-green)]">✓</span> Audit trails{" "}
                  <span className="text-[var(--term-text-3)]">← digest chain does this</span>
                </p>
                <p>
                  <span className="text-[var(--term-green)]">✓</span> Transaction records{" "}
                  <span className="text-[var(--term-text-3)]">← logTransaction() does this</span>
                </p>
                <p>
                  <span className="text-[var(--term-green)]">✓</span> Suspicious activity reports{" "}
                  <span className="text-[var(--term-text-3)]">← generateSARReport() does this</span>
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
                <li>20K events/month on Base + Arc</li>
                <li>No credit card required</li>
                <li>OFAC screening</li>
                <li>Digest chain</li>
                <li>Trust scoring</li>
                <li>JSON audit export</li>
                <li>Human-in-the-loop tasks</li>
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
                $2.00 <span className="text-sm font-normal text-[var(--term-text-3)]">/ 1K events above 20K</span>
              </p>
              <ul className="space-y-1.5 text-xs text-[var(--term-text-2)]">
                <li>No monthly minimum</li>
                <li>All 8 chains</li>
                <li>CSV export</li>
                <li>SAR/CTR reports</li>
                <li>Advanced anomaly rules</li>
                <li>Webhook alerts</li>
                <li>Unified screening</li>
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
              "GENIUS Act Aligned",
              "USDC Native",
              "Base + Arc Free",
              "Open Source",
              "x402 Compatible",
              "Zero Dependencies",
            ].map((item, i) => (
              <span key={item} className="flex items-center gap-2">
                {item}
                {i < 7 && (
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
            Ship compliance before the deadline.
          </h2>
          <p className="mt-3 text-sm text-[var(--term-text-2)] max-w-xl mx-auto">
            npm install. Kontext.init(). verify(). Three layers of proof in one call.
            Open source, TypeScript-first, free forever on Base + Arc.
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
