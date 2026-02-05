import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Kontext. Start free with the open-source SDK, or upgrade for cloud features, advanced anomaly detection, and compliance templates.",
};

const plans = [
  {
    name: "Open Source",
    price: "Free",
    period: "forever",
    description:
      "Everything you need to add basic compliance to your agentic workflows.",
    cta: "Get Started Free",
    ctaHref: "https://github.com/vinay-lgtm-code/kontext_verify",
    ctaExternal: true,
    highlighted: false,
    features: [
      "Core SDK with full TypeScript support",
      "Action logging and audit trail",
      "Basic anomaly detection rules",
      "Local audit export (JSON, CSV)",
      "Single-chain support",
      "Community support via GitHub",
      "MIT License",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description:
      "Cloud-powered compliance for teams shipping production agents.",
    cta: "Start Pro Trial",
    ctaHref: "/docs",
    ctaExternal: false,
    highlighted: true,
    features: [
      "Everything in Open Source, plus:",
      "Cloud compliance dashboard",
      "Advanced anomaly detection (ML-powered)",
      "Trust scoring API with history",
      "Compliance report templates (SOC2, SAR)",
      "Multi-chain support (Base, Ethereum, more)",
      "Webhook alerts and notifications",
      "Email support with 24h response time",
      "Team access controls",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For organizations with custom compliance requirements and scale.",
    cta: "Contact Us",
    ctaHref: "mailto:hello@kontext.dev",
    ctaExternal: true,
    highlighted: false,
    features: [
      "Everything in Pro, plus:",
      "Custom compliance rule engine",
      "Dedicated support engineer",
      "99.9% SLA guarantee",
      "SOC2 attestation support",
      "Custom audit report formats",
      "On-premise deployment option",
      "Volume-based pricing",
      "Priority feature requests",
    ],
  },
];

const faqs = [
  {
    question: "Is the open-source version really free?",
    answer:
      "Yes. The core Kontext SDK is MIT-licensed and free to use in production. It includes action logging, basic anomaly detection, and local audit export. You can run it entirely self-hosted with no usage limits.",
  },
  {
    question: "What happens if I exceed the Pro plan limits?",
    answer:
      "Pro plans include generous usage tiers. If you approach limits, we will reach out proactively. There are no surprise charges -- we will work with you to find the right plan, whether that is scaling Pro or moving to Enterprise.",
  },
  {
    question: "Can I try Pro features before committing?",
    answer:
      "Absolutely. Pro comes with a 14-day free trial with full access to all features. No credit card required to start. If it is not the right fit, you can continue using the open-source version.",
  },
  {
    question: "How does Kontext handle my transaction data?",
    answer:
      "With the open-source version, all data stays on your infrastructure. With Pro and Enterprise, data is encrypted at rest and in transit, stored in GCP with SOC2-compliant practices. You retain full ownership of your data and can export or delete it at any time.",
  },
  {
    question: "Do you support chains beyond Base and Ethereum?",
    answer:
      "The open-source SDK works with any EVM chain. Pro adds first-class support for multiple chains with chain-specific anomaly detection and trust scoring. Enterprise customers can request support for non-EVM chains.",
  },
  {
    question: "What kind of support do I get?",
    answer:
      "Open Source users get community support through GitHub Issues and Discussions. Pro includes email support with a 24-hour response time. Enterprise includes a dedicated support engineer and custom SLA.",
  },
  {
    question: "Is Kontext compliant with the GENIUS Act?",
    answer:
      "Kontext provides the infrastructure to help you achieve compliance with emerging stablecoin regulations including the GENIUS Act. This includes audit trails, transaction logging, and risk scoring. However, we are a tool provider, not a legal advisor -- consult your compliance team for specific regulatory requirements.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Pricing
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Start free with the open-source SDK. Upgrade when you need cloud
              features, advanced detection, and compliance templates.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-primary/50 shadow-lg shadow-primary/5"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-sm">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </div>
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
                    {plan.ctaExternal ? (
                      <a
                        href={plan.ctaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {plan.cta}
                        <ArrowRight size={16} />
                      </a>
                    ) : (
                      <Link href={plan.ctaHref}>
                        {plan.cta}
                        <ArrowRight size={16} />
                      </Link>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-muted-foreground">
              Can&apos;t find what you&apos;re looking for? Reach out on{" "}
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
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and add compliance to your first agent in under 5
              minutes.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <a
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Started Free
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
