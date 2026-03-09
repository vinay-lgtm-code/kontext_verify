import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/code-block";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Zap, Code2, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation — Payment Control Plane",
  description:
    "Kontext Payment Control Plane documentation. 8-stage payment lifecycle, policy engine, provider adapters, workspace profiles, and ops dashboard for autonomous payment agents.",
};

const installCode = `npm install kontext-sdk`;

const quickStartCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-app',
  environment: 'development',
});

const attempt = await ctx.start({
  workspaceRef: 'my-workspace',
  appRef: 'payment-agent',
  archetype: 'treasury',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xSender' },
  recipientRefs: { wallet: '0xRecipient' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base', token: 'USDC', amount: '5000',
  from: '0xSender', to: '0xRecipient',
  actorId: 'payment-agent',
  metadata: { paymentType: 'treasury', purpose: 'vendor-payment' },
});

if (receipt.allowed) {
  await ctx.broadcast(attempt.attemptId, '0xTxHash...', 'base');
  await ctx.confirm(attempt.attemptId, { txHash: '0xTxHash...', blockNumber: 12345 });
}`;

const lifecycleStagesCode = `// The 8 stages every payment flows through:
//
// 1. START       — Declare intent (amount, currency, sender, recipient)
// 2. AUTHORIZE   — Run policy engine (OFAC, limits, blocklists, metadata)
// 3. PREPARE     — Lock funds or record pre-execution state
// 4. TRANSMIT    — Broadcast the on-chain transaction
// 5. CONFIRM     — Wait for block confirmation
// 6. CREDIT      — Mark recipient as credited
// 7. FAIL        — Terminal failure at any stage
// 8. REFUND      — Reverse a previously confirmed payment
//
// Each stage emits a StageEvent into the digest chain.
// Transitions are enforced — you cannot skip stages.

import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// Full lifecycle flow:
const attempt = await ctx.start({ /* ... */ });
const { receipt } = await ctx.authorize(attempt.attemptId, { /* ... */ });

if (receipt.allowed) {
  await ctx.record(attempt.attemptId, 'prepare', { lockedAmount: '5000' });
  await ctx.broadcast(attempt.attemptId, '0xTxHash...', 'base');
  await ctx.confirm(attempt.attemptId, { txHash: '0xTxHash...', blockNumber: 12345 });
  await ctx.credit(attempt.attemptId, { creditedAt: new Date().toISOString() });
}`;

const startCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// start() declares payment intent and creates an attempt
const attempt = await ctx.start({
  workspaceRef: 'acme-corp',            // Workspace identifier
  appRef: 'treasury-agent',             // Application or agent reference
  archetype: 'treasury',                // Payment preset to apply
  intentCurrency: 'USD',                // What the sender thinks in
  settlementAsset: 'USDC',              // What actually moves on-chain
  chain: 'base',                        // Target chain
  senderRefs: {
    wallet: '0xSenderWallet',
    label: 'treasury-hot-wallet',
  },
  recipientRefs: {
    wallet: '0xRecipientWallet',
    label: 'vendor-acme',
  },
  executionSurface: 'sdk',              // 'sdk' | 'api' | 'dashboard'
  metadata: {
    invoiceId: 'INV-2026-0042',
    department: 'engineering',
  },
});

// attempt.attemptId — unique identifier for this payment
// attempt.stage — 'start'
// attempt.createdAt — ISO timestamp`;

const authorizeCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// authorize() runs every configured policy rule
const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '25000',
  from: '0xSender',
  to: '0xRecipient',
  actorId: 'treasury-agent-v2',
  metadata: {
    paymentType: 'treasury',
    purpose: 'vendor-payment',
  },
});

// receipt.allowed — true if all rules passed
// receipt.rules — array of individual rule results:
// [
//   { rule: 'ofac-sdn', passed: true, detail: 'No match' },
//   { rule: 'amount-limit', passed: true, detail: 'Under $25K treasury limit' },
//   { rule: 'blocklist', passed: true, detail: 'Not on blocklist' },
//   { rule: 'metadata-required', passed: true, detail: 'All fields present' },
// ]
// receipt.riskLevel — 'low' | 'medium' | 'high' | 'critical'

if (!receipt.allowed) {
  const failed = receipt.rules.filter(r => !r.passed);
  console.warn('Blocked by:', failed.map(r => r.rule));
  await ctx.fail(attempt.attemptId, { reason: failed[0].detail });
}`;

const recordCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// record() logs a state change (prepare or reconcile)
// Use 'prepare' before execution, 'reconcile' after settlement

// Pre-execution: record that funds are locked or ready
await ctx.record(attempt.attemptId, 'prepare', {
  lockedAmount: '5000',
  lockedAt: new Date().toISOString(),
  lockTxHash: '0xLockTx...',
});

// Post-settlement: record reconciliation data
await ctx.record(attempt.attemptId, 'reconcile', {
  settledAmount: '5000',
  settledAt: new Date().toISOString(),
  feesPaid: '0.50',
  exchangeRate: '1.0001',
});`;

const broadcastCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// broadcast() records that the transaction was submitted on-chain
await ctx.broadcast(attempt.attemptId, '0xTxHash...', 'base');

// Parameters:
//   attemptId — the payment attempt
//   txHash    — on-chain transaction hash
//   chain     — which chain was used ('base', 'ethereum', etc.)`;

const confirmCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// confirm() records block confirmation
await ctx.confirm(attempt.attemptId, {
  txHash: '0xTxHash...',
  blockNumber: 12345,
  blockHash: '0xBlockHash...',       // optional
  gasUsed: '21000',                  // optional
  effectiveGasPrice: '1000000000',   // optional
  confirmedAt: new Date().toISOString(),
});`;

const creditCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// credit() marks that the recipient has been credited
await ctx.credit(attempt.attemptId, {
  creditedAt: new Date().toISOString(),
  creditRef: 'credit-ref-123',        // optional external reference
  recipientNotified: true,             // optional
});

// After credit(), the payment is in its terminal success state.`;

const failRefundCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// fail() — terminal failure at any stage
await ctx.fail(attempt.attemptId, {
  reason: 'OFAC sanctions match on recipient address',
  failedAt: new Date().toISOString(),
  code: 'POLICY_VIOLATION',
  recoverable: false,
});

// refund() — reverse a previously confirmed payment
await ctx.refund(attempt.attemptId, {
  refundTxHash: '0xRefundTx...',
  chain: 'base',
  amount: '5000',
  reason: 'Duplicate payment detected',
  refundedAt: new Date().toISOString(),
});

// Both fail() and refund() are terminal — no further transitions allowed.`;

const policyEngineCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// Policy rules are evaluated automatically during authorize().
// Configure rules via workspace profiles:

ctx.configure({
  workspaceRef: 'acme-corp',
  policies: {
    // OFAC sanctions screening (built-in SDN list, no API key needed)
    ofac: { enabled: true },

    // Amount limits per archetype
    amountLimits: {
      treasury: { maxPerTx: '25000', dailyLimit: '100000' },
      micropayments: { maxPerTx: '100', dailyLimit: '1000' },
    },

    // Blocklist / allowlist
    blocklist: {
      addresses: ['0xBlocked1...', '0xBlocked2...'],
      mode: 'deny',  // 'deny' | 'allow-only'
    },

    // Required metadata fields per archetype
    metadataRequirements: {
      treasury: ['purpose', 'approvedBy'],
      invoicing: ['invoiceId', 'vendorName'],
    },
  },
});`;

const sanctionsCode = `import { Kontext, UsdcCompliance } from 'kontext-sdk';

// Option 1: Automatic screening during authorize()
// OFAC screening runs as part of the policy engine.
// No additional code needed — just enable in your profile.

// Option 2: Standalone screening
const result = UsdcCompliance.checkTransaction({
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xSender',
  to: '0xRecipient',
});
// result.compliant — true if no sanctions match
// result.checks — array of individual check results
// result.riskLevel — 'low' | 'medium' | 'high' | 'critical'

// Check a specific address
const sanctioned = UsdcCompliance.isSanctioned('0xAddress...');

// Comprehensive OFAC screening with detailed results
const detailed = UsdcCompliance.screenComprehensive('0xAddress...');`;

const amountLimitsCode = `// Amount limits are configured per archetype in workspace profiles.
// The policy engine checks limits during authorize().

ctx.configure({
  workspaceRef: 'acme-corp',
  policies: {
    amountLimits: {
      // Per-archetype limits
      treasury:      { maxPerTx: '25000', dailyLimit: '100000' },
      micropayments: { maxPerTx: '100',   dailyLimit: '1000' },
      invoicing:     { maxPerTx: '20000', dailyLimit: '50000' },
      payroll:       { maxPerTx: '15000', dailyLimit: '75000' },
      cross_border:  { maxPerTx: '10000', dailyLimit: '30000' },
    },
  },
});

// Built-in regulatory thresholds (always active):
//   $3,000  — Travel Rule / EDD threshold
//   $10,000 — CTR (Currency Transaction Report) threshold
//   $50,000 — Large Transaction threshold`;

const blocklistCode = `// Blocklist mode: deny specific addresses
ctx.configure({
  workspaceRef: 'acme-corp',
  policies: {
    blocklist: {
      addresses: [
        '0xKnownBadActor1...',
        '0xKnownBadActor2...',
      ],
      mode: 'deny',  // Block these addresses, allow everything else
    },
  },
});

// Allowlist mode: only allow specific addresses
ctx.configure({
  workspaceRef: 'acme-corp',
  policies: {
    blocklist: {
      addresses: [
        '0xApprovedVendor1...',
        '0xApprovedVendor2...',
        '0xApprovedVendor3...',
      ],
      mode: 'allow-only',  // Only these addresses can receive payments
    },
  },
});`;

const metadataRequirementsCode = `// Require specific metadata fields per archetype.
// authorize() will reject payments missing required fields.

ctx.configure({
  workspaceRef: 'acme-corp',
  policies: {
    metadataRequirements: {
      treasury: ['purpose', 'approvedBy'],
      invoicing: ['invoiceId', 'vendorName', 'dueDate'],
      payroll: ['employeeId', 'payPeriod'],
      cross_border: ['corridorCode', 'beneficiaryCountry'],
    },
  },
});

// This authorize() call would fail — missing 'approvedBy':
const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base', token: 'USDC', amount: '5000',
  from: '0xSender', to: '0xRecipient',
  actorId: 'treasury-agent',
  metadata: { purpose: 'vendor-payment' },  // missing 'approvedBy'
});
// receipt.allowed = false
// receipt.rules = [{ rule: 'metadata-required', passed: false,
//   detail: 'Missing required field: approvedBy' }]`;

const profileCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// Create or update a workspace profile
ctx.configure({
  workspaceRef: 'acme-corp',
  defaultArchetype: 'treasury',
  defaultChain: 'base',
  policies: {
    ofac: { enabled: true },
    amountLimits: {
      treasury: { maxPerTx: '25000', dailyLimit: '100000' },
    },
    blocklist: { addresses: [], mode: 'deny' },
    metadataRequirements: {
      treasury: ['purpose', 'approvedBy'],
    },
  },
  notifications: {
    slack: { webhookUrl: 'https://hooks.slack.com/services/...' },
    email: { recipients: ['compliance@acme.com'] },
  },
});

// Retrieve a workspace profile
const profile = ctx.profile('acme-corp');
// profile.workspaceRef — 'acme-corp'
// profile.policies — configured policy rules
// profile.notifications — notification channels`;

const presetsCode = `// 5 built-in payment presets (archetypes):
//
// +-----------------+----------+--------------------+
// | Archetype       | Max / Tx | Use Case           |
// +-----------------+----------+--------------------+
// | micropayments   | $100     | x402, tips, APIs   |
// | treasury        | $25,000  | Vendor payments    |
// | invoicing       | $20,000  | Invoice settlement |
// | payroll         | $15,000  | Salary disbursement|
// | cross_border    | $10,000  | International USDC |
// +-----------------+----------+--------------------+
//
// Presets configure default limits. Override them per workspace:

const attempt = await ctx.start({
  workspaceRef: 'acme-corp',
  appRef: 'payment-agent',
  archetype: 'treasury',   // applies treasury preset limits
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xSender' },
  recipientRefs: { wallet: '0xRecipient' },
  executionSurface: 'sdk',
});`;

const notificationsCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// Configure notifications per workspace
ctx.configure({
  workspaceRef: 'acme-corp',
  notifications: {
    // Slack notifications
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/T.../B.../xxx',
      channel: '#compliance-alerts',
      events: ['payment.failed', 'policy.violation', 'anomaly.detected'],
    },

    // Email notifications
    email: {
      recipients: ['compliance@acme.com', 'ops@acme.com'],
      events: ['payment.failed', 'payment.refunded', 'policy.violation'],
    },
  },
});

// Notifications fire automatically when events occur.
// No additional code needed after configuration.`;

const adapterInterfaceCode = `// Every provider adapter implements the ProviderAdapter interface:

interface ProviderAdapter {
  name: string;
  supportedChains: string[];
  supportedAssets: string[];

  // Send a payment through this provider
  send(params: AdapterSendParams): Promise<AdapterSendResult>;

  // Check transaction status
  status(txRef: string): Promise<AdapterStatusResult>;

  // Estimate fees for a payment
  estimateFee?(params: AdapterFeeParams): Promise<AdapterFeeResult>;
}

interface AdapterSendParams {
  chain: string;
  asset: string;
  amount: string;
  from: string;
  to: string;
  metadata?: Record<string, unknown>;
}

interface AdapterSendResult {
  txHash: string;
  chain: string;
  status: 'submitted' | 'pending' | 'confirmed' | 'failed';
  providerRef?: string;
}`;

const evmAdapterCode = `import { Kontext, EVMAdapter } from 'kontext-sdk';

const evm = new EVMAdapter({
  rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
  privateKey: process.env.WALLET_PRIVATE_KEY,
});

const ctx = Kontext.init({
  projectId: 'my-app',
  adapters: [evm],
});

// EVMAdapter supports:
//   Chains: ethereum, base, polygon, arbitrum, optimism, avalanche
//   Assets: USDC, USDT, DAI, EURC`;

const solanaAdapterCode = `import { Kontext, SolanaAdapter } from 'kontext-sdk';

const solana = new SolanaAdapter({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  privateKey: process.env.SOLANA_PRIVATE_KEY,
});

const ctx = Kontext.init({
  projectId: 'my-app',
  adapters: [solana],
});

// SolanaAdapter supports:
//   Chains: solana
//   Assets: USDC, USDT`;

const circleAdapterCode = `import { Kontext, CircleAdapter } from 'kontext-sdk';

const circle = new CircleAdapter({
  apiKey: process.env.CIRCLE_API_KEY,
  environment: 'production',  // 'sandbox' | 'production'
});

const ctx = Kontext.init({
  projectId: 'my-app',
  adapters: [circle],
});

// CircleAdapter supports:
//   Circle Programmable Wallets
//   CCTP cross-chain transfers (V1 and V2)
//   Chains: ethereum, base, polygon, arbitrum, avalanche, solana
//   Assets: USDC, EURC`;

const x402AdapterCode = `import { Kontext, X402Adapter } from 'kontext-sdk';

const x402 = new X402Adapter({
  rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
  privateKey: process.env.WALLET_PRIVATE_KEY,
});

const ctx = Kontext.init({
  projectId: 'my-app',
  adapters: [x402],
});

// X402Adapter supports:
//   HTTP 402 payment protocol
//   Micropayment flows (sub-$1 USDC)
//   Chains: base, ethereum
//   Assets: USDC`;

const bridgeAdapterCode = `import { Kontext, BridgeAdapter } from 'kontext-sdk';

const bridge = new BridgeAdapter({
  apiKey: process.env.BRIDGE_API_KEY,
  environment: 'production',
});

const ctx = Kontext.init({
  projectId: 'my-app',
  adapters: [bridge],
});

// BridgeAdapter supports:
//   Bridge.xyz (Stripe) orchestration API
//   Fiat on/off ramp flows
//   Chains: ethereum, base, polygon, solana
//   Assets: USDC, USDT`;

const modernTreasuryAdapterCode = `import { Kontext, ModernTreasuryAdapter } from 'kontext-sdk';

const mt = new ModernTreasuryAdapter({
  apiKey: process.env.MODERN_TREASURY_API_KEY,
  organizationId: process.env.MODERN_TREASURY_ORG_ID,
});

const ctx = Kontext.init({
  projectId: 'my-app',
  adapters: [mt],
});

// ModernTreasuryAdapter supports:
//   Bank payment rails (ACH, Wire, RTP)
//   Ledger-based reconciliation
//   Multi-currency support`;

const dashboardCode = `// The Ops Dashboard provides a real-time view of payment activity.
//
// Features:
//   - Live payment attempt feed with stage progression
//   - Policy violation alerts and blocked payments
//   - Per-workspace volume and success rate metrics
//   - Anomaly detection event timeline
//   - Digest chain verification status
//
// Access the dashboard at:
//   https://app.getkontext.com/dashboard
//
// Or embed in your own app:
import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-app',
  apiKey: 'sk_live_...',
});

// List recent payment attempts
const attempts = await ctx.list({
  workspaceRef: 'acme-corp',
  limit: 50,
  stage: 'confirmed',        // filter by current stage
  since: '2026-03-01',       // filter by date
});

// Get a specific attempt with full history
const attempt = await ctx.get(attemptId);
// attempt.stages — ordered array of StageEvent objects
// attempt.currentStage — current stage name
// attempt.finalState — 'success' | 'failed' | 'refunded' | null`;

const exportCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-app' });

// Export audit trail as JSON
const jsonExport = await ctx.export({ format: 'json' });
// jsonExport.data — serialized payment attempts with stage events

// Export audit trail as CSV
const csvExport = await ctx.export({ format: 'csv' });
// csvExport.data — CSV rows: attemptId, stage, timestamp, amount, chain, ...

// Filter exports by workspace, date range, or stage
const filtered = await ctx.export({
  format: 'json',
  workspaceRef: 'acme-corp',
  since: '2026-03-01',
  until: '2026-03-08',
  stages: ['confirmed', 'failed'],
});

// Verify digest chain integrity
const chain = ctx.verifyDigestChain();
console.log('Chain valid:', chain.valid);
console.log('Chain length:', chain.chainLength);`;

const notificationsOpsCode = `// Slack and email alerts fire on configured events.
// Set up once in your workspace profile:

ctx.configure({
  workspaceRef: 'acme-corp',
  notifications: {
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/T.../B.../xxx',
      events: [
        'payment.failed',        // Payment reached fail() state
        'payment.refunded',      // Payment was refunded
        'policy.violation',      // authorize() blocked a payment
        'anomaly.detected',      // Anomaly detection triggered
        'limit.approaching',     // 80% of daily limit used
      ],
    },
    email: {
      recipients: ['compliance@acme.com'],
      events: ['policy.violation', 'payment.failed'],
      digest: 'daily',          // 'immediate' | 'daily' | 'weekly'
    },
  },
});`;

const apiReferenceCode = `// Initialization
const ctx = Kontext.init(config: KontextConfig): Kontext;

// Payment Lifecycle
await ctx.start(input: StartAttemptInput): Promise<PaymentAttempt>;
await ctx.authorize(attemptId: string, input: AuthorizeInput): Promise<{ receipt: PaymentReceipt }>;
await ctx.record(attemptId: string, phase: 'prepare' | 'reconcile', data: Record<string, unknown>): Promise<StageEvent>;
await ctx.broadcast(attemptId: string, txHash: string, chain: string): Promise<StageEvent>;
await ctx.confirm(attemptId: string, input: ConfirmInput): Promise<StageEvent>;
await ctx.credit(attemptId: string, input: CreditInput): Promise<StageEvent>;
await ctx.fail(attemptId: string, input: FailInput): Promise<StageEvent>;
await ctx.refund(attemptId: string, input: RefundInput): Promise<StageEvent>;

// Query
await ctx.get(attemptId: string): Promise<PaymentAttempt>;
await ctx.list(filter?: ListFilter): Promise<PaymentAttempt[]>;

// Workspace Profiles
ctx.profile(workspaceRef: string): WorkspaceProfile;
ctx.configure(config: WorkspaceConfig): void;

// Digest Chain
ctx.getTerminalDigest(): string;
ctx.verifyDigestChain(): DigestVerification;
ctx.exportDigestChain(): { genesisHash, links, terminalDigest };

// Export
await ctx.export(options: ExportOptions): Promise<ExportResult>;

// Persistence
await ctx.flush(): Promise<void>;

// Lifecycle
await ctx.destroy(): Promise<void>;`;

const typesCode = `import type {
  // Payment lifecycle
  StartAttemptInput,
  PaymentAttempt,
  PaymentReceipt,
  StageEvent,
  StageName,
  FinalState,

  // Authorization
  AuthorizeInput,
  PolicyRule,
  PolicyResult,

  // Stage inputs
  ConfirmInput,
  CreditInput,
  FailInput,
  RefundInput,

  // Query
  ListFilter,

  // Workspace
  WorkspaceProfile,
  WorkspaceConfig,

  // Configuration
  KontextConfig,
  KontextMode,

  // Provider adapters
  ProviderAdapter,
  AdapterSendParams,
  AdapterSendResult,

  // Export
  ExportOptions,
  ExportResult,

  // Digest chain
  DigestVerification,
} from 'kontext-sdk';`;

const configCode = `import { Kontext, FileStorage, EVMAdapter } from 'kontext-sdk';

const ctx = Kontext.init({
  // Required
  projectId: 'my-project',

  // Optional
  environment: 'production',  // 'development' | 'staging' | 'production'
  apiKey: 'sk_live_...',      // only needed for cloud mode
  plan: 'free',               // 'free' | 'payg' | 'enterprise'

  // Persistence — default is in-memory (resets on restart)
  storage: new FileStorage('./payment-data'),

  // Provider adapters — plug in one or more
  adapters: [
    new EVMAdapter({
      rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
      privateKey: process.env.WALLET_PRIVATE_KEY,
    }),
  ],

  // Event exporters — where to send events
  exporters: [
    // new ConsoleExporter(),       // prints to stdout (dev)
    // new JsonFileExporter(path),  // writes JSONL to disk
    // new HttpExporter(config),    // sends to any HTTP endpoint
    // new KontextCloudExporter(),  // ships to api.getkontext.com (payg)
  ],
});`;

const cliCommandsCode = `# Initialize a new Kontext project
kontext init

# Start a payment trace
kontext trace start --workspace acme-corp --archetype treasury \\
  --amount 5000 --chain base --from 0xSender --to 0xRecipient

# Authorize a payment attempt
kontext trace authorize <attemptId> --amount 5000 --chain base \\
  --from 0xSender --to 0xRecipient --actor payment-agent

# Confirm a payment
kontext trace confirm <attemptId> --tx-hash 0xTxHash --block 12345

# View payment logs
kontext logs --workspace acme-corp --limit 50 --stage confirmed

# Debug a specific payment attempt
kontext debug <attemptId>`;

const sidebarSections = [
  {
    title: "Getting Started",
    items: [
      { id: "installation", label: "Installation" },
      { id: "quickstart", label: "Quick Start" },
    ],
  },
  {
    title: "Payment Lifecycle",
    items: [
      { id: "8-stages", label: "8-Stage Lifecycle" },
      { id: "start", label: "start() -- Intent" },
      { id: "authorize", label: "authorize() -- Policy Engine" },
      { id: "record", label: "record() -- Prepare / Reconcile" },
      { id: "broadcast", label: "broadcast() -- Transmit" },
      { id: "confirm", label: "confirm() -- Confirmation" },
      { id: "credit", label: "credit() -- Recipient Credit" },
      { id: "fail-refund", label: "fail() / refund()" },
    ],
  },
  {
    title: "Policy Engine",
    items: [
      { id: "policy-engine", label: "Policy Configuration" },
      { id: "sanctions", label: "OFAC Sanctions" },
      { id: "amount-limits", label: "Amount Limits" },
      { id: "blocklists", label: "Blocklist / Allowlist" },
      { id: "metadata-requirements", label: "Required Metadata" },
      { id: "violation-codes", label: "Violation Codes" },
      { id: "screening-architecture", label: "Screening Architecture" },
    ],
  },
  {
    title: "Workspace Profiles",
    items: [
      { id: "profiles", label: "Profile Configuration" },
      { id: "presets", label: "Payment Presets" },
      { id: "notifications", label: "Notifications" },
    ],
  },
  {
    title: "Provider Adapters",
    items: [
      { id: "adapters", label: "Adapter Interface" },
      { id: "evm-adapter", label: "EVMAdapter" },
      { id: "solana-adapter", label: "SolanaAdapter" },
      { id: "circle-adapter", label: "CircleAdapter" },
      { id: "x402-adapter", label: "X402Adapter" },
      { id: "bridge-adapter", label: "BridgeAdapter" },
      { id: "modern-treasury", label: "ModernTreasuryAdapter" },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "dashboard", label: "Ops Dashboard" },
      { id: "export", label: "CSV / JSON Export" },
      { id: "notifications-ops", label: "Slack + Email Alerts" },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "on-chain-anchoring", label: "On-Chain Anchoring" },
      { id: "api", label: "API Reference" },
      { id: "types", label: "TypeScript Types" },
      { id: "configuration", label: "Configuration" },
      { id: "cli", label: "CLI Commands" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Mobile section nav */}
      <div className="sticky top-16 z-40 -mx-4 overflow-x-auto border-b border-border bg-background px-4 py-3 lg:hidden sm:-mx-6 sm:px-6">
        <div className="flex gap-2 min-w-max">
          {sidebarSections.flatMap((section) =>
            section.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
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
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--term-text-3)]">
                  {section.title}
                </h4>
                <ul className="mt-2 space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block border-l-2 border-transparent px-3 py-1.5 text-xs text-[var(--term-text-2)] transition-colors hover:text-[var(--term-text)] hover:border-[var(--term-green)] hover:bg-[var(--term-surface-2)]"
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
              <h1 className="text-sm font-medium">
                <span className="text-[var(--term-green)]">$</span>{" "}
                DOCUMENTATION
              </h1>
              <p>
                Kontext is the Payment Control Plane for autonomous agents. Every
                payment flows through an 8-stage lifecycle with policy enforcement,
                provider-agnostic adapters, and a tamper-evident audit trail. One SDK,
                any payment rail, full compliance coverage.
              </p>
            </div>

            {/* Quick links */}
            <div className="mb-12 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Zap,
                  title: "Quick Start",
                  description: "First payment in 2 minutes",
                  href: "#quickstart",
                },
                {
                  icon: Shield,
                  title: "Policy Engine",
                  description: "OFAC, limits, blocklists, metadata",
                  href: "#policy-engine",
                },
                {
                  icon: Code2,
                  title: "API Reference",
                  description: "Full method reference",
                  href: "#api",
                },
                {
                  icon: BookOpen,
                  title: "Provider Adapters",
                  description: "EVM, Solana, Circle, Bridge, and more",
                  href: "#adapters",
                },
              ].map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className="group flex items-start gap-3 border border-border p-4 no-underline transition-colors hover:bg-card"
                >
                  <div className="mt-0.5  bg-[var(--term-surface-2)] p-2 text-primary">
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
                code={`yarn add kontext-sdk\n# or\npnpm add kontext-sdk`}
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
                Initialize the SDK, declare a payment intent with <code>start()</code>,
                run policy checks with <code>authorize()</code>, then broadcast and
                confirm the transaction. Every step is recorded in the digest chain.
              </p>
              <CodeBlock
                code={quickStartCode}
                language="typescript"
                filename="agent.ts"
              />
              <p>
                The payment flows through <code>start</code> to <code>authorize</code> to <code>broadcast</code> to <code>confirm</code>.
                If <code>authorize()</code> rejects the payment, call <code>fail()</code> to
                record the terminal state. Every stage transition is chained into
                a tamper-evident SHA-256 digest.
              </p>
            </section>

            <Separator className="my-12" />

            {/* 8-Stage Lifecycle */}
            <section id="8-stages">
              <h2>8-Stage Payment Lifecycle</h2>
              <p>
                Every payment in Kontext flows through a structured lifecycle of
                8 stages. Stage transitions are enforced -- you cannot skip from
                start to confirm without authorizing first. Each stage emits
                a <code>StageEvent</code> into the digest chain, creating a
                tamper-evident record of the full payment history.
              </p>
              <CodeBlock
                code={lifecycleStagesCode}
                language="typescript"
                filename="lifecycle.ts"
              />
              <div className="mt-6 border border-border bg-[var(--term-surface)] p-6">
                <h4 className="text-sm font-semibold mb-4">Stage Flow</h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">1</Badge>
                    <span className="font-semibold text-[var(--term-green)]">START</span>
                    <span className="text-muted-foreground">Declare intent -- amount, currency, sender, recipient</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">2</Badge>
                    <span className="font-semibold text-[var(--term-green)]">AUTHORIZE</span>
                    <span className="text-muted-foreground">Run policy engine -- OFAC, limits, blocklists, metadata</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">3</Badge>
                    <span className="font-semibold text-[var(--term-green)]">PREPARE</span>
                    <span className="text-muted-foreground">Lock funds or record pre-execution state</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">4</Badge>
                    <span className="font-semibold text-[var(--term-green)]">TRANSMIT</span>
                    <span className="text-muted-foreground">Broadcast the on-chain transaction</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">5</Badge>
                    <span className="font-semibold text-[var(--term-green)]">CONFIRM</span>
                    <span className="text-muted-foreground">Wait for block confirmation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">6</Badge>
                    <span className="font-semibold text-[var(--term-green)]">CREDIT</span>
                    <span className="text-muted-foreground">Mark recipient as credited</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">7</Badge>
                    <span className="font-semibold text-[var(--term-red)]">FAIL</span>
                    <span className="text-muted-foreground">Terminal failure at any stage</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">8</Badge>
                    <span className="font-semibold text-[var(--term-amber)]">REFUND</span>
                    <span className="text-muted-foreground">Reverse a previously confirmed payment</span>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="my-12" />

            {/* start() */}
            <section id="start">
              <h2>start() -- Declare Intent</h2>
              <p>
                The <code>start()</code> method creates a new payment attempt and
                records the declared intent. It captures the workspace, application,
                archetype, currency, chain, sender, and recipient. No funds move
                at this stage -- it is purely declarative.
              </p>
              <CodeBlock
                code={startCode}
                language="typescript"
                filename="start.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* authorize() */}
            <section id="authorize">
              <h2>authorize() -- Policy Engine</h2>
              <p>
                The <code>authorize()</code> method runs every configured policy
                rule against the payment. It returns a <code>PaymentReceipt</code> with
                the overall decision, individual rule results, and a risk level.
                If any rule fails, the payment is blocked.
              </p>
              <CodeBlock
                code={authorizeCode}
                language="typescript"
                filename="authorize.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* record() */}
            <section id="record">
              <h2>record() -- Prepare / Reconcile</h2>
              <p>
                The <code>record()</code> method logs a state change during the
                payment lifecycle. Use <code>&apos;prepare&apos;</code> before execution to
                record fund locks or pre-flight checks.
                Use <code>&apos;reconcile&apos;</code> after settlement to record
                final amounts, fees, and exchange rates.
              </p>
              <CodeBlock
                code={recordCode}
                language="typescript"
                filename="record.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* broadcast() */}
            <section id="broadcast">
              <h2>broadcast() -- Transmit</h2>
              <p>
                The <code>broadcast()</code> method records that the transaction
                has been submitted on-chain. It captures the transaction hash and
                chain for tracking.
              </p>
              <CodeBlock
                code={broadcastCode}
                language="typescript"
                filename="broadcast.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* confirm() */}
            <section id="confirm">
              <h2>confirm() -- Confirmation</h2>
              <p>
                The <code>confirm()</code> method records that the transaction has
                been confirmed on-chain at a specific block number. After confirmation,
                the payment can proceed to credit or be refunded.
              </p>
              <CodeBlock
                code={confirmCode}
                language="typescript"
                filename="confirm.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* credit() */}
            <section id="credit">
              <h2>credit() -- Recipient Credit</h2>
              <p>
                The <code>credit()</code> method marks the payment as fully settled
                with the recipient credited. This is the terminal success state.
              </p>
              <CodeBlock
                code={creditCode}
                language="typescript"
                filename="credit.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* fail() / refund() */}
            <section id="fail-refund">
              <h2>fail() / refund()</h2>
              <p>
                Both <code>fail()</code> and <code>refund()</code> are terminal states.
                Use <code>fail()</code> when a payment cannot proceed at any stage --
                policy violation, network error, insufficient funds.
                Use <code>refund()</code> to reverse a previously confirmed payment.
              </p>
              <CodeBlock
                code={failRefundCode}
                language="typescript"
                filename="fail-refund.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Policy Engine */}
            <section id="policy-engine">
              <h2>Policy Configuration</h2>
              <p>
                The policy engine runs automatically during <code>authorize()</code>.
                Configure rules via workspace profiles. Four rule categories are
                available: OFAC sanctions screening, amount limits, blocklist/allowlist,
                and metadata requirements.
              </p>
              <CodeBlock
                code={policyEngineCode}
                language="typescript"
                filename="policy.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* OFAC Sanctions */}
            <section id="sanctions">
              <h2>OFAC Sanctions</h2>
              <p>
                OFAC screening runs against the built-in SDN (Specially Designated
                Nationals) list. No API key required for the built-in list. The
                screening checks both sender and recipient addresses against
                sanctioned entities.
              </p>
              <CodeBlock
                code={sanctionsCode}
                language="typescript"
                filename="sanctions.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Amount Limits */}
            <section id="amount-limits">
              <h2>Amount Limits</h2>
              <p>
                Configure per-transaction and daily limits for each payment archetype.
                The policy engine enforces these limits during <code>authorize()</code>.
                Built-in regulatory thresholds (Travel Rule, CTR, Large Transaction)
                are always active regardless of your configuration.
              </p>
              <CodeBlock
                code={amountLimitsCode}
                language="typescript"
                filename="limits.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Blocklist / Allowlist */}
            <section id="blocklists">
              <h2>Blocklist / Allowlist</h2>
              <p>
                Control which addresses can send or receive payments. In <code>deny</code> mode,
                listed addresses are blocked. In <code>allow-only</code> mode, only
                listed addresses are permitted.
              </p>
              <CodeBlock
                code={blocklistCode}
                language="typescript"
                filename="blocklist.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Metadata Requirements */}
            <section id="metadata-requirements">
              <h2>Required Metadata</h2>
              <p>
                Enforce metadata presence on payment attempts. Define required fields
                per archetype. The policy engine rejects payments missing required
                fields during <code>authorize()</code>.
              </p>
              <CodeBlock
                code={metadataRequirementsCode}
                language="typescript"
                filename="metadata.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Violation Codes */}
            <section id="violation-codes">
              <h2>Violation Codes</h2>
              <p>
                The policy engine returns specific violation codes when a check fails.
                Each code maps to a decision: <code>block</code>, <code>review</code>, or <code>collect_info</code>.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--term-surface-2)]">
                      <th className="py-2 pr-4 text-[var(--term-text-3)] font-medium">Code</th>
                      <th className="py-2 pr-4 text-[var(--term-text-3)] font-medium">Severity</th>
                      <th className="py-2 pr-4 text-[var(--term-text-3)] font-medium">Decision</th>
                      <th className="py-2 text-[var(--term-text-3)] font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--term-text-2)]">
                    {[
                      { code: "UNSUPPORTED_CHAIN", severity: "critical", decision: "block", desc: "Chain not supported (MVP: Base only)" },
                      { code: "UNSUPPORTED_TOKEN", severity: "critical", decision: "block", desc: "Token not supported (MVP: USDC only)" },
                      { code: "INVALID_AMOUNT", severity: "high", decision: "block", desc: "Amount is not a positive number" },
                      { code: "INVALID_SENDER", severity: "high", decision: "block", desc: "Sender is not a valid EVM address" },
                      { code: "INVALID_RECIPIENT", severity: "high", decision: "block", desc: "Recipient is not a valid EVM address" },
                      { code: "MAX_TRANSACTION_EXCEEDED", severity: "high", decision: "block", desc: "Amount exceeds archetype max transaction limit" },
                      { code: "SANCTIONED_RECIPIENT", severity: "critical", decision: "block", desc: "Recipient on OFAC sanctions list" },
                      { code: "SANCTIONED_SENDER", severity: "critical", decision: "block", desc: "Sender on OFAC sanctions list" },
                      { code: "BLOCKED_RECIPIENT", severity: "high", decision: "block", desc: "Recipient on explicit blocklist" },
                      { code: "BLOCKED_SENDER", severity: "high", decision: "block", desc: "Sender on explicit blocklist" },
                      { code: "RECIPIENT_NOT_ALLOWED", severity: "high", decision: "block", desc: "Recipient not on allowlist" },
                      { code: "REQUIRES_HUMAN_APPROVAL", severity: "medium", decision: "review", desc: "Amount exceeds review threshold" },
                      { code: "DAILY_LIMIT_EXCEEDED", severity: "high", decision: "review", desc: "Projected daily total exceeds limit" },
                      { code: "MISSING_PAYMENT_TYPE", severity: "medium", decision: "collect_info", desc: "metadata.paymentType not provided" },
                      { code: "MISSING_REQUIRED_METADATA", severity: "medium", decision: "collect_info", desc: "Required metadata fields missing for payment type" },
                    ].map((v) => (
                      <tr key={v.code} className="border-b border-[var(--term-surface-2)]/50">
                        <td className="py-2 pr-4 font-mono text-[var(--term-green)]">{v.code}</td>
                        <td className="py-2 pr-4">{v.severity}</td>
                        <td className={`py-2 pr-4 ${v.decision === "block" ? "text-[var(--term-red)]" : v.decision === "review" ? "text-[var(--term-amber)]" : "text-[var(--term-blue)]"}`}>{v.decision}</td>
                        <td className="py-2">{v.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <Separator className="my-12" />

            {/* Screening Architecture */}
            <section id="screening-architecture">
              <h2>Screening Architecture</h2>
              <p>
                Built-in OFAC screening uses a local SDN address list — no API key required.
                This covers known sanctioned Ethereum addresses and is sufficient for development and MVP use.
              </p>
              <div className="space-y-3 text-sm text-[var(--term-text-2)]">
                <p>
                  <span className="text-[var(--term-green)]">+</span>{" "}
                  <strong>What{"'"}s included:</strong> Local SDN list checked at the{" "}
                  <code>authorize</code> stage for both sender and recipient addresses.
                </p>
                <p>
                  <span className="text-[var(--term-amber)]">!</span>{" "}
                  <strong>Production recommendation:</strong> Layer external screening providers
                  alongside Kontext for enterprise-grade compliance:
                </p>
                <ul className="list-none space-y-1 pl-4">
                  <li><span className="text-[var(--term-text-3)]">-</span> Chainalysis KYT — real-time transaction monitoring</li>
                  <li><span className="text-[var(--term-text-3)]">-</span> TRM Labs — wallet risk scoring</li>
                  <li><span className="text-[var(--term-text-3)]">-</span> Elliptic — cross-chain analytics</li>
                </ul>
                <p className="text-[var(--term-text-3)] text-xs mt-4">
                  External provider injection (<code>externalScreeners</code> in{" "}
                  <code>authorize()</code>) is planned for a future release.
                  Currently, run your external screening alongside{" "}
                  <code>authorize()</code> results.
                </p>
              </div>
            </section>

            <Separator className="my-12" />

            {/* Workspace Profiles */}
            <section id="profiles">
              <h2>Profile Configuration</h2>
              <p>
                Workspace profiles group policy rules, notification channels, and
                default settings under a single reference. Use <code>configure()</code> to
                create or update profiles and <code>profile()</code> to retrieve them.
              </p>
              <CodeBlock
                code={profileCode}
                language="typescript"
                filename="profile.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Payment Presets */}
            <section id="presets">
              <h2>Payment Presets</h2>
              <p>
                Kontext ships with 5 built-in payment archetypes. Each preset
                configures default amount limits for a common payment pattern.
                Override any preset by configuring custom limits in your
                workspace profile.
              </p>
              <CodeBlock
                code={presetsCode}
                language="typescript"
                filename="presets.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Notifications */}
            <section id="notifications">
              <h2>Notifications</h2>
              <p>
                Configure Slack and email notifications per workspace. Notifications
                fire automatically when configured events occur -- payment failures,
                policy violations, anomaly detection, and limit warnings.
              </p>
              <CodeBlock
                code={notificationsCode}
                language="typescript"
                filename="notifications.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Adapter Interface */}
            <section id="adapters">
              <h2>Adapter Interface</h2>
              <p>
                Provider adapters abstract the payment rail. Every adapter implements
                the same <code>ProviderAdapter</code> interface -- swap adapters
                without changing your payment logic. Kontext ships with 6 adapters
                covering on-chain, custodial, and traditional rails.
              </p>
              <CodeBlock
                code={adapterInterfaceCode}
                language="typescript"
                filename="adapter.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* EVMAdapter */}
            <section id="evm-adapter">
              <h2>EVMAdapter</h2>
              <p>
                Direct EVM chain support for Ethereum, Base, Polygon, Arbitrum,
                Optimism, and Avalanche. Handles ERC-20 token transfers with
                built-in gas estimation.
              </p>
              <CodeBlock
                code={evmAdapterCode}
                language="typescript"
                filename="evm-adapter.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* SolanaAdapter */}
            <section id="solana-adapter">
              <h2>SolanaAdapter</h2>
              <p>
                Native Solana support for SPL token transfers. Handles USDC and
                USDT on Solana mainnet.
              </p>
              <CodeBlock
                code={solanaAdapterCode}
                language="typescript"
                filename="solana-adapter.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* CircleAdapter */}
            <section id="circle-adapter">
              <h2>CircleAdapter</h2>
              <p>
                Integration with Circle Programmable Wallets and CCTP cross-chain
                transfers. Supports both CCTP V1 and V2 for cross-chain USDC movement.
              </p>
              <CodeBlock
                code={circleAdapterCode}
                language="typescript"
                filename="circle-adapter.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* X402Adapter */}
            <section id="x402-adapter">
              <h2>X402Adapter</h2>
              <p>
                Support for the HTTP 402 payment protocol. Optimized for
                micropayment flows under $1 USDC -- API calls, content access,
                agent-to-agent payments.
              </p>
              <CodeBlock
                code={x402AdapterCode}
                language="typescript"
                filename="x402-adapter.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* BridgeAdapter */}
            <section id="bridge-adapter">
              <h2>BridgeAdapter</h2>
              <p>
                Integration with Bridge.xyz (Stripe) orchestration API. Supports
                fiat on/off ramp flows and multi-chain stablecoin transfers.
              </p>
              <CodeBlock
                code={bridgeAdapterCode}
                language="typescript"
                filename="bridge-adapter.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* ModernTreasuryAdapter */}
            <section id="modern-treasury">
              <h2>ModernTreasuryAdapter</h2>
              <p>
                Integration with Modern Treasury for traditional bank payment rails.
                Supports ACH, Wire, and RTP with ledger-based reconciliation.
              </p>
              <CodeBlock
                code={modernTreasuryAdapterCode}
                language="typescript"
                filename="modern-treasury-adapter.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Ops Dashboard */}
            <section id="dashboard">
              <h2>Ops Dashboard</h2>
              <p>
                The Ops Dashboard provides real-time visibility into payment
                activity across all workspaces. Monitor live payment flows,
                track policy violations, and verify digest chain integrity.
              </p>
              <CodeBlock
                code={dashboardCode}
                language="typescript"
                filename="dashboard.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* CSV / JSON Export */}
            <section id="export">
              <h2>CSV / JSON Export</h2>
              <p>
                Export your complete payment audit trail as JSON or CSV. Filter
                by workspace, date range, or stage. The digest chain provides
                cryptographic proof that no records have been tampered with.
              </p>
              <CodeBlock
                code={exportCode}
                language="typescript"
                filename="export.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Slack + Email Alerts */}
            <section id="notifications-ops">
              <h2>Slack + Email Alerts</h2>
              <p>
                Configure event-driven notifications for your operations team.
                Alerts fire on payment failures, policy violations, anomaly
                detection, and limit warnings. Email notifications support
                immediate, daily, or weekly digest modes.
              </p>
              <CodeBlock
                code={notificationsOpsCode}
                language="typescript"
                filename="alerts.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* On-Chain Anchoring */}
            <section id="on-chain-anchoring">
              <h2>On-Chain Anchoring</h2>
              <p>
                Anchor terminal digests from the digest chain to Base via the{" "}
                <code>KontextAnchor</code> contract. Each anchor is immutable — once recorded,
                it proves that a specific set of compliance checks ran at a specific time.
              </p>
              <div className="space-y-3 text-sm text-[var(--term-text-2)] mb-4">
                <p><span className="text-[var(--term-green)]">+</span> <code>anchor(digest, projectHash)</code> — record a digest on-chain (one-time, tamper-evident)</p>
                <p><span className="text-[var(--term-green)]">+</span> <code>verify(digest)</code> — check if a digest has been anchored (read-only, gas-free)</p>
                <p><span className="text-[var(--term-green)]">+</span> <code>getAnchor(digest)</code> — get full metadata (anchorer, projectHash, timestamp)</p>
              </div>
              <CodeBlock
                code={`import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });

// Verify a digest has been anchored
const isAnchored = await client.readContract({
  address: KONTEXT_ANCHOR_ADDRESS,
  abi: kontextAnchorAbi,
  functionName: 'verify',
  args: [digestBytes32],
});

// Get full anchor metadata
const [anchorer, projectHash, timestamp] = await client.readContract({
  address: KONTEXT_ANCHOR_ADDRESS,
  abi: kontextAnchorAbi,
  functionName: 'getAnchor',
  args: [digestBytes32],
});`}
                language="typescript"
                filename="anchor-verify.ts"
              />
              <p className="text-xs text-[var(--term-text-3)] mt-4">
                Cost: ~$0.001 per anchor on Base. Contract source:{" "}
                <code>contracts/KontextAnchor.sol</code>.
                SDK integration (<code>OnChainExporter</code>) coming in a future release.
              </p>
            </section>

            <Separator className="my-12" />

            {/* API Reference */}
            <section id="api">
              <h2>API Reference</h2>
              <p>
                Complete reference for all Kontext SDK methods. The SDK uses a
                private constructor with a static <code>Kontext.init(config)</code> factory.
                All payment lifecycle methods require an <code>attemptId</code> from <code>start()</code>.
              </p>
              <CodeBlock
                code={apiReferenceCode}
                language="typescript"
                filename="api-reference.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* TypeScript Types */}
            <section id="types">
              <h2>TypeScript Types</h2>
              <p>
                All types are exported from the main package. Full autocomplete
                in any TypeScript-aware editor. Key types for the payment lifecycle
                are listed below.
              </p>
              <CodeBlock
                code={typesCode}
                language="typescript"
                filename="types.ts"
              />
              <div className="mt-6 border border-border bg-[var(--term-surface)] p-6">
                <h4 className="text-sm font-semibold mb-4">Key Types</h4>
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <span className="text-[var(--term-green)]">StartAttemptInput</span>
                    <span className="text-muted-foreground"> -- Input for start(). Declares payment intent.</span>
                  </div>
                  <div>
                    <span className="text-[var(--term-green)]">PaymentAttempt</span>
                    <span className="text-muted-foreground"> -- Full payment object with stages, state, and metadata.</span>
                  </div>
                  <div>
                    <span className="text-[var(--term-green)]">PaymentReceipt</span>
                    <span className="text-muted-foreground"> -- Authorization result with allowed, rules, and riskLevel.</span>
                  </div>
                  <div>
                    <span className="text-[var(--term-green)]">StageEvent</span>
                    <span className="text-muted-foreground"> -- Individual stage transition with timestamp and data.</span>
                  </div>
                  <div>
                    <span className="text-[var(--term-green)]">StageName</span>
                    <span className="text-muted-foreground"> -- Union type: &apos;start&apos; | &apos;authorize&apos; | &apos;prepare&apos; | &apos;transmit&apos; | &apos;confirm&apos; | &apos;credit&apos; | &apos;fail&apos; | &apos;refund&apos;</span>
                  </div>
                  <div>
                    <span className="text-[var(--term-green)]">FinalState</span>
                    <span className="text-muted-foreground"> -- Terminal state: &apos;success&apos; | &apos;failed&apos; | &apos;refunded&apos;</span>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="my-12" />

            {/* Configuration */}
            <section id="configuration">
              <h2>Configuration</h2>
              <p>
                Kontext is configured via <code>Kontext.init(config)</code>. No config
                files, no environment variable magic. Everything is explicit in code.
                Provider adapters and exporters are passed at initialization.
              </p>
              <CodeBlock
                code={configCode}
                language="typescript"
                filename="config.ts"
              />

              <h3>Environment Variables</h3>
              <CodeBlock
                code={`KONTEXT_API_KEY=sk_live_...     # API key for cloud mode
KONTEXT_CHAIN=base              # Default chain
KONTEXT_ENVIRONMENT=production  # Environment`}
                language="bash"
                filename=".env"
              />
            </section>

            <Separator className="my-12" />

            {/* CLI Commands */}
            <section id="cli">
              <h2>CLI Commands</h2>
              <p>
                The Kontext CLI provides commands for tracing payment lifecycles,
                viewing logs, and debugging payment attempts from the terminal.
              </p>
              <CodeBlock
                code={cliCommandsCode}
                language="bash"
                filename="Terminal"
              />
            </section>

            {/* Next steps */}
            <div className="mt-16 border border-border bg-[var(--term-surface)] p-8">
              <h3 className="text-lg font-semibold">Need help?</h3>
              <p className="mt-2 text-muted-foreground">
                If you run into issues or have questions, reach out through any
                of these channels:
              </p>
              <ul className="mt-4">
                <li>
                  <a
                    href="https://github.com/Legaci-Labs/kontext"
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
