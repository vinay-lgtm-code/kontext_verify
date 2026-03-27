"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "kontext_urgency_banner_dismissed";

export function UrgencyBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setDismissed(false);
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative flex items-center justify-center gap-2 bg-[var(--ic-accent)] px-4 py-2 text-center text-[12px] font-medium text-white sm:px-6">
      <span>
        TD Bank: $1.75B for BSA failures. Is your payment evidence examiner-ready?{" "}
        <Link href="/assessment" className="underline underline-offset-2 hover:no-underline">
          Score your gaps &rarr;
        </Link>
      </span>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(STORAGE_KEY, "1");
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 transition-colors hover:text-white"
        aria-label="Dismiss banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}
