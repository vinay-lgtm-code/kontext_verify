# kontext

Payment lifecycle management for modern fintech.

**8-Stage Lifecycle** . **Policy Engine** . **6 Provider Adapters** . **Zero Dependencies** . **MIT Licensed**

---

## 30-Second Demo

```bash
npx tsx packages/cli/src/cli.ts init
```

```
Workspace initialized: ws_default
Archetype: treasury
Chain: base
Asset: USDC
Policy: maxTx $25,000 | daily $100,000 | review > $10,000
```

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

// 1. Start a payment attempt
const attempt = await ctx.start({
  workspaceRef: 'ws_acme',
  appRef: 'invoicing',
  archetype: 'invoicing',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { companyId: 'acme' },
  recipientRefs: { vendorId: 'v-123' },
  executionSurface: 'sdk',
});

// 2. Authorize — runs OFAC, amount limits, blocklists
const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '5000',
  from: '0xSender',
  to: '0xRecipient',
  actorId: 'treasury-agent',
});

if (!receipt.allowed) {
  console.log('Blocked:', receipt.violations);
  return;
}

// 3. Track the lifecycle
await ctx.broadcast(attempt.attemptId, '0xTxHash...');
await ctx.confirm(attempt.attemptId, { txHash: '0xTxHash...', blockNumber: 12345 });
await ctx.credit(attempt.attemptId, { confirmedAt: new Date().toISOString() });
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
- **Blocklists** — sender and recipient address blocking
- **Metadata Requirements** — archetype-specific required fields

Returns `{ allowed: boolean, violations: Violation[] }`.

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

Kontext provides payment lifecycle management tools. Regulatory responsibility remains with the operator. This software does not constitute legal advice. Consult qualified legal counsel for compliance obligations.

Built by [Legaci Labs](https://www.getkontext.com)
