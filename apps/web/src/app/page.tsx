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
    { name: 'Amount Threshold', passed: true,
      details: 'Above review threshold' },
  ],
  recommendations: ['Manual review recommended'],
  trustScore: { score: 71, level: 'medium' },
}`;

const verifyBlocked = `{
  compliant: false,
  riskLevel: 'critical',
  checks: [
    { name: 'OFAC Sanctions', passed: false,
      details: 'Address on SDN list' },
  ],
  recommendations: ['Block transaction'],
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
                  $15K USDC — Review Required
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

      {/* Reasoning Trace */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="text-[var(--term-green)]">$</span> Reasoning trace — 500 USDC via x402
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Kontext follows agents that move programmable money
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Sender Agent */}
            <div className="border border-[var(--term-green)] bg-[var(--term-surface)]">
              <div className="border-b border-[var(--term-green)] px-4 py-2 flex items-center gap-2">
                <span className="led-green" />
                <span className="text-xs text-[var(--term-green)] uppercase tracking-wider">
                  Sender Agent (US)
                </span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-[var(--term-text-2)]">
                  Circle Programmable Wallet{" "}
                  <span className="text-[var(--term-text-3)]">· 0xTreasury...C3</span>
                </p>
                <div className="border-l-2 border-[var(--term-surface-3)] pl-3">
                  <p className="text-[11px] text-[var(--term-text-3)] italic leading-relaxed">
                    reasoning: &quot;Vendor invoice #4821. Recipient verified in allowlist.
                    Amount within daily limit ($25K remaining). Routing via x402 on Base
                    for lowest settlement cost.&quot;
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="text-[var(--term-green)]">verify() →</span>
                  <span className="text-[var(--term-green)]">OFAC ✓</span>
                  <span className="text-[var(--term-green)]">Amount ✓</span>
                  <span className="text-[var(--term-text-2)]">Trust: 92</span>
                  <span className="text-[var(--term-text-3)]">Digest: a7b8...</span>
                </div>
              </div>
            </div>

            {/* Flow connector */}
            <div className="flex flex-col items-center py-2">
              <div className="w-px h-4 bg-[var(--term-surface-3)]" />
              <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] px-4 py-2 text-center">
                <p className="text-[11px] text-[var(--term-text-2)]">x402 / Base</p>
                <p className="text-xs font-medium text-[var(--term-green)]">500 USDC</p>
                <p className="text-[10px] text-[var(--term-text-3)]">tx: 0x3f...a91</p>
              </div>
              <div className="w-px h-2 bg-[var(--term-surface-3)]" />
              <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] px-4 py-2 text-center">
                <p className="text-[11px] text-[var(--term-text-2)]">On-Chain Anchor</p>
                <p className="text-[10px] text-[var(--term-text-3)]">~$0.001 on Base</p>
              </div>
              <div className="w-px h-4 bg-[var(--term-surface-3)]" />
            </div>

            {/* Recipient Agent */}
            <div className="border border-[var(--term-blue)] bg-[var(--term-surface)]">
              <div className="border-b border-[var(--term-blue)] px-4 py-2 flex items-center gap-2">
                <span className="led-green" />
                <span className="text-xs text-[var(--term-blue)] uppercase tracking-wider">
                  Recipient Agent (Italy)
                </span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-[var(--term-text-2)]">
                  MetaMask Wallet{" "}
                  <span className="text-[var(--term-text-3)]">· 0xVendor...D4</span>
                </p>
                <div className="border-l-2 border-[var(--term-surface-3)] pl-3">
                  <p className="text-[11px] text-[var(--term-text-3)] italic leading-relaxed">
                    reasoning: &quot;Incoming 500 USDC from 0xTreasury...C3. Sender not
                    sanctioned. Payment matches expected invoice. Confirming receipt and
                    closing settlement.&quot;
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="text-[var(--term-green)]">verify() →</span>
                  <span className="text-[var(--term-green)]">OFAC ✓</span>
                  <span className="text-[var(--term-green)]">Sender ✓</span>
                  <span className="text-[var(--term-text-2)]">Trust: 88</span>
                  <span className="text-[var(--term-text-3)]">Digest: c4e2...</span>
                </div>
                <p className="text-[11px] text-[var(--term-green)]">A2A attestation exchanged ✓</p>
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
              <span className="text-[var(--term-green)]">$</span> GENIUS ACT — signed July 18, 2025
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
                $0.002 <span className="text-sm font-normal text-[var(--term-text-3)]">/ event above 20K</span>
              </p>
              <ul className="space-y-1.5 text-xs text-[var(--term-text-2)]">
                <li>No monthly minimum</li>
                <li>ETH, SOL, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche</li>
                <li>CSV export</li>
                <li>Anomaly rules</li>
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
            Proof of compliance as code.
          </h2>
          <p className="mt-3 text-sm text-[var(--term-text-2)] max-w-xl mx-auto">
            Open Source cryptographic proof in an SDK.
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
