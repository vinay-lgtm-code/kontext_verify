"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyInstallProps {
  command?: string;
  className?: string;
}

export function CopyInstall({
  command = "npx kontext init",
  className = "",
}: CopyInstallProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`group flex w-full max-w-md items-center justify-between rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-5 py-3.5 text-left transition-colors hover:border-[rgba(59,110,248,0.3)] hover:bg-[var(--ic-surface-2)] ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-mono">
        <span className="text-[var(--ic-accent)]">$</span>
        <span className="text-[var(--ic-text-muted)]">{command}</span>
      </div>
      <span className="text-[var(--ic-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <Check size={14} className="text-[var(--ic-accent)]" />
        ) : (
          <Copy size={14} />
        )}
      </span>
    </button>
  );
}
