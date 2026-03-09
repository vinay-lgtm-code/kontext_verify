# Kontext — Payment Control Plane

## Company Context

Legaci Labs Inc. Bootstrapped with $50,000 ($25K cash, $25K GCP credits). Solo founder. Patented tamper-evident digest chain for payment audit trails.

## Product

Kontext is a TypeScript SDK that gives every payment a structured lifecycle. 8 stages. Built-in policy engine. 6 provider adapters. Dashboard, notifications, CSV export. The infrastructure to track, authorize, and reconcile payments across any rail.

**One-line positioning:** Payment lifecycle management for modern fintech.

**Package:** `kontext-sdk` on npm. **License:** MIT. **Zero runtime dependencies.**

## Target Users

1. **Fintech Startups** — Building payment products, need lifecycle infrastructure instead of console.log + Slack
2. **Treasury/Ops Teams** — Need visibility into every payment stage, alerts on failures, exportable audit trails
3. **Payment Platform Builders** — Normalizing multiple payment rails (EVM, Solana, Circle, Bridge, Modern Treasury) into a unified data model

---

## Repository Structure

pnpm monorepo (`pnpm-workspace.yaml`).

```
packages/
  core/       @kontext/core — AttemptLedger, policy engine, digest chain, types
  sdk/        kontext-sdk — hybrid client with stage APIs + provider adapters
  cli/        @kontext/cli — CLI commands (init, login, trace, debug, logs)
  demo/       @kontext/demo — interactive demo
  server/     @kontext/server — legacy API server (Hono)
apps/
  api/        Cloud Run API — attempts, export, notifications (Hono)
  web/        Next.js marketing site + ops dashboard (Vercel)
```

## 8-Stage Payment Lifecycle

```
intent -> authorize -> prepare -> transmit -> confirm -> recipient_credit -> reconcile -> retry_or_refund
```

Every payment is a `PaymentAttempt`. Each stage appends a `StageEvent` with:
- `stage`: one of the 8 stages
- `status`: `pending | succeeded | failed | review | collect_info`
- `actorSide`: `sender | recipient | network | provider | internal`
- `code`: machine-readable event code (e.g., `TX_BROADCAST`, `OFAC_CLEAR`)
- `message`: human-readable description
- `timestamp`: ISO 8601
- `payload?`: arbitrary metadata

Terminal states (`finalState`): `pending | succeeded | failed | review | blocked | refunded`

## Core Data Model (`packages/core/src/types.ts`)

```typescript
type StageName = 'intent' | 'authorize' | 'prepare' | 'transmit' | 'confirm' | 'recipient_credit' | 'reconcile' | 'retry_or_refund';
type Archetype = 'payroll' | 'remittance' | 'invoicing' | 'treasury' | 'micropayments';
type Chain = 'base' | 'ethereum' | 'solana';
type SettlementAsset = 'USDC' | 'EURC' | 'USDT';
type FinalState = 'pending' | 'succeeded' | 'failed' | 'review' | 'blocked' | 'refunded';

interface PaymentAttempt {
  attemptId, workspaceRef, appRef, archetype, intentCurrency, settlementAsset,
  chain, senderRefs, recipientRefs, executionSurface, providerRefs,
  stageEvents: StageEvent[], finalState, linkedReceiptIds?, createdAt, updatedAt
}

interface PaymentReceipt {
  receiptId, decision, allowed, checksRun, violations, requiredActions,
  chain, token, amount, from, to, createdAt, digestProof: { terminalDigest, chainLength, valid }
}
```

## SDK Client API (`packages/sdk/src/client.ts`)

```typescript
// Initialization
static init(config: KontextConfig): Kontext;
static inMemory(config: KontextConfig): Kontext;

// Payment Lifecycle
async start(input: StartAttemptInput): Promise<PaymentAttempt>;
async record(attemptId, stage, event): Promise<PaymentAttempt>;
async broadcast(attemptId, txHash, chain?): Promise<PaymentAttempt>;
async confirm(attemptId, confirmation): Promise<PaymentAttempt>;
async credit(attemptId, evidence): Promise<PaymentAttempt>;
async fail(attemptId, reason, stage?): Promise<PaymentAttempt>;
async refund(attemptId, data): Promise<PaymentAttempt>;
async get(attemptId): Promise<PaymentAttempt | undefined>;
list(filter?: AttemptFilter): PaymentAttempt[];

// Authorization (runs policy engine)
async authorize(attemptId, input): Promise<{ attempt, receipt }>;

// Workspace
profile(): WorkspaceProfile;
configure(p: WorkspaceProfile): void;

// Lifecycle
async flush(): Promise<void>;
async destroy(): Promise<void>;
```

## Policy Engine (`packages/core/src/policy.ts`)

`authorize()` runs these checks:
1. **OFAC Sanctions** — built-in SDN list, no API key required
2. **Amount Limits** — per-transaction max and daily aggregate
3. **Review Threshold** — flags amounts above threshold for human review
4. **Blocklists** — sender and recipient address blocking
5. **Metadata Requirements** — archetype-specific required fields

Returns `PaymentReceipt` with `{ allowed: boolean, violations: PolicyViolation[] }`.

## Provider Adapters (`packages/sdk/src/adapters/`)

6 adapters implement the `ProviderAdapter` interface:

```typescript
interface ProviderAdapter {
  name: string;
  supportedStages: StageName[];
  normalizeEvent(providerEvent: unknown): StageEvent;
}
```

| Adapter | Provider | Stages |
|---------|----------|--------|
| `EVMAdapter` | Ethereum, Base, Polygon | transmit, confirm |
| `SolanaAdapter` | Solana | transmit, confirm |
| `CircleAdapter` | Circle Programmable Wallets | prepare, transmit, confirm |
| `X402Adapter` | x402 micropayments | intent, prepare, transmit, confirm |
| `BridgeAdapter` | Bridge.xyz (Stripe) | prepare, transmit, confirm, recipient_credit |
| `ModernTreasuryAdapter` | Modern Treasury | prepare, transmit, confirm, reconcile, retry_or_refund |

## Workspace Profiles (`packages/core/src/profile.ts`)

Archetype presets configure policy per payment type:

| Archetype | Max TX | Daily Limit | Review Threshold |
|-----------|--------|-------------|------------------|
| `micropayments` | $100 | $10,000 | $50 |
| `treasury` | $25,000 | $100,000 | $10,000 |
| `invoicing` | $20,000 | $50,000 | $5,000 |
| `payroll` | $15,000 | $200,000 | $10,000 |
| `cross_border` | $10,000 | $25,000 | $3,000 |

`WorkspaceProfile` includes: version, workspaceId, name, archetypes[], chains[], assets[], executionSurfaces[], policyPosture (monitor|enforce), policies, retryDefaults, redactionPolicy, notifications?.

## Cloud Run API (`apps/api/`)

Hono framework, port 8080.

**Routes:**
- `POST /v1/attempts` — create attempt
- `GET /v1/attempts/:id` — get attempt
- `PUT /v1/attempts/:id/stages` — append stage event
- `POST /v1/attempts/sync` — bulk sync attempts
- `GET /v1/export/attempts` — CSV/JSON export with filters (archetype, chain, state, since, until)
- `PUT /v1/attempts/:id/notifications` — set notification config

**Notifications (`apps/api/src/services/notifications.ts`):** Slack webhooks + email on triggers: `block`, `review`, `recipient_not_credited`, `refund_required`.

## Ops Dashboard (`apps/web/src/app/dashboard/`)

5 views with Terminal Noir design:
1. **Needs Action** (`/dashboard`) — blocked, review, failed, refunded attempts
2. **All Attempts** (`/dashboard/attempts`) — full list with stage/state filters
3. **Failures** (`/dashboard/failures`) — group-by stage/chain/archetype
4. **Usage & Billing** (`/dashboard/billing`) — event counts, utilization bar
5. **Health** (`/dashboard/health`) — success/failure rates by chain and archetype

## Website (`apps/web/`)

Next.js 14.2 at getkontext.com. Deployed to Vercel. Terminal Noir design system:
- Background: `#09090b`, Accent: `#4ade80` (green), Font: Martian Mono
- Zero border-radius, CRT scanlines, grain texture
- Colors: green (success), amber (warning/review), red (failure/blocked), blue (info/links)

**Pages:** `/`, `/docs`, `/pricing`, `/use-cases`, `/integrations`, `/faqs`, `/blog`, `/about`, `/contact`, `/audiences/*`, `/dashboard/*`, `/privacy`, `/terms`, `/checkout/*`

## Pricing

| Tier | Price | Limit |
|------|-------|-------|
| Free | $0 forever | 20,000 payment stage events/month, Base chain |
| Pay-as-you-go | $2.00/1K events above 20K | All chains, CSV export, notifications |

**What counts as an event:** Each call to `start()`, `authorize()`, `record()`, `broadcast()`, `confirm()`, `credit()`, `fail()`, `refund()`. Reads (`get()`, `list()`) are free.

## Commands

### SDK (from `packages/sdk/`)
```bash
pnpm test              # vitest (64 tests)
pnpm run typecheck     # tsc --noEmit
pnpm build             # tsup (CJS + ESM + types)
```

### Core (from `packages/core/`)
```bash
pnpm test              # vitest (22 tests)
pnpm build             # tsup
```

### API (from `apps/api/`)
```bash
pnpm test              # vitest (6 tests)
```

### Monorepo root
```bash
pnpm -r test           # test all packages (92 tests total)
pnpm -r build          # build all packages
pnpm lint              # eslint
```

## Testing Conventions

- **Framework:** Vitest v1.6 (`describe`/`it`/`expect`)
- **Test location:** `packages/*/tests/` and `apps/*/tests/`
- **Client helper:** `Kontext.inMemory({ projectId: 'test', environment: 'development' })`
- **Cleanup:** `afterEach(async () => { await ctx.destroy(); })`
- **Imports:** From `../src/index.js` for public API, direct from `../src/{module}.js` for internals
- **Error testing:** `expect(() => ...).toThrow(/regex/)` for sync, `await expect(...).rejects.toThrow()` for async

## Style Guidelines

- No emojis in code/docs unless user requests
- Keep modules self-contained
- All wallet addresses normalized to lowercase
- Amounts are strings to avoid floating point
- Use `generateId()` and `now()` from `@kontext/core` for IDs and timestamps
- Prefer `Record<string, unknown>` for arbitrary metadata
- Return defensive copies from registries/stores
- Imports use `.js` extension (ESM-style)
- Strict TypeScript: `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`

## Infrastructure

| Service | Purpose |
|---------|---------|
| **GCP Cloud Run** | API server (`apps/api/`) |
| **Vercel** | Marketing site + dashboard (`apps/web/`) |
| **Firestore** | Feature flags, plan metering (future) |
| **GCS** | Audit trail exports (future) |
| **Pub/Sub** | Webhook delivery queue (future) |

## Compliance Context

The policy engine includes OFAC sanctions screening (built-in SDN list), amount limits aligned with BSA thresholds ($3K Travel Rule, $10K CTR, $50K Large TX), and audit trails aligned with the GENIUS Act (signed July 2025, implementing regulations due July 2026). Compliance is a feature of the policy engine, not the primary product positioning.

## DigestChain (Patented)

`@kontext/core` includes a tamper-evident SHA-256 hash chain. Every `PaymentReceipt` is appended to the chain. `verifyChain()` walks the chain and validates integrity. This is the cryptographic proof that authorization checks actually ran.

## Roadmap

### Shipped
- **Phase A:** 8-stage lifecycle, AttemptLedger, policy engine, SDK client, 6 provider adapters, Cloud Run API, CLI, workspace profiles
- **Phase B:** Slack/email notifications, CSV/JSON export, ops dashboard (5 views), Bridge + Modern Treasury adapters

### Next
- Website rebrand to Payment Control Plane positioning
- Firestore persistence for plan metering
- Webhook delivery via Pub/Sub
- Multi-chain pricing unlock after $5 cumulative spend
