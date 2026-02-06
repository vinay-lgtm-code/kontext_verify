"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { AuditPanel } from "@/components/audit-panel";

interface ActionEntry {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  digest?: string;
}

interface ChainData {
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
}

interface TrustScoreData {
  score: number;
  level: string;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
}

interface ComplianceData {
  compliant: boolean;
  riskLevel: string;
  checks: Array<{
    name: string;
    passed: boolean;
    description: string;
    severity: string;
  }>;
  recommendations: string[];
}

export default function DemoPage() {
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [chain, setChain] = useState<ChainData | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);

  const handleResponse = (data: {
    actions: ActionEntry[];
    chain: ChainData;
    trustScore: TrustScoreData;
    complianceResult: ComplianceData | null;
  }) => {
    setActions(data.actions);
    setChain(data.chain);
    setTrustScore(data.trustScore);
    if (data.complianceResult) {
      setCompliance(data.complianceResult);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#262626] bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">K</span>
            </div>
            <span className="text-sm font-semibold text-[#fafafa]">
              Kontext
            </span>
          </div>
          <div className="h-4 w-px bg-[#262626]" />
          <span className="text-xs text-[#71717a]">Interactive Demo</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#52525b]">
            <span className="px-1.5 py-0.5 rounded bg-[#111] border border-[#262626] font-mono">
              SHA-256
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#111] border border-[#262626] font-mono">
              OFAC
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#111] border border-[#262626] font-mono">
              GENIUS Act
            </span>
          </div>
          <a
            href="https://getkontext.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#71717a] hover:text-[#a1a1aa] transition-colors"
          >
            getkontext.com
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat (60%) */}
        <div className="w-[60%] min-w-0">
          <ChatPanel onResponse={handleResponse} />
        </div>

        {/* Right: Audit Trail (40%) */}
        <div className="w-[40%] min-w-0">
          <AuditPanel
            actions={actions}
            chain={chain}
            trustScore={trustScore}
            compliance={compliance}
          />
        </div>
      </div>
    </div>
  );
}
