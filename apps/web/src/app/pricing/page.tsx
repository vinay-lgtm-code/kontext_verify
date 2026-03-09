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
      "Everything you need to start managing payment lifecycles. No credit card, no catch.",
    cta: "Get Started",
    ctaHref: "/docs",
    highlighted: false,
    features: [
      "20,000 payment stage events/month",
      "8-stage payment lifecycle",
      "Policy engine (OFAC, amount limits, blocklists)",
      "Tamper-evident digest chain",
      "5 workspace profiles / payment presets",
      "JSON audit export",
      "Base chain support",
      "ERC-8021 transaction attribution",
      "Community support via GitHub",
    ],
  },
  {
    name: "Pro",
    price: "$0.002",
    priceDetail: "per event above 20K free*",
    description:
      "For payment infrastructure in production. Usage-based pricing with no monthly minimum. First 20K events always free.",
    cta: "Get Started",
    ctaHref: "/docs",
    highlighted: true,
    features: [
      "First 20,000 events free every month",
      "Everything in Free, plus:",
      "All chains (Base, Ethereum, Solana)",
      "CSV export",
      "Ops dashboard (5 views)",
      "Slack + email notifications",
      "Advanced policy configurations",
      "6 provider adapters",
      "Cloud persistence",
      "Email support",
    ],
  },
];

const faqs = [
  {
    question: "Is the free tier really free?",
    answer:
      "Yes. The core Kontext SDK is MIT-licensed and genuinely free — 20,000 payment stage events per month, no credit card required, no time limit. It includes the full 8-stage payment lifecycle, the policy engine with OFAC screening, amount limits, and blocklists, tamper-evident digest chain verification, and JSON export. You can run it entirely on your own infrastructure.",
  },
  {
    question: "What counts as an event?",
    answer:
      "Each call to start(), authorize(), record(), broadcast(), confirm(), credit(), fail(), or refund() counts as one payment stage event. Reads like get() and list() are free.",
  },
  {
    question: "What happens when I hit the event limit?",
    answer:
      "On the Free tier, you will get a clear warning as you approach 20,000 payment stage events. Beyond the limit, new stage-transition calls will return a soft error with an upgrade prompt — your agent keeps running, it just stops recording new events until the next month or until you upgrade to Pro.",
  },
  {
    question: "How does Pro pricing work?",
    answer:
      "Pro is usage-based at $0.002 per event above the 20K free tier. No monthly minimum, no commitment. Your first 20,000 payment stage events are always free every month.",
  },
  {
    question: "What does Pro add over Free?",
    answer:
      "Pro unlocks multi-chain support across Base, Ethereum, and Solana, an ops dashboard with 5 views, CSV export, Slack and email notifications, advanced policy configurations, and 6 provider adapters for integrating external screening and compliance services. Cloud persistence and email support are also included.",
  },
  {
    question: "What chains does Kontext support?",
    answer:
      "Free supports Base. Pro unlocks Ethereum and Solana.",
  },
  {
    question: "How does Kontext handle my data?",
    answer:
      "On the Free tier, all data stays on your infrastructure — nothing leaves your machine. On Pro with cloud features enabled, data is encrypted at rest and in transit, stored on GCP. You retain full ownership and can export or delete your data at any time.",
  },
  {
    question: "Does Kontext help with GENIUS Act compliance?",
    answer:
      "Kontext provides the developer tooling to build a compliance audit trail aligned with the GENIUS Act (signed July 2025, regulations due July 2026). The policy engine runs at the authorize() stage to screen transactions against OFAC, enforce amount limits, and apply blocklists before funds move. The digest chain provides cryptographic proof that checks ran. That said, Kontext is a developer SDK, not a law firm — consult qualified legal counsel for your specific regulatory obligations.",
  },
  {
    question: "Can I pay with USDC instead of a credit card?",
    answer:
      "Yes. Pro supports two payment methods: Stripe (credit card) and USDC on Base via the x402 protocol. With x402, your agent pays $0.002 per event in USDC directly — no checkout flow, no human intervention. Both methods charge the same rate. USDC payments settle to our Circle Programmable Wallet on Base in real-time.",
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
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              PRICING
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
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
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">
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
          <p className="mt-6 text-center text-xs text-muted-foreground">
            *A payment stage event is any call to a stage-transition method — start(), authorize(), record(), broadcast(), confirm(), credit(), fail(), or refund(). Reads like get() and list() are free.
          </p>
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
              Install the SDK, initialize, and call <code className="bg-muted px-1.5 py-0.5 text-sm font-mono border border-border">start()</code>. <code className="bg-muted px-1.5 py-0.5 text-sm font-mono border border-border">authorize()</code>. That&apos;s it.
            </p>
          </div>
          <div className="mt-8 overflow-hidden border border-border bg-background">
            <pre className="overflow-x-auto p-6 text-sm leading-relaxed">
              <code>{`import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-app',
  environment: 'production',
});

const attempt = await ctx.start({
  workspaceRef: 'acme', appRef: 'pay-agent',
  archetype: 'treasury',
  intentCurrency: 'USD', settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xSender' },
  recipientRefs: { wallet: '0xRecipient' },
  executionSurface: 'sdk',
});

const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base', token: 'USDC', amount: '5000',
  from: '0xSender', to: '0xRecipient',
  actorId: 'treasury-agent',
});
// receipt.decision = 'allow' | 'block' | 'review'`}</code>
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
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-sm font-medium">
              Ready to ship payment infrastructure?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and add payment lifecycle management in
              under 5 minutes.
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
