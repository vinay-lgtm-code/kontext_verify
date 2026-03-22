"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Loader2,
  Send,
  X,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { AssessmentScores, Responses } from "@/lib/assessment-engine";
import { tierLabels, tierColors } from "@/lib/assessment-engine";
import type { Findings, PacketFieldStatus } from "@/lib/assessment-findings";
import { track } from "@/lib/analytics";

interface AssessmentResultsProps {
  scores: AssessmentScores;
  findings: Findings;
  responses: Responses;
}

interface AiSummary {
  bluntSummary: string;
  narrativeExplanation: string;
}

const subScoreLabels: { key: keyof AssessmentScores["subScores"]; label: string }[] = [
  { key: "decisionTraceability", label: "Decision Traceability" },
  { key: "reviewerReadiness", label: "Reviewer Readiness" },
  { key: "operationalResilience", label: "Operational Resilience" },
  { key: "automationControls", label: "Automation Controls" },
];

function getSubScoreColor(score: number): string {
  if (score >= 70) return "var(--ic-green)";
  if (score >= 40) return "var(--ic-amber)";
  return "var(--ic-red)";
}

function PacketPreview({ fields }: { fields: PacketFieldStatus[] }) {
  return (
    <div className="space-y-1.5">
      {fields.map((f) => {
        const statusConfig = {
          present: {
            bg: "bg-[var(--ic-green)]/10",
            border: "border-[var(--ic-green)]/20",
            icon: <Check size={14} className="text-[var(--ic-green)]" />,
            label: "Present",
            labelColor: "text-[var(--ic-green)]",
          },
          partial: {
            bg: "bg-amber-500/10",
            border: "border-[var(--ic-amber)]/20",
            icon: <AlertTriangle size={14} className="text-[var(--ic-amber)]" />,
            label: "Partial",
            labelColor: "text-[var(--ic-amber)]",
          },
          missing: {
            bg: "bg-[var(--ic-red)]/10",
            border: "border-[var(--ic-red)]/20",
            icon: <XCircle size={14} className="text-[var(--ic-red)]" />,
            label: "Missing",
            labelColor: "text-[var(--ic-red)]",
          },
        };
        const cfg = statusConfig[f.status];

        return (
          <div
            key={f.field}
            className={`flex items-center justify-between rounded-md border ${cfg.border} ${cfg.bg} px-3 py-2`}
          >
            <div className="flex items-center gap-2">
              {cfg.icon}
              <span className="text-[13px] text-[var(--ic-text-muted)]">
                {f.field}
                {f.conditional && (
                  <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--ic-text-dim)]">
                    Agent flows
                  </span>
                )}
              </span>
            </div>
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${cfg.labelColor}`}>
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AssessmentResults({
  scores,
  findings,
  responses,
}: AssessmentResultsProps) {
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmails, setShareEmails] = useState(["", ""]);
  const [shareStatus, setShareStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Track completion
  useEffect(() => {
    track("assessment_completed", {
      tier: scores.overallTier,
      score: String(scores.overallScore),
      role: scores.persona.role ?? "",
      company_type: scores.persona.companyType ?? "",
      depth: scores.persona.depth ?? "",
    });
  }, [scores]);

  // Score count-up animation
  useEffect(() => {
    const target = scores.overallScore;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplayScore(Math.round(eased * target));
      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [scores.overallScore]);

  // Fetch AI narrative summary
  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      try {
        const res = await fetch("/api/assessment/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores, findings, responses }),
        });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (!cancelled) setAiSummary(data);
      } catch {
        if (!cancelled) {
          setAiSummary({
            bluntSummary: findings.bluntSummary,
            narrativeExplanation: "",
          });
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [scores, findings, responses]);

  const tierColor = tierColors[scores.overallTier];

  const handleShare = async () => {
    const validEmails = shareEmails.filter((e) => e.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
    if (validEmails.length === 0) return;

    setShareStatus("sending");
    track("assessment_results_shared", { tier: scores.overallTier });
    try {
      const res = await fetch("/api/assessment/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: validEmails.map((e) => e.trim()),
          scores,
          findings,
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      setShareStatus("sent");
    } catch {
      setShareStatus("error");
    }
  };

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.08, duration: 0.35 },
  });

  const applicableSubScores = subScoreLabels.filter(
    ({ key }) => scores.subScores[key] !== undefined
  );

  return (
    <div className="space-y-7 px-7 py-7">
      {/* 1. Blunt summary */}
      <motion.div {...stagger(0)}>
        <p className="text-[16px] font-medium leading-relaxed text-[var(--ic-text)]">
          {findings.bluntSummary}
        </p>
      </motion.div>

      {/* 2. Tier badge + score + sub-scores */}
      <motion.div {...stagger(1)}>
        <div className="flex flex-col items-center rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-6 py-6">
          {/* Share button - top right */}
          <div className="flex w-full justify-end">
            <button
              onClick={() => { setShareOpen(!shareOpen); setShareStatus("idle"); }}
              className="flex items-center gap-1.5 rounded-md border border-[var(--ic-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)]"
            >
              <Send size={12} />
              Share
            </button>
          </div>

          <span
            className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[2px]"
            style={{ color: tierColor, backgroundColor: `color-mix(in srgb, ${tierColor} 10%, transparent)` }}
          >
            {tierLabels[scores.overallTier]}
          </span>
          <span
            className="mt-2 text-[48px] font-bold leading-none"
            style={{ color: tierColor }}
          >
            {displayScore}
          </span>
          <span className="mt-1 text-[13px] text-[var(--ic-text-dim)]">
            out of 100
          </span>
        </div>

        {/* Sub-scores */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {applicableSubScores.map(({ key, label }) => {
            const val = scores.subScores[key]!;
            const color = getSubScoreColor(val);
            return (
              <div
                key={key}
                className="rounded-lg border border-[var(--ic-border)] p-3"
              >
                <span className="text-[11px] font-medium text-[var(--ic-text-muted)]">
                  {label}
                </span>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-[24px] font-bold" style={{ color }}>
                    {val}
                  </span>
                  <span className="text-[12px] text-[var(--ic-text-dim)]">/ 100</span>
                </div>
                <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--ic-border)]">
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{ width: `${val}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline share form */}
        <AnimatePresence>
          {shareOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface-2)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[12px] font-medium text-[var(--ic-text-muted)]">
                      Email this readiness summary
                    </span>
                    <p className="text-[11px] text-[var(--ic-text-dim)]">
                      Includes blockers, missing artifacts, and remediation plan.
                    </p>
                  </div>
                  <button
                    onClick={() => setShareOpen(false)}
                    className="rounded p-0.5 text-[var(--ic-text-dim)] hover:text-[var(--ic-text)]"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {shareEmails.map((email, i) => (
                    <input
                      key={i}
                      type="email"
                      placeholder={i === 0 ? "colleague@company.com" : "Optional second email"}
                      value={email}
                      onChange={(e) => {
                        const next = [...shareEmails];
                        next[i] = e.target.value;
                        setShareEmails(next);
                      }}
                      className="w-full rounded-md border border-[var(--ic-border)] bg-[var(--ic-surface)] px-3 py-2 text-[13px] text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] focus:border-[var(--ic-accent)] focus:outline-none"
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleShare}
                    disabled={shareStatus === "sending" || shareEmails.every((e) => e.trim().length === 0)}
                    className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-semibold transition-colors ${
                      shareStatus === "sending" || shareEmails.every((e) => e.trim().length === 0)
                        ? "cursor-not-allowed bg-[var(--ic-accent)]/40 text-white/50"
                        : "bg-[var(--ic-accent)] text-white hover:bg-[var(--ic-accent)]/90"
                    }`}
                  >
                    {shareStatus === "sending" ? (
                      <><Loader2 size={12} className="animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={12} /> Send</>
                    )}
                  </button>
                  {shareStatus === "sent" && (
                    <span className="flex items-center gap-1 text-[12px] text-[var(--ic-green)]">
                      <Check size={12} /> Sent
                    </span>
                  )}
                  {shareStatus === "error" && (
                    <span className="text-[12px] text-[var(--ic-red)]">
                      Failed to send. Try again.
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 3. Likely reviewer blockers */}
      <motion.div {...stagger(2)}>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-red)]">
          Likely Reviewer Blockers
        </span>
        <div className="mt-2 rounded-lg border border-[var(--ic-red)]/30 bg-[var(--ic-red)]/5 p-4">
          <ul className="space-y-2">
            {findings.likelyReviewerBlockers.map((blocker, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-red)]" />
                <span className="text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {blocker}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* 4. Reviewer questions at risk */}
      {findings.reviewerQuestionsAtRisk.length > 0 && (
        <motion.div {...stagger(3)}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-amber)]">
            Questions reviewers may ask that your current stack would struggle to answer
          </span>
          <div className="mt-2 space-y-1.5">
            {findings.reviewerQuestionsAtRisk.map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border border-[var(--ic-amber)]/20 bg-amber-500/5 px-3 py-2"
              >
                <AlertTriangle size={14} className="flex-shrink-0 text-[var(--ic-amber)]" />
                <span className="text-[13px] text-[var(--ic-text-muted)]">{q}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 5. Missing artifacts */}
      {findings.missingArtifacts.length > 0 && (
        <motion.div {...stagger(4)}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
            Artifacts you likely do not have today
          </span>
          <div className="mt-2 space-y-1.5">
            {findings.missingArtifacts.map((artifact, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border border-[var(--ic-red)]/20 bg-[var(--ic-red)]/5 px-3 py-2"
              >
                <XCircle size={14} className="flex-shrink-0 text-[var(--ic-red)]" />
                <span className="text-[13px] text-[var(--ic-text-muted)]">{artifact}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 6. Packet preview */}
      <motion.div {...stagger(5)}>
        <div className="rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface-2)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[var(--ic-accent)]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
              Your Evidence Packet Readiness
            </span>
          </div>
          <p className="mt-2 text-[12px] text-[var(--ic-text-dim)]">
            How your current stack maps to a reviewer-ready payment evidence packet.
          </p>
          <div className="mt-3">
            <PacketPreview fields={findings.packetPreview} />
          </div>
        </div>
      </motion.div>

      {/* 7. Team impacts */}
      <motion.div {...stagger(6)}>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
          What This Means For Your Team
        </span>
        <div className="mt-3 space-y-3">
          {[
            { label: "Compliance", text: findings.teamImpacts.compliance },
            { label: "Risk & Fraud", text: findings.teamImpacts.riskFraud },
            { label: "Internal Audit", text: findings.teamImpacts.audit },
            { label: "Platform / Product", text: findings.teamImpacts.platformProduct },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-[var(--ic-border)] p-4">
              <span className="text-[12px] font-semibold text-[var(--ic-text)]">
                {item.label}
              </span>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 8. 30/60/90-day remediation plan */}
      <motion.div {...stagger(7)}>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
          30/60/90-Day Path to Reviewer Readiness
        </span>
        <div className="mt-3 space-y-4">
          {[
            { label: "First 30 days", items: findings.remediationPlan.days30, color: "var(--ic-red)" },
            { label: "60 days", items: findings.remediationPlan.days60, color: "var(--ic-amber)" },
            { label: "90 days", items: findings.remediationPlan.days90, color: "var(--ic-accent)" },
          ].map((group) => (
            <div key={group.label}>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: group.color }}
              >
                {group.label}
              </span>
              <div className="mt-1.5 space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 9. AI narrative summary (subordinate) */}
      <motion.div {...stagger(8)} className="rounded-lg border border-[var(--ic-border)] p-5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
          Narrative Summary
        </span>
        {aiLoading ? (
          <div className="mt-4 flex items-center gap-2 text-[var(--ic-text-dim)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px]">Generating narrative...</span>
          </div>
        ) : aiSummary?.narrativeExplanation ? (
          <p className="mt-3 text-[14px] leading-[1.65] text-[var(--ic-text-muted)]">
            {aiSummary.narrativeExplanation}
          </p>
        ) : aiSummary?.bluntSummary ? (
          <p className="mt-3 text-[14px] leading-[1.65] text-[var(--ic-text-muted)]">
            {aiSummary.bluntSummary}
          </p>
        ) : null}
      </motion.div>

      {/* 10. Next best asset CTA */}
      <motion.div {...stagger(9)} className="flex flex-col items-center rounded-xl border border-[var(--ic-accent)] bg-[var(--ic-accent)]/5 px-6 py-7">
        <h3 className="text-[16px] font-semibold text-[var(--ic-text)]">
          Recommended next step
        </h3>
        <div className="mt-4 flex flex-col items-center gap-3">
          <Link
            href={findings.nextBestAsset.href}
            onClick={() =>
              track("assessment_cta_next_asset_clicked", {
                href: findings.nextBestAsset.href,
                tier: scores.overallTier,
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--ic-accent)] px-7 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
          >
            {findings.nextBestAsset.label}
            <ChevronRight size={14} />
          </Link>
          <Link
            href="/contact"
            onClick={() => track("assessment_cta_contact_clicked", { tier: scores.overallTier })}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ic-text-muted)] transition-colors hover:text-[var(--ic-text)]"
          >
            Talk to the team
            <ChevronRight size={12} />
          </Link>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.p {...stagger(10)} className="pb-4 text-center text-[11px] leading-relaxed text-[var(--ic-text-dim)]">
        This assessment is informational only and does not constitute legal,
        regulatory, or compliance advice.
      </motion.p>
    </div>
  );
}
