"use client";

import { useState, useEffect } from "react";
import { AttemptRow } from "@/components/dashboard/attempt-row";
import { StatCard } from "@/components/dashboard/stat-card";
import type { Attempt } from "@/components/dashboard/attempt-row";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Attention-only states
const ACTION_STATES = ["blocked", "review", "failed", "refunded"];

export default function NeedsActionPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/v1/export/attempts?format=json`);
        const data = await res.json();
        setAttempts(
          (data.attempts ?? []).filter((a: Attempt) =>
            ACTION_STATES.includes(a.finalState)
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

  const blocked = attempts.filter((a) => a.finalState === "blocked");
  const review = attempts.filter((a) => a.finalState === "review");
  const failed = attempts.filter((a) => a.finalState === "failed");
  const refunded = attempts.filter((a) => a.finalState === "refunded");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#4ade80]">$</span>
        <h1 className="text-sm font-bold tracking-wider uppercase">Needs Action</h1>
        <span className="text-xs text-[#71717a]">
          {attempts.length} item{attempts.length !== 1 ? "s" : ""} requiring attention
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Blocked" value={blocked.length} color={blocked.length > 0 ? "red" : "default"} subtext="Policy violations" />
        <StatCard label="Review" value={review.length} color={review.length > 0 ? "amber" : "default"} subtext="Awaiting approval" />
        <StatCard label="Failed" value={failed.length} color={failed.length > 0 ? "red" : "default"} subtext="Delivery failures" />
        <StatCard label="Refunded" value={refunded.length} color={refunded.length > 0 ? "blue" : "default"} subtext="Returned payments" />
      </div>

      {/* Attempt list */}
      {loading ? (
        <div className="text-xs text-[#71717a]">Loading...</div>
      ) : attempts.length === 0 ? (
        <div className="border border-[#27272a] bg-[#18181b] p-8 text-center">
          <div className="text-[#4ade80] text-sm mb-2">All clear</div>
          <div className="text-xs text-[#71717a]">No payment attempts require attention right now.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {attempts.map((a) => (
            <AttemptRow key={a.attemptId} attempt={a} />
          ))}
        </div>
      )}
    </div>
  );
}
