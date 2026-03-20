import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------

const plans = [
  {
    name: "Starter",
    price: "",
    priceDetail: "",
    description:
      "For teams standing up programmable payments controls.",
    cta: "Book a Demo",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "1 production environment",
      "Capped monthly payment volume",
      "OFAC screening (built-in SDN)",
      "Patented tamper-evident chain",
      "JSON + CSV audit export",
      "Standard evidence retention",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "",
    priceDetail: "",
    description:
      "For payment infrastructure companies with active compliance teams.",
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
    ],
  },
  {
    name: "Enterprise",
    price: "",
    priceDetail: "",
    description:
      "For regulated platforms with multi-rail programs and audit requirements.",
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
      "Kontext supports 8 chains: Ethereum, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche, and Solana.",
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
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              PRICING
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Priced like a controls product, not a logging meter. Annual
              platform fee based on payment decisions monitored.
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
                  plan.highlighted
                    ? "border-primary"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
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

      {/* Code example */}
      <section className="border-t border-border bg-[var(--term-surface)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-sm font-medium">
              Up and running in 2 minutes
            </h2>
            <p className="mt-4 text-muted-foreground">
              Install the SDK, initialize, and call <code className="bg-muted px-1.5 py-0.5 text-sm font-mono border border-border">verify()</code>. That&apos;s it.
            </p>
          </div>
          <div className="mt-8 overflow-hidden border border-border bg-background">
            <pre className="overflow-x-auto p-6 text-sm leading-relaxed">
              <code>{`import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-agent',
  environment: 'production',
});

const result = await ctx.verify({
  txHash: '0xabc...',
  chain: 'base',
  amount: '0.50',
  token: 'USDC',
  from: '0xAgentWallet',
  to: '0xAPIProvider',
  agentId: 'research-agent',
});

// result.compliant = true/false
// result.checks = [{ name: 'OFAC Sanctions', passed: true }, ...]
// result.riskLevel = 'low' | 'medium' | 'high' | 'critical'`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h2 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              FAQ
            </h2>
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
            <h2 className="text-sm font-medium">
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
                <Link href="/docs">
                  Read the Docs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
