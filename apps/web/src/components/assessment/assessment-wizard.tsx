"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck } from "lucide-react";
import {
  assessmentSections,
  getVisibleQuestions,
  getVisibleSections,
} from "@/lib/assessment-questions";
import type { Responses } from "@/lib/assessment-questions";
import { track } from "@/lib/analytics";

interface AssessmentWizardProps {
  onComplete: (responses: Responses) => void;
}

export function AssessmentWizard({ onComplete }: AssessmentWizardProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [responses, setResponses] = useState<Responses>({});
  const [started, setStarted] = useState(false);

  const visibleQuestions = useMemo(
    () => getVisibleQuestions(assessmentSections, responses),
    [responses]
  );

  const visibleSects = useMemo(
    () => getVisibleSections(assessmentSections, responses),
    [responses]
  );

  // Clamp index if questions shrink (e.g., depth changed)
  const clampedIndex = Math.min(questionIndex, visibleQuestions.length - 1);
  const current = visibleQuestions[clampedIndex];

  if (!current) return null;

  const currentSectionIndex = current.sectionIndex;
  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === visibleQuestions.length - 1;

  const totalAnswered = visibleQuestions.filter((vq) => {
    const v = responses[vq.question.id];
    return v !== undefined && (typeof v === "string" ? v.length > 0 : v.length > 0);
  }).length;
  const progressPct = (totalAnswered / visibleQuestions.length) * 100;

  const currentAnswered = (() => {
    const r = responses[current.question.id];
    if (!r) return false;
    return typeof r === "string" ? r.length > 0 : r.length > 0;
  })();

  const depthTimeEstimate: Record<string, string> = {
    quick: "3",
    standard: "6",
    deep: "8",
  };
  const selectedDepth = (responses["assessment_depth"] as string) ?? "quick";
  const totalMinutes = depthTimeEstimate[selectedDepth] ?? "5";

  const handleSelect = useCallback(
    (questionId: string, value: string, type: "single_select" | "multi_select") => {
      if (!started) {
        setStarted(true);
        track("assessment_started");
      }

      setResponses((prev) => {
        if (type === "single_select") {
          return { ...prev, [questionId]: value };
        }
        const currentVal = (prev[questionId] as string[] | undefined) ?? [];
        if (value === "none" || value === "none_yet") {
          return { ...prev, [questionId]: [value] };
        }
        const filtered = currentVal.filter((v) => v !== "none" && v !== "none_yet");
        if (filtered.includes(value)) {
          const next = filtered.filter((v) => v !== value);
          return { ...prev, [questionId]: next.length > 0 ? next : [] };
        }
        return { ...prev, [questionId]: [...filtered, value] };
      });

      track("assessment_question_answered", { question_id: questionId, value });
    },
    [started]
  );

  const isSelected = (questionId: string, value: string): boolean => {
    const r = responses[questionId];
    if (!r) return false;
    if (typeof r === "string") return r === value;
    return r.includes(value);
  };

  const goNext = () => {
    if (!isLast && currentAnswered) {
      setDirection(1);
      setQuestionIndex(clampedIndex + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) {
      setDirection(-1);
      setQuestionIndex(clampedIndex - 1);
    }
  };

  // Section navigation
  const sectionStartIndex = (si: number): number => {
    const idx = visibleQuestions.findIndex((vq) => vq.sectionIndex === si);
    return idx >= 0 ? idx : 0;
  };

  const jumpToSection = (si: number) => {
    const targetIndex = sectionStartIndex(si);
    if (targetIndex !== clampedIndex) {
      setDirection(targetIndex > clampedIndex ? 1 : -1);
      setQuestionIndex(targetIndex);
    }
  };

  const sectionCompleted = (si: number) =>
    visibleQuestions
      .filter((vq) => vq.sectionIndex === si)
      .every((vq) => {
        const r = responses[vq.question.id];
        return r !== undefined && (typeof r === "string" ? r.length > 0 : r.length > 0);
      });

  // Questions in the current section for step dots
  const currentSectionQuestions = visibleQuestions.filter(
    (vq) => vq.sectionIndex === currentSectionIndex
  );
  const currentSectionStart = sectionStartIndex(currentSectionIndex);

  const q = current.question;

  return (
    <div className="flex h-full flex-col">
      {/* Progress area */}
      <div className="border-b border-[var(--ic-border)] px-7 py-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[2px] text-[var(--ic-text-dim)]">
            Question {clampedIndex + 1} of {visibleQuestions.length}
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[2px] text-[var(--ic-text-dim)]">
            ~{Math.max(1, Math.ceil(((visibleQuestions.length - totalAnswered) / visibleQuestions.length) * Number(totalMinutes)))}{" "}
            min left
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full rounded-full bg-[var(--ic-border)]">
          <div
            className="h-1 rounded-full bg-[var(--ic-accent)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Section tabs */}
        <div className="mt-3 flex gap-1">
          {visibleSects.map(({ section: s, index: i }) => {
            const isActive = i === currentSectionIndex;
            const isDone = sectionCompleted(i) && i !== currentSectionIndex;
            const isClickable = i <= currentSectionIndex || sectionCompleted(i);
            return (
              <button
                key={s.id}
                onClick={() => isClickable && jumpToSection(i)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--ic-accent)] text-white"
                    : isDone
                    ? "bg-[var(--ic-accent)]/10 text-[var(--ic-accent)]"
                    : "text-[var(--ic-text-dim)]"
                } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
              >
                {isDone && <Check size={12} />}
                {s.title}
              </button>
            );
          })}
        </div>

        {/* Within-section step dots */}
        <div className="mt-2 flex gap-1.5">
          {currentSectionQuestions.map((vq, i) => {
            const globalIdx = currentSectionStart + i;
            const isCurrent = globalIdx === clampedIndex;
            const answered = (() => {
              const r = responses[vq.question.id];
              return r !== undefined && (typeof r === "string" ? r.length > 0 : r.length > 0);
            })();
            return (
              <button
                key={vq.question.id}
                onClick={() => {
                  if (globalIdx <= clampedIndex || answered) {
                    setDirection(globalIdx > clampedIndex ? 1 : -1);
                    setQuestionIndex(globalIdx);
                  }
                }}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "bg-[var(--ic-accent)]"
                    : answered
                    ? "bg-[var(--ic-accent)]/40"
                    : "bg-[var(--ic-border)]"
                } ${globalIdx <= clampedIndex || answered ? "cursor-pointer" : "cursor-default"}`}
              />
            );
          })}
        </div>
      </div>

      {/* Single question with horizontal fade animation */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={q.id}
            custom={direction}
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full overflow-y-auto px-7 py-6"
          >
            <p className="text-[16px] font-semibold leading-snug text-[var(--ic-text)]">
              {q.prompt}
            </p>
            {q.helpText && (
              <p className="mt-1 text-[13px] text-[var(--ic-text-dim)]">
                {q.helpText}
              </p>
            )}

            <div className="mt-4 space-y-2">
              {q.options.map((opt) => {
                const selected = isSelected(q.id, opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(q.id, opt.value, q.type)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all ${
                      selected
                        ? "border-[var(--ic-accent)] bg-[var(--ic-accent)]/10"
                        : "border-[var(--ic-border)] hover:border-[var(--ic-text-dim)]"
                    }`}
                  >
                    <div
                      className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center ${
                        q.type === "single_select" ? "rounded-full" : "rounded"
                      } border-[1.5px] transition-colors ${
                        selected
                          ? "border-[var(--ic-accent)] bg-[var(--ic-accent)]"
                          : "border-[var(--ic-text-dim)]"
                      }`}
                    >
                      {selected && (
                        <Check size={11} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                    <span
                      className={`text-[14px] ${
                        selected
                          ? "text-[var(--ic-text)]"
                          : "text-[var(--ic-text-muted)]"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-[var(--ic-border)] px-7 py-4">
        <button
          onClick={goBack}
          disabled={isFirst}
          className={`flex items-center gap-1.5 rounded-lg border border-[var(--ic-border)] px-5 py-2.5 text-[13px] font-medium transition-colors ${
            isFirst
              ? "cursor-not-allowed opacity-30"
              : "text-[var(--ic-text-muted)] hover:bg-[var(--ic-surface-2)]"
          }`}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {isLast ? (
          <button
            onClick={() => {
              track("assessment_completed", {
                depth: selectedDepth,
                has_automation: String(hasAutomation(responses)),
                has_agentic: String(hasAIAgent(responses)),
              });
              if (hasAutomation(responses)) {
                track("assessment_completed_with_agentic_branch");
              }
              onComplete(responses);
            }}
            disabled={!currentAnswered}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-colors ${
              currentAnswered
                ? "bg-[var(--ic-accent)] text-white hover:bg-[var(--ic-accent)]/90"
                : "cursor-not-allowed bg-[var(--ic-accent)]/40 text-white/50"
            }`}
          >
            <ClipboardCheck size={14} />
            See Results
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!currentAnswered}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-colors ${
              currentAnswered
                ? "bg-[var(--ic-accent)] text-white hover:bg-[var(--ic-accent)]/90"
                : "cursor-not-allowed bg-[var(--ic-accent)]/40 text-white/50"
            }`}
          >
            Next
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function hasAutomation(responses: Responses): boolean {
  const sources = responses["initiation_sources"];
  if (!Array.isArray(sources)) return false;
  return sources.some((s) => s === "workflow" || s === "api_service" || s === "ai_agent");
}

function hasAIAgent(responses: Responses): boolean {
  const sources = responses["initiation_sources"];
  return Array.isArray(sources) && sources.includes("ai_agent");
}
