"use client";

import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { CopyBlock } from "./copy-block";

const sdkCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'my-agent',
  environment: 'production',
});

// x402: agent hits 402, reasons, verifies USDC payment on Base
const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',         // or 'arc' — both free tier
  amount: '0.50',
  token: 'USDC',
  from: '0xAgentWallet',
  to: '0xAPIProvider',
  agentId: 'research-agent',
  reasoning: 'Paying CoinGecko API via x402. Provider not sanctioned.',
});

// result.compliant    → true
// result.riskLevel    → 'low'
// result.trustScore   → { score: 87, level: 'high' }
// result.digestProof  → { valid: true, chainLength: 42 }`;

const badges = [
  { label: "USDC", href: "/docs#usdc" },
  { label: "x402", href: "/docs#x402" },
  { label: "Circle Wallets", href: "/docs#circle-wallets" },
  { label: "Base", href: "/docs#base" },
  { label: "Arc", href: "/docs#arc" },
  { label: "CCTP", href: "/docs#cctp" },
  { label: "ERC-8021", href: "/docs#erc-8021" },
];

export function TabSdk() {
  return (
    <div className="space-y-6">
      {/* Install bar */}
      <CopyBlock code="npm install kontext-sdk" label="install" />

      {/* Code example */}
      <CodeBlock code={sdkCode} language="typescript" filename="agent.ts" />

      {/* Ecosystem badges */}
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <Link
            key={badge.label}
            href={badge.href}
            className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
              "border-[var(--term-border-bright)] text-[var(--term-text-3)] hover:text-[var(--term-text-2)] hover:border-[var(--term-text-3)]"
            }`}
          >
            {badge.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
