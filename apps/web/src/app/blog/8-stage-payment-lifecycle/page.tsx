import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "@/components/code-block";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Why Every Payment Needs 8 Stages",
  description:
    "From intent to reconciliation: the taxonomy that makes payment operations auditable, debuggable, and compliant.",
  openGraph: {
    title: "Why Every Payment Needs 8 Stages",
    description:
      "From intent to reconciliation: the taxonomy that makes payment operations auditable, debuggable, and compliant.",
    type: "article",
    publishedTime: "2026-03-06T00:00:00Z",
    authors: ["Kontext"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Why Every Payment Needs 8 Stages",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why Every Payment Needs 8 Stages",
    description:
      "From intent to reconciliation: the taxonomy that makes payment operations auditable, debuggable, and compliant.",
    images: ["/og-image.png"],
    creator: "@kontextverify",
  },
};

const blogPostJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Why Every Payment Needs 8 Stages",
  description:
    "From intent to reconciliation: the taxonomy that makes payment operations auditable, debuggable, and compliant.",
  datePublished: "2026-03-06T00:00:00Z",
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
  url: "https://getkontext.com/blog/8-stage-payment-lifecycle",
  mainEntityOfPage: "https://getkontext.com/blog/8-stage-payment-lifecycle",
};

/* JSON-LD uses a static constant defined above -- no user input, safe from XSS */

export default function EightStagePaymentLifecyclePost() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
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
          <time dateTime="2026-03-06">March 6, 2026</time>
          <span aria-hidden="true">&middot;</span>
          <span>10 min read</span>
        </div>
        <h1 className="mt-4 text-sm font-medium">
          Why Every Payment Needs 8 Stages
        </h1>
        <p className="mt-4 text-xs text-[var(--term-text-2)] leading-relaxed">
          Most payment systems track two states: pending and complete. In
          practice, a payment passes through eight distinct stages -- and the
          gap between &quot;transaction confirmed&quot; and &quot;recipient
          credited&quot; is where most operational pain lives. Here is the
          taxonomy we built to fix that.
        </p>
        <div className="mt-4 flex gap-2">
          <Badge variant="secondary">Engineering</Badge>
          <Badge variant="secondary">Architecture</Badge>
          <Badge variant="secondary">Compliance</Badge>
        </div>
      </header>

      <Separator className="my-8" />

      {/* Content */}
      <div className="prose-kontext">
        <h2>The two-state trap</h2>
        <p>
          Ask most payment systems what state a payment is in and you get one
          of two answers: it is pending or it is done. Maybe there is a
          &quot;failed&quot; state. If you are lucky, there is &quot;processing.&quot;
        </p>
        <p>
          This works fine when payments are simple: debit one account, credit
          another, done. But modern payment infrastructure is not simple.
          Stablecoin transfers cross chains. Bank rails take days. Provider APIs
          return intermediate statuses. Compliance checks run asynchronously.
          Recipients need to acknowledge receipt. And when something goes wrong
          at minute 47 of a 72-hour ACH settlement, &quot;pending&quot; does not
          tell anyone anything useful.
        </p>
        <p>
          We needed a model that captures what actually happens during a payment
          -- not just the start and end, but every meaningful transition in
          between. The result is an 8-stage lifecycle that maps to how payments
          work across on-chain, off-chain, and hybrid providers.
        </p>

        <h2>The eight stages</h2>

        {/* Visual stage flow */}
        <div className="my-8 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-[800px]">
            {[
              { name: "intent", label: "Intent" },
              { name: "authorize", label: "Authorize" },
              { name: "prepare", label: "Prepare" },
              { name: "transmit", label: "Transmit" },
              { name: "confirm", label: "Confirm" },
              { name: "credit", label: "Credit" },
              { name: "reconcile", label: "Reconcile" },
              { name: "retry", label: "Retry/Refund" },
            ].map((stage, i, arr) => (
              <div key={stage.name} className="flex items-center">
                <div className={`flex-shrink-0 border border-border bg-[var(--term-surface)] px-3 py-2 text-center ${i === 0 ? "rounded-l-lg" : ""} ${i === arr.length - 1 ? "rounded-r-lg" : ""}`}>
                  <div className="text-[10px] font-mono text-[var(--term-text-3)]">
                    {i + 1}
                  </div>
                  <div className="text-xs font-mono font-medium text-[var(--term-green)]">
                    {stage.label}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-shrink-0 w-4 flex items-center justify-center">
                    <ArrowRight size={12} className="text-[var(--term-text-3)]" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Every payment attempt progresses through these stages. Failures at
            any stage route to retry_or_refund.
          </p>
        </div>

        <h2>Stage 1: Intent</h2>
        <p>
          A payment begins when someone -- a user, an agent, a scheduled
          job -- declares the desire to move funds. The intent stage captures
          the who, what, where, and why before any money moves.
        </p>
        <p>
          In Kontext, <code>start()</code> creates a{" "}
          <code>PaymentAttempt</code> and records the first{" "}
          <code>StageEvent</code> with stage <code>intent</code>. The attempt
          object captures the archetype (payroll, remittance, treasury,
          micropayments), the settlement chain, sender and recipient references,
          and the execution surface.
        </p>

        <CodeBlock
          code={`import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'treasury-ops',
  environment: 'production',
});

const attempt = await ctx.start({
  workspaceRef: 'ws_acme',
  appRef: 'invoice-agent',
  archetype: 'invoicing',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { companyId: 'acme-corp', invoiceId: 'INV-2026-0847' },
  recipientRefs: { vendorId: 'vendor-cloudflare', address: '0xCf...99' },
  executionSurface: 'sdk',
});

// attempt.finalState === "pending"
// attempt.stageEvents[0].stage === "intent"
// attempt.stageEvents[0].status === "succeeded"`}
          language="typescript"
          filename="stage-1-intent.ts"
        />

        <p>
          Why separate intent from authorization? Because intent captures
          business context that compliance checks need. The archetype determines
          which policy applies. The sender and recipient references link the
          payment to business entities. Without this context, authorization is
          just an amount check.
        </p>

        <h2>Stage 2: Authorize</h2>
        <p>
          Authorization runs the payment through the policy engine. The engine
          evaluates rules based on the payment archetype: amount limits,
          sanctions screening (OFAC SDN list), blocked/allowed recipient lists,
          daily aggregate limits, and metadata requirements.
        </p>
        <p>
          The result is a <code>PaymentReceipt</code> with a decision:{" "}
          <code>allow</code>, <code>block</code>, <code>review</code>, or{" "}
          <code>collect_info</code>. Each decision is a stage event on the
          attempt. Each receipt includes a digest proof linking it to the full
          chain of prior authorizations.
        </p>

        <CodeBlock
          code={`const { attempt: authed, receipt } = await ctx.authorize(
  attempt.attemptId,
  {
    chain: 'base',
    token: 'USDC',
    amount: '12500',
    from: '0xAcme...abc',
    to: '0xCf...99',
    actorId: 'invoice-agent',
    metadata: { paymentType: 'invoicing' },
  },
);

// receipt.decision === "allow"
// receipt.checksRun:
//   [{ name: "amount-limit",       passed: true, severity: "high" },
//    { name: "sanctions-screening", passed: true, severity: "critical" },
//    { name: "daily-aggregate",     passed: true, severity: "high" }]
// receipt.digestProof.valid === true`}
          language="typescript"
          filename="stage-2-authorize.ts"
        />

        <p>
          <strong>Edge case: authorization blocks the payment.</strong> When the
          policy engine returns <code>block</code>, the stage event is recorded
          with <code>status: &quot;failed&quot;</code> and the attempt&apos;s{" "}
          <code>finalState</code> moves to <code>blocked</code>. The violations
          array on the receipt tells you exactly which rules were violated. No
          money moves. The attempt is a permanent record of what was tried and
          why it was stopped.
        </p>

        <h2>Stage 3: Prepare</h2>
        <p>
          Preparation is the work that happens between &quot;approved&quot; and
          &quot;submitted.&quot; For on-chain payments, this means nonce
          allocation, gas estimation, and transaction construction. For bank
          rails, it means formatting the ACH file or wire instruction. For
          Bridge or Circle, it means calling the provider&apos;s transfer setup
          API.
        </p>
        <p>
          The prepare stage is recorded using <code>record()</code>:
        </p>

        <CodeBlock
          code={`await ctx.record(attempt.attemptId, 'prepare', {
  status: 'succeeded',
  actorSide: 'internal',
  code: 'TX_PREPARED',
  message: 'Transaction constructed: nonce 42, gasLimit 21000',
  timestamp: new Date().toISOString(),
  payload: {
    nonce: 42,
    gasLimit: 21000,
    maxFeePerGas: '0.5 gwei',
    estimatedCost: '0.0000105 ETH',
  },
});`}
          language="typescript"
          filename="stage-3-prepare.ts"
        />

        <p>
          <strong>Edge case: gas estimation fails.</strong> If the network is
          congested and gas prices exceed your threshold, record a failed
          prepare event. The attempt stays in a state where you can retry
          preparation later without re-running authorization -- the compliance
          receipt is already on file.
        </p>

        <h2>Stage 4: Transmit</h2>
        <p>
          Transmit is the moment the payment leaves your system. The transaction
          is broadcast to the blockchain, submitted to the bank network, or sent
          to the provider API. The SDK provides a convenience method for this:
        </p>

        <CodeBlock
          code={`// broadcast() is a shorthand for recording a transmit event
await ctx.broadcast(
  attempt.attemptId,
  '0x7f3a...e91b',  // txHash
  'base',            // chain
);

// Equivalent to:
// await ctx.record(attempt.attemptId, 'transmit', {
//   status: 'succeeded',
//   actorSide: 'network',
//   code: 'TX_BROADCAST',
//   message: 'Transaction broadcast: 0x7f3a...e91b',
//   timestamp: new Date().toISOString(),
//   payload: { txHash: '0x7f3a...e91b', chain: 'base' },
// });`}
          language="typescript"
          filename="stage-4-transmit.ts"
        />

        <p>
          <strong>Edge case: transmit fails.</strong> The transaction is
          rejected by the mempool, the provider API returns an error, or the
          network is unreachable. This is one of the most common failure points
          in payment infrastructure. Use <code>fail()</code> to record the
          failure:
        </p>

        <CodeBlock
          code={`// Transaction rejected by mempool -- nonce too low
await ctx.fail(
  attempt.attemptId,
  'Transaction rejected: nonce too low (expected 43, got 42)',
  'transmit',
);

// attempt.finalState === "failed"
// The attempt now has a clear failure record at the transmit stage
// You can create a new attempt to retry`}
          language="typescript"
          filename="stage-4-transmit-failure.ts"
        />

        <h2>Stage 5: Confirm</h2>
        <p>
          Confirmation means different things on different rails. On-chain, it
          means the transaction has been included in a block and reached
          sufficient finality. For bank rails, it means the ACH batch has been
          accepted or the wire has been acknowledged. For provider APIs, it means
          the provider has confirmed processing.
        </p>

        <CodeBlock
          code={`await ctx.confirm(attempt.attemptId, {
  txHash: '0x7f3a...e91b',
  blockNumber: 18_293_741,
  confirmations: 12,
  chain: 'base',
});

// Stage event recorded:
// { stage: "confirm", status: "succeeded", code: "TX_CONFIRMED" }`}
          language="typescript"
          filename="stage-5-confirm.ts"
        />

        <p>
          <strong>Edge case: confirmation never arrives.</strong> The transaction
          was broadcast but never confirmed -- it was dropped from the mempool,
          or the block was reorganized. This is the &quot;stuck in pending&quot;
          state that drives ops teams to monitor dashboards at 2 AM. With the
          8-stage model, you can see exactly where the payment stalled: there is
          a transmit event but no confirm event. Your monitoring can alert
          specifically on &quot;transmitted but unconfirmed after N minutes&quot;
          rather than the generic &quot;payment pending.&quot;
        </p>

        <h2>Stage 6: Recipient credit</h2>
        <p>
          This is the stage most payment systems skip entirely, and it is where
          the most insidious bugs hide. A transaction can be confirmed on-chain
          but the recipient might not have received usable funds. The token
          contract might have a transfer fee. The recipient wallet might not
          support the token. The cross-chain bridge might have a secondary
          settlement delay.
        </p>
        <p>
          <code>credit()</code> records evidence that the recipient actually
          received the funds:
        </p>

        <CodeBlock
          code={`await ctx.credit(attempt.attemptId, {
  confirmedAt: new Date().toISOString(),
  providerRef: 'circle-transfer-id-abc123',
});

// Stage event recorded:
// { stage: "recipient_credit", status: "succeeded",
//   actorSide: "recipient", code: "CREDITED" }`}
          language="typescript"
          filename="stage-6-credit.ts"
        />

        <p>
          <strong>Edge case: recipient credit times out.</strong> You confirmed
          the transaction on-chain but the recipient&apos;s provider has not
          acknowledged receipt. For CCTP cross-chain transfers, the burn
          transaction on the source chain can confirm while the mint on the
          destination chain has not executed yet. The 8-stage model makes this
          gap visible: you have a confirm event but no recipient_credit event.
          Your ops team can investigate the gap rather than assuming the payment
          is complete.
        </p>

        <h2>Stage 7: Reconcile</h2>
        <p>
          Reconciliation matches the payment against your internal records.
          Did the invoice get marked as paid? Did the ledger entry get
          created? Did the ERP system acknowledge the disbursement? This is
          recorded as a generic stage event:
        </p>

        <CodeBlock
          code={`await ctx.record(attempt.attemptId, 'reconcile', {
  status: 'succeeded',
  actorSide: 'internal',
  code: 'RECONCILED',
  message: 'Matched to invoice INV-2026-0847, ledger entry LE-9921',
  timestamp: new Date().toISOString(),
  payload: {
    invoiceId: 'INV-2026-0847',
    ledgerEntryId: 'LE-9921',
    reconciledAmount: '12500',
    variance: '0',
  },
});`}
          language="typescript"
          filename="stage-7-reconcile.ts"
        />

        <p>
          Reconciliation is where payment data meets business data. Without
          this stage, your payment system knows that $12,500 USDC moved from
          address A to address B, but your accounting system has to separately
          figure out that this was for invoice INV-2026-0847. The reconcile
          event links these two worlds.
        </p>

        <h2>Stage 8: Retry or refund</h2>
        <p>
          Failures can happen at any stage. The policy engine blocks the payment.
          Gas estimation fails. The transaction is dropped from the mempool.
          Confirmation times out. The recipient credit never arrives. Each
          failure needs a different response: retry with higher gas, resubmit
          with a new nonce, or initiate a refund.
        </p>

        <CodeBlock
          code={`// Scenario: transmit failed, initiate a refund
await ctx.refund(attempt.attemptId, {
  reason: 'Transaction failed after 3 retry attempts. Gas price exceeded threshold.',
  refundTxHash: '0xrefund...abc',
  refundedAt: new Date().toISOString(),
});

// attempt.finalState === "refunded"
// Full audit trail shows:
//   intent -> authorize (allow) -> prepare -> transmit (failed)
//   -> retry_or_refund (refunded)`}
          language="typescript"
          filename="stage-8-refund.ts"
        />

        <p>
          The retry_or_refund stage does not distinguish between retries and
          refunds at the type level -- both are recorded as events on the same
          stage. The <code>code</code> field (<code>REFUNDED</code>,{" "}
          <code>RETRIED</code>, <code>RETRY_EXHAUSTED</code>) disambiguates.
          This keeps the stage model clean while preserving full operational
          detail.
        </p>

        <h2>The complete picture</h2>
        <p>
          Here is what a complete, successful payment looks like as a sequence of
          stage events on a single <code>PaymentAttempt</code>:
        </p>

        <CodeBlock
          code={`const attempt = await ctx.get(attemptId);

for (const event of attempt.stageEvents) {
  console.log(
    \`[\${event.timestamp}] \${event.stage} | \${event.status} | \${event.code}\`
  );
}

// Output:
// [2026-03-06T10:00:01Z] intent           | succeeded | INTENT_CREATED
// [2026-03-06T10:00:02Z] authorize        | succeeded | AUTHORIZED
// [2026-03-06T10:00:03Z] prepare          | succeeded | TX_PREPARED
// [2026-03-06T10:00:04Z] transmit         | succeeded | TX_BROADCAST
// [2026-03-06T10:00:19Z] confirm          | succeeded | TX_CONFIRMED
// [2026-03-06T10:00:22Z] recipient_credit | succeeded | CREDITED
// [2026-03-06T10:01:05Z] reconcile        | succeeded | RECONCILED

console.log(attempt.finalState); // "succeeded"`}
          language="typescript"
          filename="complete-lifecycle.ts"
        />

        <h2>Why eight and not fewer</h2>
        <p>
          We considered simpler models. Three stages (request, execute,
          settle) felt too coarse -- you lose the distinction between
          authorization and preparation, and between confirmation and
          crediting. Five stages (intent, approve, submit, confirm, settle)
          was closer, but it still collapsed preparation with submission and
          did not account for the reconciliation gap.
        </p>
        <p>
          Eight stages is the minimum set that accurately represents what
          happens across on-chain transfers (EVM, Solana), provider-mediated
          payments (Circle, Bridge), and bank rails (ACH, wire via Modern
          Treasury). Every stage maps to a real operational boundary where
          something can fail and where someone needs visibility.
        </p>

        <h2>Why this matters for compliance</h2>
        <p>
          Regulators do not ask &quot;did the payment succeed?&quot; They ask:
        </p>
        <ul>
          <li>What compliance checks ran before funds were released?</li>
          <li>Who authorized the payment and on what basis?</li>
          <li>When exactly was the transaction submitted to the network?</li>
          <li>Can you prove the recipient received the funds?</li>
          <li>Was the payment reconciled against the original invoice?</li>
        </ul>
        <p>
          Each question maps to a specific stage. The authorization receipt
          answers questions about compliance checks. The confirm and
          recipient_credit events answer questions about settlement. The
          reconcile event answers questions about business-record matching.
          Without this granularity, you are reconstructing the timeline from
          logs after the fact.
        </p>

        <h2>Querying attempts</h2>
        <p>
          The SDK provides filtering to query attempts by archetype, chain,
          final state, or time range:
        </p>

        <CodeBlock
          code={`// Find all failed payroll payments in the last 24 hours
const failed = ctx.list({
  archetype: 'payroll',
  finalState: 'failed',
  since: new Date(Date.now() - 86_400_000).toISOString(),
});

// Find all blocked payments (policy violations)
const blocked = ctx.list({ finalState: 'blocked' });

// Find all payments on a specific chain
const baseTx = ctx.list({ chain: 'base' });`}
          language="typescript"
          filename="query-attempts.ts"
        />

        <h2>Getting started</h2>
        <p>
          Install the SDK and start modeling payments as lifecycles:
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
          includes the full stage event reference, policy engine configuration,
          and provider adapter guides. Read the{" "}
          <Link
            href="/blog/payment-control-plane"
            className="text-primary hover:underline"
          >
            companion post
          </Link>{" "}
          for the broader context on why we built the payment control plane.
        </p>
        <p>
          Payments are processes, not events. Model them accordingly.
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
