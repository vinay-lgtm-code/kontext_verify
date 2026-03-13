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

### Agent Provenance

Three layers of accountability: session delegation, action binding, and human attestation.

```typescript
// Layer 1: Session delegation — record who authorized the agent
const session = await ctx.createAgentSession({
  agentId: 'treasury-agent',
  delegatedBy: 'user:vinay',
  scope: ['transfer', 'approve'],
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
});

// Layer 2: Action binding — tie every call to the session
const result = await ctx.verify({
  txHash: '0xabc...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xAgent...',
  to: '0xMerchant...',
  agentId: 'treasury-agent',
  sessionId: session.sessionId,
});

// Layer 3: Human attestation — reviewer signs off
const checkpoint = await ctx.createCheckpoint({
  sessionId: session.sessionId,
  actionIds: [result.transaction.id],
  summary: 'Reviewed $5K transfer to known vendor',
});

await ctx.attestCheckpoint({
  checkpointId: checkpoint.checkpointId,
  attestedBy: 'compliance@company.com',
  signature: reviewerSignature,
});

// End session, list sessions, list checkpoints
await ctx.endAgentSession(session.sessionId);
const sessions = ctx.getAgentSessions('treasury-agent');
const checkpoints = ctx.getCheckpoints(session.sessionId);
```

#### CLI Commands

```bash
npx kontext-sdk session create --agent treasury-agent --delegated-by user:vinay --scope transfer,approve
npx kontext-sdk session list --agent treasury-agent
npx kontext-sdk session end <sessionId>
npx kontext-sdk checkpoint create --session <sessionId> --actions act_1,act_2 --summary "Reviewed transfers"
npx kontext-sdk checkpoint attest <checkpointId> --attested-by compliance@company.com
npx kontext-sdk checkpoint list --session <sessionId>
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

## Auto-Instrumentation (viem)

Run `npx kontext init` to generate a config file, then wrap your viem client — every stablecoin transfer is automatically logged.

```bash
npx kontext init
# Wizard asks: project name, agent ID, wallets to monitor, tokens, chains, mode
# Creates kontext.config.json
```

```typescript
import { Kontext, withKontextCompliance } from 'kontext-sdk';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

const kontext = Kontext.init();  // reads kontext.config.json
const client = withKontextCompliance(
  createWalletClient({ chain: base, transport: http() }),
  kontext,
);

// Every USDC/USDT/DAI/EURC transfer now auto-logged with compliance proof
await client.sendTransaction({ to: USDC_ADDRESS, data: transferCalldata });
```

**Two interception layers:**
- **Code wrap:** `withKontextCompliance()` intercepts `sendTransaction`/`writeContract` calls. Can block pre-send if non-compliant.
- **Chain listener:** SDK watches monitored wallet addresses on-chain for ERC-20 Transfer events — catches ALL outgoing stablecoin transfers regardless of origin.

## Pluggable Sanctions Screening

Multi-provider screening with consensus strategies. Bring your own API keys, or use the built-in OFAC SDN list at zero cost.

```typescript
import {
  ScreeningAggregator,
  OFACAddressProvider,
  UKOFSIProvider,
  OpenSanctionsProvider,
  ChainalysisOracleProvider,
} from 'kontext-sdk';

const screener = new ScreeningAggregator({
  providers: [
    new OFACAddressProvider(),                             // built-in, no API key
    new UKOFSIProvider(),                                  // built-in, no API key
    new OpenSanctionsProvider({ apiKey: 'os_...' }),       // 331+ sources
    new ChainalysisOracleProvider({ apiKey: 'ch_...' }),   // on-chain oracle
  ],
  consensus: 'ANY_MATCH',
});

const result = await screener.screenAddress('0x...');
// result.flagged = true/false
// result.matches = [{ provider, list, matchType, confidence, ... }]
// result.providerResults = per-provider breakdown
```

**Built-in providers (no API key):** OFAC SDN addresses, UK OFSI addresses
**API providers:** OpenSanctions (address + entity), Chainalysis Oracle (address), Chainalysis Free API (address)
**Local providers:** OpenSanctions local dataset (download via `kontext sync`)

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
- Pluggable multi-provider screening (OFAC, UK OFSI, OpenSanctions, Chainalysis)
- Compliance certificates with SHA-256 proof
- Agent reasoning logs
- Trust scoring and anomaly detection
- Agent provenance — session delegation, action binding, human attestation
- MCP server mode for AI coding tools
- Zero runtime dependencies

## License

MIT

---

Kontext provides compliance logging tools. Regulatory responsibility remains with the operator. This software does not constitute legal advice and does not guarantee regulatory compliance. Consult qualified legal counsel for your specific obligations.

Built by [Legaci Labs](https://www.getkontext.com)
