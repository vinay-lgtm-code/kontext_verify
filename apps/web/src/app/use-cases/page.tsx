import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import {
  ArrowRight,
  Zap,
  Landmark,
  Check,
  Users,
  FileText,
  Globe,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use Cases",
  description:
    "See how Kontext manages payment lifecycles across payroll, treasury, invoicing, micropayments, and cross-border transfers.",
};

const payrollCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'payroll-ops',
  environment: 'production',
});

const attempt = await ctx.start({
  workspaceRef: 'acme-payroll',
  appRef: 'payroll-agent',
  archetype: 'payroll',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xPayroll...abc' },
  recipientRefs: { wallet: '0xEmployee...def' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '3500',
  from: '0xPayroll...abc',
  to: '0xEmployee...def',
  actorId: 'payroll-agent',
  metadata: {
    employeeId: 'emp_042',
    payPeriod: '2026-03',
    country: 'US',
  },
});

if (receipt.allowed) {
  await ctx.broadcast(attempt.attemptId, txHash, 'base');
  await ctx.confirm(attempt.attemptId, { txHash, blockNumber });
}`;

const treasuryCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'treasury-ops',
  environment: 'production',
});

const attempt = await ctx.start({
  workspaceRef: 'acme-treasury',
  appRef: 'treasury-agent',
  archetype: 'treasury',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xTreasury...abc' },
  recipientRefs: { wallet: '0xVendor...def' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '25000',
  from: '0xTreasury...abc',
  to: '0xVendor...def',
  actorId: 'treasury-agent',
  metadata: { purpose: 'vendor-payment', department: 'engineering' },
});

// receipt.decision = 'review' (above $10K threshold)
// receipt.requiredActions = [{ code: 'REQUEST_APPROVAL', ... }]`;

const invoicingCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'invoice-ops',
  environment: 'production',
});

const attempt = await ctx.start({
  workspaceRef: 'acme-invoicing',
  appRef: 'invoice-agent',
  archetype: 'invoicing',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xAccounts...abc' },
  recipientRefs: { wallet: '0xVendor...def' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '12000',
  from: '0xAccounts...abc',
  to: '0xVendor...def',
  actorId: 'invoice-agent',
  metadata: {
    invoiceId: 'INV-2026-0342',
    vendorId: 'vendor_acme_supplies',
    dueDate: '2026-03-15',
  },
});`;

const micropaymentCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'x402-gateway',
  environment: 'production',
});

const attempt = await ctx.start({
  workspaceRef: 'x402-service',
  appRef: 'api-gateway',
  archetype: 'micropayments',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xPayer...abc' },
  recipientRefs: { wallet: '0xService...def' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '0.50',
  from: '0xPayer...abc',
  to: '0xService...def',
  actorId: 'api-gateway',
  metadata: { resource: '/api/data', method: 'GET' },
});
// receipt.decision = 'allow' — fast path, no review threshold`;

const crossBorderCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'remittance-app',
  environment: 'production',
});

const attempt = await ctx.start({
  workspaceRef: 'remit-service',
  appRef: 'remittance-agent',
  archetype: 'cross_border',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xSender...abc' },
  recipientRefs: { wallet: '0xRecipient...def' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '2500',
  from: '0xSender...abc',
  to: '0xRecipient...def',
  actorId: 'remittance-agent',
  metadata: {
    recipientName: 'Maria Garcia',
    recipientCountry: 'MX',
    purpose: 'family-support',
  },
});`;

const useCases = [
  {
    id: "payroll",
    icon: Users,
    badge: "Archetype",
    title: "Payroll",
    description:
      "Recurring employee USDC payouts with strict metadata requirements. Each payroll transfer must include employeeId, payPeriod, and country. The policy engine enforces required metadata and daily aggregate limits per payment period.",
    code: payrollCode,
    filename: "payroll-agent.ts",
    benefits: [
      "Required metadata enforcement — employeeId, payPeriod, country checked at authorize()",
      "Daily aggregate limits per archetype ($15K max for payroll)",
      "Digest-chained records for payroll audit trails",
      "OFAC screening on every recipient address",
    ],
  },
  {
    id: "treasury",
    icon: Landmark,
    badge: "Archetype",
    title: "Treasury",
    description:
      "High-value treasury movements with human review thresholds. Transfers above $10K trigger a 'review' decision from the policy engine, requiring explicit human approval before the payment proceeds.",
    code: treasuryCode,
    filename: "treasury-agent.ts",
    benefits: [
      "Human approval thresholds — amounts above $10K require review",
      "OFAC sanctions screening on every sender and recipient",
      "Full lifecycle audit from intent to reconciliation",
      "Max transaction amount ($25K) enforced at authorize()",
    ],
  },
  {
    id: "invoicing",
    icon: FileText,
    badge: "Archetype",
    title: "Invoicing",
    description:
      "B2B invoice settlement with vendor tracking. Each invoice payment carries invoiceId, vendorId, and dueDate metadata. The policy engine enforces vendor allowlists and blocks payments to unverified vendors.",
    code: invoicingCode,
    filename: "invoice-agent.ts",
    benefits: [
      "Required metadata per payment type — invoiceId, vendorId, dueDate",
      "Vendor allowlist enforcement at authorize() stage",
      "Max transaction amount ($20K) with review threshold",
      "Digest-chained invoice settlement records",
    ],
  },
  {
    id: "micropayments",
    icon: Zap,
    badge: "Archetype",
    title: "Micropayments",
    description:
      "High-frequency small payments via x402. Micropayments use a streamlined archetype with a $100 max transaction amount and no human review threshold. Optimized for volume — the policy engine runs fast checks without blocking throughput.",
    code: micropaymentCode,
    filename: "micropayment-agent.ts",
    benefits: [
      "Low-friction, high-volume — $100 max, no review threshold",
      "OFAC screening on every micropayment sender and recipient",
      "Per-request metadata (resource, method) logged in digest chain",
      "Tight amount caps prevent abuse on high-frequency channels",
    ],
  },
  {
    id: "cross-border",
    icon: Globe,
    badge: "Archetype",
    title: "Cross-Border Remittance",
    description:
      "Consumer remittance with enhanced compliance requirements. Cross-border payments require recipientName, recipientCountry, and purpose metadata. The policy engine applies stricter OFAC screening and country-level restrictions.",
    code: crossBorderCode,
    filename: "remittance-agent.ts",
    benefits: [
      "OFAC screening with country-level restrictions",
      "Required metadata — recipientName, recipientCountry, purpose",
      "$10K max per transaction enforced at authorize()",
      "Full lifecycle audit for cross-border compliance reporting",
    ],
  },
];

export default function UseCasesPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              USE CASES
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              See how Kontext fits into real payment workflows — payroll,
              treasury, invoicing, micropayments, and cross-border transfers.
              Every example uses the actual SDK API.
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
                  View on GitHub
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/integrations">
                  View Integrations
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="sticky top-16 z-40 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            {useCases.map((uc) => (
              <a
                key={uc.id}
                href={`#${uc.id}`}
                className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
              >
                {uc.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {useCases.map((useCase, index) => (
              <div
                key={useCase.id}
                id={useCase.id}
                className="scroll-mt-32"
              >
                <div
                  className={`grid items-start gap-8 lg:gap-12 ${
                    index % 2 === 0
                      ? "lg:grid-cols-2"
                      : "lg:grid-cols-2 lg:[direction:rtl]"
                  }`}
                >
                  {/* Text content */}
                  <div className={index % 2 !== 0 ? "lg:[direction:ltr]" : ""}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                        <useCase.icon size={20} />
                      </div>
                      <Badge variant="outline">
                        {useCase.badge}
                      </Badge>
                    </div>
                    <h2 className="text-sm font-medium">
                      {useCase.title}
                    </h2>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {useCase.description}
                    </p>

                    {/* Benefits */}
                    <ul className="mt-6 space-y-3">
                      {useCase.benefits.map((benefit) => (
                        <li
                          key={benefit}
                          className="flex items-start gap-3 text-sm text-muted-foreground"
                        >
                          <Check
                            size={16}
                            className="mt-0.5 shrink-0 text-primary"
                          />
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href="/docs">
                          View Documentation
                          <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Code block */}
                  <div className={`border border-border ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
                    <CodeBlock
                      code={useCase.code}
                      language="typescript"
                      filename={useCase.filename}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-sm font-medium">
              Ready to add payment lifecycle management?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start tracking payment lifecycles in under 5
              minutes. Open source and free to start.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 border border-border bg-card px-4 py-2 font-mono text-sm text-muted-foreground">
              <span className="text-primary">$</span>
              npm install kontext-sdk
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/integrations">View Integrations</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
