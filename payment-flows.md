# Kontext SDK -- Payment Flow Reference

Every payment and value-transfer flow supported by the Kontext SDK, documented with entry points, parameters, step-by-step execution, return types, integration points, and required plan tier.

---

## Table of Contents

1. [Transaction Logging (Core Client)](#1-transaction-logging-core-client)
2. [USDC Compliance Checking](#2-usdc-compliance-checking)
3. [OFAC Sanctions Screening](#3-ofac-sanctions-screening)
4. [CCTP V1 Cross-Chain Transfers](#4-cctp-v1-cross-chain-transfers)
5. [CCTP V2 Fast Transfers](#5-cctp-v2-fast-transfers)
6. [Circle Programmable Wallets](#6-circle-programmable-wallets)
7. [Circle Compliance Engine (Dual Screening)](#7-circle-compliance-engine-dual-screening)
8. [Gas Station (Sponsored Gas)](#8-gas-station-sponsored-gas)
9. [CFTC Letter 26-05 Compliance](#9-cftc-letter-26-05-compliance)
10. [Stripe Payment Logging](#10-stripe-payment-logging)
11. [x402 Protocol Payments](#11-x402-protocol-payments)
12. [Vercel AI SDK Integration](#12-vercel-ai-sdk-integration)
13. [SAR/CTR Report Generation](#13-sarctr-report-generation)
14. [Transaction Risk Evaluation](#14-transaction-risk-evaluation)
15. [Approval Policies (Human-in-the-Loop)](#15-approval-policies-human-in-the-loop)
16. [Integration Points Between Flows](#16-integration-points-between-flows)
17. [Plan Tier Requirements Summary](#17-plan-tier-requirements-summary)

---

## 1. Transaction Logging (Core Client)

**Entry point:** `Kontext.logTransaction(input)`

**File:** `packages/sdk/src/client.ts` (line 286)

**Tier:** Free for `base` chain; Pro for all other chains (multi-chain gating)

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `txHash` | `string` | Yes | On-chain transaction hash |
| `chain` | `Chain` | Yes | `'ethereum' \| 'base' \| 'polygon' \| 'arbitrum' \| 'optimism' \| 'arc' \| 'avalanche' \| 'solana'` |
| `amount` | `string` | Yes | Transfer amount (string to preserve precision) |
| `token` | `Token` | Yes | `'USDC' \| 'USDT' \| 'DAI' \| 'EURC'` |
| `from` | `string` | Yes | Sender address |
| `to` | `string` | Yes | Recipient address |
| `agentId` | `string` | Yes | Agent initiating the transaction |
| `metadata` | `Record<string, unknown>` | No | Additional key-value metadata |
| `correlationId` | `string` | No | Links related actions together |

### Step-by-step Execution

1. **Plan gating**: If `chain !== 'base'`, calls `requirePlan('multi-chain', tier)`. Throws `KontextError` with code `PLAN_REQUIRED` if on Free tier.
2. **Metadata validation**: If `metadataSchema` was provided at init, validates `input.metadata` against it via `.parse()`.
3. **Action logging**: Delegates to `ActionLogger.logTransaction()`, which creates a `TransactionRecord` with a unique ID, timestamp, and rolling SHA-256 digest.
4. **Plan metering**: Calls `planManager.recordEvent()`. If the monthly limit is exceeded, sets `limitExceeded: true` in metadata.
5. **Anomaly detection**: If enabled, evaluates the transaction against configured rules (unusualAmount, frequencySpike, etc.).
6. **Event export**: Fires `exporter.export([record])` as fire-and-forget.
7. **Returns** the `TransactionRecord`.

### Returns

```typescript
interface TransactionRecord extends ActionLog {
  txHash: string;
  chain: Chain;
  amount: string;
  token: Token;
  from: string;
  to: string;
}
```

---

## 2. USDC Compliance Checking

**Entry point:** `UsdcCompliance.checkTransaction(tx)` or `Kontext.checkUsdcCompliance(tx)`

**File:** `packages/sdk/src/integrations/usdc.ts` (line 165)

**Tier:** Free (no plan gating)

### Parameters

Same as `LogTransactionInput` -- see Transaction Logging above.

### Step-by-step Execution

1. **Token type check**: Verifies `tx.token === 'USDC'`. Fails with severity `high` if not.
2. **Chain support check**: Verifies `tx.chain` is in the supported list: `ethereum, base, polygon, arbitrum, optimism, arc`. Fails with severity `medium` if not.
3. **Address format checks**: Validates `tx.from` and `tx.to` match `^0x[a-fA-F0-9]{40}$`. Fails with severity `high` if invalid.
4. **Amount validation**: Parses amount; must be a positive number. Fails with severity `critical` if invalid.
5. **Sanctions screening (sender)**: Checks `tx.from` against OFAC SDN list (O(1) Set lookup). Fails with severity `critical` if sanctioned.
6. **Sanctions screening (recipient)**: Same for `tx.to`.
7. **Enhanced Due Diligence check**: Flags if `amount >= $3,000` (informational, always passes).
8. **Reporting threshold check**: Flags `>= $10,000` as medium severity; `>= $50,000` as high severity (informational).
9. **Compliance determination**: `compliant = true` only if all failed checks have severity `low`.
10. **Recommendations**: Generates actionable recommendations based on failures.

### Returns

```typescript
interface UsdcComplianceCheck {
  compliant: boolean;
  checks: ComplianceCheckResult[];
  riskLevel: AnomalySeverity;  // 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[];
}
```

### Threshold Table

| Threshold | Amount | Action |
|-----------|--------|--------|
| Enhanced Due Diligence | >= $3,000 | EDD recommended |
| Reporting (CTR) | >= $10,000 | CTR filing required |
| Large Transaction | >= $50,000 | Manual review + KYC |

### Additional Static Methods

| Method | Description |
|--------|-------------|
| `isSanctioned(address)` | O(1) check against full SDN list (active + delisted) |
| `isActivelySanctioned(address)` | Checks only active SDN entries (excludes delisted) |
| `checkSanctionsDetailed(address)` | Returns match details including list ID |
| `screenComprehensive(address, context?)` | Full OFAC screening with jurisdictional checks |
| `getContractAddress(chain)` | Returns USDC contract address for chain |
| `getSupportedChains()` | Returns supported chain array |
| `addSanctionedAddresses(addresses)` | Add addresses at runtime |
| `replaceSanctionedAddresses(addresses)` | Replace entire list |

---

## 3. OFAC Sanctions Screening

**Entry point:** `OFACSanctionsScreener` (singleton via `ofacScreener`)

**File:** `packages/sdk/src/integrations/ofac-sanctions.ts`

**Tier:** Pro (`ofac-screening`)

### Key Methods

| Method | Description |
|--------|-------------|
| `screenAddress(address, context?)` | Full address screen with jurisdictional + entity checks |
| `isActivelySanctioned(address)` | Active-only SDN check (O(1) lookup) |
| `hasAnySanctionsHistory(address)` | Check if address has any sanctions record (active or delisted) |
| `getAddressEntry(address)` | Get the full SDN entry for a specific address |
| `screenJurisdiction(code)` | Screen a country code against sanctioned jurisdictions |
| `searchEntityName(query, threshold?)` | Fuzzy entity name matching against SDN names (default threshold: 0.6) |
| `checkFiftyPercentRule(owners)` | Check if cumulative sanctioned ownership >= 50% |
| `analyzeTransactionPatterns(transactions)` | Detects suspicious patterns (MIXING, CHAIN_HOPPING, STRUCTURING, RAPID_MOVEMENT, PEELING_CHAIN) |
| `addAddresses(entries)` | Add sanctioned address entries at runtime |
| `addEntities(entities)` | Add sanctioned entity entries at runtime |

### Screening Layers

1. **Direct address match** -- O(1) lookup against SDN addresses
2. **Jurisdictional screening** -- Checks country code against sanctioned jurisdictions (KP, IR, CU, SY, etc.)
3. **50% Rule** -- Entities with >= 50% ownership by sanctioned persons
4. **Fuzzy entity matching** -- Levenshtein distance on entity names
5. **Transaction pattern analysis** -- Behavioral heuristics

---

## 4. CCTP V1 Cross-Chain Transfers

**Entry point:** `CCTPTransferManager` instance methods

**File:** `packages/sdk/src/integrations/cctp.ts`

**Tier:** Enterprise (`cctp-transfers`)

### Lifecycle Methods

#### 4a. Validate Transfer

**Method:** `validateTransfer(input: InitiateCCTPTransferInput)`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceChain` | `Chain` | Yes | Source blockchain |
| `destinationChain` | `Chain` | Yes | Destination blockchain |
| `amount` | `string` | Yes | Transfer amount |
| `token` | `Token` | Yes | Token (USDC or EURC supported) |
| `sender` | `string` | Yes | Sender address |
| `recipient` | `string` | Yes | Recipient address |
| `sourceTxHash` | `string` | Yes | Source chain tx hash |
| `agentId` | `string` | Yes | Agent initiating transfer |
| `nonce` | `number` | No | MessageSent event nonce |
| `correlationId` | `string` | No | Correlation ID |
| `metadata` | `Record<string, unknown>` | No | Additional metadata |

**Steps:**
1. Check source chain CCTP support (domain lookup)
2. Check destination chain CCTP support
3. Verify source != destination
4. Check token support (USDC or EURC only)
5. Validate amount (positive number)
6. Validate sender address format
7. Validate recipient address format
8. Generate recommendations based on failures and amount thresholds

**Returns:** `CCTPValidationResult { valid, checks, riskLevel, recommendations }`

#### 4b. Initiate Transfer

**Method:** `initiateTransfer(input)` -- Creates transfer record with status `'pending'`

#### 4c. Record Attestation

**Method:** `recordAttestation({ transferId, messageHash })` -- Moves status to `'attested'`

#### 4d. Confirm Transfer

**Method:** `confirmTransfer({ transferId, destinationTxHash })` -- Moves status to `'confirmed'`

#### 4e. Fail Transfer

**Method:** `failTransfer(transferId, reason)` -- Moves status to `'failed'`

#### 4f. Link Action

**Method:** `linkAction(transferId, actionId, 'source' | 'destination')` -- Links Kontext action logs

#### 4g. Audit Trail

**Method:** `getAuditEntry(transferId)` / `getAuditTrail(agentId?)`

**Returns:** `CrossChainAuditEntry { transfer, sourceActionId, destinationActionId, linked, durationMs }`

### CCTP Domain IDs

| Chain | Domain ID |
|-------|-----------|
| ethereum | 0 |
| avalanche | 1 |
| optimism | 2 |
| arbitrum | 3 |
| solana | 5 |
| base | 6 |
| polygon | 7 |
| arc | 10 |

---

## 5. CCTP V2 Fast Transfers

**Entry point:** `CCTPTransferManager.validateFastTransfer()` / `initiateFastTransfer()`

**File:** `packages/sdk/src/integrations/cctp.ts` (line 595)

**Tier:** Enterprise (`cctp-transfers`)

### Parameters (InitiateFastTransferInput)

Extends `InitiateCCTPTransferInput` with:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `maxFinalitySeconds` | `number` | No | Max finality time sender will accept (default: 30s for fast routes, 900s otherwise) |
| `hooks` | `CCTPHook[]` | No | Post-transfer automation hooks |

### Step-by-step (validateFastTransfer)

1. Run standard `validateTransfer()` checks
2. Check if route is in `FAST_TRANSFER_ROUTES` set
3. Estimate finality: 30s for fast routes, 900s for standard
4. Validate each hook: contract address format, non-empty callData, gasLimit 1-10M
5. Return `FastTransferValidation`

### Step-by-step (initiateFastTransfer)

1. Generate transfer ID and correlation ID
2. Check if route supports fast transfer
3. Create `CrossChainTransfer` record with `version: 'v2'` and `isFastTransfer` flag
4. Store hooks on the transfer record
5. Return the transfer

### Fast Transfer Routes

`ethereum<->base`, `ethereum<->arbitrum`, `ethereum<->optimism`, `ethereum<->polygon`, `base<->arbitrum`, `base<->optimism`, `base<->polygon`, `ethereum<->avalanche`

### Hook Recording

**Method:** `recordHookResults(transferId, results: CCTPHookResult[])` -- Records success/failure of each hook

---

## 6. Circle Programmable Wallets

**Entry point:** `new CircleWalletManager(kontextClient, circleApiKey?, options?)`

**File:** `packages/sdk/src/integrations/circle-wallets.ts`

**Tier:** Enterprise (`circle-wallets`)

### Constructor Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `kontextClient` | `KontextLike` | Yes | Initialized Kontext client |
| `circleApiKey` | `string` | No | Circle API key (omit for simulation) |
| `options.defaultChain` | `Chain` | No | Default chain (default: `'ethereum'`) |
| `options.autoLog` | `boolean` | No | Auto-log operations (default: `true`) |
| `options.requireCompliance` | `boolean` | No | Require compliance before transfers (default: `true`) |

### Key Methods

#### 6a. createWalletSet(name)

Creates a logical group of wallets. Logs `wallet_set_created` action.

#### 6b. createWallet(walletSetId, { chain, custodyType? })

Creates a wallet within a set. Logs `wallet_created` action.

#### 6c. transferWithCompliance(input)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `walletId` | `string` | Yes | Source wallet ID |
| `destinationAddress` | `string` | Yes | Destination on-chain address |
| `amount` | `string` | Yes | Transfer amount |
| `chain` | `Chain` | No | Override wallet's chain |
| `token` | `'USDC' \| 'EURC'` | No | Token (default: `'USDC'`) |
| `agent` | `string` | No | Agent ID (default: `'system'`) |

**Step-by-step:**
1. Validate wallet exists and `state === 'LIVE'`
2. Run USDC compliance check via `kontext.checkUsdcCompliance()` plus additional checks (address format, amount positive, wallet state)
3. Get agent trust score via `kontext.getTrustScore()`
4. **Decision logic:**
   - If compliance fails and `requireCompliance === true`: status = `BLOCKED`
   - If riskLevel is `high`/`critical` or trustScore < 30: status = `PENDING_REVIEW`
   - Otherwise: execute transfer via Circle adapter, status = `COMPLETED`
5. Log `circle_wallet_transfer` action with full metadata
6. Track in per-wallet audit trail

**Returns:** `CompliantTransferResult { transferId, walletId, status, complianceCheck, kontextLogId, trustScore, amount, chain, transactionHash?, blockedReason? }`

---

## 7. Circle Compliance Engine (Dual Screening)

**Entry point:** `new CircleComplianceEngine(kontextClient, circleApiKey?)`

**File:** `packages/sdk/src/integrations/circle-compliance.ts`

**Tier:** Enterprise (`circle-compliance`)

### 7a. screenTransaction(input)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | `string` | Yes | Sender address |
| `to` | `string` | Yes | Recipient address |
| `amount` | `string` | Yes | Transfer amount |
| `chain` | `Chain` | Yes | Blockchain network |
| `token` | `string` | No | Token (default: `'USDC'`) |

**Step-by-step:**
1. **Circle screening**: Call adapter's `screenTransaction()` -- returns `approved`, `riskLevel` (LOW/MEDIUM/HIGH/SEVERE), `flags`
2. **Kontext screening**: Run USDC compliance check, detect anomalies, compute trust score
3. **Combined decision logic:**
   - `BLOCK` if Circle risk is SEVERE, or both Circle and Kontext fail
   - `REVIEW` if Circle risk is HIGH or MEDIUM, or either system fails
   - `APPROVE` only when both systems agree
4. Log `compliance_screening` action

**Returns:** `DualScreenResult { circleScreening, kontextScreening, combinedDecision, auditLogId }`

### 7b. screenAddress(address, chain)

Screens a single address. Logs `address_screening` action.

**Returns:** `AddressScreenResult { address, chain, sanctioned, riskLevel, flags, screenedAt }`

### 7c. getComprehensiveRisk(input)

**Parameters:** `{ address, chain, agentId?, amount?, token? }`

**Step-by-step:**
1. Circle address screening -> circleRiskScore
2. Kontext trust scoring -> kontextRiskScore (inverted: 100 - trustScore)
3. Amount-based risk scoring
4. Address format risk scoring
5. Combined weighted average
6. Decision: `BLOCK` if >= 75 or sanctioned; `MANUAL_REVIEW` if >= 25; `PROCEED` if < 25

**Returns:** `ComprehensiveRiskResult { overallRisk, circleRiskScore, kontextTrustScore, combinedScore, recommendation, factors, auditLogId }`

---

## 8. Gas Station (Sponsored Gas)

**Entry point:** `new GasStationManager(kontextClient, circleApiKey?)`

**File:** `packages/sdk/src/integrations/gas-station.ts`

**Tier:** Enterprise (`gas-station`)

### 8a. checkEligibility(walletId, chain)

**Steps:**
1. Query adapter for eligibility (simulation checks chain against eligible list)
2. Log `gas_eligibility_check` action

**Returns:** `GasEligibility { eligible, maxSponsoredAmount, supportedOperations, remainingDailyQuota, reason? }`

### Eligible Chains

| Chain | Eligible | Native Token |
|-------|----------|-------------|
| base | Yes | ETH |
| polygon | Yes | MATIC |
| arbitrum | Yes | ETH |
| optimism | Yes | ETH |
| arc | Yes | ARC |
| ethereum | **No** | ETH |
| solana | **No** | SOL |
| avalanche | **No** | AVAX |

### 8b. estimateGas(input)

**Parameters:** `{ walletId, destinationAddress, amount, chain, token? }`

**Steps:**
1. Query adapter for gas estimate
2. Log `gas_estimate` action

**Returns:** `GasEstimate { estimatedGas, sponsored, userCost, sponsoredAmount, chain, nativeToken }`

### 8c. logGasSponsorship(input)

Records a sponsorship event after on-chain confirmation. Logs `gas_sponsorship` action.

---

## 9. CFTC Letter 26-05 Compliance

**Entry point:** `new CFTCCompliance()`

**File:** `packages/sdk/src/integrations/cftc-compliance.ts`

**Tier:** Enterprise (`cftc-compliance`)

### Key Methods

| Method | Description |
|--------|-------------|
| `logCollateralValuation(input)` | Log a collateral valuation with haircut validation |
| `logSegregationCalculation(input)` | Log daily segregation calculation (Reg 1.20 / 30.7) |
| `logIncident(input)` | Log cybersecurity/operational incident |
| `generateWeeklyDigitalAssetReport(accountClass, periodStart, periodEnd)` | Generate weekly digital asset report for an account class |
| `generateDailySegregationReport(accountClass, date)` | Get most recent segregation calculation for a given account class and date |
| `getCollateralValuations(filters?)` | Query stored collateral valuations with optional filters |
| `getSegregationCalculations(filters?)` | Query segregation calculations with optional filters |
| `getIncidents(filters?)` | Query incident reports with optional filters |
| `validateHaircut(assetType, haircutPercentage)` | Validate a haircut percentage against CFTC Letter 26-05 requirements |
| `exportCFTCReport(options)` | Export CFTC compliance data in JSON or CSV format |

### Haircut Rules

| Asset Type | Minimum Haircut | Notes |
|------------|----------------|-------|
| Payment stablecoins (USDC, USDT, etc.) | 0% | No mandatory minimum |
| BTC / ETH | Deferred to DCO schedule | Variable |
| Other digital assets | 20% minimum | Per CFTC Letter 26-05 |

### Account Classes

- `futures` -- CFTC Reg 1.20 segregated
- `cleared_swaps` -- CFTC Reg 22 segregated
- `30.7` -- Secured funds for foreign futures

---

## 10. Stripe Payment Logging

**Entry point:** `Kontext.log(input)` and `Kontext.logTransaction(input)` with Stripe metadata

**File:** `packages/sdk/src/client.ts` (via generic `log()` method)

**Tier:** Free (base chain) / Pro (multi-chain)

Stripe payments are logged via the generic `kontext.log()` method with Stripe-specific metadata. There is no dedicated Stripe module -- the pattern is documented in `tests/stripe.test.ts`.

### Pattern

```typescript
// Log a Stripe payment intent
await kontext.log({
  type: 'stripe_payment_intent',
  description: 'Payment intent created',
  agentId: 'payment-agent',
  metadata: {
    stripePaymentIntentId: 'pi_xxx',
    amount: '99.99',
    currency: 'usd',
    status: 'succeeded',
    correlationId: 'order-123',
  },
});

// Optionally correlate with on-chain settlement
await kontext.logTransaction({
  txHash: '0x...',
  chain: 'base',
  amount: '99.99',
  token: 'USDC',
  from: '0xTreasury',
  to: '0xCustomer',
  agentId: 'settlement-agent',
  correlationId: 'order-123',  // links to Stripe event above
});
```

---

## 11. x402 Protocol Payments

**Entry point:** `Kontext.log(input)` with x402 metadata

**File:** `packages/sdk/src/client.ts` (via generic `log()` method)

**Tier:** Free

x402 HTTP-native micropayments are logged via the generic `kontext.log()` method. There is no dedicated x402 module.

### Pattern

```typescript
await kontext.log({
  type: 'x402_payment',
  description: 'x402 micropayment for API access',
  agentId: 'api-consumer-agent',
  metadata: {
    protocol: 'x402',
    resourceUrl: 'https://api.example.com/data',
    paymentAmount: '0.01',
    token: 'USDC',
    chain: 'base',
    payTo: '0xAPIProvider',
  },
});
```

---

## 12. Vercel AI SDK Integration

**Entry point:** `kontextMiddleware()`, `kontextWrapModel()`, `createKontextAI()`, `withKontext()`

**File:** `packages/sdk/src/integrations/vercel-ai.ts`

**Tier:** Free (basic logging) / Pro (if financial tools trigger multi-chain transactions)

### 12a. kontextMiddleware(kontext, options?)

Creates a Vercel AI SDK middleware object with three hooks:
- `transformParams` -- Logs AI request before model invocation
- `wrapGenerate` -- Wraps synchronous generation with audit; processes tool calls
- `wrapStream` -- Wraps streaming with audit; collects tool calls from stream chunks

### 12b. kontextWrapModel(model, kontext, options?)

Wraps a language model with the middleware. Returns a proxy that intercepts `doGenerate` and `doStream`.

### 12c. createKontextAI(model, input)

One-line setup: creates Kontext client + wraps model in a single call.

**Returns:** `{ model, kontext }`

### 12d. withKontext(handler, options?)

Next.js route handler wrapper. Logs HTTP request/response lifecycle and provides `KontextAIContext` with `wrapModel()` helper.

### Financial Tool Detection

**Function:** `extractAmount(args)` -- Extracts numeric amounts from tool call args by scanning for fields named `amount`, `value`, `total`, `payment`, `transfer`, `sum`. Recurses one level into nested objects.

### Trust Threshold Enforcement

If `trustThreshold` is set, the middleware:
1. Checks agent trust score before generation
2. Blocks financial tool calls if trust score < threshold
3. Calls `onBlocked` callback with tool call details
4. Logs `ai_blocked` or `ai_tool_blocked` actions

---

## 13. SAR/CTR Report Generation

**Entry point:** `Kontext.generateSARReport(options)` / `Kontext.generateCTRReport(options)`

**File:** `packages/sdk/src/client.ts` (lines 446, 461)

**Tier:** Pro (`sar-ctr-reports`)

### Parameters (ReportOptions)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `ReportType` | Yes | Report type (`'compliance' \| 'transaction' \| 'anomaly' \| 'sar' \| 'ctr'`) |
| `period` | `DateRange` | Yes | Reporting period with `start: Date` and `end: Date` |
| `agentIds` | `string[]` | No | Filter by agent IDs |

### Step-by-step

1. Call `requirePlan('sar-ctr-reports', tier)` -- requires Pro
2. Delegate to `AuditExporter.generateSARReport()` or `generateCTRReport()`
3. Aggregates transactions from the store within the date range
4. Returns structured report template

### Returns

`SARReport` or `CTRReport` -- structured templates populated with SDK data, suitable for regulatory filing preparation.

---

## 14. Transaction Risk Evaluation

**Entry point:** `Kontext.evaluateTransaction(tx)`

**File:** `packages/sdk/src/client.ts` (line 486)

**Tier:** Free

### Parameters

Same as `LogTransactionInput`.

### Step-by-step

1. Delegates to `TrustScorer.evaluateTransaction(tx)`
2. Computes risk score based on amount, address history, chain, and pattern analysis
3. Returns recommendation

### Returns

```typescript
interface TransactionEvaluation {
  txHash: string;              // Transaction hash being evaluated
  riskScore: number;           // 0-100 (higher = more risky)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];       // Breakdown of what contributed to score
  flagged: boolean;            // Whether the transaction should be flagged (riskScore >= 60)
  recommendation: 'approve' | 'review' | 'block';
  evaluatedAt: string;         // ISO 8601 timestamp
}
```

---

## 15. Approval Policies (Human-in-the-Loop)

**Entry point:** `Kontext.setApprovalPolicies(policies)` / `Kontext.evaluateApproval(input)`

**File:** `packages/sdk/src/client.ts` (lines 947, 959)

**Tier:** Pro (`approval-policies`)

### Key Methods

| Method | Tier | Description |
|--------|------|-------------|
| `setApprovalPolicies(policies)` | Pro | Configure approval rules |
| `evaluateApproval(input)` | Pro | Evaluate action against policies |
| `submitApprovalDecision(input)` | Pro | Submit human approve/deny decision |
| `getApprovalRequest(id)` | Pro | Get request by ID |
| `getPendingApprovals()` | Pro | Get all pending requests |

---

## 16. Integration Points Between Flows

### Core Integrations

```
Transaction Logging ─────────┬──> Anomaly Detection
                             ├──> Digest Chain (SHA-256)
                             ├──> Event Exporter
                             └──> Plan Metering

USDC Compliance ────────────┬──> Circle Wallets (pre-transfer check)
                            └──> Circle Compliance Engine (Kontext side of dual screen)

OFAC Sanctions ─────────────┬──> USDC Compliance (sanctions_sender / sanctions_recipient checks)
                            └──> Direct screening via OFACSanctionsScreener

Circle Wallets ─────────────┬──> USDC Compliance (via runComplianceCheck)
                            ├──> Trust Scoring (via getTrustScore)
                            └──> Core Logging (via kontext.log)

Circle Compliance ──────────┬──> USDC Compliance (Kontext screening layer)
                            ├──> Trust Scoring (comprehensive risk)
                            └──> Core Logging (audit log)

CCTP Transfers ─────────────┬──> Core Logging (via linkAction)
                            └──> Audit Trail (getAuditEntry)

Vercel AI SDK ──────────────┬──> Core Logging (all AI ops)
                            ├──> Trust Scoring (threshold enforcement)
                            └──> Financial Tool Detection (extractAmount)

Stripe / x402 ──────────────┬──> Core Logging (via kontext.log)
                            └──> Correlation IDs (link fiat to on-chain)

Gas Station ────────────────┬──> Core Logging (eligibility, estimate, sponsorship)
                            └──> Chain eligibility check

CFTC Compliance ────────────── Standalone (own storage, no Kontext client dependency)
```

### Correlation Pattern

All flows support `correlationId` to link related actions across:
- Stripe payment intent -> on-chain USDC settlement
- x402 HTTP payment -> USDC transfer
- CCTP source chain burn -> destination chain mint
- AI tool call -> actual transfer execution

---

## 17. Plan Tier Requirements Summary

| Feature | Free | Pro ($199/seat/mo) | Enterprise |
|---------|------|--------------------|------------|
| Transaction logging (base chain) | Yes | Yes | Yes |
| Multi-chain logging | -- | Yes | Yes |
| USDC compliance checks | Yes | Yes | Yes |
| Transaction risk evaluation | Yes | Yes | Yes |
| x402 payment logging | Yes | Yes | Yes |
| Vercel AI SDK middleware | Yes | Yes | Yes |
| Advanced anomaly rules | -- | Yes | Yes |
| SAR/CTR reports | -- | Yes | Yes |
| Webhooks | -- | Yes | Yes |
| OFAC screening | -- | Yes | Yes |
| CSV export | -- | Yes | Yes |
| Approval policies | -- | Yes | Yes |
| CCTP cross-chain transfers | -- | -- | Yes |
| Circle Programmable Wallets | -- | -- | Yes |
| Circle Compliance Engine | -- | -- | Yes |
| Gas Station integration | -- | -- | Yes |
| CFTC compliance module | -- | -- | Yes |

### Event Limits Per Tier

| Tier | Events per User per Month |
|------|--------------------------|
| Free | 20,000 |
| Pro | 100,000 per seat |
| Enterprise | Unlimited |

---

## Test Coverage Map

Every payment flow listed above has corresponding test coverage:

| Flow | Test File(s) |
|------|-------------|
| Transaction Logging | `client.test.ts`, `integrations.test.ts` |
| USDC Compliance | `usdc.test.ts`, `integrations.test.ts` |
| OFAC Sanctions | `ofac-sanctions.test.ts`, `sanctions.test.ts` |
| CCTP V1 + V2 | `cctp.test.ts`, `integrations.test.ts` |
| Circle Wallets | `circle-wallets.test.ts` |
| Circle Compliance | `circle-compliance.test.ts` |
| Gas Station | `gas-station.test.ts` |
| CFTC Compliance | `cftc-compliance.test.ts` |
| Stripe | `stripe.test.ts`, `integrations.test.ts` |
| x402 | `integrations.test.ts` |
| Vercel AI SDK | `vercel-ai.test.ts`, `e2e-vercel-ai.test.ts` |
| SAR/CTR Reports | `audit-reports.test.ts` |
| Risk Evaluation | `client.test.ts`, `transaction-evaluation.test.ts` |
| Approval Policies | `approval.test.ts`, `payment-flow-gating.test.ts` |
| Plan Gating | `plan-gate.test.ts`, `plan-gate-completeness.test.ts`, `plans.test.ts`, `payment-flow-gating.test.ts` |
| Digest Chain | `digest.test.ts` |
| Compliance Certificates | `compliance-certificate.test.ts` |
| Feature Flags | `feature-flags.test.ts` |
| Storage | `storage.test.ts` |
| Webhooks | `webhooks.test.ts` |
| Exporters | `exporters.test.ts` |
| Reasoning | `reasoning.test.ts` |
