"use client";

import { useState, useRef, useEffect } from "react";

const HELP_TEXT = `kontext-sdk v0.12.0 — compliance evidence for programmable payments

commands:
  check <from> <to>              OFAC + compliance check
  verify --rail --amount --to    Full verify() with audit trail
  audit --verify                 Verify digest chain integrity
  cert --agent <id>              Compliance certificate
  evidence <txRef>               Evidence package summary
  trust <initiatorId>            Trust score breakdown
  help                           Show all commands
  clear                          Clear terminal

try: verify --rail=ach --amount=15000 --to=****7890`;

function processCommand(cmd: string): string {
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();

  if (!command) return "";

  if (command === "help") return HELP_TEXT;
  if (command === "clear") return "__CLEAR__";

  if (command === "check") {
    const from = parts[1] || "0xTreasury";
    const to = parts[2] || "0xVendor";
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
    const rail = parts.find((p) => p.startsWith("--rail="))?.split("=")[1] || "stablecoin";
    const amount = parts.find((p) => p.startsWith("--amount="))?.split("=")[1] || "500";
    const chain = parts.find((p) => p.startsWith("--chain="))?.split("=")[1] || "";
    const currency = rail === "ach" || rail === "wire" || rail === "card" ? "USD" : "USDC";
    const chainLabel = chain ? `  Chain: ${chain}` : "";

    return `Verifying ${rail.toUpperCase()} payment...

Rail:    ${rail}${chainLabel ? "\n" + chainLabel : ""}
Amount:  $${amount} ${currency}
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
│ Initiator: ${agentId.padEnd(28)}│
│ Period: 2026-02-01 to 2026-03-01       │
│ Status: COMPLIANT                       │
│ Trust Score: 87/100 (high)              │
│ Events Logged: 142                      │
│ Rails: stablecoin, ach, wire           │
│ Digest Chain: 142 links, verified ✓    │
│ Content Hash: sha256:9f8e7d...         │
└─────────────────────────────────────────┘`;
  }

  if (command === "evidence") {
    const txRef = parts[1] || "ACH-2026-03-19-0042";
    return `Evidence package for ${txRef}:

┌─────────────────────────────────────────┐
│ EVIDENCE PACKAGE                        │
├─────────────────────────────────────────┤
│ Ref: ${txRef.padEnd(34)}│
│ Rail: ACH                               │
│ Amount: $15,000.00 USD                  │
│ From: ****4521 (Chase)                  │
│ To: ****7890 (Wells Fargo)              │
│ Initiator: j.martinez (human)           │
│ OFAC: Cleared ✓                        │
│ Intent Hash: sha256:4a7b...             │
│ Digest Position: #1,847                 │
│ Chain Verified: ✓                      │
└─────────────────────────────────────────┘`;
  }

  if (command === "trust") {
    const initiatorId = parts[1] || "treasury-agent";
    return `Trust score for ${initiatorId}:

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
      className="flex flex-col h-[500px] rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))]"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal chrome header */}
      <div className="flex items-center gap-2 border-b border-[var(--ic-border)] px-4 py-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] opacity-60" />
        <span className="ml-2 text-xs text-[var(--ic-text-dim)]">
          kontext@cli ~ $
        </span>
      </div>

      {/* Output area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {lines.map((line, i) => (
          <div key={i}>
            {line.type === "input" ? (
              <div className="flex items-start gap-2">
                <span className="text-[var(--ic-accent)] text-xs shrink-0">$</span>
                <span className="text-xs text-[var(--ic-text)]">{line.text}</span>
              </div>
            ) : (
              <pre className="text-xs text-[var(--ic-text-muted)] leading-relaxed whitespace-pre-wrap font-mono">
                {line.text}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-[var(--ic-border)] px-4 py-3">
        <span className="text-[var(--ic-accent)] text-xs shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Type a command..."
          className="flex-1 bg-transparent text-xs text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] outline-none font-mono"
        />
      </div>
    </div>
  );
}
