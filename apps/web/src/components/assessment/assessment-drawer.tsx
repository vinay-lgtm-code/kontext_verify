"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AssessmentWizard } from "./assessment-wizard";
import { AssessmentResults } from "./assessment-results";
import type { Responses } from "@/lib/assessment-engine";
import { scoreAssessment } from "@/lib/assessment-engine";
import { generateFindings } from "@/lib/assessment-findings";

type DrawerState = "idle" | "wizard" | "results";

interface AssessmentDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AssessmentDrawer({ open, onClose }: AssessmentDrawerProps) {
  const [state, setState] = useState<DrawerState>("wizard");
  const [responses, setResponses] = useState<Responses>({});

  const handleComplete = useCallback((finalResponses: Responses) => {
    setResponses(finalResponses);
    setState("results");
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setState("wizard");
      setResponses({});
    }, 300);
  }, [onClose]);

  const scores = state === "results" ? scoreAssessment(responses) : null;
  const findings =
    scores && state === "results"
      ? generateFindings(responses, scores.subScores, scores.tags)
      : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Drawer panel */}
          <motion.div
            className="relative flex w-full max-w-[620px] flex-col bg-[var(--ic-surface)] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--ic-border)] px-7 py-5">
              <h2 className="text-[15px] font-semibold text-[var(--ic-text)]">
                {state === "results"
                  ? "Your Assessment Results"
                  : "Payment Evidence Gap Assessment"}
              </h2>
              <button
                onClick={handleClose}
                className="rounded-md p-1 text-[var(--ic-text-dim)] transition-colors hover:text-[var(--ic-text)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {state === "wizard" && (
                <AssessmentWizard onComplete={handleComplete} />
              )}
              {state === "results" && scores && findings && (
                <AssessmentResults
                  scores={scores}
                  findings={findings}
                  responses={responses}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
