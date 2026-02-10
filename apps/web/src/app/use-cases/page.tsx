import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import {
  ArrowRight,
  DollarSign,
  Zap,
  CreditCard,
  Users,
  ArrowLeftRight,
  Landmark,
  ShieldCheck,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use Cases",
  description:
    "Explore how Kontext supports compliance-ready agentic transactions -- USDC payments, x402 micropayments, Stripe commerce, Google UCP, cross-chain CCTP transfers, treasury management, and FCM digital asset collateral compliance (CFTC Letter 26-05).",
};

const usdcCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext({ chain: 'base' });

// Log the USDC transfer for audit
await ctx.logTransaction({
  action: 'usdc_transfer',
  amount: '2500.00',
  currency: 'USDC',
  from: '0xAgent...abc',
  to: '0xVendor...def',
  agent: 'payment-agent-v2',
});

// Check compliance before execution
const compliance = await ctx.checkUsdcCompliance({
  amount: '2500.00',
  recipient: '0xVendor...def',
  chain: 'base',
});

if (compliance.approved) {
  // Proceed with on-chain transfer
  console.log('Trust score:', compliance.trustScore); // 0.96
  console.log('Audit ID:', compliance.auditId);
}`;

const x402Code = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext();

// x402 middleware -- verify every micropayment
export function x402KontextMiddleware(handler) {
  return async (req, res) => {
    const payment = req.headers['x-402-payment'];

    if (payment) {
      const result = await ctx.verify({
        action: 'x402_payment',
        amount: payment.amount,
        currency: payment.currency,
        from: payment.payer,
        agent: payment.agent || 'unknown',
        metadata: {
          resource: req.url,
          method: req.method,
        },
      });

      if (result.flagged) {
        return res.status(402).json({
          error: 'Payment flagged for review',
          flags: result.flags,
        });
      }

      req.kontextResult = result;
    }

    return handler(req, res);
  };
}`;

const stripeCode = `import { Kontext } from 'kontext-sdk';
import Stripe from 'stripe';

const ctx = new Kontext();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handleAgentPayment(agentId: string, amount: number) {
  // Verify with Kontext before creating payment intent
  const result = await ctx.verify({
    action: 'stripe_payment',
    amount: String(amount / 100),
    currency: 'USD',
    agent: agentId,
    metadata: { provider: 'stripe', type: 'payment_intent' },
  });

  if (result.flagged) {
    throw new Error('Payment flagged for compliance review');
  }

  // Create Stripe payment intent with Kontext audit metadata
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: {
      kontext_audit_id: result.auditId,
      kontext_trust_score: String(result.trustScore),
      agent_id: agentId,
    },
  });

  return intent;
}`;

const ucpCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext();

// Google UCP / A2A -- verify agent-to-agent transactions
async function handleUcpTransaction(ucpPayload) {
  const result = await ctx.verify({
    action: 'ucp_transaction',
    amount: ucpPayload.amount,
    currency: ucpPayload.currency,
    agent: ucpPayload.agentId,
    metadata: {
      ucpSessionId: ucpPayload.sessionId,
      merchantId: ucpPayload.merchantId,
      counterpartyAgent: ucpPayload.counterpartyAgentId,
      items: ucpPayload.lineItems,
    },
  });

  return {
    approved: !result.flagged,
    trustScore: result.trustScore,
    auditId: result.auditId,
    crossAgentTrail: result.metadata.crossAgentAuditLink,
  };
}`;

const cctpCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext();

// CCTP cross-chain USDC transfer with full audit lifecycle
class CCTPTransferManager {
  async initiateTransfer(from: string, to: string, amount: string) {
    // 1. Pre-transfer verification
    const preCheck = await ctx.verify({
      action: 'cctp_initiate',
      amount,
      currency: 'USDC',
      agent: 'treasury-agent',
      metadata: {
        sourceChain: 'ethereum',
        destChain: 'base',
        from,
        to,
      },
    });

    if (preCheck.flagged) {
      throw new Error('Cross-chain transfer flagged');
    }

    // 2. Burn on source chain (your CCTP logic here)
    const burnTxHash = '0xburn...abc';

    // 3. Log attestation wait
    await ctx.log({
      action: 'cctp_awaiting_attestation',
      metadata: {
        burnTxHash,
        auditId: preCheck.auditId,
      },
    });

    // 4. Mint on destination chain
    const mintTxHash = '0xmint...def';

    // 5. Link both chains in audit trail
    await ctx.log({
      action: 'cctp_complete',
      metadata: {
        burnTxHash,
        mintTxHash,
        sourceChain: 'ethereum',
        destChain: 'base',
        auditId: preCheck.auditId,
      },
    });
  }
}`;

const treasuryCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext({ apiKey: process.env.KONTEXT_KEY });

// Treasury policy: require human confirmation for large transfers
ctx.setPolicy({
  requireConfirmation: {
    when: [
      { field: 'amount', operator: 'gt', value: '50000' },
      { field: 'action', operator: 'eq', value: 'treasury_transfer' },
    ],
    timeout: 600_000, // 10 minute timeout
    fallback: 'deny',
    notifyChannels: ['slack', 'email'],
  },
});

async function executeTreasuryTransfer(params) {
  const result = await ctx.verify({
    action: 'treasury_transfer',
    amount: params.amount,
    currency: 'USDC',
    agent: 'treasury-manager-v3',
    metadata: {
      purpose: params.purpose,
      approvedBudget: params.budget,
      department: params.department,
    },
  });

  if (result.pendingConfirmation) {
    console.log('Awaiting CFO approval...');
    console.log('Approval URL:', result.confirmationUrl);
    // Resolves when approved or times out
  }

  console.log('Risk score:', result.riskScore);
  console.log('Trust score:', result.trustScore);
}`;

const fcmCode = `import { Kontext, CFTCCompliance } from 'kontext-sdk';

const kontext = Kontext.init({ projectId: 'fcm-collateral', environment: 'production' });
const cftc = new CFTCCompliance();

// Log collateral valuation with haircut
cftc.logCollateralValuation({
  accountClass: 'futures',
  assetType: 'payment_stablecoin',
  assetSymbol: 'USDC',
  quantity: 1_000_000,
  marketValue: 1_000_000,
  haircutPercentage: 0.02,
  valuationMethod: 'dco_reference',
  agentId: 'collateral-agent',
});

// Generate weekly CFTC report
const report = cftc.generateWeeklyDigitalAssetReport(
  'futures',
  new Date('2026-02-03'),
  new Date('2026-02-09'),
);`;

const useCases = [
  {
    id: "usdc-payments",
    icon: DollarSign,
    badge: "Primary",
    badgeColor: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    title: "USDC Payments",
    description:
      "Agents making USDC transfers on Base and Ethereum with comprehensive audit trails and compliance support. The most common Kontext use case -- verify every stablecoin movement your agents make.",
    code: usdcCode,
    filename: "usdc-agent.ts",
    benefits: [
      "Immutable audit trail for every USDC transfer with cryptographic linking",
      "Real-time anomaly detection -- velocity checks, amount thresholds, recipient analysis",
      "Supports GENIUS Act compliance efforts with exportable reports (JSON, CSV, PDF)",
      "Trust scoring per transaction based on agent history and behavioral analysis",
    ],
  },
  {
    id: "x402-protocol",
    icon: Zap,
    badge: "Protocol",
    badgeColor: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    title: "x402 Protocol",
    description:
      "HTTP-native micropayments where agents pay per-request. Kontext wraps x402 flows with compliance verification so every micropayment is logged and scored.",
    code: x402Code,
    filename: "x402-middleware.ts",
    benefits: [
      "Per-request billing verification -- every micropayment logged and scored",
      "Automated payment verification middleware that drops into any HTTP stack",
      "Fraud detection across high-frequency micropayment streams",
      "Audit trail linking payments to specific API resources and methods",
    ],
  },
  {
    id: "stripe-agentic",
    icon: CreditCard,
    badge: "Commerce",
    badgeColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
    title: "Stripe Agentic Commerce",
    description:
      "Agents initiating Stripe payment intents with Kontext verification. The audit ID is embedded in Stripe metadata for end-to-end traceability between compliance logs and payment records.",
    code: stripeCode,
    filename: "stripe-agent.ts",
    benefits: [
      "Chargeback prevention -- verify agent identity and intent before payment creation",
      "Full agent transaction audit trail linked to Stripe payment intent metadata",
      "Trust scoring gates payment creation -- block low-trust agents automatically",
      "Compliance-ready records mapping Kontext audit IDs to Stripe payment IDs",
    ],
  },
  {
    id: "google-ucp",
    icon: Users,
    badge: "A2A",
    badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    title: "Google UCP / A2A",
    description:
      "Agent-to-agent commerce via Google's Universal Checkout Protocol. Kontext provides trust scoring for A2A transactions so agents can verify each other before transacting.",
    code: ucpCode,
    filename: "ucp-agent.ts",
    benefits: [
      "Trust scoring for agent-to-agent transactions -- verify counterparty agents",
      "Cross-agent audit trails linking both sides of an A2A transaction",
      "UCP session tracking with full metadata preservation in the audit log",
      "Anomaly detection tuned for multi-agent commerce patterns",
    ],
  },
  {
    id: "cctp-transfers",
    icon: ArrowLeftRight,
    badge: "Cross-Chain",
    badgeColor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    title: "Cross-Chain Transfers (CCTP)",
    description:
      "USDC transfers across chains via Circle's Cross-Chain Transfer Protocol. Kontext tracks the full burn-attest-mint lifecycle with linked audit entries across source and destination chains.",
    code: cctpCode,
    filename: "cctp-manager.ts",
    benefits: [
      "Cross-chain audit linking -- a single audit trail spanning source and destination chains",
      "Attestation tracking with status logging at each CCTP lifecycle stage",
      "Pre-transfer compliance checks before initiating the burn on the source chain",
      "Unified reporting across Ethereum, Base, and other supported CCTP chains",
    ],
  },
  {
    id: "treasury-management",
    icon: Landmark,
    badge: "Enterprise",
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    title: "Treasury Management",
    description:
      "AI agents managing corporate treasury operations with human-in-the-loop approval for high-value transfers. Define policies declaratively and Kontext enforces them automatically.",
    code: treasuryCode,
    filename: "treasury-agent.ts",
    benefits: [
      "Human-in-the-loop approval for transfers exceeding configurable thresholds",
      "Risk scoring based on amount, purpose, department, and agent history",
      "Multi-channel notifications (Slack, email) for pending approvals",
      "Department-level budget enforcement with real-time spend tracking",
    ],
  },
  {
    id: "fcm-collateral",
    icon: ShieldCheck,
    badge: "CFTC Letter 26-05 Aligned",
    badgeColor: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    title: "FCM Digital Asset Collateral Compliance",
    description:
      "CFTC Letter 26-05 compliance infrastructure for futures commission merchants accepting stablecoin and digital asset collateral. Kontext provides the tamper-evident audit trail, automated reporting, and segregation tracking that FCMs need to meet new CFTC requirements.",
    code: fcmCode,
    filename: "fcm-compliance.ts",
    benefits: [
      "Collateral valuation logging with tamper-evident audit trail and cryptographic digest chains",
      "Daily mark-to-market tracking with automated haircut validation per DCO reference prices",
      "Weekly CFTC digital asset reports generated automatically by asset type and account class",
      "Segregation calculation logging for futures, cleared swaps, and 30.7 secured accounts",
      "Cybersecurity incident reporting and alerting per CFTC requirements",
      "GENIUS Act-aligned stablecoin definitions for payment stablecoin classification",
      "Risk management program documentation support aligned with Commission Reg 1.11",
    ],
  },
];

export default function UseCasesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Use Cases
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Built for the{" "}
              <span className="gradient-text">Agent Economy</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              See how Kontext supports compliance-ready agentic transactions across
              stablecoin and fiat payments, micropayment protocols, commerce platforms,
              and cross-chain transfers.
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
      <section className="sticky top-16 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            {useCases.map((uc) => (
              <a
                key={uc.id}
                href={`#${uc.id}`}
                className="inline-flex shrink-0 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
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
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <useCase.icon size={20} />
                      </div>
                      <Badge
                        variant="outline"
                        className={useCase.badgeColor}
                      >
                        {useCase.badge}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
                  <div className={`glow rounded-xl ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
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
