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
    "Frequently asked questions about Kontext — compliance-grade audit trails for programmable payments. Evidence capture, digest chain, integrations, and more.",
};

const faqCategories = [
  {
    name: "General",
    faqs: [
      {
        question: "What is Kontext?",
        answer:
          "Kontext is the compliance evidence layer for programmable payments. It captures the full decision trail around every payment — intent, screening results, policy checks, approvals, and execution references — and produces audit-ready evidence packages for compliance, risk, fraud, and audit teams.",
      },
      {
        question: "Who is Kontext built for?",
        answer:
          "Payment infrastructure teams handling stablecoin transfers, API-driven payouts, or agent-initiated payments. Kontext serves compliance officers, risk managers, internal audit, and payments product teams who need to prove what happened before, during, and after every payment decision.",
      },
      {
        question: "What does 'verifiable decision context' mean?",
        answer:
          "Verifiable decision context means cryptographic proof that a payment was authorized, screened for sanctions, and logged before it happened. Kontext's patented digest chain links each action to the full history before it, creating tamper-evident evidence that compliance checks actually ran — not just a promise that they did.",
      },
    ],
  },
  {
    name: "Technical",
    faqs: [
      {
        question: "What languages and runtimes are supported?",
        answer:
          "The primary SDK is TypeScript-first with full type safety. It runs on Node.js 18+, Bun, and Deno. A Python client (kontext-sdk, Python 3.9+) is also available for Python-based payment systems. The core API is also accessible via REST for other environments.",
      },
      {
        question: "What blockchain chains are supported?",
        answer:
          "Kontext supports 8 chains: Ethereum, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche, and Solana.",
      },
      {
        question: "What is the digest chain?",
        answer:
          "The digest chain is Kontext's patented append-only audit structure that cryptographically links each logged action to the full history before it. This creates a tamper-evident chain of records — if any entry is modified, the chain breaks, making unauthorized changes immediately detectable.",
      },
      {
        question: "How is audit data stored?",
        answer:
          "Audit data is encrypted at rest (AES-256) and in transit (TLS 1.3), stored in cloud infrastructure following SOC 2-aligned practices. You retain full ownership and can export or delete data at any time.",
      },
      {
        question: "What are the performance characteristics?",
        answer:
          "The verify() call adds sub-5ms overhead for local rule evaluation. The SDK is under 100kb gzipped. Cloud-powered features add a network round-trip but are optimized for P95 latency under 50ms via edge deployment.",
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
        question: "What is the Kontext CLI?",
        answer:
          "The Kontext CLI (@kontext-sdk/cli) provides commands for common compliance workflows: verify (full verification with digest chain), check (static compliance check), audit (export audit trails), and anchor (on-chain anchoring).",
      },
      {
        question: "Do micropayments need compliance?",
        answer:
          "Yes. OFAC screening applies to every transaction regardless of amount. The Travel Rule only requires data-sharing above $3,000, but OFAC sanctions screening, ongoing transaction monitoring, and audit trails are required on every transfer under the BSA. The GENIUS Act reinforces these requirements for stablecoin transactions. Autonomous agents running high-frequency micropayments create cumulative patterns that can trigger Suspicious Activity Reports regardless of individual amounts. Kontext's verify() + digest chain provides evidence for every payment in a single call.",
      },
    ],
  },
  {
    name: "Integration",
    faqs: [
      {
        question: "How do I integrate Kontext with USDC transfers?",
        answer:
          "Call ctx.verify() on your payment transactions. Each call runs OFAC screening, logs the decision context, and adds the evidence to the tamper-evident digest chain. One function call produces the full compliance record.",
      },
      {
        question: "Does Kontext work with the x402 protocol?",
        answer:
          "Yes. Call ctx.verify() directly on x402 payment details to produce the same compliance evidence trail.",
      },
      {
        question: "Can I use Kontext with Stripe?",
        answer:
          "Yes. Call ctx.verify() on agent-initiated payments before creating Stripe payment intents. The Kontext audit ID can be attached to Stripe metadata for full end-to-end traceability between your compliance logs and payment records.",
      },
      {
        question: "Does Kontext work with LangChain, CrewAI, or AutoGen?",
        answer:
          "Yes. Kontext is framework-agnostic. The Vercel AI SDK has a first-class wrapper (kontextWrapModel). For LangChain, CrewAI, and AutoGen, use ctx.verify() and ctx.log() directly in your agent's tool calls or callbacks.",
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
          "Kontext provides cryptographic proof that every payment was authorized, screened, and logged. The patented digest chain creates tamper-evident audit trails, OFAC screening runs on every transfer, and compliance certificates bundle the evidence your team needs. It powers your compliance efforts but does not make you compliant on its own.",
      },
      {
        question: "Is Kontext itself a certified compliance product?",
        answer:
          "Kontext is compliance infrastructure, not a regulated financial entity. Cloud infrastructure follows SOC 2-aligned practices for data handling. However, Kontext does not guarantee regulatory compliance and is not a substitute for legal counsel — it provides the technical building blocks your compliance program needs.",
      },
      {
        question: "What audit export formats are supported?",
        answer:
          "JSON and CSV exports are available. Exports can be filtered by date range, agent, action type, and flag status.",
      },
      {
        question: "Is Kontext a replacement for legal counsel?",
        answer:
          "No. Kontext is infrastructure tooling, not legal advice. It provides the technical capabilities — logging, detection, and reporting — that your legal and compliance teams need to build a compliance program. Always consult qualified legal counsel for regulatory requirements specific to your jurisdiction and use case.",
      },
    ],
  },
  {
    name: "Security",
    faqs: [
      {
        question: "How is data encrypted?",
        answer:
          "All data in transit is encrypted with TLS 1.3. Data at rest is encrypted with AES-256. API keys are hashed and never stored in plaintext.",
      },
      {
        question: "Where is cloud data stored?",
        answer:
          "Audit data is stored in GCP cloud infrastructure following SOC 2-aligned practices. All data is encrypted at rest and in transit.",
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
              find what you need? Reach out via our{" "}
              <Link
                href="/contact"
                className="text-[var(--term-blue)] hover:underline"
              >
                contact page
              </Link>
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
              Check the docs for detailed guides and API reference, or get
              in touch.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/docs">
                  Read the Docs
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
