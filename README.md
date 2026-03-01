# kontext

Compliance audit trail for AI agents making stablecoin payments on Base.

**USDC** · **USDT** · **DAI** · **EURC** · **USDP** · **USDG** · **x402** · **Circle Programmable Wallets** · **Patented Technology**

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

Add to your MCP config:

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

## Commands

### `kontext check` — stateless compliance check

```bash
npx kontext-sdk check 0xSender 0xReceiver --amount 5000 --token USDC
```

Instant OFAC screening + threshold checks. No state, no persistence.

### `kontext verify` — log + check + digest proof

```bash
npx kontext-sdk verify --tx 0xabc123 --amount 5000 --token USDC \
  --from 0xAgent --to 0xMerchant --agent my-bot
```

Runs compliance checks, logs the transaction, and appends to the tamper-evident digest chain. Persists to `.kontext/` in the current directory.

### `kontext reason` — log agent reasoning

```bash
npx kontext-sdk reason "API returned data I need. Price within budget." \
  --agent my-bot --session sess_abc --step 1
```

When regulators ask "why did your agent approve this?" — you have the answer.

### `kontext cert` — export compliance certificate

```bash
npx kontext-sdk cert --agent my-bot --output cert.json
```

Generates a certificate with action count, trust score, chain validity, and SHA-256 content hash.

### `kontext audit` — verify digest chain integrity

```bash
npx kontext-sdk audit --verify
```

Walks the full digest chain and verifies every link. Detects any tampering.

### `kontext mcp` — MCP server mode

```bash
npx kontext-sdk mcp
```

Starts an MCP server on stdio exposing compliance tools to Claude Code, Cursor, and Windsurf.

### Flags

- `--json` on any command outputs structured JSON instead of human-readable text
- `--amount <number>` transaction amount in token units
- `--token <symbol>` one of USDC, USDT, DAI, EURC, USDP, USDG

## x402 Agent Flow

```typescript
// Agent hits an API, gets 402 Payment Required
const quote = await fetch('https://api.example.com/data');
// 402: { amount: "0.50", token: "USDC", to: "0xMerchant...", network: "base" }

// Agent decides to pay — LOG THE REASONING
await exec('npx kontext-sdk reason "Price within budget. Merchant not sanctioned." --agent weather-bot');

// Agent pays via Circle Programmable Wallet
const tx = await circleWallet.sendPayment({ amount: "0.50", token: "USDC", to: "0xMerchant..." });

// LOG THE PAYMENT + RUN COMPLIANCE CHECKS
await exec(`npx kontext-sdk verify --tx ${tx.hash} --amount 0.50 --token USDC --from 0xAgent --to 0xMerchant --agent weather-bot`);

// End of session — EXPORT PROOF
await exec('npx kontext-sdk cert --agent weather-bot -o compliance.json');
```

## SDK — Programmatic Usage

The CLI wraps the SDK. For tighter integration, use it directly:

```bash
npm install kontext-sdk
```

```typescript
import { Kontext, FileStorage } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-agent',
  environment: 'production',
  storage: new FileStorage('.kontext'),
});

// One-call compliance check + transaction log + digest proof
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

// Log reasoning
await ctx.logReasoning({
  agentId: 'payment-agent',
  action: 'approve-transfer',
  reasoning: 'Price within budget. Merchant verified.',
  confidence: 0.95,
});

// Generate compliance certificate
const cert = await ctx.generateComplianceCertificate({
  agentId: 'payment-agent',
  includeReasoning: true,
});

// Verify digest chain
const chain = ctx.verifyDigestChain();
console.log(chain.valid); // true — no tampering
```

## Agent Provenance

Three layers of accountability for autonomous agents: session delegation, action binding, and human attestation.

### CLI Commands

```bash
# Create a session — record who authorized the agent
npx kontext-sdk session create --agent treasury-agent --delegated-by user:vinay --scope transfer,approve

# List active sessions
npx kontext-sdk session list --agent treasury-agent

# End a session
npx kontext-sdk session end <sessionId>

# Create a checkpoint referencing specific actions
npx kontext-sdk checkpoint create --session <sessionId> --actions act_1,act_2 --summary "Reviewed transfers"

# Attest a checkpoint (human signs off)
npx kontext-sdk checkpoint attest <checkpointId> --attested-by compliance@company.com

# List checkpoints for a session
npx kontext-sdk checkpoint list --session <sessionId>
```

### SDK Usage

```typescript
// Layer 1: Session delegation — who authorized the agent
const session = await ctx.createAgentSession({
  agentId: 'treasury-agent',
  delegatedBy: 'user:vinay',
  scope: ['transfer', 'approve'],
});

// Layer 2: Action binding — tie every call to the session
const result = await ctx.verify({
  ...txData,
  sessionId: session.sessionId,
});

// Layer 3: Human attestation — reviewer signs off
const checkpoint = await ctx.createCheckpoint({
  sessionId: session.sessionId,
  actionIds: [result.transaction.id],
  summary: 'Reviewed $5K transfer',
});

await ctx.attestCheckpoint({
  checkpointId: checkpoint.checkpointId,
  attestedBy: 'compliance@company.com',
  signature: reviewerSignature,
});
```

## Compliance Thresholds

| Threshold | Amount | Trigger |
|-----------|--------|---------|
| **EDD / Travel Rule** | $3,000 | Enhanced Due Diligence required |
| **CTR** | $10,000 | Currency Transaction Report |
| **Large TX Alert** | $50,000 | Large Transaction Alert |

All thresholds are hardcoded for the GENIUS Act era. OFAC sanctions screening uses the built-in SDN list — no API key required.

## What This Is

- Tamper-evident audit trail for AI agent payments (patented digest chain)
- OFAC sanctions screening against the SDN list
- Compliance certificates with cryptographic proof
- Agent reasoning logs — why the agent approved each transaction
- Trust scoring and anomaly detection
- Agent provenance — session delegation, action binding, human attestation
- Zero runtime dependencies. Zero config. It just runs.

## What This Is Not

- Not a KYA (Know Your Agent) platform — [Sumsub](https://sumsub.com) and [Vouched](https://vouched.id) do that
- Not a blockchain analytics tool — [Chainalysis](https://chainalysis.com) does that at $100K+/yr
- Not a wallet provider — [Circle](https://circle.com) does that
- Not a payment protocol — [x402](https://www.x402.org) does that

Kontext fills the gap between the wallet and the regulator.

## Monorepo

```
packages/
  sdk/       kontext-sdk — CLI + SDK (npm package)
  server/    API server (Hono on GCP Cloud Run)
  demo/      CLI demo
```

## Development

```bash
pnpm install && pnpm -r build && pnpm -r test
```

## License

MIT

---

Kontext provides compliance logging tools. Regulatory responsibility remains with the operator. This software does not constitute legal advice and does not guarantee regulatory compliance. Consult qualified legal counsel for your specific obligations.

Built by [Legaci Labs](https://www.getkontext.com)
