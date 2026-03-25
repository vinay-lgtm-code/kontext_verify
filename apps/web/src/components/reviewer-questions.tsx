"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { track } from "@/lib/analytics";

const personas = [
  {
    title: "Sponsor bank reviewer",
    questions: [
      {
        q: "Who or what initiated this payment?",
        answer:
          "Kontext records the initiation source for every payment — human operator, workflow, API, or AI agent — along with the agent or service identity, instruction reference, and the policy boundaries that governed the action.",
      },
      {
        q: "What checks ran before funds moved?",
        answer:
          "Every payment record includes the specific screening checks that ran (OFAC/SDN, EDD thresholds, counterparty verification), their results, timestamps, and the version of the screening data used. Proof that checks ran before execution, not after.",
      },
      {
        q: "Was this blocked, approved, or escalated?",
        answer:
          "Kontext captures the enforcement mode used for the payment decision and the final disposition. Reviewers can see whether the transfer stayed in advisory mode, was blocked automatically, or was escalated into a human approval workflow.",
      },
    ],
  },
  {
    title: "Internal auditor",
    questions: [
      {
        q: "Has this audit record been modified?",
        answer:
          "Kontext uses a tamper-evident audit chain where every record is cryptographically linked to the previous one. Any modification would break the chain, making tampering detectable and provable.",
      },
      {
        q: "Which policy version was in force?",
        answer:
          "Each payment record captures the exact policy rules that were evaluated at decision time, including threshold values, approval requirements, and screening configurations. No retroactive guessing about what rules applied.",
      },
      {
        q: "Can you delete or redact personal data without breaking the record?",
        answer:
          "PII can be separated from the audit record, exported for subject access requests, redacted for non-compliance audiences, and erased where required while preserving a log that the governance action occurred.",
      },
    ],
  },
  {
    title: "Enterprise due diligence team",
    questions: [
      {
        q: "Can you prove screening happened before execution?",
        answer:
          "Timestamps in the evidence record show the exact sequence: screening check completed → result recorded → approval granted → execution initiated. The cryptographic chain makes the ordering independently verifiable.",
      },
      {
        q: "Can this record be independently verified?",
        answer:
          "Each event can return a digest proof, and exported files can be verified independently. Counterparties, auditors, and regulators can validate integrity without relying on screenshots or trusting an opaque internal database.",
      },
      {
        q: "Can you export the evidence?",
        answer:
          "Every payment decision can be exported as a structured case packet — including examiner, partner diligence, incident review, and redacted exports. The export includes payment summary, policy checks, screening results, approval chain, and evidence integrity markers.",
      },
    ],
  },
];

export function ReviewerQuestions() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    track("reviewer_question_expand", { question: key });
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
            Reviewer Questions
          </span>
          <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
            Built for the questions reviewers actually ask
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-[var(--ic-text-muted)]">
            The site should answer reviewer questions before they turn into
            diligence fire drills: initiation source, enforcement state, policy
            version, verifiability, and data governance.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {personas.map((persona) => (
            <div
              key={persona.title}
              className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
            >
              <h3 className="text-base font-semibold text-[var(--ic-text)]">
                {persona.title}
              </h3>
              <div className="mt-4 space-y-3">
                {persona.questions.map((item) => {
                  const key = `${persona.title}-${item.q}`;
                  const isOpen = openItems[key];
                  return (
                    <div
                      key={item.q}
                      className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)]"
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-[13px] font-medium italic text-[var(--ic-text)]">
                          &ldquo;{item.q}&rdquo;
                        </span>
                        <ChevronDown
                          size={14}
                          className={`flex-shrink-0 text-[var(--ic-text-dim)] transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-[var(--ic-border)] px-4 py-3">
                          <p className="text-[12px] leading-relaxed text-[var(--ic-text-muted)]">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
