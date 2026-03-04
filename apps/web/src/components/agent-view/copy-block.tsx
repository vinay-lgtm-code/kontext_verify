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
      className={`group flex w-full items-center justify-between border border-[var(--term-surface-2)] bg-[var(--term-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--term-green)] hover:bg-[var(--term-surface-2)] ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-mono">
        {label && (
          <span className="text-[var(--term-text-3)] text-xs">{label}</span>
        )}
        <span className="text-[var(--term-green)]">$</span>
        <span className="text-[var(--term-text-2)]">{code}</span>
      </div>
      <span className="text-[var(--term-text-3)] opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </span>
    </button>
  );
}
