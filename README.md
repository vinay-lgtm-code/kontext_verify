# kontext

The trust layer for agentic stablecoin and fiat payments.

Cryptographic verifiable intent for org-wide payments using one line of code and a CLI.

```bash
npx kontext init
```

```typescript
import { Kontext, withKontextCompliance } from 'kontext-sdk';

const kontext = Kontext.init();
const client = withKontextCompliance(walletClient, kontext);
// Every stablecoin transfer is now verified automatically
```

## What it does

When your agent sends USDC, Kontext captures cryptographic proof that the payment was intended, screened, and logged. Every transfer gets OFAC screening, a tamper-evident audit trail, and a trust score. The org's compliance officer can export the full chain of evidence at any time.

Two layers of coverage:
- **Code wrap** -- `withKontextCompliance()` intercepts `sendTransaction`/`writeContract` on your viem client
- **Chain listener** -- SDK watches monitored wallets on-chain for all outgoing stablecoin transfers, regardless of source

## Packages

| Package | Registry | Description |
|---------|----------|-------------|
| [`kontext-sdk`](packages/sdk/) | [npm](https://www.npmjs.com/package/kontext-sdk) | TypeScript SDK -- zero runtime deps |
| [`@kontext-sdk/cli`](packages/cli/) | [npm](https://www.npmjs.com/package/@kontext-sdk/cli) | CLI -- `npx kontext init`, `kontext verify`, MCP server |
| [`kontext-sdk`](packages/python-client/) | [PyPI](https://pypi.org/project/kontext-sdk/) | Python client -- sync/async HTTP bindings |

## Quick start

```bash
# 1. Initialize your project
npx kontext init

# 2. Install the SDK
npm install kontext-sdk

# 3. Wrap your client (2 lines)
```

```typescript
const kontext = Kontext.init();  // reads kontext.config.json
const client = withKontextCompliance(walletClient, kontext);
```

Or use `verify()` directly for explicit control:

```typescript
const result = await kontext.verify({
  txHash: '0xabc...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xAgent...',
  to: '0xMerchant...',
  agentId: 'payment-agent',
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

Works with Claude Code, Cursor, and Windsurf.

## Development

```bash
pnpm install && pnpm -r build && pnpm -r test
```

## License

MIT

---

Built by [Legaci Labs](https://www.getkontext.com)
