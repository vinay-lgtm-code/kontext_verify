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
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ExternalLink,
  Cpu,
  DollarSign,
  Zap,
  Terminal,
  Wrench,
  LayoutDashboard,
  Bell,
  Globe,
  Wallet,
  CircleDollarSign,
  Landmark,
  Banknote,
  Send,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Integrate Kontext with EVM chains, Solana, Circle, x402, Bridge.xyz, and Modern Treasury. 6 provider adapters normalize payment events into the 8-stage lifecycle.",
};

const evmAdapterCode = `import { EVMAdapter } from 'kontext-sdk/adapters';

const evm = new EVMAdapter({
  chains: ['ethereum', 'base', 'polygon'],
  rpcUrls: {
    ethereum: process.env.ETH_RPC_URL,
    base: process.env.BASE_RPC_URL,
    polygon: process.env.POLYGON_RPC_URL,
  },
});

// Normalize an on-chain transaction into the 8-stage lifecycle
const event = await evm.normalizeEvent({
  txHash: '0xabc123...',
  chain: 'base',
});

// event.stage => 'initiated' | 'authorized' | 'confirmed' | ...
// event.amount => '5000.00'
// event.token => 'USDC'
// event.from => '0xsender...'
// event.to => '0xrecipient...'

await workspace.ingestEvent(event);`;

const solanaAdapterCode = `import { SolanaAdapter } from 'kontext-sdk/adapters';

const solana = new SolanaAdapter({
  rpcUrl: process.env.SOLANA_RPC_URL,
  programIds: ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'],
});

// Normalize a Solana transaction signature
const event = await solana.normalizeEvent({
  signature: '5UfD8s...',
});

// event.stage => 'confirmed'
// event.chain => 'solana'
// event.amount => '1500.00'
// event.token => 'USDC'

await workspace.ingestEvent(event);`;

const circleAdapterCode = `import { CircleAdapter } from 'kontext-sdk/adapters';

const circle = new CircleAdapter({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

// Normalize Circle Programmable Wallet events
const event = await circle.normalizeEvent({
  walletId: 'wlt_abc123',
  transferId: 'txn_def456',
});

// event.stage => 'authorized'
// event.provider => 'circle'
// event.metadata.walletSetId => 'ws_789'

await workspace.ingestEvent(event);`;

const x402AdapterCode = `import { X402Adapter } from 'kontext-sdk/adapters';

const x402 = new X402Adapter({
  chain: 'base',
  receiverAddress: '0xmerchant...',
});

// Normalize x402 micropayment events
const event = x402.normalizeEvent({
  paymentHeader: req.headers['x-payment'],
  amount: '0.05',
  token: 'USDC',
  resource: '/api/premium-data',
});

// event.stage => 'settled'
// event.provider => 'x402'
// event.metadata.resource => '/api/premium-data'

await workspace.ingestEvent(event);`;

const bridgeAdapterCode = `import { BridgeAdapter } from 'kontext-sdk/adapters';

const bridge = new BridgeAdapter({
  apiKey: process.env.BRIDGE_API_KEY,
});

// Normalize Bridge.xyz (Stripe) transfer events
const event = await bridge.normalizeEvent({
  transferId: 'brd_transfer_abc',
  webhookPayload: req.body,
});

// event.stage => 'initiated'
// event.provider => 'bridge'
// event.amount => '25000.00'
// event.metadata.stripePaymentIntent => 'pi_xyz'

await workspace.ingestEvent(event);`;

const modernTreasuryAdapterCode = `import { ModernTreasuryAdapter } from 'kontext-sdk/adapters';

const mt = new ModernTreasuryAdapter({
  apiKey: process.env.MT_API_KEY,
  orgId: process.env.MT_ORG_ID,
});

// Normalize Modern Treasury payment order events
const event = await mt.normalizeEvent({
  paymentOrderId: 'po_abc123',
  webhookPayload: req.body,
});

// event.stage => 'authorized'
// event.provider => 'modern_treasury'
// event.amount => '50000.00'
// event.metadata.ledgerTransactionId => 'lt_def456'

await workspace.ingestEvent(event);`;

const providerAdapters = [
  {
    id: "evm-adapter",
    icon: Globe,
    title: "EVMAdapter",
    description:
      "Normalizes Ethereum, Base, and Polygon transactions into the canonical 8-stage lifecycle. Accepts a transaction hash and chain identifier, fetches on-chain data via RPC, and produces a standardized payment event with amount, token, addresses, and stage classification.",
    code: evmAdapterCode,
    filename: "evm-adapter.ts",
    status: "Provider Adapter",
    docsLink: "/docs",
  },
  {
    id: "solana-adapter",
    icon: Zap,
    title: "SolanaAdapter",
    description:
      "Normalizes Solana transaction signatures into the 8-stage lifecycle. Parses SPL token transfers, extracts amount and mint address, and maps Solana finality levels to lifecycle stages. Supports token program filtering.",
    code: solanaAdapterCode,
    filename: "solana-adapter.ts",
    status: "Provider Adapter",
    docsLink: "/docs",
  },
  {
    id: "circle-adapter",
    icon: CircleDollarSign,
    title: "CircleAdapter",
    description:
      "Normalizes Circle Programmable Wallet events into the 8-stage lifecycle. Maps wallet transfer statuses to lifecycle stages, preserves wallet set and entity metadata, and handles both on-chain and off-chain Circle transfers.",
    code: circleAdapterCode,
    filename: "circle-adapter.ts",
    status: "Provider Adapter",
    docsLink: "/docs",
  },
  {
    id: "x402-adapter",
    icon: DollarSign,
    title: "X402Adapter",
    description:
      "Normalizes x402 HTTP-native micropayment events into the 8-stage lifecycle. Parses the x-payment header, extracts amount and token, and maps single-request payment flows to the settled stage with resource metadata.",
    code: x402AdapterCode,
    filename: "x402-adapter.ts",
    status: "Provider Adapter",
    docsLink: "/docs",
  },
  {
    id: "bridge-adapter",
    icon: Wallet,
    title: "BridgeAdapter",
    description:
      "Normalizes Bridge.xyz (Stripe acquisition) transfer events into the 8-stage lifecycle. Handles fiat-to-crypto and crypto-to-fiat flows, maps Bridge transfer statuses to lifecycle stages, and preserves Stripe payment intent references.",
    code: bridgeAdapterCode,
    filename: "bridge-adapter.ts",
    status: "Provider Adapter",
    docsLink: "/docs",
  },
  {
    id: "modern-treasury-adapter",
    icon: Landmark,
    title: "ModernTreasuryAdapter",
    description:
      "Normalizes Modern Treasury payment order events into the 8-stage lifecycle. Maps payment order statuses to lifecycle stages, preserves ledger transaction references, and supports ACH, wire, and RTP payment types.",
    code: modernTreasuryAdapterCode,
    filename: "modern-treasury-adapter.ts",
    status: "Provider Adapter",
    docsLink: "/docs",
  },
];

const paymentPresets = [
  {
    icon: Zap,
    title: "Micropayments",
    archetype: "micropayments",
    description:
      "Optimized for high-frequency, low-value payments like x402 per-request billing. Max amount $1.00. Minimal approval overhead, fast settlement, automatic batching for audit trails.",
    maxAmount: "$1.00",
    status: "Preset",
  },
  {
    icon: Banknote,
    title: "Treasury",
    archetype: "treasury",
    description:
      "Configured for corporate treasury operations and large stablecoin movements. Max amount $1,000,000. Multi-signature approval, enhanced due diligence triggers, CTR auto-generation above $10K.",
    maxAmount: "$1,000,000",
    status: "Preset",
  },
  {
    icon: DollarSign,
    title: "Invoicing",
    archetype: "invoicing",
    description:
      "Tuned for B2B invoice settlement and accounts receivable. Max amount $100,000. Invoice reference tracking, payment matching, and reconciliation-ready audit exports.",
    maxAmount: "$100,000",
    status: "Preset",
  },
  {
    icon: Send,
    title: "Payroll",
    archetype: "payroll",
    description:
      "Built for recurring payroll disbursements and contractor payments. Max amount $50,000. Batch payment support, recipient verification, and tax reporting metadata.",
    maxAmount: "$50,000",
    status: "Preset",
  },
  {
    icon: Globe,
    title: "Cross-Border",
    archetype: "cross_border",
    description:
      "Designed for international transfers across chains and fiat rails. Max amount $500,000. Travel Rule compliance at $3K, OFAC screening, multi-chain lifecycle tracking.",
    maxAmount: "$500,000",
    status: "Preset",
  },
];

export default function IntegrationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              INTEGRATIONS
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              6 provider adapters normalize payment events from any source into
              the canonical 8-stage lifecycle. Every example uses the actual
              adapter API.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/use-cases">
                  View Use Cases
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
            <a
              href="#provider-adapters"
              className="inline-flex shrink-0 border border-border bg-[var(--term-surface-2)] px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-[var(--term-surface-2)]"
            >
              Provider Adapters
            </a>
            <a
              href="#payment-presets"
              className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
            >
              Payment Presets
            </a>
            <a
              href="#operations"
              className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
            >
              Operations
            </a>
            <a
              href="#cli-devops"
              className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
            >
              CLI &amp; DevOps
            </a>
          </div>
        </div>
      </section>

      {/* Provider Adapters */}
      <section id="provider-adapters" className="scroll-mt-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Provider Adapters
            </Badge>
            <h2 className="text-sm font-medium">
              Normalize any payment source into the 8-stage lifecycle
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              6 adapters convert raw payment events from EVM chains, Solana,
              Circle, x402, Bridge.xyz, and Modern Treasury into canonical
              lifecycle events. Each adapter implements normalizeEvent() with
              provider-specific parsing.
            </p>
          </div>

          <div className="space-y-16">
            {providerAdapters.map((adapter, index) => (
              <div key={adapter.id} id={adapter.id} className="scroll-mt-32">
                <div
                  className={`grid items-start gap-8 lg:gap-12 ${
                    index % 2 === 0
                      ? "lg:grid-cols-2"
                      : "lg:grid-cols-2 lg:[direction:rtl]"
                  }`}
                >
                  {/* Info */}
                  <div className={index % 2 !== 0 ? "lg:[direction:ltr]" : ""}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                        <adapter.icon size={20} />
                      </div>
                      <Badge variant="outline">
                        {adapter.status}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {adapter.title}
                    </h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {adapter.description}
                    </p>
                    <div className="mt-6">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href={adapter.docsLink}>
                          View docs
                          <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Code */}
                  <div className={`border border-border ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
                    <CodeBlock
                      code={adapter.code}
                      language="typescript"
                      filename={adapter.filename}
                    />
                  </div>
                </div>

                {index < providerAdapters.length - 1 && (
                  <Separator className="mt-16" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Presets */}
      <section
        id="payment-presets"
        className="scroll-mt-32 border-t border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Payment Presets
            </Badge>
            <h2 className="text-sm font-medium">
              Workspace profiles for every payment archetype
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Pre-configured workspace profiles with tuned thresholds, approval
              rules, and compliance policies. Select an archetype at workspace
              creation or customize your own.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paymentPresets.map((preset) => (
              <Card
                key={preset.title}
                className="group relative overflow-hidden transition-all "
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                      <preset.icon size={20} />
                    </div>
                    <Badge variant="outline">
                      {preset.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {preset.title}
                  </CardTitle>
                  <div className="mt-1">
                    <span className="inline-block font-mono text-xs text-[var(--term-green)]">
                      archetype: {preset.archetype}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {preset.description}
                  </CardDescription>
                  <div className="mt-4 overflow-hidden border border-border bg-muted/50 p-3 font-mono text-xs">
                    <span className="text-muted-foreground">max_amount:</span>{" "}
                    <span className="text-primary">{preset.maxAmount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Operations */}
      <section
        id="operations"
        className="scroll-mt-32 border-t border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Operations
            </Badge>
            <h2 className="text-sm font-medium">
              Observe and respond to payment lifecycle events
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Real-time dashboards and configurable notifications keep your ops
              team informed as payments move through the 8-stage lifecycle.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="group relative overflow-hidden transition-all ">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                    <LayoutDashboard size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">Ops Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  Real-time view of all payment traces across workspaces.
                  Filter by stage, provider, amount, or risk level. See traces
                  transition through the 8-stage lifecycle with latency metrics
                  and failure rates. CSV export for compliance reporting.
                </CardDescription>
                <div className="mt-4 overflow-hidden border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-muted-foreground">stages:</span> initiated {"->"} authorized {"->"} confirmed {"->"} settled<br/>
                  <span className="text-muted-foreground">filters:</span> provider, amount, risk, workspace
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden transition-all ">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                    <Bell size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">
                  Slack &amp; Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  Configurable alerts for payment lifecycle events. Get notified
                  on Slack or email when a trace enters a specific stage, exceeds
                  an amount threshold, triggers a compliance flag, or fails at
                  any point in the lifecycle. Per-workspace notification rules.
                </CardDescription>
                <div className="mt-4 overflow-hidden border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-muted-foreground">channels:</span> slack, email, webhook<br/>
                  <span className="text-muted-foreground">triggers:</span> stage_change, threshold, anomaly, failure
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CLI & DevOps */}
      <section
        id="cli-devops"
        className="scroll-mt-32 border-t border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              CLI &amp; DevOps
            </Badge>
            <h2 className="text-sm font-medium">
              Terminal-first payment operations
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Manage payment traces, inspect lifecycle stages, and debug issues
              from the command line or integrate with AI coding assistants via
              the MCP server.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="group relative overflow-hidden transition-all ">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                    <Terminal size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">Kontext CLI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  Payment lifecycle commands for trace management: start a trace,
                  authorize and confirm stages, tail live logs, and debug
                  failed transitions. Install globally or run via npx.
                </CardDescription>
                <div className="mt-4 overflow-hidden border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-primary">$</span> npm install -g @kontext-sdk/cli<br/>
                  <span className="text-primary">$</span> kontext trace start --provider evm --chain base<br/>
                  <span className="text-primary">$</span> kontext trace authorize --trace-id tr_abc123<br/>
                  <span className="text-primary">$</span> kontext trace confirm --trace-id tr_abc123<br/>
                  <span className="text-primary">$</span> kontext logs --workspace ws_prod --tail<br/>
                  <span className="text-primary">$</span> kontext debug --trace-id tr_abc123
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden transition-all ">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                    <Wrench size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">MCP Server</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  Payment lifecycle tools exposed via Model Context Protocol for
                  Claude Code, Cursor, and Windsurf. AI coding assistants get
                  trace inspection, stage transitions, and lifecycle debugging
                  as native tools.
                </CardDescription>
                <div className="mt-4 overflow-hidden border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-primary">$</span> kontext mcp
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Provider Agnostic Note */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="border border-border bg-[var(--term-surface)] p-8 sm:p-12">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Cpu size={20} className="text-primary" />
                <h3 className="text-lg font-semibold">
                  Provider Agnostic
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Kontext is a standalone TypeScript SDK with zero provider
                dependencies. The adapters above normalize provider-specific
                events into the canonical 8-stage lifecycle — you can also
                use <code className="bg-muted px-1.5 py-0.5 font-mono text-sm border border-border">workspace.ingestEvent()</code> directly
                with any custom payment source or build your own adapter
                implementing the <code className="bg-muted px-1.5 py-0.5 font-mono text-sm border border-border">ProviderAdapter</code> interface.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="sm" className="gap-2" asChild>
                  <Link href="/docs">
                    Read the Docs
                    <ArrowRight size={14} />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a
                    href="https://github.com/Legaci-Labs/kontext"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    View Examples on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-sm font-medium">
              Ready to integrate?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Normalize payment events from any provider into the 8-stage
              lifecycle. Open source, TypeScript-first, and ready for
              production.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
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
              <Button variant="outline" size="lg" asChild>
                <Link href="/docs">Read the Docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
