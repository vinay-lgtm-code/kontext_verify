"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Copy, ArrowLeft } from "lucide-react";
import {
  checkCompliance,
  type ComplianceResult,
} from "@/lib/compliance-checker";

const CHAINS = [
  { value: "base", label: "Base", free: true },
  { value: "arc", label: "Arc", free: true },
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "avalanche", label: "Avalanche" },
  { value: "solana", label: "Solana" },
];

const TOKENS = ["USDC", "USDT", "DAI", "EURC"];

const EXAMPLE_ADDRESSES = {
  clean: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68",
  sanctioned: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
};

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-[var(--term-red)]";
    case "high":
      return "text-[var(--term-red)]";
    case "medium":
      return "text-[var(--term-amber)]";
    default:
      return "text-[var(--term-green)]";
  }
}

function riskLed(riskLevel: string): string {
  switch (riskLevel) {
    case "critical":
    case "high":
      return "led-red";
    case "medium":
      return "led-amber";
    default:
      return "led-green";
  }
}

export default function PlaygroundPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("5000");
  const [chain, setChain] = useState("base");
  const [token, setToken] = useState("USDC");
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleVerify = () => {
    const res = checkCompliance({ from, to, amount, chain, token });
    setResult(res);
  };

  const handleCopyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadExample = (type: "clean" | "sanctioned") => {
    setFrom(EXAMPLE_ADDRESSES.clean);
    setTo(
      type === "sanctioned"
        ? EXAMPLE_ADDRESSES.sanctioned
        : "0x388C818CA8B9251b393131C08a736A67ccB19297",
    );
    setAmount(type === "sanctioned" ? "5000" : "5000");
    setChain("base");
    setToken("USDC");
    setResult(null);
  };

  return (
    <section className="relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--term-text-3)] hover:text-[var(--term-text-2)] mb-8"
        >
          <ArrowLeft size={12} />
          Back to home
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          <span className="text-[var(--term-green)]">$</span> Playground
        </h1>
        <p className="text-sm text-[var(--term-text-2)] mb-8">
          Run{" "}
          <code className="text-[var(--term-green)]">verify()</code> in your
          browser. Real OFAC screening, real thresholds. No install required.
        </p>

        {/* Example buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => loadExample("clean")}
            className="text-[11px] text-[var(--term-text-3)] border border-[var(--term-surface-2)] px-3 py-1.5 hover:border-[var(--term-green)] hover:text-[var(--term-green)] transition-colors"
          >
            Load clean example
          </button>
          <button
            onClick={() => loadExample("sanctioned")}
            className="text-[11px] text-[var(--term-text-3)] border border-[var(--term-surface-2)] px-3 py-1.5 hover:border-[var(--term-red)] hover:text-[var(--term-red)] transition-colors"
          >
            Load sanctioned example
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Input form */}
          <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)]">
            <div className="border-b border-[var(--term-surface-2)] px-4 py-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-red)] opacity-60" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-amber)] opacity-60" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-green)] opacity-60" />
              <span className="text-xs text-[var(--term-text-3)] font-mono ml-2">
                verify-input
              </span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-[var(--term-text-3)] mb-1.5">
                  From address
                </label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="0xSender..."
                  className="w-full border border-[var(--term-surface-2)] bg-background px-3 py-2 text-sm font-mono text-[var(--term-text-2)] placeholder:text-[var(--term-text-3)] focus:border-[var(--term-green)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--term-text-3)] mb-1.5">
                  To address
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="0xRecipient..."
                  className="w-full border border-[var(--term-surface-2)] bg-background px-3 py-2 text-sm font-mono text-[var(--term-text-2)] placeholder:text-[var(--term-text-3)] focus:border-[var(--term-green)] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--term-text-3)] mb-1.5">
                    Amount
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full border border-[var(--term-surface-2)] bg-background px-3 py-2 text-sm font-mono text-[var(--term-text-2)] placeholder:text-[var(--term-text-3)] focus:border-[var(--term-green)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--term-text-3)] mb-1.5">
                    Chain
                  </label>
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    className="w-full border border-[var(--term-surface-2)] bg-background px-3 py-2 text-sm font-mono text-[var(--term-text-2)] focus:border-[var(--term-green)] focus:outline-none"
                  >
                    {CHAINS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                        {c.free ? " (free)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--term-text-3)] mb-1.5">
                    Token
                  </label>
                  <select
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full border border-[var(--term-surface-2)] bg-background px-3 py-2 text-sm font-mono text-[var(--term-text-2)] focus:border-[var(--term-green)] focus:outline-none"
                  >
                    {TOKENS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleVerify}
                disabled={!from || !to || !amount}
              >
                $ verify()
              </Button>
            </div>
          </div>

          {/* Results panel */}
          <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)]">
            <div className="border-b border-[var(--term-surface-2)] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-red)] opacity-60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-amber)] opacity-60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-green)] opacity-60" />
                <span className="text-xs text-[var(--term-text-3)] font-mono ml-2">
                  response
                </span>
              </div>
              {result && (
                <button
                  onClick={handleCopyResult}
                  className="p-1 text-[var(--term-text-3)] hover:text-[var(--term-text-2)]"
                  aria-label="Copy result"
                >
                  {copied ? (
                    <Check size={14} className="text-[var(--term-green)]" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              )}
            </div>
            <div className="p-4">
              {!result ? (
                <p className="text-xs text-[var(--term-text-3)] italic">
                  Enter addresses and click verify() to see results.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex items-center gap-3">
                    <span className={riskLed(result.riskLevel)} />
                    <span
                      className={`text-sm font-medium ${
                        result.compliant
                          ? "text-[var(--term-green)]"
                          : "text-[var(--term-red)]"
                      }`}
                    >
                      {result.compliant ? "COMPLIANT" : "NON-COMPLIANT"}
                    </span>
                    <span
                      className={`text-xs ${severityColor(result.riskLevel)}`}
                    >
                      Risk: {result.riskLevel}
                    </span>
                  </div>

                  {/* Checks */}
                  <div>
                    <p className="text-[10px] text-[var(--term-text-3)] uppercase tracking-wider mb-2">
                      Checks ({result.checks.length})
                    </p>
                    <div className="space-y-1">
                      {result.checks.map((check, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-[11px]"
                        >
                          <span
                            className={
                              check.passed
                                ? "text-[var(--term-green)]"
                                : "text-[var(--term-red)]"
                            }
                          >
                            {check.passed ? "✓" : "✗"}
                          </span>
                          <div>
                            <span className="text-[var(--term-text-2)]">
                              {check.name}
                            </span>
                            <p className="text-[var(--term-text-3)]">
                              {check.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <p className="text-[10px] text-[var(--term-text-3)] uppercase tracking-wider mb-2">
                      Recommendations
                    </p>
                    <div className="space-y-1">
                      {result.recommendations.map((rec, i) => (
                        <p
                          key={i}
                          className={`text-[11px] ${
                            rec.startsWith("BLOCK")
                              ? "text-[var(--term-red)]"
                              : "text-[var(--term-text-2)]"
                          }`}
                        >
                          {rec}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-xs text-[var(--term-text-3)] mb-4">
            This runs the same compliance logic as the SDK — client-side, zero
            network calls.
          </p>
          <div className="flex justify-center gap-3">
            <Button size="sm" asChild>
              <Link href="/docs">Get Started</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://github.com/Legaci-Labs/kontext"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
