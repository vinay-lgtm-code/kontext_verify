"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyInstallProps {
  command?: string;
  className?: string;
}

export function CopyInstall({
  command = "npm install kontext-sdk",
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
      className={`group flex w-full max-w-md items-center justify-between border border-[var(--term-green)] bg-[var(--term-surface)] px-5 py-3.5 text-left transition-colors hover:bg-[var(--term-surface-2)] ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-mono">
        <span className="text-[var(--term-green)]">$</span>
        <span className="text-[var(--term-text-2)]">{command}</span>
      </div>
      <span className="text-[var(--term-text-3)] opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <Check size={14} className="text-[var(--term-green)]" />
        ) : (
          <Copy size={14} />
        )}
      </span>
    </button>
  );
}
