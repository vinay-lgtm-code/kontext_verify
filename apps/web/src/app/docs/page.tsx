import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, BookOpen, Zap, Code2, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Get started with Kontext in minutes. Installation, quick start, API reference, and integration guides for USDC, x402, Google UCP, and Stripe.",
};

const installCode = `npm install @kontext/sdk`;

const quickStartCode = `import { Kontext } from '@kontext/sdk';

// Initialize with your API key (optional for open-source features)
const ctx = new Kontext({
  apiKey: process.env.KONTEXT_KEY, // only needed for Pro/Enterprise
  chain: 'base',                   // default chain
});

// Verify an agent action
const result = await ctx.verify({
  action: 'transfer',
  amount: '100.00',
  currency: 'USDC',
  from: '0x1234...abcd',
  to: '0x5678...efgh',
  agent: 'payment-agent-v2',
  metadata: {
    orderId: 'ord_123',
    reason: 'Vendor payment for API services',
  },
});

// Check the result
if (result.flagged) {
  console.warn('Action flagged:', result.flags);
  // Handle flagged action (e.g., require human approval)
} else {
  console.log('Trust score:', result.trustScore);
  // Proceed with the transaction
}`;

const actionLoggingCode = `import { Kontext } from '@kontext/sdk';

const ctx = new Kontext();

// Log any agent action -- not just transfers
await ctx.log({
  action: 'data_access',
  agent: 'research-agent',
  resource: 'customer_database',
  query: 'SELECT * FROM customers WHERE region = "US"',
  metadata: {
    purpose: 'quarterly_report',
    approved_by: 'admin@company.com',
  },
});

// Log a multi-step workflow
const workflow = ctx.workflow('invoice-processing');

await workflow.step('fetch_invoice', {
  source: 'email',
  invoiceId: 'inv_456',
});

await workflow.step('validate_amount', {
  amount: '2500.00',
  currency: 'USDC',
  threshold: '5000.00',
  passed: true,
});

await workflow.step('execute_payment', {
  txHash: '0xabc...def',
  chain: 'base',
  status: 'confirmed',
});

await workflow.complete();`;

const taskConfirmationCode = `import { Kontext } from '@kontext/sdk';

const ctx = new Kontext();

// Define a confirmation policy
ctx.setPolicy({
  requireConfirmation: {
    when: [
      { field: 'amount', operator: 'gt', value: '1000' },
      { field: 'action', operator: 'eq', value: 'withdrawal' },
      { field: 'trustScore', operator: 'lt', value: '0.5' },
    ],
    timeout: 300_000, // 5 minute timeout
    fallback: 'deny', // deny if no confirmation received
  },
});

// This will pause and wait for confirmation if triggered
const result = await ctx.verify({
  action: 'transfer',
  amount: '5000.00',
  currency: 'USDC',
  agent: 'payment-agent',
});

if (result.pendingConfirmation) {
  console.log('Awaiting human confirmation...');
  console.log('Confirmation URL:', result.confirmationUrl);
  // The result resolves when confirmed or times out
}`;

const auditExportCode = `import { Kontext } from '@kontext/sdk';

const ctx = new Kontext();

// Export audit trail for a date range
const audit = await ctx.export({
  from: '2025-01-01',
  to: '2025-01-31',
  format: 'json', // or 'csv', 'pdf'
  filters: {
    agents: ['payment-agent-v2'],
    actions: ['transfer', 'withdrawal'],
    flaggedOnly: false,
  },
});

// Write to file
await Bun.write('audit-jan-2025.json', JSON.stringify(audit, null, 2));

// Or stream directly
const stream = ctx.exportStream({
  from: '2025-01-01',
  to: '2025-01-31',
  format: 'csv',
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}`;

const trustScoringCode = `import { Kontext } from '@kontext/sdk';

const ctx = new Kontext({ apiKey: process.env.KONTEXT_KEY });

// Get trust score for an action
const result = await ctx.verify({
  action: 'transfer',
  amount: '500.00',
  currency: 'USDC',
  agent: 'payment-agent-v2',
});

console.log(result.trustScore);    // 0.94
console.log(result.trustFactors);
// {
//   agentHistory: 0.98,       -- agent's track record
//   amountNormality: 0.92,    -- how normal is this amount
//   velocityCheck: 0.95,      -- transaction frequency check
//   recipientTrust: 0.89,     -- recipient's trust score
//   contextMatch: 0.97,       -- does context match pattern
// }

// Query historical trust scores
const history = await ctx.trustHistory({
  agent: 'payment-agent-v2',
  period: '30d',
});

console.log(history.average);      // 0.96
console.log(history.trend);        // 'stable'
console.log(history.flagCount);    // 2`;

const anomalyDetectionCode = `import { Kontext } from '@kontext/sdk';

const ctx = new Kontext();

// Configure anomaly detection rules
ctx.setRules({
  velocity: {
    maxTransactions: 50,
    period: '1h',
    action: 'flag', // or 'block'
  },
  amount: {
    maxSingle: '10000',
    maxDaily: '50000',
    currency: 'USDC',
    action: 'flag',
  },
  behavioral: {
    detectUnusualTiming: true,
    detectNewRecipients: true,
    detectAmountSpikes: true,
    sensitivity: 'medium', // 'low' | 'medium' | 'high'
  },
});

// Actions are automatically checked against rules
const result = await ctx.verify({
  action: 'transfer',
  amount: '15000.00', // exceeds maxSingle
  currency: 'USDC',
  agent: 'payment-agent-v2',
});

console.log(result.flagged);  // true
console.log(result.flags);
// [
//   {
//     rule: 'amount.maxSingle',
//     message: 'Amount 15000.00 exceeds single transaction limit of 10000',
//     severity: 'high',
//   }
// ]`;

const usdcIntegrationCode = `import { Kontext } from '@kontext/sdk';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const ctx = new Kontext({ chain: 'base' });

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// Verify before sending a USDC transfer
async function sendUSDC(to: string, amount: string) {
  const result = await ctx.verify({
    action: 'transfer',
    amount,
    currency: 'USDC',
    to,
    agent: 'treasury-agent',
    chain: 'base',
  });

  if (result.flagged) {
    throw new Error(\`Transfer flagged: \${result.flags[0].message}\`);
  }

  // Proceed with the on-chain transfer
  // ... your viem/ethers transfer logic here

  // Log the completed transaction
  await ctx.log({
    action: 'transfer_complete',
    txHash: '0x...',
    amount,
    currency: 'USDC',
    trustScore: result.trustScore,
  });
}`;

const x402IntegrationCode = `import { Kontext } from '@kontext/sdk';

const ctx = new Kontext();

// Middleware for x402 payment verification
function kontextMiddleware(handler) {
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

const ucpIntegrationCode = `import { Kontext } from '@kontext/sdk';

const ctx = new Kontext();

// Google UCP / A2A agent verification
async function handleAgentTransaction(ucpPayload) {
  const result = await ctx.verify({
    action: 'ucp_transaction',
    amount: ucpPayload.amount,
    currency: ucpPayload.currency,
    agent: ucpPayload.agentId,
    metadata: {
      ucpSessionId: ucpPayload.sessionId,
      merchantId: ucpPayload.merchantId,
      items: ucpPayload.lineItems,
    },
  });

  return {
    approved: !result.flagged,
    trustScore: result.trustScore,
    auditId: result.auditId,
  };
}`;

const stripeIntegrationCode = `import { Kontext } from '@kontext/sdk';
import Stripe from 'stripe';

const ctx = new Kontext();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Verify agent commerce transactions via Stripe
async function handleAgentPayment(agentId: string, amount: number) {
  // Verify with Kontext before creating payment intent
  const result = await ctx.verify({
    action: 'stripe_payment',
    amount: String(amount / 100), // cents to dollars
    currency: 'USD',
    agent: agentId,
    metadata: {
      provider: 'stripe',
      type: 'payment_intent',
    },
  });

  if (result.flagged) {
    throw new Error('Payment flagged for compliance review');
  }

  // Create the Stripe payment intent
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

const sidebarSections = [
  {
    title: "Getting Started",
    items: [
      { id: "installation", label: "Installation" },
      { id: "quickstart", label: "Quick Start" },
    ],
  },
  {
    title: "Core Features",
    items: [
      { id: "action-logging", label: "Action Logging" },
      { id: "task-confirmation", label: "Task Confirmation" },
      { id: "audit-export", label: "Audit Export" },
      { id: "trust-scoring", label: "Trust Scoring" },
      { id: "anomaly-detection", label: "Anomaly Detection" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { id: "usdc", label: "USDC on Base" },
      { id: "x402", label: "x402 Protocol" },
      { id: "ucp", label: "Google UCP/A2A" },
      { id: "stripe", label: "Stripe Agentic" },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "api", label: "API Reference" },
      { id: "configuration", label: "Configuration" },
      { id: "types", label: "TypeScript Types" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Mobile section nav */}
      <div className="sticky top-16 z-40 -mx-4 overflow-x-auto border-b border-border/40 bg-background/95 backdrop-blur-sm px-4 py-3 lg:hidden sm:-mx-6 sm:px-6">
        <div className="flex gap-2 min-w-max">
          {sidebarSections.flatMap((section) =>
            section.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex shrink-0 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
              >
                {item.label}
              </a>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 py-10">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-6">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold text-foreground">
                  {section.title}
                </h4>
                <ul className="mt-2 space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="prose-kontext max-w-3xl">
            {/* Header */}
            <div className="mb-12">
              <Badge variant="secondary" className="mb-4">
                Documentation
              </Badge>
              <h1>Kontext SDK Documentation</h1>
              <p>
                Kontext is a TypeScript SDK that provides trust and compliance
                infrastructure for agentic workflows involving stablecoin
                transactions. This guide covers everything from installation to
                advanced integrations.
              </p>
            </div>

            {/* Quick links */}
            <div className="mb-12 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Zap,
                  title: "Quick Start",
                  description: "Get up and running in 2 minutes",
                  href: "#quickstart",
                },
                {
                  icon: Code2,
                  title: "API Reference",
                  description: "Full API documentation",
                  href: "#api",
                },
                {
                  icon: Shield,
                  title: "Integrations",
                  description: "USDC, x402, UCP, Stripe guides",
                  href: "#usdc",
                },
                {
                  icon: BookOpen,
                  title: "Examples",
                  description: "Real-world code examples",
                  href: "https://github.com/vinay-lgtm-code/kontext_verify",
                },
              ].map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className="group flex items-start gap-3 rounded-lg border border-border/50 p-4 no-underline transition-colors hover:border-primary/30 hover:bg-card"
                >
                  <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                    <link.icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                      {link.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {link.description}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <Separator className="my-12" />

            {/* Installation */}
            <section id="installation">
              <h2>Installation</h2>
              <p>
                Install the Kontext SDK using your preferred package manager.
              </p>
              <CodeBlock
                code={installCode}
                language="bash"
                filename="Terminal"
              />
              <p className="mt-4">
                Or with yarn / pnpm:
              </p>
              <CodeBlock
                code={`yarn add @kontext/sdk\n# or\npnpm add @kontext/sdk`}
                language="bash"
                filename="Terminal"
              />
              <p>
                <strong>Requirements:</strong> Node.js 18+ and TypeScript 5.0+.
                The SDK has zero runtime dependencies.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Quick Start */}
            <section id="quickstart">
              <h2>Quick Start</h2>
              <p>
                Get compliance working in your agent in under 2 minutes. Here is
                a complete example that initializes the SDK, verifies a
                transaction, and checks the result.
              </p>
              <CodeBlock
                code={quickStartCode}
                language="typescript"
                filename="agent.ts"
              />
              <p>
                The <code>verify()</code> method is the core of Kontext. It
                logs the action, runs anomaly detection, computes a trust score,
                and returns a result object you can use to make decisions.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Action Logging */}
            <section id="action-logging">
              <h2>Action Logging</h2>
              <p>
                Every action your agents take should be logged for auditability.
                Kontext provides both simple logging and structured workflow
                logging for multi-step operations.
              </p>
              <CodeBlock
                code={actionLoggingCode}
                language="typescript"
                filename="logging.ts"
              />
              <p>
                Workflow logging groups related actions together, making it easy
                to trace the full lifecycle of a multi-step agent operation.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Task Confirmation */}
            <section id="task-confirmation">
              <h2>Task Confirmation</h2>
              <p>
                For high-value or sensitive actions, you can require human-in-the-loop
                confirmation before the action proceeds. Define policies
                declaratively and Kontext handles the confirmation flow.
              </p>
              <CodeBlock
                code={taskConfirmationCode}
                language="typescript"
                filename="confirmation.ts"
              />
              <p>
                Confirmation policies are evaluated before every{" "}
                <code>verify()</code> call. When triggered, the call pauses until
                a human confirms or denies the action via the dashboard or API.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Audit Export */}
            <section id="audit-export">
              <h2>Audit Export</h2>
              <p>
                Export your complete audit trail in JSON, CSV, or PDF format.
                Filter by date range, agent, action type, or flagged status.
                Streaming export is available for large datasets.
              </p>
              <CodeBlock
                code={auditExportCode}
                language="typescript"
                filename="export.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Trust Scoring */}
            <section id="trust-scoring">
              <h2>Trust Scoring</h2>
              <p>
                Every verified action receives a trust score between 0 and 1.
                The score is computed from multiple factors including agent
                history, amount normality, transaction velocity, and recipient
                trust. <strong>Pro feature</strong> for historical analysis and
                trend tracking.
              </p>
              <CodeBlock
                code={trustScoringCode}
                language="typescript"
                filename="trust.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Anomaly Detection */}
            <section id="anomaly-detection">
              <h2>Anomaly Detection</h2>
              <p>
                Configure rules to automatically flag or block suspicious agent
                behavior. Built-in checks include velocity limits, amount
                thresholds, and behavioral analysis. Pro plans include
                ML-powered detection.
              </p>
              <CodeBlock
                code={anomalyDetectionCode}
                language="typescript"
                filename="anomaly.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* USDC Integration */}
            <section id="usdc">
              <h2>USDC on Base Integration</h2>
              <p>
                Integrate Kontext with USDC transfers on Base (or any EVM
                chain). Verify transactions before sending and log the result
                after confirmation.
              </p>
              <CodeBlock
                code={usdcIntegrationCode}
                language="typescript"
                filename="usdc-base.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* x402 Integration */}
            <section id="x402">
              <h2>x402 Protocol Integration</h2>
              <p>
                Add Kontext verification to x402 HTTP-native payment flows.
                Use as middleware to verify payments before processing requests.
              </p>
              <CodeBlock
                code={x402IntegrationCode}
                language="typescript"
                filename="x402-middleware.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* UCP Integration */}
            <section id="ucp">
              <h2>Google UCP / A2A Integration</h2>
              <p>
                Verify agent-to-agent transactions using Google&apos;s Universal
                Checkout Protocol. Kontext wraps each UCP transaction with
                trust scoring and audit logging.
              </p>
              <CodeBlock
                code={ucpIntegrationCode}
                language="typescript"
                filename="ucp-integration.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Stripe Integration */}
            <section id="stripe">
              <h2>Stripe Agentic Commerce</h2>
              <p>
                Pair Kontext with Stripe to verify agent-initiated payments.
                The audit ID is attached to the Stripe payment intent metadata
                for full traceability.
              </p>
              <CodeBlock
                code={stripeIntegrationCode}
                language="typescript"
                filename="stripe-integration.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* API Reference */}
            <section id="api">
              <h2>API Reference</h2>
              <p>
                Complete reference for all Kontext SDK methods and types.
              </p>

              <h3>Kontext Constructor</h3>
              <CodeBlock
                code={`const ctx = new Kontext(options?: KontextOptions);

interface KontextOptions {
  apiKey?: string;      // API key for Pro/Enterprise features
  chain?: string;       // Default chain ('base' | 'ethereum' | 'polygon')
  environment?: string; // 'production' | 'staging' | 'development'
  baseUrl?: string;     // Custom API base URL (self-hosted)
}`}
                language="typescript"
                filename="types.ts"
              />

              <h3>ctx.verify(action)</h3>
              <p>
                Verifies an agent action against configured rules, computes a
                trust score, and returns the result.
              </p>
              <CodeBlock
                code={`interface VerifyAction {
  action: string;           // Action type identifier
  amount?: string;          // Transaction amount
  currency?: string;        // Currency code (e.g., 'USDC')
  chain?: string;           // Blockchain chain
  from?: string;            // Source address
  to?: string;              // Destination address
  agent: string;            // Agent identifier
  metadata?: Record<string, unknown>; // Additional context
}

interface VerifyResult {
  auditId: string;          // Unique audit trail ID
  trustScore: number;       // 0-1 trust score
  flagged: boolean;         // Whether any rules triggered
  flags: Flag[];            // Array of triggered flags
  trustFactors: TrustFactors; // Breakdown of trust score
  pendingConfirmation?: boolean;
  confirmationUrl?: string;
  timestamp: string;        // ISO 8601 timestamp
}`}
                language="typescript"
                filename="types.ts"
              />

              <h3>ctx.log(entry)</h3>
              <p>Logs an action without verification. Useful for non-financial events.</p>

              <h3>ctx.export(options)</h3>
              <p>Exports the audit trail for a given date range and filter set.</p>

              <h3>ctx.setPolicy(policy)</h3>
              <p>Configures task confirmation policies.</p>

              <h3>ctx.setRules(rules)</h3>
              <p>Configures anomaly detection rules.</p>

              <h3>ctx.trustHistory(query)</h3>
              <p>Queries historical trust scores for an agent. <strong>Pro feature.</strong></p>

              <h3>ctx.workflow(name)</h3>
              <p>Creates a workflow context for multi-step action logging.</p>
            </section>

            <Separator className="my-12" />

            {/* Configuration */}
            <section id="configuration">
              <h2>Configuration</h2>
              <p>
                Kontext can be configured via the constructor, environment
                variables, or a <code>kontext.config.ts</code> file in your
                project root.
              </p>
              <CodeBlock
                code={`// kontext.config.ts
import { defineConfig } from '@kontext/sdk';

export default defineConfig({
  chain: 'base',
  environment: 'production',
  rules: {
    velocity: {
      maxTransactions: 100,
      period: '1h',
      action: 'flag',
    },
    amount: {
      maxSingle: '10000',
      maxDaily: '100000',
      currency: 'USDC',
      action: 'flag',
    },
  },
  confirmation: {
    when: [
      { field: 'amount', operator: 'gt', value: '5000' },
    ],
    timeout: 300_000,
    fallback: 'deny',
  },
});`}
                language="typescript"
                filename="kontext.config.ts"
              />

              <h3>Environment Variables</h3>
              <CodeBlock
                code={`KONTEXT_API_KEY=sk_live_...     # Pro/Enterprise API key
KONTEXT_CHAIN=base              # Default chain
KONTEXT_ENVIRONMENT=production  # Environment`}
                language="bash"
                filename=".env"
              />
            </section>

            <Separator className="my-12" />

            {/* Types */}
            <section id="types">
              <h2>TypeScript Types</h2>
              <p>
                All types are exported from the main package and available for
                your IDE&apos;s autocomplete.
              </p>
              <CodeBlock
                code={`import type {
  KontextOptions,
  VerifyAction,
  VerifyResult,
  LogEntry,
  ExportOptions,
  AuditTrail,
  Flag,
  TrustFactors,
  TrustHistory,
  Policy,
  Rules,
  WorkflowContext,
} from '@kontext/sdk';`}
                language="typescript"
                filename="types.ts"
              />
            </section>

            {/* Next steps */}
            <div className="mt-16 rounded-xl border border-primary/20 bg-primary/5 p-8">
              <h3 className="text-lg font-semibold">Need help?</h3>
              <p className="mt-2 text-muted-foreground">
                If you run into issues or have questions, reach out through any
                of these channels:
              </p>
              <ul className="mt-4">
                <li>
                  <a
                    href="https://github.com/vinay-lgtm-code/kontext_verify"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Issues & Discussions
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@kontext.dev">hello@kontext.dev</a>
                </li>
                <li>
                  <a
                    href="https://x.com/kontextverify"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @kontextverify on X
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
