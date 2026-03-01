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
  Bot,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  Shield,
  Cpu,
  FileCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI Agent Startups",
  description:
    "Compliance infrastructure for AI agents that move money. Action logging, trust scoring, anomaly detection, and audit export -- ship compliance in 5 lines of code with Kontext.",
};

const painPoints = [
  {
    title: "Regulatory uncertainty for autonomous transactions",
    description:
      "AI agents making financial decisions create novel compliance questions. Regulators are watching, and your agents need a verifiable record of every decision they make.",
  },
  {
    title: "No audit trail for agent decisions",
    description:
      "When an agent moves money, you need to know what it decided, why it decided it, and exactly when it happened. Most agent frameworks have zero built-in compliance support.",
  },
  {
    title: "Trust and safety requirements from enterprise customers",
    description:
      "Enterprise buyers demand compliance reports, audit trails, and risk scoring before letting your agents near their money. Without these, deals stall at security review.",
  },
  {
    title: "Scaling compliance across multiple agent frameworks",
    description:
      "You might use Vercel AI SDK today and LangChain tomorrow. Your compliance infrastructure should work across all of them without rewriting integration code.",
  },
];

const features = [
  {
    icon: ClipboardCheck,
    title: "Action Logging",
    description:
      "Every agent decision is recorded with a tamper-evident cryptographic digest chain. Know what happened, when, and why -- with proof that the record has not been altered.",
  },
  {
    icon: BarChart3,
    title: "Trust Scoring API",
    description:
      "Real-time risk assessment for every agent action. Score agent behavior based on historical patterns, transaction amounts, recipient analysis, and contextual signals.",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly Detection",
    description:
      "Flag unusual agent behavior automatically. Velocity checks, amount thresholds, recipient analysis, and behavioral anomalies detected before transactions execute.",
  },
  {
    icon: Shield,
    title: "Digest Chain",
    description:
      "Tamper-evident proof that your audit trail has not been modified. Each entry is cryptographically linked to the previous one, creating an unbreakable chain of evidence.",
  },
  {
    icon: Cpu,
    title: "Multi-Framework Support",
    description:
      "First-class integrations for Vercel AI SDK, LangChain, CrewAI, and AutoGen. Drop-in callbacks, observers, and middleware that work across all major agent frameworks.",
  },
  {
    icon: FileCheck,
    title: "Compliance Export",
    description:
      "Generate compliance reports for enterprise customers in JSON, CSV, and PDF formats. Ready for security reviews, audits, and regulatory inquiries.",
  },
];

const agentCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'payment-agent',
  environment: 'production',
});

// Wrap any agent tool call with compliance verification
async function agentTransfer(to: string, amount: string) {
  // Verify the action before execution
  const result = await ctx.verify({
    txHash: '0x...',
    chain: 'base',
    amount,
    token: 'USDC',
    from: '0xAgentWallet',
    to,
    agentId: 'payment-agent-v2',
  });

  // Check compliance result
  if (!result.compliant) {
    console.log('Blocked:', result.checks);
    return { success: false, reason: result.checks };
  }

  console.log('Trust score:', result.trustScore.score); // 87
  console.log('Digest valid:', result.digestProof.valid);

  // Proceed with the on-chain transfer
  const tx = await executeTransfer(to, amount);

  return {
    success: true,
    txHash: tx.hash,
    trustScore: result.trustScore.score,
  };
}`;

export default function AIAgentStartupsPage() {
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
              className="mb-4 border-purple-500/30 bg-purple-500/10 text-purple-400"
            >
              AI Agent Startups
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Compliance for AI Agents{" "}
              <span className="gradient-text">That Move Money</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Your agents are making financial decisions autonomously. Kontext
              gives them a verifiable compliance layer -- action logging, trust
              scoring, and anomaly detection in 5 lines of code.
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
              Why AI agent startups need compliance now
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Agents moving money without a compliance layer is a ticking clock.
              Here is what keeps founders up at night.
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
              Compliance infrastructure built for agent developers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Everything you need to make your agents production-ready for
              enterprise customers and regulators.
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
                Wrap any agent tool call with compliance
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Call{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                  ctx.verify()
                </code>{" "}
                before executing any financial action. You get a trust score,
                anomaly flags, and a tamper-evident audit entry -- automatically.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Works with any agent framework or custom pipeline",
                  "Trust score returned in under 50ms",
                  "Flagged transactions blocked before execution",
                  "Every action linked in a cryptographic digest chain",
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
                code={agentCode}
                language="typescript"
                filename="agent-transfer.ts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-8 sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <Badge variant="secondary" className="mb-4">
                Pricing
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Start free, scale as you grow
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                The Free tier includes 20,000 events per month -- enough to
                build and validate your agent workflows. Pro is usage-based
                at $2 per 1,000 events above 20K free, with cloud
                persistence, anomaly detection, and no monthly minimum.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Free: 20K events/month, local SDK, open source",
                  "Pro: $2/1K events above 20K free, usage-based",
                  "Cloud persistence, anomaly detection, multi-chain support",
                  "No credit card required to start",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-primary"
                    />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to add compliance to your agents?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start logging agent transactions in under 5
              minutes. Open source and free to start.
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
