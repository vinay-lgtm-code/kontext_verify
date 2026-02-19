import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    "Frequently asked questions about Kontext — the compliance logging SDK for developers building on Circle Programmable Wallets.",
};

const faqs = [
  {
    question: "What is the GENIUS Act and why does it matter?",
    answer:
      "The GENIUS Act (S. 1582, Guiding and Establishing National Innovation for U.S. Stablecoins) was signed into law on July 18, 2025. It treats payment stablecoin issuers as financial institutions under the Bank Secrecy Act (BSA). Implementing regulations are due July 2026, and prohibitions take effect November 2026. Developers handling material USDC transfers ($3,000+) need audit infrastructure — audit trails, compliance logs, and tamper-evident proof that checks ran — before that deadline.",
  },
  {
    question: "Does Kontext replace Circle's Compliance Engine?",
    answer:
      "No. Circle's paid Compliance Engine handles transaction screening. Kontext handles the audit trail and proof that screening ran. They're complementary, not competitive. You can use both: Circle screens the transaction, Kontext logs that the screen happened, stores the result in a tamper-evident digest chain, and generates exportable compliance certificates.",
  },
  {
    question: "What's the difference between Free and Pay as you go?",
    answer:
      "Free gives you 20,000 events/mo forever, Base chain, basic anomaly detection (2 rules), JSON audit export, trust scoring, and compliance certificates — all at $0, no credit card required. Pay as you go unlocks everything: all 8 chains (after $5 cumulative spend), advanced anomaly detection at $0.10/anomaly, CSV export, and Firestore cloud persistence. You pay $2.00 per 1,000 events beyond the 20K free tier. No monthly minimum — if you don't go over 20K events, you pay nothing.",
  },
  {
    question: "How does the digest chain work?",
    answer:
      "The digest chain is a SHA-256 rolling hash chain (Patent US 12,463,819 B1). Every action, transaction, and reasoning entry generates a hash that includes the previous hash. This creates a tamper-evident sequence: if any entry is altered after the fact, the hash verification fails. The terminal digest is your cryptographic proof that compliance ran in the exact sequence recorded. Call verifyDigestChain() at any time to verify the chain integrity.",
  },
  {
    question: "Is there a Python SDK?",
    answer:
      "Not yet. Kontext is TypeScript-only for now. We're not publishing a 'coming soon' timeline because we'd rather ship Python when there's a concrete timeline and proven demand. If you need Python support, file an issue on GitHub with your use case.",
  },
  {
    question: "What chains are supported?",
    answer:
      "Free tier: Base only. Pay as you go (after $5 cumulative spend): all 8 chains — Ethereum, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche, and Solana. All chains require the logTransaction() or verify() call to specify the chain parameter.",
  },
  {
    question: "What OFAC screening is included on the free tier?",
    answer:
      "Both tiers include the built-in SDN list screening via the UsdcCompliance class. This checks transaction addresses against the OFAC Specially Designated Nationals list. The verify() call runs OFAC screening, EDD thresholds ($3K Travel Rule, $10K CTR), and large transaction detection ($50K+) in a single call. Advanced multi-provider screening (Chainalysis, OpenSanctions) is on the roadmap for developers who bring their own API keys.",
  },
  {
    question: "Can I use Kontext without an API key?",
    answer:
      "Yes. Local mode requires no API key. Pass just a projectId and environment to Kontext.init(). All features including verify(), trust scoring, anomaly detection, and compliance certificates work locally. Cloud persistence (Firestore) and cloud event shipping require an API key, available on Pay as you go.",
  },
  {
    question: "How do I store logs persistently?",
    answer:
      "Two local options are included in both tiers: MemoryStorage (default, resets on restart) and FileStorage (writes JSON to disk). Pass storage: new FileStorage('./compliance-data') to Kontext.init(). For cloud persistence across restarts and deployments, Firestore storage is available on Pay as you go.",
  },
  {
    question: "What is Patent US 12,463,819 B1?",
    answer:
      "Patent US 12,463,819 B1 covers Kontext's tamper-evident digest chain for agent audit trails. The digest chain links every action, transaction, and reasoning entry into a cryptographically verifiable sequence using SHA-256 rolling hashes. This is the core innovation that makes Kontext audit trails provably tamper-evident — not just stored, but cryptographically proven.",
  },
  {
    question: "How does trust scoring work?",
    answer:
      "Trust scoring computes a 0–100 behavioral health score for each agent, calculated across 5 weighted factors: history depth (0.15), task completion rate (0.25), anomaly frequency (0.25), transaction consistency (0.20), and compliance adherence (0.15). Scores map to levels: untrusted (0–20), low (21–40), medium (41–60), high (61–80), and verified (81–100). Call getTrustScore(agentId) to retrieve the current score and factor breakdown. Trust scoring is included on both Free and Pay as you go.",
  },
  {
    question: "What anomalies does Kontext detect for free?",
    answer:
      "Free tier includes two anomaly rules: unusualAmount (transaction above a configured threshold or 5× the agent's historical average) and frequencySpike (too many transactions within a rolling time window). Four advanced rules are available on Pay as you go at $0.10/anomaly detected: newDestination (first-time recipient address), offHoursActivity (transaction outside configured active hours), rapidSuccession (transactions too close together in time), and roundAmount (suspiciously round transaction amounts, a common structuring indicator).",
  },
];

export default function FAQsPage() {
  return (
    <div className="bg-bg">
      {/* Header */}
      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <Badge variant="gray" className="mb-4">FAQs</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-black/70 max-w-2xl">
            Questions about Kontext, the GENIUS Act, pricing, and how the SDK works.
          </p>
        </div>
      </section>

      {/* FAQ accordion */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <Accordion type="single" collapsible className="space-y-0">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-bold text-black py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-black/70 leading-relaxed pb-2">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-black bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-white/60 mb-6">Open an issue on GitHub or read the docs.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/docs">
                Read the docs
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <a
                href="https://github.com/vinay-lgtm-code/kontext_verify/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open an issue
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
