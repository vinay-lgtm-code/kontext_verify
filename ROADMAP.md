# Kontext Roadmap

**Last Updated:** February 9, 2026
**Entity:** Legaci Labs Inc

---

## Vision

Kontext is the trust and compliance layer for the agent economy. As AI agents autonomously move money across stablecoins, fiat rails, and DeFi protocols, every transaction needs to be verifiable, auditable, and trustworthy.

---

## What Ships Today

### Know Your Agent (KYA)
The industry is shifting from KYC (Know Your Customer) to KYA (Know Your Agent). Kontext is purpose-built for this:
- **Agent-level trust scoring** -- real-time scores based on history, task completion, anomaly rate, and consistency
- **Per-agent anomaly detection** -- behavioral profiling that flags when an agent deviates from its baseline
- **Agent reasoning logs** -- capture and audit the decision-making process behind every agent action
- **Compliance certificates** -- generate verifiable, tamper-evident proof of what an agent did
- **Patented digest chain** -- cryptographic linking that proves the full history of any agent's actions

### Embedded Compliance
Leading fintechs are embedding regulatory policy logic directly into agent code. Kontext makes this a 5-line integration:
- **Inline policy enforcement** -- anomaly detection rules run on every action before execution
- **OFAC screening** -- 33+ sanctioned addresses, 14 jurisdictions, 5 evasion pattern detectors
- **Framework-agnostic** -- works with LangChain, CrewAI, Vercel AI SDK, or any custom framework
- **Zero-config defaults** -- sensible compliance rules out of the box, fully configurable

### FCM Digital Asset Collateral (CFTC Letter 26-05)
- Collateral valuation logging with automated haircut validation (20% minimum for non-BTC/ETH per CFTC)
- Weekly CFTC digital asset reports by asset type and account class
- Daily segregation calculation tracking (futures, cleared swaps, 30.7 accounts)
- Cybersecurity incident reporting per Commission Regulation 1.11
- GENIUS Act-aligned stablecoin definitions

### Core SDK
- Action logging with tamper-evident digest chain
- Trust scoring API with factor breakdown
- Anomaly detection (6 rule types: unusual amount, frequency spike, new destination, off-hours, rapid succession, round amount)
- USDC compliance checks across 5 chains (Ethereum, Base, Polygon, Arbitrum, Optimism)
- CCTP cross-chain transfer tracking
- SAR/CTR report templates
- Audit export (JSON, CSV)
- Plan metering with per-seat pricing
- Stripe checkout integration

---

## Roadmap

### Q2 2026: Nanopayment Scale

**Why now:** AI agents are driving a surge in sub-cent transactions (micropayments) for API calls and content consumption. The x402 protocol enables HTTP-native micropayments. Volumes can reach millions of events per day -- beyond current event tiers.

- [ ] High-throughput batch event ingestion (100K+ events/second)
- [ ] Streaming digest chain mode -- append-only with deferred verification for high-frequency flows
- [ ] Nanopayment-specific anomaly rules (velocity patterns, dust attack detection, aggregation thresholds)
- [ ] x402 protocol deep integration -- intercept HTTP payment headers, auto-log, auto-verify
- [ ] Usage-based billing option for nanopayment volumes (millions of events/mo)
- [ ] Lightweight SDK mode -- sub-1ms overhead per event for latency-sensitive micropayment flows
- [ ] Aggregated digest checkpoints -- periodic rollup digests for high-volume streams

### Q3 2026: DeFi Autonomous Agent Support

**Why now:** Specialized smart contract modules (e.g., Sky Agents, launched Q1 2026) are autonomously managing stablecoin yields and liquidity across DeFi protocols. These agents make high-frequency, high-stakes decisions without human oversight.

- [ ] DeFi position logging -- track yield strategies, liquidity provisions, and rebalancing actions
- [ ] Smart contract event integration -- subscribe to on-chain events and auto-log into the digest chain
- [ ] Yield strategy audit trails -- end-to-end logging of deposit, rebalance, harvest, and withdrawal cycles
- [ ] Protocol-specific integrations (Aave, Compound, Uniswap, Sky Protocol)
- [ ] Cross-protocol risk scoring -- trust scores that account for multi-protocol exposure
- [ ] Governance action logging -- DAO votes, proposal submissions, treasury movements
- [ ] Liquidation monitoring and alerting -- detect and log forced liquidations
- [ ] DeFi-specific anomaly rules (impermanent loss, oracle deviation, flash loan patterns)

### Q4 2026: Agent Identity Infrastructure

**Why now:** As KYA matures, the industry needs standardized agent identity, permissioning, and credential systems. No standard exists yet.

- [ ] Agent identity registry -- register, verify, and manage agent identities with cryptographic credentials
- [ ] Agent permission scoping -- define what actions an agent can take, with what limits, on which chains
- [ ] Agent credential issuance -- verifiable credentials based on trust score and compliance history
- [ ] Cross-platform agent reputation -- portable trust scores across platforms
- [ ] Agent-to-agent trust verification -- agents verify each other's compliance status before transacting
- [ ] Integration with emerging agent identity standards (W3C DID, agent-specific extensions)

### Future

- [ ] ML-based anomaly detection (pattern-based, trained on agent history)
- [ ] MiCA compliance templates (EU market expansion)
- [ ] Python SDK
- [ ] Cloud compliance dashboard (web UI)
- [ ] PDF export with embedded digest proofs
- [ ] SOC 2 Type II certification
- [ ] HSM integration via cloud KMS providers

---

## Completed (Q1 2026)

- [x] Core SDK: action logging, trust scoring, anomaly detection, digest chain
- [x] OFAC sanctions screening (33+ addresses, 14 jurisdictions, 5 evasion patterns)
- [x] USDC compliance checks across 5 chains
- [x] CCTP cross-chain transfer tracking
- [x] Vercel AI SDK integration (`createKontextAI()` middleware)
- [x] SAR/CTR report templates
- [x] Agent reasoning logging and compliance certificates
- [x] Plan metering with per-seat pricing (Free: 20K, Pro: 100K/user, Enterprise: unlimited)
- [x] Stripe checkout integration with seats selector
- [x] CFTC compliance module (Letter 26-05) -- collateral valuation, segregation, weekly reports, haircut validation
- [x] Website with audience-specific pages (AI agents, FCMs, stablecoin issuers, DeFi protocols)
- [x] Security hardening (HMAC timing-safe auth, rate limiting, gitleaks)
- [x] Hono-based API server deployed to Vercel Edge

---

## Pricing

| Tier | Price | Events/mo | Target |
|------|-------|-----------|--------|
| **Free** | $0 | 20,000 (flat) | Individual developers, open-source adoption |
| **Pro** | $199/user/mo | 100,000 per seat | Startup teams, compliance-conscious builders |
| **Enterprise** | Custom | Unlimited | FCMs, stablecoin issuers, regulated entities |

---

## GTM Priorities

1. **AI Agent Startups** -- PLG, self-serve, $199/seat, weeks to close. Primary growth engine.
2. **FCMs & Trading Firms** -- Enterprise pipeline, CFTC 26-05 driven, 6-12 month cycle, high ACV.
3. **Stablecoin Issuers** -- GENIUS Act alignment, longer cycle, institutional credibility.
4. **DeFi Protocols** -- Emerging compliance needs, community-driven adoption.

---

*This roadmap is a living document updated as market conditions evolve.*
