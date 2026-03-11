"use client";

import { useState, useRef, useEffect } from "react";

const HELP_TEXT = `kontext-sdk v0.8.0 — compliance proof at agent speed

commands:
  check <from> <to>              OFAC + compliance check
  verify --chain --amount --to   Full verify() with audit trail
  audit --verify                 Verify digest chain integrity
  cert --agent <id>              Compliance certificate
  trust <agentId>                Trust score breakdown
  help                           Show all commands
  clear                          Clear terminal

try: check 0xAgentWallet 0xRecipient`;

function processCommand(cmd: string): string {
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();

  if (!command) return "";

  if (command === "help") return HELP_TEXT;
  if (command === "clear") return "__CLEAR__";

  if (command === "check") {
    const from = parts[1] || "0xAgentWallet";
    const to = parts[2] || "0xRecipient";
    return `Checking ${from} → ${to}...

┌─────────────────────────────────────────┐
│ OFAC Sanctions Check                    │
├─────────────────────────────────────────┤
│ From: ${from.slice(0, 20).padEnd(20)}       │
│ To:   ${to.slice(0, 20).padEnd(20)}       │
│ Status: CLEAR                           │
│ Risk: LOW                               │
│ OFAC: Not sanctioned ✓                  │
│ Threshold: Below $3K EDD ✓             │
└─────────────────────────────────────────┘`;
  }

  if (command === "verify") {
    const chain = parts.find((p) => p.startsWith("--chain="))?.split("=")[1] || "base";
    const amount = parts.find((p) => p.startsWith("--amount="))?.split("=")[1] || "500";
    return `Verifying transaction on ${chain}...

Chain:   ${chain}
Amount:  $${amount} USDC
Token:   USDC
Status:  COMPLIANT ✓

Checks:
  [✓] OFAC Sanctions — not sanctioned
  [✓] Amount Threshold — ${parseFloat(amount) >= 3000 ? "EDD required (>$3K)" : "below threshold"}
  [✓] Transaction Frequency — normal
  [✓] Destination Risk — low

Trust Score: 87/100 (high)
Digest: a7b8c9d4e5f6...1234
Chain Length: 42 links, verified ✓`;
  }

  if (command === "audit") {
    return `Verifying digest chain integrity...

Genesis:  a1b2c3d4e5f6...
Terminal: f6e5d4c3b2a1...
Links:    42
Verified: 42/42 ✓

Status: CHAIN INTACT — no tampering detected.`;
  }

  if (command === "cert") {
    const agentId = parts.find((p) => p.startsWith("--agent="))?.split("=")[1] || "treasury-agent";
    return `Generating compliance certificate for ${agentId}...

┌─────────────────────────────────────────┐
│ COMPLIANCE CERTIFICATE                  │
├─────────────────────────────────────────┤
│ Agent: ${agentId.padEnd(33)}│
│ Period: 2026-02-01 to 2026-03-01       │
│ Status: COMPLIANT                       │
│ Trust Score: 87/100 (high)              │
│ Events Logged: 142                      │
│ Digest Chain: 142 links, verified ✓    │
│ Content Hash: sha256:9f8e7d...         │
└─────────────────────────────────────────┘`;
  }

  if (command === "trust") {
    const agentId = parts[1] || "treasury-agent";
    return `Trust score for ${agentId}:

Score: 87/100 (HIGH)

Factors:
  History     ████████████████████░░ 92/100 (w: 0.25)
  Amount      █████████████████░░░░░ 85/100 (w: 0.20)
  Frequency   ██████████████████░░░░ 88/100 (w: 0.20)
  Destination ████████████████░░░░░░ 82/100 (w: 0.20)
  Behavior    ██████████████████░░░░ 90/100 (w: 0.15)`;
  }

  return `Unknown command: ${command}. Type 'help' for available commands.`;
}

export function TabCli() {
  const [lines, setLines] = useState<Array<{ type: "input" | "output"; text: string }>>([
    { type: "output", text: HELP_TEXT },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const result = processCommand(input);

    if (result === "__CLEAR__") {
      setLines([]);
      setInput("");
      return;
    }

    setLines((prev) => [
      ...prev,
      { type: "input", text: input },
      { type: "output", text: result },
    ]);
    setInput("");
  };

  return (
    <div
      className="flex flex-col h-[500px] border border-[var(--term-surface-2)] bg-[#09090b]"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal chrome header */}
      <div className="flex items-center gap-2 border-b border-[var(--term-surface-2)] px-4 py-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-red)] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-amber)] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-green)] opacity-60" />
        <span className="ml-2 text-xs text-[var(--term-text-3)]">
          kontext@cli ~ $
        </span>
      </div>

      {/* Output area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {lines.map((line, i) => (
          <div key={i}>
            {line.type === "input" ? (
              <div className="flex items-start gap-2">
                <span className="text-[var(--term-green)] text-xs shrink-0">$</span>
                <span className="text-xs text-foreground">{line.text}</span>
              </div>
            ) : (
              <pre className="text-xs text-[var(--term-text-2)] leading-relaxed whitespace-pre-wrap font-mono">
                {line.text}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-[var(--term-surface-2)] px-4 py-3">
        <span className="text-[var(--term-green)] text-xs shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Type a command..."
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-[var(--term-text-3)] outline-none font-mono"
        />
      </div>
    </div>
  );
}
