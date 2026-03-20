"use client";

import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { CopyBlock } from "./copy-block";

const sdkCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'payments-platform',
  environment: 'production',
});

// Stablecoin: agent-initiated USDC transfer on Base
const stablecoin = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '28000',
  token: 'USDC',
  from: '0xTreasury',
  to: '0xVendor',
  agentId: 'treasury-agent',
});

// ACH: human-initiated domestic transfer
const ach = await ctx.verify({
  paymentReference: 'ACH-2026-03-19-0042',
  paymentMethod: 'ach',
  amount: '15000',
  currency: 'USD',
  from: 'Acme Corp ****4521',
  to: 'Global Payments ****7890',
  agentId: 'ap-system',
});

// result.compliant    → true
// result.riskLevel    → 'low'
// result.trustScore   → { score: 87, level: 'high' }
// result.digestProof  → { valid: true, chainLength: 42 }`;

const badges = [
  { label: "Stablecoin", href: "/docs#stablecoin" },
  { label: "ACH", href: "/docs#ach" },
  { label: "Wire", href: "/docs#wire" },
  { label: "Card", href: "/docs#card" },
  { label: "Multi-rail", href: "/docs#multi-rail" },
  { label: "Circle Wallets", href: "/docs#circle-wallets" },
  { label: "CCTP", href: "/docs#cctp" },
];

export function TabSdk() {
  return (
    <div className="space-y-6">
      {/* Install bar */}
      <CopyBlock code="npm install kontext-sdk" label="install" />

      {/* Code example */}
      <CodeBlock code={sdkCode} language="typescript" filename="payments.ts" />

      {/* Ecosystem badges */}
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <Link
            key={badge.label}
            href={badge.href}
            className="text-[10px] font-mono px-2 py-1 border rounded-md transition-colors border-[var(--ic-border)] text-[var(--ic-text-dim)] hover:text-[var(--ic-text-muted)] hover:border-[var(--ic-text-muted)]"
          >
            {badge.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
