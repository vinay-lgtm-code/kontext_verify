import { TerminalChrome } from "./terminal-chrome";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details open>
      <summary className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer py-2 hover:text-[var(--term-green)]">
        <span className="text-[var(--term-green)]">$</span>
        {title}
      </summary>
      <div className="pl-4 pb-4 text-sm text-[var(--term-text-2)] leading-relaxed">
        {children}
      </div>
    </details>
  );
}

export function TabOverview() {
  return (
    <article
      itemScope
      itemType="https://schema.org/SoftwareApplication"
      className="space-y-1"
    >
      <Section title="WHAT IS KONTEXT">
        <p>
          Payment Control Plane SDK for modern fintech.
          8-stage lifecycle tracks every payment from{" "}
          <code className="text-[var(--term-green)]">intent</code> to{" "}
          <code className="text-[var(--term-green)]">reconciliation</code>.
          Policy engine with OFAC screening. 6 provider adapters.
          Zero dependencies.
        </p>
      </Section>

      <Section title="INTEGRATE IN 3 STEPS">
        <ol className="list-none space-y-1.5">
          <li>
            <span className="text-[var(--term-text-3)]">1.</span>{" "}
            <code>npm install kontext-sdk</code>
          </li>
          <li>
            <span className="text-[var(--term-text-3)]">2.</span>{" "}
            <code>{`Kontext.init({ projectId: '...', environment: '...' })`}</code>
          </li>
          <li>
            <span className="text-[var(--term-text-3)]">3.</span>{" "}
            <code>{`await ctx.start({ ... }) + await ctx.authorize(attemptId, { ... })`}</code>
          </li>
        </ol>
      </Section>

      <Section title="DEFAULT FLOW: TREASURY PAYMENT">
        <TerminalChrome title="treasury-flow.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`// 1. Start a payment attempt
const attempt = await ctx.start({
  workspaceRef: 'acme-treasury',
  appRef: 'treasury-agent',
  archetype: 'treasury',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { wallet: '0xTreasury...abc' },
  recipientRefs: { wallet: '0xVendor...def' },
  executionSurface: 'sdk',
});

// 2. Authorize — policy engine runs
const { receipt } = await ctx.authorize(attempt.attemptId, {
  chain: 'base', token: 'USDC', amount: '5000',
  from: '0xTreasury...abc', to: '0xVendor...def',
  actorId: 'treasury-agent',
});

// 3. Broadcast + confirm
if (receipt.allowed) {
  await ctx.broadcast(attempt.attemptId, txHash, 'base');
  await ctx.confirm(attempt.attemptId, { txHash, blockNumber });
}`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="PAYMENT PRESETS (WORKSPACE PROFILES)">
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { name: "micropayments", limit: "$100" },
            { name: "treasury", limit: "$25K" },
            { name: "invoicing", limit: "$20K" },
            { name: "payroll", limit: "$15K" },
            { name: "cross_border", limit: "$10K" },
          ].map((preset) => (
            <span
              key={preset.name}
              className="text-xs px-2 py-0.5 border border-[var(--term-border-bright)] text-[var(--term-text-3)]"
            >
              {preset.name}{" "}
              <span className="text-[var(--term-text-3)]">({preset.limit})</span>
            </span>
          ))}
        </div>
      </Section>

      <Section title="SUPPORTED CHAINS (Base free)">
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { name: "base", free: true },
            { name: "ethereum", free: false },
            { name: "solana", free: false },
          ].map((chain) => (
            <span
              key={chain.name}
              className={`text-xs px-2 py-0.5 border ${
                chain.free
                  ? "border-[var(--term-green)] text-[var(--term-green)]"
                  : "border-[var(--term-border-bright)] text-[var(--term-text-3)]"
              }`}
            >
              {chain.free && <span className="led-green mr-1" />}
              {chain.name}
            </span>
          ))}
        </div>
      </Section>

      <Section title="6 PROVIDER ADAPTERS">
        <div className="space-y-1 font-mono text-xs mt-1">
          {[
            "EVMAdapter",
            "SolanaAdapter",
            "CircleAdapter",
            "X402Adapter",
            "BridgeAdapter",
            "ModernTreasuryAdapter",
          ].map((adapter) => (
            <p key={adapter}>
              <span className="text-[var(--term-green)]">●</span>{" "}
              <span className="text-[var(--term-text-2)]">{adapter}</span>
            </p>
          ))}
        </div>
      </Section>

      <Section title="START INPUT SCHEMA">
        <TerminalChrome title="types.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`interface StartAttemptInput {
  workspaceRef: string;
  appRef: string;
  archetype: 'micropayments' | 'treasury' | 'invoicing' | 'payroll' | 'cross_border';
  intentCurrency: string;
  settlementAsset: string;
  chain: 'base' | 'ethereum' | 'solana';
  senderRefs: { wallet: string };
  recipientRefs: { wallet: string };
  executionSurface: 'sdk' | 'api' | 'cli';
  metadata?: Record<string, unknown>;
}`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="AUTHORIZE OUTPUT SCHEMA">
        <TerminalChrome title="types.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`interface PaymentReceipt {
  decision: 'allow' | 'block' | 'review';
  allowed: boolean;
  checksRun: Array<{ name: string; passed: boolean; severity?: string }>;
  violations: Array<{ code: string; severity: string }>;
  requiredActions: Array<{ code: string; message: string }>;
  digestProof: { valid: boolean; chainLength: number };
}`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="MACHINE-READABLE ENDPOINTS">
        <div className="space-y-1 font-mono text-xs">
          <p>
            <span className="text-[var(--term-text-3)]">LLM guide</span>
            <span className="text-[var(--term-text-3)]"> ···· </span>
            <span className="text-[var(--term-blue)]">https://getkontext.com/llms.txt</span>
          </p>
          <p>
            <span className="text-[var(--term-text-3)]">npm</span>
            <span className="text-[var(--term-text-3)]"> ·········· </span>
            <span className="text-[var(--term-blue)]">https://npmjs.com/package/kontext-sdk</span>
          </p>
          <p>
            <span className="text-[var(--term-text-3)]">GitHub</span>
            <span className="text-[var(--term-text-3)]"> ······· </span>
            <span className="text-[var(--term-blue)]">https://github.com/Legaci-Labs/kontext</span>
          </p>
        </div>
      </Section>
    </article>
  );
}
