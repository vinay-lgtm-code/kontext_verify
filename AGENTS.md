# AGENTS.md — Kontext SDK

> How AI coding assistants should integrate with Kontext.

## What Kontext Does

Kontext is a TypeScript SDK providing trust infrastructure for AI agents that move money. It handles compliance audit trails, OFAC screening, trust scoring, on-chain anchoring, and agent-to-agent attestation for autonomous wallet transfers.

**Package:** `kontext-sdk` on npm
**Version:** 0.7.0
**License:** MIT
**Runtime dependencies:** Zero
**Node.js:** >= 18.0.0

## MCP Server

Kontext exposes an MCP (Model Context Protocol) server for AI coding assistants.

### Setup

Add to your MCP configuration (Claude Code, Cursor, Windsurf):

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

### Available MCP Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `verify_transaction` | Run compliance check + log transaction + get digest proof | Before or after any financial transfer |
| `check_sanctions` | OFAC sanctions screening for an address | Before sending to a new address |
| `log_reasoning` | Log agent reasoning into digest chain | When making financial decisions |
| `get_trust_score` | Get agent trust score (0-100) | To evaluate agent reliability |
| `get_compliance_certificate` | Export compliance certificate | For audit reporting |
| `anchor_digest` | Anchor terminal digest on-chain (Base) | For immutable proof of compliance |
| `exchange_attestation` | A2A compliance attestation with counterparty | When two agents transact |
| `verify_audit_trail` | Verify digest chain integrity | To confirm no tampering |

## Preferred Integration Pattern

### 1. Initialize (no API key needed for local mode)

```typescript
import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-project',
  environment: 'development',
});
```

### 2. Verify every financial transaction

```typescript
const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'payment-agent-v2',
});

if (!result.compliant) {
  // Block the transfer
  console.warn('Blocked:', result.checks.filter(c => !c.passed));
  return;
}
```

### 3. Log agent reasoning for auditability

```typescript
await ctx.logReasoning({
  agentId: 'payment-agent-v2',
  action: 'approve-transfer',
  reasoning: 'Transfer within daily limit. Recipient verified.',
  confidence: 0.95,
  context: { dailyTotal: '32000', recipientVerified: true },
});
```

### 4. Export audit trail

```typescript
const audit = await ctx.export({ format: 'json' });
const chain = ctx.verifyDigestChain();
// chain.valid === true means no tampering detected
```

## API Surface Summary

### Core Methods

- `ctx.verify(input)` — Compliance check + log + trust score + digest proof
- `ctx.log(input)` — Log any agent action
- `ctx.logTransaction(input)` — Log a financial transaction
- `ctx.logReasoning(input)` — Log agent decision reasoning

### Trust & Anomaly

- `ctx.getTrustScore(agentId)` — Score 0-100 with 5 factors
- `ctx.enableAnomalyDetection(config)` — Rule-based detection
- `ctx.onAnomaly(callback)` — React to anomalies

### Digest Chain (Tamper-Evidence)

- `ctx.getTerminalDigest()` — Current chain fingerprint
- `ctx.verifyDigestChain()` — Verify integrity
- `ctx.exportDigestChain()` — Export for external verification

### On-Chain Anchoring

- Pass `anchor` config to `ctx.verify()` to write digest to Base smart contract
- `verifyAnchor(rpcUrl, contract, digest)` — Zero-dependency verification

### A2A Attestation

- Pass `counterparty` config to `ctx.verify()` for bilateral attestation
- `fetchAgentCard(endpoint)` — Discover counterparty via `.well-known/kontext.json`

### Human-in-the-Loop

- `ctx.createTask(input)` — Create approval task
- `ctx.confirmTask(input)` — Submit evidence and confirm

### Audit Export

- `ctx.export({ format: 'json' })` — Export audit trail
- `ctx.generateComplianceCertificate(input)` — Compliance certificate with digest proof

## Error Handling

- `verify()` returns `result.compliant: false` for failed checks — never throws for compliance failures
- Plan-gated features throw descriptive errors with upgrade URLs
- All methods are async except `getTerminalDigest()`, `verifyDigestChain()`, `getActions()`

## Compliance Thresholds

| Threshold | Amount | Trigger |
|-----------|--------|---------|
| Travel Rule (EDD) | $3,000 | Enhanced due diligence required |
| Currency Transaction Report | $10,000 | CTR filing triggered |
| Large Transaction Alert | $50,000 | High-value monitoring |

## Supported Chains & Tokens

**Chains:** Base (free), Ethereum, Polygon, Arbitrum, Optimism, Arc, Avalanche, Solana (Pro)
**Tokens:** USDC, USDT, DAI, EURC

## Rules for AI Agents

1. **Always call `verify()` before executing financial transfers** — this is the single most important integration point.
2. **Log reasoning for every financial decision** — regulators will ask "why did your agent approve this?"
3. **Check `result.compliant` before proceeding** — never ignore compliance failures.
4. **Use the MCP server tools** when available — they handle initialization automatically.
5. **Amounts are strings** — pass `"5000"` not `5000` to avoid floating point issues.
6. **Chain names are lowercase** — `"base"`, `"ethereum"`, not `"Base"`, `"Ethereum"`.
7. **Agent IDs should be stable** — use consistent IDs like `"payment-agent-v2"` across sessions for accurate trust scoring.
8. **Never skip compliance for "small" amounts** — the $3,000 Travel Rule threshold applies to all transfers.

## Links

- Documentation: https://getkontext.com/docs
- GitHub: https://github.com/Legaci-Labs/kontext
- npm: https://www.npmjs.com/package/kontext-sdk
- LLM docs: https://getkontext.com/llms.txt
- Full LLM docs: https://getkontext.com/llms-full.txt
