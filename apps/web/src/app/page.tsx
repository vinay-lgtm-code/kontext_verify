import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import {
  Shield,
  FileCheck,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Link2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Hero code snippet
// ---------------------------------------------------------------------------

const heroCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'payment-agent', environment: 'production' });
const sessionId = Kontext.generateSessionId();

// 1. verify() — compliance check + log in one call
const result = await ctx.verify({
  txHash: '0xabc...', chain: 'base', amount: '5000', token: 'USDC',
  from: '0xsender', to: '0xrecipient', agentId: 'agent-v1', sessionId,
});
// result.compliant = true   result.riskLevel = 'low'

// 2. logReasoning() — the why is auditable too
await ctx.logReasoning({ agentId: 'agent-v1', sessionId, step: 1,
  action: 'approve-transfer', reasoning: 'verify() passed. Proceeding.',
  confidence: 0.98 });

// 3. getTrustScore() — behavioral health over time
const trust = await ctx.getTrustScore('agent-v1');
// trust.score = 87   trust.level = 'high'

// 4. export() — tamper-evident audit trail (Patent US 12,463,819 B1)
const audit = await ctx.export({ format: 'json' });
// audit.terminalDigest = 'sha256:4a8f...'`;

const installCode = `npm install kontext-sdk`;

const verifyCode = `const ctx = Kontext.init({ projectId: 'my-agent' });
const result = await ctx.verify({
  txHash: '0xabc...', chain: 'base',
  amount: '5000', token: 'USDC',
  from: '0xsender', to: '0xrecipient',
  agentId: 'agent-v1',
});
// result.compliant = true`;

const exportCode = `const audit = await ctx.export({ format: 'json' });
const valid = ctx.verifyDigestChain();
// valid.valid = true  valid.chainLength = 42`;

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

const features = [
  {
    icon: Shield,
    name: "verify()",
    description:
      "Compliance check + transaction log in a single call. OFAC screening, EDD thresholds ($3K Travel Rule, $10K CTR), and digest chain entry — all at once.",
    badge: "Free",
    badgeVariant: "green" as const,
  },
  {
    icon: FileCheck,
    name: "logReasoning()",
    description:
      'When regulators ask "why did your agent approve this?" — only Kontext users can answer. The why-chain is in the audit trail, tamper-evident.',
    badge: "Free",
    badgeVariant: "green" as const,
  },
  {
    icon: BarChart3,
    name: "Trust Scoring",
    description:
      "0–100 behavioral health score per agent, computed across 5 factors: history depth, task completion, anomaly frequency, transaction consistency, compliance adherence.",
    badge: "Free",
    badgeVariant: "green" as const,
  },
  {
    icon: AlertTriangle,
    name: "Anomaly Detection",
    description:
      "unusualAmount and frequencySpike detection are free. Advanced rules — newDestination, offHoursActivity, rapidSuccession, roundAmount — are Pay as you go at $0.10/anomaly.",
    badge: "2 rules free",
    badgeVariant: "yellow" as const,
  },
  {
    icon: ClipboardCheck,
    name: "Compliance Certificates",
    description:
      "Generate exportable certificates with digest chain proof, trust score, action counts, and reasoning entries. SHA-256 content hash for tamper detection.",
    badge: "Free",
    badgeVariant: "green" as const,
  },
  {
    icon: CheckCircle2,
    name: "createTask()",
    description:
      "Human-in-the-loop for high-value transfers. Create tasks with required evidence, confirm or fail them. Every decision is logged into the digest chain.",
    badge: "Free",
    badgeVariant: "green" as const,
  },
  {
    icon: Activity,
    name: "export()",
    description:
      "JSON audit export is free. CSV export is Pay as you go. Every export includes the terminal digest and full chain verification for tamper-evident proof.",
    badge: "JSON free",
    badgeVariant: "green" as const,
  },
  {
    icon: Link2,
    name: "Digest Chain",
    description:
      "SHA-256 rolling hash chain links every action, transaction, and reasoning entry into a tamper-evident sequence. Patent US 12,463,819 B1.",
    badge: "Patent",
    badgeVariant: "gray" as const,
  },
];

// ---------------------------------------------------------------------------
// GENIUS Act timeline
// ---------------------------------------------------------------------------

const geniusTimeline = [
  { date: "July 18, 2025", event: "GENIUS Act signed into law" },
  { date: "July 2026", event: "Implementing regulations published" },
  { date: "November 2026", event: "Prohibitions take effect" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="bg-bg">
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          {/* Left: headline + CTAs */}
          <div>
            <div className="mb-6">
              <Badge variant="yellow" className="mb-4">
                GENIUS Act — November 2026 deadline
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-black leading-tight">
                Five lines.
                <br />
                Full compliance.
              </h1>
              <p className="mt-5 text-lg text-black/70 max-w-lg">
                The compliance logging SDK for developers building on Circle
                Programmable Wallets. verify(), trust scoring, anomaly
                detection, and tamper-evident audit trails — with zero runtime
                dependencies.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <a
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>

            <p className="mt-4 text-xs font-mono text-black/50">
              npm install kontext-sdk &middot; 20K events/mo free forever &middot; no credit card
            </p>
          </div>

          {/* Right: hero code */}
          <div className="border-2 border-black shadow-shadow rounded-base overflow-hidden">
            <CodeBlock code={heroCode} language="typescript" filename="agent.ts" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. SOCIAL PROOF STRIP                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y-2 border-black bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-mono font-bold">
            <span>Patent US 12,463,819 B1</span>
            <span className="text-white/30">&middot;</span>
            <span>MIT License</span>
            <span className="text-white/30">&middot;</span>
            <span>GENIUS Act Aligned</span>
            <span className="text-white/30">&middot;</span>
            <span>Base Native</span>
            <span className="text-white/30">&middot;</span>
            <span>Zero Runtime Deps</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. THE PROBLEM                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-3xl">
          <Badge variant="red" className="mb-4">The Problem</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-6">
            Developers handling $3K+ USDC transfers with zero compliance infrastructure.
          </h2>
          <p className="text-lg text-black/70 mb-6">
            Developers building on Circle Programmable Wallets handle material USDC
            transfers with zero audit trails, reasoning logs, or tamper-evident proof
            that compliance checks actually ran. The{" "}
            <strong className="text-black">GENIUS Act</strong> (signed July 2025) treats
            payment stablecoin issuers as financial institutions under the BSA.
            Prohibitions take effect <strong className="text-black">November 2026</strong>.
          </p>
          <p className="text-lg text-black/70">
            Bridge.xyz (acquired by Stripe for $1.1B) validates the thesis by embedding
            compliance directly into its orchestration API. Developers who go
            direct-to-chain without Bridge have no equivalent — until now.
          </p>
        </div>

        {/* Countdown pill */}
        <div className="mt-10 inline-flex items-center gap-3 rounded-base border-2 border-black bg-yellow px-5 py-3 shadow-shadow">
          <div className="h-3 w-3 rounded-full bg-black animate-pulse" />
          <span className="font-bold text-black text-sm">
            November 2026 — GENIUS Act prohibitions take effect
          </span>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. THREE STEPS                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t-2 border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-12 text-center">
            From zero to compliant in 3 steps
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-base border-2 border-black p-6 shadow-shadow bg-bg">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-base border-2 border-black bg-black text-white font-bold text-sm">1</span>
                <div>
                  <p className="font-bold text-black">Install</p>
                  <p className="text-xs text-black/50">30 seconds</p>
                </div>
              </div>
              <div className="rounded-base border-2 border-black overflow-hidden">
                <CodeBlock code={installCode} language="bash" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-base border-2 border-black p-6 shadow-shadow bg-bg">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-base border-2 border-black bg-black text-white font-bold text-sm">2</span>
                <div>
                  <p className="font-bold text-black">verify()</p>
                  <p className="text-xs text-black/50">2 minutes</p>
                </div>
              </div>
              <div className="rounded-base border-2 border-black overflow-hidden">
                <CodeBlock code={verifyCode} language="typescript" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-base border-2 border-black p-6 shadow-shadow bg-bg">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-base border-2 border-black bg-black text-white font-bold text-sm">3</span>
                <div>
                  <p className="font-bold text-black">export()</p>
                  <p className="text-xs text-black/50">1 minute</p>
                </div>
              </div>
              <div className="rounded-base border-2 border-black overflow-hidden">
                <CodeBlock code={exportCode} language="typescript" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. FEATURES GRID (8 cards)                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t-2 border-black bg-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4 text-center">
            Everything in Phase 1
          </h2>
          <p className="text-center text-black/60 mb-12 max-w-2xl mx-auto">
            Trust scoring, anomaly detection, and compliance certificates are in Phase 1.
            All free features are free forever.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.name} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-base border-2 border-black bg-main">
                        <Icon size={18} className="text-black" />
                      </div>
                      <Badge variant={feature.badgeVariant}>{feature.badge}</Badge>
                    </div>
                    <CardTitle className="text-base font-bold font-mono">
                      {feature.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-black/70">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6. HOW IT WORKS (digest chain)                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t-2 border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="gray" className="mb-4">Patent US 12,463,819 B1</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
              Tamper-evident by design
            </h2>
            <p className="text-black/70 mb-12">
              Every action, transaction, and reasoning entry is linked into a SHA-256
              rolling hash chain. If any entry is altered, the chain verification fails.
              The terminal digest is your cryptographic proof that compliance ran.
            </p>
          </div>

          {/* Digest chain diagram */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-0">
              {["Genesis Block", "Action Hash", "Action Hash", "Terminal Digest"].map(
                (label, i, arr) => (
                  <div key={i} className="flex flex-col sm:flex-row items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-base border-2 border-black px-4 py-3 shadow-shadow text-center min-w-[120px] ${
                          i === 0
                            ? "bg-yellow"
                            : i === arr.length - 1
                            ? "bg-main"
                            : "bg-white"
                        }`}
                      >
                        <p className="text-xs font-mono font-bold text-black">{label}</p>
                        <p className="text-[10px] font-mono text-black/50 mt-1">
                          sha256:{i === 0 ? "0000" : i === arr.length - 1 ? "4a8f" : `${i}b3c`}...
                        </p>
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="text-black font-bold text-xl sm:mx-2 my-2 sm:my-0">
                        →
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            <p className="text-center text-xs text-black/40 mt-6 font-mono">
              Each hash includes the previous hash — altering any entry breaks the chain
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 7. PRICING STRIP                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t-2 border-black bg-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4 text-center">
            Simple, honest pricing
          </h2>
          <p className="text-center text-black/60 mb-12">
            First 20,000 events are free forever. No credit card required.
          </p>
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {/* Free */}
            <div className="rounded-base border-2 border-black bg-white p-8 shadow-shadow">
              <p className="text-sm font-bold text-black/50 uppercase tracking-wide mb-2">Free</p>
              <p className="text-4xl font-bold text-black mb-1">$0</p>
              <p className="text-sm text-black/60 mb-6">forever, no credit card</p>
              <ul className="space-y-2 mb-8 text-sm text-black/70">
                <li className="flex items-start gap-2">
                  <span className="text-main font-bold">✓</span> 20,000 events/mo always free
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-main font-bold">✓</span> verify(), logReasoning(), createTask()
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-main font-bold">✓</span> Trust scoring + compliance certificates
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-main font-bold">✓</span> Basic anomaly detection (2 rules)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-main font-bold">✓</span> JSON audit export
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-main font-bold">✓</span> Base chain
                </li>
              </ul>
              <Button variant="secondary" size="lg" className="w-full" asChild>
                <Link href="/docs">Get started free</Link>
              </Button>
            </div>

            {/* Pay as you go */}
            <div className="rounded-base border-2 border-black bg-main p-8 shadow-shadow">
              <p className="text-sm font-bold text-black/60 uppercase tracking-wide mb-2">Pay as you go</p>
              <p className="text-4xl font-bold text-black mb-1">$0 to start</p>
              <p className="text-sm text-black/70 mb-6">then $2.00 / 1K events</p>
              <ul className="space-y-2 mb-8 text-sm text-black/80">
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span> First 20K events always free
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span> $2.00 / 1K events after 20K
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span> All 8 chains (after $5 spend)
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span> Advanced anomaly detection ($0.10/anomaly)
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span> CSV audit export
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span> Email support
                </li>
              </ul>
              <Button variant="outline" size="lg" className="w-full bg-white" asChild>
                <Link href="/pricing">
                  View pricing details
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 8. GENIUS ACT URGENCY                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t-2 border-black bg-yellow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-black mb-6">
              GENIUS Act — What you need to know
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              {geniusTimeline.map((item, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-base border-2 border-black bg-white p-4 shadow-shadow"
                >
                  <p className="text-xs font-mono font-bold text-black/50 mb-1">{item.date}</p>
                  <p className="text-sm font-bold text-black">{item.event}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-black/70">
              The GENIUS Act (S. 1582, signed July 18, 2025) treats payment stablecoin
              issuers as financial institutions under the BSA. Implementing regulations
              are due July 2026. Developers handling material USDC transfers need audit
              infrastructure before prohibitions take effect November 2026.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 9. FINAL CTA                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t-2 border-black bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ship compliance today.
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            20,000 events free forever. No credit card. Five minutes to integration.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/docs">
                Get Started
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
