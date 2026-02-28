import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import {
  Shield,
  FileCheck,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  Brain,
  Lock,
  Anchor,
  Handshake,
} from "lucide-react";

const VideoDemo = dynamic(
  () => import("@/components/video-demo").then((m) => ({ default: m.VideoDemo })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full mx-auto rounded-[5px] border-2 border-border bg-card flex items-center justify-center" style={{ height: "700px" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading interactive demo...</p>
        </div>
      </div>
    ),
  }
);

const heroCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'treasury-agent',
  environment: 'production',
});

const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xAgentWallet',
  to: '0xRecipient',
  agentId: 'treasury-agent-v2',
  reasoning: 'Within daily limit. Recipient in allowlist.',
  anchor: {
    rpcUrl: 'https://mainnet.base.org',
    contractAddress: '0xbc71...b46',
  },
});

result.compliant            // true
result.trustScore.score     // 87
result.digestProof.valid    // true — tamper-evident
result.anchorProof?.txHash  // 0x... — on-chain proof`;

const anchorCode = `import { verifyAnchor } from 'kontext-sdk';

// Anyone can verify — read-only, zero deps
const proof = await verifyAnchor(
  'https://mainnet.base.org',
  '0xbc71...b46',
  digest,
);
console.log(proof.anchored); // true

// Or anchor inside verify()
const result = await ctx.verify({
  txHash: '0x...',
  chain: 'base',
  amount: '10000',
  token: 'USDC',
  from: agentWallet,
  to: recipientAddress,
  agentId: 'treasury-agent',
  anchor: {
    rpcUrl: 'https://mainnet.base.org',
    contractAddress: '0xbc71...b46',
    privateKey: process.env.ANCHOR_KEY,
  },
});`;

const attestCode = `// A2A: prove both sides ran compliance
const result = await ctx.verify({
  txHash: '0x...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xSender',
  to: '0xReceiver',
  agentId: 'sender-agent',
  counterparty: {
    endpoint: 'https://receiver.example.com',
    agentId: 'receiver-agent-v1',
  },
});

result.counterparty?.attested  // true
result.counterparty?.digest    // receiver's proof`;

const circleCode = `// Circle Programmable Wallets
const result = await ctx.verify({
  txHash: circleResponse.txHash,
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: agentWallet,
  to: recipientAddress,
  agentId: 'treasury-agent-v2',
});

if (!result.compliant) {
  // Block transfer. result.checks shows what failed.
}`;

const features = [
  {
    icon: ClipboardCheck,
    title: "verify() in One Call",
    description:
      "Log the transaction, run OFAC screening, score trust, and return a structured result. One function.",
  },
  {
    icon: Anchor,
    title: "On-Chain Anchoring",
    description:
      "Anchor your digest chain to Base. Immutable proof that compliance ran. Anyone can verify with just an RPC URL.",
  },
  {
    icon: Handshake,
    title: "A2A Attestation",
    description:
      "Exchange compliance proofs with counterparty agents. Both sides prove they checked the same transaction.",
  },
  {
    icon: Brain,
    title: "Agent Reasoning Logs",
    description:
      "Record why your agent approved a transfer. When regulators ask, you have the answer.",
  },
  {
    icon: BarChart3,
    title: "Trust Scoring",
    description:
      "0-100 trust score per agent. Five-factor breakdown: history, amount, frequency, destination, behavior.",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly Detection",
    description:
      "Flag unusual amounts, frequency spikes, new destinations, and off-hours activity.",
  },
  {
    icon: FileCheck,
    title: "Audit Export",
    description:
      "Export JSON audit trails with tamper-evident digest proofs. CSV and SAR/CTR reports on Pro.",
  },
  {
    icon: Lock,
    title: "Digest Chain",
    description:
      "Every action links to the previous via SHA-256. Proves no records were inserted, deleted, or reordered.",
  },
];

const socialProof = [
  { label: "On-Chain Proof", detail: "Anchored on Base" },
  { label: "A2A Attestation", detail: "Agent-to-agent trust" },
  { label: "8 Chains", detail: "Base, ETH, SOL + 5 more" },
  { label: "Free Forever", detail: "20K events/mo" },
  { label: "MIT License", detail: "Open source" },
  { label: "GENIUS Act", detail: "Aligned" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-pattern absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-background" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center pb-16 pt-20 text-center md:pb-24 md:pt-32">
            <Badge
              variant="outline"
              className="mb-6 gap-2 px-4 py-1.5"
            >
              Circle Wallets &middot; x402 &middot; Stripe &middot; Base &middot; USDC
            </Badge>

            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Trust infrastructure for{" "}
              <span className="text-primary">agents that move money.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Audit trails, OFAC screening, on-chain proof, and agent-to-agent
              attestation. One SDK. One function call. Free forever.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2 px-6" asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 px-6" asChild>
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
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-[5px] border-2 border-border bg-card px-4 py-2 font-mono text-sm text-muted-foreground shadow-shadow-sm">
              <span className="text-primary">$</span>
              npm install kontext-sdk
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="border-t-2 border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {socialProof.map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video */}
      <section className="relative border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Interactive Demo
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              See it live — no API key required
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Chat with an AI agent that moves USDC. Watch the audit trail, digest chain,
              trust score, and compliance checks update in real time.
            </p>
          </div>
          <VideoDemo />
        </div>
      </section>

      {/* Code Example */}
      <section className="relative border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4">
                Developer Experience
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                One function. Three layers of proof.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Call <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">verify()</code> on
                every wallet transfer. Get OFAC screening, trust scoring, on-chain anchoring,
                and counterparty attestation. All in one call.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Digest chain — tamper-evident local proof",
                  "On-chain anchor — immutable proof on Base",
                  "A2A attestation — bilateral compliance proof",
                  "Zero runtime dependencies",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary shrink-0"
                    >
                      <path d="m9 12 2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[5px] border-2 border-border shadow-shadow">
              <CodeBlock
                code={heroCode}
                language="typescript"
                filename="agent.ts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Integration Panels */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Integrations
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Drop into your wallet stack
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Circle Programmable Wallets, on-chain anchoring on Base,
              and agent-to-agent attestation.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Card className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
              <div className="absolute -top-2.5 left-4">
                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                  Primary
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">Circle Programmable Wallets</CardTitle>
                <CardDescription>
                  Wrap every Circle wallet transfer with compliance logging. OFAC screening,
                  trust scoring, and digest-chain proof in a single call.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={circleCode} language="typescript" filename="circle.ts" />
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
              <div className="absolute -top-2.5 left-4">
                <Badge className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5">
                  New
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">On-Chain Anchoring</CardTitle>
                <CardDescription>
                  Anchor your terminal digest to Base. Immutable, publicly verifiable proof
                  that compliance checks ran. Anyone can audit — no Kontext account needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={anchorCode} language="typescript" filename="anchor.ts" />
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
              <div className="absolute -top-2.5 left-4">
                <Badge className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5">
                  New
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">A2A Attestation</CardTitle>
                <CardDescription>
                  Exchange compliance proofs with counterparty agents. Both sides prove
                  they ran checks on the same transaction. Zero dependencies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={attestCode} language="typescript" filename="attestation.ts" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your compliance officer will ask for
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              verify() logs the transaction, screens for sanctions, scores trust,
              anchors to the chain, and exchanges attestations with counterparties.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
              >
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
                    <feature.icon size={20} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Three-Layer Proof */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Architecture
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three layers of proof. One function call.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Each layer makes it harder to claim compliance checks didn&apos;t happen.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "1",
                name: "Digest Chain",
                role: "Local Proof",
                detail: "SHA-256 hash chain links every action to the previous one. Tamper with one record and the chain breaks.",
                bg: "bg-blue-100",
              },
              {
                step: "2",
                name: "On-Chain Anchor",
                role: "Immutable Proof",
                detail: "Terminal digest anchored to Base. Anyone with an RPC URL can verify it existed at a specific block.",
                bg: "bg-emerald-100",
              },
              {
                step: "3",
                name: "A2A Attestation",
                role: "Bilateral Proof",
                detail: "Both agents exchange digests. Each side proves independently that they ran compliance on the same transaction.",
                bg: "bg-purple-100",
              },
            ].map((item) => (
              <div
                key={item.name}
                className={`flex flex-col items-center rounded-[5px] border-2 border-border ${item.bg} p-8 text-center shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none`}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[5px] border-2 border-border bg-white text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="mt-1 text-sm font-medium text-foreground">{item.role}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regulatory Context */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[5px] border-2 border-border bg-amber-50 p-8 shadow-shadow sm:p-12 md:p-16">
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-4">
                <Shield size={12} className="mr-1.5" />
                Regulatory Context
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                GENIUS Act signed. Regulations due July 2026.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                The GENIUS Act (S. 1582) treats payment stablecoin issuers as financial
                institutions under the BSA. Implementing regulations drop July 2026.
                Prohibitions take effect November 2026. If your agents move USDC above $3K,
                you need an audit trail.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "$3,000 — Travel Rule threshold (EDD required)",
                  "$10,000 — Currency Transaction Report threshold",
                  "OFAC screening — required for every transfer",
                  "Audit trails — required for BSA compliance",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mt-0.5 shrink-0 text-primary"
                    >
                      <path d="m9 12 2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/docs">Start building today</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ship compliance before the deadline.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              npm install. Kontext.init(). verify(). Three layers of proof in one call.
              Open source, TypeScript-first, free forever.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2 px-6" asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 px-6" asChild>
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
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
