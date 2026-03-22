"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AssessmentWizard } from "@/components/assessment/assessment-wizard";
import { AssessmentResults } from "@/components/assessment/assessment-results";
import { scoreAssessment } from "@/lib/assessment-engine";
import { generateFindings } from "@/lib/assessment-findings";
import { track } from "@/lib/analytics";
import type { Responses } from "@/lib/assessment-questions";

const benefits = [
  "Readiness tier and sub-scores across 4 dimensions",
  "Likely reviewer blockers for your stack",
  "Missing evidence artifacts",
  "30/60/90-day remediation plan",
  "Personalized packet readiness preview",
];

export default function AssessmentPage() {
  const [state, setState] = useState<"intro" | "wizard" | "results">("intro");
  const [responses, setResponses] = useState<Responses>({});

  const handleComplete = useCallback((finalResponses: Responses) => {
    setResponses(finalResponses);
    setState("results");
  }, []);

  const scores = state === "results" ? scoreAssessment(responses) : null;
  const findings =
    scores && state === "results"
      ? generateFindings(responses, scores)
      : null;

  if (state === "wizard") {
    return (
      <section className="bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <AssessmentWizard onComplete={handleComplete} />
        </div>
      </section>
    );
  }

  if (state === "results" && scores && findings) {
    return (
      <section className="bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <AssessmentResults
            scores={scores}
            findings={findings}
            responses={responses}
          />
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Payment Review Readiness Assessment
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Could your team survive a real payment review tomorrow?
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Assess one payment flow in 3-8 minutes. Identify the evidence gaps
              most likely to slow launch, partner diligence, or incident
              response — and get a concrete remediation plan.
            </p>
          </div>
        </div>
      </section>

      {/* What you'll get */}
      <section className="bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center font-serif text-2xl font-normal text-[var(--ic-text)]">
            What you&apos;ll get
          </h2>
          <ul className="mt-8 space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--ic-green)]"
                />
                <span className="text-[15px] text-[var(--ic-text-muted)]">
                  {b}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Button
              size="lg"
              onClick={() => {
                track("assessment_opened");
                setState("wizard");
              }}
            >
              Run Review Readiness Assessment
              <ArrowRight size={16} className="ml-2" />
            </Button>
            <p className="mt-3 text-[12px] text-[var(--ic-text-dim)]">
              No document upload required. Initial results are shown
              immediately.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
