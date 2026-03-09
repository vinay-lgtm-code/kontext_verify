"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import type { Attempt } from "@/components/dashboard/attempt-row";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function HealthPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/v1/export/attempts?format=json`);
        const data = await res.json();
        setAttempts(data.attempts ?? []);
      } catch {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = attempts.length;
  const succeeded = attempts.filter((a) => a.finalState === "succeeded").length;
  const failed = attempts.filter((a) => a.finalState === "failed" || a.finalState === "blocked").length;
  const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;
  const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;

  // Chain breakdown
  const byChain: Record<string, { total: number; failed: number }> = {};
  for (const a of attempts) {
    if (!byChain[a.chain]) byChain[a.chain] = { total: 0, failed: 0 };
    byChain[a.chain]!.total++;
    if (a.finalState === "failed" || a.finalState === "blocked") byChain[a.chain]!.failed++;
  }

  // Archetype breakdown
  const byArchetype: Record<string, { total: number; failed: number }> = {};
  for (const a of attempts) {
    if (!byArchetype[a.archetype]) byArchetype[a.archetype] = { total: 0, failed: 0 };
    byArchetype[a.archetype]!.total++;
    if (a.finalState === "failed" || a.finalState === "blocked") byArchetype[a.archetype]!.failed++;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#4ade80]">$</span>
        <h1 className="text-sm font-bold tracking-wider uppercase">Health</h1>
      </div>

      {loading ? (
        <div className="text-xs text-[#71717a]">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Attempts" value={total} />
            <StatCard label="Success Rate" value={`${successRate}%`} color={successRate >= 95 ? "green" : successRate >= 80 ? "amber" : "red"} />
            <StatCard label="Failure Rate" value={`${failureRate}%`} color={failureRate === 0 ? "green" : failureRate < 5 ? "amber" : "red"} />
            <StatCard label="Succeeded" value={succeeded} color="green" />
          </div>

          {/* Chain health */}
          <div className="border border-[#27272a] bg-[#18181b] p-4 mb-4">
            <div className="text-xs text-[#71717a] uppercase tracking-wider mb-3">By Chain</div>
            {Object.keys(byChain).length === 0 ? (
              <div className="text-xs text-[#71717a]">No data</div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(byChain).map(([chain, stats]) => (
                  <div key={chain} className="flex items-center justify-between text-xs">
                    <span className="text-[#fafafa]">{chain}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[#a1a1aa]">{stats.total} attempts</span>
                      <span className={stats.failed > 0 ? "text-[#f87171]" : "text-[#4ade80]"}>
                        {stats.failed} failed
                      </span>
                      <span className="text-[#71717a]">
                        {stats.total > 0 ? Math.round(((stats.total - stats.failed) / stats.total) * 100) : 0}% success
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Archetype health */}
          <div className="border border-[#27272a] bg-[#18181b] p-4">
            <div className="text-xs text-[#71717a] uppercase tracking-wider mb-3">By Archetype</div>
            {Object.keys(byArchetype).length === 0 ? (
              <div className="text-xs text-[#71717a]">No data</div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(byArchetype).map(([arch, stats]) => (
                  <div key={arch} className="flex items-center justify-between text-xs">
                    <span className="text-[#fafafa]">{arch}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[#a1a1aa]">{stats.total} attempts</span>
                      <span className={stats.failed > 0 ? "text-[#f87171]" : "text-[#4ade80]"}>
                        {stats.failed} failed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
