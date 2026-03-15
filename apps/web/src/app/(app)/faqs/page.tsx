import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Frequently asked questions about Kontext — the trust layer for agentic stablecoin and fiat payments. Cryptographic verifiable intent, auto-instrumentation, pricing, and more.",
};

const faqCategories = [
  {
    name: "General",
    faqs: [
      {
        question: "What is Kontext?",
        answer:
          "Kontext is the trust layer for agentic stablecoin and fiat payments. It provides cryptographic verifiable intent for org-wide payments — run npx kontext init, wrap your client in one line, and every stablecoin transfer gets OFAC screening, a tamper-evident audit trail, and a trust score automatically.",
      },
      {
        question: "Who is Kontext built for?",
        answer:
          "Developers and teams building autonomous agents that move money — USDC on Base, cross-chain CCTP transfers, Stripe payment intents, or any workflow where AI agents initiate payments. Kontext captures cryptographic proof that every payment was intended, screened, and logged across your entire organization.",
      },
      {
        question: "What does 'verifiable intent' mean?",
        answer:
          "Verifiable intent means cryptographic proof that a payment was authorized, screened for sanctions, and logged before it happened. Kontext's patented digest chain links each action to the full history before it, creating tamper-evident evidence that compliance checks actually ran — not just a promise that they did.",
      },
      {
        question: "Is Kontext open source?",
        answer:
          "Yes. The core SDK is fully open source under the MIT license with 20,000 events/month on the free tier. You can self-host the entire stack. Pay as you go ($2/1K events above 20K free) adds all anomaly detection rules, unified screening, CSV export, multi-chain support, webhooks, and cloud persistence.",
      },
      {
        question: "What license does Kontext use?",
        answer:
          "Kontext is released under the MIT License. You can use it freely in commercial and non-commercial projects without restrictions. Contributions are welcome via GitHub pull requests.",
      },
    ],
  },
  {
    name: "Technical",
    faqs: [
      {
        question: "What languages and runtimes are supported?",
        answer:
          "The SDK is TypeScript-first with full type safety and ships with zero runtime dependencies. It runs on Node.js 18+, Bun, and Deno. The core API is also accessible via REST for non-JavaScript environments.",
      },
      {
        question: "What blockchain chains are supported?",
        answer:
          "The free tier supports Base and Arc. Pro unlocks all 8 chains: Ethereum, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche, and Solana.",
      },
      {
        question: "How does trust scoring work?",
        answer:
          "Each verified action receives a trust score between 0 and 1 computed from multiple weighted factors: agent history, amount normality relative to the agent's baseline, transaction velocity, recipient trust, and contextual pattern matching. The factors and weights are configurable.",
      },
      {
        question: "How does anomaly detection work?",
        answer:
          "Anomaly detection runs a configurable rule engine on every verify() call. The free tier includes two basic rules: unusual amount and frequency spike. Pro unlocks all six detection rules including new-destination, off-hours, rapid-succession, and round-amount checks.",
      },
      {
        question: "What is the digest chain?",
        answer:
          "The digest chain is Kontext's patented append-only audit structure that cryptographically links each logged action to the full history before it. This creates a tamper-evident chain of records — if any entry is modified, the chain breaks, making unauthorized changes immediately detectable.",
      },
      {
        question: "How is audit data stored?",
        answer:
          "With the open-source SDK, all data stays on your infrastructure — you control storage entirely. On Pro, audit data is encrypted at rest (AES-256) and in transit (TLS 1.3), stored in cloud infrastructure following SOC 2-aligned practices. You retain full ownership and can export or delete data at any time.",
      },
      {
        question: "What are the performance characteristics?",
        answer:
          "The verify() call adds sub-5ms overhead for local rule evaluation. The SDK is under 10kb gzipped with zero runtime dependencies. Cloud-powered trust scoring (Pro) adds a network round-trip but is optimized for P95 latency under 50ms via edge deployment.",
      },
      {
        question: "What is on-chain anchoring?",
        answer:
          "On-chain anchoring writes your terminal digest (the SHA-256 hash at the end of your digest chain) to the KontextAnchor smart contract on Base. This creates an immutable, publicly verifiable proof that your audit trail existed at a specific block. Anyone with an RPC URL can verify the anchor — no Kontext account needed. Gas cost is roughly 45K gas per anchor, well under $0.01 on Base.",
      },
      {
        question: "What is A2A attestation?",
        answer:
          "A2A (agent-to-agent) attestation lets two agents exchange compliance proofs for the same transaction. The sender posts its terminal digest to the receiver's attestation endpoint (discovered via .well-known/kontext.json). The receiver responds with its own digest. Both sides now have cryptographic proof that the other ran compliance checks. Zero external dependencies — uses native fetch().",
      },
      {
        question: "Does on-chain anchoring cost gas?",
        answer:
          "Yes, but it's minimal. Each anchor transaction costs roughly 45K gas on Base, which at current gas prices is well under $0.01. Read-only verification (checking if a digest was anchored) costs nothing — it's a standard eth_call with no gas. The SDK's verifyAnchor() function works with zero dependencies, just a raw RPC URL.",
      },
      {
        question: "What is agent forensics?",
        answer:
          "Agent forensics maps wallets to agent identities, detects multi-wallet clustering using 5 heuristics (shared-owner, temporal-correlation, funding-chain, amount-pattern, and network-overlap), and computes identity confidence scores from 0 to 100. It answers the question: which agent controls which wallets? Available on the Pro tier via registerAgentIdentity(), getWalletClusters(), and getKYAConfidenceScore().",
      },
      {
        question: "How does wallet clustering work?",
        answer:
          "Wallet clustering uses a Union-Find algorithm with 5 heuristics to detect wallets controlled by the same agent. The heuristics are: shared-owner (explicitly registered), temporal-correlation (wallets active in the same time windows), funding-chain (one wallet funds another), amount-pattern (matching transaction amounts across wallets), and network-overlap (shared counterparties). Each cluster includes evidence trails documenting why wallets were grouped.",
      },
      {
        question: "How does auto-instrumentation work?",
        answer:
          "Run npx kontext init to generate a kontext.config.json with your wallets, tokens, chains, and compliance mode. Then wrap your viem client with withKontextCompliance(client, kontext) — one line. Two interception layers provide full coverage: the code wrap intercepts sendTransaction/writeContract calls on your client, and the chain listener watches your monitored wallets on-chain for all outgoing stablecoin transfers regardless of source (other scripts, wallet UIs, Circle dashboard, other agents). Deduplication is built in.",
      },
      {
        question: "What is the Kontext CLI?",
        answer:
          "The Kontext CLI (@kontext-sdk/cli) is the starting point for most developers. Run npx kontext init to set up your project with an interactive wizard. The CLI also provides commands for verify (full verification with digest chain), check (static compliance check), reason (log agent reasoning), cert (generate certificates), audit (export audit trails), anchor (on-chain anchoring), attest (A2A attestation), sync (OFAC SDN list sync), session/checkpoint (agent provenance), and mcp (MCP server for AI coding assistants).",
      },
      {
        question: "Do micropayments need compliance?",
        answer:
          "Yes. OFAC screening applies to every transaction regardless of amount. The Travel Rule only requires data-sharing above $3,000, but OFAC sanctions screening, ongoing transaction monitoring, and audit trails are required on every transfer under the BSA. The GENIUS Act reinforces these requirements for stablecoin transactions. Autonomous agents running high-frequency micropayments via x402 create cumulative patterns that can trigger Suspicious Activity Reports regardless of individual amounts. Kontext's verify() + digest chain provides evidence for every payment in a single call.",
      },
    ],
  },
  {
    name: "Integration",
    faqs: [
      {
        question: "How do I integrate Kontext with USDC transfers?",
        answer:
          "The recommended path: run npx kontext init, then wrap your viem client with withKontextCompliance(). Every USDC transfer is automatically verified. For explicit control, call ctx.verify() directly on individual transactions. Both approaches produce the same cryptographic audit trail.",
      },
      {
        question: "Does auto-instrumentation work with any viem client?",
        answer:
          "Yes. withKontextCompliance() wraps any viem WalletClient. It intercepts sendTransaction and writeContract calls, detects stablecoin transfers by contract address and function selector, and runs verify() automatically. Non-stablecoin transactions pass through untouched with zero overhead.",
      },
      {
        question: "Does Kontext work with the x402 protocol?",
        answer:
          "Yes. Auto-instrumentation catches x402 micropayments automatically when they flow through your wrapped viem client. For non-viem x402 flows, call ctx.verify() directly on the payment details.",
      },
      {
        question: "Can I use Kontext with Stripe?",
        answer:
          "Yes. Call ctx.verify() on agent-initiated payments before creating Stripe payment intents. The Kontext audit ID can be attached to Stripe metadata for full end-to-end traceability between your compliance logs and payment records.",
      },
      {
        question: "Does Kontext work with LangChain, CrewAI, or AutoGen?",
        answer:
          "Yes. Kontext is framework-agnostic. The Vercel AI SDK has a first-class wrapper (kontextWrapModel). For LangChain, CrewAI, and AutoGen, use ctx.verify() and ctx.log() directly in your agent's tool calls or callbacks. Auto-instrumentation via withKontextCompliance() works regardless of framework.",
      },
    ],
  },
  {
    name: "Compliance",
    faqs: [
      {
        question: "What is the GENIUS Act?",
        answer:
          "The GENIUS Act (Guiding and Establishing National Innovation for U.S. Stablecoins) is U.S. legislation establishing a regulatory framework for stablecoin issuers and the ecosystems around them. It introduces requirements around reserves, transparency, and consumer protection that impact how stablecoin transactions are logged and audited.",
      },
      {
        question: "How does Kontext support GENIUS Act compliance efforts?",
        answer:
          "Kontext provides cryptographic verifiable intent — proof that every payment was authorized, screened, and logged. The patented digest chain creates tamper-evident audit trails, OFAC screening runs on every transfer, and compliance certificates bundle the evidence your team needs. It powers your compliance efforts but does not make you compliant on its own.",
      },
      {
        question: "Is Kontext itself a certified compliance product?",
        answer:
          "Kontext is a developer tool, not a regulated financial entity. Pro plan infrastructure follows SOC 2-aligned practices for data handling. However, Kontext does not guarantee regulatory compliance and is not a substitute for legal counsel — it provides the technical building blocks your compliance program needs.",
      },
      {
        question: "What audit export formats are supported?",
        answer:
          "The free tier supports JSON export. Pro adds CSV export. Exports can be filtered by date range, agent, action type, and flag status.",
      },
      {
        question: "Is Kontext a replacement for legal counsel?",
        answer:
          "No. Kontext is infrastructure tooling, not legal advice. It provides the technical capabilities — logging, scoring, detection, and reporting — that your legal and compliance teams need to build a compliance program. Always consult qualified legal counsel for regulatory requirements specific to your jurisdiction and use case.",
      },
    ],
  },
  {
    name: "Pricing & Plans",
    faqs: [
      {
        question: "What is included in the free tier?",
        answer:
          "The free tier includes auto-instrumentation (npx kontext init + withKontextCompliance), wallet monitoring, the full SDK with 20,000 events/month, action logging, JSON export, basic anomaly detection (2 rules), trust scoring, digest chain verification, on-chain anchoring, A2A attestation, compliance certificates, and Base + Arc chain support. MIT-licensed, free forever.",
      },
      {
        question: "What does Pay as you go include?",
        answer:
          "Pay as you go is $2 per 1,000 events above the 20K free tier. No monthly minimum, no commitment. It includes everything in Free plus: all six anomaly detection rules, unified screening (OFAC, Chainalysis, OpenSanctions), custom blocklist/allowlist, CSV export, multi-chain support (all 8 chains), webhook alerts, cloud persistence, and email support.",
      },
      {
        question: "Can I self-host the entire stack?",
        answer:
          "Yes. The open-source SDK is designed for self-hosting with zero external dependencies. You control where data is stored and how it is processed.",
      },
    ],
  },
  {
    name: "Security",
    faqs: [
      {
        question: "How is data encrypted?",
        answer:
          "All data in transit is encrypted with TLS 1.3. On Pro, data at rest is encrypted with AES-256. API keys are hashed and never stored in plaintext. The free tier keeps all data on your infrastructure, so encryption is governed by your own setup.",
      },
      {
        question: "Where is cloud data stored?",
        answer:
          "Pro plan data is stored in GCP infrastructure following SOC 2-aligned practices. All data is encrypted at rest and in transit.",
      },
      {
        question: "How does Kontext handle PII?",
        answer:
          "Kontext logs action metadata, not user PII. The SDK is designed so that you control what data is passed in the metadata fields. We recommend against including raw PII in action logs — instead, use anonymized identifiers.",
      },
    ],
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqCategories.flatMap((category) =>
    category.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    }))
  ),
};

export default function FAQsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              FREQUENTLY ASKED QUESTIONS
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Technical answers for developers building with Kontext. Can&apos;t
              find what you need? Reach out on{" "}
              <a
                href="https://github.com/Legaci-Labs/kontext"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--term-blue)] hover:underline"
              >
                GitHub Discussions
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="sticky top-16 z-40 border-b border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            {faqCategories.map((category) => (
              <a
                key={category.name}
                href={`#${category.name.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`}
                className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
              >
                {category.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          {faqCategories.map((category) => (
            <div
              key={category.name}
              id={category.name.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}
              className="mb-16 last:mb-0 scroll-mt-32"
            >
              <Badge variant="outline" className="mb-4">
                {category.name}
              </Badge>
              <Accordion type="single" collapsible>
                {category.faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`${category.name}-${index}`}
                  >
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-sm font-medium">
              Still have questions?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Check the docs for detailed guides and API reference, or open an
              issue on GitHub.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/docs">
                  Read the Docs
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/Legaci-Labs/kontext"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Discussions
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
