"use client";

import { useState } from "react";
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
import { Check, ArrowRight, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Upgrade helper — calls the server to create a Stripe Checkout session
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function initiateUpgrade(
  email: string,
  seats?: number,
): Promise<string> {
  const res = await fetch(`${API_URL}/v1/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, seats }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Checkout failed" }));
    throw new Error(body.error ?? "Failed to start checkout");
  }

  const { url } = await res.json();
  return url; // Redirect to this Stripe Checkout URL
}

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description:
      "Everything you need to add basic compliance to your agentic workflows. Includes 20,000 events/month.",
    cta: "Get Started",
    ctaHref: "https://github.com/vinay-lgtm-code/kontext_verify",
    ctaExternal: true,
    highlighted: false,
    isProCheckout: false,
    features: [
      "20,000 events/month included",
      "Core SDK with full TypeScript support",
      "Action logging and audit trail",
      "Basic anomaly detection (unusual amount, frequency spike)",
      "Trust scoring (local)",
      "JSON export",
      "Base chain support",
      "Digest chain integrity verification",
      "Community support via GitHub",
      "MIT License",
    ],
  },
  {
    name: "Pro",
    price: "$199",
    period: "/user/mo",
    description:
      "Everything in Free plus all detection rules, unified screening (OFAC, Chainalysis, OpenSanctions), compliance templates, and webhook alerts. 100K events/user/mo.",
    cta: "Start Pro",
    ctaHref: "#",
    ctaExternal: false,
    highlighted: true,
    isProCheckout: true,
    features: [
      "100,000 events/user/month",
      "Everything in Free, plus:",
      "All anomaly detection rules (6 rules)",
      "SAR/CTR report generation",
      "Best-in-class unified screening (OFAC, Chainalysis, OpenSanctions)",
      "Custom blocklist/allowlist manager",
      "CSV export",
      "Multi-chain support (Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Solana)",
      "Webhook alerts",
      "Email support (24h response)",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "Everything in Pro plus CFTC compliance, Circle integrations, dedicated support, SLA, and unlimited events.",
    cta: "Contact Us",
    ctaHref: "https://cal.com/vinnaray",
    ctaExternal: true,
    highlighted: false,
    isProCheckout: false,
    features: [
      "Unlimited events — no caps",
      "Everything in Pro, plus:",
      "CFTC compliance module (Letter 26-05)",
      "Unified screening with custom provider weights and SLAs",
      "Circle integrations (Programmable Wallets, Compliance Engine, Gas Station)",
      "CCTP cross-chain transfers",
      "Dedicated support engineer",
      "99.9% uptime SLA",
      "SOC 2 attestation support",
    ],
  },
];

const faqs = [
  {
    question: "Is the free tier really free?",
    answer:
      "Yes. The core Kontext SDK is MIT-licensed and free to use in production with 20,000 events/month included. Beyond that, events are soft-capped with a clear upgrade prompt. It includes action logging, basic anomaly detection, and local audit export. You can run it entirely self-hosted.",
  },
  {
    question: "Can I try Pro features before committing?",
    answer:
      "Absolutely. All paid plans come with a 14-day free trial with full access to all features. No credit card required to start. If it is not the right fit, you can continue using the free tier with 20K events/month.",
  },
  {
    question: "What does the Pro tier include for compliance?",
    answer:
      "Pro includes 100,000 events per user per month, all six anomaly detection rules (including new-destination, off-hours, rapid-succession, and round-amount checks), SAR/CTR report generation, best-in-class unified screening (OFAC SDN, Chainalysis, OpenSanctions), custom blocklist/allowlist manager, CSV export, multi-chain support (Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Solana), webhook alerts, and email support with 24h response time. Enterprise gets unlimited events with no caps.",
  },
  {
    question: "How does Kontext handle my transaction data?",
    answer:
      "With the free tier, all data stays on your infrastructure. With Pro, data is encrypted at rest and in transit, stored in GCP following SOC 2-aligned practices. You retain full ownership of your data and can export or delete it at any time.",
  },
  {
    question: "Do you support chains beyond Base and Ethereum?",
    answer:
      "The free SDK works with any EVM chain. Pro adds first-class support for multiple chains with chain-specific anomaly detection and trust scoring. Enterprise customers can request support for non-EVM chains.",
  },
  {
    question: "What kind of support do I get?",
    answer:
      "Free tier users get community support through GitHub Issues and Discussions. Pro includes email support with a 24-hour response time. Enterprise includes a dedicated support engineer and custom SLA.",
  },
  {
    question: "Does Kontext support GENIUS Act compliance efforts?",
    answer:
      "Kontext provides developer tools that support compliance efforts aligned with emerging stablecoin regulations including the GENIUS Act. The Pro tier includes GENIUS Act alignment templates, SAR/CTR report generation, and best-in-class unified screening (OFAC, Chainalysis, OpenSanctions). However, Kontext is a developer tool, not a legal advisor or compliance certifier -- consult qualified legal counsel for specific regulatory requirements.",
  },
];

// ---------------------------------------------------------------------------
// Email Capture Modal (inline)
// ---------------------------------------------------------------------------

function EmailCaptureForm({
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  onSubmit: (email: string, seats: number) => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [seats, setSeats] = useState(1);

  const total = seats * 199;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Start your Pro subscription</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          $199/user/month. Each seat includes 100K events/mo.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) onSubmit(email.trim(), seats);
          }}
          className="mt-4 space-y-3"
        >
          <input
            type="email"
            required
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
            disabled={isLoading}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Team size
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSeats(Math.max(1, seats - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm hover:bg-muted"
                disabled={seats <= 1 || isLoading}
              >
                -
              </button>
              <span className="w-12 text-center text-sm font-medium">
                {seats} {seats === 1 ? "user" : "users"}
              </span>
              <button
                type="button"
                onClick={() => setSeats(seats + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm hover:bg-muted"
                disabled={isLoading}
              >
                +
              </button>
              <span className="ml-auto text-sm text-muted-foreground">
                ${total}/mo
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(seats * 100000).toLocaleString()} events/mo total
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  Continue to Checkout
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </form>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Powered by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleProCheckout(email: string, seats: number) {
    setIsLoading(true);
    setCheckoutError(null);

    try {
      const url = await initiateUpgrade(email, seats);
      window.location.href = url;
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Email Capture Modal */}
      {showEmailCapture && (
        <EmailCaptureForm
          onSubmit={handleProCheckout}
          onCancel={() => {
            setShowEmailCapture(false);
            setCheckoutError(null);
          }}
          isLoading={isLoading}
          error={checkoutError}
        />
      )}

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
              Start free with the open-source SDK. Upgrade to Pro when you need
              all detection rules, unified screening, and compliance templates.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
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
                  {plan.isProCheckout ? (
                    <Button
                      className="w-full gap-2"
                      variant="default"
                      onClick={() => setShowEmailCapture(true)}
                    >
                      {plan.cta}
                      <ArrowRight size={16} />
                    </Button>
                  ) : (
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
                  )}
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
