import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "@/components/code-block";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Introducing the Kontext Payment Control Plane",
  description:
    "We rebuilt Kontext from a compliance logging SDK into a full payment lifecycle manager. Here is why.",
  openGraph: {
    title: "Introducing the Kontext Payment Control Plane",
    description:
      "We rebuilt Kontext from a compliance logging SDK into a full payment lifecycle manager. Here is why.",
    type: "article",
    publishedTime: "2026-03-08T00:00:00Z",
    authors: ["Kontext"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Introducing the Kontext Payment Control Plane",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Introducing the Kontext Payment Control Plane",
    description:
      "We rebuilt Kontext from a compliance logging SDK into a full payment lifecycle manager.",
    images: ["/og-image.png"],
    creator: "@kontextverify",
  },
};

const blogPostJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Introducing the Kontext Payment Control Plane",
  description:
    "We rebuilt Kontext from a compliance logging SDK into a full payment lifecycle manager. Here is why.",
  datePublished: "2026-03-08T00:00:00Z",
  author: {
    "@type": "Organization",
    name: "Kontext",
    url: "https://getkontext.com",
  },
  publisher: {
    "@type": "Organization",
    name: "Kontext",
    url: "https://getkontext.com",
    logo: {
      "@type": "ImageObject",
      url: "https://getkontext.com/og-image.png",
    },
  },
  image: "https://getkontext.com/og-image.png",
  url: "https://getkontext.com/blog/payment-control-plane",
  mainEntityOfPage: "https://getkontext.com/blog/payment-control-plane",
};

export default function PaymentControlPlanePost() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* JSON-LD structured data — static constant, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostJsonLd) }}
      />
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
          <time dateTime="2026-03-08">March 8, 2026</time>
          <span aria-hidden="true">&middot;</span>
          <span>7 min read</span>
        </div>
        <h1 className="mt-4 text-sm font-medium">
          Introducing the Kontext Payment Control Plane
        </h1>
        <p className="mt-4 text-xs text-[var(--term-text-2)] leading-relaxed">
          Compliance logging was a good starting point. But the developers we
          talked to did not need another logger -- they needed a system that
          understands what a payment <em>is</em>, where it is in its lifecycle,
          and what should happen next. So we rebuilt Kontext from the ground up.
        </p>
        <div className="mt-4 flex gap-2">
          <Badge variant="secondary">Launch</Badge>
          <Badge variant="secondary">Payment Lifecycle</Badge>
          <Badge variant="secondary">SDK</Badge>
        </div>
      </header>

      <Separator className="my-8" />

      {/* Content */}
      <div className="prose-kontext">
        <h2>Why we pivoted</h2>
        <p>
          Kontext v0.4 shipped as a compliance logging SDK. You called{" "}
          <code>verify()</code>, it ran OFAC checks and appended the result to a
          tamper-evident digest chain. It worked. But it solved a narrow slice of
          what developers actually deal with when they move money
          programmatically.
        </p>
        <p>
          Every conversation with a developer building on Circle, Bridge, or
          Modern Treasury surfaced the same pattern: compliance is one stage in a
          much larger lifecycle. Before compliance runs, there is intent capture.
          After compliance passes, there is transmission, confirmation, crediting,
          and reconciliation. When something fails, there is retry logic and
          refund handling. Compliance logging alone does not give you visibility
          into any of that.
        </p>
        <p>
          The insight was simple: <strong>payments are not events, they are
          processes.</strong> A single payment touches multiple actors (sender,
          recipient, network, provider), transitions through multiple states, and
          can fail at any point. Treating a payment as a single log entry loses
          all of that structure.
        </p>

        <h2>The payment control plane</h2>
        <p>
          Kontext is now a payment control plane. Instead of logging transactions
          after the fact, it manages the full lifecycle of every payment attempt
          from intent to reconciliation. The SDK gives you an 8-stage model that
          maps to how payments actually work:
        </p>
        <ol>
          <li>
            <strong>Intent</strong> -- the sender or system declares the desire
            to move funds
          </li>
          <li>
            <strong>Authorize</strong> -- policy checks, sanctions screening,
            amount limits, and compliance rules run against the intent
          </li>
          <li>
            <strong>Prepare</strong> -- nonce allocation, gas estimation, fee
            calculation, and provider setup
          </li>
          <li>
            <strong>Transmit</strong> -- the transaction is broadcast to the
            network or submitted to the provider
          </li>
          <li>
            <strong>Confirm</strong> -- on-chain confirmation, block finality, or
            provider acknowledgment
          </li>
          <li>
            <strong>Recipient credit</strong> -- verification that the recipient
            actually received the funds
          </li>
          <li>
            <strong>Reconcile</strong> -- matching the payment against internal
            records, invoices, or accounting systems
          </li>
          <li>
            <strong>Retry or refund</strong> -- handling failures at any prior
            stage with automated retry or refund initiation
          </li>
        </ol>
        <p>
          Every stage produces a <code>StageEvent</code> with a status, actor,
          code, message, and timestamp. The full history lives on the{" "}
          <code>PaymentAttempt</code> object -- a single, queryable record of
          everything that happened.
        </p>

        <h2>Starting a payment</h2>
        <p>
          The SDK exposes a clean, imperative API. You call{" "}
          <code>start()</code> to create a payment attempt, then drive it through
          stages using <code>authorize()</code>, <code>broadcast()</code>,{" "}
          <code>confirm()</code>, and so on.
        </p>

        <CodeBlock
          code={`import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'treasury-ops',
  environment: 'production',
});

// 1. Start a payment attempt
const attempt = await ctx.start({
  workspaceRef: 'ws_acme',
  appRef: 'payroll-agent',
  archetype: 'payroll',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { employerId: 'acme-corp' },
  recipientRefs: { employeeId: 'emp-0042' },
  executionSurface: 'sdk',
});

console.log(attempt.attemptId);   // "att_k7x9..."
console.log(attempt.finalState);  // "pending"`}
          language="typescript"
          filename="start-payment.ts"
        />

        <h2>Authorization and the policy engine</h2>
        <p>
          After starting, call <code>authorize()</code> to run the payment
          through the policy engine. The engine evaluates amount limits,
          sanctions screening, blocked/allowed recipient lists, and
          archetype-specific metadata requirements. It returns a receipt with a
          decision: <code>allow</code>, <code>block</code>,{" "}
          <code>review</code>, or <code>collect_info</code>.
        </p>

        <CodeBlock
          code={`// 2. Authorize against policy engine
const { attempt: authed, receipt } = await ctx.authorize(
  attempt.attemptId,
  {
    chain: 'base',
    token: 'USDC',
    amount: '4500',
    from: '0xSender...abc',
    to: '0xRecipient...def',
    actorId: 'payroll-agent',
    metadata: { paymentType: 'payroll' },
  },
);

console.log(receipt.decision);     // "allow"
console.log(receipt.allowed);      // true
console.log(receipt.checksRun);    // [{ name: "amount-limit", passed: true, ... }]
console.log(receipt.digestProof);  // { terminalDigest: "a3f2...", valid: true }

if (!receipt.allowed) {
  console.log(receipt.violations);
  // Handle block or review decision
}`}
          language="typescript"
          filename="authorize-payment.ts"
        />

        <p>
          The receipt includes a digest proof -- every authorization is
          cryptographically chained to every prior authorization. The tamper-
          evident audit trail that Kontext v0.4 introduced is still there, now
          built into the lifecycle rather than bolted on.
        </p>

        <h2>Workspace profiles</h2>
        <p>
          Different payment types need different policies. A $50 micropayment
          should not trigger the same review thresholds as a $50,000 treasury
          transfer. Workspace profiles let you configure policies per archetype:
        </p>

        <CodeBlock
          code={`const profile = ctx.profile();

// Profile includes per-archetype policies:
// profile.policies.payroll     -> maxTx: $25K, daily: $100K
// profile.policies.treasury    -> maxTx: $100K, daily: $500K
// profile.policies.micropayments -> maxTx: $100, daily: $10K

// Override with your own configuration
ctx.configure({
  ...profile,
  policyPosture: 'enforce',   // "monitor" for shadow mode
  chains: ['base', 'ethereum'],
  notifications: {
    slack: { webhookUrl: 'https://hooks.slack.com/...' },
    triggers: ['block', 'review', 'refund_required'],
  },
});`}
          language="typescript"
          filename="workspace-profile.ts"
        />

        <p>
          The <code>policyPosture</code> field supports two modes:{" "}
          <code>enforce</code> (block payments that violate policy) and{" "}
          <code>monitor</code> (log violations but allow payments through). Start
          in monitor mode to see what your policies would catch, then switch to
          enforce when you are confident in the rules.
        </p>

        <h2>Provider adapters</h2>
        <p>
          The payment control plane is provider-agnostic. The SDK ships with
          adapters for the payment providers developers actually use:
        </p>
        <ul>
          <li>
            <strong>EVM</strong> -- direct on-chain transactions via any
            JSON-RPC provider (Alchemy, Infura, public endpoints)
          </li>
          <li>
            <strong>Solana</strong> -- SPL token transfers with Solana-native
            confirmation tracking
          </li>
          <li>
            <strong>Circle</strong> -- Circle Programmable Wallets and CCTP
            cross-chain transfers
          </li>
          <li>
            <strong>Bridge</strong> -- Bridge.xyz (Stripe) orchestrated transfers
            with built-in compliance
          </li>
          <li>
            <strong>Modern Treasury</strong> -- bank-rail payments (ACH, wire,
            RTP) with ledger integration
          </li>
          <li>
            <strong>x402</strong> -- HTTP-native micropayments for agent-to-agent
            commerce
          </li>
        </ul>
        <p>
          Each adapter maps provider-specific events into the 8-stage model. A
          Circle CCTP transfer and an ACH wire through Modern Treasury both
          produce the same <code>PaymentAttempt</code> structure. Your ops team
          gets a unified view regardless of how funds move.
        </p>

        <h2>What we kept from v0.4</h2>
        <p>
          The pivot was not a teardown. The core primitives that made Kontext
          v0.4 valuable are still here, now integrated into the lifecycle:
        </p>
        <ul>
          <li>
            <strong>Digest chain</strong> -- every authorization receipt is
            cryptographically chained, providing tamper-evident proof of what was
            checked and when
          </li>
          <li>
            <strong>Policy engine</strong> -- OFAC screening, amount limits,
            blocked/allowed lists, and metadata requirements, now evaluated
            during the authorize stage rather than as a standalone call
          </li>
          <li>
            <strong>File and memory storage</strong> -- the same{" "}
            <code>FileStorage</code> and <code>MemoryStorage</code> adapters
            persist attempts and receipts locally
          </li>
        </ul>

        <h2>What is new</h2>
        <ul>
          <li>
            <strong>8-stage lifecycle</strong> -- every payment is a structured
            process, not a log entry
          </li>
          <li>
            <strong>Stage events</strong> -- granular, timestamped records of
            what happened at each stage, who did it, and whether it succeeded
          </li>
          <li>
            <strong>Workspace profiles</strong> -- per-archetype policy
            configuration with monitor and enforce modes
          </li>
          <li>
            <strong>Provider adapters</strong> -- EVM, Solana, Circle, Bridge,
            Modern Treasury, and x402 out of the box
          </li>
          <li>
            <strong>Ops notifications</strong> -- Slack and email alerts on
            block, review, and refund triggers
          </li>
          <li>
            <strong>Payment archetypes</strong> -- payroll, remittance,
            invoicing, treasury, and micropayments, each with sensible policy
            defaults
          </li>
        </ul>

        <h2>Getting started</h2>
        <p>
          Install the SDK and start managing payment lifecycles:
        </p>

        <CodeBlock
          code={`npm install kontext-sdk`}
          language="bash"
          filename="Terminal"
        />

        <p>
          The{" "}
          <Link href="/docs" className="text-primary hover:underline">
            documentation
          </Link>{" "}
          covers the full API reference, workspace profile configuration,
          provider adapter setup, and migration guide from v0.4.
        </p>

        <p>
          If you are building payment infrastructure -- stablecoins, bank rails,
          or agent-to-agent commerce -- the control plane is the layer you have
          been assembling by hand. Kontext packages it into an SDK.
        </p>
        <p className="mt-8 font-medium">-- The Kontext Team</p>
      </div>

      <Separator className="my-12" />

      {/* Bottom CTAs */}
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <Button size="lg" className="gap-2" asChild>
          <a
            href="https://github.com/Legaci-Labs/kontext"
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
