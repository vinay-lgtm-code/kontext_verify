# Website Revamp Plan — getkontext.com

## Positioning Shift

**Old:** "Compliance logging SDK for developers building on Circle Programmable Wallets"
**New:** "The compliance protocol for AI agents on Base. Verify. Attest. Anchor on-chain."

The website must reflect the expanded feature set: on-chain digest anchoring, A2A compliance attestation exchange, x402 protocol integration, and Kontext's complementary role to Coinbase's Agentic Wallets + KYT.

---

## Global Changes (All Pages)

### Navbar (`src/components/navbar.tsx`)
- Remove "Pricing" from nav links
- Replace with "About" link
- Nav: Docs, FAQs, About
- Keep: Install badge, GitHub button, Get Started CTA

### Footer (`src/components/footer.tsx`)
- Change "Patented Technology" → "Tamper-Evident Technology"
- Keep: MIT License, Legaci Labs copyright, GitHub link, legal disclaimer

### Layout (`src/app/layout.tsx`)
- Update metadata title: "Kontext — Compliance Protocol for AI Agents on Base"
- Update description to reflect on-chain anchoring + A2A attestation
- Update keywords: add "onchain compliance", "A2A attestation", "x402 compliance", "Base AI agents", "agent-to-agent compliance"
- Update OpenGraph/Twitter card descriptions

---

## Page-by-Page Plan

### 1. Home Page (`src/app/page.tsx`) — Full Rewrite

**Hero Section:**
- New headline: **"Verify. Attest. Anchor on-chain."**
- New subhead: "The compliance protocol for AI agents on Base. One call — OFAC screening, trust scoring, agent-to-agent attestation, and tamper-evident proof anchored on-chain. Free forever."
- Badge: "Built for Base · x402 · A2A Protocol"
- Update hero code to show the new flow: verify() → on-chain anchor → A2A attestation
- Hero code snippet:
```typescript
import { Kontext, OnChainExporter } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'payment-agent',
  environment: 'production',
  exporter: new OnChainExporter({
    chain: 'base',
    contractAddress: '0x...',
  }),
});

const result = await ctx.verify({
  txHash: '0xabc...', chain: 'base', amount: '5000', token: 'USDC',
  from: '0xsender', to: '0xrecipient', agentId: 'agent-v1',
  counterparty: { endpoint: 'https://agent-b.app/.well-known/kontext' },
});

result.compliant           // true
result.digestProof.valid   // true — anchored on Base
result.counterparty        // { attested: true, digest: '0x...' }
```

**Social Proof Strip:**
- "Tamper-Evident" · "MIT License" · "GENIUS Act Aligned" · "Base Native" · "A2A Protocol" · "x402 Compatible"

**Problem Section:**
- Keep GENIUS Act urgency but expand:
  - "AI agents on Base are moving real USDC. Alchemy, Stripe, and Coinbase all launched agent payment infrastructure in the last 30 days. None of them provide the audit trail. When FinCEN asks 'prove your agent checked compliance before that $5K transfer' — only Kontext can answer."

**Three Steps — Replace with Three Pillars:**
1. **Verify** — `ctx.verify()`: OFAC screening, trust scoring, anomaly detection, compliance checks in one call
2. **Attest** — A2A bilateral attestation exchange between sender and receiver agents (Travel Rule for AI)
3. **Anchor** — On-chain digest anchoring on Base. Immutable proof that compliance ran.

**Features Grid (8 cards → 8 cards, updated):**
1. `verify()` — One call, everything back (keep, update description to mention on-chain anchoring)
2. On-Chain Anchoring — NEW. Digest proofs anchored on Base. ~$0.001/anchor. Immutable compliance proof.
3. A2A Attestation — NEW. Bilateral compliance exchange between agents. Travel Rule for AI.
4. Auto Trust Scoring — Keep (0-100, 5 factors)
5. Auto Anomaly Detection — Keep (2 rules free)
6. Compliance Certificates — Keep
7. `approvalThreshold` — Keep (human-in-the-loop)
8. Digest Chain — Change badge from "Patent" to "Core". Description: "SHA-256 rolling hash chain. Tamper-evident by design."

**Digest Chain Section:**
- Change badge from "Patented Technology" to "Tamper-Evident by Design"
- Keep the diagram (Genesis Block → Action Hash → Terminal Digest)
- Add note: "Terminal digest anchored on Base for immutable on-chain proof"

**Pricing Strip → Replace with Ecosystem Section:**
- Title: "Built for the Base ecosystem"
- Show the layer diagram:
  - Kontext (audit trail + attestation) → Coinbase CDP (enforcement) → Base + Agentic Wallets (infrastructure)
- Copy: "Coinbase Agentic Wallets enforce compliance in real-time. Kontext proves it happened. Complementary, not competitive."

**GENIUS Act Section:**
- Keep as-is (timeline, urgency, explanation)

**Final CTA:**
- Remove "View Pricing" button
- Change to: "Get Started" + "View on GitHub"
- Subtitle: "Free forever. No credit card. Base-native."

### 2. Pricing Page (`src/app/pricing/page.tsx`) — DELETE

- Delete the file entirely
- All /pricing links across the site should redirect to /docs or be removed

### 3. Docs Page (`src/app/docs/page.tsx`) — Major Update

**Sidebar — Add sections:**
- Getting Started: Installation, Quick Start
- Core Features: Action Logging, Task Confirmation, Audit Export, Trust Scoring, Anomaly Detection
- **On-Chain (NEW):** On-Chain Anchoring, OnChainExporter Config
- **A2A Protocol (NEW):** A2A Attestation, Agent Card, Counterparty Exchange
- Integrations: USDC on Base, x402 Protocol, Google A2A, Coinbase Agentic Wallets (replace Stripe section)
- Reference: API Reference, Configuration, TypeScript Types

**New Documentation Sections:**

**On-Chain Anchoring section:**
```typescript
import { Kontext, OnChainExporter } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-agent',
  exporter: new OnChainExporter({
    rpcUrl: 'https://mainnet.base.org',
    contractAddress: '0x...', // KontextAnchor on Base
    batchSize: 10,           // anchor every 10 events
  }),
});
// Every verify() call now anchors the digest on Base automatically
```

**A2A Attestation section:**
```typescript
// Sender: exchange compliance attestation with receiver
const result = await ctx.verify({
  txHash: '0xabc...', chain: 'base', amount: '5000', token: 'USDC',
  from: '0xsender', to: '0xrecipient', agentId: 'sender-agent',
  counterparty: {
    endpoint: 'https://receiver.app/.well-known/kontext',
    agentId: 'receiver-agent',
  },
});
// result.counterparty.attested = true
// result.counterparty.digest = '0x...'
```

**Coinbase Agentic Wallets integration section (replace Stripe section):**
- Show how Kontext complements Agentic Wallets' KYT screening
- Code example: verify() wrapping an Agentic Wallet transfer

**Update existing code examples:**
- Fix API reference to match actual SDK exports (Kontext.init() not new Kontext())
- Remove references to `flagged`, `flags`, `auditId` (not in actual API — use `compliant`, `checks`, `digestProof`)
- Remove `workflow()` references (not in actual API)
- Remove `defineConfig()` reference (not exported)
- Fix type definitions to match actual SDK types (VerifyResult, VerifyInput, KontextConfig)

### 4. FAQs Page (`src/app/faqs/page.tsx`) — Update

**Remove FAQs:**
- "What's the difference between Free and Pay as you go?" (no pricing page)

**Update FAQs:**
- "What is the patented digest chain?" → "What is the digest chain?" — Remove word "patented" from question and answer. Keep technical explanation.
- Update Circle Compliance Engine FAQ to mention Coinbase Agentic Wallets + KYT

**Add new FAQs:**
- "What is on-chain anchoring?" — Explain how digest proofs are anchored on Base for immutable proof. ~$0.001/anchor.
- "What is A2A attestation?" — Explain bilateral compliance exchange between agents. Travel Rule for AI.
- "How does Kontext work with Coinbase Agentic Wallets?" — Complementary: KYT enforces, Kontext proves.
- "Does Kontext work with x402?" — Yes, middleware for x402 agent payments on Base.
- "Is Kontext free?" — Yes, free forever. No credit card. No event limits for core features.

**Update header:**
- Remove "pricing" from description text

### 5. About Page (`src/app/about/page.tsx`) — Update

**Updates:**
- Update "The solution" section to include on-chain anchoring and A2A attestation as capabilities
- Add "Anchored" as a 6th step: Logged → Scored → Checked → Confirmed → Exported → **Anchored on-chain**
- Update vision to position as "compliance protocol" not just "compliance layer"
- Remove any pricing references

### 6. Blog Posts — Minor Updates

**Blog: Introducing Kontext (`blog/introducing-kontext/page.tsx`):**
- No changes needed (historical post)

**Blog: Tamper-Evident Audit Trails (`blog/tamper-evident-audit-trails/page.tsx`):**
- Line 148: Change "proprietary and patent-protected" → "proprietary"
- Keep the rest (it's an engineering blog post, technical content is fine)

### 7. Checkout Pages — Delete

- Delete `src/app/checkout/success/page.tsx`
- Delete `src/app/checkout/cancel/page.tsx`
- (No pricing = no checkout flow)

### 8. Other Pages — Minor Updates

**Audiences pages** (`audiences/*.tsx`):
- Quick scan for pricing/patent references, update if found
- These are secondary pages, minimal changes

**Use Cases page** (`use-cases/page.tsx`):
- Quick scan for pricing/patent references, update if found

**Integrations page** (`integrations/page.tsx`):
- Quick scan for pricing/patent references, update if found
- Add x402 and Coinbase Agentic Wallets if not present

**Changelog** (`changelog/page.tsx`):
- No changes needed (historical)

---

## Files to Modify (in order)

1. `src/app/layout.tsx` — metadata updates
2. `src/components/navbar.tsx` — remove Pricing link, add About
3. `src/components/footer.tsx` — remove patent reference
4. `src/app/page.tsx` — full rewrite (hero, features, ecosystem section)
5. `src/app/pricing/page.tsx` — DELETE
6. `src/app/checkout/success/page.tsx` — DELETE
7. `src/app/checkout/cancel/page.tsx` — DELETE
8. `src/app/docs/page.tsx` — add on-chain + A2A sections, fix API examples
9. `src/app/faqs/page.tsx` — update/add FAQs, remove pricing FAQ
10. `src/app/about/page.tsx` — update solution section
11. `src/app/blog/tamper-evident-audit-trails/page.tsx` — remove "patent-protected" reference
12. Quick scan remaining pages for pricing/patent references

## Files to Delete
- `src/app/pricing/page.tsx`
- `src/app/checkout/success/page.tsx`
- `src/app/checkout/cancel/page.tsx`

---

## Key Copy Guidelines

- Never use specific patent numbers
- "Tamper-evident" or "patented technology" (general) is OK
- No pricing amounts anywhere on the site
- Position as "free forever" without detailing paid tiers
- Emphasize Base-native, x402 compatible, A2A protocol
- Coinbase Agentic Wallets = complementary, never competitive
- "Compliance protocol" not "compliance logging SDK"
