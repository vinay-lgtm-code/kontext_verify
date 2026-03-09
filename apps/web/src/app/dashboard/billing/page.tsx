"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/stat-card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const FREE_LIMIT = 20_000;
const RATE_PER_1K = 2.0;

export default function BillingPage() {
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/v1/export/attempts?format=json`);
        const data = await res.json();
        setTotalAttempts(data.total ?? 0);
      } catch {
        setTotalAttempts(0);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const overage = Math.max(0, totalAttempts - FREE_LIMIT);
  const cost = (overage / 1000) * RATE_PER_1K;
  const utilization = Math.min(100, Math.round((totalAttempts / FREE_LIMIT) * 100));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#4ade80]">$</span>
        <h1 className="text-sm font-bold tracking-wider uppercase">Usage & Billing</h1>
      </div>

      {loading ? (
        <div className="text-xs text-[#71717a]">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Events This Period" value={totalAttempts.toLocaleString()} color="green" />
            <StatCard label="Free Tier Limit" value={FREE_LIMIT.toLocaleString()} subtext="events/month" />
            <StatCard label="Overage" value={overage.toLocaleString()} color={overage > 0 ? "amber" : "default"} subtext={overage > 0 ? `${overage} events beyond free tier` : "Within free tier"} />
            <StatCard label="Projected Cost" value={`$${cost.toFixed(2)}`} color={cost > 0 ? "amber" : "green"} subtext={cost > 0 ? `$${RATE_PER_1K}/1K events` : "Free"} />
          </div>

          {/* Utilization bar */}
          <div className="border border-[#27272a] bg-[#18181b] p-4 mb-6">
            <div className="flex justify-between text-xs text-[#71717a] mb-2">
              <span>Plan Utilization</span>
              <span>{utilization}%</span>
            </div>
            <div className="h-2 bg-[#27272a] w-full">
              <div
                className="h-2 transition-all duration-500"
                style={{
                  width: `${Math.min(utilization, 100)}%`,
                  backgroundColor: utilization >= 90 ? "#f87171" : utilization >= 70 ? "#fbbf24" : "#4ade80",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#71717a] mt-2">
              <span>0</span>
              <span>{FREE_LIMIT.toLocaleString()} events</span>
            </div>
          </div>

          {/* Pricing info */}
          <div className="border border-[#27272a] bg-[#18181b] p-4">
            <div className="text-xs text-[#71717a] uppercase tracking-wider mb-3">Pricing</div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#a1a1aa]">Free tier</span>
                <span className="text-[#4ade80]">20,000 events/mo — $0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a1a1aa]">Pay-as-you-go</span>
                <span className="text-[#fafafa]">$2.00 / 1,000 events after free tier</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a1a1aa]">Multi-chain unlock</span>
                <span className="text-[#fafafa]">After $5 cumulative spend</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
