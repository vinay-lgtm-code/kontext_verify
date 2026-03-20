"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Clock,
  ShieldCheck,
  Check,
  Download,
  AlertTriangle,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TABS = ["Activity", "Screening", "Policies", "Evidence"] as const;
type Tab = (typeof TABS)[number];

const payments = [
  {
    status: "approved" as const,
    amount: "$5,200",
    currency: "USDC",
    rail: "Stablecoin · Base",
    railColor: "accent",
    initiator: "payment-agent-v1",
    initiatorType: "agent" as const,
    funding: "Circle Wallet",
    time: "2m ago",
  },
  {
    status: "review" as const,
    amount: "$28,000",
    currency: "USD",
    rail: "ACH",
    railColor: "muted",
    initiator: "J. Martinez",
    initiatorType: "human" as const,
    funding: "Treasury Account",
    time: "8m ago",
  },
  {
    status: "approved" as const,
    amount: "€4,150",
    currency: "EURC",
    rail: "Stablecoin · Ethereum",
    railColor: "accent",
    initiator: "settlement-v3",
    initiatorType: "agent" as const,
    funding: "Circle Wallet",
    time: "15m ago",
  },
  {
    status: "blocked" as const,
    amount: "$3,400",
    currency: "USD",
    rail: "Wire",
    railColor: "muted",
    initiator: "payout-scheduler",
    initiatorType: "system" as const,
    funding: "Bank Account ··4821",
    time: "22m ago",
  },
  {
    status: "approved" as const,
    amount: "£890",
    currency: "GBP",
    rail: "Card · Stripe",
    railColor: "purple",
    initiator: "invoice-agent",
    initiatorType: "agent" as const,
    funding: "Stripe Connect",
    time: "31m ago",
  },
];

const screeningResults = [
  {
    counterparty: "0xd8da...6045",
    counterpartyType: "Wallet address",
    rail: "USDC on Base",
    checks: [
      { name: "OFAC SDN", result: "Clear", status: "pass" as const, detail: "v2026.03.18 · 42ms" },
    ],
    digest: "#1,847",
  },
  {
    counterparty: "Meridian Logistics LLC",
    counterpartyType: "Business entity",
    rail: "ACH · Routing 0210...",
    checks: [
      { name: "OFAC SDN", result: "Clear", status: "pass" as const, detail: "Name + address match" },
      { name: "EDD", result: "Triggered", status: "warn" as const, detail: "$28K > $3K threshold" },
    ],
    digest: "#1,842",
  },
  {
    counterparty: "CloudVendor Inc.",
    counterpartyType: "Merchant",
    rail: "Card · Stripe",
    checks: [
      { name: "OFAC SDN", result: "Clear", status: "pass" as const, detail: "MCC 5734 · Low risk" },
    ],
    digest: "#1,839",
  },
];

const policies = [
  { name: "OFAC screening on all payments", scope: "All rails · All actors", status: "active" as const, usage: null },
  { name: "EDD review above $3,000", scope: "Stablecoin · ACH · Wire", status: "active" as const, usage: null },
  { name: "CTR filing threshold $10,000", scope: "All rails", status: "active" as const, usage: null },
  { name: "Daily volume limit $50,000/agent", scope: "Agent-initiated only", status: "warning" as const, usage: 64 },
  { name: "Manual approval for new payees", scope: "ACH · Wire · SEPA", status: "active" as const, usage: null },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: "approved" | "review" | "blocked" }) {
  const color =
    status === "approved"
      ? "bg-[var(--ic-green)]"
      : status === "review"
        ? "bg-[var(--ic-amber)]"
        : "bg-[var(--ic-red)]";
  return <span className={`h-2 w-2 flex-shrink-0 rounded-full ${color}`} />;
}

function InitiatorIcon({ type }: { type: "agent" | "human" | "system" }) {
  const cls = "h-3.5 w-3.5 text-[var(--ic-text-dim)]";
  if (type === "agent") return <Bot className={cls} />;
  if (type === "human") return <User className={cls} />;
  return <Clock className={cls} />;
}

function RailPill({ label, color }: { label: string; color: string }) {
  const bg =
    color === "accent"
      ? "bg-[var(--ic-accent)]/10 text-[var(--ic-accent)]"
      : color === "purple"
        ? "bg-purple-500/10 text-purple-400"
        : "bg-[var(--ic-text-dim)]/10 text-[var(--ic-text-dim)]";
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 font-mono text-[9px] font-medium ${bg}`}>
      {label}
    </span>
  );
}

function CheckBadge({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-[var(--ic-green-dim)] px-1.5 py-0.5">
        <Check className="h-3 w-3 text-[var(--ic-green)]" />
        <span className="font-mono text-[9px] font-semibold text-[var(--ic-green)]">Clear</span>
      </span>
    );
  if (status === "warn")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5">
        <AlertTriangle className="h-3 w-3 text-[var(--ic-amber)]" />
        <span className="font-mono text-[9px] font-semibold text-[var(--ic-amber)]">Triggered</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[var(--ic-red-dim)] px-1.5 py-0.5">
      <XCircle className="h-3 w-3 text-[var(--ic-red)]" />
      <span className="font-mono text-[9px] font-semibold text-[var(--ic-red)]">Flagged</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

function ActivityPanel() {
  return (
    <div className="space-y-0 divide-y divide-[var(--ic-border)]">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[auto_1fr_auto_1fr_1fr_auto] items-center gap-3 px-4 py-2">
        <span className="w-2" />
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Amount</span>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Rail</span>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Initiator</span>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Funding Source</span>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Time</span>
      </div>
      {payments.map((p, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_1fr_auto_1fr_1fr_auto] items-center gap-3 px-4 py-3"
        >
          <StatusDot status={p.status} />
          <div>
            <span className="text-[13px] font-semibold text-[var(--ic-text)]">{p.amount}</span>
            <span className="ml-1 text-[11px] text-[var(--ic-text-muted)]">{p.currency}</span>
          </div>
          <RailPill label={p.rail} color={p.railColor} />
          <div className="flex items-center gap-1.5 min-w-0">
            <InitiatorIcon type={p.initiatorType} />
            <span className="text-[12px] text-[var(--ic-text-muted)] truncate">{p.initiator}</span>
          </div>
          <span className="text-[12px] text-[var(--ic-text-dim)] truncate">{p.funding}</span>
          <span className="text-[11px] text-[var(--ic-text-dim)] whitespace-nowrap">{p.time}</span>
        </div>
      ))}
    </div>
  );
}

function ScreeningPanel() {
  return (
    <div className="space-y-3 p-4">
      {screeningResults.map((s, i) => (
        <div key={i} className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--ic-text)] truncate">{s.counterparty}</p>
              <p className="mt-0.5 text-[11px] text-[var(--ic-text-dim)]">
                {s.counterpartyType} · {s.rail}
              </p>
            </div>
            <span className="font-mono text-[9px] text-[var(--ic-text-dim)] whitespace-nowrap">
              Digest {s.digest}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {s.checks.map((c, j) => (
              <div key={j} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--ic-text-muted)]">{c.name}</span>
                  <CheckBadge status={c.status} />
                </div>
                <span className="text-[10px] text-[var(--ic-text-dim)]">{c.detail}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PoliciesPanel() {
  return (
    <div className="space-y-2 p-4">
      {policies.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--ic-text)]">{p.name}</p>
            <p className="mt-0.5 text-[10px] text-[var(--ic-text-dim)]">{p.scope}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {p.usage !== null ? (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 rounded-full bg-[var(--ic-surface-3)]">
                  <div
                    className="h-full rounded-full bg-[var(--ic-amber)]"
                    style={{ width: `${p.usage}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[var(--ic-amber)]">{p.usage}%</span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--ic-green-dim)] px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ic-green)]" />
                <span className="font-mono text-[9px] font-semibold text-[var(--ic-green)]">Active</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidencePanel() {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs font-medium text-[var(--ic-text)]">EXP-2026-03-19-001</p>
            <p className="mt-0.5 text-[11px] text-[var(--ic-text-dim)]">Mar 1 – Mar 19, 2026</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded bg-[var(--ic-green-dim)] px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--ic-green)]" />
            <span className="font-mono text-[9px] font-semibold text-[var(--ic-green)]">Chain Verified</span>
          </span>
        </div>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Payment decisions", value: "1,847" },
            { label: "Rails covered", value: "5", detail: "Stablecoin · ACH · Wire · Card · SEPA" },
            { label: "Initiator types", value: "3", detail: "Agent · Human · System" },
            { label: "Currencies", value: "4", detail: "USD · USDC · EURC · GBP" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-semibold text-[var(--ic-text)]">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--ic-text-dim)]">
                {stat.label}
              </p>
              {stat.detail && (
                <p className="mt-1 text-[9px] text-[var(--ic-text-dim)]">{stat.detail}</p>
              )}
            </div>
          ))}
        </div>

        {/* Digest + format */}
        <div className="mt-5 flex items-center justify-between border-t border-[var(--ic-border)] pt-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                Digest Chain
              </span>
              <p className="mt-0.5 text-[12px] text-[var(--ic-text-muted)]">1,847 links · Verified</p>
            </div>
            <div>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                Formats
              </span>
              <p className="mt-0.5 text-[12px] text-[var(--ic-text-muted)]">JSON · CSV</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ic-accent)]/20 bg-[var(--ic-accent-dim)] px-4 py-2 text-xs font-medium text-[var(--ic-accent)] transition-colors hover:bg-[var(--ic-accent)]/15">
            <Download className="h-3.5 w-3.5" />
            Export case packet
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PANELS: Record<Tab, () => JSX.Element> = {
  Activity: ActivityPanel,
  Screening: ScreeningPanel,
  Policies: PoliciesPanel,
  Evidence: EvidencePanel,
};

const CYCLE_MS = 4000;

export function ComplianceCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>("Activity");
  const [paused, setPaused] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Track cursor target position based on active tab button
  const updateCursorPos = useCallback((tab: Tab) => {
    const btn = tabRefs.current[tab];
    const container = containerRef.current;
    if (!btn || !container) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setCursorPos({
      x: btnRect.left - containerRect.left + btnRect.width / 2,
      y: btnRect.top - containerRect.top + btnRect.height / 2,
    });
  }, []);

  // Mount flag for SSR safety
  useEffect(() => {
    setMounted(true);
    // Initial cursor position
    requestAnimationFrame(() => updateCursorPos("Activity"));
  }, [updateCursorPos]);

  // Auto-cycle
  useEffect(() => {
    if (paused || !mounted) return;
    const id = setInterval(() => {
      setActiveTab((prev) => {
        const idx = TABS.indexOf(prev);
        const next = TABS[(idx + 1) % TABS.length]!;
        // Move cursor first, tab switches after cursor arrives
        updateCursorPos(next);
        return next;
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused, mounted, updateCursorPos]);

  // Update cursor when tab changes manually
  useEffect(() => {
    if (mounted) updateCursorPos(activeTab);
  }, [activeTab, mounted, updateCursorPos]);

  const Panel = PANELS[activeTab];

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] shadow-[0_0_60px_-15px_rgba(59,110,248,0.1)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-[var(--ic-border)] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[var(--ic-red)]" />
        <span className="h-3 w-3 rounded-full bg-[var(--ic-amber)]" />
        <span className="h-3 w-3 rounded-full bg-[var(--ic-green)]" />
        <span className="ml-2 font-mono text-[11px] font-medium text-[var(--ic-text-dim)]">
          Compliance Command Center
        </span>
      </div>

      {/* Tab bar */}
      <div className="relative flex border-b border-[var(--ic-border)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={(el) => { tabRefs.current[tab] = el; }}
            onClick={() => { setActiveTab(tab); setPaused(true); }}
            className={`relative px-5 py-3 text-[13px] font-medium transition-colors ${
              activeTab === tab
                ? "text-[var(--ic-accent)]"
                : "text-[var(--ic-text-muted)] hover:text-[var(--ic-text)]"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="ccc-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ic-accent)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="min-h-[340px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Panel />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Animated cursor — hidden on mobile / touch */}
      {mounted && (
        <motion.div
          className="pointer-events-none absolute z-50 hidden md:block"
          animate={{
            x: cursorPos.x - 6,
            y: cursorPos.y - 6,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <div className="h-3 w-3 rounded-full bg-[var(--ic-accent)] shadow-[0_0_12px_var(--ic-accent-glow)]" />
        </motion.div>
      )}
    </div>
  );
}
