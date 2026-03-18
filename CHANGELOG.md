# Changelog

All notable public changes to the Kontext SDK and platform are documented here.

## [0.12.0] - 2026-03-17

### Added
- **Reserve reconciliation logging**: `logReserveSnapshot()` queries on-chain `totalSupply()` via raw JSON-RPC and logs a tamper-evident snapshot (supply, block number, block hash) into the digest chain
- `ReserveReconciler` static utility class for on-chain supply verification — zero dependencies, same pattern as `UsdcCompliance`
- `verify()` integration: optional `reserveSnapshot` flag auto-captures stablecoin supply alongside every payment
- Tolerance alerting: `reserveDiscrepancy` anomaly fires on `onAnomaly()` callbacks when supply/reserve delta exceeds threshold
- `generateComplianceCertificate()` now includes a `reserveReconciliation` section summarizing snapshot history, discrepancy count, and latest status
- Dashboard "Reserve State at Time of Payment" evidence drawer panel — LED indicator, block hash proof, delta display
- CLI `kontext reconcile` command — queries on-chain supply and prints human-readable reconciliation output
- Python client `log_reserve_snapshot()` (sync + async) and `ReserveSnapshot` Pydantic model
- Landing page "Reserve reconciliation" section with code example and live evidence card
- All 8 chains available from day one — no plan gate, no cumulative spend requirement

### Changed
- `AnomalyRuleType` union extended with `'reserveDiscrepancy'`
- `AnomalyDetector` gains public `reportAnomaly()` method for integration-driven anomaly events

## [0.11.1] - 2026-03-17

### Added
- PostgreSQL persistence with migration runner (auto-runs on startup)
- Multi-rail billing: Stripe (fiat), Circle Programmable Wallets (USDC/EURC/USDT), direct Base wallet transfers
- Subscriptions and API key management tables (migration 004)
- Billing status endpoint (`GET /v1/billing/status`)
- Circle/Base wallet payment verification endpoint (`POST /v1/billing/verify-payment`)
- Server version centralized in `version.ts` (single source of truth)
- Startup banner shows storage mode (PostgreSQL vs In-memory)
- Cloud SQL instance attachment in CI/CD deploy pipeline
- GCP Cloud Monitoring uptime check and alerting

### Changed
- Pricing updated: Pro ($449/mo) → Startup ($2,000/mo, invite-only)
- Server version bumped to 0.11.1
- npm publish auth fixed in release workflow (was deleting auth token)
- `pg` added to tsup externals for proper bundling

## [0.11.0] - 2026-03-12

### Added
- Wallet provider configuration for Circle Programmable Wallets, Coinbase Developer Platform (CDP), and MetaMask Embedded Wallets
- `CircleWalletManager`, `CoinbaseWalletManager`, `MetaMaskWalletManager` classes (enterprise-gated)
- CLI wizard prompts for wallet provider setup with API key scope guidance, credential validation, and secrets storage (`.env`, GCP Secret Manager, AWS Secrets Manager, HashiCorp Vault)
- Plan gating for `coinbase-wallets` and `metamask-wallets` features

## [0.10.0] - 2026-03-08

### Added
- CLI-first onboarding via `npx kontext init` interactive wizard
- `kontext.config.json` configuration file for zero-arg `Kontext.init()`
- Hybrid viem auto-instrumentation: `withKontextCompliance()` wraps `sendTransaction`/`writeContract`
- On-chain wallet monitoring via `WalletMonitor` for ERC-20 Transfer events
- `ConfigLoader` for walking directory tree to find config files

### Changed
- README rewritten with trust layer positioning and CLI-first onboarding flow

## [0.9.0] - 2026-03-04

### Added
- Pluggable sanctions screening architecture with `ScreeningProvider` interface
- `ScreeningAggregator` for multi-provider consensus screening
- `OFACAddressProvider` (built-in, free), `OpenSanctionsProvider`, `ChainalysisFreeAPIProvider`
- `TreasurySDNProvider` for Treasury SDN list sync
- `ScreeningNotificationManager` for webhook/SMTP alerts on flagged addresses
- Website redesign: split-view hero, interactive playground, airport flipboard currency effect

## [0.8.0] - 2026-03-01

### Added
- ERC-8021 transaction attribution integration for builder identification
- Agent forensics SDK wiring: identity registry, wallet clustering, behavioral fingerprint, cross-session linker, confidence scorer
- Terminal Noir website redesign with unified dark aesthetic

## [0.7.0] - 2026-02-27

### Added
- On-chain digest anchoring on Base via `anchorDigest()`, `verifyAnchor()`, `getAnchor()`
- `KontextAnchor` Solidity contract deployed to Base Sepolia
- `OnChainExporter` for automatic digest anchoring at batch boundaries
- A2A compliance attestation exchange via `exchangeAttestation()`
- Agent provenance with delegated sessions and checkpoints
- CLI extracted into standalone `@kontext-sdk/cli` package
- Python thin client wrapping Kontext REST API

## [0.6.0] - 2026-02-24

### Added
- KYA module: agent identity registry, wallet clustering, behavioral fingerprint, cross-session linking, confidence scoring (enterprise-gated, feature-flagged)
- `TreasurySDNProvider` for built-in OFAC SDN screening
- Screening notification manager for compliance alerts

### Fixed
- CI pipeline fixes: public repo sync, server/SDK builds for free-tier CI, TypeScript alignment

## [0.5.0] - 2026-02-20

### Added
- Standalone `@kontext-sdk/cli` package with `check`, `verify`, `reason`, `cert`, `audit`, `sync`, `mcp` commands
- MCP server exposing compliance tools for AI coding assistants (Claude Code, Cursor, Windsurf)
- Custom blocklist/allowlist manager (pro-gated)

### Fixed
- CI/CD: npm provenance, CodeQL workflow, sync-public credential handling

## [0.4.0] - 2026-02-18

### Added
- `verify()` convenience method: logs a transaction and runs USDC compliance checks in one call, returning a `VerifyResult` with compliance status, risk level, checks, recommendations, and the logged `TransactionRecord`
- `VerifyInput` and `VerifyResult` types exported from the SDK

### Changed
- Phase 1 cleanup: removed all Milestone 2–4 source files from git tracking (trust scoring, anomaly detection, SAR/CTR reports, compliance certificates, agent reasoning, approval manager, KYA module, CCTP, Circle Wallets, Circle Compliance, Gas Station, CFTC, screening aggregator/providers, Vercel AI integration, webhooks). All removed code is preserved locally and excluded from the TypeScript compile and test runs.
- Removed `HttpExporter`, `KontextCloudExporter`, and `MultiExporter` from the public SDK surface (Phase 2)
- Removed `sar` and `ctr` from `ReportType`; removed approval-related types from `KontextConfig`
- Updated `tsconfig.json` to explicitly exclude non-Phase-1 source paths from compilation

### Removed
- Non-Phase-1 exports: KYA, CCTP, Circle Wallets/Compliance, Gas Station, CFTC, Webhooks, Vercel AI integration, screening providers, approval manager, Http/Cloud/Multi exporters, trust scoring types, anomaly config types, reasoning types, certificate types, approval types


## [0.3.1] - 2026-02-10

### Added
- Gate BlocklistManager behind Pro plan (not available on free tier)


## [0.3.0] - 2026-02-10

### Added
- Fix approval.ts index signature TypeScript errors blocking CI build
- Update website copy and plan gating for unified screening
- Add unified screening provider architecture with 4 pluggable providers
- Fix payment-flows.md inaccuracies and add 96 tests for full coverage
- Move Changelog from header nav to footer Product section
- Document all payment flows and add plan gating integration tests
- Add ApprovalManager for human-in-the-loop action approval
- Fix changelog: prebuild script fetches CHANGELOG.md from GitHub
- Fix changelog on Vercel: fetch CHANGELOG.md from GitHub at build time
- log changelog path resolution on Vercel
- Fix changelog: inject content via env var at config time
- Fix changelog on Vercel: set outputFileTracingRoot to monorepo root
- Fix changelog page on Vercel: copy CHANGELOG.md at build time
- Add plan gating to SDK and align marketing copy with actual features


## [0.2.5] - 2026-02-10

### Changed
- Switched npm publish to trusted publishing via GitHub Actions OIDC (no tokens needed)

### Fixed
- TypeScript strict mode errors in OFAC sanctions DTS build
- pnpm lockfile sync and demo workspace reference
- Release workflow: pnpm version conflict, gitignored file handling

## [0.2.1] - 2026-02-10

### Added
- Full-stack feature flag system with Firestore backend, plan-aware targeting (Free/Pro/Enterprise), and stale-while-revalidate caching across SDK, server, and website
- `FeatureFlagManager` class in SDK for synchronous `isEnabled()` checks
- `<FeatureFlag>` React server component for conditional rendering
- `GET /v1/flags` and `GET /v1/flags/:name` API endpoints
- `requireFlag()` middleware for gating server routes behind feature flags
- CI/CD pipelines: test/build on push, Cloud Run deploy, Vercel deploy
- Renovate for automated dependency management
- Changelog tracking (public + internal)

### Fixed
- Stripe test mock using arrow function instead of constructor function

## [0.2.0] - 2026-02-09

### Added
- Pluggable `EventExporter` interface with 6 built-in implementations (Noop, Console, JsonFile, HTTP, KontextCloud, Multi)
- CFTC 26-05 compliance module for FCM digital asset margin requirements
- Per-user pricing: $449/seat/mo with per-seat event limits
- Stripe Checkout integration with subscription billing
- Comprehensive OFAC sanctions screening with SDN list support
- Circle Programmable Wallets integration
- Circle Compliance Engine integration
- Gas Station sponsorship manager
- CCTP V2 cross-chain transfer support with hooks
- Vercel AI SDK middleware integration
- Webhook manager with retry logic
- Agent reasoning and compliance certificates
- Tamper-evident digest chain with SHA-256 rolling hashes
- Trust scoring and anomaly detection

### Changed
- SDK now uses plan-based event metering (Free: 20K, Pro: 100K/seat, Enterprise: unlimited)

## [0.1.0] - 2026-01-15

### Added
- Initial SDK release with action logging, task confirmation, and audit export
- Support for Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche, Solana
- USDC compliance checks
- JSON and CSV export formats
- Local and cloud operating modes