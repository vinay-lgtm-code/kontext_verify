"use client";

import { useState, useRef, useEffect } from "react";

const HELP_TEXT = `kontext v1.0.0 — payment control plane

commands:
  trace start <opts>           Start a payment attempt
  trace authorize <opts>       Authorize via policy engine
  trace confirm <opts>         Confirm on-chain settlement
  logs --format csv|json       Export payment attempts
  debug <attemptId>            Inspect attempt stages
  init                         Initialize workspace profile
  help                         Show all commands
  clear                        Clear terminal

try: trace start --archetype treasury --chain base`;

function processCommand(cmd: string): string {
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const subcommand = parts[1]?.toLowerCase();

  if (!command) return "";

  if (command === "help") return HELP_TEXT;
  if (command === "clear") return "__CLEAR__";

  if (command === "trace" && subcommand === "start") {
    const archetype = parts.find((p) => p.startsWith("--archetype="))?.split("=")[1] || "treasury";
    const chain = parts.find((p) => p.startsWith("--chain="))?.split("=")[1] || "base";
    return `Starting payment attempt...

Attempt ID:     att_7f3a9c2e...
Archetype:      ${archetype}
Chain:          ${chain}
Asset:          USDC
Stage:          intent
Final State:    pending

Digest: a1b2c3d4e5f6...7890`;
  }

  if (command === "trace" && subcommand === "authorize") {
    const amount = parts.find((p) => p.startsWith("--amount="))?.split("=")[1] || "5000";
    return `Authorizing payment...

Decision:       allow
Checks:         8 passed, 0 failed
Sanctions:      CLEAR
Amount:         within limits ($${amount} / $25,000 max)
Blocklist:      not listed
Metadata:       valid

Digest: a7b8c9d4e5f6...1234
Stage: authorize → allowed`;
  }

  if (command === "trace" && subcommand === "confirm") {
    return `Confirming on-chain settlement...

Stage:          confirm
TX Hash:        0xe4f7a2c9d183b6...
Block:          28491037
Confirmations:  12
Final State:    succeeded

Payment lifecycle complete. 5 stages logged.`;
  }

  if (command === "logs") {
    const format = parts.find((p) => p.startsWith("--format="))?.split("=")[1] || "json";
    return `Exporting payment attempts...

Exported:       47 attempts
Format:         ${format.toUpperCase()}
File:           ./exports/treasury-2026-03.${format}
Digest chain:   47 links, verified ✓`;
  }

  if (command === "debug") {
    const attemptId = parts[1] || "att_7f3a9c2e";
    return `Debugging ${attemptId}...

┌─────────────────────────────────────────┐
│ PAYMENT ATTEMPT: ${attemptId.padEnd(22)}│
├─────────────────────────────────────────┤
│ Archetype:  treasury                    │
│ Chain:      base                        │
│ Asset:      USDC                        │
│ Amount:     $5,000                      │
│ State:      succeeded                   │
├─────────────────────────────────────────┤
│ Stages:                                 │
│  1. intent        10:00:00  ✓          │
│  2. authorize     10:00:01  allow      │
│  3. prepare       10:00:02  ✓          │
│  4. transmit      10:00:03  ✓          │
│  5. confirm       10:00:15  ✓          │
│                                         │
│ Digest chain: 5 links, verified ✓      │
└─────────────────────────────────────────┘`;
  }

  if (command === "init") {
    return `Initializing workspace profile...

Workspace:      acme-treasury
Archetype:      treasury
Max Amount:     $25,000
Review Over:    $10,000
OFAC:           enabled
Blocklist:      enabled

Profile saved to .kontext/workspace.json`;
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
