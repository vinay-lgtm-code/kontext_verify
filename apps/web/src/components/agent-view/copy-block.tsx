"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyBlockProps {
  code: string;
  label?: string;
  className?: string;
}

export function CopyBlock({ code, label, className = "" }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`group flex w-full items-center justify-between rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--ic-accent)]/30 hover:bg-[var(--ic-surface-2)] ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-mono">
        {label && (
          <span className="text-[var(--ic-text-dim)] text-xs">{label}</span>
        )}
        <span className="text-[var(--ic-accent)]">$</span>
        <span className="text-[var(--ic-text-muted)]">{code}</span>
      </div>
      <span className="text-[var(--ic-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </span>
    </button>
  );
}
