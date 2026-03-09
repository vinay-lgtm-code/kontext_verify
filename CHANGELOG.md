# Changelog

All notable changes to the Kontext SDK and platform are documented here.

## [1.0.0] - 2026-03-08

### Phase B — Operational Layer

#### Added
- Slack and email notification service with configurable triggers (block, review, recipient_not_credited, refund_required)
- CSV and JSON export endpoint (`GET /v1/export/attempts`) with archetype, chain, state, and date filters
- Ops dashboard with 5 views: Needs Action, All Attempts, Failures, Usage & Billing, Health
- Bridge.xyz provider adapter — normalizes Bridge transfer lifecycle into stage events
- Modern Treasury provider adapter — normalizes payment order lifecycle into stage events
- Notification configuration in WorkspaceProfile
- 6 API tests, 17 adapter tests (total: 92 tests passing)

### Phase A — Payment Control Plane

#### Added
- 8-stage payment lifecycle: intent, authorize, prepare, transmit, confirm, recipient_credit, reconcile, retry_or_refund
- `@kontext/core` package: AttemptLedger, ReceiptLedger, DigestChain, policy engine, workspace profiles
- `kontext-sdk` hybrid client with stage APIs: `start()`, `authorize()`, `record()`, `broadcast()`, `confirm()`, `credit()`, `fail()`, `refund()`, `get()`, `list()`
- Policy engine: OFAC sanctions screening, amount limits, daily aggregates, blocklists, metadata requirements
- 6 provider adapters: EVM, Solana, Circle, x402, Bridge, Modern Treasury
- 5 workspace profile presets: micropayments, treasury, invoicing, payroll, cross_border
- Cloud Run API with Hono: attempts CRUD, stage event append, sync, export
- CLI commands: init, login, trace, debug, logs, workspace
- FileStorage and MemoryStorage adapters
- 22 core tests, 64 SDK tests, 6 API tests

#### Changed
- Complete product pivot from compliance logging SDK to Payment Control Plane
- Replaced `verify()` single-call pattern with 8-stage lifecycle management
- Replaced trust scoring / anomaly detection with policy engine authorization
- Replaced agent-centric model (agentId) with actor-centric model (actorId)

#### Removed
- Legacy compliance modules moved to `future_milestones/`: trust scoring, anomaly detection, KYA, CCTP, Circle Compliance, Gas Station, CFTC, Vercel AI, screening providers, approval manager, webhooks

## [0.4.0] - 2026-02-18

### Added
- `verify()` convenience method (compliance check + transaction log in one call)

### Changed
- Phase 1 cleanup: removed Milestone 2-4 source files from compilation

## [0.1.0] - 2026-01-15

### Added
- Initial SDK release with action logging, task confirmation, and audit export
