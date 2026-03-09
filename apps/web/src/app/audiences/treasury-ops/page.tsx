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
  Landmark,
  Layers,
  Shield,
  FileSpreadsheet,
  Bell,
  UserCheck,
  Link2,
  ClipboardCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Treasury & Ops Teams",
  description:
    "Payment control plane for treasury and operations teams. Unified lifecycle across providers, digest chain audit trails, CSV export, Slack alerts, and human review workflows.",
};

const painPoints = [
  {
    title: "Multi-provider complexity",
    description:
      "Your payments flow through Stripe, Circle, Bridge, and on-chain rails. Each provider has its own dashboard, webhook format, and status model. You are context-switching between five tabs to understand one payment.",
  },
  {
    title: "Audit trail gaps across systems",
    description:
      "When compliance asks for the full history of a payment, you are pulling data from three different systems and stitching it together in a spreadsheet. There is no single source of truth with tamper-evident proof.",
  },
  {
    title: "Manual reconciliation burns hours",
    description:
      "Matching settlements to authorizations across providers is a manual, error-prone process. Every discrepancy triggers a time-consuming investigation with no tooling to help.",
  },
  {
    title: "Compliance reporting takes days, not minutes",
    description:
      "Generating reports for regulators means exporting from multiple systems, normalizing formats, and manually verifying completeness. A process that should take minutes takes days.",
  },
];

const features = [
  {
    icon: Layers,
    title: "Unified Lifecycle Across Providers",
    description:
      "Every payment from every provider moves through the same 8-stage lifecycle. One data model, one dashboard, one audit trail -- regardless of whether the payment went through Stripe, Circle, or on-chain.",
  },
  {
    icon: Link2,
    title: "Tamper-Evident Digest Chain",
    description:
      "Every stage transition is cryptographically linked to the previous one. When compliance asks if the audit trail has been modified, the answer is mathematically verifiable.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV Export for Reconciliation",
    description:
      "Export payment lifecycle data in CSV for reconciliation, reporting, and analysis. Filter by date range, provider, stage, and risk level. Ready for your existing accounting workflows.",
  },
  {
    icon: Bell,
    title: "Slack and Email Alerts",
    description:
      "Get notified when payments stall, anomalies are detected, or human review is required. Route alerts to the right channel based on amount, provider, or risk level.",
  },
  {
    icon: UserCheck,
    title: "Human Review Workflows",
    description:
      "Configure amount thresholds that require human approval before a payment advances. Treasury managers review and approve directly from Slack or the ops dashboard.",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance-Ready Reports",
    description:
      "Generate SAR/CTR templates, compliance certificates, and audit exports from the unified payment lifecycle. All backed by the digest chain for tamper-evident proof.",
  },
];

const treasuryCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'treasury-ops',
  environment: 'production',
  workspace: 'treasury',
  notifications: {
    slack: { webhookUrl: process.env.SLACK_WEBHOOK },
    email: { to: 'treasury@acme.com' },
  },
});

// Start a vendor payment
const payment = await ctx.start({
  amount: '25000',
  token: 'USDC',
  chain: 'base',
  from: '0xTreasury...abc',
  to: '0xVendor...def',
  metadata: { invoiceId: 'INV-2026-089', department: 'engineering' },
});

// Authorize -- triggers human review for amounts > $10,000
const auth = await ctx.authorize(payment.id);

if (auth.requiresReview) {
  // Slack alert sent automatically to #treasury-approvals
  console.log('Pending review:', auth.reviewId);
  // Treasury manager approves via Slack or dashboard
  return;
}

// After approval, continue the lifecycle
await ctx.capture(payment.id);
await ctx.settle(payment.id, { txHash: '0xabc...def' });

// Export for monthly reconciliation
const report = await ctx.export({
  format: 'csv',
  dateRange: { from: startOfMonth, to: endOfMonth },
});`;

export default function TreasuryOpsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              TREASURY & OPS TEAMS
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Unified payment lifecycle with review workflows and export. Kontext
              gives treasury and operations teams a single control plane across
              every provider, with tamper-evident audit trails and Slack alerts.
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
              Why treasury teams need a payment control plane
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Multi-provider payment operations were never designed to be managed
              from a spreadsheet. Here is what costs you hours every week.
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
              One control plane for every payment
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Unified lifecycle, tamper-evident audit trails, and review
              workflows -- built for teams that manage payments across multiple
              providers.
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
                Treasury workflow with human review
              </h2>
              <p className="mt-4 text-xs text-[var(--term-text-2)]">
                Configure amount thresholds for human review. Payments above the
                threshold pause at authorization and send a Slack alert to your
                treasury channel. Approved payments continue through the lifecycle
                automatically.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Human review for payments above configurable thresholds",
                  "Slack and email alerts routed by amount and risk level",
                  "CSV export for monthly reconciliation and audit",
                  "Tamper-evident digest chain proves nothing was modified",
                  "Works across Stripe, Circle, Bridge, and on-chain rails",
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
                code={treasuryCode}
                language="typescript"
                filename="treasury-workflow.ts"
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
                Start free, scale with usage
              </h2>
              <p className="mt-4 text-xs text-[var(--term-text-2)] leading-relaxed">
                The Free tier includes 20,000 events per month -- enough to
                manage treasury operations at scale. Pay as you go is
                usage-based at $2 per 1,000 events above 20K free, with CSV
                export, Slack alerts, and cloud persistence.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Free: 20K events/month, local SDK, open source",
                  "Pay as you go: $2/1K events, CSV export, Slack alerts",
                  "Cloud persistence, ops dashboard, multi-provider",
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
              Ready to unify your payment operations?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start managing payment lifecycles across all
              your providers in minutes. Open source and free to start.
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
