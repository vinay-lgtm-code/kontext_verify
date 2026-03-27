import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "Pass your first partner review",
    who: "For teams preparing for their first sponsor bank or enterprise diligence review",
    cta: "Book a Demo",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "Advisory mode",
      "1 production environment",
      "OFAC screening (built-in SDN)",
      "Standard evidence retention",
      "JSON + CSV audit export",
      "Human / API / workflow initiation tracking",
      "Readiness assessment support",
      "Email support",
    ],
  },
  {
    name: "Growth",
    description: "Survive an examiner call",
    who: "For teams running live payments who need blocking, escalation, and examiner-ready exports",
    cta: "Book a Demo",
    ctaHref: "/contact",
    highlighted: true,
    features: [
      "Everything in Starter",
      "Blocking mode + escalation workflows",
      "Multiple environments + integrations",
      "Role-based access (compliance, risk, audit)",
      "Approval and override lineage",
      "Examiner packet export",
      "Independent verification proof",
      "OpenTelemetry / trace linking",
      "AI agent initiation tracking",
      "Advanced alerting + webhooks",
    ],
  },
  {
    name: "Enterprise",
    description: "Prove it to anyone",
    who: "For multi-rail programs with OCC/FinCEN examination exposure, GDPR obligations, and enterprise procurement requirements",
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "Everything in Growth",
      "Extended evidence retention",
      "Custom policy + controls mapping",
      "Partner diligence + incident exports",
      "GDPR / SAR / redaction workflows",
      "Case management / GRC integrations",
      "Security review + procurement terms",
      "Dedicated support + SLAs",
      "Policy-bound autonomous execution support",
      "Custom verification / export requirements",
    ],
  },
];

const faqs = [
  {
    question: "What counts as a payment decision?",
    answer:
      "Each call to verify(), log(), or logTransaction() counts as one payment decision monitored. Reads like verifyDigestChain() or export operations do not count toward your volume.",
  },
  {
    question: "What chains does Kontext support?",
    answer:
      "Kontext supports 8 chains: Ethereum, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche, and Solana. Starter plan supports Base; Growth and Enterprise unlock all 8.",
  },
  {
    question: "How does Kontext handle my data?",
    answer:
      "All audit data is encrypted at rest (AES-256) and in transit (TLS 1.3), stored in GCP cloud infrastructure following SOC 2-aligned practices. You retain full ownership and can export or delete your data at any time.",
  },
  {
    question: "Does Kontext help with GENIUS Act compliance?",
    answer:
      "Kontext provides the compliance infrastructure to build an audit-defensible evidence trail aligned with the GENIUS Act (signed July 2025, regulations due July 2026). It logs what happened, why it was allowed, and proves compliance checks ran with cryptographic proof. Kontext is compliance infrastructure, not a law firm — consult qualified legal counsel for your specific regulatory obligations.",
  },
  {
    question: "How is pricing structured?",
    answer:
      "Annual platform fee based on payment decisions monitored per month — the unit your compliance and risk teams already think in. Contact us for specific pricing based on your volume and requirements.",
  },
  {
    question: "What export formats are available?",
    answer:
      "Starter includes JSON and CSV exports. Growth adds examiner-ready packet exports. Enterprise includes partner diligence packets, incident review exports, and custom GRC/SIEM integrations.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Pricing
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Priced like a controls product, not a logging meter
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Annual platform fee based on payment decisions monitored and the
              depth of controls, governance, and export workflows your reviewers
              require.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted ? "border-primary" : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {plan.who}
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Check
                          size={16}
                          className="mt-0.5 shrink-0 text-primary"
                        />
                        <span className="text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full gap-2"
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.ctaHref}>
                      {plan.cta}
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Block */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center font-serif text-2xl font-normal text-[var(--ic-text)]">
            Why teams invest before they feel &ldquo;big enough&rdquo;
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-red)]">
                Before Kontext
              </span>
              <ul className="mt-3 space-y-3">
                {[
                  "Launch reviews stall on missing evidence",
                  "Hours reconstructing each incident",
                  "Spreadsheets and screenshots for diligence",
                  "Manual responses to partner questionnaires",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-red)]" />
                    <span className="text-[13px] text-[var(--ic-text-muted)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-green)]">
                With Kontext
              </span>
              <ul className="mt-3 space-y-3">
                {[
                  "Launch reviews close with structured evidence packets",
                  "Incident reconstruction in seconds, not hours",
                  "Examiner-ready exports replace ad hoc collection",
                  "Diligence responses backed by verifiable evidence",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-green)]" />
                    <span className="text-[13px] text-[var(--ic-text-muted)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cost-of-alternative comparison */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              The Cost of Not Having Kontext
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              What evidence fragmentation actually costs
            </h2>
          </div>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ic-border)]">
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]" />
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-red)]">
                    Manual evidence assembly
                  </th>
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-green)]">
                    With Kontext
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Examiner prep time", "Days to weeks per request", "Minutes per packet"],
                  ["Systems reconciled per review", "5\u20138 disconnected tools", "1 structured record"],
                  ["Average enforcement penalty (FinCEN 2025)", "$12.7M", "\u2014"],
                  ["Compliance team time on \u201chuman ETL\u201d", "60%+ of working hours", "Automated at capture"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-[var(--ic-border)]/50">
                    <td className="py-3 text-[var(--ic-text)]">{row[0]}</td>
                    <td className="py-3 text-[var(--ic-text-muted)]">{row[1]}</td>
                    <td className="py-3 text-[var(--ic-text-muted)]">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Agent callout */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[var(--ic-accent)]/20 bg-[var(--ic-accent-dim)] p-8 text-center">
            <h3 className="text-lg font-semibold text-[var(--ic-text)]">
              Deploying autonomy into payment flows?
            </h3>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
              Kontext helps teams preserve the decision evidence needed when
              AI agents recommend, initiate, or execute payment actions.
            </p>
            <div className="mt-5">
              <Link
                href="/ai-agents"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ic-accent)] transition-colors hover:text-[var(--ic-accent)]/80"
              >
                Learn about AI agents
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Feature Areas
            </span>
            <h2 className="mt-4 font-serif text-2xl font-normal text-[var(--ic-text)] sm:text-3xl">
              Plans scale with controls maturity
            </h2>
          </div>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ic-border)]">
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]">
                    Capability
                  </th>
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]">
                    Starter
                  </th>
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]">
                    Growth
                  </th>
                  <th className="pb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Enforcement", "Advisory", "Advisory + Blocking", "Blocking + custom escalation"],
                  ["Evidence retention", "Standard", "Extended options", "Custom retention windows"],
                  ["Export types", "JSON / CSV", "Examiner packets", "Diligence, incident, redacted"],
                  ["Approval workflows", "Basic thresholds", "Approval lineage", "Custom approval mapping"],
                  ["Verification", "Included", "Third-party proof", "Custom verification support"],
                  ["Governance", "Basic controls", "Redaction support", "GDPR / SAR workflows"],
                  ["Interoperability", "Core integrations", "OTel + webhooks", "GRC / case systems"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-[var(--ic-border)]/50">
                    {row.map((cell, index) => (
                      <td
                        key={cell}
                        className={`py-3 ${index === 0 ? "text-[var(--ic-text)]" : "text-[var(--ic-text-muted)]"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              FAQ
            </span>
            <p className="mt-4 text-muted-foreground">
              Can&apos;t find what you&apos;re looking for? Check the{" "}
              <Link
                href="/docs"
                className="text-primary hover:underline"
              >
                docs
              </Link>{" "}
              or{" "}
              <Link
                href="/contact"
                className="text-primary hover:underline"
              >
                get in touch
              </Link>
              .
            </p>
          </div>

          <Accordion type="single" collapsible className="mt-12">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
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
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              Be ready to explain every payment decision
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              See how Kontext creates an audit-defensible evidence trail for
              programmable payments.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Book a Demo
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">Read the Docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
