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
  Rocket,
  Layers,
  Shield,
  Settings,
  BarChart3,
  Workflow,
  AlertTriangle,
  Gauge,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Fintech Startups",
  description:
    "Payment infrastructure for fintech startups. 8-stage payment lifecycle, policy engine, workspace profiles, and ops dashboard -- ship payment infrastructure in minutes, not months.",
};

const painPoints = [
  {
    title: "Payment fragmentation across providers",
    description:
      "You are stitching together Stripe, Circle, Bridge, and on-chain rails with custom glue code. Every provider has its own status model, webhook format, and failure mode. There is no unified lifecycle.",
  },
  {
    title: "Compliance overhead slowing down launches",
    description:
      "Before you can move a dollar, you need sanctions screening, threshold checks, and audit trails. Building this from scratch takes months and diverts engineering from your core product.",
  },
  {
    title: "Provider lock-in limits your options",
    description:
      "Once you build on one payment provider, switching costs are enormous. Your transaction state, audit history, and compliance records are all trapped in provider-specific formats.",
  },
  {
    title: "Monitoring gaps across payment flows",
    description:
      "When a payment stalls at authorization or fails at settlement, you find out from a customer support ticket, not from your infrastructure. No unified dashboard, no proactive alerts.",
  },
];

const features = [
  {
    icon: Workflow,
    title: "8-Stage Payment Lifecycle",
    description:
      "Every payment moves through start, authorize, capture, settle, confirm, reconcile, close, and archive. Each stage transition is recorded with a tamper-evident digest chain.",
  },
  {
    icon: Shield,
    title: "Policy Engine",
    description:
      "Define rules that run before stage transitions. Sanctions screening, amount thresholds, velocity checks, and custom policies -- all evaluated automatically before a payment advances.",
  },
  {
    icon: Settings,
    title: "Workspace Profiles",
    description:
      "Pre-configured profiles for treasury, micropayments, and subscription billing. Each profile sets default policies, thresholds, and lifecycle behavior tuned to the use case.",
  },
  {
    icon: Gauge,
    title: "Ops Dashboard",
    description:
      "Real-time visibility into every payment across every provider. Filter by stage, amount, provider, and risk level. Drill into any payment to see the full lifecycle with digest proof.",
  },
  {
    icon: Layers,
    title: "Provider Adapters",
    description:
      "Normalize events from EVM chains, Solana, Circle, x402, Bridge, and Modern Treasury into a single lifecycle. Swap providers without changing your application code.",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly Detection",
    description:
      "Flag unusual payment patterns before they become problems. Velocity spikes, unusual amounts, new destinations, and off-hours activity detected automatically across all providers.",
  },
];

const fintechCode = `import { Kontext } from 'kontext-sdk';

// Initialize with treasury archetype
const ctx = Kontext.init({
  projectId: 'acme-payments',
  environment: 'production',
  workspace: 'treasury',
});

// Start a payment -- enters the 8-stage lifecycle
const payment = await ctx.start({
  amount: '5000',
  token: 'USDC',
  chain: 'base',
  from: '0xTreasury...abc',
  to: '0xVendor...def',
  metadata: { invoiceId: 'INV-2026-042' },
});

// Authorize -- policy engine runs sanctions + threshold checks
const auth = await ctx.authorize(payment.id);

if (!auth.approved) {
  console.log('Blocked by policy:', auth.violations);
  return;
}

// Capture and settle
await ctx.capture(payment.id);
await ctx.settle(payment.id, { txHash: '0xabc...def' });

// Full lifecycle with digest proof
console.log('Stage:', payment.stage);       // 'settled'
console.log('Digest valid:', payment.proof); // true`;

export default function FintechStartupsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              FINTECH STARTUPS
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Ship payment infrastructure in minutes, not months. Kontext gives
              fintech startups an 8-stage payment lifecycle, a policy engine for
              compliance, and provider adapters that prevent lock-in.
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
      <section className="border-b border-[var(--term-surface-2)] bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-sm font-medium">
              Why fintech startups need a payment control plane
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              You are building a payments product, not a payments infrastructure
              company. Stop reinventing lifecycle management.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {painPoints.map((point) => (
              <Card
                key={point.title}
                className="border-[var(--term-surface-2)] bg-[var(--term-surface)]"
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
      <section className="border-b border-[var(--term-surface-2)] bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-sm font-medium">
              Payment lifecycle infrastructure built for startups
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Everything you need to manage payments across providers, enforce
              compliance policies, and maintain a tamper-evident audit trail.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden transition-colors hover:border-primary/30"
              >
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center  bg-[var(--term-surface-2)] text-primary">
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
      <section className="border-b border-[var(--term-surface-2)] bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-sm font-medium">
                From start to settlement in 10 lines
              </h2>
              <p className="mt-4 text-xs text-[var(--term-text-2)]">
                Initialize with a workspace profile, then move payments through
                the lifecycle with{" "}
                <code className="bg-muted px-1.5 py-0.5 font-mono text-sm">
                  start()
                </code>
                ,{" "}
                <code className="bg-muted px-1.5 py-0.5 font-mono text-sm">
                  authorize()
                </code>
                , and{" "}
                <code className="bg-muted px-1.5 py-0.5 font-mono text-sm">
                  settle()
                </code>
                . The policy engine checks compliance at every transition.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "8-stage lifecycle with tamper-evident transitions",
                  "Policy engine evaluates rules before every stage change",
                  "Workspace profiles for treasury, micropayments, subscriptions",
                  "Provider adapters normalize events across 6 integrations",
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
            <div className="">
              <CodeBlock
                code={fintechCode}
                language="typescript"
                filename="fintech-quickstart.ts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className="border-b border-[var(--term-surface-2)] bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)] p-8 sm:p-12">
            <div className="max-w-2xl">
              <h2 className="text-sm font-medium">
                Start free, scale as you grow
              </h2>
              <p className="mt-4 text-xs text-[var(--term-text-2)] leading-relaxed">
                The Free tier includes 20,000 events per month -- enough to
                build and validate your payment flows. Pay as you go is
                usage-based at $2 per 1,000 events above 20K free, with cloud
                persistence, advanced policies, and no monthly minimum.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Free: 20K events/month, local SDK, open source",
                  "Pay as you go: $2/1K events above 20K free",
                  "Cloud persistence, ops dashboard, multi-chain support",
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
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-[var(--term-surface-2)] bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-sm font-medium">
              Ready to ship payment infrastructure?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start managing payment lifecycles in under 5
              minutes. Open source and free to start.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-none border border-[var(--term-surface-2)] bg-[var(--term-surface)] px-4 py-2 font-mono text-sm text-muted-foreground ">
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
