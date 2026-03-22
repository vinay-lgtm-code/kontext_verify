"use client";

import { Download, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import { track } from "@/lib/analytics";

interface PaymentDecisionPacketProps {
  variant?: "full" | "compact";
  className?: string;
}

function StatusBadge({
  status,
  label,
}: {
  status: "pass" | "warn";
  label: string;
}) {
  const color =
    status === "pass"
      ? {
          bg: "bg-[var(--ic-green-dim)]",
          text: "text-[var(--ic-green)]",
          dot: "bg-[var(--ic-green)]",
        }
      : {
          bg: "bg-amber-500/10",
          text: "text-[var(--ic-amber)]",
          dot: "bg-[var(--ic-amber)]",
        };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${color.bg}`}
    >
      {status === "pass" ? (
        <Check className={`h-3 w-3 ${color.text}`} />
      ) : (
        <AlertTriangle className={`h-3 w-3 ${color.text}`} />
      )}
      <span
        className={`font-mono text-[9px] font-semibold uppercase tracking-wider ${color.text}`}
      >
        {label}
      </span>
    </span>
  );
}

export function PaymentDecisionPacket({
  variant = "full",
  className = "",
}: PaymentDecisionPacketProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] shadow-[0_0_60px_-15px_rgba(59,110,248,0.1)] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--ic-border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={16} className="text-[var(--ic-green)]" />
          <span className="font-mono text-xs font-medium text-[var(--ic-text)]">
            Payment Decision Packet
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded bg-[var(--ic-green-dim)] px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ic-green)]" />
          <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--ic-green)]">
            Compliant
          </span>
        </span>
      </div>

      <div className="space-y-5 p-6">
        {/* 1. Payment Summary */}
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
            Payment Summary
          </span>
          <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-[var(--ic-text-dim)]">Amount</p>
              <p className="text-[15px] font-semibold text-[var(--ic-text)]">
                $48,200 USDC
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--ic-text-dim)]">Type</p>
              <p className="text-[15px] font-medium text-[var(--ic-text)]">
                Vendor payout
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--ic-text-dim)]">Corridor</p>
              <p className="text-[15px] font-medium text-[var(--ic-text)]">
                US → EU (Base)
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--ic-text-dim)]">
                Timestamp
              </p>
              <p className="text-[15px] font-medium text-[var(--ic-text)]">
                2026-03-21 09:14 UTC
              </p>
            </div>
          </div>
        </div>

        {/* 2. Initiation Source */}
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
            Initiation Source
          </span>
          <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-[var(--ic-text-dim)]">
                Initiator type
              </p>
              <p className="text-[15px] font-medium text-[var(--ic-text)]">
                AI agent
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--ic-text-dim)]">Agent ID</p>
              <p className="font-mono text-[13px] font-medium text-[var(--ic-text)]">
                treasury-rebalancer-v2
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--ic-text-dim)]">
                Instruction ref
              </p>
              <p className="font-mono text-[13px] font-medium text-[var(--ic-text)]">
                payout batch #A-449
              </p>
            </div>
          </div>
        </div>

        {/* 3. Policy Checks */}
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
            Policy Checks
          </span>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between rounded-md border border-[var(--ic-border)] bg-[hsl(var(--background))] px-3 py-2">
              <span className="text-[12px] text-[var(--ic-text-muted)]">
                Counterparty allowed
              </span>
              <StatusBadge status="pass" label="Passed" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--ic-border)] bg-[hsl(var(--background))] px-3 py-2">
              <span className="text-[12px] text-[var(--ic-text-muted)]">
                Threshold exceeded → dual approval required
              </span>
              <StatusBadge status="warn" label="Triggered" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--ic-border)] bg-[hsl(var(--background))] px-3 py-2">
              <span className="text-[12px] text-[var(--ic-text-muted)]">
                Daily volume limit
              </span>
              <StatusBadge status="pass" label="Within limit" />
            </div>
          </div>
        </div>

        {/* 3. Sanctions Screening */}
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
            Sanctions Screening
          </span>
          <div className="mt-2 rounded-md border border-[var(--ic-border)] bg-[hsl(var(--background))] px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--ic-text-muted)]">
                OFAC/SDN check
              </span>
              <StatusBadge status="pass" label="Clear" />
            </div>
            <p className="mt-1 font-mono text-[10px] text-[var(--ic-text-dim)]">
              SDN v2026.03.21 · Checked at 09:14:02 UTC · 38ms
            </p>
          </div>
        </div>

        {!isCompact && (
          <>
            {/* 4. Approval Chain */}
            <div>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                Approval Chain
              </span>
              <div className="mt-2 flex items-center gap-2">
                {[
                  { role: "Treasury Ops", time: "09:12" },
                  { role: "Compliance", time: "09:13" },
                  { role: "Execution", time: "09:14" },
                ].map((step, i) => (
                  <div key={step.role} className="flex items-center gap-2">
                    <div className="rounded-md border border-[var(--ic-green)]/20 bg-[var(--ic-green-dim)] px-2.5 py-1.5">
                      <p className="text-[11px] font-medium text-[var(--ic-text)]">
                        {step.role}
                      </p>
                      <p className="font-mono text-[9px] text-[var(--ic-text-dim)]">
                        {step.time} UTC
                      </p>
                    </div>
                    {i < 2 && (
                      <span className="text-[var(--ic-text-dim)]">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Evidence Hash */}
            <div>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                Evidence Integrity
              </span>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-[var(--ic-text-dim)]">
                    Digest chain position
                  </p>
                  <p className="text-[13px] font-medium text-[var(--ic-text)]">
                    #2,341 — chain verified
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--ic-text-dim)]">
                    Content hash
                  </p>
                  <p className="font-mono text-[11px] text-[var(--ic-text-muted)]">
                    sha256:a4f2c8...7e1d3b
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Metadata chips */}
      <div className="flex flex-wrap gap-2 border-t border-[var(--ic-border)] px-6 py-3">
        {["immutable log", "policy version", "screened", "initiation source", "exportable"].map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full border border-[var(--ic-border)] px-2.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--ic-text-dim)]"
            >
              {chip}
            </span>
          )
        )}
      </div>

      {/* Export Actions */}
      {!isCompact && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--ic-border)] px-6 py-3">
          {[
            "Examiner packet",
            "Partner diligence",
            "Incident review",
          ].map((label) => (
            <button
              key={label}
              onClick={() =>
                track("packet_export_click", { export_type: label })
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ic-accent)]/20 bg-[var(--ic-accent-dim)] px-3 py-1.5 text-[11px] font-medium text-[var(--ic-accent)] transition-colors hover:bg-[var(--ic-accent)]/15"
            >
              <Download size={12} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
