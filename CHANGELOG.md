# Changelog

All notable public changes to the Kontext SDK and platform are documented here.

## [0.5.1] - 2026-02-24

### Added
- Add KYA module, Treasury SDN provider, screening notifications, and FAQ updates
- Remove BlocklistManager from open-source main branch
- Add custom blocklist/allowlist to Pro tier on pricing page and FAQs

### Fixed
- server and SDK builds for free-tier CI (#2)
- unblock CI pipeline and enable public repo sync (#1)


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