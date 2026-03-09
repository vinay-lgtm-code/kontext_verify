import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { CopyBlock } from "./copy-block";

const sdkCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'treasury-ops',
  environment: 'production',
});

// 1. Start a payment attempt
const attempt = await ctx.start({
  workspaceRef: 'acme-treasury',
  appRef: 'payroll-agent',
  archetype: 'treasury',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xTreasury...abc' },
  recipientRefs: { wallet: '0xVendor...def' },
  executionSurface: 'sdk',
});

// 2. Authorize — policy engine checks OFAC, limits, blocklists
const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base',
  token: 'USDC',
  amount: '5000',
  from: '0xTreasury...abc',
  to: '0xVendor...def',
  actorId: 'treasury-agent',
  metadata: { paymentType: 'treasury', purpose: 'vendor-payment' },
});

// receipt.decision = 'allow' | 'block' | 'review'
// receipt.checksRun = [{ name, passed, severity }]
// receipt.digestProof = { valid: true, chainLength: 12 }`;

const badges = [
  { label: "USDC", href: "/docs#settlement" },
  { label: "Base", href: "/docs#chains" },
  { label: "Ethereum", href: "/docs#chains" },
  { label: "Policy Engine", href: "/docs#policy-engine" },
  { label: "ERC-8021", href: "/docs#erc-8021" },
  { label: "Adapters", href: "/docs#adapters" },
  { label: "Workspace Profiles", href: "/docs#profiles" },
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
            className="text-[10px] font-mono px-2 py-1 border transition-colors border-[var(--term-border-bright)] text-[var(--term-text-3)] hover:text-[var(--term-text-2)] hover:border-[var(--term-text-3)]"
          >
            {badge.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
