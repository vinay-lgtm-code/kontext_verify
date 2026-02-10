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
    "Frequently asked questions about Kontext -- the trust and compliance-support SDK for agentic stablecoin and fiat transactions. Technical details, integrations, pricing, and more.",
};

const faqCategories = [
  {
    name: "General",
    faqs: [
      {
        question: "What is Kontext?",
        answer:
          "Kontext is a TypeScript SDK that provides trust and compliance-support infrastructure for AI agents performing stablecoin and fiat transactions. It handles action logging, trust scoring, anomaly detection, and audit trail export so you can ship compliance-ready agentic workflows without building compliance tooling from scratch.",
      },
      {
        question: "Who is Kontext built for?",
        answer:
          "Kontext is built for developers integrating AI agents with stablecoin and fiat payments -- whether USDC on Base, Stripe payment intents, or any workflow where AI agents move money. Kontext provides the compliance-support layer.",
      },
      {
        question: "Is Kontext open source?",
        answer:
          "Yes. The core SDK is fully open source and available on GitHub with 20,000 events/month included. You can self-host the entire stack with no feature gates on the free tier. Paid plans add all anomaly detection rules, OFAC screening, SAR/CTR reports, and multi-chain support on the Pro plan at $199/user/month (100K events/user/mo). Enterprise plans have unlimited events.",
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
          "The open-source SDK works with any EVM-compatible chain. First-class integrations are provided for Base and Ethereum. Paid plans (Pro and above) add chain-specific anomaly detection for additional networks, and Enterprise customers can request non-EVM chain support.",
      },
      {
        question: "How does trust scoring work?",
        answer:
          "Each verified action receives a trust score between 0 and 1 computed from multiple weighted factors: agent history, amount normality relative to the agent's baseline, transaction velocity, recipient trust, and contextual pattern matching. The factors and weights are configurable.",
      },
      {
        question: "How does anomaly detection work?",
        answer:
          "Anomaly detection runs a configurable rule engine on every verify() call. The free tier includes two basic rules: unusual amount and frequency spike. Pro plans unlock all six detection rules including new-destination, off-hours, rapid-succession, and round-amount checks.",
      },
      {
        question: "What is the digest chain?",
        answer:
          "The digest chain is Kontext's patented append-only audit structure that cryptographically links each logged action to the full history before it. This creates a tamper-evident chain of records -- if any entry is modified, the chain breaks, making unauthorized changes immediately detectable.",
      },
      {
        question: "How is audit data stored?",
        answer:
          "With the open-source SDK, all data stays on your infrastructure -- you control storage entirely. On paid plans (Pro and above), audit data is encrypted at rest (AES-256) and in transit (TLS 1.3), stored in cloud infrastructure following SOC 2-aligned practices. You retain full ownership and can export or delete data at any time.",
      },
      {
        question: "What are the performance characteristics?",
        answer:
          "The verify() call adds sub-5ms overhead for local rule evaluation. The SDK is under 10kb gzipped with zero runtime dependencies. Cloud-powered trust scoring (Pro) adds a network round-trip but is optimized for P95 latency under 50ms via edge deployment.",
      },
    ],
  },
  {
    name: "Integration",
    faqs: [
      {
        question: "How do I integrate Kontext with USDC transfers?",
        answer:
          "Call ctx.verify() before executing any USDC transfer. Pass the amount, recipient, chain, and agent ID. Kontext returns a trust score and flag status. If the action is not flagged, proceed with the on-chain transfer using viem, ethers, or your preferred library. See the USDC integration guide in our docs for a complete example.",
      },
      {
        question: "Does Kontext work with the x402 protocol?",
        answer:
          "Yes. Kontext can be used as middleware in x402 HTTP-native payment flows. Intercept the x-402-payment header, run ctx.verify() against the payment details, and either allow or reject the request based on the trust score and flag status.",
      },
      {
        question: "How does the Google UCP / A2A integration work?",
        answer:
          "Kontext wraps Google Universal Checkout Protocol transactions with trust scoring and audit logging. Pass the UCP payload (amount, currency, agent ID, session ID) to ctx.verify() and use the result to approve or reject the agent-to-agent transaction.",
      },
      {
        question: "Can I use Kontext with Stripe?",
        answer:
          "Yes. Verify agent-initiated payments with Kontext before creating Stripe payment intents. The Kontext audit ID can be attached to Stripe metadata for full end-to-end traceability between your compliance logs and payment records.",
      },
      {
        question: "Does Kontext work with LangChain, CrewAI, or AutoGen?",
        answer:
          "Yes. Kontext is framework-agnostic -- it works with any agent framework. Wrap your agent's tool calls or action steps with ctx.verify() or ctx.log(). We provide integration examples for LangChain, CrewAI, AutoGen, and other popular frameworks in the docs.",
      },
      {
        question: "Can I use Kontext with any agent framework?",
        answer:
          "Absolutely. Kontext does not depend on any specific agent framework. It is a standalone SDK that you call at the points in your agent's execution where compliance matters -- before financial actions, after completions, or at any decision point you want audited.",
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
          "Kontext provides technical infrastructure aligned with where stablecoin regulation is heading: immutable audit trails, transaction-level logging, risk scoring, and exportable compliance reports. It supports your compliance efforts but does not make you compliant on its own -- it gives your compliance team the data and tooling they need.",
      },
      {
        question: "Is Kontext itself a certified compliance product?",
        answer:
          "Kontext is a developer tool, not a regulated financial entity. Paid plan infrastructure follows SOC 2-aligned practices for data handling. However, Kontext does not guarantee regulatory compliance and is not a substitute for legal counsel -- it provides the technical building blocks your compliance program needs.",
      },
      {
        question: "What audit export formats are supported?",
        answer:
          "The SDK supports JSON and CSV export. Exports can be filtered by date range, agent, action type, and flag status. Streaming export is available for large datasets.",
      },
      {
        question: "Is Kontext a replacement for legal counsel?",
        answer:
          "No. Kontext is infrastructure tooling, not legal advice. It provides the technical capabilities -- logging, scoring, detection, and reporting -- that your legal and compliance teams need to build a compliance program. Always consult qualified legal counsel for regulatory requirements specific to your jurisdiction and use case.",
      },
    ],
  },
  {
    name: "Pricing & Plans",
    faqs: [
      {
        question: "What is included in the free tier?",
        answer:
          "The free tier includes the full SDK with 20,000 events/month (soft cap), action logging, JSON export, basic anomaly detection (2 rules: unusual amount and frequency spike), trust scoring (local), digest chain verification, and Base chain support. It is MIT-licensed and free forever.",
      },
      {
        question: "What does the Pro plan include?",
        answer:
          "Pro ($199/user/mo, 100K events per user per month) includes everything in Free plus: all six anomaly detection rules (including new-destination, off-hours, rapid-succession, and round-amount), SAR/CTR report generation, OFAC sanctions screening, CSV export, multi-chain support (Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Solana), webhook alerts, and email support with 24h response time. Event limits scale with your team size.",
      },
      {
        question: "Can I self-host the entire stack?",
        answer:
          "Yes. The open-source SDK is designed for self-hosting with zero external dependencies. You control where data is stored and how it is processed.",
      },
      {
        question: "What does the Enterprise plan include?",
        answer:
          "Enterprise includes everything in Pro plus unlimited events (no caps), CFTC compliance module (Letter 26-05), Circle integrations (Programmable Wallets, Compliance Engine, Gas Station), CCTP cross-chain transfers, dedicated support engineer, 99.9% uptime SLA, and SOC 2 attestation support. Contact us for details.",
      },
    ],
  },
  {
    name: "Security",
    faqs: [
      {
        question: "How is data encrypted?",
        answer:
          "All data in transit is encrypted with TLS 1.3. On paid plans (Pro and above), data at rest is encrypted with AES-256. API keys are hashed and never stored in plaintext. The free tier keeps all data on your infrastructure, so encryption is governed by your own setup.",
      },
      {
        question: "Where is cloud data stored?",
        answer:
          "Paid plan data is stored in GCP infrastructure following SOC 2-aligned practices. Data residency options are available on Enterprise plans for organizations with geographic data requirements. All data is encrypted at rest and in transit.",
      },
      {
        question: "Is Kontext SOC2 certified?",
        answer:
          "Kontext's cloud infrastructure follows SOC 2-aligned practices. Enterprise customers receive SOC 2 attestation support and can request detailed security documentation. We are actively pursuing formal SOC 2 Type II certification.",
      },
      {
        question: "How does Kontext handle PII?",
        answer:
          "Kontext logs action metadata, not user PII. The SDK is designed so that you control what data is passed in the metadata fields. We recommend against including raw PII in action logs -- instead, use anonymized identifiers. Enterprise plans include data retention policies and automated PII scrubbing options.",
      },
    ],
  },
];

export default function FAQsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              FAQs
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Technical answers for developers building with Kontext. Can&apos;t
              find what you need? Reach out on{" "}
              <a
                href="https://github.com/vinay-lgtm-code/kontext_verify"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub Discussions
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="sticky top-16 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            {faqCategories.map((category) => (
              <a
                key={category.name}
                href={`#${category.name.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`}
                className="inline-flex shrink-0 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
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
              <Badge
                variant="outline"
                className="mb-4 border-primary/20 text-primary"
              >
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
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
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
