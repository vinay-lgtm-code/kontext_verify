"use client";

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

function truncateHash(hash: string): string {
  if (!hash || hash.length < 16) return hash || "---";
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

export function DigestChain({ chain }: { chain: ChainData | null }) {
  if (!chain) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#262626]">
          <svg
            className="w-3.5 h-3.5 text-[#a1a1aa]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
            Digest Chain
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-[#71717a] text-xs">
          No chain data yet
        </div>
      </div>
    );
  }

  const displayLinks = chain.links.slice(-5);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#262626]">
        <svg
          className="w-3.5 h-3.5 text-[#a1a1aa]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
          Digest Chain
        </h3>
        <span className="ml-auto text-[10px] font-mono text-[#71717a]">
          {chain.length} links
        </span>
      </div>

      <div className="flex-1 px-4 py-3 overflow-y-auto">
        {/* Verified badge */}
        <div className="flex items-center gap-2 mb-3">
          {chain.verified ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)]">
              <svg
                className="w-3 h-3 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-[10px] font-semibold text-green-400">
                CHAIN VERIFIED
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)]">
              <span className="text-[10px] font-semibold text-red-400">
                CHAIN UNVERIFIED
              </span>
            </div>
          )}
          <span className="text-[9px] text-[#71717a]">
            {chain.linksVerified}/{chain.length} verified
          </span>
        </div>

        {/* Chain visualization */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {chain.length > 5 && (
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-7 h-7 rounded bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                <span className="text-[8px] font-mono text-[#71717a]">
                  H0
                </span>
              </div>
              <span className="text-[#52525b] text-xs font-mono">...</span>
            </div>
          )}

          {displayLinks.map((link, i) => {
            const isTerminal = i === displayLinks.length - 1;
            const isLast = i === displayLinks.length - 1;
            return (
              <div key={link.sequence} className="flex items-center gap-1 shrink-0">
                {i > 0 && (
                  <svg
                    className="w-3 h-3 text-green-500/60 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                <div
                  className={`relative px-2 py-1.5 rounded border transition-all ${
                    isTerminal
                      ? "bg-[rgba(34,197,94,0.1)] border-green-500/40 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                      : "bg-[#1a1a1a] border-[#333]"
                  } ${isLast ? "animate-chain-link" : ""}`}
                >
                  <div className="text-[8px] font-mono text-[#71717a] mb-0.5">
                    H{link.sequence}
                  </div>
                  <div
                    className={`text-[9px] font-mono ${
                      isTerminal ? "text-green-400" : "text-[#a1a1aa]"
                    }`}
                  >
                    {truncateHash(link.digest)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminal Digest */}
        <div className="mt-3 px-3 py-2 rounded-lg bg-[#111] border border-[#262626]">
          <div className="text-[9px] text-[#71717a] uppercase tracking-wider mb-1">
            Terminal Digest
          </div>
          <div className="text-[10px] font-mono text-green-400 break-all leading-relaxed">
            {chain.terminalDigest || "---"}
          </div>
        </div>
      </div>
    </div>
  );
}
