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
          Compliance evidence SDK for programmable payments.
          One call — <code className="text-[var(--ic-accent)]">verify()</code> — captures
          intent, runs OFAC screening, logs the payment into a tamper-evident digest chain,
          and returns a structured compliance result. Works across stablecoins, ACH,
          wire, card, and SEPA rails.
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
            <code>{`await ctx.verify({ txHash, rail, amount, currency, from, to, initiator })`}</code>
          </li>
        </ol>
      </Section>

      <Section title="STABLECOIN PAYMENT">
        <TerminalChrome title="stablecoin-transfer.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`const result = await ctx.verify({
  txHash: '0xabc...def',
  rail: 'stablecoin',
  chain: 'base',
  amount: '28000',
  currency: 'USDC',
  from: '0xTreasury',
  to: '0xVendor',
  initiator: { id: 'treasury-agent', type: 'agent' },
  fundingSource: 'Circle Wallet',
});`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="ACH / WIRE / CARD PAYMENT">
        <TerminalChrome title="fiat-transfer.ts" className="mt-2">
          <pre className="text-xs leading-relaxed overflow-x-auto">
            <code>{`const result = await ctx.verify({
  txRef: 'ACH-2026-03-19-0042',
  rail: 'ach',
  amount: '15000',
  currency: 'USD',
  from: { account: '****4521', institution: 'Chase' },
  to: { account: '****7890', institution: 'Wells Fargo' },
  initiator: { id: 'j.martinez', type: 'human' },
  fundingSource: 'Treasury Account',
});`}</code>
          </pre>
        </TerminalChrome>
      </Section>

      <Section title="SUPPORTED RAILS">
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { name: "Stablecoin", highlight: true },
            { name: "ACH", highlight: true },
            { name: "Wire", highlight: true },
            { name: "Card", highlight: true },
            { name: "SEPA", highlight: true },
          ].map((rail) => (
            <span
              key={rail.name}
              className="text-xs px-2 py-0.5 border rounded-md border-[var(--ic-accent)]/30 text-[var(--ic-accent)]"
            >
              {rail.name}
            </span>
          ))}
        </div>
      </Section>

      <Section title="SUPPORTED CHAINS (Stablecoin)">
        <div className="flex flex-wrap gap-2 mt-1">
          {["base", "arc", "ethereum", "polygon", "arbitrum", "optimism", "avalanche", "solana"].map((chain) => (
            <span
              key={chain}
              className="text-xs px-2 py-0.5 border rounded-md border-[var(--ic-border)] text-[var(--ic-text-dim)]"
            >
              {chain}
            </span>
          ))}
        </div>
      </Section>

      <Section title="SUPPORTED CURRENCIES">
        <div className="flex flex-wrap gap-2 mt-1">
          {["USD", "EUR", "GBP", "SGD", "INR", "AED", "USDC", "USDT", "EURC"].map((currency) => (
            <span
              key={currency}
              className="text-xs px-2 py-0.5 border rounded-md border-[var(--ic-border)] text-[var(--ic-text-dim)]"
            >
              {currency}
            </span>
          ))}
        </div>
      </Section>

      <Section title="INITIATOR TYPES">
        <p>
          <code className="text-[var(--ic-accent)]">agent</code> — autonomous AI systems, bots, service accounts
          <br />
          <code className="text-[var(--ic-accent)]">human</code> — staff, treasury operators, approvers
          <br />
          <code className="text-[var(--ic-accent)]">system</code> — scheduled jobs, reconciliation, settlement engines
        </p>
      </Section>
    </article>
  );
}
