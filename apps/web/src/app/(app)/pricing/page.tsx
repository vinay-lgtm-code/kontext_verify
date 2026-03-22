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
    description: "For teams preparing for launch or first partner review",
    who: "Pre-launch startups, first bank partner review, early compliance setup",
    cta: "Book a Demo",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "1 production environment",
      "Capped monthly payment volume",
      "OFAC screening (built-in SDN)",
      "Tamper-evident audit trail",
      "JSON + CSV audit export",
      "Standard evidence retention",
      "Human / API / workflow initiation tracking",
      "Email support",
    ],
  },
  {
    name: "Growth",
    description:
      "For startups running live payment operations with formal controls",
    who: "Live payment operations, active compliance team, multi-environment",
    cta: "Book a Demo",
    ctaHref: "/contact",
    highlighted: true,
    features: [
      "Everything in Starter",
      "Higher monthly payment volume",
      "Multiple environments + integrations",
      "Role-based access (compliance, risk, audit)",
      "Advanced alerting + webhooks",
      "SAR/CTR report templates",
      "Multi-chain evidence trails (8 chains)",
      "AI agent initiation tracking",
      "Approval and override lineage",
      "Examiner packet export",
    ],
  },
  {
    name: "Enterprise",
    description:
      "For multi-rail teams with audit, bank, and enterprise diligence needs",
    who: "Multi-rail programs, regulatory audits, enterprise procurement",
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "Everything in Growth",
      "Custom volume bands",
      "Extended evidence retention",
      "Custom policy + controls mapping",
      "Case management / GRC integrations",
      "Security review + procurement terms",
      "Dedicated support + SLAs",
      "Agent-specific evidence exports",
      "Policy-bound autonomous execution support",
      "Partner diligence packet export",
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
              Annual platform fee based on payment decisions monitored — the
              unit your compliance and risk teams already think in.
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
