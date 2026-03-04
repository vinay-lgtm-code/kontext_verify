"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { TerminalChrome } from "./terminal-chrome";

const prompt = `Add Kontext compliance logging to this project. Kontext is a zero-dependency
TypeScript SDK that wraps USDC payments with OFAC screening, audit trails,
and tamper-evident digest chains. Built for x402, Circle Wallets, and Base/Arc.

Steps:
1. Run: npm install kontext-sdk
2. Find where this project sends payments. Look for:
   - x402 payment headers (HTTP 402 responses with payment-required)
   - Circle SDK transfers (circle-sdk, @circle-fin/*)
   - ethers/viem sendTransaction or USDC approve+transfer patterns
   - Any HTTP call or smart contract interaction that moves USDC
3. Ask me:
   - What is your project name? (used as projectId)
   - Which chain? (base or arc for free tier; ethereum, polygon, arbitrum,
     optimism for Pay as you go)
   - Do you want local persistence? (FileStorage vs in-memory)
4. Import and initialize at the entry point:
   import { Kontext, FileStorage } from 'kontext-sdk';
   const ctx = Kontext.init({
     projectId: '<answer>',
     environment: 'production',
     storage: new FileStorage('.kontext'),
   });
5. Wrap each payment with ctx.verify(). Canonical x402 flow:
   // Agent receives 402 → reasons about payment → verify USDC → anchor
   const result = await ctx.verify({
     txHash: tx.hash,
     chain: '<answer>',          // 'base' or 'arc' recommended
     amount: String(amountInUSDC),
     token: 'USDC',
     from: senderAddress,
     to: recipientAddress,
     agentId: '<your-agent-name>',
     reasoning: '<why the agent approved this payment>',
     counterparty: {             // optional: bilateral compliance proof
       endpoint: 'https://counterparty/.well-known/kontext',
       agentId: 'counterparty-agent',
     },
   });
   if (!result.compliant) {
     throw new Error(\`Blocked: \${result.recommendations.join(', ')}\`);
   }
6. Add cleanup: await ctx.destroy()

Docs: https://getkontext.com/docs
Free: 20,000 events/month on Base and Arc. No API key needed.
Open source. Zero dependencies.

Alternative: If using Claude Code, Cursor, or Windsurf, add Kontext as an MCP server:
{
  "mcpServers": {
    "kontext": {
      "command": "npx",
      "args": ["-y", "kontext-sdk", "mcp"]
    }
  }
}
This exposes 8 compliance tools (verify_transaction, check_sanctions, log_reasoning,
get_trust_score, get_compliance_certificate, anchor_digest, exchange_attestation,
verify_audit_trail) directly in your AI coding assistant.`;

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
            className="absolute right-0 top-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--term-text-3)] hover:text-[var(--term-green)] bg-[var(--term-surface-2)] hover:bg-[var(--term-surface-3)] transition-colors"
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
          <pre className="text-xs text-[var(--term-text-2)] leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap pr-20">
            {prompt}
          </pre>
        </div>
      </TerminalChrome>

      {/* What happens when pasted */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--term-text-3)]">
        {[
          "paste",
          "detect stack",
          "ask 3 questions",
          "wrap payments",
          "done (~2 min)",
        ].map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            <span className="text-[var(--term-text-2)]">{step}</span>
            {i < 4 && <span className="text-[var(--term-green)]">&rarr;</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
