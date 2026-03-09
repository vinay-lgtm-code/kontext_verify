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

// ---------------------------------------------------------------------------
// Scenario data — matches actual CLI output format
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

const AUTO_ADVANCE_DELAY = 3000;

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TerminalDemo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "typing" | "output" | "done">("idle");
  const [typedChars, setTypedChars] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [copied, setCopied] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoPlayed = useRef(false);

  const scenario = SCENARIOS[activeIdx]!;

  // -- Cleanup helper --
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // -- Animation orchestrator --
  const startAnimation = useCallback(
    (s: Scenario, idx: number) => {
      clearAllTimeouts();
      setPhase("typing");
      setTypedChars(0);
      setVisibleLines(0);

      const cmd = s.command;
      const charDelay = 35;

      // Schedule typing
      for (let i = 1; i <= cmd.length; i++) {
        const t = setTimeout(() => setTypedChars(i), i * charDelay);
        timeoutsRef.current.push(t);
      }

      // After typing → output phase
      const outputStart = cmd.length * charDelay + 400;
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
      const t2 = setTimeout(() => setPhase("done"), doneTime);
      timeoutsRef.current.push(t2);

      // Auto-advance to next tab (stop at last)
      if (idx < SCENARIOS.length - 1) {
        const t3 = setTimeout(() => {
          const next = idx + 1;
          setActiveIdx(next);
          startAnimation(SCENARIOS[next]!, next);
        }, doneTime + AUTO_ADVANCE_DELAY);
        timeoutsRef.current.push(t3);
      }
    },
    [clearAllTimeouts],
  );

  // -- IntersectionObserver for auto-play --
  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasAutoPlayed.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          hasAutoPlayed.current = true;
          startAnimation(SCENARIOS[0]!, 0);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startAnimation]);

  // -- Tab switch --
  function handleTab(idx: number) {
    if (idx === activeIdx && phase === "done") {
      startAnimation(SCENARIOS[idx]!, idx);
      return;
    }
    if (idx === activeIdx) return;
    setActiveIdx(idx);
    startAnimation(SCENARIOS[idx]!, idx);
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

  // -- Render output line with two-tone key:value --
  function renderLine(line: TerminalLine, i: number) {
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
      <div key={i} className={valueClass}>
        {line.value}
      </div>
    );
  }

  // -- Render --
  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden border border-border"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-neutral-700 bg-[#1a1a2e] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-2 font-mono text-xs text-neutral-500">terminal</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto border-b border-neutral-700 bg-[#16162a]">
        {SCENARIOS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === activeIdx;
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
      <div className="min-h-[280px] bg-[#1a1a2e] p-4 font-mono text-xs sm:p-5 sm:text-sm">
        {/* Comment */}
        {phase !== "idle" && (
          <div className="mb-1 text-neutral-600">{scenario.comment}</div>
        )}

        {/* Command line */}
        <div className="flex items-start">
          <span className="mr-2 select-none text-emerald-400">$</span>
          <pre className="whitespace-pre-wrap break-all text-neutral-200 font-mono leading-relaxed">
            {phase === "idle" ? "" : scenario.command.slice(0, typedChars)}
            {phase === "typing" && (
              <span className="animate-terminal-blink inline-block h-[1.1em] w-[0.6em] translate-y-[0.1em] bg-emerald-400" />
            )}
          </pre>
        </div>

        {/* Output lines */}
        {(phase === "output" || phase === "done") && (
          <div className="mt-2">
            {scenario.output.slice(0, visibleLines).map(renderLine)}
          </div>
        )}

        {/* Blinking cursor at rest */}
        {phase === "done" && (
          <div className="mt-2 flex items-center">
            <span className="mr-2 select-none text-emerald-400">$</span>
            <span className="animate-terminal-blink inline-block h-[1.1em] w-[0.6em] bg-emerald-400" />
          </div>
        )}
      </div>

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
        {phase === "done" && (
          <button
            onClick={() => startAnimation(scenario, activeIdx)}
            className="flex items-center gap-1 font-mono text-[10px] text-neutral-500 transition-colors hover:text-emerald-400 sm:text-xs"
          >
            <RotateCcw size={11} />
            Replay
          </button>
        )}
      </div>
    </div>
  );
}
