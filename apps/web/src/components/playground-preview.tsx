"use client";

import { useState } from "react";
import Link from "next/link";
import {
  checkCompliance,
  isBlockchainAddress,
  type ComplianceResult,
} from "@/lib/compliance-checker";

export function PlaygroundPreview() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ComplianceResult | null>(null);

  const handleVerify = () => {
    if (!query) return;
    const isAddress = isBlockchainAddress(query);
    const res = checkCompliance({
      from: isAddress
        ? "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68"
        : "Acme Corp",
      to: query,
      amount: "1000",
      ...(isAddress ? { chain: "base", token: "USDC" } : { currency: "USD" }),
    });
    setResult(res);
  };

  const tryExample = (val: string) => {
    setQuery(val);
    setResult(null);
  };

  return (
    <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)]">
      <div className="border-b border-[var(--term-surface-2)] px-4 py-2 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-red)] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-amber)] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-green)] opacity-60" />
        <span className="text-xs text-[var(--term-text-3)] font-mono ml-2">
          playground
        </span>
      </div>
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerify();
            }}
            placeholder="Wallet address or entity name..."
            className="flex-1 border border-[var(--term-surface-2)] bg-background px-3 py-2 text-sm font-mono text-[var(--term-text-2)] placeholder:text-[var(--term-text-3)] focus:border-[var(--term-green)] focus:outline-none"
          />
          <button
            onClick={handleVerify}
            disabled={!query}
            className="border border-[var(--term-green)] bg-transparent px-4 py-2 text-xs text-[var(--term-green)] font-mono hover:bg-[var(--term-green)] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            verify()
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() =>
              tryExample("0x388C818CA8B9251b393131C08a736A67ccB19297")
            }
            className="text-[10px] text-[var(--term-text-3)] hover:text-[var(--term-green)] transition-colors"
          >
            Try clean address
          </button>
          <span className="text-[var(--term-surface-3)]">&middot;</span>
          <button
            onClick={() =>
              tryExample("0x098B716B8Aaf21512996dC57EB0615e2383E2f96")
            }
            className="text-[10px] text-[var(--term-text-3)] hover:text-[var(--term-red)] transition-colors"
          >
            Try sanctioned address
          </button>
          <span className="text-[var(--term-surface-3)]">&middot;</span>
          <button
            onClick={() => tryExample("Lazarus Group")}
            className="text-[10px] text-[var(--term-text-3)] hover:text-[var(--term-red)] transition-colors"
          >
            Try sanctioned entity
          </button>
        </div>

        <div className="min-h-[60px]">
          {result ? (
            <div className="border-t border-[var(--term-surface-2)] pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={result.compliant ? "led-green" : "led-red"}
                  />
                  <span
                    className={`text-sm font-medium ${
                      result.compliant
                        ? "text-[var(--term-green)]"
                        : "text-[var(--term-red)]"
                    }`}
                  >
                    {result.compliant ? "Compliant" : "Blocked"}
                  </span>
                  <span className="text-[11px] text-[var(--term-text-3)]">
                    {result.checks.filter((c) => c.passed).length}/
                    {result.checks.length} checks passed
                  </span>
                  <span className="text-[11px] text-[var(--term-text-3)]">
                    Risk: {result.riskLevel}
                  </span>
                </div>
                <Link
                  href="/playground"
                  className="text-[11px] text-[var(--term-blue)] hover:underline hidden sm:inline"
                >
                  Full playground &rarr;
                </Link>
              </div>

              {/* Individual check details */}
              <div className="mt-3 space-y-1">
                {result.checks.slice(0, 4).map((check, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span
                      className={
                        check.passed
                          ? "text-[var(--term-green)]"
                          : "text-[var(--term-red)]"
                      }
                    >
                      {check.passed ? "\u2713" : "\u2717"}
                    </span>
                    <span className="text-[var(--term-text-3)]">
                      {check.name}
                    </span>
                  </div>
                ))}
                {result.checks.length > 4 && (
                  <span className="text-[10px] text-[var(--term-text-3)]">
                    +{result.checks.length - 4} more checks
                  </span>
                )}
              </div>

              <Link
                href="/playground"
                className="text-[11px] text-[var(--term-blue)] hover:underline mt-3 inline-block sm:hidden"
              >
                Full playground &rarr;
              </Link>
            </div>
          ) : (
            <div className="text-right">
              <Link
                href="/playground"
                className="text-[11px] text-[var(--term-blue)] hover:underline"
              >
                Full playground &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
