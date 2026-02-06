import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import {
  Shield,
  FileCheck,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const heroCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext({ apiKey: process.env.KONTEXT_KEY });

// Log and verify every agent transaction
const result = await ctx.verify({
  action: 'transfer',
  amount: '50.00',
  currency: 'USDC',
  chain: 'base',
  agent: 'payment-agent-v2',
});

console.log(result.trustScore); // 0.97
console.log(result.flagged);    // false`;

const features = [
  {
    icon: ClipboardCheck,
    title: "Action Logging",
    description:
      "Immutable audit trail for every agent action. Know what your agents did, when, and why.",
  },
  {
    icon: Shield,
    title: "Task Confirmation",
    description:
      "Human-in-the-loop confirmation for high-value or sensitive transactions before execution.",
  },
  {
    icon: FileCheck,
    title: "Audit Export",
    description:
      "Export compliance-ready reports in standard formats. Ready for regulators, auditors, and your own records.",
  },
  {
    icon: BarChart3,
    title: "Trust Scoring",
    description:
      "Real-time trust scores for agent actions based on historical behavior, amount, and context.",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly Detection",
    description:
      "Flag unusual patterns automatically. Velocity checks, amount thresholds, and behavioral analysis.",
  },
  {
    icon: Activity,
    title: "Real-time Monitoring",
    description:
      "Live dashboard for all agent activity. Filter by agent, chain, action type, and risk level.",
  },
];

const protocols = [
  {
    name: "USDC",
    description: "Circle's stablecoin on Base & Ethereum",
    highlight: true,
  },
  {
    name: "x402",
    description: "HTTP-native micropayments protocol",
    highlight: false,
  },
  {
    name: "Google UCP",
    description: "Universal Checkout Protocol & A2A",
    highlight: false,
  },
  {
    name: "Stripe",
    description: "Agentic commerce & payment intents",
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-pattern absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center pb-16 pt-20 text-center md:pb-24 md:pt-32">
            {/* Announcement badges */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/20 bg-primary/5 px-3 py-1 text-primary"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Now open source on GitHub
              </Badge>
              <Badge
                variant="outline"
                className="gap-1.5 border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-400"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                USDC Native
              </Badge>
              <Badge
                variant="outline"
                className="gap-1.5 border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-400"
              >
                <Shield size={14} className="shrink-0" />
                GENIUS Act Ready
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Trust Layer for the{" "}
              <span className="gradient-text">Agent Economy</span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Compliance and audit infrastructure for agentic stablecoin and
              fiat transactions. Log actions, score trust, detect anomalies,
              and export audit trails — in five lines of code.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2 px-6" asChild>
                <a
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  View on GitHub
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 px-6" asChild>
                <Link href="/docs">
                  Read the Docs
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>

            {/* Install command */}
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 font-mono text-sm text-muted-foreground backdrop-blur-sm">
              <span className="text-primary">$</span>
              npm install kontext-sdk
            </div>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="relative border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4">
                Developer Experience
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Five lines to production-grade compliance
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Initialize the SDK, call <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">verify()</code> on
                every agent action, and you get a trust score, anomaly flags,
                and a complete audit trail. No infrastructure to manage.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Works with any agent framework",
                  "TypeScript-first with full type safety",
                  "Zero runtime dependencies",
                  "Under 10kb gzipped",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary shrink-0"
                    >
                      <path d="m9 12 2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glow rounded-xl">
              <CodeBlock
                code={heroCode}
                language="typescript"
                filename="agent.ts"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for agent compliance
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              A complete trust and compliance toolkit designed for developers
              building agentic workflows with stablecoins and fiat payments.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden transition-colors hover:border-primary/30"
              >
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon size={20} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Protocol Support */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Integrations
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Works with your stack
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              First-class support for the leading agent commerce protocols,
              stablecoin infrastructure, and fiat payment rails.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {protocols.map((protocol) => (
              <div
                key={protocol.name}
                className={`group relative flex flex-col items-center rounded-xl border p-8 text-center transition-colors ${
                  protocol.highlight
                    ? "border-blue-500/40 bg-blue-500/5 hover:border-blue-500/60 hover:bg-blue-500/10"
                    : "border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card"
                }`}
              >
                {protocol.highlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5 shadow-sm">
                      Primary Integration
                    </Badge>
                  </div>
                )}
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
                  protocol.highlight
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-primary/10 text-primary"
                }`}>
                  {protocol.name[0]}
                </div>
                <h3 className="text-lg font-semibold">{protocol.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {protocol.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GENIUS Act */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card p-8 sm:p-12 md:p-16">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Shield size={12} className="mr-1.5" />
                  Regulatory Readiness
                </Badge>
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Built for USDC
                </Badge>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Compliance-ready for the GENIUS Act
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                The GENIUS Act is reshaping stablecoin regulation in the United
                States. Kontext gives your agents the compliance infrastructure
                to operate confidently -- audit trails, transaction logging, and
                risk scoring that align with where regulation is heading.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Immutable audit trails for every USDC transaction",
                  "Trust scoring aligned with regulatory expectations",
                  "Exportable compliance reports (JSON, CSV, PDF)",
                  "Anomaly detection with configurable risk thresholds",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mt-0.5 shrink-0 text-amber-400"
                    >
                      <path d="m9 12 2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/docs">Get Started</Link>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <Link href="/faqs#compliance">
                    Compliance FAQs
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-amber-500/3 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials placeholder */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Community
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trusted by builders
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Join the developers building the next generation of compliant
              agentic commerce.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                quote:
                  "Kontext made it trivial to add compliance to our payment agents. The trust scoring API is exactly what we needed.",
                author: "Coming soon",
                role: "Early adopter testimonials",
              },
              {
                quote:
                  "We went from zero audit trail to full compliance reporting in under an hour. The DX is phenomenal.",
                author: "Coming soon",
                role: "Early adopter testimonials",
              },
              {
                quote:
                  "Finally, a compliance SDK that doesn't feel like it was built by lawyers. Developer-first approach is refreshing.",
                author: "Coming soon",
                role: "Early adopter testimonials",
              },
            ].map((testimonial, i) => (
              <Card
                key={i}
                className="border-dashed border-border/30 bg-card/30"
              >
                <CardContent className="pt-6">
                  <p className="text-sm italic text-muted-foreground/70 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-4 border-t border-border/30 pt-4">
                    <p className="text-sm font-medium text-muted-foreground/50">
                      {testimonial.author}
                    </p>
                    <p className="text-xs text-muted-foreground/30">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start building with trust
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Add compliance to your agentic workflows in minutes. Open source,
              TypeScript-first, and ready for production.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2 px-6" asChild>
                <a
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  View on GitHub
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/docs">Read the Docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
