"use client";

import { TerminalChrome } from "./terminal-chrome";

const stages = [
  {
    num: 1,
    name: "intent",
    method: "start()",
    description: "Payment attempt created. Workspace profile and archetype selected.",
    code: `const attempt = await ctx.start({
  workspaceRef: 'acme-treasury',
  appRef: 'treasury-agent',
  archetype: 'treasury',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xSender' },
  recipientRefs: { wallet: '0xRecipient' },
  executionSurface: 'sdk',
});`,
  },
  {
    num: 2,
    name: "authorize",
    method: "authorize()",
    description: "Policy engine runs OFAC screening, amount limits, blocklists. Returns allow/block/review.",
    code: `const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base', token: 'USDC', amount: '5000',
  from: '0xSender', to: '0xRecipient',
  actorId: 'treasury-agent',
});
// receipt.decision = 'allow' | 'block' | 'review'`,
  },
  {
    num: 3,
    name: "prepare",
    method: "record()",
    description: "Pre-transmission preparation. Build and sign the transaction.",
    code: `await ctx.record(attempt.attemptId, 'prepare', {
  signedTx: '0x...',
  gasEstimate: '21000',
});`,
  },
  {
    num: 4,
    name: "transmit",
    method: "broadcast()",
    description: "Transaction submitted to the network. Waiting for confirmation.",
    code: `await ctx.broadcast(attempt.attemptId, txHash, 'base');`,
  },
  {
    num: 5,
    name: "confirm",
    method: "confirm()",
    description: "On-chain confirmation received. Block number and confirmations recorded.",
    code: `await ctx.confirm(attempt.attemptId, {
  txHash: '0xe4f7a2c9...',
  blockNumber: 28491037,
});`,
  },
  {
    num: 6,
    name: "recipient_credit",
    method: "credit()",
    description: "Recipient balance credited. Settlement verified.",
    code: `await ctx.credit(attempt.attemptId, {
  creditedAt: new Date().toISOString(),
});`,
  },
  {
    num: 7,
    name: "reconcile",
    method: "record()",
    description: "Internal reconciliation. Match against expected amounts and accounts.",
    code: `await ctx.record(attempt.attemptId, 'reconcile', {
  matched: true,
  reconciledAmount: '5000',
});`,
  },
  {
    num: 8,
    name: "retry_or_refund",
    method: "fail() / refund()",
    description: "Handle failures. Retry the payment or initiate a refund.",
    code: `// On failure:
await ctx.fail(attempt.attemptId, 'insufficient_funds');

// Or refund:
await ctx.refund(attempt.attemptId, {
  reason: 'customer_request',
  refundTxHash: '0x...',
});`,
  },
];

export function TabLifecycle() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--term-text-2)]">
        Every payment follows 8 stages. Each stage is logged with a tamper-evident digest.
      </p>

      <div className="space-y-3">
        {stages.map((stage) => (
          <details key={stage.name} open={stage.num <= 2}>
            <summary className="flex items-center gap-3 py-2 cursor-pointer hover:text-[var(--term-green)]">
              <span className="text-[var(--term-green)] font-bold text-sm w-5 text-center">
                {stage.num}
              </span>
              <span className="text-sm font-medium text-foreground">
                {stage.name}
              </span>
              <span className="text-xs text-[var(--term-text-3)]">
                {stage.method}
              </span>
            </summary>
            <div className="pl-8 pb-3">
              <p className="text-xs text-[var(--term-text-2)] mb-2">
                {stage.description}
              </p>
              <TerminalChrome title={`stage-${stage.num}.ts`}>
                <pre className="text-xs leading-relaxed overflow-x-auto">
                  <code>{stage.code}</code>
                </pre>
              </TerminalChrome>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
