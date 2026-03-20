"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "system";
  content: string;
}

const examplePrompts = [
  "Verify $28K ACH transfer",
  "Send $5K USDC on Base",
  "Check wire payment compliance",
  "Verify digest chain",
];

function formatComplianceResult(input: string): Message[] {
  const lower = input.toLowerCase();

  if (lower.includes("ach") || lower.includes("28k") || lower.includes("28000")) {
    return [
      {
        role: "system",
        content: `$ ctx.verify({
  txRef: 'ACH-2026-03-19-0042',
  rail: 'ach',
  amount: '28000',
  currency: 'USD',
  from: { account: '****4521', institution: 'Chase' },
  to: { account: '****7890', institution: 'Wells Fargo' },
  initiator: { id: 'j.martinez', type: 'human' },
  fundingSource: 'Treasury Account',
})

{
  compliant: true,
  riskLevel: 'medium',
  checks: [
    { name: 'OFAC Sanctions', passed: true },
    { name: 'Amount Threshold (CTR)', passed: true,
      details: 'Above $10K CTR reporting threshold' },
    { name: 'Destination Risk', passed: true },
  ],
  recommendations: ['CTR filing recommended (>$10K)'],
  trustScore: { score: 82, level: 'high' },
  digestProof: { valid: true, chainLength: 1847 },
}

⚠ CTR threshold ($10K) triggered. Report generated.
Digest: c3d4e5...f6a7 → chain verified ✓`,
      },
    ];
  }

  if (lower.includes("wire")) {
    return [
      {
        role: "system",
        content: `$ ctx.verify({
  txRef: 'WIRE-2026-03-19-007',
  rail: 'wire',
  amount: '125000',
  currency: 'USD',
  from: { account: '****2200', institution: 'JPMorgan' },
  to: { account: '****8844', institution: 'HSBC London' },
  initiator: { id: 'settlement-engine', type: 'system' },
  fundingSource: 'Operating Account',
})

{
  compliant: true,
  riskLevel: 'high',
  checks: [
    { name: 'OFAC Sanctions', passed: true },
    { name: 'Amount Threshold (Large)', passed: true,
      details: 'Above $50K large transaction threshold' },
    { name: 'Cross-border Risk', passed: true,
      details: 'Destination: United Kingdom' },
  ],
  recommendations: ['Large transaction review recommended',
                     'Cross-border documentation required'],
  trustScore: { score: 74, level: 'medium' },
  digestProof: { valid: true, chainLength: 1848 },
}

⚠ Large cross-border wire. Compliance review flagged.
Digest: d4e5f6...a7b8 → chain verified ✓`,
      },
    ];
  }

  if (lower.includes("5k") || lower.includes("5000") || lower.includes("usdc") || lower.includes("base") || lower.includes("stablecoin")) {
    return [
      {
        role: "system",
        content: `$ ctx.verify({
  txHash: '0x3b1c...f42d',
  rail: 'stablecoin',
  chain: 'base',
  amount: '5000',
  currency: 'USDC',
  from: '0xTreasury...C3',
  to: '0xVendor...D4',
  initiator: { id: 'treasury-agent', type: 'agent' },
  fundingSource: 'Circle Wallet',
})

{
  compliant: true,
  riskLevel: 'medium',
  checks: [
    { name: 'OFAC Sanctions', passed: true },
    { name: 'Amount Threshold (EDD)', passed: true,
      details: 'Above $3K Travel Rule threshold' },
    { name: 'Transaction Frequency', passed: true },
  ],
  recommendations: ['Enhanced due diligence recommended (>$3K)'],
  trustScore: { score: 87, level: 'high' },
  digestProof: { valid: true, chainLength: 1849 },
}

⚠ EDD threshold ($3K) triggered. Recommend human review.
Digest: a7b8c9...d3e4 → chain verified ✓`,
      },
    ];
  }

  if (lower.includes("trust")) {
    return [
      {
        role: "system",
        content: `$ ctx.getTrustScore('treasury-agent')

{
  score: 87,
  level: 'high',
  factors: [
    { name: 'History',     score: 92, weight: 0.25 },
    { name: 'Amount',      score: 85, weight: 0.20 },
    { name: 'Frequency',   score: 88, weight: 0.20 },
    { name: 'Destination', score: 82, weight: 0.20 },
    { name: 'Behavior',    score: 90, weight: 0.15 },
  ],
}

Initiator 'treasury-agent' trusted at 87/100.`,
      },
    ];
  }

  if (lower.includes("digest") || lower.includes("chain")) {
    return [
      {
        role: "system",
        content: `$ ctx.verifyDigestChain()

{
  valid: true,
  genesisHash: 'a1b2c3d4e5f6...',
  terminalDigest: 'f6e5d4c3b2a1...',
  length: 1849,
  linksVerified: 1849,
}

Chain integrity: 1849/1849 links verified ✓
No tampering detected. All records intact.`,
      },
    ];
  }

  return [
    {
      role: "system",
      content: `$ ctx.verify({
  txRef: '...',
  rail: 'ach',
  amount: '100',
  currency: 'USD',
  from: { account: '****1234' },
  to: { account: '****5678' },
  initiator: { id: 'operator', type: 'human' },
})

{ compliant: true, riskLevel: 'low', trustScore: { score: 90 } }

Try: "Verify $28K ACH transfer" or "Check wire payment compliance"`,
    },
  ];
}

export function TabSandbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const responses = formatComplianceResult(text);

    setMessages((prev) => [...prev, userMsg, ...responses]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[500px] rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[var(--ic-text-dim)] mb-4">
              Test payments across stablecoin, ACH, wire, and card rails
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSubmit(prompt)}
                  className="text-[10px] px-3 py-1.5 rounded-md border border-[var(--ic-border)] text-[var(--ic-text-dim)] hover:text-[var(--ic-accent)] hover:border-[var(--ic-accent)]/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex items-start gap-2">
                <span className="text-[var(--ic-accent)] text-sm shrink-0">$</span>
                <span className="text-sm text-[var(--ic-text)]">{msg.content}</span>
              </div>
            ) : (
              <pre className="text-xs text-[var(--ic-text-muted)] leading-relaxed whitespace-pre-wrap font-mono">
                {msg.content}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Example prompts bar — shown after messages exist */}
      {messages.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-[var(--ic-border)] overflow-x-auto">
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSubmit(prompt)}
              className="text-[10px] px-2 py-1 rounded-md border border-[var(--ic-border)] text-[var(--ic-text-dim)] hover:text-[var(--ic-accent)] hover:border-[var(--ic-accent)]/30 transition-colors whitespace-nowrap shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-[var(--ic-border)] px-4 py-3">
        <span className="text-[var(--ic-accent)] text-sm shrink-0">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit(input);
          }}
          placeholder="Describe a payment to verify..."
          className="flex-1 bg-transparent text-sm text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] outline-none"
        />
      </div>
    </div>
  );
}
