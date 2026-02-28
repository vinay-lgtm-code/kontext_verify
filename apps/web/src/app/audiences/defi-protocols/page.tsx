import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import {
  ArrowRight,
  Check,
  Network,
  ClipboardCheck,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  Shield,
  FileCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "DeFi Protocols",
  description:
    "On-chain compliance infrastructure for decentralized finance. Action logging for governance, transaction tracking across chains, anomaly detection for treasury, and audit export for regulatory inquiries.",
};

const painPoints = [
  {
    title: "Regulatory pressure increasing on DeFi",
    description:
      "Regulators worldwide are turning their attention to DeFi protocols. Whether it is the SEC, CFTC, or international bodies, protocols that cannot demonstrate compliance infrastructure will face increasing risk.",
  },
  {
    title: "No standard compliance tooling for protocols",
    description:
      "Traditional compliance tools were built for centralized entities. DeFi protocols need compliance infrastructure that works with on-chain governance, multi-sig treasuries, and decentralized decision-making.",
  },
  {
    title: "Governance decisions need audit trails",
    description:
      "Every governance proposal, vote, and execution should be recorded in a tamper-evident audit trail. When regulators ask how a decision was made, you need verifiable proof.",
  },
  {
    title: "Treasury operations need accountability",
    description:
      "Protocol treasuries manage significant assets across multiple chains. Every transfer, swap, and allocation needs a compliance record that can withstand regulatory scrutiny.",
  },
];

const features = [
  {
    icon: ClipboardCheck,
    title: "Governance Action Logging",
    description:
      "Record every governance proposal, vote, and execution in a tamper-evident audit trail. Cryptographic digest chains ensure governance records cannot be altered after the fact.",
  },
  {
    icon: ArrowLeftRight,
    title: "Cross-Chain Transaction Tracking",
    description:
      "Track transactions across Ethereum, Base, Polygon, Arbitrum, Optimism, and more. A unified audit trail spanning every chain your protocol operates on.",
  },
  {
    icon: AlertTriangle,
    title: "Treasury Anomaly Detection",
    description:
      "Flag unusual treasury movements automatically. Velocity checks, amount thresholds, and behavioral analysis tuned for DeFi treasury operations.",
  },
  {
    icon: BarChart3,
    title: "Participant Trust Scoring",
    description:
      "Score protocol participants based on on-chain history, behavioral patterns, and interaction frequency. Identify high-risk actors before they impact the protocol.",
  },
  {
    icon: Shield,
    title: "Immutable Governance Records",
    description:
      "Every governance action is linked in a cryptographic digest chain. Provide regulators and community members with verifiable proof of governance decisions.",
  },
  {
    icon: FileCheck,
    title: "Regulatory Inquiry Export",
    description:
      "Export compliance-ready audit trails in JSON, CSV, and PDF when regulators come asking. Structured data ready for legal review and regulatory response.",
  },
];

const defiCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'defi-governance',
  environment: 'production',
});

// Log a governance vote with full context
await ctx.log({
  action: 'governance_vote',
  agentId: 'governance-module',
  details: 'Vote on PROP-042: Increase treasury allocation to L2 liquidity',
  metadata: {
    proposalId: 'PROP-042',
    voter: '0xDelegate...abc',
    vote: 'for',
    votingPower: '150000',
    snapshotBlock: 19_500_000,
  },
});

// Log a treasury transfer with compliance verification
const transfer = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'ethereum',
  amount: '250000',
  token: 'USDC',
  from: '0xTreasury...abc',
  to: '0xL2Bridge...def',
  agentId: 'treasury-multisig',
});

if (!transfer.compliant) {
  console.log('Treasury transfer blocked:', transfer.checks);
} else {
  console.log('Trust score:', transfer.trustScore.score);
  console.log('Digest valid:', transfer.digestProof.valid);
}`;

export default function DeFiProtocolsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge
              variant="outline"
              className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            >
              DeFi Protocols
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              On-Chain Compliance for{" "}
              <span className="gradient-text">Decentralized Finance</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              DeFi protocols face increasing regulatory pressure. Kontext gives
              your protocol tamper-evident governance records, treasury anomaly
              detection, and audit trails that satisfy regulators without
              sacrificing decentralization.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
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
                  Get Started Free
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/docs">
                  Read the Docs
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              The Problem
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why DeFi protocols need compliance infrastructure
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Decentralization does not mean deregulation. Protocols that invest
              in compliance infrastructure now will be better positioned as
              regulation matures.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {painPoints.map((point) => (
              <Card
                key={point.title}
                className="border-border/40 bg-card/50"
              >
                <CardHeader>
                  <CardTitle className="text-lg">{point.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {point.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What Kontext Does */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              What Kontext Does
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Compliance tooling designed for decentralized protocols
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Governance logging, treasury monitoring, and audit export -- built
              for the way DeFi protocols actually work.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden transition-colors hover:border-primary/30"
              >
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

      {/* Code Example */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4">
                Code Example
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Governance voting and treasury transfers
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Log governance votes and treasury transfers with{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                  ctx.verify()
                </code>
                . Every action is recorded in a tamper-evident digest chain,
                linking governance decisions to the treasury operations they
                authorize.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Governance proposals linked to treasury executions",
                  "Multi-sig signer tracking for treasury transfers",
                  "Anomaly detection for unusual treasury movements",
                  "Cross-chain audit trail for L2 operations",
                  "Export audit trails for regulatory inquiries",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-primary"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glow rounded-xl">
              <CodeBlock
                code={defiCode}
                language="typescript"
                filename="defi-governance.ts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card p-8 sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <Badge
                variant="outline"
                className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              >
                Pricing
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Start free, upgrade for advanced features
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                The Free tier includes 20,000 events per month -- enough to add
                compliance to governance and treasury operations. Pro is
                usage-based at $2 per 1,000 events above 20K free, with cloud
                persistence, anomaly detection, and no monthly minimum.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Free: 20K events/month, governance logging, local SDK",
                  "Pro: $2/1K events above 20K free, usage-based",
                  "Cloud persistence, anomaly detection, multi-chain support",
                  "Open source SDK -- audit the code yourself",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <Link href="/contact">
                    Get in Touch
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-emerald-500/3 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to add compliance to your protocol?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start logging governance and treasury
              operations in minutes. Open source and free to start.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 font-mono text-sm text-muted-foreground backdrop-blur-sm">
              <span className="text-primary">$</span>
              npm install kontext-sdk
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <a
                  href="https://github.com/Legaci-Labs/kontext"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Started
                  <ArrowRight size={16} />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">Talk to Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
