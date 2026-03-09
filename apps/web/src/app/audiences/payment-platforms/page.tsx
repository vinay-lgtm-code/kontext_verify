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
  Layers,
  Plug,
  Settings,
  Shield,
  Workflow,
  Repeat,
  FileCode,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Platform Builders",
  description:
    "White-label payment lifecycle for payment platform builders. Provider adapter pattern, workspace profiles, multi-archetype support, and provider-agnostic lifecycle with 6 adapters.",
};

const painPoints = [
  {
    title: "Building lifecycle tracking from scratch",
    description:
      "Every payment platform needs to track payment state across initiation, authorization, settlement, and reconciliation. Building this lifecycle from scratch means months of engineering on infrastructure instead of product features.",
  },
  {
    title: "Provider normalization is a moving target",
    description:
      "Stripe webhooks, Circle callbacks, Bridge events, and on-chain confirmations all use different schemas, status names, and delivery guarantees. Normalizing them into a consistent model is a full-time job.",
  },
  {
    title: "Compliance requirements vary by archetype",
    description:
      "Marketplace payments have different compliance requirements than treasury operations or micropayments. Your platform needs to support multiple archetypes without duplicating compliance logic.",
  },
  {
    title: "White-label demands clean abstraction",
    description:
      "Your customers do not want to know which provider is processing their payments. They want a consistent lifecycle, consistent events, and consistent audit trails -- regardless of the underlying rail.",
  },
];

const features = [
  {
    icon: Plug,
    title: "Provider Adapter Pattern",
    description:
      "Six built-in adapters normalize events from EVM chains, Solana, Circle, x402, Bridge, and Modern Treasury into a single payment lifecycle. Add custom adapters with the ProviderAdapter interface.",
  },
  {
    icon: Settings,
    title: "Workspace Profiles",
    description:
      "Pre-configured profiles for treasury, micropayments, and subscription billing. Each profile sets policies, thresholds, and lifecycle behavior. Create custom profiles for your platform's archetypes.",
  },
  {
    icon: Layers,
    title: "Multi-Archetype Support",
    description:
      "Run multiple payment archetypes on one Kontext instance. Marketplace escrow, subscription billing, and treasury operations each get their own workspace profile with isolated policies.",
  },
  {
    icon: Workflow,
    title: "8-Stage Lifecycle",
    description:
      "Every payment moves through start, authorize, capture, settle, confirm, reconcile, close, and archive. Each transition is recorded in a tamper-evident digest chain, regardless of the underlying provider.",
  },
  {
    icon: Repeat,
    title: "Event Normalization",
    description:
      "Provider-specific webhooks and callbacks are normalized into lifecycle stage transitions. Your application code sees consistent events whether the payment went through Stripe or on-chain.",
  },
  {
    icon: Shield,
    title: "Per-Archetype Compliance",
    description:
      "Different payment archetypes need different compliance rules. Configure sanctions screening thresholds, human review amounts, and export formats per workspace profile.",
  },
];

const platformCode = `import { Kontext } from 'kontext-sdk';
import {
  BridgeAdapter,
  ModernTreasuryAdapter,
} from 'kontext-sdk/adapters';

const ctx = Kontext.init({
  projectId: 'platform-payments',
  environment: 'production',
  adapters: [
    new BridgeAdapter({ apiKey: process.env.BRIDGE_API_KEY }),
    new ModernTreasuryAdapter({ apiKey: process.env.MT_API_KEY }),
  ],
});

// Normalize a Bridge webhook into the lifecycle
app.post('/webhooks/bridge', async (req, res) => {
  const event = ctx.normalizeEvent('bridge', req.body);
  // event.stage = 'settled' | 'captured' | ...
  // event.payment = unified PaymentAttempt
  // event.digest = tamper-evident proof
  console.log('Stage:', event.stage);
  console.log('Amount:', event.payment.amount);
  res.sendStatus(200);
});

// Normalize a Modern Treasury webhook
app.post('/webhooks/modern-treasury', async (req, res) => {
  const event = ctx.normalizeEvent('modern-treasury', req.body);
  // Same unified lifecycle, different provider
  console.log('Stage:', event.stage);
  console.log('Provider:', event.payment.provider); // 'modern-treasury'
  res.sendStatus(200);
});`;

export default function PaymentPlatformsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              PAYMENT PLATFORM BUILDERS
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              White-label payment lifecycle with 6 provider adapters. Kontext
              normalizes events from Bridge, Modern Treasury, Circle, and on-chain
              rails into a single lifecycle your customers never see behind.
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
              Why payment platforms need a lifecycle abstraction
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Your customers expect a seamless payment experience. Under the
              hood, you are wrangling six different providers. There is a
              better way.
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
              Provider-agnostic lifecycle for platform builders
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Adapter pattern, workspace profiles, and multi-archetype support --
              everything you need to build a payment platform without building
              the lifecycle layer yourself.
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
                Normalize events from any provider
              </h2>
              <p className="mt-4 text-xs text-[var(--term-text-2)]">
                Register provider adapters at initialization. When webhooks
                arrive, call{" "}
                <code className="bg-muted px-1.5 py-0.5 font-mono text-sm">
                  normalizeEvent()
                </code>{" "}
                to map provider-specific payloads into the unified 8-stage
                lifecycle. Your application code never touches raw provider
                data.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "6 built-in adapters: EVM, Solana, Circle, x402, Bridge, Modern Treasury",
                  "Custom adapters via the ProviderAdapter interface",
                  "Consistent lifecycle events regardless of provider",
                  "Tamper-evident digest chain across all normalized events",
                  "Workspace profiles for per-archetype compliance policies",
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
                code={platformCode}
                language="typescript"
                filename="platform-adapters.ts"
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
                Start free, scale with your platform
              </h2>
              <p className="mt-4 text-xs text-[var(--term-text-2)] leading-relaxed">
                The Free tier includes 20,000 events per month -- enough to
                build and validate your adapter integrations. Pay as you go is
                usage-based at $2 per 1,000 events above 20K free, with cloud
                persistence, multi-archetype support, and no monthly minimum.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Free: 20K events/month, local SDK, open source",
                  "Pay as you go: $2/1K events, multi-archetype support",
                  "Cloud persistence, ops dashboard, all 6 adapters",
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
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <Link href="/contact">
                    Get in Touch
                    <ArrowRight size={16} />
                  </Link>
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
              Ready to build your payment platform?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start normalizing payment events across
              providers in minutes. Open source and free to start.
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
