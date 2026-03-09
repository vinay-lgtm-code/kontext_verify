"use client";

import { useState, useEffect } from "react";
import { AttemptRow } from "@/components/dashboard/attempt-row";
import type { Attempt } from "@/components/dashboard/attempt-row";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const STAGE_FILTERS = [
  "all", "intent", "authorize", "prepare", "transmit", "confirm", "recipient_credit", "reconcile", "retry_or_refund",
];

const STATE_FILTERS = ["all", "pending", "succeeded", "failed", "blocked", "review", "refunded"];

export default function AllAttemptsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({ format: "json" });
      if (stateFilter !== "all") params.set("state", stateFilter);
      try {
        const res = await fetch(`${API_URL}/v1/export/attempts?${params}`);
        const data = await res.json();
        setAttempts(data.attempts ?? []);
      } catch {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [stateFilter]);

  const filtered = stageFilter === "all"
    ? attempts
    : attempts.filter((a) => {
        const lastStage = a.stageEvents.length > 0
          ? a.stageEvents[a.stageEvents.length - 1]!.stage
          : "intent";
        return lastStage === stageFilter;
      });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#4ade80]">$</span>
        <h1 className="text-sm font-bold tracking-wider uppercase">All Attempts</h1>
        <span className="text-xs text-[#71717a]">{filtered.length} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717a]">Stage:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] text-xs text-[#fafafa] px-2 py-1"
          >
            {STAGE_FILTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717a]">State:</span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] text-xs text-[#fafafa] px-2 py-1"
          >
            {STATE_FILTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-xs text-[#71717a]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="border border-[#27272a] bg-[#18181b] p-8 text-center text-xs text-[#71717a]">
          No attempts match current filters.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((a) => (
            <AttemptRow key={a.attemptId} attempt={a} />
          ))}
        </div>
      )}
    </div>
  );
}
