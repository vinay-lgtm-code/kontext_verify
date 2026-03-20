"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck } from "lucide-react";
import { assessmentSections, totalQuestions } from "@/lib/assessment-questions";
import type { Responses } from "@/lib/assessment-engine";

const flatQuestions = assessmentSections.flatMap((section, si) =>
  section.questions.map((q) => ({ question: q, sectionIndex: si }))
);

// Precompute the global index where each section starts
const sectionStartIndex = assessmentSections.map((_, si) =>
  flatQuestions.findIndex((fq) => fq.sectionIndex === si)
);

interface AssessmentWizardProps {
  onComplete: (responses: Responses) => void;
}

export function AssessmentWizard({ onComplete }: AssessmentWizardProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [responses, setResponses] = useState<Responses>({});

  const current = flatQuestions[questionIndex]!;
  const currentSectionIndex = current.sectionIndex;
  const isFirst = questionIndex === 0;
  const isLast = questionIndex === flatQuestions.length - 1;

  const totalAnswered = Object.keys(responses).filter((k) => {
    const v = responses[k];
    return v !== undefined && (typeof v === "string" ? v.length > 0 : (v as string[]).length > 0);
  }).length;
  const progressPct = (totalAnswered / totalQuestions) * 100;

  const currentAnswered = (() => {
    const r = responses[current.question.id];
    if (!r) return false;
    return typeof r === "string" ? r.length > 0 : r.length > 0;
  })();

  const handleSelect = useCallback(
    (questionId: string, value: string, type: "single_select" | "multi_select") => {
      setResponses((prev) => {
        if (type === "single_select") {
          return { ...prev, [questionId]: value };
        }
        const current = (prev[questionId] as string[] | undefined) ?? [];
        if (value === "none_yet") {
          return { ...prev, [questionId]: ["none_yet"] };
        }
        const filtered = current.filter((v) => v !== "none_yet");
        if (filtered.includes(value)) {
          const next = filtered.filter((v) => v !== value);
          return { ...prev, [questionId]: next.length > 0 ? next : [] };
        }
        return { ...prev, [questionId]: [...filtered, value] };
      });
    },
    []
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
      setQuestionIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) {
      setDirection(-1);
      setQuestionIndex((i) => i - 1);
    }
  };

  const jumpToSection = (si: number) => {
    const targetIndex = sectionStartIndex[si]!;
    if (targetIndex !== questionIndex) {
      setDirection(targetIndex > questionIndex ? 1 : -1);
      setQuestionIndex(targetIndex);
    }
  };

  // Determine which sections are accessible (completed or current)
  const sectionCompleted = (si: number) =>
    flatQuestions
      .filter((fq) => fq.sectionIndex === si)
      .every((fq) => {
        const r = responses[fq.question.id];
        return r !== undefined && (typeof r === "string" ? r.length > 0 : (r as string[]).length > 0);
      });

  // Questions in the current section for step dots
  const currentSectionQuestions = flatQuestions.filter(
    (fq) => fq.sectionIndex === currentSectionIndex
  );
  const currentSectionStart = sectionStartIndex[currentSectionIndex]!;

  const q = current.question;

  return (
    <div className="flex h-full flex-col">
      {/* Progress area */}
      <div className="border-b border-[var(--ic-border)] px-7 py-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[2px] text-[var(--ic-text-dim)]">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[2px] text-[var(--ic-text-dim)]">
            ~{Math.max(1, Math.ceil(((totalQuestions - totalAnswered) / totalQuestions) * 5))} min left
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
          {assessmentSections.map((s, i) => {
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
          {currentSectionQuestions.map((fq, i) => {
            const globalIdx = currentSectionStart + i;
            const isCurrent = globalIdx === questionIndex;
            const answered = (() => {
              const r = responses[fq.question.id];
              return r !== undefined && (typeof r === "string" ? r.length > 0 : (r as string[]).length > 0);
            })();
            return (
              <button
                key={fq.question.id}
                onClick={() => {
                  if (globalIdx <= questionIndex || answered) {
                    setDirection(globalIdx > questionIndex ? 1 : -1);
                    setQuestionIndex(globalIdx);
                  }
                }}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "bg-[var(--ic-accent)]"
                    : answered
                    ? "bg-[var(--ic-accent)]/40"
                    : "bg-[var(--ic-border)]"
                } ${globalIdx <= questionIndex || answered ? "cursor-pointer" : "cursor-default"}`}
              />
            );
          })}
        </div>
      </div>

      {/* Single question with horizontal fade animation */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={questionIndex}
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
            onClick={() => onComplete(responses)}
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
