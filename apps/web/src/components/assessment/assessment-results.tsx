"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, Loader2, Send, X, Check } from "lucide-react";
import Link from "next/link";
import type { AssessmentScores, Responses } from "@/lib/assessment-engine";
import { bandLabels, bandColors } from "@/lib/assessment-engine";
import type { Findings } from "@/lib/assessment-findings";

interface AssessmentResultsProps {
  scores: AssessmentScores;
  findings: Findings;
  responses: Responses;
}

interface AiSummary {
  executiveSummary: string;
  likelyFailureModes: string[];
  whyThisMattersNow: string;
  suggestedNextStep: string;
}

const subScoreLabels = [
  { key: "intentAttribution" as const, label: "Intent & Attribution" },
  { key: "policyEvidence" as const, label: "Policy Evidence" },
  { key: "executionLinkage" as const, label: "Execution Linkage" },
  { key: "auditReplayReadiness" as const, label: "Audit Replay Readiness" },
];

function getSubScoreColor(score: number): string {
  if (score >= 20) return "var(--ic-green)";
  if (score >= 13) return "var(--ic-amber)";
  return "var(--ic-red)";
}

function getGapColor(index: number, total: number): string {
  if (index < Math.ceil(total * 0.4)) return "var(--ic-red)";
  return "var(--ic-amber)";
}

export function AssessmentResults({
  scores,
  findings,
  responses,
}: AssessmentResultsProps) {
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmails, setShareEmails] = useState(["", ""]);
  const [shareStatus, setShareStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  // Fetch AI summary
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
            executiveSummary: `This ${responses["flow_type"]?.toString().replace(/_/g, " ") ?? "payment"} flow scored ${scores.overallScore}/100, indicating ${bandLabels[scores.band].toLowerCase()}. ${findings.topGaps[0] ?? ""} ${findings.topGaps[1] ?? ""}`,
            likelyFailureModes: findings.topGaps.slice(0, 3),
            whyThisMattersNow:
              "Regulatory expectations for payment evidence are tightening. Teams that cannot reconstruct payment decisions on demand face increasing exposure during audits, partner diligence, and incident response.",
            suggestedNextStep:
              "Start by linking screening results and execution references directly to each payment record. This addresses the highest-impact gaps with the lowest implementation effort.",
          });
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [scores, findings, responses]);

  const bandColor = bandColors[scores.band];

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleShare = async () => {
    const validEmails = shareEmails.filter((e) => e.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
    if (validEmails.length === 0) return;

    setShareStatus("sending");
    try {
      const res = await fetch("/api/assessment/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: validEmails.map((e) => e.trim()),
          scores,
          findings,
          aiSummary,
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
    transition: { delay: i * 0.1, duration: 0.35 },
  });

  return (
    <div className="space-y-7 px-7 py-7">
      {/* Score hero */}
      <motion.div {...stagger(0)}>
        <div className="relative flex flex-col items-center rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-6 py-8">
          {/* Share button - top right */}
          <button
            onClick={() => { setShareOpen(!shareOpen); setShareStatus("idle"); }}
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-md border border-[var(--ic-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)]"
          >
            <Send size={12} />
            Share
          </button>

          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-[3px]"
            style={{ color: bandColor }}
          >
            {bandLabels[scores.band]}
          </span>
          <span
            className="mt-2 text-[72px] font-bold leading-none"
            style={{ color: bandColor }}
          >
            {displayScore}
          </span>
          <span className="mt-1 text-[14px] text-[var(--ic-text-dim)]">
            out of 100
          </span>
          <p className="mt-4 max-w-md text-center text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
            This result reflects how well your current stack appears able to
            reconstruct one payment decision from intent through execution and
            review.
          </p>
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
                  <span className="text-[12px] font-medium text-[var(--ic-text-muted)]">
                    Share results via email (max 2)
                  </span>
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

      {/* Sub-scores */}
      <motion.div {...stagger(1)} className="grid grid-cols-2 gap-2">
        {subScoreLabels.map(({ key, label }) => {
          const val = scores.subScores[key];
          const color = getSubScoreColor(val);
          return (
            <div
              key={key}
              className="rounded-lg border border-[var(--ic-border)] p-4"
            >
              <span className="text-[12px] font-medium text-[var(--ic-text-muted)]">
                {label}
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span
                  className="text-[28px] font-bold"
                  style={{ color }}
                >
                  {val}
                </span>
                <span className="text-[14px] text-[var(--ic-text-dim)]">
                  / 25
                </span>
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-[var(--ic-border)]">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: `${(val / 25) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* AI summary */}
      <motion.div {...stagger(2)} className="rounded-lg border border-[var(--ic-border)] p-5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
          Operator Summary
        </span>
        {aiLoading ? (
          <div className="mt-4 flex items-center gap-2 text-[var(--ic-text-dim)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px]">Generating summary...</span>
          </div>
        ) : aiSummary ? (
          <p className="mt-3 text-[14px] leading-[1.65] text-[var(--ic-text-muted)]">
            {aiSummary.executiveSummary}
          </p>
        ) : null}
      </motion.div>

      {/* Top gaps */}
      <motion.div {...stagger(3)}>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
          Your Biggest Gaps
        </span>
        <div className="mt-3 space-y-3">
          {findings.topGaps.map((gap, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span
                className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: getGapColor(i, findings.topGaps.length),
                }}
              />
              <span className="text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                {gap}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Team impacts — collapsible */}
      <motion.div {...stagger(4)}>
        <button
          onClick={() => toggle("teamImpacts")}
          className="flex w-full items-center justify-between"
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
            What This Means For Your Team
          </span>
          <motion.span
            animate={{ rotate: expanded["teamImpacts"] ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} className="text-[var(--ic-text-dim)]" />
          </motion.span>
        </button>
        <AnimatePresence>
          {expanded["teamImpacts"] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
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
          )}
        </AnimatePresence>
      </motion.div>

      {/* Evidence schema — collapsible */}
      <motion.div {...stagger(5)}>
        <button
          onClick={() => toggle("evidenceSchema")}
          className="flex w-full items-center justify-between"
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
            What Good Evidence Capture Should Include
          </span>
          <motion.span
            animate={{ rotate: expanded["evidenceSchema"] ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} className="text-[var(--ic-text-dim)]" />
          </motion.span>
        </button>
        <AnimatePresence>
          {expanded["evidenceSchema"] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {findings.recommendedSchema.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-accent)]" />
                    <span className="text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Roadmap — collapsible */}
      <motion.div {...stagger(6)}>
        <button
          onClick={() => toggle("roadmap")}
          className="flex w-full items-center justify-between"
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[3px] text-[var(--ic-text-dim)]">
            Suggested Remediation Path
          </span>
          <motion.span
            animate={{ rotate: expanded["roadmap"] ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} className="text-[var(--ic-text-dim)]" />
          </motion.span>
        </button>
        <AnimatePresence>
          {expanded["roadmap"] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-4">
                {[
                  { label: "Must have", items: findings.roadmap.mustHave, color: "var(--ic-red)" },
                  { label: "Should have", items: findings.roadmap.shouldHave, color: "var(--ic-amber)" },
                  { label: "Advanced", items: findings.roadmap.advanced, color: "var(--ic-accent)" },
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
          )}
        </AnimatePresence>
      </motion.div>

      {/* Demo CTA */}
      <motion.div {...stagger(7)} className="flex flex-col items-center rounded-xl border border-[var(--ic-accent)] bg-[var(--ic-accent)]/5 px-6 py-7">
        <h3 className="text-[16px] font-semibold text-[var(--ic-text)]">
          Want help reviewing your results?
        </h3>
        <p className="mt-2 max-w-md text-center text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
          Book a 20-minute gap review and we&apos;ll walk through how one of
          your real payment flows could become a complete evidence trail.
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--ic-accent)] px-7 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
        >
          <Calendar size={14} />
          Book Gap Review
        </Link>
      </motion.div>

      {/* Disclaimer */}
      <motion.p {...stagger(8)} className="pb-4 text-center text-[11px] leading-relaxed text-[var(--ic-text-dim)]">
        This assessment is informational only and does not constitute legal,
        regulatory, or compliance advice.
      </motion.p>
    </div>
  );
}
