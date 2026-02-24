# kontext-sdk

Compliance audit trail CLI and SDK for AI agents making stablecoin payments on Base.

**USDC** · **USDT** · **DAI** · **EURC** · **USDP** · **USDG** · **x402** · **Circle Programmable Wallets**

---

## 30-Second Demo

```bash
npx kontext-sdk check 0xAgentWallet 0xMerchant --amount 5000 --token USDC
```

```
OFAC Sanctions:  CLEAR
Travel Rule:     TRIGGERED ($5,000 >= $3,000 EDD threshold)
CTR Threshold:   CLEAR ($5,000 < $10,000)
Large TX Alert:  CLEAR ($5,000 < $50,000)
Risk Level:      medium
```

No install. No config. No API key. One command.

## Install

```bash
npm install -g kontext-sdk
```

Then run `kontext` from anywhere. Or use `npx kontext-sdk` for one-off checks.

## Claude Code / Cursor / Windsurf

```json
{
  "mcpServers": {
    "kontext": {
      "command": "npx",
      "args": ["-y", "kontext-sdk", "mcp"]
    }
  }
}
```

Then ask: *"verify this USDC transaction for compliance"*

## CLI Commands

### `kontext check <from> <to>` — stateless compliance check

```bash
npx kontext-sdk check 0xSender 0xReceiver --amount 5000 --token USDC
```

Instant OFAC screening + threshold checks. No state, no persistence.

### `kontext verify` — log + check + digest proof

```bash
npx kontext-sdk verify --tx 0xabc123 --amount 5000 --token USDC \
  --from 0xAgent --to 0xMerchant --agent my-bot
```

Runs compliance checks, logs the transaction, appends to the tamper-evident digest chain. Persists to `.kontext/` in the current directory.

### `kontext reason` — log agent reasoning

```bash
npx kontext-sdk reason "API returned data I need. Price within budget." \
  --agent my-bot --session sess_abc --step 1
```

### `kontext cert` — export compliance certificate

```bash
npx kontext-sdk cert --agent my-bot --output cert.json
```

### `kontext audit` — verify digest chain integrity

```bash
npx kontext-sdk audit --verify
```

### `kontext mcp` — MCP server mode

```bash
npx kontext-sdk mcp
```

Starts an MCP server on stdio for Claude Code, Cursor, and Windsurf.

### Flags

- `--json` on any command outputs structured JSON
- `--amount <number>` transaction amount in token units
- `--token <symbol>` one of USDC, USDT, DAI, EURC, USDP, USDG

## SDK — Programmatic Usage

For tighter integration, use the SDK directly:

```typescript
import { Kontext, FileStorage } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-agent',
  environment: 'production',
  storage: new FileStorage('.kontext'),
});

// One-call: compliance check + transaction log + digest proof
const result = await ctx.verify({
  txHash: '0xabc...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xAgent...',
  to: '0xMerchant...',
  agentId: 'payment-agent',
});

// result.compliant = true/false
// result.checks = [{ name: 'OFAC Sanctions', passed: true }, ...]
// result.riskLevel = 'low' | 'medium' | 'high' | 'critical'
// result.digestProof = 'sha256:a1b2c3...'
```

### Log Reasoning

```typescript
await ctx.logReasoning({
  agentId: 'payment-agent',
  action: 'approve-transfer',
  reasoning: 'Price within budget. Merchant verified.',
  confidence: 0.95,
});
```

### Compliance Certificate

```typescript
const cert = await ctx.generateComplianceCertificate({
  agentId: 'payment-agent',
  includeReasoning: true,
});
```

### Trust Score

```typescript
const score = await ctx.getTrustScore('payment-agent');
// score.score = 87, score.level = 'high'
```

### Verify Digest Chain

```typescript
const chain = ctx.verifyDigestChain();
console.log(chain.valid); // true — no tampering
```

### Persist Across Restarts

```typescript
import { FileStorage } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-agent',
  environment: 'production',
  storage: new FileStorage('.kontext'),
});

// Data persists to .kontext/ directory
// Call ctx.flush() to write, ctx.restore() to reload
```

## Compliance Thresholds

| Threshold | Amount | Trigger |
|-----------|--------|---------|
| **EDD / Travel Rule** | $3,000 | Enhanced Due Diligence required |
| **CTR** | $10,000 | Currency Transaction Report |
| **Large TX Alert** | $50,000 | Large Transaction Alert |

OFAC sanctions screening uses the built-in SDN list. No API key required.

## What's Included

- Tamper-evident audit trail (patented digest chain)
- OFAC sanctions screening (SDN list, no API key)
- Compliance certificates with SHA-256 proof
- Agent reasoning logs
- Trust scoring and anomaly detection
- MCP server mode for AI coding tools
- Zero runtime dependencies

## License

MIT

---

Kontext provides compliance logging tools. Regulatory responsibility remains with the operator. This software does not constitute legal advice and does not guarantee regulatory compliance. Consult qualified legal counsel for your specific obligations.

Built by [Legaci Labs](https://www.getkontext.com)
