# @kontext/sdk

Trust and compliance layer for agentic crypto workflows.

Kontext provides structured action logging, tamper-evident audit trails, trust scoring, anomaly detection, and compliance tooling for AI agents operating in crypto and stablecoin ecosystems.

## Install

```bash
npm install @kontext/sdk
```

## Quick Start

```typescript
import { Kontext } from '@kontext/sdk';

// Initialize in local mode (no API key needed)
const kontext = Kontext.init({
  projectId: 'my-project',
  environment: 'development',
});

// Log an agent action
await kontext.log({
  type: 'transfer',
  description: 'Agent initiated USDC transfer',
  agentId: 'payment-agent-1',
});

// Log a transaction with full chain details
await kontext.logTransaction({
  txHash: '0xabc...',
  chain: 'base',
  amount: '100',
  token: 'USDC',
  from: '0xSender...',
  to: '0xReceiver...',
  agentId: 'payment-agent-1',
});

// Get trust score for an agent
const score = await kontext.getTrustScore('payment-agent-1');
console.log(`Trust: ${score.score}/100 (${score.level})`);

// Export audit data
const audit = await kontext.export({ format: 'json' });

// Verify digest chain integrity
const verification = kontext.verifyDigestChain();
console.log(`Chain valid: ${verification.valid}`);
```

## Features

- **Action Logging** -- Structured logging for all agent actions with timestamps, correlation IDs, and metadata.
- **Transaction Tracking** -- Full chain details for crypto transactions across Base, Ethereum, Polygon, Arbitrum, and Optimism.
- **Tamper-Evident Digest Chain** -- Rolling SHA-256 digest chain that detects any modification to the audit trail.
- **Trust Scoring** -- Rule-based trust scores for agents based on history, task completion, anomaly rate, and consistency.
- **Anomaly Detection** -- Configurable rules for unusual amounts, frequency spikes, new destinations, off-hours activity, rapid succession, and round amounts.
- **Task Confirmation** -- Evidence-based task tracking with required proof for completion.
- **USDC Compliance** -- Pre-built compliance checks aligned with stablecoin regulatory requirements across all supported chains.
- **CCTP Integration** -- Cross-chain transfer tracking for Circle's Cross-Chain Transfer Protocol with full lifecycle management.
- **Webhook Notifications** -- Event-driven webhooks for anomalies, task updates, and trust score changes with retry logic.
- **Audit Export** -- JSON and CSV export with date range and entity filtering.
- **SAR/CTR Templates** -- Structured report templates for suspicious activity and currency transaction reporting.

## Supported Chains

| Chain    | USDC Contract | CCTP Domain |
|----------|---------------|-------------|
| Ethereum | 0xA0b8...eB48 | 0           |
| Base     | 0x8335...2913 | 6           |
| Polygon  | 0x3c49...3359 | 7           |
| Arbitrum | 0xaf88...5831 | 3           |
| Optimism | 0x0b2C...Ff85 | 2           |

## Operating Modes

- **Local mode** (no API key): All data stored in-memory and optionally written to local JSON files. Suitable for development and open-source usage.
- **Cloud mode** (with API key): Data synced to Kontext API for persistent storage and advanced features.

```typescript
// Cloud mode
const kontext = Kontext.init({
  apiKey: 'sk_live_...',
  projectId: 'my-project',
  environment: 'production',
});
```

## Documentation

For full documentation, visit [getkontext.com](https://getkontext.com).

## License

MIT -- see [LICENSE](./LICENSE) for details.
