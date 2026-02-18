# Kontext SDK — Product Requirements Document

## Company Context

Legaci Labs Inc. Bootstrapped with $50,000 ($25K cash, $25K GCP credits). Solo founder. Patent US 12,463,819 B1 (tamper-evident digest chain for agent audit trails).

## Problem Statement

Developers building autonomous AI agents with Circle Programmable Wallets and CCTP are handling material USDC transfers ($3K+) with zero compliance infrastructure. Circle provides wallet APIs and a paid Compliance Engine for transaction screening, but the developer is responsible for implementing their own audit trails, reasoning logs, regulatory reports, and tamper-evident proof that compliance checks actually ran. The GENIUS Act (signed July 2025) treats payment stablecoin issuers as financial institutions under the BSA, with implementing regulations due July 2026 and prohibitions effective November 2026. No developer SDK exists to fill this gap.

Bridge.xyz (acquired by Stripe for $1.1B) validates the thesis by embedding compliance directly into its orchestration API. Developers who go direct-to-chain without Bridge have no equivalent.

## Positioning

Kontext is the compliance logging SDK for developers building on Circle Programmable Wallets and CCTP who handle stablecoin transfers above BSA thresholds. It records what agents did, why they did it, and provides cryptographic proof that compliance checks ran.

Kontext is NOT a KYA (Know Your Agent) platform. Sumsub ($1B+ valuation, 900 employees) and Vouched ($22M funding) own agent identity verification. Kontext is complementary: they verify the agent before the transaction, Kontext logs what happened during and after.

Kontext is NOT a blockchain analytics platform. Chainalysis, Elliptic, and TRM Labs own transaction monitoring at $100K+/yr for enterprises. Kontext is the developer SDK that costs $49/mo and installs with `npm install`.

**One-line positioning:** Compliance logging at agent speed for autonomous wallet developers.

## Target Users

**Primary:** Developers building on Circle Programmable Wallets handling transfers above $3,000 (Travel Rule threshold). They chose Circle over Bridge because they need programmable control. They need the compliance layer that Bridge includes but Circle doesn't.

**Secondary:** CCTP cross-chain transfer builders. $110B+ in volume, 5.3M+ transfers, zero compliance layer. CCTP V2 canonical, V1 phases out July 31, 2026.

**Tertiary:** Hackathon builders graduating from testnet to mainnet. Circle's OpenClaw hackathon generated 200+ submissions in February 2026. SURGE x OpenClaw (March 9-22, $50K prize pool) targets ERC-8004 trustless financial agents. These developers will hit BSA thresholds when real USDC starts flowing.

## Goals

1. Ship `verify()` convenience method that combines `logTransaction()` + `UsdcCompliance.checkTransaction()` in a single call, making the homepage "five lines" promise literally true (Release 1, Week 1-2)
2. Publish LabLab.ai tutorial "Add compliance logging to your autonomous wallet agent in 5 minutes" before SURGE hackathon March 9 (Week 3-4)
3. Reach 100 organic npm installs within 30 days of tutorial publication
4. Convert 5% of free-tier users to Pro ($49/mo) within 90 days of launch
5. Be indexed for "USDC compliance SDK" and "AI agent audit trail" before GENIUS Act implementing regulations drop in July 2026

## Non-Goals

1. **KYA/agent identity verification** -- Sumsub and Vouched own this category with 100x+ our resources. Our KYA module (identity registry, wallet clustering, behavioral fingerprinting) is deprioritized to Milestone 4. Do not market Kontext as a KYA platform.
2. **Python SDK** -- TypeScript-only for MVP. Adding a "coming soon" creates expectation debt. Ship Python when there's a concrete timeline and proven demand.
3. **Enterprise sales motion** -- No enterprise tier on the website. No custom pricing page. When enterprise customers show up (they will), negotiate from a position of having a product they're already using.
4. **Blockchain analytics / transaction monitoring** -- We do not compete with Chainalysis, Elliptic, or TRM Labs. Our OFAC screening uses the built-in SDN list. The pluggable ScreeningProvider architecture exists for developers who bring their own Chainalysis API key.
5. **Circle Compliance Engine replacement** -- Circle's paid Compliance Engine handles screening. Kontext handles the audit trail and proof that screening ran. Complementary, not competitive.

---

## Infrastructure

### Principle: GCP-First, Vercel for Web Hosting

Kontext has $25K in GCP credits. Every backend service, data store, and compute workload should run on GCP. Vercel is used exclusively for static/SSR web hosting where Next.js deployment is trivially simple.

### GCP Services Map

| Service | Purpose | Replaces |
|---------|---------|----------|
| **Cloud Run** | API server (`packages/server/`). Hono framework, Dockerfile already exists. Port 8080. | Vercel serverless for API |
| **Firestore** | Feature flags (already implemented), plan metering state, API key management, user accounts. | In-memory server store |
| **Cloud Storage (GCS)** | Audit trail exports (JSON/CSV), SAR/CTR report storage, OFAC SDN list cache. | Local filesystem |
| **Pub/Sub** | Webhook delivery queue, anomaly event fanout, async sanctions list sync. | Direct HTTP webhook calls |
| **Cloud Scheduler** | OFAC SDN list refresh (daily), plan metering reset (monthly), stale feature flag cleanup. | Manual cron |
| **Secret Manager** | API keys, Stripe secrets, Chainalysis API key, Circle API credentials. | Environment variables |
| **Cloud Logging** | Structured logging from Cloud Run, audit of API access. | Console output |
| **BigQuery** (future) | Analytics on aggregate compliance data, usage patterns, anomaly trends. | None (new capability) |

### Vercel Services

| Service | Purpose |
|---------|---------|
| **Vercel** (apps/web/) | Next.js marketing site at getkontext.com. Static generation + SSR. |
| **Vercel** (apps/demo/) | Interactive demo at demo-lemon-one-19.vercel.app. |

### Deployment Topology

```
getkontext.com (Vercel)          api.getkontext.com (Cloud Run)
       |                                    |
  Next.js SSR/SSG                    Hono API server
  Stripe.js client                         |
       |                          +--------+--------+
       |                          |        |        |
                              Firestore  GCS    Pub/Sub
                              (flags,   (exports, (webhooks,
                               plans,    reports)  events)
                               keys)
```

### Environment Variables

**Cloud Run (packages/server/):**
```
PORT=8080
NODE_ENV=production
GCP_PROJECT_ID=kontext-verify-sdk
STRIPE_SECRET_KEY=          # -> migrate to Secret Manager
STRIPE_WEBHOOK_SECRET=      # -> migrate to Secret Manager
STRIPE_PRO_PRICE_ID=
KONTEXT_APP_URL=https://getkontext.com
KONTEXT_CORS_ORIGINS=https://getkontext.com,https://demo-lemon-one-19.vercel.app
KONTEXT_API_KEYS=           # -> migrate to Firestore
KONTEXT_API_KEY_PLANS=      # -> migrate to Firestore
CHAINALYSIS_API_KEY=        # -> migrate to Secret Manager
OPENSANCTIONS_API_KEY=      # -> migrate to Secret Manager
```

**Vercel (apps/web/):**
```
STRIPE_PUBLIC_KEY=
NEXT_PUBLIC_API_URL=https://api.getkontext.com
```

---

## Repository Structure

pnpm monorepo (`pnpm-workspace.yaml` -> `packages/*`).

```
packages/
  sdk/          # Core SDK (zero runtime deps, published as `kontext-sdk`)
  server/       # Hono API server (GCP Cloud Run)
  demo/         # CLI demo
apps/
  web/          # Next.js marketing site (Vercel)
  demo/         # Interactive web demo (Vercel)
  video/        # Video content
```

## SDK Architecture (`packages/sdk/`)

### Source Layout

```
src/
  client.ts           # Main Kontext class -- private constructor, static init()
  types.ts            # All core type definitions
  store.ts            # KontextStore -- in-memory data store with pluggable persistence
  logger.ts           # ActionLogger -- digest chain integration
  tasks.ts            # TaskManager -- tracked tasks with evidence
  audit.ts            # AuditExporter -- JSON/CSV export, SAR/CTR reports
  trust.ts            # TrustScorer -- agent trust scoring
  anomaly.ts          # AnomalyDetector -- rule-based anomaly detection
  digest.ts           # DigestChain -- tamper-evident SHA-256 hash chain
  plans.ts            # PlanManager -- event metering (free/pro/enterprise)
  plan-gate.ts        # requirePlan() / isFeatureAvailable() -- feature gating
  exporters.ts        # EventExporter implementations (Noop, Console, JSON, HTTP, Cloud)
  feature-flags.ts    # FeatureFlagManager -- Firestore-backed feature flags
  webhooks.ts         # WebhookManager
  approval.ts         # ApprovalManager -- human-in-the-loop
  storage.ts          # MemoryStorage, FileStorage adapters
  utils.ts            # generateId(), now(), toCsv(), parseAmount(), etc.
  index.ts            # Barrel exports (public API surface)
  kya/                # Agent forensics module (feature-flagged, Milestone 4)
    types.ts
    identity-registry.ts
    wallet-clustering.ts
    behavioral-fingerprint.ts
    cross-session-linker.ts
    confidence-scorer.ts
    index.ts
  integrations/       # Third-party integrations
    usdc.ts               # UsdcCompliance -- static compliance checks, OFAC, thresholds
    ofac-sanctions.ts     # OFACSanctionsScreener -- comprehensive OFAC screening
    cctp.ts               # CCTPTransferManager -- CCTP V1/V2 cross-chain transfers
    circle-wallets.ts     # CircleWalletManager -- Circle Programmable Wallets
    circle-compliance.ts  # CircleComplianceEngine -- Circle paid compliance
    gas-station.ts        # GasStationManager -- gas sponsorship
    vercel-ai.ts          # Vercel AI SDK middleware (kontextMiddleware, kontextWrapModel)
    cftc-compliance.ts    # CFTCCompliance -- CFTC Letter No. 26-05
    screening-aggregator.ts   # ScreeningAggregator -- multi-provider screening
    screening-provider.ts     # ScreeningProvider interface
    screening-notification.ts # ScreeningNotificationManager -- webhook/SMTP alerts
    provider-ofac.ts          # ChainalysisOracleProvider
    provider-treasury-sdn.ts  # TreasurySDNProvider (built-in, no API key)
    provider-apis.ts          # ChainalysisFreeAPIProvider, OpenSanctionsProvider
```

### Key Patterns

- **Private constructor + static `Kontext.init(config)`** -- all SDK usage starts here
- **Plan gating** -- `requirePlan(feature, tier)` in `client.ts` methods. Modules themselves are self-contained; gating is at the consumer level
- **Feature flags** -- optional `featureFlagManager.isEnabled()` check as remote kill-switch (Firestore-backed)
- **Lazy initialization** -- KYA modules created on first use (null until needed)
- **In-memory store** -- `KontextStore` holds actions, transactions, tasks, anomalies; optional `StorageAdapter` for persistence
- **Zero runtime dependencies** -- SDK has no `dependencies`, only `devDependencies`
- **Imports use `.js` extension** -- ESM-style (`import { X } from './foo.js'`)
- **Strict TypeScript** -- `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride` enabled

---

## Complete Feature Inventory

### Kontext Client -- Public API Surface (40+ methods)

**Initialization & Lifecycle:**
- `static init(config: KontextConfig): Kontext`
- `getMode(): KontextMode`
- `getConfig(): Omit<KontextConfig, 'apiKey'>`
- `async destroy(): Promise<void>`

**Action Logging:**
- `async log(input: LogActionInput): Promise<ActionLog>`
- `async logTransaction(input: LogTransactionInput): Promise<TransactionRecord>` -- multi-chain requires Pro
- `async flushLogs(): Promise<void>`

**Persistence:**
- `async flush(): Promise<void>`
- `async restore(): Promise<void>`

**Task Confirmation (Human-in-the-Loop):**
- `async createTask(input: CreateTaskInput): Promise<Task>`
- `async confirmTask(input: ConfirmTaskInput): Promise<Task>`
- `async getTaskStatus(taskId: string): Promise<Task | undefined>`
- `async startTask(taskId: string): Promise<Task>`
- `async failTask(taskId: string, reason: string): Promise<Task>`
- `getTasks(status?: TaskStatus): Task[]`

**Audit Export:**
- `async export(options: ExportOptions): Promise<ExportResult>` -- CSV requires Pro
- `async generateReport(options: ReportOptions): Promise<ComplianceReport>`
- `async generateSARReport(options: ReportOptions): Promise<SARReport>` -- Pro
- `async generateCTRReport(options: ReportOptions): Promise<CTRReport>` -- Pro

**Trust Scoring:**
- `async getTrustScore(agentId: string): Promise<TrustScore>`
- `async evaluateTransaction(tx: LogTransactionInput): Promise<TransactionEvaluation>`

**Anomaly Detection:**
- `enableAnomalyDetection(config: AnomalyDetectionConfig): void` -- advanced rules require Pro
- `disableAnomalyDetection(): void`
- `onAnomaly(callback: AnomalyCallback): () => void`

**Digest Chain (Tamper-Evidence -- Patent US 12,463,819 B1):**
- `getTerminalDigest(): string`
- `verifyDigestChain(): DigestVerification`
- `exportDigestChain(): { genesisHash, links, terminalDigest }`
- `getActions(): ActionLog[]`

**Agent Reasoning:**
- `async logReasoning(input: LogReasoningInput): Promise<ReasoningEntry>`
- `getReasoningEntries(agentId: string): ReasoningEntry[]`

**Compliance Certificates:**
- `async generateComplianceCertificate(input): Promise<ComplianceCertificate>`

**Plan & Usage Metering:**
- `getUsage(): PlanUsage`
- `setPlan(tier: PlanTier): void`
- `onUsageWarning(callback): () => void` -- fires at 80% of limit
- `onLimitReached(callback): () => void`
- `getUpgradeUrl(): string`

**Feature Flags (Firestore-backed):**
- `isFeatureEnabled(flagName, environment?, plan?): boolean`
- `getFeatureFlagManager(): FeatureFlagManager | null`

**Approval / Human-in-the-Loop:** -- Pro
- `setApprovalPolicies(policies: ApprovalPolicy[]): void`
- `evaluateApproval(input: EvaluateApprovalInput): ApprovalEvaluation`
- `submitApprovalDecision(input: SubmitDecisionInput): ApprovalRequest`
- `getApprovalRequest(requestId): ApprovalRequest | undefined`
- `getPendingApprovals(): ApprovalRequest[]`

**KYA -- Agent Identity (Pro):**
- `registerAgentIdentity(input): AgentIdentity`
- `updateAgentIdentity(agentId, input): AgentIdentity`
- `getAgentIdentity(agentId): AgentIdentity | undefined`
- `removeAgentIdentity(agentId): boolean`
- `addAgentWallet(agentId, wallet): AgentIdentity`
- `lookupAgentByWallet(address): AgentIdentity | undefined`
- `getWalletClusters(): WalletCluster[]`
- `getKYAExport(): KYAEnvelope`

**KYA -- Behavioral Analysis (Enterprise):**
- `computeBehavioralEmbedding(agentId): BehavioralEmbedding | null`
- `analyzeAgentLinks(): AgentLink[]`
- `getLinkedAgents(agentId): string[]`
- `getKYAConfidenceScore(agentId): KYAConfidenceScore`

### Static Compliance Checks (no API key needed)

`UsdcCompliance` class -- all static methods:
- `checkTransaction(tx)` returns `{ compliant, checks[], riskLevel, recommendations[] }`
- `isSanctioned(address)`, `checkSanctionsDetailed(address)`, `getSanctionedAddresses()`
- `screenComprehensive(address, context?)` -- advanced OFAC via `OFACSanctionsScreener`
- `getContractAddress(chain)`, `getSupportedChains()`
- `addSanctionedAddresses(addresses)`, `replaceSanctionedAddresses(addresses)`

**Thresholds:** $3,000 EDD (Travel Rule), $10,000 CTR, $50,000 Large Transaction

### Integration Modules

| Module | Class | Key Methods | Plan Gate |
|--------|-------|-------------|-----------|
| usdc.ts | `UsdcCompliance` | `checkTransaction()`, `screenComprehensive()` | Free |
| ofac-sanctions.ts | `OFACSanctionsScreener` | `screenAddress()`, `isActivelySanctioned()` | Free |
| cctp.ts | `CCTPTransferManager` | `initiateTransfer()`, `initiateFastTransfer()` (V2), `confirmTransfer()` | Enterprise |
| circle-wallets.ts | `CircleWalletManager` | `transferWithCompliance()`, `createWalletSet()`, `createWallet()` | Enterprise |
| circle-compliance.ts | `CircleComplianceEngine` | `screenTransaction()`, `screenAddress()`, `getComprehensiveRisk()` | Enterprise |
| gas-station.ts | `GasStationManager` | `checkEligibility()`, `estimateGas()`, `logGasSponsorship()` | Enterprise |
| cftc-compliance.ts | `CFTCCompliance` | `logCollateralValuation()`, `logSegregationCalculation()`, `generateWeeklyDigitalAssetReport()` | Enterprise |
| vercel-ai.ts | (functions) | `kontextMiddleware()`, `kontextWrapModel()`, `createKontextAI()` | Free |
| screening-aggregator.ts | `ScreeningAggregator` | `screenAddress()`, `screenTransaction()` | Pro |
| provider-ofac.ts | `ChainalysisOracleProvider` | `screen()` | Pro (via unified-screening) |
| provider-treasury-sdn.ts | `TreasurySDNProvider` | `screen()`, `sync()` | Pro (via unified-screening) |
| provider-apis.ts | `ChainalysisFreeAPIProvider`, `OpenSanctionsProvider` | `screen()` | Pro |
| screening-notification.ts | `ScreeningNotificationManager` | `notify()` | Pro |

### Event Exporters

| Exporter | Purpose | Plan |
|----------|---------|------|
| `NoopExporter` | Default -- discards events | Free |
| `ConsoleExporter` | Development -- prints to stdout | Free |
| `JsonFileExporter` | Local backup -- writes JSONL to disk | Free |
| `HttpExporter` | Generic -- sends batched events to any HTTP endpoint | Free |
| `KontextCloudExporter` | Cloud -- ships to api.getkontext.com with retry | Pro |
| `MultiExporter` | Composite -- fans out to multiple exporters | Free |

### Storage Adapters

| Adapter | Purpose | Plan |
|---------|---------|------|
| `MemoryStorage` | Default -- in-memory, resets on restart | Free |
| `FileStorage(baseDir)` | Local persistence -- JSON files on disk | Free |

---

## Roadmap Milestones

Features are organized into milestones gated by feature flags. Each milestone has a clear launch trigger and success criteria. Features not in the current milestone are feature-flagged OFF in production.

### Milestone 1 -- Compliance Core (IMMEDIATE -- Ship by March 7, before SURGE hackathon)

**Status:** In progress. Most code exists. `verify()` must be built.

**What ships:**
- `Kontext.init(config)` -- local mode (no API key) and cloud mode
- **`verify(input)` -- NEW** convenience method combining `logTransaction()` + `UsdcCompliance.checkTransaction()` in a single call
- `log(input)` -- generic agent action logging into digest chain
- `logTransaction(input)` -- transaction logging (Base chain on free tier)
- `UsdcCompliance.checkTransaction(tx)` -- static OFAC + EDD + CTR checks
- `createTask(input)` / `confirmTask(input)` -- human-in-the-loop
- `export(options)` -- JSON audit export (CSV gated to Pro)
- `generateReport(options)` -- compliance report generation
- Digest chain: `getTerminalDigest()`, `verifyDigestChain()`, `exportDigestChain()`, `verifyExportedChain()`
- Storage: `MemoryStorage` (default), `FileStorage(baseDir)` for persistence
- Metadata validation via `metadataSchema` (Zod-compatible)
- Exporters: `NoopExporter`, `ConsoleExporter`, `JsonFileExporter`

**Feature flags (ON in production):**
- Core logging, tasks, digest chain, JSON export, basic compliance checks

**Feature flags (OFF in production -- gated to Pro/Enterprise):**
- `csv-export`, `multi-chain`, `ofac-screening` (advanced), all other gated features

**Deploy:**
- SDK published to npm as `kontext-sdk`
- API server deployed to GCP Cloud Run
- Web + demo on Vercel

**Success criteria:**
- Homepage `ctx.verify()` code snippet works exactly as shown
- npm install -> working compliance check in under 3 minutes
- Interactive demo at demo-lemon-one-19.vercel.app loads fast and shows full flow

### Milestone 2 -- Intelligence Layer (Ship by May 2026)

**Launch trigger:** 50+ npm installs, 5+ SURGE hackathon teams using Kontext

**What ships:**
- `logReasoning(input)` -- agent decision reasoning into digest chain
- `getReasoningEntries(agentId)` -- retrieve reasoning entries
- `generateComplianceCertificate(input)` -- certificate with digest proof + trust score + reasoning
- `getTrustScore(agentId)` -- agent trust score (0-100) with factor breakdown
- `evaluateTransaction(tx)` -- transaction risk evaluation
- `enableAnomalyDetection(config)` -- rule-based detection (free: `unusualAmount`, `frequencySpike`)
- `onAnomaly(callback)` -- anomaly event callback
- `generateSARReport(options)` -- SAR template (Pro)
- `generateCTRReport(options)` -- CTR template (Pro)
- Advanced anomaly rules (Pro): `newDestination`, `offHoursActivity`, `rapidSuccession`, `roundAmount`
- `KontextCloudExporter` -- ships events to Cloud Run API
- Plan metering persisted to Firestore

**Feature flags (turn ON):**
- Trust scoring, basic anomaly detection, reasoning logging, compliance certificates
- Pro-gated: `sar-ctr-reports`, `advanced-anomaly-rules`

**GCP services activated:**
- Firestore for plan metering state and API key management
- Cloud Storage for audit export persistence
- Cloud Scheduler for monthly plan reset

**Success criteria:**
- `logReasoning()` featured on homepage with own section
- 5% free-to-Pro conversion rate
- Pro MRR reaches $500+

### Milestone 3 -- Operational Layer (Ship by July 2026 -- before GENIUS Act regulations)

**Launch trigger:** 10+ Pro customers, inbound compliance officer inquiries

**What ships:**
- `WebhookManager` -- anomaly/task/action webhooks with retry (Pro)
- `ApprovalManager` -- policy-based human-in-the-loop (Pro): `amount-threshold`, `low-trust-score`, `anomaly-detected`, `new-destination`, `manual`
- `ScreeningAggregator` -- pluggable multi-provider screening (Pro)
- `TreasurySDNProvider` (built-in), `ChainalysisOracleProvider`, `OpenSanctionsProvider`
- `ScreeningNotificationManager` -- webhook/SMTP alerts on flagged addresses
- CSV export (Pro)
- Multi-chain support -- all 8 chains (Pro): ethereum, base, polygon, arbitrum, optimism, arc, avalanche, solana
- Blocklist/allowlist manager (Pro)

**Feature flags (turn ON):**
- `webhooks`, `approval-policies`, `unified-screening`, `csv-export`, `multi-chain`, `blocklist-manager`, `ofac-screening`

**GCP services activated:**
- Pub/Sub for webhook delivery queue and anomaly event fanout
- Cloud Scheduler for daily OFAC SDN list sync
- Secret Manager for API keys (Stripe, Chainalysis, Circle)

**Success criteria:**
- Compliance officers can receive webhook alerts and export CSV reports
- Partnership conversations with Sumsub/Vouched initiated
- Positioned for GENIUS Act implementing regulations (July 2026)

### Milestone 4 -- Agent Forensics + Enterprise (Ship when demand proves it)

**Launch trigger:** 3+ inbound enterprise inquiries, proven need for multi-agent analysis

**What ships:**
- `registerAgentIdentity(input)` -- agent identity with wallet mappings (Pro)
- `getWalletClusters()` -- wallet cluster computation (Pro)
- `getKYAExport()` -- identity + clustering data export (Pro)
- `computeBehavioralEmbedding(agentId)` -- feature vectors from transaction history (Enterprise)
- `analyzeAgentLinks()` -- cross-session agent linking (Enterprise)
- `getKYAConfidenceScore(agentId)` -- composite identity confidence score (Enterprise)
- `CCTPTransferManager` -- `initiateTransfer()`, `initiateFastTransfer()` (V2), full lifecycle audit (Enterprise)
- `CircleWalletManager` -- `transferWithCompliance()`, auto-compliance logging (Enterprise)
- `CircleComplianceEngine` -- dual screening integration (Enterprise)
- `GasStationManager` -- gas sponsorship with compliance logging (Enterprise)
- `CFTCCompliance` -- CFTC Letter No. 26-05 digital asset margin compliance (Enterprise)

**Feature flags (turn ON):**
- `kya-identity`, `kya-behavioral`, `cctp-transfers`, `circle-wallets`, `circle-compliance`, `gas-station`, `cftc-compliance`

**GCP services activated:**
- BigQuery for aggregate compliance analytics
- Cloud Storage for long-term forensics data

**Note:** Rename KYA module to "agent-forensics" before marketing. "Know Your Agent" is being branded by Sumsub ($1B+) and Vouched ($22M). Kontext's wallet clustering and behavioral fingerprinting are complementary capabilities, not competing KYA products.

### Milestone 4 Addendum -- TEE Attestation Layer (Enterprise)

**Background:** Catena Labs (https://catenalabs.com) has demonstrated a two-layer security model for agent money movement:
- **Layer 1 (Intelligence):** Application-level identity/reputation checks (ACK-ID, ERC-8004)
- **Layer 2 (Enforcement):** Policies enforced inside a Trusted Execution Enclave -- the enclave won't sign transactions that violate policy. That's not a promise, it's math.

Catena uses **Turnkey** for enclave-backed signing. Turnkey runs on **AWS Nitro Enclaves** (not Intel SGX): isolated compute with no external network, no persistent storage, no interactive access, and a hardware-signed cryptographic attestation document that proves exactly what code has custody of the private keys. Quorum signing (2-of-2 or 2-of-3 across customer passkey + agent + treasury agent) ensures no single party can unilaterally move funds.

**Catena is complementary, not competitive:** Catena enforces at signing; Kontext attests at audit. They solve adjacent problems. A Turnkey integration that bridges both is an enterprise differentiator -- Catena prevents bad transactions, Kontext proves good ones were reviewed correctly.

**What to build in Milestone 4:**
- `KontextEnclaveProvider` interface -- pluggable, so developers bring Turnkey, Fireblocks, or their own TEE
- Attest that `verify()` ran *inside* a TEE, producing a hardware-signed proof that augments the digest chain link
- Tie `ApprovalManager` (Milestone 3) to a 2-of-N quorum requirement enforced at the key level, not just application level
- Feature flag: `tee-attestation` (Enterprise)

**Trigger:** 3+ enterprise customers asking "can you prove the compliance check ran and wasn't tampered with at the infrastructure level?" The digest chain (Patent US 12,463,819 B1) answers this at the software layer; TEE attestation answers it at the hardware layer.

**Partnership path:** Reach out to Catena Labs and Turnkey for co-marketing once Milestone 3 ships. They verify + enforce; we audit + prove. Natural GTM partners for GENIUS Act enterprise compliance.

---

## Feature Flag Configuration

All features use Firestore-backed flags with per-environment, per-plan targeting.

### Flag Schema (stored in Firestore `feature-flags` collection)

```typescript
{
  name: string,           // e.g., "sar-ctr-reports"
  description: string,
  scope: 'sdk' | 'server' | 'website' | 'all',
  targeting: {
    development: { free: boolean, pro: boolean, enterprise: boolean },
    staging:     { free: boolean, pro: boolean, enterprise: boolean },
    production:  { free: boolean, pro: boolean, enterprise: boolean },
  },
  createdAt: string,
  updatedAt: string,
  createdBy: string,
}
```

### Flag States by Milestone

| Flag | M1 (Now) | M2 (May) | M3 (Jul) | M4 (Demand) |
|------|----------|----------|----------|-------------|
| Core logging / tasks / digest | ON all | ON all | ON all | ON all |
| `csv-export` | OFF | OFF | ON pro+ | ON pro+ |
| `multi-chain` | OFF | OFF | ON pro+ | ON pro+ |
| `advanced-anomaly-rules` | OFF | ON pro+ | ON pro+ | ON pro+ |
| `sar-ctr-reports` | OFF | ON pro+ | ON pro+ | ON pro+ |
| `ofac-screening` (advanced) | OFF | OFF | ON pro+ | ON pro+ |
| `webhooks` | OFF | OFF | ON pro+ | ON pro+ |
| `approval-policies` | OFF | OFF | ON pro+ | ON pro+ |
| `unified-screening` | OFF | OFF | ON pro+ | ON pro+ |
| `blocklist-manager` | OFF | OFF | ON pro+ | ON pro+ |
| `kya-identity` | OFF | OFF | OFF | ON pro+ |
| `kya-behavioral` | OFF | OFF | OFF | ON ent |
| `cctp-transfers` | OFF | OFF | OFF | ON ent |
| `circle-wallets` | OFF | OFF | OFF | ON ent |
| `circle-compliance` | OFF | OFF | OFF | ON ent |
| `gas-station` | OFF | OFF | OFF | ON ent |
| `cftc-compliance` | OFF | OFF | OFF | ON ent |

### Plan-Gate Map (from plan-gate.ts)

| Feature | Minimum Plan | Label |
|---------|-------------|-------|
| `advanced-anomaly-rules` | Pro | Advanced anomaly detection rules |
| `sar-ctr-reports` | Pro | SAR/CTR report generation |
| `webhooks` | Pro | Webhook alerts |
| `ofac-screening` | Pro | OFAC sanctions screening |
| `csv-export` | Pro | CSV export |
| `multi-chain` | Pro | Multi-chain support (8 networks) |
| `approval-policies` | Pro | Approval policies |
| `unified-screening` | Pro | Unified screening (OFAC, Chainalysis, OpenSanctions) |
| `blocklist-manager` | Pro | Custom blocklist/allowlist manager |
| `kya-identity` | Pro | Agent identity resolution, wallet clustering |
| `cftc-compliance` | Enterprise | CFTC compliance module |
| `circle-wallets` | Enterprise | Circle Programmable Wallets |
| `circle-compliance` | Enterprise | Circle Compliance Engine |
| `gas-station` | Enterprise | Gas Station integration |
| `cctp-transfers` | Enterprise | CCTP cross-chain transfers |
| `kya-behavioral` | Enterprise | Behavioral fingerprinting, cross-session linking |

---

## Plan Tier System

### Pricing

| Tier | Price | Event Limit | Target User |
|------|-------|-------------|-------------|
| Free | $0 | 20,000/mo | Hackathon builders, side projects, evaluation |
| Pro | $49/mo | 100,000/user/mo | Production autonomous wallet developers |
| Enterprise | Remove from website | Unlimited | Negotiate custom when demand proves it |

### Supported Chains

`ethereum`, `base`, `polygon`, `arbitrum`, `optimism`, `arc`, `avalanche`, `solana`

Free tier: Base only. Pro/Enterprise: all 8 chains.

### Supported Tokens

`USDC`, `USDT`, `DAI`, `EURC`

---

## Developer Journeys

### Journey 1: Hackathon Builder (Free Tier -- Milestone 1)

**Persona:** Sam is building an autonomous payment agent for the SURGE x OpenClaw hackathon. Using Circle Programmable Wallets on Base testnet. Zero compliance experience. Needs it to "just work" in a weekend.

**Discovery:** LabLab.ai tutorial "Add compliance logging to your autonomous wallet agent in 5 minutes" or the Kontext README.

**Step 1 -- Install (30 seconds)**
```bash
npm install kontext-sdk
```

**Step 2 -- Initialize (1 minute)**
```typescript
import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'surge-hackathon',
  environment: 'development',
});
```
No API key needed. Local mode. Zero config.

**Step 3 -- Verify a transaction (2 minutes)**
```typescript
const result = await ctx.verify({
  txHash: '0xabc...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'payment-agent-v1',
});

// result.compliant = true/false
// result.checks = [{ name: 'OFAC Sanctions', passed: true }, ...]
// result.riskLevel = 'low' | 'medium' | 'high' | 'critical'
// result.transaction = TransactionRecord (logged with digest chain)
```
One call. Compliance check + transaction log + structured result.

**Step 4 -- Add human-in-the-loop for high-value transfers (5 minutes)**
```typescript
if (parseFloat(result.transaction.amount) > 3000) {
  const task = await ctx.createTask({
    description: `Approve $${result.transaction.amount} USDC transfer`,
    agentId: 'payment-agent-v1',
    requiredEvidence: ['txHash'],
  });
  // Wait for human confirmation before proceeding
}
```

**Step 5 -- Export audit trail (1 minute)**
```typescript
const audit = await ctx.export({ format: 'json' });
const chainValid = ctx.verifyDigestChain();
// audit.data = JSON-serialized action logs with digest proofs
// chainValid.valid = true (tamper-evident verification)
```

**Step 6 -- Persist across restarts**
```typescript
import { Kontext, FileStorage } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'surge-hackathon',
  environment: 'development',
  storage: new FileStorage('./compliance-data'),
});
```

**Conversion trigger:** Side project graduates from testnet to mainnet. Real USDC flowing. Hits 20K event limit. Upgrades to Pro at $49/mo for cloud persistence and multi-chain support.

### Journey 2: Circle Wallet Developer (Free -> Pro -- Milestones 1-2)

**Persona:** Alex builds autonomous treasury management on Circle Programmable Wallets. Handles $5K-50K USDC transfers. Needs Travel Rule compliance ($3K threshold), OFAC screening, and exportable audit trails for their compliance officer.

**Discovery:** Circle developer community, Dev.to tutorial "GENIUS Act compliance for Circle wallet developers."

**Step 1 -- Install and configure for production**
```typescript
import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  apiKey: 'sk_live_...',
  projectId: 'treasury-agent',
  environment: 'production',
  plan: 'pro',
});
```

**Step 2 -- Wrap every transfer with verify()**
```typescript
// Before executing Circle wallet transfer:
const compliance = await ctx.verify({
  txHash: circleResponse.txHash,
  chain: 'base',
  amount: '25000',
  token: 'USDC',
  from: agentWallet,
  to: recipientAddress,
  agentId: 'treasury-agent-v2',
});

if (!compliance.compliant) {
  // Block transfer. compliance.checks shows exactly what failed.
  // compliance.recommendations suggests next steps.
  return;
}
```

**Step 3 -- Log agent reasoning (Milestone 2)**
```typescript
await ctx.logReasoning({
  agentId: 'treasury-agent-v2',
  action: 'approve-transfer',
  reasoning: 'Transfer within daily limit ($50K). Recipient verified in allowlist. Amount below CTR threshold.',
  confidence: 0.95,
  context: { dailyTotal: '32000', recipientVerified: true },
});
```
When regulators ask "why did your agent approve this?" -- only Kontext users can answer.

**Step 4 -- Trust scoring and anomaly detection (Milestone 2)**
```typescript
const trust = await ctx.getTrustScore('treasury-agent-v2');
// trust.score = 87, trust.level = 'high', trust.factors = [...]

ctx.enableAnomalyDetection({
  rules: ['unusualAmount', 'frequencySpike', 'newDestination'],
  thresholds: { maxAmount: '50000', maxFrequency: 20 },
});

ctx.onAnomaly((event) => {
  // Alert compliance officer via PagerDuty/Slack
  notifyComplianceTeam(event);
});
```

**Step 5 -- Generate compliance certificate**
```typescript
const cert = await ctx.generateComplianceCertificate({
  agentId: 'treasury-agent-v2',
  timeRange: { from: startOfMonth, to: endOfMonth },
  includeReasoning: true,
});
// cert.complianceStatus = 'compliant'
// cert.digestChain.verified = true
// cert.contentHash = SHA-256 of certificate (tamper-evident)
```

**Conversion trigger:** Compliance officer sees the certificate with digest proofs and reasoning entries. Asks for CSV exports and SAR/CTR templates. Pro plan at $49/mo.

### Journey 3: Cross-Chain Builder (Pro -- Milestones 2-3)

**Persona:** Maya runs DeFi agents across Base and Ethereum using CCTP. $110B+ in cross-chain USDC volume with zero compliance layer. Needs unified audit trail across chains and regulatory-ready exports.

**Discovery:** x402 ecosystem listing, Circle CCTP documentation.

**Step 1 -- Multi-chain transaction logging (Pro)**
```typescript
// Log transfers across multiple chains
await ctx.verify({
  txHash: baseTx.hash,
  chain: 'base',
  amount: '15000',
  token: 'USDC',
  from: baseWallet,
  to: ethBridgeAddress,
  agentId: 'defi-agent-v3',
});

await ctx.verify({
  txHash: ethTx.hash,
  chain: 'ethereum',
  amount: '15000',
  token: 'USDC',
  from: ethBridgeAddress,
  to: finalRecipient,
  agentId: 'defi-agent-v3',
});
```

**Step 2 -- Webhook alerts for compliance team (Milestone 3)**
```typescript
// Webhooks deliver anomaly alerts to external systems
// Configured via WebhookManager (Pro tier)
```

**Step 3 -- Unified screening across providers (Milestone 3)**
```typescript
// ScreeningAggregator combines OFAC SDN (built-in) + Chainalysis + OpenSanctions
// Developers bring their own API keys for Chainalysis/OpenSanctions
```

**Step 4 -- SAR/CTR templates for flagged transactions (Milestone 3)**
```typescript
const sar = await ctx.generateSARReport({
  type: 'sar',
  period: { start: flagDate, end: new Date() },
  agentIds: ['defi-agent-v3'],
});
// sar.narrative = auto-generated from anomaly data
// sar.suspiciousTransactions = flagged transfers
// sar.supportingActions = full action log with digest proofs
```

**Conversion trigger:** $49/mo is 100x cheaper than Chainalysis ($100K+/yr). Maya needs multi-chain + CSV exports + SAR templates that the free tier doesn't offer.

---

## Competitive Landscape

| Category | Players | Kontext's Relationship |
|----------|---------|----------------------|
| Agent Identity (KYA) | Sumsub ($1B+), Vouched ($22M) | Complementary. They verify agents. We log what agents do after verification. |
| Blockchain Analytics | Chainalysis, Elliptic, TRM Labs | Complementary. They monitor chains at $100K+/yr. We provide developer SDK at $49/mo. |
| AI Observability | Langfuse, Braintrust, Arize | Different problem. They debug LLM performance. We log compliance-relevant actions with cryptographic proof. |
| AI Governance | Credo AI, IBM watsonx.governance | Different buyer. They serve model governance teams. We serve developers building payment agents. |
| Stablecoin Infrastructure | Bridge.xyz (Stripe), BVNK, Zero Hash | Validates our thesis. Bridge embeds compliance into orchestration. Developers who go direct-to-chain need Kontext. |
| Agentic Compliance | RiskFront ($3.3M pre-seed) | Different direction. They use AI agents for compliance work. We build compliance for AI agents. |

---

## Go-To-Market

### Phase 1: Hackathon Pipeline (Now - March 2026)

1. Ship `verify()` method (Week 1-2)
2. Make interactive demo at `demo-lemon-one-19.vercel.app` load fast and show the full flow: verify() call -> audit trail appearing -> trust score calculating -> digest chain forming (Week 2-3)
3. Publish LabLab.ai tutorial: "Add compliance logging to your autonomous wallet agent in 5 minutes" using Circle Programmable Wallets stack (before March 9)
4. Sponsor SURGE x OpenClaw hackathon "Best Compliance Implementation" track prize ($500-1,000 USDC)

### Phase 2: Content + SEO (April - June 2026)

1. Dev.to tutorial: "GENIUS Act compliance for Circle wallet developers"
2. Dev.to tutorial: "Audit-ready CCTP cross-chain transfer logging"
3. Show HN: "Open-source compliance SDK for autonomous wallet agents"
4. Target SEO terms: "USDC compliance SDK", "AI agent audit trail", "GENIUS Act developer requirements"

### Phase 3: Regulatory Wave (July - November 2026)

1. GENIUS Act implementing regulations published (July 2026)
2. Every developer who shipped autonomous wallet integrations without compliance logging now has a problem. That problem is Kontext's market.
3. Partnership outreach to Sumsub and Vouched: "Your KYA verifies the agent. Our SDK logs what the agent does after verification."

### Website Fixes (Immediate)

1. **Remove placeholder testimonials.** Three fake quotes with "Coming soon -- Early adopter testimonials" actively undermines trust for a trust and compliance company. Replace with npm download count, GitHub stars, patent number.
2. **Fix pricing.** $449/user/mo -> $49/mo for Pro. Remove Enterprise tier page entirely.
3. **Add `logReasoning()` to features grid.** Currently not mentioned. It's the single strongest differentiator.
4. **Fix hero code snippet.** Currently shows `ctx.verify()` which doesn't exist yet. Ship the method first, then the code sample is accurate.
5. **Verify interactive demo loads.** The iframe points to `demo-lemon-one-19.vercel.app`. If it doesn't load fast, it's a broken conversion touchpoint.
6. **Update "Unified Screening" copy.** Currently says "aggregating OFAC SDN, Chainalysis, and OpenSanctions into a single result." Clarify: "OFAC SDN included. Chainalysis and OpenSanctions available via pluggable provider architecture."
7. **Update regulatory reference.** Old CLAUDE.md referenced "CLARITY Act (H.R. 3633)" -- the correct reference is the GENIUS Act (S. 1582), signed July 18, 2025.

---

## Success Metrics

### Leading Indicators (change weekly)

| Metric | Target | Timeframe |
|--------|--------|-----------|
| npm weekly installs | 50+ organic | First 2 weeks post-tutorial |
| LabLab tutorial views | 500+ | First 30 days |
| GitHub stars | 100+ | First 60 days |
| Dev.to tutorial click-through to npm | 10%+ | Ongoing |
| SURGE hackathon teams using Kontext | 5+ | March 9-22 |

### Lagging Indicators (change monthly)

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Monthly active SDK users (unique projectIds) | 50+ | 90 days post-launch |
| Free -> Pro conversion rate | 5%+ | 90 days post-launch |
| Pro MRR | $500+ | 90 days post-launch |
| Inbound enterprise inquiries | 3+ | By July 2026 (regulations drop) |

---

## Open Questions

| Question | Owner | Priority |
|----------|-------|----------|
| Should `verify()` be async and hit an external API, or purely local like `checkUsdcCompliance()`? | Engineering | P0 (blocks Milestone 1) |
| What's the actual demo app state at `demo-lemon-one-19.vercel.app`? Does it load? Is it functional? | Engineering | P0 (blocks launch) |
| Can we get a "Best Compliance Implementation" track at SURGE x OpenClaw? What's the cost? | Founder | P0 (deadline: before March 9) |
| Should the free tier include `logReasoning()` or gate it to Pro? Including it free maximizes adoption; gating it drives conversion. | Product | P1 |
| OFAC SDN list: how often is the built-in list updated? Ship Cloud Scheduler for daily sync? | Engineering | P1 |
| Is there a partnership path with Circle DevRel for co-marketing the compliance tutorial? | Founder | P1 |
| Migrate server in-memory store (ServerStore) to Firestore for persistence across Cloud Run restarts? | Engineering | P1 |
| Rename KYA module internally to "agent-forensics" to avoid Sumsub/Vouched branding collision? | Engineering | P2 |

---

## Server (`packages/server/`)

Hono framework, Stripe integration for billing. Deployed to GCP Cloud Run (primary) and Vercel (fallback serverless via vercel-entry.ts).

**Routes (no auth):** `GET /` (health), `GET /health`
**Routes (auth required):** `POST /v1/actions`, `POST /v1/tasks`, `PUT /v1/tasks/:id/confirm`, `GET /v1/tasks/:id`, `GET /v1/audit/export`, `GET /v1/trust/:agentId`, `POST /v1/anomalies/evaluate`
**Stripe routes:** `POST /checkout/pro`, `POST /webhooks/stripe`

**Rate limiting:** 100 requests per 60 seconds per IP (sliding window).

## Web App (`apps/web/`)

Next.js 14.2 marketing site. Deployed to Vercel.

**Pages:** `/`, `/pricing`, `/audiences/:slug`, `/blog/:slug`, `/docs`, `/faqs`, `/use-cases`, `/integrations`, `/about`, `/changelog`, `/checkout/success`, `/checkout/cancel`

## Commands

### SDK (run from `packages/sdk/`)
```bash
pnpm test              # vitest run (all tests)
pnpm run typecheck     # tsc --noEmit
pnpm build             # tsup (CJS + ESM + types)
npx vitest run tests/kya-*.test.ts   # run specific test group
```

### Monorepo root
```bash
pnpm -r test           # test all packages
pnpm -r build          # build all packages
```

## Testing Conventions

- **Framework**: Vitest v1.6 (`describe`/`it`/`expect`)
- **Test location**: `packages/sdk/tests/` (flat, prefixed by module)
- **Naming**: `{module}.test.ts` or `{module}-{aspect}.test.ts`
- **Client helper**: `function createClient(plan) { return Kontext.init({...}) }`
- **Cleanup**: `afterEach(async () => { await kontext.destroy(); })`
- **Imports**: From `../src/index.js` for public API, direct from `../src/{module}.js` for internals
- **Error testing**: `expect(() => ...).toThrow(/regex/)` for sync, `await expect(...).rejects.toThrow()` for async
- **Plan-gate completeness test**: `plan-gate-completeness.test.ts` auto-tests every GatedFeature against every tier

## Style Guidelines

- No emojis in code/docs unless user requests
- Keep modules self-contained; apply plan gating at consumer (client) level
- All wallet addresses normalized to lowercase
- Use `generateId()` and `now()` from utils for IDs and timestamps
- Prefer `Record<string, unknown>` for arbitrary metadata
- Return defensive copies from registries/stores (spread or `Array.from`)
