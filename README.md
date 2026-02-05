<p align="center">
  <strong>Kontext</strong><br/>
  Trust &amp; compliance infrastructure for agentic stablecoin transactions
</p>

<p align="center">
  <a href="https://www.getkontext.com/docs">Docs</a> &middot;
  <a href="https://www.getkontext.com">Website</a> &middot;
  <a href="https://www.getkontext.com/blog/introducing-kontext">Blog</a>
</p>

---

AI agents are moving real money. Kontext gives them an audit trail.

Kontext is a TypeScript SDK that logs agent actions, scores trust, detects anomalies, and exports compliance-ready audit data — built for USDC, Base, Ethereum, and the GENIUS Act era.

```bash
npm install @kontext/sdk
```

```typescript
import { Kontext } from '@kontext/sdk';

const ctx = Kontext.init({
  projectId: 'my-project',
  environment: 'production',
});

// Log a USDC transfer
await ctx.logTransaction({
  txHash: '0xabc...',
  chain: 'base',
  amount: '500.00',
  token: 'USDC',
  from: '0xSender...',
  to: '0xReceiver...',
  agentId: 'payment-agent',
});

// Check trust score
const score = await ctx.getTrustScore('payment-agent');
console.log(score.score); // 87/100

// Verify digest chain integrity
const result = ctx.verifyDigestChain();
console.log(result.valid); // true — no tampering
```

## Why

Agents are executing transfers, approvals, and settlements autonomously. Most teams track this with console logs. That's not going to work when regulators come knocking.

Kontext adds structured logging, tamper-evident audit trails, anomaly detection, and trust scoring to any agent workflow — in a few lines of code.

## Features

| Feature | What it does |
|---|---|
| **Action Logging** | Structured audit trail for every agent action with timestamps, correlation IDs, and metadata |
| **Digest Chain** | Rolling SHA-256 hash chain — tamper with any past event and verification fails |
| **Task Confirmation** | Human-in-the-loop approval for high-value actions with evidence requirements |
| **Trust Scoring** | Per-agent trust scores based on transaction patterns, consistency, and compliance |
| **Anomaly Detection** | Flag unusual amounts, velocity spikes, new destinations, off-hours activity, rapid succession |
| **Audit Export** | Export to JSON or CSV with date range, agent, and type filters |
| **USDC Compliance** | Pre-built checks for USDC on Base, Ethereum, Polygon, Arbitrum, and Optimism |

## Quick start

### 1. Install

```bash
npm install @kontext/sdk
# or
pnpm add @kontext/sdk
```

### 2. Initialize

```typescript
import { Kontext } from '@kontext/sdk';

// Local mode — no API key, no external dependencies
const ctx = Kontext.init({
  projectId: 'my-agent-project',
  environment: 'development',
});
```

### 3. Log actions

```typescript
// Log any agent action
await ctx.log({
  type: 'approval',
  description: 'Agent approved vendor payment',
  agentId: 'finance-agent',
  metadata: { vendor: 'acme-corp', invoiceId: 'inv_123' },
});

// Log a transaction with chain details
await ctx.logTransaction({
  txHash: '0xabc123...',
  chain: 'base',
  amount: '2500.00',
  token: 'USDC',
  from: '0xTreasury...',
  to: '0xVendor...',
  agentId: 'finance-agent',
});
```

### 4. Track tasks

```typescript
// Create a task requiring evidence
const task = await ctx.createTask({
  description: 'Transfer 2500 USDC to vendor',
  agentId: 'finance-agent',
  requiredEvidence: ['txHash', 'receipt'],
});

// Confirm with evidence
await ctx.confirmTask({
  taskId: task.id,
  evidence: {
    txHash: '0xabc123...',
    receipt: { status: 'confirmed', blockNumber: 18234567 },
  },
});
```

### 5. Score trust & detect anomalies

```typescript
// Get agent trust score
const score = await ctx.getTrustScore('finance-agent');
console.log(`${score.level}: ${score.score}/100`);

// Enable anomaly detection
ctx.enableAnomalyDetection({
  rules: ['unusualAmount', 'frequencySpike', 'newDestination', 'rapidSuccession'],
  thresholds: { maxAmount: '10000', maxFrequency: 50 },
});

ctx.onAnomaly((anomaly) => {
  console.warn(`[${anomaly.severity}] ${anomaly.description}`);
});
```

### 6. Export audit data

```typescript
const audit = await ctx.export({
  format: 'json',
  dateRange: { start: new Date('2026-01-01'), end: new Date() },
  includeTasks: true,
  includeAnomalies: true,
});

console.log(`Exported ${audit.recordCount} records`);
console.log(`Terminal digest: ${audit.terminalDigest}`);
```

## Digest chain

Every action logged through Kontext gets a cryptographic digest that chains to all prior actions:

```
H_D = SHA-256(H_{D-1} || Serialize(E_D) || S_D)
```

- **H_D** — current digest
- **H_{D-1}** — prior digest (genesis hash for first event)
- **E_D** — serialized event data
- **S_D** — salt from microsecond-precision timestamp

Tamper with any past event and the chain breaks. Export it for independent third-party verification:

```typescript
const chain = ctx.exportDigestChain();
// { genesisHash, links, terminalDigest }

// Third party can verify independently
import { verifyExportedChain } from '@kontext/sdk';
const result = verifyExportedChain(chain, actions);
console.log(result.valid); // true
```

## Integrations

Kontext works with any agent framework and has first-class support for:

- **USDC** — compliance checks for Circle's stablecoin across EVM chains
- **x402** — HTTP-native micropayment verification
- **Google UCP / A2A** — agent-to-agent transaction trust scoring
- **Stripe** — agentic commerce payment verification

See the [integration docs](https://www.getkontext.com/docs#usdc) for code examples.

## Architecture

```
packages/
  sdk/       @kontext/sdk — core TypeScript SDK (npm package)
  server/    API server (Hono on GCP Cloud Run)
  demo/      Interactive demo showing all features
apps/
  web/       Marketing site & docs (Next.js)
```

## Development

```bash
# Install dependencies
npx pnpm install

# Build all packages
npx pnpm build

# Run tests (44 tests across 3 suites)
npx pnpm test

# Run the interactive demo
npx pnpm demo

# Start the API server
npx pnpm dev:server

# Start the website
npx pnpm --filter web dev
```

## Open source vs Pro

| | Open Source | Pro |
|---|---|---|
| Action logging | Local file output | Cloud API |
| Digest chain | Full | Full |
| Anomaly detection | Rule-based | Rule-based + ML |
| Trust scoring | Local | Historical + trends |
| Audit export | JSON, CSV | JSON, CSV, templates |
| Chain support | Single | Multi-chain |
| Support | GitHub Issues | Email (24h SLA) |

The open-source SDK is fully functional with no usage limits. Run it self-hosted, no API key needed. [Pricing details](https://www.getkontext.com/pricing).

## License

MIT

---

<p align="center">
  Built by <a href="https://www.getkontext.com/about">Kontext</a>
</p>
