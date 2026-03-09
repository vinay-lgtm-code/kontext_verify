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
    "Frequently asked questions about Kontext — the Payment Control Plane. 8-stage payment lifecycle, policy engine, provider adapters, workspace profiles, and pricing.",
};

const faqCategories = [
  {
    name: "General",
    faqs: [
      {
        question: "What is Kontext?",
        answer:
          "Kontext is a TypeScript SDK that provides a Payment Control Plane for developers moving money programmatically. It normalizes payment events from any provider into a canonical 8-stage lifecycle, enforces compliance policies at the authorize stage, and produces a tamper-evident digest chain as cryptographic proof that checks ran.",
      },
      {
        question: "Who is Kontext built for?",
        answer:
          "Kontext is built for developers integrating with payment providers like Circle, Bridge, and Modern Treasury, or sending on-chain stablecoin transfers directly. If you handle payments across multiple providers or chains and need a unified lifecycle with policy enforcement and audit trails, Kontext replaces the custom glue code you would otherwise build yourself.",
      },
      {
        question: "Is Kontext open source?",
        answer:
          "Yes. The core SDK is fully open source under the MIT license. You can self-host the entire stack with zero external dependencies. The free tier includes 20,000 events per month. Pro adds usage-based pricing above that threshold with cloud persistence, CSV export, multi-chain support, and additional policy features.",
      },
      {
        question: "What license does Kontext use?",
        answer:
          "Kontext is released under the MIT License. You can use it freely in commercial and non-commercial projects without restrictions. Contributions are welcome via GitHub pull requests.",
      },
    ],
  },
  {
    name: "Payment Lifecycle",
    faqs: [
      {
        question: "What are the 8 stages of the payment lifecycle?",
        answer:
          "Every payment passes through up to 8 stages: (1) Intent — a payment is requested, (2) Authorize — the policy engine evaluates sanctions, limits, and metadata requirements, (3) Prepare — the transaction is constructed, (4) Transmit — the transaction is broadcast to the network or provider, (5) Confirm — on-chain or provider confirmation is received, (6) Recipient Credit — funds are credited to the recipient, (7) Reconcile — the payment is matched against internal records, (8) Retry or Refund — failed payments are retried or reversed. Not every payment hits all 8 stages. A blocked payment stops at Authorize. A successful payment may skip Retry or Refund entirely.",
      },
      {
        question: "What is a PaymentAttempt?",
        answer:
          "A PaymentAttempt is the canonical object representing a single payment from start to finish. It contains an ordered list of StageEvents, references to the sender and recipient, the chain and settlement asset, the payment archetype (payroll, remittance, invoicing, treasury, or micropayments), and a FinalState. Every payment you process through Kontext becomes a PaymentAttempt, regardless of which provider or chain originated it.",
      },
      {
        question: "What is a StageEvent?",
        answer:
          "A StageEvent records a single transition in the payment lifecycle. It includes the stage name (e.g., authorize, confirm), a status (pending, succeeded, failed, review, or collect_info), who performed the action (sender, recipient, network, provider, or internal), a machine-readable code, a human-readable message, a timestamp, and an optional payload for provider-specific data. StageEvents are append-only — once recorded, they cannot be modified.",
      },
      {
        question: "What is a FinalState?",
        answer:
          "FinalState is the terminal status of a PaymentAttempt. The possible values are: pending (still in progress), succeeded (payment completed), failed (payment could not be completed), review (held for human review), blocked (rejected by policy engine), and refunded (funds returned to sender). A PaymentAttempt reaches its FinalState when no further stage transitions are expected.",
      },
    ],
  },
  {
    name: "Policy Engine",
    faqs: [
      {
        question: "What checks run at the authorize stage?",
        answer:
          "The policy engine runs five categories of checks at authorize: (1) OFAC sanctions screening — sender and recipient addresses checked against the Treasury SDN list, (2) Transaction limits — per-transaction maximums and daily aggregate caps, (3) Blocklist/allowlist — explicit recipient and sender controls, (4) Metadata requirements — enforces that the correct fields are present for each payment type (e.g., payroll requires employeeId and payPeriod), (5) Review thresholds — amounts above a configurable limit require human approval. The result is a PaymentReceipt with a decision of allow, block, review, or collect_info.",
      },
      {
        question: "How do I configure policies?",
        answer:
          "Policies are defined per payment archetype in your workspace profile. Each archetype (payroll, remittance, invoicing, treasury, micropayments) has a policy preset with sensible defaults for transaction limits, daily caps, review thresholds, required metadata fields, and sanctions screening. You can customize any preset by overriding individual fields, or define a policy from scratch. The policy posture setting controls whether violations are logged but allowed (monitor mode) or block the payment (enforce mode).",
      },
      {
        question: "What OFAC coverage does Kontext provide?",
        answer:
          "The built-in Treasury SDN provider screens sender and recipient addresses against OFAC sanctioned addresses with zero external dependencies and no API key required. This runs on every authorize call when sanctions screening is enabled in the policy (enabled by default). For production deployments that need broader coverage, the pluggable ScreeningProvider architecture supports Chainalysis and OpenSanctions — bring your own API key and the screening aggregator combines results from all configured providers.",
      },
      {
        question: "What OFAC screening does Kontext provide?",
        answer:
          "Built-in OFAC screening uses a local SDN address list checked at the authorize stage — no API key or external service required. Both sender and recipient addresses are screened. This covers known sanctioned Ethereum addresses and is sufficient for development and MVP use. For production compliance, layer external screening providers (Chainalysis KYT, TRM Labs, Elliptic) alongside Kontext authorize() results.",
      },
      {
        question:
          "How do I use external screening providers like Chainalysis for production?",
        answer:
          "Currently, run your external screening provider alongside Kontext authorize(). Use authorize() for policy engine checks (amount limits, blocklists, metadata requirements, built-in OFAC) and your external provider for real-time transaction monitoring and wallet risk scoring. External provider injection (externalScreeners parameter in authorize()) is planned for a future release.",
      },
    ],
  },
  {
    name: "Workspace Profiles",
    faqs: [
      {
        question: "What are payment presets?",
        answer:
          "Payment presets are pre-configured policy templates for common payment archetypes. Kontext ships with five: Payroll (employee payouts with required employeeId, payPeriod, and country metadata), Remittance (cross-border transfers with required recipientName, recipientCountry, and purpose), Invoicing (B2B payments with required invoiceId, vendorId, and dueDate), Treasury (internal fund movements with higher limits), and Micropayments (high-frequency low-value transfers). Each preset defines transaction limits, daily aggregate caps, review thresholds, and required metadata fields appropriate for that payment type.",
      },
      {
        question: "How do I customize workspace archetypes?",
        answer:
          "A workspace profile declares which archetypes are active, which chains and settlement assets are supported, and the policy posture (monitor or enforce). You can override any field in a preset's policy — for example, raise the payroll daily aggregate limit or add custom metadata requirements for invoicing. A single workspace can operate multiple archetypes simultaneously. The profile also controls retry defaults, address redaction settings, and notification triggers for blocked or flagged payments.",
      },
    ],
  },
  {
    name: "Provider Adapters",
    faqs: [
      {
        question: "What does normalizeEvent() do?",
        answer:
          "normalizeEvent() is the core method on every provider adapter. It takes a provider-specific event (a Circle webhook payload, a Bridge callback, a Modern Treasury event, a raw EVM transaction receipt, a Solana confirmation) and translates it into a canonical StageEvent. This means your application logic, policy checks, and audit exports work against one data model regardless of how many providers you integrate. Each adapter declares which lifecycle stages it supports.",
      },
      {
        question: "Which providers are supported?",
        answer:
          "Kontext ships with six provider adapters: EVM (raw Ethereum-compatible chain transactions), Solana (native Solana transactions), Circle (Circle Programmable Wallets and CCTP), x402 (HTTP-native payment protocol), Bridge (Bridge.xyz orchestration API), and Modern Treasury (fiat payment operations). The ProviderAdapter interface is public — you can implement normalizeEvent() for any payment provider not covered by the built-in adapters.",
      },
    ],
  },
  {
    name: "Pricing",
    faqs: [
      {
        question: "What counts as an event?",
        answer:
          "An event is a stage-transition call — each time a StageEvent is appended to a PaymentAttempt, that counts as one event. A payment that progresses through intent, authorize, prepare, transmit, confirm, and recipient_credit generates 6 events. A payment that is blocked at authorize generates 2 events (intent + authorize). Policy evaluation at the authorize stage is included in the authorize event and does not count separately.",
      },
      {
        question: "How does Pro pricing work?",
        answer:
          "The first 20,000 events per month are always free, no credit card required. Above 20,000 events, Pro pricing is usage-based at $2.00 per 1,000 events. No monthly minimum and no commitment. Pro includes everything in the free tier plus cloud persistence, CSV audit export, multi-chain support (Ethereum and Solana in addition to Base), webhook notifications, and all policy engine features. Formula: max(0, events - 20,000) / 1,000 x $2.00.",
      },
      {
        question: "How is audit data handled?",
        answer:
          "With the open-source SDK, all data stays on your infrastructure — you control storage entirely using the built-in file storage adapter or any custom storage implementation. On Pro, audit data is encrypted at rest (AES-256) and in transit (TLS 1.3), stored in GCP infrastructure following SOC 2-aligned practices. You retain full ownership and can export your complete audit history as JSON or CSV at any time.",
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
              Technical answers for developers building with the Kontext
              Payment Control Plane. Can&apos;t find what you need? Reach out
              on{" "}
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
