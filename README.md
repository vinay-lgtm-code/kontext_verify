# kontext

Compliance & lifecycle control plane for AI agents moving stablecoins.

**8-Stage Lifecycle** · **Policy Engine** · **OFAC Screening** · **Patented Digest Chain** · **On-Chain Anchoring** · **GENIUS Act Aligned** · **MIT Licensed**

---

## Why Kontext

AI agents are moving real money — treasury payments, payroll, micropayments, cross-border transfers. Every autonomous payment needs:

- **Built-in OFAC screening** — local SDN list, no API key, no external dependency. Layer Chainalysis/TRM/Elliptic for production.
- **Tamper-evident digest chain** (patented) — SHA-256 hash chain proves every authorization actually ran. Auditors can verify independently.
- **On-chain anchoring** — anchor terminal digests to Base via the `KontextAnchor` contract. Immutable proof on-chain for ~$0.001.

Regulations are coming. The GENIUS Act (signed July 2025) requires BSA-equivalent compliance for stablecoin transactions — $3K Travel Rule reporting, $10K CTR thresholds, sanctions screening. Kontext handles this at the SDK level so your agents ship compliant from day one.

## Install

```bash
npm install kontext-sdk
```

## Quick Start

```typescript
import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-app',
  environment: 'production',
});

// agent flow: start → authorize → broadcast → confirm → credit
const attempt = await ctx.start({
  workspaceRef: 'ws_acme',
  appRef: 'treasury-agent',
  archetype: 'treasury',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xTreasury...C3' },
  recipientRefs: { wallet: '0xVendor...D4' },
  executionSurface: 'sdk',
});

// authorize() runs OFAC, amount limits, blocklists, metadata checks
const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '5000',
  from: '0xTreasury...C3',
  to: '0xVendor...D4',
  actorId: 'treasury-agent',
});

if (!receipt.allowed) {
  console.log('Blocked:', receipt.violations);
  // receipt.violations[0].code === 'SANCTIONED_RECIPIENT' | 'MAX_TRANSACTION_EXCEEDED' | ...
  return;
}

// Track the lifecycle
await ctx.broadcast(attempt.attemptId, '0xTxHash...');
await ctx.confirm(attempt.attemptId, { txHash: '0xTxHash...', blockNumber: 12345 });
await ctx.credit(attempt.attemptId, { confirmedAt: new Date().toISOString() });
```

## Full Agent Payroll Flow

```typescript
// Complete payroll agent: intent → authorize → broadcast → confirm → credit
const attempt = await ctx.start({
  workspaceRef: 'acme-payroll',
  appRef: 'payroll-agent',
  archetype: 'payroll',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xPayroll...A1' },
  recipientRefs: { wallet: '0xEmployee...B2' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '3500',
  from: '0xPayroll...A1',
  to: '0xEmployee...B2',
  actorId: 'payroll-agent',
  metadata: { paymentType: 'payroll', employeeId: 'emp_042', payPeriod: '2026-03' },
});

if (!receipt.allowed) {
  console.log('Blocked:', receipt.violations);
  return;
}

await ctx.broadcast(attempt.attemptId, '0xTxHash...');
await ctx.confirm(attempt.attemptId, { txHash: '0xTxHash...', blockNumber: 28491037 });
await ctx.credit(attempt.attemptId, { confirmedAt: new Date().toISOString() });
// attempt.finalState === 'succeeded'
// Digest chain: 5 links, verified
```

## 8-Stage Payment Lifecycle

```
intent -> authorize -> prepare -> transmit -> confirm -> recipient_credit -> reconcile -> retry_or_refund
```

Every payment is a `PaymentAttempt`. Each stage appends a `StageEvent` with status, actor, code, message, and timestamp. Query, filter, and export at any time.

## Policy Engine

The `authorize()` method runs these checks automatically:

- **OFAC Sanctions** — built-in SDN list, no API key
- **Amount Limits** — per-transaction max and daily aggregate
- **Review Thresholds** — flags amounts above threshold for human approval
- **Blocklists** — sender and recipient address blocking
- **Allowlists** — restrict recipients to approved addresses
- **Metadata Requirements** — archetype-specific required fields

Returns `{ decision, allowed, checksRun, violations, requiredActions, digestProof }`.

Decisions: `allow` | `block` | `review` | `collect_info`.

### Screening Depth

Built-in OFAC screening uses a local SDN address list (no API key required). This covers known sanctioned Ethereum addresses and is sufficient for development and MVP use.

For production compliance, layer external screening providers alongside Kontext:
- **Chainalysis KYT** — real-time transaction monitoring
- **TRM Labs** — wallet risk scoring
- **Elliptic** — cross-chain analytics

External provider injection (`externalScreeners` in `authorize()`) is planned for a future release. Currently, use `authorize()` results alongside your existing screening provider.

### Violation Codes

| Code | Severity | Decision |
|------|----------|----------|
| `UNSUPPORTED_CHAIN` | critical | block |
| `UNSUPPORTED_TOKEN` | critical | block |
| `INVALID_AMOUNT` | high | block |
| `INVALID_SENDER` | high | block |
| `INVALID_RECIPIENT` | high | block |
| `MAX_TRANSACTION_EXCEEDED` | high | block |
| `SANCTIONED_RECIPIENT` | critical | block |
| `SANCTIONED_SENDER` | critical | block |
| `BLOCKED_RECIPIENT` | high | block |
| `BLOCKED_SENDER` | high | block |
| `RECIPIENT_NOT_ALLOWED` | high | block |
| `REQUIRES_HUMAN_APPROVAL` | medium | review |
| `DAILY_LIMIT_EXCEEDED` | high | review |
| `MISSING_PAYMENT_TYPE` | medium | collect_info |
| `MISSING_REQUIRED_METADATA` | medium | collect_info |

## On-Chain Anchoring

Anchor terminal digests from the digest chain to Base via the `KontextAnchor` contract. Each anchor is immutable — once recorded, it proves that a specific set of compliance checks ran at a specific time.

**Contract API:**
- `anchor(digest, projectHash)` — record a digest on-chain (one-time, tamper-evident)
- `verify(digest)` — check if a digest has been anchored (read-only, gas-free)
- `getAnchor(digest)` — get full anchor metadata (anchorer, projectHash, timestamp)

**Usage with viem:**

```typescript
import { createPublicClient, http } from 'viem';
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
});
```

Cost: ~$0.001 per anchor on Base. Batch multiple digests for efficiency.

Contract source: [`contracts/KontextAnchor.sol`](./contracts/KontextAnchor.sol)

## Provider Adapters

6 adapters normalize provider-specific events into the unified lifecycle:

| Adapter | Provider | Use Case |
|---------|----------|----------|
| `EVMAdapter` | Ethereum, Base, Polygon | On-chain USDC transfers |
| `SolanaAdapter` | Solana | SPL token transfers |
| `CircleAdapter` | Circle Programmable Wallets | Managed wallet transfers |
| `X402Adapter` | x402 protocol | HTTP-native micropayments |
| `BridgeAdapter` | Bridge.xyz (Stripe) | Cross-border fiat/crypto |
| `ModernTreasuryAdapter` | Modern Treasury | Bank rail payments |

## Workspace Profiles

Preset configurations per payment archetype:

| Archetype | Max TX | Daily Limit | Review Threshold |
|-----------|--------|-------------|------------------|
| `micropayments` | $100 | $10,000 | $50 |
| `treasury` | $25,000 | $100,000 | $10,000 |
| `invoicing` | $20,000 | $50,000 | $5,000 |
| `payroll` | $15,000 | $200,000 | $10,000 |
| `cross_border` | $10,000 | $25,000 | $3,000 |

## Free Tier

Free forever on Base:
- 20,000 payment stage events/month
- Full 8-stage lifecycle
- Policy engine (OFAC, amount limits, blocklists)
- Tamper-evident digest chain
- 5 workspace profiles
- JSON export
- No credit card required

**Pay-as-you-go:** $2/1K events above 20K free — unlocks all chains, CSV export, Slack/email notifications, ops dashboard.

## CLI

```bash
kontext init                    # Initialize workspace
kontext login                   # Authenticate
kontext trace <attemptId>       # View payment lifecycle
kontext debug <attemptId>       # Debug failed payment
kontext logs                    # View stage events
```

## Ops Features

- **Dashboard** — 5 views: Needs Action, All Attempts, Failures, Billing, Health
- **Notifications** — Slack webhooks + email alerts on block/review/failure/refund
- **Export** — CSV and JSON with archetype/chain/state/date filters

## Monorepo

```
packages/
  core/      @kontext/core — AttemptLedger, policy engine, digest chain
  sdk/       kontext-sdk — hybrid client with stage APIs + provider adapters
  cli/       @kontext/cli — CLI commands
  demo/      @kontext/demo — interactive demo
  server/    @kontext/server — legacy API server
apps/
  api/       Cloud Run API — attempts, export, notifications
  web/       Next.js marketing site + ops dashboard
```

## Development

```bash
pnpm install && pnpm -r build && pnpm -r test
```

## License

MIT

---

Kontext provides payment lifecycle management tools with built-in compliance checks. Regulatory responsibility remains with the operator. This software does not constitute legal advice. Consult qualified legal counsel for compliance obligations.

Built by [Legaci Labs](https://www.getkontext.com)
