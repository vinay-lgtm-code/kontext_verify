# kontext-sdk

The trust layer for agentic stablecoin and fiat payments.

Cryptographic verifiable intent for org-wide payments using one line of code and a CLI.

## Install

```bash
npm install kontext-sdk
```

## Auto-instrumentation (recommended)

```bash
npx kontext init
# Creates kontext.config.json with your wallets, tokens, chains, and compliance mode
```

```typescript
import { Kontext, withKontextCompliance } from 'kontext-sdk';

const kontext = Kontext.init();  // reads kontext.config.json
const client = withKontextCompliance(walletClient, kontext);

// Every USDC/USDT/DAI/EURC transfer is now auto-verified
await client.sendTransaction({ to: usdcAddress, data: transferCalldata });
```

Two interception layers for full coverage:
- **Code wrap** -- intercepts `sendTransaction`/`writeContract` on your viem client
- **Chain listener** -- watches monitored wallets on-chain for all outgoing stablecoin transfers

## Explicit verify

For direct control over individual transactions:

```typescript
import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-agent' });

const result = await ctx.verify({
  txHash: '0xabc...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xAgent...',
  to: '0xMerchant...',
  agentId: 'payment-agent',
});

// result.compliant -- true/false
// result.checks -- OFAC, Travel Rule, CTR thresholds
// result.riskLevel -- low | medium | high | critical
// result.digestProof -- tamper-evident SHA-256 chain
```

## What's verified

Every stablecoin transfer gets:
- OFAC sanctions screening (built-in SDN list, no API key)
- Travel Rule threshold detection ($3K EDD, $10K CTR, $50K large tx)
- Tamper-evident audit trail (patented digest chain)
- Agent trust score (0-100)
- Compliance certificate with SHA-256 proof

## Pluggable screening

Bring your own providers or use the built-in OFAC list:

```typescript
import { ScreeningAggregator, OFACAddressProvider, OpenSanctionsProvider } from 'kontext-sdk';

const screener = new ScreeningAggregator({
  providers: [
    new OFACAddressProvider(),                          // built-in, free
    new OpenSanctionsProvider({ apiKey: 'os_...' }),    // 331+ sources
  ],
  consensus: 'ANY_MATCH',
});
```

## Agent reasoning

```typescript
await ctx.logReasoning({
  agentId: 'payment-agent',
  action: 'approve-transfer',
  reasoning: 'Amount within daily limit. Recipient on allowlist.',
  confidence: 0.95,
});
```

## MCP server

```json
{
  "mcpServers": {
    "kontext": {
      "command": "npx",
      "args": ["-y", "@kontext-sdk/cli", "mcp"]
    }
  }
}
```

## Zero runtime dependencies

The SDK has no `dependencies`. Works in Node.js 18+, TypeScript 5.0+.

## License

MIT

---

Built by [Legaci Labs](https://www.getkontext.com)
