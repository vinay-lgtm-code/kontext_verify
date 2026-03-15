# Kontext — Enterprise Pilot Readiness Plan
**Legaci Labs Inc · Confidential · March 2026**

---

## Framing

Getting an enterprise pilot is not the hard part. Surviving it is.

An enterprise pilot customer will do three things within the first 30 days that will expose every gap in what exists today:

1. Their **dev team** will try to integrate the SDK into a real payment flow and hit something broken or undocumented
2. Their **compliance officer** will ask for a demo of the dashboard and immediately ask "where is our data?"
3. Their **legal/security team** will send a vendor questionnaire asking about SOC 2, data residency, encryption at rest, and incident response

This plan is organized around surviving all three, in the right order.

---

## What Exists Today (Honest Baseline)

**Strengths going in:**
- `kontext-sdk` v0.11.1 on npm — real, published, 16 versions shipped in 5 weeks
- OFAC/OpenSanctions screening — shipped (keywords confirm)
- Patent-protected digest chain — implemented and verified in `digest.ts`
- CCTP + Circle Programmable Wallets integration — in SDK
- Dashboard prototype — built, visually credible

**Gaps that will surface immediately in a pilot:**
- No persistent cloud backend — `verification_events` table and ingestion API are designed but not deployed
- No multi-tenant auth — no org isolation, no compliance officer login
- No audit export that actually downloads a real PDF
- No SLA, no uptime guarantee, no incident response process
- No DPA (Data Processing Agreement) — required by any enterprise legal team
- No SOC 2 — will be asked for immediately, doesn't exist yet
- TypeScript only — if the pilot customer uses Python agents, blocked on day one

---

## The Pilot Structure to Propose

Before building anything, propose the right pilot structure. This sets expectations correctly and gives you time to build in parallel.

**Recommended pilot terms:**
- Duration: 90 days
- Price: $0 (design partner, not a paying customer yet — do not charge)
- Scope: One specific workflow (e.g., cross-border USDC payouts via Circle Programmable Wallets)
- Deliverable from them: Weekly 30-min sync + written feedback at day 30 and day 90
- Deliverable from you: Dedicated Slack channel, direct Vinay access, custom integration support

**Why free:** You need their real transaction data to populate the dashboard, expose real edge cases, and prove the schema works. Charging $2k/month before the product can handle a real enterprise integration is the fastest way to lose the pilot.

**What you get:** A reference customer, a case study, real compliance officer feedback, and the ability to say "currently in pilot with [name]" to the next five prospects.

---

## Phase 1 — Pre-Pilot (Before They Sign Anything)
**Timeline: 2 weeks**

These are the things that must exist before the first technical call.

### 1.1 Legal minimum

| Document | What it covers | Where to get it |
|---|---|---|
| **Terms of Service** | Liability cap, disclaimers on trust scores, "not legal advice" | Hire counsel — 3-5 hours, ~$1,500 |
| **Privacy Policy** | What data you collect, retention, deletion rights | Same engagement |
| **Data Processing Agreement (DPA)** | GDPR/CCPA compliance, sub-processors, data residency | Template from Bonterms or WeTransfer — customize |
| **NDA** | Mutual confidentiality for pilot | Use a standard mutual NDA template |

The DPA is the most important. Enterprise legal teams will not proceed without one. Bonterms has a free, well-regarded template at bonterms.com.

**Do not proceed to a technical call without at least the NDA and a draft DPA.**

### 1.2 Deploy the ingestion API

The schema and handler are designed (`kontext-v1-schema-api.md` + `ingest.ts`). Now deploy it.

**Stack decisions for pilot:**
- Database: Neon (serverless Postgres) — zero ops, scales to zero, cheap
- API: Hono on Cloudflare Workers or Cloud Run — already in the stack
- Auth: API key per org, generated on signup — no OAuth complexity needed in v1
- Hosting: Vercel for dashboard frontend, Cloud Run for API

**What to deploy for pilot (minimum):**
```
POST /v1/verification-events     ← ingest handler (built)
GET  /v1/verification-events     ← dashboard payments table
GET  /v1/verification-events/:id/evidence  ← evidence drawer
GET  /v1/kpis                    ← overview KPI strip
POST /v1/audit-exports           ← trigger export
GET  /v1/audit-exports/:id       ← poll export status
```

**What NOT to deploy yet:** Policy editor UI, wallet coverage (fine to show in dashboard as demo data), agent registry management (show static).

### 1.3 Multi-tenant auth

Minimum viable auth for one pilot customer:

```typescript
// Middleware: every request
const apiKey = req.headers['x-api-key'];
const org = await db.query(
  'SELECT org_id FROM api_keys WHERE key_hash = $1 AND active = true',
  [sha256(apiKey)]
);
if (!org.rows[0]) return 401;
req.orgId = org.rows[0].org_id;
```

Generate one org, one API key, one dashboard login for the pilot customer. That's it. Do not build a self-serve signup flow yet — you'll onboard them manually.

### 1.4 Dashboard with real data

The dashboard prototype is excellent as a demo. For the pilot it needs to show the customer's **actual** data, not generated mock events.

**Minimum wiring:**
- Replace mock `AGENT_DEFS` and `allEvents` arrays with API calls to your deployed backend
- Add a loading state
- Add an error state ("No events yet — integrate the SDK to see data here")
- The live feed polling interval can stay at 4.2s, just hitting real endpoints

---

## Phase 2 — Integration Sprint (Week 1–2 of Pilot)
**Timeline: First 2 weeks of the pilot**

This is where you work alongside their dev team to get the SDK integrated into one real workflow.

### 2.1 Integration path for a Circle Programmable Wallets customer

Their typical stack:
```
Agent framework (likely Python or TypeScript)
  → Circle Programmable Wallets API
  → USDC transfer on Base
```

Your integration:
```typescript
import { Kontext } from 'kontext-sdk';

const kontext = Kontext.init({
  apiKey: process.env.KONTEXT_API_KEY,
  projectId: 'their-project-id',
  environment: 'production',
});

// Before every payout
const result = await fetch('https://api.getkontext.com/v1/verification-events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.KONTEXT_API_KEY,
  },
  body: JSON.stringify({
    environment: 'production',
    workflow: 'cross-border-payout',
    agent_id: agentId,
    actor_type: 'autonomous-agent',
    payment: {
      tx_hash: circleTransfer.txHash,
      chain: 'base',
      rail: 'stablecoin',
      token: 'USDC',
      amount: amount.toString(),
      currency: 'USDC',
      from_address: walletAddress,
      to_address: recipientAddress,
      destination_country: countryCode,
    },
    intent: {
      intent_type: 'supplier-payment',
      declared_purpose: invoiceRef,
      requested_by: 'agent',
      requested_at: new Date().toISOString(),
    },
  }),
});
```

**Common integration blockers to anticipate:**
- Python agent stack → have a Python `requests`-based snippet ready, even if you don't have a PyPI package yet
- Firewall/proxy issues → document your IP ranges or use domain allowlisting
- `destination_country` not available in their payment flow → make it optional, handle gracefully
- High frequency (>100 TPS) → add async batching to the ingest handler

### 2.2 The integration success metric

Define this explicitly with the customer at the start:

> "Pilot is successful when we can show your compliance officer a dashboard with 30 days of real payout data, an evidence drawer for any individual payment, and a downloadable audit export."

That's the bar. Everything else is bonus.

### 2.3 What to build during the integration sprint

In priority order, build only what is blocking the above metric:

| Priority | Work | Why |
|---|---|---|
| P0 | Real data in dashboard (replace mocks with API calls) | Without this the pilot has no value |
| P0 | PDF audit export (actual downloadable file) | Compliance officer will ask for this on day 1 |
| P0 | Error handling + retry in ingest handler | Their dev team will hit errors |
| P1 | Webhook on policy violation | So they can wire alerts into their Slack/PagerDuty |
| P1 | Evidence drawer "Download PDF" button that works | Compliance closer |
| P2 | Basic anomaly email alert | Nice to have |

---

## Phase 3 — Compliance Officer Demo (Day 30)
**Timeline: End of week 4**

This is the moment the pilot either becomes a contract or dies. The compliance officer will see the dashboard for the first time and ask specific questions. Be ready for all of them.

### 3.1 Questions they will ask and your answers

**"Where is our data stored?"**
→ US-East-1 (or GCP us-central1). We do not store PII — only wallet addresses, amounts, chains, and cryptographic proofs. You can request deletion at any time.

**"What encryption do you use?"**
→ TLS 1.3 in transit. AES-256 at rest via Neon/Postgres native encryption. API keys are stored as SHA-256 hashes — we never store the plaintext key.

**"Are you SOC 2 certified?"**
→ We are in the process of implementing SOC 2 Type I controls. We can share our control framework and security questionnaire responses. SOC 2 Type I certification is targeted for Q3 2026.

**"Can we get a GDPR Data Processing Agreement?"**
→ Yes, we have a DPA ready (from Phase 1). Here it is.

**"What happens if your service goes down during a live payment run?"**
→ The SDK is designed as an observability layer — it never sits in your payment execution path. If our API is unavailable, your payments still execute. The SDK queues events locally and retries. (Note: implement this queue if not already done.)

**"Can we export everything and take our data with us if we leave?"**
→ Yes. The audit export endpoint returns complete JSON including all cryptographic proofs. You own your data.

### 3.2 The one thing that closes compliance officers

Print this on paper and put it in front of them:

> "If a regulator asks you to prove that a specific payment on March 14th was authorized, screened for sanctions, and policy-compliant — how long does that take you today?"

Then show them the evidence drawer. One click. 10 seconds.

That's the close.

---

## Phase 4 — Security & Legal Hardening (Running in Parallel)
**Timeline: Throughout pilot, complete by day 60**

Do not wait for the pilot to end to start this. Run it in parallel.

### 4.1 Security baseline (minimum for enterprise)

| Control | Implementation | Priority |
|---|---|---|
| API key rotation | `DELETE /v1/api-keys/:id` + generate new key | P0 |
| Rate limiting | 1,000 req/min per org on ingest endpoint | P0 |
| Audit log of API key usage | Log every auth event with timestamp + IP | P0 |
| HTTPS only | Enforce via Cloudflare/Vercel — no HTTP | P0 |
| Input validation | Already in `ingest.ts` — verify it's deployed | P0 |
| No secrets in responses | Already implemented — verify API key masking | P0 |
| Dependency scanning | Add `npm audit` to CI | P1 |
| CORS policy | Allowlist dashboard domain only | P1 |

### 4.2 SOC 2 Type I — what to actually do now

SOC 2 Type I is a point-in-time snapshot of whether controls *exist*, not whether they've been operating for 6 months (that's Type II). You can get Type I in ~3-4 months if you start now.

**What SOC 2 Type I requires you to have:**

- Written security policy (1-2 pages — write it now)
- Access control policy (who can access what — write it now)
- Incident response procedure (what happens when something breaks — write it now)
- Backup and recovery procedure (how is data backed up — Neon does this automatically, document it)
- Vulnerability management (npm audit in CI counts as a start)
- Encryption documented (TLS + AES-256 — document it)

The cheapest path: use Vanta ($400/month) or Drata to automate evidence collection. This is worth it — it compresses a 6-month manual process to ~8 weeks.

**Realistic timeline from today:**
- Week 1-2: Write policies, enable Vanta
- Week 3-6: Fix gaps Vanta surfaces
- Week 7-10: Auditor fieldwork (use a small firm like Prescient Assurance or A-LIGN)
- Week 11-12: Report issued

Target: SOC 2 Type I by June 2026. That means starting the policies this week.

### 4.3 What NOT to do

- Do not build an on-prem/self-hosted option yet — it's a 3-month distraction and no pilot customer will require it in the first 90 days
- Do not implement SSO/SAML yet — a username/password login is fine for the pilot
- Do not promise GDPR right-to-erasure on the digest chain — this is a known architectural tension, acknowledge it honestly: "We are working with counsel on the right approach for GDPR erasure requests given the immutability requirements of the audit chain"

---

## Phase 5 — Pilot to Contract (Day 60–90)

### 5.1 The conversion conversation

At day 60, before the pilot ends, have this conversation:

> "We're 60 days in. You've had [X] payouts verified, [Y] policy warnings surfaced, and the audit export is ready whenever a regulator asks. What would it take to make this a permanent part of your stack?"

Listen carefully. They will tell you exactly what's missing.

### 5.2 Pricing for first enterprise contract

Do not go to the pricing page. Price based on their volume.

**Anchor: $2,000/month**

If they're moving $10M+/month in agent-driven USDC payouts, that's a rounding error on their compliance budget. The frame is: "This is the cost of one hour of outside compliance counsel, every month, providing continuous cryptographic proof for every payment you make."

Variable component: $0.02 per verified payout above 50,000/month. This aligns your revenue with their growth.

**What to include in Year 1 enterprise contract:**
- Unlimited verification events
- Dashboard access (up to 5 compliance officer seats)
- PDF audit exports on demand
- Direct Slack access to Vinay
- SLA: 99.9% API uptime (achievable with Cloud Run + Neon)
- Roadmap input rights (they get to vote on what you build)
- Reference customer clause (they let you mention them by name in fundraising)

### 5.3 What success looks like at day 90

| Metric | Target |
|---|---|
| Events ingested | >10,000 real verification events |
| Dashboard DAU | ≥1 compliance officer logging in weekly |
| Audit exports generated | ≥1 (they actually used it) |
| Contract signed | Yes — $2k/month minimum |
| Reference call willing | Yes |
| SOC 2 Type I in progress | Started, auditor selected |
| NPS from dev team | Would they recommend to a peer? |

---

## What to Deprioritize During the Pilot

The following things feel important but will kill focus during a pilot. Explicitly park them.

| Thing | Why it can wait |
|---|---|
| Python SDK | The pilot customer is TypeScript-first or you've confirmed this before signing |
| Trust graph / advanced visualization | No data to populate it yet |
| Policy DSL / rule editor | Hard-code their specific rules as config in v1 |
| Multi-region / data residency | One US region is fine for first enterprise customer |
| IP licensing outreach | Don't split attention — pilot is the priority |
| Circle Alliance application | Apply after you have the pilot reference, not before |

---

## The One-Page Pilot Summary (Send This to Them)

> **Kontext Pilot Program**
> 
> **What you get:** Cryptographic compliance infrastructure for your AI agent payment flows. Every payout verified, screened for OFAC sanctions, and logged with tamper-evident proof. Full audit export on demand.
> 
> **What we need from you:** One engineering day to integrate the SDK into one payment workflow. One compliance officer to review the dashboard at day 30. Feedback.
> 
> **Duration:** 90 days
> **Cost:** $0 for the pilot period
> **Data:** Hosted in US-East. DPA available. You own your data and can export or delete at any time.
> **Contact:** Vinay Narayan, Legaci Labs · vinay@getlegaci.com

---

*Kontext is built by Legaci Labs Inc. Patent US 12,463,819 B1.*
