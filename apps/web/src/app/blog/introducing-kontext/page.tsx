import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "@/components/code-block";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Introducing Kontext: Trust Layer for Agentic Stablecoin Transactions",
  description:
    "AI agents are moving real money. Here is why they need a compliance layer, and how Kontext provides it in five lines of code.",
  openGraph: {
    title:
      "Introducing Kontext: Trust Layer for Agentic Stablecoin Transactions",
    description:
      "AI agents are moving real money. Here is why they need a compliance layer, and how Kontext provides it in five lines of code.",
    type: "article",
    publishedTime: "2026-02-07T00:00:00Z",
    authors: ["Kontext"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Introducing Kontext",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Introducing Kontext: Trust Layer for Agentic Stablecoin Transactions",
    description:
      "AI agents are moving real money. Here is why they need a compliance layer.",
    images: ["/og-image.png"],
    creator: "@kontextverify",
  },
};

export default function IntroducingKontextPost() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to blog
      </Link>

      {/* Header */}
      <header className="mb-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <time dateTime="2026-02-07">February 7, 2026</time>
          <span aria-hidden="true">&middot;</span>
          <span>6 min read</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Introducing Kontext: Trust Layer for Agentic Stablecoin Transactions
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          AI agents are moving real money. They are paying vendors, settling
          invoices, and executing trades autonomously. But who is watching the
          agents? Today we are open-sourcing Kontext -- a compliance and trust
          SDK built for the agent economy.
        </p>
        <div className="mt-4 flex gap-2">
          <Badge variant="secondary">Launch</Badge>
          <Badge variant="secondary">GENIUS Act</Badge>
          <Badge variant="secondary">USDC</Badge>
        </div>
      </header>

      <Separator className="my-8" />

      {/* Content */}
      <div className="prose-kontext">
        <h2>The agent economy is here</h2>
        <p>
          In the past twelve months, we have watched the agent economy go from
          demo to production. Companies are deploying AI agents to handle
          procurement, treasury management, vendor payments, and customer
          refunds. These agents are not just making recommendations -- they are
          executing transactions.
        </p>
        <p>
          The dollar amounts are not trivial. Agents are moving thousands,
          sometimes millions, through stablecoins like USDC on Base and
          Ethereum. New protocols like x402 enable HTTP-native micropayments.
          Google&apos;s UCP and A2A protocols formalize agent-to-agent commerce.
          Stripe is adding agentic commerce capabilities.
        </p>
        <p>
          The infrastructure for agents to <em>move</em> money is maturing
          fast. The infrastructure for agents to move money <em>safely</em> has
          not kept up.
        </p>

        <h2>The trust gap</h2>
        <p>
          When a human employee processes a $10,000 payment, there is an
          approval chain. There is a paper trail. Someone reviews the invoice,
          someone approves the payment, and someone can audit the whole thing
          after the fact. These processes exist because we have learned, over
          centuries of commerce, that moving money requires trust
          infrastructure.
        </p>
        <p>
          When an AI agent does the same thing? In most deployments today, the
          answer is: console logs. Maybe a webhook to Slack. Perhaps a database
          entry if the team was thorough.
        </p>
        <p>
          This is not going to work as agents handle more money with more
          autonomy. The regulatory environment is also evolving -- the GENIUS
          Act in the United States is creating new compliance requirements for
          stablecoin transactions. Teams need real infrastructure, not
          afterthoughts.
        </p>

        <h2>What Kontext does</h2>
        <p>
          Kontext is a TypeScript SDK that provides compliance and trust
          infrastructure for agentic workflows. It sits between your agents and
          the actions they take, providing:
        </p>
        <ul>
          <li>
            <strong>Action logging</strong> -- an immutable audit trail for
            every agent action, with full context and metadata
          </li>
          <li>
            <strong>Trust scoring</strong> -- real-time trust scores computed
            from agent history, transaction patterns, and context
          </li>
          <li>
            <strong>Anomaly detection</strong> -- configurable rules that
            automatically flag unusual patterns (velocity, amounts, behavior)
          </li>
          <li>
            <strong>Task confirmation</strong> -- human-in-the-loop approval
            for high-value or sensitive actions
          </li>
          <li>
            <strong>Audit export</strong> -- compliance-ready reports in JSON,
            CSV, or PDF format
          </li>
        </ul>
        <p>
          All of this works in five lines of code:
        </p>

        <CodeBlock
          code={`import { Kontext } from 'kontext-sdk';

const ctx = new Kontext({ chain: 'base' });

const result = await ctx.verify({
  action: 'transfer',
  amount: '5000.00',
  currency: 'USDC',
  agent: 'payment-agent-v2',
});

// result.trustScore  -> 0.94
// result.flagged     -> false
// result.auditId     -> 'aud_abc123'`}
          language="typescript"
          filename="agent.ts"
        />

        <h2>Built for the GENIUS Act era</h2>
        <p>
          The Guiding and Establishing National Innovation for U.S. Stablecoins
          Act is reshaping how stablecoin transactions are regulated. While the
          full implications are still being worked out, the direction is clear:
          stablecoin transactions will require better tracking, reporting, and
          compliance infrastructure.
        </p>
        <p>
          Kontext does not replace your legal or compliance team. What it does
          is give your engineering team the tools to build compliance into your
          agent architecture from day one, rather than bolting it on later when
          a regulator comes knocking.
        </p>
        <p>
          Transaction logging, audit trails, anomaly detection, and trust
          scoring -- these are the building blocks of regulatory compliance for
          the agent economy. Kontext provides all of them through a clean,
          developer-friendly API.
        </p>

        <h2>First-class protocol support</h2>
        <p>
          Kontext includes integration guides and optimized paths for the
          protocols driving agentic commerce:
        </p>
        <ul>
          <li>
            <strong>USDC on Base and Ethereum</strong> -- verify transfers
            before execution, log results after confirmation
          </li>
          <li>
            <strong>x402 Protocol</strong> -- middleware for HTTP-native payment
            verification
          </li>
          <li>
            <strong>Google UCP / A2A</strong> -- trust scoring for
            agent-to-agent transactions
          </li>
          <li>
            <strong>Stripe Agentic Commerce</strong> -- verify agent payments
            with audit IDs attached to Stripe metadata
          </li>
        </ul>

        <h2>Open source, with a Pro tier</h2>
        <p>
          The core Kontext SDK is open source under the MIT license. This
          includes action logging, basic anomaly detection, local audit export,
          and single-chain support. You can run it entirely self-hosted with no
          usage limits and no API key required.
        </p>
        <p>
          For teams that need more, Kontext Pro ($99/month) adds a cloud
          dashboard, ML-powered anomaly detection, historical trust scoring,
          compliance report templates, multi-chain support, and email support.
          Enterprise plans are available for organizations with custom
          compliance requirements.
        </p>

        <h2>Getting started</h2>
        <p>
          Install the SDK and add compliance to your first agent in under five
          minutes:
        </p>

        <CodeBlock
          code={`npm install kontext-sdk`}
          language="bash"
          filename="Terminal"
        />

        <p>
          Then check out the{" "}
          <Link href="/docs" className="text-primary hover:underline">
            documentation
          </Link>{" "}
          for the full quick start guide, API reference, and integration
          examples.
        </p>

        <h2>What comes next</h2>
        <p>
          This is day one. The SDK is stable enough for production use, but
          there is a lot more coming:
        </p>
        <ul>
          <li>Cloud dashboard for Pro users (coming in weeks, not months)</li>
          <li>ML-powered anomaly detection models trained on agent patterns</li>
          <li>Pre-built compliance templates for common regulatory frameworks</li>
          <li>More chain support beyond EVM</li>
          <li>Webhook integrations for real-time alerting</li>
        </ul>
        <p>
          If you are building with agentic commerce — stablecoins or fiat — I would
          love to hear from you. Star the repo, open an issue, or reach out on
          X. Let us build the trust layer for the agent economy together.
        </p>
      </div>

      <Separator className="my-12" />

      {/* Bottom CTAs */}
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <Button size="lg" className="gap-2" asChild>
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
        <Button variant="outline" size="lg" className="gap-2" asChild>
          <Link href="/docs">
            Read the Docs
            <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    </article>
  );
}
