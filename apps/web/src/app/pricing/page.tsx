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
    name: "Free",
    price: "$0",
    priceDetail: "forever",
    description:
      "Everything you need to start logging compliance for your agents. No credit card, no catch.",
    cta: "Get Started",
    ctaHref: "/docs",
    highlighted: false,
    features: [
      "20,000 events/month",
      "Core SDK (verify(), log(), logTransaction())",
      "Tamper-evident digest chain",
      "Trust scoring",
      "Basic anomaly detection (2 rules)",
      "JSON audit export",
      "Base chain support",
      "Agent reasoning logs",
      "Compliance certificates",
      "On-chain anchoring",
      "A2A attestation",
      "Community support via GitHub",
    ],
  },
  {
    name: "Pro",
    price: "$2",
    priceDetail: "per 1,000 events above 20K free",
    description:
      "For agents in production. Usage-based pricing with no monthly minimum. First 20K events always free.",
    cta: "Get Started",
    ctaHref: "/docs",
    highlighted: true,
    features: [
      "First 20,000 events free every month",
      "Everything in Free, plus:",
      "All 6 anomaly detection rules",
      "Unified screening (OFAC, Chainalysis, OpenSanctions)",
      "Custom blocklist/allowlist",
      "CSV export",
      "Multi-chain support (8 chains)",
      "Webhook alerts",
      "Cloud persistence",
      "Email support",
    ],
  },
];

const faqs = [
  {
    question: "Is the free tier really free?",
    answer:
      "Yes. The core Kontext SDK is MIT-licensed and genuinely free — 20,000 events per month, no credit card required, no time limit. It includes verify(), action logging, trust scoring, basic anomaly detection, digest chain verification, on-chain anchoring, A2A attestation, and JSON export. You can run it entirely on your own infrastructure.",
  },
  {
    question: "What counts as an event?",
    answer:
      "Each call to verify(), log(), logTransaction(), or logReasoning() counts as one event. Reads like getTrustScore() or verifyDigestChain() are free and do not count toward your limit.",
  },
  {
    question: "What happens when I hit the event limit?",
    answer:
      "On the Free tier, you will get a clear warning as you approach 20,000 events. Beyond the limit, new logging calls will return a soft error with an upgrade prompt — your agent keeps running, it just stops recording new events until the next month or until you upgrade to Pro.",
  },
  {
    question: "How does Pro pricing work?",
    answer:
      "Pro is usage-based at $2 per 1,000 events above the 20K free tier. No monthly minimum, no commitment. Your first 20,000 events are always free every month. Formula: max(0, events - 20,000) / 1,000 × $2.00.",
  },
  {
    question: "What does Pro add over Free?",
    answer:
      "Pro unlocks all six anomaly detection rules (adding newDestination, offHoursActivity, rapidSuccession, and roundAmount), unified screening across OFAC SDN, Chainalysis, and OpenSanctions, custom blocklist/allowlist management, CSV export, multi-chain support across 8 networks, webhook alerts, cloud persistence, and email support.",
  },
  {
    question: "What chains does Kontext support?",
    answer:
      "The Free tier supports Base. Pro unlocks all 8 chains: Ethereum, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche, and Solana.",
  },
  {
    question: "How does Kontext handle my data?",
    answer:
      "On the Free tier, all data stays on your infrastructure — nothing leaves your machine. On Pro with cloud features enabled, data is encrypted at rest and in transit, stored on GCP. You retain full ownership and can export or delete your data at any time.",
  },
  {
    question: "Does Kontext help with GENIUS Act compliance?",
    answer:
      "Kontext provides the developer tooling to build a compliance audit trail aligned with the GENIUS Act (signed July 2025, regulations due July 2026). It logs what your agents did, why they did it, and proves compliance checks ran with cryptographic proof. That said, Kontext is a developer SDK, not a law firm — consult qualified legal counsel for your specific regulatory obligations.",
  },
  {
    question: "What kind of support do I get?",
    answer:
      "Free tier gets community support through GitHub Issues and Discussions. Pro includes email support.",
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b-2 border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Pricing
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Start free. Scale when you need to.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              The core SDK is open-source and free for up to 20K events a month.
              Pay only for what you use beyond that.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-primary shadow-shadow"
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
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {plan.price}
                    </span>
                    {plan.priceDetail && (
                      <span className="text-sm text-muted-foreground">
                        {plan.priceDetail}
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
      <section className="border-t-2 border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Up and running in 2 minutes
            </h2>
            <p className="mt-4 text-muted-foreground">
              Install the SDK, initialize, and call <code className="rounded-[5px] bg-muted px-1.5 py-0.5 text-sm font-mono border border-border">verify()</code>. That&apos;s it.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-[5px] border-2 border-border bg-background shadow-shadow">
            <pre className="overflow-x-auto p-6 text-sm leading-relaxed">
              <code>{`import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-agent',
  environment: 'production',
});

const result = await ctx.verify({
  txHash: '0xabc...',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'payment-agent-v1',
});

// result.compliant = true/false
// result.checks = [{ name: 'OFAC Sanctions', passed: true }, ...]
// result.riskLevel = 'low' | 'medium' | 'high' | 'critical'`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-muted-foreground">
              Can&apos;t find what you&apos;re looking for? Reach out on{" "}
              <a
                href="https://github.com/Legaci-Labs/kontext"
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
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to ship compliant agents?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and add compliance logging to your first agent in
              under 5 minutes. No API key required.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/docs">
                  Get Started Free
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com/Legaci-Labs/kontext"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
