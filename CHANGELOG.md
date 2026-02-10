# Changelog

All notable public changes to the Kontext SDK and platform are documented here.

## [0.3.2] - 2026-02-10

### Added
- Update release workflow to publish from release branch
- Add custom blocklist/allowlist to Pro tier on pricing page and FAQs


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
- Per-user pricing: $199/seat/mo with per-seat event limits
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