import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import {
  ArrowRight,
  DollarSign,
  Zap,
  CreditCard,
  Landmark,
  Anchor,
  Handshake,
  Check,
  UserSearch,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use Cases",
  description:
    "See how Kontext logs, scores, and proves compliance for agentic transactions — USDC payments, x402 micropayments, Stripe commerce, treasury management, on-chain anchoring, and A2A attestation.",
};

const usdcCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-payment-agent',
  environment: 'production',
});

// One call: compliance check + transaction log + digest chain
const result = await ctx.verify({
  txHash: '0xabc123...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xAgentWallet...abc',
  to: '0xVendor...def',
  agentId: 'payment-agent-v2',
});

if (result.compliant) {
  console.log('Risk level:', result.riskLevel);       // 'low'
  console.log('Trust score:', result.trustScore.score); // 87
  console.log('Checks passed:', result.checks.length);
} else {
  // result.checks tells you exactly what failed
  // result.recommendations tells you what to do about it
  console.log('Blocked:', result.recommendations);
}`;

const x402Code = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'x402-gateway',
  environment: 'production',
});

// x402 middleware -- verify every micropayment
export function x402KontextMiddleware(handler) {
  return async (req, res) => {
    const payment = req.headers['x-402-payment'];

    if (payment) {
      const result = await ctx.verify({
        txHash: payment.txHash,
        chain: 'base',
        amount: payment.amount,
        token: 'USDC',
        from: payment.payer,
        to: payment.payee,
        agentId: payment.agentId || 'unknown',
        metadata: {
          resource: req.url,
          method: req.method,
        },
      });

      if (!result.compliant) {
        return res.status(402).json({
          error: 'Payment failed compliance check',
          checks: result.checks.filter(c => !c.passed),
        });
      }

      req.kontextResult = result;
    }

    return handler(req, res);
  };
}`;

const stripeCode = `import { Kontext } from 'kontext-sdk';
import Stripe from 'stripe';

const ctx = Kontext.init({
  projectId: 'stripe-agent',
  environment: 'production',
});
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handleAgentPayment(agentId: string, amount: number) {
  // Verify with Kontext before creating payment intent
  const result = await ctx.verify({
    amount: String(amount / 100),
    currency: 'USD',
    from: agentId,
    to: 'merchant-account',
    agentId,
    paymentMethod: 'card',
    metadata: { provider: 'stripe', type: 'payment_intent' },
  });

  if (!result.compliant) {
    throw new Error('Payment blocked by compliance checks');
  }

  // Embed Kontext proof in Stripe metadata for traceability
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: {
      kontext_digest: result.digestProof.terminalDigest,
      kontext_trust_score: String(result.trustScore.score),
      agent_id: agentId,
    },
  });

  return intent;
}`;

const treasuryCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  apiKey: process.env.KONTEXT_KEY,
  projectId: 'treasury-ops',
  environment: 'production',
  plan: 'payg',
});

// Enable anomaly detection for treasury movements
ctx.enableAnomalyDetection({
  rules: ['unusualAmount', 'frequencySpike', 'newDestination'],
  thresholds: { maxAmount: '50000', maxFrequency: 10 },
});

ctx.onAnomaly((event) => {
  // Alert finance team on Slack/PagerDuty
  notifyFinanceTeam(event);
});

async function executeTreasuryTransfer(params) {
  const result = await ctx.verify({
    txHash: params.txHash,
    chain: 'base',
    amount: params.amount,
    token: 'USDC',
    from: params.treasuryWallet,
    to: params.destinationWallet,
    agentId: 'treasury-manager-v3',
    reasoning: \`Transfer for \${params.purpose}. Within \${params.department} budget.\`,
    confidence: 0.92,
  });

  if (!result.compliant) {
    throw new Error('Transfer blocked by compliance checks');
  }

  // Human-in-the-loop for large transfers
  if (parseFloat(params.amount) > 50000) {
    const task = await ctx.createTask({
      description: \`Approve $\${params.amount} USDC to \${params.destinationWallet}\`,
      agentId: 'treasury-manager-v3',
      requiredEvidence: ['txHash', 'budget_approval'],
    });
    console.log('Awaiting CFO approval, task:', task.id);
  }

  console.log('Trust score:', result.trustScore.score);
  console.log('Risk level:', result.riskLevel);
}`;

const anchorCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'anchored-compliance',
  environment: 'production',
});

// verify() with on-chain anchoring -- writes your digest to Base
const result = await ctx.verify({
  txHash: '0xdef456...',
  chain: 'base',
  amount: '25000',
  token: 'USDC',
  from: '0xTreasury...abc',
  to: '0xVendor...def',
  agentId: 'payment-agent-v4',
  reasoning: 'Monthly vendor payment, pre-approved in budget cycle',
  anchor: {
    rpcUrl: process.env.BASE_RPC_URL,
    contractAddress: '0xKontextAnchor...abc',
    privateKey: process.env.ANCHOR_SIGNER_KEY,
  },
});

// The anchor proof is included in the result
if (result.anchorProof) {
  console.log('Digest anchored on-chain');
  console.log('Anchor tx:', result.anchorProof.txHash);
  console.log('Block:', result.anchorProof.blockNumber);
  console.log('Digest:', result.anchorProof.digest);
}

// Anyone can independently verify the anchor later
// Zero dependencies -- uses native fetch() + ABI encoding
import { verifyAnchor } from 'kontext-sdk';
const verification = await verifyAnchor(
  process.env.BASE_RPC_URL,
  '0xKontextAnchor...abc',
  result.anchorProof.digest,
);
console.log('Anchor verified:', verification.anchored); // true`;

const a2aCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'buyer-agent',
  environment: 'production',
});

// verify() with counterparty attestation -- bilateral compliance proof
const result = await ctx.verify({
  txHash: '0xabc789...',
  chain: 'base',
  amount: '10000',
  token: 'USDC',
  from: '0xBuyerAgent...abc',
  to: '0xSellerAgent...def',
  agentId: 'buyer-agent-v2',
  reasoning: 'Purchase order #1234, seller verified in allowlist',
  counterparty: {
    endpoint: 'https://seller-agent.example.com',
    agentId: 'seller-agent-v3',
    timeoutMs: 5000,
  },
});

// Both sides now have cryptographic proof the other ran compliance
if (result.counterparty?.attested) {
  console.log('Seller attested:', result.counterparty.agentId);
  console.log('Seller digest:', result.counterparty.digest);
  console.log('Attested at:', result.counterparty.timestamp);
}

// The seller agent exposes /.well-known/kontext.json (agent card)
// and a /kontext/attest endpoint. The SDK handles the handshake --
// your agent sends its digest, the seller sends theirs back,
// and both get linked in their respective audit trails.`;

const useCases = [
  {
    id: "usdc-payments",
    icon: DollarSign,
    badge: "Primary",
    title: "USDC Payments",
    description:
      "The bread and butter. Your agent moves USDC on Base or Ethereum, and you need a compliance trail that actually holds up. One call to verify() logs the transaction, runs OFAC and threshold checks, computes a trust score, and chains it all into a tamper-evident digest. No config files, no infrastructure — just an npm install and you're logging.",
    code: usdcCode,
    filename: "usdc-agent.ts",
    benefits: [
      "Tamper-evident audit trail for every USDC transfer with SHA-256 digest chaining",
      "Built-in OFAC screening, Travel Rule ($3K), and CTR ($10K) threshold checks",
      "Trust scoring per agent based on transaction history and behavioral patterns",
      "Exportable compliance reports (JSON out of the box, CSV on Pro)",
    ],
  },
  {
    id: "x402-protocol",
    icon: Zap,
    badge: "Protocol",
    title: "x402 Protocol",
    description:
      "HTTP-native micropayments where agents pay per-request. Drop Kontext into your x402 middleware and every micropayment gets compliance-checked before it hits your handler. High-frequency, low-friction — the SDK handles the volume without slowing things down.",
    code: x402Code,
    filename: "x402-middleware.ts",
    benefits: [
      "Per-request compliance verification that slots into any HTTP middleware stack",
      "Every micropayment logged with sender, amount, and resource metadata",
      "Anomaly detection across high-frequency payment streams (velocity, amount spikes)",
      "Audit trail linking payments to specific API resources and request methods",
    ],
  },
  {
    id: "stripe-agentic",
    icon: CreditCard,
    badge: "Commerce",
    title: "Stripe Agentic Commerce",
    description:
      "Your agent creates Stripe payment intents, and you need to know it is not going off the rails. Verify with Kontext first, then embed the digest proof right in Stripe's metadata. When someone asks \"why did this agent charge that card?\" you have a cryptographically linked answer.",
    code: stripeCode,
    filename: "stripe-agent.ts",
    benefits: [
      "Pre-payment compliance gate — block untrusted agents before any charge is created",
      "Digest proof embedded in Stripe payment metadata for end-to-end traceability",
      "Trust scoring gates payment creation — low-trust agents get stopped automatically",
      "Full audit trail mapping Kontext digests to Stripe payment intent IDs",
    ],
  },
  {
    id: "treasury-management",
    icon: Landmark,
    badge: "Enterprise",
    title: "Treasury Management",
    description:
      "AI agents managing corporate treasury with real money need guardrails that actually work. Kontext gives you anomaly detection for unusual patterns, trust scoring that learns from history, and human-in-the-loop approval for transfers above your threshold. Your CFO gets a Slack ping, not a surprise.",
    code: treasuryCode,
    filename: "treasury-agent.ts",
    benefits: [
      "Human-in-the-loop approval for transfers exceeding configurable thresholds",
      "Anomaly detection for unusual amounts, new destinations, and frequency spikes",
      "Agent reasoning logged alongside every transfer decision (the \"why\" for auditors)",
      "Trust scoring based on agent history — new agents start cautious, build trust over time",
    ],
  },
  {
    id: "on-chain-anchoring",
    icon: Anchor,
    badge: "Tamper-Evidence",
    title: "On-Chain Anchoring",
    description:
      "The digest chain already gives you tamper-evident logging at the software level. On-chain anchoring takes it further — after verify() runs, the terminal digest gets written to a smart contract on Base. Now you have a publicly verifiable, immutable proof that your compliance checks ran at a specific block height. Anyone can verify it independently, no trust required.",
    code: anchorCode,
    filename: "anchor-agent.ts",
    benefits: [
      "Terminal digest anchored on-chain after every verify() call — immutable proof on Base",
      "Block number and timestamp provide a public, verifiable compliance checkpoint",
      "Independent verification — anyone with the contract address can check the anchor",
      "Complements the software digest chain with hardware-level tamper-evidence",
    ],
  },
  {
    id: "a2a-attestation",
    icon: Handshake,
    badge: "Bilateral Proof",
    title: "A2A Attestation",
    description:
      "When two agents transact, both sides need proof that the other ran compliance. Pass a counterparty config to verify() and the SDK handles the handshake automatically — your agent sends its digest to the counterparty, gets theirs back, and both get linked in their respective audit trails. Bilateral compliance proof, zero coordination overhead.",
    code: a2aCode,
    filename: "a2a-attestation.ts",
    benefits: [
      "Bilateral compliance proof — both agents prove they ran checks before transacting",
      "Automatic agent card discovery via /.well-known/kontext.json (like robots.txt for compliance)",
      "Digest exchange links both audit trails cryptographically — tamper-evident on both sides",
      "Configurable timeout and agent ID verification for the attestation handshake",
    ],
  },
  {
    id: "agent-forensics",
    icon: UserSearch,
    badge: "Pro",
    title: "Agent Forensics",
    description:
      "When multiple agents share wallets or one entity operates many wallets, you need to know. Agent forensics maps wallets to agent identities, detects multi-wallet clustering with 5 heuristics, and computes identity confidence scores. Answer the question regulators will ask: who controls what?",
    code: `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  apiKey: process.env.KONTEXT_KEY,
  projectId: 'forensics-dashboard',
  environment: 'production',
  plan: 'payg',
});

// Register agent identities with wallet mappings
ctx.registerAgentIdentity({
  agentId: 'treasury-agent-v2',
  displayName: 'Treasury Agent',
  entityType: 'autonomous',
  wallets: [
    { address: '0xTreasury...abc', chain: 'base', label: 'primary' },
    { address: '0xReserve...def', chain: 'base', label: 'reserve' },
  ],
});

// Detect wallet clusters across all registered agents
const clusters = ctx.getWalletClusters();
// [{ wallets: ['0xTreasury...abc', '0xReserve...def'],
//    heuristics: ['shared-owner', 'funding-chain'],
//    evidence: [...] }]

// Confidence score: how certain is the identity?
const score = ctx.getKYAConfidenceScore('treasury-agent-v2');
// { score: 82, level: 'high', components: [...] }`,
    filename: "forensics.ts",
    benefits: [
      "Wallet-to-agent mapping — register identities and link wallets with evidence",
      "5 clustering heuristics: shared-owner, temporal-correlation, funding-chain, amount-pattern, network-overlap",
      "Identity confidence scoring (0-100) with component-level breakdown",
      "Exportable forensics data via getKYAExport() for compliance reporting",
    ],
  },
];

export default function UseCasesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-border">
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Use Cases
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Built for the{" "}
              <span className="text-primary">Agent Economy</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              See how Kontext fits into real agent workflows — stablecoin
              payments, micropayments, treasury ops, on-chain anchoring, and
              agent-to-agent attestation. Every example uses the actual SDK API.
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
      <section className="sticky top-16 z-40 border-b-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            {useCases.map((uc) => (
              <a
                key={uc.id}
                href={`#${uc.id}`}
                className="inline-flex shrink-0 rounded-[5px] border-2 border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
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
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
                        <useCase.icon size={20} />
                      </div>
                      <Badge variant="outline">
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
                  <div className={`rounded-[5px] border-2 border-border shadow-shadow ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
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
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to add compliance to your agents?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start logging agent transactions in under 5
              minutes. Open source and free to start.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-[5px] border-2 border-border bg-card px-4 py-2 font-mono text-sm text-muted-foreground shadow-shadow-sm">
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
