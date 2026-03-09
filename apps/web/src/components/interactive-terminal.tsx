"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  ShieldCheck,
  CheckCircle,
  Download,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TerminalLine {
  label?: string;
  value: string;
  valueColor?: "green" | "red" | "yellow" | "cyan" | "muted" | "white" | "bold";
  delay?: number;
}

interface Scenario {
  id: string;
  label: string;
  icon: typeof Play;
  comment: string;
  command: string;
  output: TerminalLine[];
}

interface HistoryEntry {
  type: "comment" | "command" | "output-line" | "input" | "output" | "divider";
  text: string;
  label?: string;
  valueColor?: string;
}

// ---------------------------------------------------------------------------
// Scenarios — same as terminal-demo.tsx
// ---------------------------------------------------------------------------

const SCENARIOS: Scenario[] = [
  {
    id: "start",
    label: "Start",
    icon: Play,
    comment: "# Start a treasury payment attempt on Base",
    command: `kontext trace start \\
  --workspace acme-treasury \\
  --archetype treasury \\
  --chain base --asset USDC \\
  --from 0x8F3a...e21b \\
  --to 0x4C7d...f93a`,
    output: [
      { value: "", delay: 0 },
      { label: "Attempt ID:", value: "att_7f3a9c2e...", valueColor: "cyan" },
      { label: "Archetype:", value: "treasury" },
      { label: "Chain:", value: "base" },
      { label: "Stage:", value: "intent", valueColor: "green" },
      { label: "Final State:", value: "pending", valueColor: "yellow" },
    ],
  },
  {
    id: "authorize",
    label: "Authorize",
    icon: ShieldCheck,
    comment: "# Authorize the payment — policy engine checks OFAC, limits, blocklists",
    command: `kontext trace authorize \\
  --attempt att_7f3a9c2e \\
  --amount 5000 --token USDC \\
  --from 0x8F3a...e21b \\
  --to 0x4C7d...f93a \\
  --actor treasury-agent`,
    output: [
      { value: "", delay: 0 },
      { label: "Decision:", value: "allow", valueColor: "green" },
      { label: "Checks:", value: "8 passed, 0 failed", valueColor: "green" },
      { label: "Sanctions:", value: "CLEAR", valueColor: "green" },
      { label: "Amount:", value: "within limits ($5,000 / $25,000 max)" },
      { label: "Digest:", value: "a7b8c9d4e5f6...1234", valueColor: "cyan" },
    ],
  },
  {
    id: "confirm",
    label: "Confirm",
    icon: CheckCircle,
    comment: "# Confirm the on-chain transaction",
    command: `kontext trace confirm \\
  --attempt att_7f3a9c2e \\
  --tx-hash 0xe4f7a2c9d183b6... \\
  --block 28491037`,
    output: [
      { value: "", delay: 0 },
      { label: "Stage:", value: "confirm", valueColor: "green" },
      { label: "TX Hash:", value: "0xe4f7a2c9d183b6...", valueColor: "cyan" },
      { label: "Block:", value: "28491037" },
      { label: "Confirmations:", value: "12" },
      { label: "Final State:", value: "succeeded", valueColor: "green", delay: 200 },
    ],
  },
  {
    id: "export",
    label: "Export",
    icon: Download,
    comment: "# Export payment attempts as CSV",
    command: `kontext logs \\
  --format csv \\
  --since 2026-03-01 \\
  --archetype treasury`,
    output: [
      { value: "", delay: 0 },
      { label: "Exported:", value: "47 attempts", valueColor: "green" },
      { label: "Format:", value: "CSV" },
      { label: "File:", value: "./exports/treasury-2026-03.csv", valueColor: "cyan" },
      { label: "Digest chain:", value: "47 links, verified", valueColor: "green", delay: 200 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Command processor (from tab-cli.tsx)
// ---------------------------------------------------------------------------

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
Digest chain:   47 links, verified`;
  }

  if (command === "debug") {
    const attemptId = parts[1] || "att_7f3a9c2e";
    return `Debugging ${attemptId}...

Archetype:  treasury
Chain:      base
Asset:      USDC
Amount:     $5,000
State:      succeeded

Stages:
  1. intent        10:00:00  ok
  2. authorize     10:00:01  allow
  3. prepare       10:00:02  ok
  4. transmit      10:00:03  ok
  5. confirm       10:00:15  ok

Digest chain: 5 links, verified`;
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

// ---------------------------------------------------------------------------
// Color map
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, string> = {
  green: "text-emerald-400",
  red: "text-red-400",
  yellow: "text-amber-400",
  cyan: "text-cyan-400",
  muted: "text-neutral-500",
  white: "text-neutral-200",
  bold: "text-white font-semibold",
};

const CHAR_DELAY = 30;
const INTER_SCENARIO_PAUSE = 2000;
const TRANSITION_TO_INTERACTIVE = 1500;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractiveTerminal() {
  // -- Mode --
  const [mode, setMode] = useState<"playback" | "interactive">("playback");

  // -- Playback state --
  const [activeScenario, setActiveScenario] = useState(0);
  const [phase, setPhase] = useState<"idle" | "typing" | "output" | "done">("idle");
  const [typedChars, setTypedChars] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);

  // -- History (persists across modes) --
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // -- Interactive state --
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  // -- Refs --
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoPlayed = useRef(false);

  const scenario = SCENARIOS[activeScenario]!;

  // -- Auto-scroll --
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, typedChars, visibleLines, phase]);

  // -- Focus input when interactive --
  useEffect(() => {
    if (mode === "interactive") {
      inputRef.current?.focus();
    }
  }, [mode]);

  // -- Cleanup helper --
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // -- Commit scenario to history --
  const commitScenarioToHistory = useCallback((s: Scenario) => {
    const entries: HistoryEntry[] = [
      { type: "comment", text: s.comment },
      { type: "command", text: s.command },
    ];
    for (const line of s.output) {
      if (!line.value && !line.label) {
        entries.push({ type: "output-line", text: "" });
      } else if (line.label) {
        entries.push({
          type: "output-line",
          text: line.value,
          label: line.label,
          valueColor: COLOR_MAP[line.valueColor ?? "white"] ?? "text-neutral-200",
        });
      } else {
        entries.push({
          type: "output-line",
          text: line.value,
          valueColor: COLOR_MAP[line.valueColor ?? "white"] ?? "text-neutral-200",
        });
      }
    }
    setHistory((prev) => [...prev, ...entries]);
  }, []);

  // -- Playback orchestrator --
  const startPlayback = useCallback(
    (scenarioIdx: number) => {
      clearAllTimeouts();
      setActiveScenario(scenarioIdx);
      setPhase("typing");
      setTypedChars(0);
      setVisibleLines(0);

      const s = SCENARIOS[scenarioIdx]!;
      const cmd = s.command;

      // Schedule typing
      for (let i = 1; i <= cmd.length; i++) {
        const t = setTimeout(() => setTypedChars(i), i * CHAR_DELAY);
        timeoutsRef.current.push(t);
      }

      // After typing → output phase
      const outputStart = cmd.length * CHAR_DELAY + 400;
      const t1 = setTimeout(() => setPhase("output"), outputStart);
      timeoutsRef.current.push(t1);

      // Schedule output lines
      let cumulativeDelay = outputStart;
      s.output.forEach((line, i) => {
        cumulativeDelay += line.delay ?? 80;
        const t = setTimeout(() => setVisibleLines(i + 1), cumulativeDelay);
        timeoutsRef.current.push(t);
      });

      // Mark done
      const doneTime = cumulativeDelay + 500;
      const t2 = setTimeout(() => {
        setPhase("done");
        // Commit this scenario to history
        commitScenarioToHistory(s);
      }, doneTime);
      timeoutsRef.current.push(t2);

      // Auto-advance or transition to interactive
      if (scenarioIdx < SCENARIOS.length - 1) {
        const t3 = setTimeout(() => {
          startPlayback(scenarioIdx + 1);
        }, doneTime + INTER_SCENARIO_PAUSE);
        timeoutsRef.current.push(t3);
      } else {
        // Last scenario — transition to interactive mode
        const t3 = setTimeout(() => {
          setHistory((prev) => [
            ...prev,
            { type: "divider", text: "" },
          ]);
          setMode("interactive");
          setPhase("idle");
        }, doneTime + TRANSITION_TO_INTERACTIVE);
        timeoutsRef.current.push(t3);
      }
    },
    [clearAllTimeouts, commitScenarioToHistory],
  );

  // -- IntersectionObserver for auto-play --
  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasAutoPlayed.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          hasAutoPlayed.current = true;
          startPlayback(0);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startPlayback]);

  // -- Tab click --
  function handleTab(idx: number) {
    if (mode === "interactive") {
      // In interactive mode, run that scenario as if user typed it
      const s = SCENARIOS[idx]!;
      commitScenarioToHistory(s);
      setActiveScenario(idx);
      return;
    }
    // In playback mode, restart from this scenario
    setHistory([]);
    startPlayback(idx);
  }

  // -- Interactive command submit --
  function handleSubmit() {
    if (!input.trim()) return;

    const result = processCommand(input);

    if (result === "__CLEAR__") {
      setHistory([]);
      setInput("");
      return;
    }

    setHistory((prev) => [
      ...prev,
      { type: "input", text: input },
      { type: "output", text: result },
    ]);
    setInput("");
  }

  // -- Replay --
  function handleReplay() {
    clearAllTimeouts();
    setHistory([]);
    setMode("playback");
    setPhase("idle");
    setActiveScenario(0);
    setTypedChars(0);
    setVisibleLines(0);
    hasAutoPlayed.current = false;
    // Trigger immediately
    setTimeout(() => {
      hasAutoPlayed.current = true;
      startPlayback(0);
    }, 100);
  }

  // -- Copy install command --
  function handleCopy() {
    navigator.clipboard.writeText("npm install kontext-sdk").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // -- Cleanup on unmount --
  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  // -- Render helpers --
  function renderOutputLine(line: TerminalLine, i: number) {
    if (!line.value && !line.label) return <div key={i} className="h-3" />;
    const valueClass = COLOR_MAP[line.valueColor ?? "white"] ?? "text-neutral-200";
    if (line.label) {
      return (
        <div key={i} className="flex">
          <span className="w-[18ch] shrink-0 text-neutral-500">{line.label}</span>
          <span className={valueClass}>{line.value}</span>
        </div>
      );
    }
    return (
      <div key={i} className={valueClass}>{line.value}</div>
    );
  }

  function renderHistoryEntry(entry: HistoryEntry, i: number) {
    if (entry.type === "divider") {
      return (
        <div key={i} className="py-3">
          <div className="border-t border-neutral-700" />
          <p className="mt-2 text-[10px] text-neutral-500">
            Type a command or &quot;help&quot; for options
          </p>
        </div>
      );
    }
    if (entry.type === "comment") {
      return (
        <div key={i} className="text-neutral-600">{entry.text}</div>
      );
    }
    if (entry.type === "command") {
      return (
        <div key={i} className="flex items-start">
          <span className="mr-2 select-none text-emerald-400">$</span>
          <pre className="whitespace-pre-wrap break-all text-neutral-200 font-mono leading-relaxed">
            {entry.text}
          </pre>
        </div>
      );
    }
    if (entry.type === "output-line") {
      if (!entry.text && !entry.label) return <div key={i} className="h-3" />;
      const valueClass = entry.valueColor ?? "text-neutral-200";
      if (entry.label) {
        return (
          <div key={i} className="flex">
            <span className="w-[18ch] shrink-0 text-neutral-500">{entry.label}</span>
            <span className={valueClass}>{entry.text}</span>
          </div>
        );
      }
      return <div key={i} className={valueClass}>{entry.text}</div>;
    }
    if (entry.type === "input") {
      return (
        <div key={i} className="flex items-start">
          <span className="mr-2 select-none text-emerald-400">$</span>
          <span className="text-neutral-200">{entry.text}</span>
        </div>
      );
    }
    if (entry.type === "output") {
      return (
        <pre key={i} className="text-neutral-400 leading-relaxed whitespace-pre-wrap font-mono">
          {entry.text}
        </pre>
      );
    }
    return null;
  }

  // -- Render --
  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden border border-border"
      onClick={() => mode === "interactive" && inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-neutral-700 bg-[#1a1a2e] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-2 font-mono text-xs text-neutral-500">terminal</span>
      </div>

      {/* Scenario tabs */}
      <div className="flex gap-0 overflow-x-auto border-b border-neutral-700 bg-[#16162a]">
        {SCENARIOS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === activeScenario;
          return (
            <button
              key={s.id}
              onClick={() => handleTab(i)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 font-mono text-xs transition-colors ${
                isActive
                  ? "border-b border-emerald-400 text-white"
                  : "border-b border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Icon size={12} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className="min-h-[320px] max-h-[500px] overflow-y-auto bg-[#1a1a2e] p-4 font-mono text-xs sm:p-5 sm:text-sm"
      >
        {/* Committed history */}
        {mode === "playback" && phase !== "idle" && history.length === 0 ? null : (
          <div className="space-y-0">
            {history.map(renderHistoryEntry)}
          </div>
        )}

        {/* Live playback area (current scenario being animated) */}
        {mode === "playback" && phase !== "idle" && phase !== "done" && (
          <div className={history.length > 0 ? "mt-3" : ""}>
            {/* Comment */}
            <div className="mb-1 text-neutral-600">{scenario.comment}</div>

            {/* Command line being typed */}
            <div className="flex items-start">
              <span className="mr-2 select-none text-emerald-400">$</span>
              <pre className="whitespace-pre-wrap break-all text-neutral-200 font-mono leading-relaxed">
                {scenario.command.slice(0, typedChars)}
                {phase === "typing" && (
                  <span className="animate-terminal-blink inline-block h-[1.1em] w-[0.6em] translate-y-[0.1em] bg-emerald-400" />
                )}
              </pre>
            </div>

            {/* Output lines */}
            {phase === "output" && (
              <div className="mt-2">
                {scenario.output.slice(0, visibleLines).map(renderOutputLine)}
              </div>
            )}
          </div>
        )}

        {/* Blinking cursor when playback scenario is done but not yet committed */}
        {mode === "playback" && phase === "idle" && history.length === 0 && (
          <div className="flex items-center">
            <span className="mr-2 select-none text-emerald-400">$</span>
            <span className="animate-terminal-blink inline-block h-[1.1em] w-[0.6em] bg-emerald-400" />
          </div>
        )}

        {/* Interactive mode: blinking cursor at bottom */}
        {mode === "interactive" && (
          <div className="mt-2 flex items-center">
            <span className="mr-2 select-none text-emerald-400">$</span>
            <span className="animate-terminal-blink inline-block h-[1.1em] w-[0.6em] bg-emerald-400" />
          </div>
        )}
      </div>

      {/* Input line (interactive mode only) */}
      {mode === "interactive" && (
        <div className="flex items-center gap-2 border-t border-neutral-700 bg-[#1a1a2e] px-4 py-3">
          <span className="text-emerald-400 text-sm shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-neutral-200 placeholder:text-neutral-600 outline-none font-mono"
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-700 bg-[#16162a] px-4 py-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-500 transition-colors hover:text-emerald-400 sm:text-xs"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              npm install kontext-sdk
            </>
          )}
        </button>
        <button
          onClick={handleReplay}
          className="flex items-center gap-1 font-mono text-[10px] text-neutral-500 transition-colors hover:text-emerald-400 sm:text-xs"
        >
          <RotateCcw size={11} />
          Replay
        </button>
      </div>
    </div>
  );
}
