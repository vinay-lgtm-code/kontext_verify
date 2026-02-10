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
  Building2,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  Shield,
  FileCheck,
  Scale,
} from "lucide-react";

export const metadata: Metadata = {
  title: "FCMs & Trading Firms",
  description:
    "CFTC Letter 26-05 compliance infrastructure for futures commission merchants accepting digital asset collateral. Collateral valuation logging, haircut validation, weekly CFTC reports, and segregation tracking.",
};

const painPoints = [
  {
    title: "New CFTC reporting requirements for digital asset collateral",
    description:
      "CFTC Letter 26-05 introduces specific reporting and record-keeping obligations for FCMs accepting stablecoins and digital assets as customer margin collateral. Meeting these requirements demands purpose-built infrastructure.",
  },
  {
    title: "Daily mark-to-market with haircut validation",
    description:
      "Digital asset collateral must be valued daily using DCO reference prices with mandatory haircuts -- 20% minimum for non-BTC/ETH assets. Manual tracking is error-prone and unscalable.",
  },
  {
    title: "Weekly reporting to the Commission",
    description:
      "FCMs must submit weekly digital asset reports to the CFTC detailing collateral holdings by asset type and account class. Generating these reports manually consumes significant back-office resources.",
  },
  {
    title: "Segregation calculation complexity across 3 account classes",
    description:
      "Tracking segregation requirements across futures (4d), cleared swaps (22), and 30.7 secured accounts requires daily calculations with full audit trails for regulatory examination.",
  },
  {
    title: "Cybersecurity incident documentation requirements",
    description:
      "CFTC regulations require FCMs to document and report cybersecurity incidents promptly. Having tamper-evident logs of all digital asset operations is essential for incident response.",
  },
];

const features = [
  {
    icon: BarChart3,
    title: "Collateral Valuation Logging",
    description:
      "Log every collateral valuation with asset type, quantity, market value, haircut percentage, and valuation method. Full audit trail with tamper-evident cryptographic digest chains.",
  },
  {
    icon: Shield,
    title: "Automated Haircut Validation",
    description:
      "Enforce the 20% minimum haircut for non-BTC/ETH digital assets per CFTC Letter 26-05 requirements. Configurable haircut rules per asset class and DCO reference pricing.",
  },
  {
    icon: FileCheck,
    title: "Weekly CFTC Digital Asset Reports",
    description:
      "Auto-generate weekly reports for the Commission detailing digital asset collateral holdings by asset type, account class, and valuation method. Export in required formats.",
  },
  {
    icon: Scale,
    title: "Daily Segregation Calculation Tracking",
    description:
      "Track segregation requirements across futures, cleared swaps, and 30.7 secured accounts with daily calculations and full audit trails for regulatory examination.",
  },
  {
    icon: AlertTriangle,
    title: "Incident Reporting",
    description:
      "Commission Reg 1.11-aligned cybersecurity incident documentation and alerting. Tamper-evident logs ensure incident records cannot be altered after the fact.",
  },
  {
    icon: ClipboardCheck,
    title: "Tamper-Evident Audit Trail",
    description:
      "Every collateral operation is recorded in a cryptographic digest chain. Provide regulators with verifiable proof that records have not been modified since creation.",
  },
];

const fcmCode = `import { Kontext, CFTCCompliance } from 'kontext-sdk';

const kontext = Kontext.init({
  projectId: 'fcm-collateral',
  environment: 'production',
});
const cftc = new CFTCCompliance();

// Log a collateral valuation with haircut validation
const valuation = cftc.logCollateralValuation({
  accountClass: 'futures',        // 'futures' | 'cleared_swaps' | '30_7_secured'
  assetType: 'payment_stablecoin',
  assetSymbol: 'USDC',
  quantity: 1_000_000,
  marketValue: 1_000_000,
  haircutPercentage: 0.02,        // 2% for payment stablecoins
  valuationMethod: 'dco_reference',
  agentId: 'collateral-agent',
});

console.log('Valuation ID:', valuation.auditId);
console.log('Digest:', valuation.digest);

// Generate the weekly CFTC digital asset report
const report = cftc.generateWeeklyDigitalAssetReport(
  'futures',
  new Date('2026-02-03'),
  new Date('2026-02-09'),
);

console.log('Report entries:', report.entries.length);
console.log('Total collateral value:', report.totalValue);
console.log('Export format:', report.format); // 'cftc_weekly'`;

export default function FCMsPage() {
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
              className="mb-4 border-rose-500/30 bg-rose-500/10 text-rose-400"
            >
              FCMs &amp; Trading Firms
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              CFTC-Ready Compliance for{" "}
              <span className="gradient-text">Digital Asset Collateral</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              CFTC Letter 26-05 introduced specific requirements for FCMs
              accepting stablecoins and digital assets as customer margin
              collateral. Kontext provides the tamper-evident audit trail,
              automated reporting, and segregation tracking you need.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <a
                  href="https://cal.com/vinnaray"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact Us
                  <ArrowRight size={16} />
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/use-cases#fcm-collateral">
                  View FCM Use Case
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
              The Challenge
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why FCMs need purpose-built compliance infrastructure
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              CFTC Letter 26-05 creates new obligations that legacy systems
              were never designed to handle.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              CFTC Letter 26-05 compliance infrastructure
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Purpose-built tooling for the specific requirements FCMs face
              when accepting digital asset collateral.
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
                Collateral valuation and weekly reporting
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Use the{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                  CFTCCompliance
                </code>{" "}
                class to log collateral valuations with haircut validation and
                generate weekly CFTC digital asset reports automatically.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Automatic haircut validation per CFTC Letter 26-05",
                  "Weekly report generation by account class and date range",
                  "Every valuation linked in a tamper-evident digest chain",
                  "Segregation tracking across futures, cleared swaps, and 30.7",
                  "Export in CFTC-required formats",
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
                code={fcmCode}
                language="typescript"
                filename="fcm-compliance.ts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className="border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/5 via-card to-card p-8 sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <Badge
                variant="outline"
                className="mb-4 border-rose-500/30 bg-rose-500/10 text-rose-400"
              >
                Enterprise
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Enterprise pricing for FCMs
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                FCMs require custom pricing, dedicated support, and SLAs that
                match the regulatory stakes. Our Enterprise plan includes
                unlimited events, priority support, custom integrations, and a
                dedicated compliance engineering team.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Custom pricing tailored to your collateral volume",
                  "Dedicated compliance engineering support",
                  "SLA with guaranteed uptime and response times",
                  "Custom report formats and integration support",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-rose-400"
                    />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a
                    href="https://cal.com/vinnaray"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact Us
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <Link href="/pricing">
                    View All Plans
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-rose-500/5 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-rose-500/3 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to meet CFTC Letter 26-05 requirements?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Talk to our team about how Kontext can support your FCM's digital
              asset collateral compliance infrastructure.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <a
                  href="https://cal.com/vinnaray"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact Us
                  <ArrowRight size={16} />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
