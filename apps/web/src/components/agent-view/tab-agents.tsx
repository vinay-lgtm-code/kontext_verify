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
      <summary className="flex items-center gap-2 text-sm font-medium text-[var(--ic-text)] cursor-pointer py-2 hover:text-[var(--ic-accent)]">
        <span className="text-[var(--ic-accent)]">$</span>
        {title}
      </summary>
      <div className="pl-4 pb-4 text-sm text-[var(--ic-text-muted)] leading-relaxed">
        {children}
      </div>
    </details>
  );
}

export function TabAgents() {
  return (
    <article
      itemScope
      itemType="https://schema.org/SoftwareApplication"
      className="space-y-1"
    >
      <Section title="WHAT IS KONTEXT">
        <p>
          Compliance logging SDK for AI agents that move money.
          One call — <code className="text-[var(--ic-accent)]">verify()</code> — runs
          OFAC screening, logs the transaction into a tamper-evident digest chain,
          computes trust score, returns structured compliance result. Zero
          dependencies. Free on Base/Arc.
        </p>
      </Section>

      <Section title="INTEGRATE IN 3 STEPS">
        <ol className="list-none space-y-1.5">
          <li>
            <span className="text-[var(--ic-text-dim)]">1.</span>{" "}
            <code>npm install kontext-sdk</code>
          </li>
          <li>
            <span className="text-[var(--ic-text-dim)]">2.</span>{" "}
            <code>{`Kontext.init({ projectId: '...', environment: '...' })`}</code>
          </li>
          <li>
            <span className="text-[var(--ic-text-dim)]">3.</span>{" "}
            <code>{`await ctx.verify({ txHash, chain: 'base', amount, token: 'USDC', from, to, agentId })`}</code>
          </li>
        </ol>
      </Section>

      <Section title="DEFAULT FLOW: x402 USDC ON BASE/ARC">
        <TerminalChrome title="x402-flow.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`// Agent receives HTTP 402 → reasons about payment → verify → pay
const result = await ctx.verify({
  ...x402Payment,
  chain: 'base',    // or 'arc'
  token: 'USDC',
  agentId: 'payment-agent',
  counterparty: {
    endpoint: 'https://api.example.com/.well-known/kontext'
  }
});`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="CIRCLE PROGRAMMABLE WALLETS">
        <TerminalChrome title="circle-wallets.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`// Wrap Circle transfers with compliance
const result = await ctx.verify({
  txHash: circleResponse.txHash,
  chain: 'arc',
  amount: '5000',
  token: 'USDC',
  from: circleWallet,
  to: recipient,
  agentId: 'treasury-agent',
});`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="VERIFY INPUT SCHEMA">
        <TerminalChrome title="types.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`interface VerifyInput {
  txHash: string;
  chain: 'base' | 'arc' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'solana';
  amount: string;
  token: 'USDC' | 'USDT' | 'DAI' | 'EURC';
  from: string;
  to: string;
  agentId: string;
  reasoning?: string;
  counterparty?: { endpoint: string; agentId: string };
  anchor?: { rpcUrl: string; contractAddress: string; privateKey?: string };
  metadata?: Record<string, unknown>;
}`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="VERIFY OUTPUT SCHEMA">
        <TerminalChrome title="types.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`interface VerifyResult {
  compliant: boolean;
  checks: Array<{ name: string; passed: boolean; details?: string }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  trustScore: { score: number; level: string; factors: Factor[] };
  digestProof: { valid: boolean; chainLength: number };
  transaction: TransactionRecord;
  counterparty?: { attested: boolean; digest: string };
  anchorProof?: { txHash: string; blockNumber: number };
}`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="SUPPORTED CHAINS (Base + Arc free)">
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { name: "base", free: true },
            { name: "arc", free: true },
            { name: "ethereum", free: false },
            { name: "polygon", free: false },
            { name: "arbitrum", free: false },
            { name: "optimism", free: false },
            { name: "avalanche", free: false },
            { name: "solana", free: false },
          ].map((chain) => (
            <span
              key={chain.name}
              className={`text-xs px-2 py-0.5 border rounded-md ${
                chain.free
                  ? "border-[var(--ic-green)] text-[var(--ic-green)]"
                  : "border-[var(--ic-border)] text-[var(--ic-text-dim)]"
              }`}
            >
              {chain.free && <span className="h-1.5 w-1.5 rounded-full bg-[var(--ic-green)] inline-block mr-1" />}
              {chain.name}
            </span>
          ))}
        </div>
      </Section>

      <Section title="PRIMARY TOKEN: USDC">
        <p>
          Also supports: USDT, DAI, EURC
        </p>
      </Section>

      <Section title="MACHINE-READABLE ENDPOINTS">
        <div className="space-y-1 font-mono text-xs">
          <p>
            <span className="text-[var(--ic-text-dim)]">Agent card</span>
            <span className="text-[var(--ic-text-dim)]"> ··· </span>
            <span className="text-[var(--ic-accent)]">https://getkontext.com/.well-known/kontext.json</span>
          </p>
          <p>
            <span className="text-[var(--ic-text-dim)]">LLM guide</span>
            <span className="text-[var(--ic-text-dim)]"> ···· </span>
            <span className="text-[var(--ic-accent)]">https://getkontext.com/llms.txt</span>
          </p>
          <p>
            <span className="text-[var(--ic-text-dim)]">npm</span>
            <span className="text-[var(--ic-text-dim)]"> ·········· </span>
            <span className="text-[var(--ic-accent)]">https://npmjs.com/package/kontext-sdk</span>
          </p>
          <p>
            <span className="text-[var(--ic-text-dim)]">Docs</span>
            <span className="text-[var(--ic-text-dim)]"> ········· </span>
            <span className="text-[var(--ic-accent)]">https://getkontext.com/docs</span>
          </p>
        </div>
      </Section>
    </article>
  );
}
