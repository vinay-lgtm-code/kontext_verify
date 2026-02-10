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
  Coins,
  Shield,
  Search,
  FileCheck,
  ArrowLeftRight,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Stablecoin Issuers",
  description:
    "GENIUS Act-aligned compliance infrastructure for stablecoin operations. Unified screening (OFAC, Chainalysis, OpenSanctions), SAR/CTR generation, multi-chain support, trust scoring, and audit export for stablecoin issuers.",
};

const painPoints = [
  {
    title: "Evolving regulatory landscape",
    description:
      "The GENIUS Act is reshaping stablecoin regulation in the United States. Issuers need infrastructure that adapts as requirements solidify -- not point solutions that break with every regulatory update.",
  },
  {
    title: "Reserve transparency requirements",
    description:
      "Stablecoin issuers face increasing pressure to demonstrate reserve adequacy and provide transparent audit trails. Manual attestation processes do not scale with transaction volume.",
  },
  {
    title: "Transaction monitoring at scale",
    description:
      "Stablecoin operations generate massive transaction volumes across multiple chains. Screening every transaction against sanctions lists and monitoring for suspicious activity requires automated infrastructure.",
  },
  {
    title: "Cross-chain operations complexity",
    description:
      "Stablecoins operate across Ethereum, Base, Polygon, Arbitrum, Optimism, and more. Maintaining consistent compliance across all chains demands a unified compliance layer.",
  },
];

const features = [
  {
    icon: Shield,
    title: "GENIUS Act Alignment Templates",
    description:
      "Pre-built compliance templates aligned with GENIUS Act requirements for payment stablecoin issuers. Stay ahead of regulatory requirements as they evolve.",
  },
  {
    icon: Search,
    title: "Unified Compliance Screening",
    description:
      "Best-in-class screening aggregating OFAC SDN, Chainalysis Oracle, Chainalysis API, and OpenSanctions into a single result. Pluggable provider architecture with weighted scoring and configurable thresholds.",
  },
  {
    icon: FileCheck,
    title: "SAR/CTR Report Generation",
    description:
      "Generate Suspicious Activity Reports and Currency Transaction Reports from your Kontext audit trail. Structured data ready for FinCEN filing.",
  },
  {
    icon: ArrowLeftRight,
    title: "Multi-Chain Support",
    description:
      "Unified compliance across Base, Ethereum, Polygon, Arbitrum, and Optimism. A single audit trail spanning every chain your stablecoin operates on.",
  },
  {
    icon: BarChart3,
    title: "Trust Scoring for Counterparties",
    description:
      "Score counterparty risk in real time based on transaction history, behavioral patterns, and on-chain signals. Identify high-risk actors before they transact.",
  },
  {
    icon: ClipboardCheck,
    title: "Audit Export",
    description:
      "Export compliance-ready audit trails in JSON, CSV, and PDF formats. Ready for regulators, auditors, and your own internal compliance team.",
  },
];

const stablecoinCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext({
  apiKey: process.env.KONTEXT_KEY,
  chain: 'base',
});

// OFAC screening before processing a USDC operation
const screen = await ctx.screenAddress({
  address: '0xRecipient...abc',
  lists: ['SDN', 'OFAC_CONSOLIDATED'],
});

if (screen.sanctioned) {
  console.log('Blocked:', screen.matchedLists);
  // Do not process the transaction
  return;
}

// Log the stablecoin operation with full compliance context
const result = await ctx.verify({
  action: 'usdc_mint',
  amount: '500000.00',
  currency: 'USDC',
  agent: 'issuance-service',
  metadata: {
    operationType: 'mint',
    reserveAccount: 'reserve-001',
    ofacScreenId: screen.screenId,
    chain: 'base',
    recipient: '0xRecipient...abc',
  },
});

console.log('Trust score:', result.trustScore);
console.log('Audit ID:', result.auditId);
console.log('Digest:', result.digest);

// Export audit trail for regulatory inquiry
const report = await ctx.exportAudit({
  format: 'pdf',
  dateRange: { from: '2026-01-01', to: '2026-02-09' },
  includeOFACScreening: true,
});`;

export default function StablecoinIssuersPage() {
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
              className="mb-4 border-blue-500/30 bg-blue-500/10 text-blue-400"
            >
              Stablecoin Issuers
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              GENIUS Act-Aligned Infrastructure for{" "}
              <span className="gradient-text">Stablecoin Operations</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              The GENIUS Act is redefining stablecoin compliance in the United
              States. Kontext gives issuers the audit trail, sanctions screening,
              and reporting infrastructure they need to operate confidently.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <a
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
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
                  Get Started
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <a
                  href="https://cal.com/vinnaray"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Talk to Us
                  <ArrowRight size={16} />
                </a>
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
              The Challenge
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why stablecoin issuers need dedicated compliance tooling
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Stablecoin operations are under increasing regulatory scrutiny.
              General-purpose tools are not enough.
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

      {/* How Kontext Helps */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              How Kontext Helps
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Compliance infrastructure for stablecoin operations
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              From unified compliance screening to audit export, everything you need to
              operate a compliant stablecoin.
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
                Unified screening and transaction logging
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Screen addresses against multiple sanctions sources -- OFAC SDN,
                Chainalysis, and OpenSanctions -- before processing transactions,
                then log every operation with full compliance context and export
                audit trails for regulatory inquiries.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Unified screening across OFAC, Chainalysis, and OpenSanctions",
                  "Real-time multi-source screening before every transaction",
                  "Full audit trail with tamper-evident digest chain",
                  "Export in JSON, CSV, or PDF for regulators",
                  "Multi-chain support for cross-chain operations",
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
                code={stablecoinCode}
                language="typescript"
                filename="stablecoin-compliance.ts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-card to-card p-8 sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <Badge
                variant="outline"
                className="mb-4 border-blue-500/30 bg-blue-500/10 text-blue-400"
              >
                Pricing
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Pro or Enterprise -- built for your scale
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Stablecoin issuers typically need Pro ($199/user/month) for
                cloud dashboard, unified compliance screening, and ML-powered anomaly
                detection. Enterprise plans are available for issuers with
                custom requirements, dedicated support, and SLAs.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Pro: $199/user/month, 100K events/user, unified screening",
                  "Enterprise: Custom pricing, unlimited events, SLA",
                  "GENIUS Act alignment templates included",
                  "Dedicated compliance engineering support (Enterprise)",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-blue-400"
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
                  <a
                    href="https://cal.com/vinnaray"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact Enterprise Sales
                    <ArrowRight size={16} />
                  </a>
                </Button>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-blue-500/3 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to build GENIUS Act-aligned compliance?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Start with the SDK today or talk to our team about Enterprise
              support for your stablecoin operations.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <a
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Started
                  <ArrowRight size={16} />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://cal.com/vinnaray"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Talk to Us
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
