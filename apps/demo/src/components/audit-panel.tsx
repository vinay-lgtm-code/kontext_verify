"use client";

import { ActionLog } from "./action-log";
import { DigestChain } from "./digest-chain";
import { TrustGauge } from "./trust-gauge";

interface AuditPanelProps {
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
  } | null;
  trustScore: {
    score: number;
    level: string;
    factors: Array<{
      name: string;
      score: number;
      weight: number;
      description: string;
    }>;
  } | null;
  compliance: {
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
}

export function AuditPanel({
  actions,
  chain,
  trustScore,
  compliance,
}: AuditPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-[#262626]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#262626] bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#fafafa]">
              Kontext Audit Trail
            </h2>
            <p className="text-[9px] text-[#71717a]">
              Real-time tamper-evident logging
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Action Log */}
        <div className="border-b border-[#262626]" style={{ minHeight: "240px" }}>
          <ActionLog actions={actions} />
        </div>

        {/* Digest Chain */}
        <div className="border-b border-[#262626]" style={{ minHeight: "200px" }}>
          <DigestChain chain={chain} />
        </div>

        {/* Trust & Compliance */}
        <div style={{ minHeight: "240px" }}>
          <TrustGauge trustScore={trustScore} compliance={compliance} />
        </div>
      </div>
    </div>
  );
}
