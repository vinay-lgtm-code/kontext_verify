"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
}

const EXAMPLE_PROMPTS = [
  "Send $5,000 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595bBD1E on Base",
  "Check my wallet balance",
  "What's my trust score?",
  "Send $12,500 USDC to 0xA1B2C3D4E5F67890abcDEF1234567890AbCdEf01",
  "How does the audit trail work?",
];

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  const isFinancial =
    toolCall.name === "transfer_usdc" || toolCall.name === "send_payment";

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all ${
        isFinancial
          ? "border-red-500/30 bg-red-500/5"
          : "border-yellow-500/30 bg-yellow-500/5"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span
          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
            isFinancial
              ? "text-red-400 bg-red-500/15 border border-red-500/25"
              : "text-yellow-400 bg-yellow-500/15 border border-yellow-500/25"
          }`}
        >
          {isFinancial ? "FINANCIAL" : "TOOL"}
        </span>
        <span className="text-xs font-mono text-[#e4e4e7]">
          {toolCall.name}
        </span>
        <svg
          className={`w-3 h-3 text-[#71717a] ml-auto transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-[#262626]/50">
          <div className="pt-2">
            <div className="text-[9px] text-[#71717a] uppercase mb-1">
              Arguments
            </div>
            <pre className="text-[10px] font-mono text-[#a1a1aa] bg-[#0a0a0a] rounded px-2 py-1.5 overflow-x-auto">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-[9px] text-[#71717a] uppercase mb-1">
              Result
            </div>
            <pre className="text-[10px] font-mono text-green-400/80 bg-[#0a0a0a] rounded px-2 py-1.5 overflow-x-auto">
              {JSON.stringify(toolCall.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} entry-animate`}
    >
      <div
        className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Role indicator */}
        <div
          className={`flex items-center gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}
        >
          {!isUser && (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">K</span>
            </div>
          )}
          <span className="text-[10px] text-[#71717a]">
            {isUser ? "You" : "Kontext Agent"}
          </span>
          <span className="text-[9px] text-[#52525b]">
            {message.timestamp.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Tool calls (before message) */}
        {message.toolCalls &&
          message.toolCalls.length > 0 &&
          message.toolCalls.map((tc, i) => (
            <ToolCallCard key={i} toolCall={tc} />
          ))}

        {/* Message content */}
        <div
          className={`rounded-xl px-4 py-3 ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-[#1a1a1a] border border-[#262626] text-[#e4e4e7]"
          }`}
        >
          <div className="text-[13px] leading-relaxed whitespace-pre-wrap">
            {message.content.split(/(`[^`]+`)/).map((part, i) => {
              if (part.startsWith("`") && part.endsWith("`")) {
                return (
                  <code
                    key={i}
                    className="px-1 py-0.5 rounded bg-[#0a0a0a] border border-[#333] font-mono text-[11px] text-green-400"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              // Bold
              return part.split(/(\*\*[^*]+\*\*)/).map((sub, j) => {
                if (sub.startsWith("**") && sub.endsWith("**")) {
                  return (
                    <strong key={`${i}-${j}`} className="font-semibold">
                      {sub.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={`${i}-${j}`}>{sub}</span>;
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start entry-animate">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">K</span>
        </div>
        <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl px-4 py-3 flex items-center gap-1">
          <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#71717a]" />
          <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#71717a]" />
          <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#71717a]" />
        </div>
      </div>
    </div>
  );
}

interface ChatPanelProps {
  onResponse: (data: {
    message: string;
    toolCalls: ToolCall[];
    actions: Array<{
      id: string;
      timestamp: string;
      type: string;
      description: string;
      digest?: string;
    }>;
    chain: {
      genesisHash: string;
      terminalDigest: string;
      length: number;
      links: Array<{
        digest: string;
        priorDigest: string;
        sequence: number;
        actionId: string;
      }>;
      verified: boolean;
      linksVerified: number;
    };
    trustScore: {
      score: number;
      level: string;
      factors: Array<{
        name: string;
        score: number;
        weight: number;
        description: string;
      }>;
    };
    complianceResult: {
      compliant: boolean;
      riskLevel: string;
      checks: Array<{
        name: string;
        passed: boolean;
        description: string;
        severity: string;
      }>;
      recommendations: string[];
    } | null;
  }) => void;
}

export function ChatPanel({ onResponse }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        toolCalls: data.toolCalls,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      onResponse(data);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `An error occurred: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#262626] bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
            <span className="text-sm font-bold text-white">K</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#fafafa]">
              Kontext Demo Agent
            </h1>
            <p className="text-[11px] text-[#71717a]">
              AI agent with USDC tools + real-time compliance
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-400">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[#fafafa]">
                Try the Kontext Agent
              </h2>
              <p className="text-xs text-[#71717a] max-w-sm">
                Chat with an AI agent that has financial tools. Watch the audit
                trail build in real-time on the right panel.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg bg-[#111] border border-[#262626] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#333] hover:bg-[#1a1a1a] transition-all"
                >
                  <span className="text-[#52525b] mr-1.5">&rarr;</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      {/* Input area */}
      <div className="px-5 py-3 border-t border-[#262626] bg-[#0a0a0a]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message to the agent..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#111] border border-[#262626] text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-[#262626] disabled:text-[#52525b] text-white text-sm font-medium transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
