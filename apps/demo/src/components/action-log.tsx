"use client";

import { useEffect, useRef } from "react";

interface ActionEntry {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  digest?: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  ai_generate: {
    label: "GENERATE",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
  },
  ai_tool_call: {
    label: "TOOL CALL",
    color: "#eab308",
    bg: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.25)",
  },
  ai_financial_tool_call: {
    label: "FINANCIAL",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
  ai_response: {
    label: "RESPONSE",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
  },
  compliance_check: {
    label: "COMPLIANCE",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.25)",
  },
  transaction: {
    label: "TRANSACTION",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
};

const DEFAULT_CONFIG = {
  label: "ACTION",
  color: "#71717a",
  bg: "rgba(113,113,122,0.12)",
  border: "rgba(113,113,122,0.25)",
};

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

export function ActionLog({ actions }: { actions: ActionEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#262626]">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
          Live Action Log
        </h3>
        <span className="ml-auto text-[10px] font-mono text-[#71717a]">
          {actions.length} events
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
        style={{ maxHeight: "280px" }}
      >
        {actions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#71717a] text-xs">
            Waiting for agent activity...
          </div>
        ) : (
          actions.map((action, i) => {
            const config = TYPE_CONFIG[action.type] || DEFAULT_CONFIG;
            const isNew = i >= actions.length - 3;

            return (
              <div
                key={action.id}
                className={`flex items-start gap-2 px-2.5 py-2 rounded-lg transition-all ${isNew ? "entry-animate" : ""}`}
                style={{
                  background: config.bg,
                  border: `1px solid ${config.border}`,
                }}
              >
                <span
                  className="shrink-0 mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{
                    color: config.color,
                    background: config.bg,
                    border: `1px solid ${config.border}`,
                  }}
                >
                  {config.label}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#e4e4e7] leading-snug truncate">
                    {action.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono text-[#71717a]">
                      {formatTime(action.timestamp)}
                    </span>
                    {action.digest && (
                      <span className="text-[9px] font-mono text-[#52525b]">
                        #{action.digest.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
