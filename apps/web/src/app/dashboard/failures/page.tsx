"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttemptRow } from "@/components/dashboard/attempt-row";
import type { Attempt } from "@/components/dashboard/attempt-row";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function FailuresPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"stage" | "chain" | "archetype">("stage");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/v1/export/attempts?format=json`);
        const data = await res.json();
        setAttempts(
          (data.attempts ?? []).filter(
            (a: Attempt) => a.finalState === "failed" || a.finalState === "blocked"
          )
        );
      } catch {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Group failures
  function groupAttempts(key: "stage" | "chain" | "archetype"): Record<string, Attempt[]> {
    const groups: Record<string, Attempt[]> = {};
    for (const a of attempts) {
      let groupKey: string;
      if (key === "stage") {
        const failedEvent = a.stageEvents.find((e) => e.status === "failed");
        groupKey = failedEvent?.stage ?? "unknown";
      } else {
        groupKey = a[key];
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey]!.push(a);
    }
    return groups;
  }

  const groups = groupAttempts(groupBy);
  const blocked = attempts.filter((a) => a.finalState === "blocked").length;
  const failed = attempts.filter((a) => a.finalState === "failed").length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#4ade80]">$</span>
        <h1 className="text-sm font-bold tracking-wider uppercase">Failures</h1>
        <span className="text-xs text-[#71717a]">{attempts.length} total</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Blocked (policy)" value={blocked} color={blocked > 0 ? "red" : "default"} />
        <StatCard label="Failed (delivery)" value={failed} color={failed > 0 ? "red" : "default"} />
        <StatCard label="Failure Rate" value={attempts.length > 0 ? "—" : "0%"} color="default" subtext="Requires total count" />
      </div>

      {/* Group by selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[#71717a]">Group by:</span>
        {(["stage", "chain", "archetype"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            className={`px-3 py-1 text-xs border transition-colors ${
              groupBy === g
                ? "border-[#4ade80] text-[#4ade80] bg-[rgba(74,222,128,0.1)]"
                : "border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-xs text-[#71717a]">Loading...</div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="border border-[#27272a] bg-[#18181b] p-8 text-center">
          <div className="text-[#4ade80] text-sm mb-2">No failures</div>
          <div className="text-xs text-[#71717a]">All payments processed successfully.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(groups).map(([key, items]) => (
            <div key={key}>
              <div className="text-xs text-[#71717a] uppercase tracking-wider mb-2">
                {groupBy}: {key} ({items.length})
              </div>
              <div className="flex flex-col gap-1">
                {items.map((a) => (
                  <AttemptRow key={a.attemptId} attempt={a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
