# AGENTS.md — Kontext SDK

> How AI coding assistants should integrate with Kontext.

## What Kontext Does

Kontext is a TypeScript SDK providing payment lifecycle management for modern fintech. It tracks every payment from intent to reconciliation through an 8-stage lifecycle, runs a built-in policy engine (OFAC, amount limits, blocklists), and normalizes events from 6 provider adapters into a unified data model.

**Package:** `kontext-sdk` on npm
**License:** MIT
**Runtime dependencies:** Zero (peer: `@kontext/core`)
**Node.js:** >= 18.0.0

## Preferred Integration Pattern

### 1. Initialize

```typescript
import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-project',
  environment: 'development',
});
```

### 2. Start a payment attempt

```typescript
const attempt = await ctx.start({
  workspaceRef: 'ws_acme',
  appRef: 'invoicing-app',
  archetype: 'invoicing',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { companyId: 'acme-corp' },
  recipientRefs: { vendorId: 'vendor-123' },
  executionSurface: 'sdk',
});
```

### 3. Authorize (runs the policy engine)

```typescript
const { attempt: authorized, receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '5000',
  from: '0xSender',
  to: '0xRecipient',
  actorId: 'treasury-agent',
});

if (!receipt.allowed) {
  console.warn('Blocked:', receipt.violations);
  return;
}
```

### 4. Track lifecycle stages

```typescript
// Broadcast transaction
await ctx.broadcast(attempt.attemptId, '0xTxHash...');

// Confirm on-chain
await ctx.confirm(attempt.attemptId, {
  txHash: '0xTxHash...',
  blockNumber: 12345,
  confirmations: 12,
});

// Credit recipient
await ctx.credit(attempt.attemptId, {
  confirmedAt: new Date().toISOString(),
});
```

### 5. Query and export

```typescript
// Get attempt by ID
const a = await ctx.get(attempt.attemptId);

// List with filters
const pending = ctx.list({ finalState: 'pending' });

// Export via API
// GET /v1/export/attempts?format=csv
```

## API Surface Summary

### Payment Lifecycle

- `ctx.start(input)` — Start a new payment attempt (stage: intent)
- `ctx.authorize(attemptId, input)` — Run policy engine (OFAC, limits, blocklists)
- `ctx.record(attemptId, stage, event)` — Append arbitrary stage event
- `ctx.broadcast(attemptId, txHash)` — Mark transaction broadcast (stage: transmit)
- `ctx.confirm(attemptId, data)` — Mark transaction confirmed
- `ctx.credit(attemptId, evidence)` — Mark recipient credited
- `ctx.fail(attemptId, reason, stage?)` — Mark a stage as failed
- `ctx.refund(attemptId, data)` — Record a refund

### Query & Config

- `ctx.get(attemptId)` — Get attempt by ID
- `ctx.list(filter?)` — List attempts with filters
- `ctx.profile()` — Get workspace profile
- `ctx.configure(profile)` — Set workspace profile

### Lifecycle

- `ctx.flush()` — Persist to storage
- `ctx.destroy()` — Clean up resources

## 8-Stage Lifecycle

```
intent -> authorize -> prepare -> transmit -> confirm -> recipient_credit -> reconcile -> retry_or_refund
```

Each stage event has: `stage`, `status` (succeeded/failed/pending), `actorSide` (sender/recipient/provider/network/internal), `code`, `message`, `timestamp`, optional `payload`.

## Provider Adapters

6 adapters normalize provider-specific events into the unified lifecycle:

| Adapter | Provider | Stages Covered |
|---------|----------|----------------|
| `EVMAdapter` | Ethereum, Base, Polygon | transmit, confirm |
| `SolanaAdapter` | Solana | transmit, confirm |
| `CircleAdapter` | Circle Programmable Wallets | prepare, transmit, confirm |
| `X402Adapter` | x402 micropayments | intent, prepare, transmit, confirm |
| `BridgeAdapter` | Bridge.xyz (Stripe) | prepare, transmit, confirm, recipient_credit |
| `ModernTreasuryAdapter` | Modern Treasury | prepare, transmit, confirm, reconcile, retry_or_refund |

## Workspace Profiles

Archetype presets configure the policy engine per payment type:

| Archetype | Max TX | Daily Limit | Review Threshold |
|-----------|--------|-------------|------------------|
| `micropayments` | $100 | $10,000 | $50 |
| `treasury` | $25,000 | $100,000 | $10,000 |
| `invoicing` | $20,000 | $50,000 | $5,000 |
| `payroll` | $15,000 | $200,000 | $10,000 |
| `cross_border` | $10,000 | $25,000 | $3,000 |

## Policy Engine

The `authorize()` method runs these checks:

1. **OFAC Sanctions** — built-in SDN list, no API key required
2. **Amount Limits** — per-transaction and daily aggregate
3. **Blocklists** — sender and recipient address blocking
4. **Metadata Requirements** — archetype-specific required fields (e.g., invoiceId for invoicing)

Returns `{ allowed: boolean, violations: Violation[] }`.

## Rules for AI Agents

1. **Always call `authorize()` before executing financial transfers** — the policy engine prevents sanctioned/blocked/overlimit payments.
2. **Use `start()` at the beginning of every payment flow** — this creates the attempt and enables lifecycle tracking.
3. **Track stages as they happen** — `broadcast()`, `confirm()`, `credit()` in sequence.
4. **Amounts are strings** — pass `"5000"` not `5000` to avoid floating point issues.
5. **Chain names are lowercase** — `"base"`, `"ethereum"`, not `"Base"`.

## CLI Commands

```bash
kontext init                    # Initialize workspace profile
kontext login                   # Authenticate with Kontext Cloud
kontext trace <attemptId>       # View payment attempt lifecycle
kontext debug <attemptId>       # Debug a failed payment
kontext logs                    # View recent stage events
```

## Links

- Documentation: https://getkontext.com/docs
- GitHub: https://github.com/Legaci-Labs/kontext
- npm: https://www.npmjs.com/package/kontext-sdk
