"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "system";
  content: string;
}

const examplePrompts = [
  "Start a $5K treasury payment",
  "Authorize a payroll transfer",
  "Check payment status",
  "List blocked payments",
];

function formatComplianceResult(input: string): Message[] {
  const lower = input.toLowerCase();

  if (lower.includes("treasury") || lower.includes("5k") || lower.includes("5000")) {
    return [
      {
        role: "system",
        content: `$ ctx.start({
  workspaceRef: 'acme-treasury',
  archetype: 'treasury',
  chain: 'base', settlementAsset: 'USDC',
  senderRefs: { wallet: '0xTreasury...C3' },
  recipientRefs: { wallet: '0xVendor...D4' },
})

Attempt ID: att_3b1c...f42d
Stage: intent → pending

$ ctx.authorize(att_3b1c...f42d, {
  amount: '5000', token: 'USDC',
  from: '0xTreasury...C3', to: '0xVendor...D4',
  actorId: 'treasury-agent',
})

{
  decision: 'allow',
  checksRun: [
    { name: 'Sanctions screening', passed: true },
    { name: 'Max transaction amount', passed: true },
    { name: 'Daily aggregate limit', passed: true },
  ],
  violations: [],
  digestProof: { valid: true, chainLength: 8 },
}`,
      },
    ];
  }

  if (lower.includes("payroll") || lower.includes("authorize")) {
    return [
      {
        role: "system",
        content: `$ ctx.start({
  workspaceRef: 'acme-payroll',
  archetype: 'payroll',
  chain: 'base', settlementAsset: 'USDC',
  senderRefs: { wallet: '0xPayroll...A1' },
  recipientRefs: { wallet: '0xEmployee...B2' },
})

Attempt ID: att_9e2f...a71c
Stage: intent → pending

$ ctx.authorize(att_9e2f...a71c, {
  amount: '3500', token: 'USDC',
  actorId: 'payroll-agent',
  metadata: { employeeId: 'emp_042', payPeriod: '2026-03' },
})

{
  decision: 'allow',
  checksRun: [
    { name: 'Sanctions screening', passed: true },
    { name: 'Required metadata (employeeId)', passed: true },
    { name: 'Max transaction amount ($15K)', passed: true },
  ],
  violations: [],
}`,
      },
    ];
  }

  if (lower.includes("status") || lower.includes("check")) {
    return [
      {
        role: "system",
        content: `$ ctx.get('att_7f3a9c2e')

{
  attemptId: 'att_7f3a9c2e',
  archetype: 'treasury',
  chain: 'base',
  currentStage: 'confirm',
  finalState: 'succeeded',
  stages: [
    { stage: 'intent', ts: '2026-03-08T10:00:00Z' },
    { stage: 'authorize', ts: '2026-03-08T10:00:01Z', decision: 'allow' },
    { stage: 'prepare', ts: '2026-03-08T10:00:02Z' },
    { stage: 'transmit', ts: '2026-03-08T10:00:03Z' },
    { stage: 'confirm', ts: '2026-03-08T10:00:15Z', txHash: '0xe4f7...' },
  ],
  digestProof: { valid: true, chainLength: 12 },
}`,
      },
    ];
  }

  if (lower.includes("blocked") || lower.includes("list")) {
    return [
      {
        role: "system",
        content: `$ ctx.list({ decision: 'block' })

Found 2 blocked attempts:

att_c4d5...e6f7  treasury   $50,000  SANCTIONED_RECIPIENT
att_a1b2...c3d4  payroll    $8,000   REQUIRES_HUMAN_APPROVAL

Total: 2 blocked, 45 allowed, 3 in review`,
      },
    ];
  }

  return [
    {
      role: "system",
      content: `$ ctx.start({ archetype: 'treasury', chain: 'base', ... })

Attempt created: att_...
Stage: intent → pending

Try: "Start a $5K treasury payment" or "Authorize a payroll transfer"`,
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
    <div className="flex flex-col h-[500px] border border-[var(--term-surface-2)] bg-[#09090b]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[var(--term-text-3)] mb-4">
              Test payment lifecycle with live policy engine checks
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSubmit(prompt)}
                  className="text-[10px] px-3 py-1.5 border border-[var(--term-surface-2)] text-[var(--term-text-3)] hover:text-[var(--term-green)] hover:border-[var(--term-green)] transition-colors"
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
                <span className="text-[var(--term-green)] text-sm shrink-0">$</span>
                <span className="text-sm text-foreground">{msg.content}</span>
              </div>
            ) : (
              <pre className="text-xs text-[var(--term-text-2)] leading-relaxed whitespace-pre-wrap font-mono">
                {msg.content}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Example prompts bar — shown after messages exist */}
      {messages.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-[var(--term-surface-2)] overflow-x-auto">
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSubmit(prompt)}
              className="text-[10px] px-2 py-1 border border-[var(--term-surface-2)] text-[var(--term-text-3)] hover:text-[var(--term-green)] hover:border-[var(--term-green)] transition-colors whitespace-nowrap shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-[var(--term-surface-2)] px-4 py-3">
        <span className="text-[var(--term-green)] text-sm shrink-0">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit(input);
          }}
          placeholder="Describe a payment to process..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-[var(--term-text-3)] outline-none"
        />
      </div>
    </div>
  );
}
