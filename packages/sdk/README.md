# kontext-sdk

Payment lifecycle SDK for modern fintech. Track every payment from intent to reconciliation.

**8-Stage Lifecycle** . **Policy Engine** . **6 Provider Adapters** . **Zero Dependencies**

---

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

// Start a payment attempt
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

// Authorize — runs policy engine (OFAC, limits, blocklists)
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

// Track the payment lifecycle
await ctx.broadcast(attempt.attemptId, '0xTxHash...');
await ctx.confirm(attempt.attemptId, { txHash: '0xTxHash...', blockNumber: 12345 });
await ctx.credit(attempt.attemptId, { confirmedAt: new Date().toISOString() });
```

## SDK API

### Payment Lifecycle

```typescript
ctx.start(input)                          // Start attempt (stage: intent)
ctx.authorize(attemptId, input)           // Run policy engine (stage: authorize)
ctx.record(attemptId, stage, event)       // Append arbitrary stage event
ctx.broadcast(attemptId, txHash, chain?)  // Mark tx broadcast (stage: transmit)
ctx.confirm(attemptId, confirmation)      // Mark tx confirmed (stage: confirm)
ctx.credit(attemptId, evidence)           // Mark recipient credited
ctx.fail(attemptId, reason, stage?)       // Mark stage failed
ctx.refund(attemptId, data)               // Record refund
```

### Query

```typescript
ctx.get(attemptId)         // Get attempt by ID
ctx.list(filter?)          // List with filters (archetype, chain, state, date range)
```

### Workspace

```typescript
ctx.profile()              // Get workspace profile
ctx.configure(profile)     // Set workspace profile
```

### Lifecycle

```typescript
ctx.flush()                // Persist to storage
ctx.destroy()              // Clean up
```

## 8-Stage Payment Lifecycle

```
intent -> authorize -> prepare -> transmit -> confirm -> recipient_credit -> reconcile -> retry_or_refund
```

## Provider Adapters

```typescript
import { EVMAdapter, BridgeAdapter, ModernTreasuryAdapter } from 'kontext-sdk';

const adapter = new EVMAdapter();
const stageEvent = adapter.normalizeEvent(providerEvent);
await ctx.record(attemptId, stageEvent.stage, stageEvent);
```

| Adapter | Provider | Stages |
|---------|----------|--------|
| `EVMAdapter` | Ethereum, Base | transmit, confirm |
| `SolanaAdapter` | Solana | transmit, confirm |
| `CircleAdapter` | Circle Wallets | prepare, transmit, confirm |
| `X402Adapter` | x402 | intent, prepare, transmit, confirm |
| `BridgeAdapter` | Bridge.xyz | prepare, transmit, confirm, recipient_credit |
| `ModernTreasuryAdapter` | Modern Treasury | prepare, transmit, confirm, reconcile, retry_or_refund |

## Policy Engine

`authorize()` runs these checks:

- **OFAC Sanctions** — built-in SDN list, no API key
- **Amount Limits** — per-transaction and daily aggregate
- **Blocklists** — sender/recipient address blocking
- **Metadata Requirements** — archetype-specific (e.g., invoiceId for invoicing)

## Persistence

```typescript
import { Kontext } from 'kontext-sdk';

// File storage (default) — persists to .kontext/ directory
const ctx = Kontext.init({ projectId: 'my-app', environment: 'production' });

// In-memory — for tests
const ctx = Kontext.inMemory({ projectId: 'test', environment: 'development' });
```

## License

MIT

---

Kontext provides payment lifecycle management tools. Regulatory responsibility remains with the operator.

Built by [Legaci Labs](https://www.getkontext.com)
