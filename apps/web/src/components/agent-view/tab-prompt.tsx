"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { TerminalChrome } from "./terminal-chrome";

const prompt = `Add Kontext compliance evidence logging to this project. Kontext is a zero-dependency
TypeScript SDK that wraps payments — stablecoin, ACH, wire, card, and SEPA — with
OFAC screening, audit trails, and tamper-evident digest chains.

Steps:
1. Run: npm install kontext-sdk
2. Find where this project sends or initiates payments. Look for:
   - Stablecoin: ethers/viem sendTransaction, USDC approve+transfer, Circle SDK
   - ACH/Wire: bank transfer APIs, treasury management calls, Plaid, Dwolla
   - Card: Stripe charges, Adyen payments, payment gateway calls
   - SEPA: EU bank transfer APIs, payment service providers
   - x402: HTTP 402 responses with payment-required headers
3. Ask me:
   - What is your project name? (used as projectId)
   - Which payment rails? (stablecoin, ach, wire, card, sepa)
   - Which chain for stablecoin? (base, arc, ethereum, polygon, etc.)
4. Import and initialize at the entry point:
   import { Kontext } from 'kontext-sdk';
   const ctx = Kontext.init({
     projectId: '<answer>',
     environment: 'production',
   });
5. Wrap each payment with ctx.verify():
   // Stablecoin payment
   const result = await ctx.verify({
     txHash: tx.hash,
     rail: 'stablecoin',
     chain: '<answer>',
     amount: String(amountInUSDC),
     currency: 'USDC',
     from: senderAddress,
     to: recipientAddress,
     initiator: { id: '<agent-or-user-id>', type: 'agent' },
   });

   // ACH payment
   const result = await ctx.verify({
     txRef: achReference,
     rail: 'ach',
     amount: String(amount),
     currency: 'USD',
     from: { account: senderAccount },
     to: { account: recipientAccount },
     initiator: { id: '<user-id>', type: 'human' },
   });

   if (!result.compliant) {
     throw new Error(\`Blocked: \${result.recommendations.join(', ')}\`);
   }
6. Add cleanup: await ctx.destroy()

Docs: https://getkontext.com/docs
Evidence trails for stablecoin, ACH, wire, card, and SEPA payments.
Zero runtime dependencies.`;

export function TabPrompt() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <TerminalChrome title="copy-paste prompt for Claude Code / Codex CLI / Cursor">
        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute right-0 top-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[var(--ic-text-dim)] hover:text-[var(--ic-accent)] bg-[var(--ic-surface-2)] hover:bg-[var(--ic-surface-3)] transition-colors"
          >
            {copied ? (
              <>
                <Check size={12} /> Copied
              </>
            ) : (
              <>
                <Copy size={12} /> Copy
              </>
            )}
          </button>
          <pre className="text-xs text-[var(--ic-text-muted)] leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap pr-20">
            {prompt}
          </pre>
        </div>
      </TerminalChrome>

      {/* What happens when pasted */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ic-text-dim)]">
        {[
          "paste",
          "detect stack",
          "ask 3 questions",
          "wrap payments",
          "done (~2 min)",
        ].map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            <span className="text-[var(--ic-text-muted)]">{step}</span>
            {i < 4 && <span className="text-[var(--ic-accent)]">&rarr;</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
