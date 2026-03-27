"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CalcInputs {
  paymentRails: number;
  screeningVendors: number;
  systemsPerRequest: number;
  teamSize: number;
  aiAgents: boolean;
}

function computeResults(inputs: CalcInputs) {
  const baseHoursPerRequest = inputs.systemsPerRequest * 1.5;
  const aiMultiplier = inputs.aiAgents ? 1.4 : 1;
  const hoursPerRequest = Math.round(baseHoursPerRequest * aiMultiplier * 10) / 10;

  const requestsPerMonth = Math.max(4, inputs.paymentRails * 2 + inputs.screeningVendors);
  const annualHours = Math.round(hoursPerRequest * requestsPerMonth * 12);

  const kontextHoursPerRequest = 0.25;
  const kontextAnnualHours = Math.round(kontextHoursPerRequest * requestsPerMonth * 12);
  const hoursSaved = annualHours - kontextAnnualHours;

  const fragmentationScore =
    Math.min(100, inputs.systemsPerRequest * 12 + inputs.paymentRails * 8 + inputs.screeningVendors * 6 + (inputs.aiAgents ? 15 : 0));

  const riskLevel =
    fragmentationScore >= 70 ? "High" : fragmentationScore >= 40 ? "Medium" : "Low";

  return {
    hoursPerRequest,
    annualHours,
    kontextAnnualHours,
    hoursSaved,
    fragmentationScore,
    riskLevel,
  };
}

export default function EvidenceCalculatorPage() {
  const [inputs, setInputs] = useState<CalcInputs>({
    paymentRails: 3,
    screeningVendors: 2,
    systemsPerRequest: 5,
    teamSize: 3,
    aiAgents: false,
  });

  const [showResults, setShowResults] = useState(false);
  const results = computeResults(inputs);

  return (
    <>
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Evidence Fragmentation Calculator
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              How much does evidence fragmentation cost your team?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Answer 5 questions to estimate your compliance team&apos;s evidence
              assembly burden and see how consolidation changes the math.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-[var(--ic-text)]">
                How many payment rails do you operate?
              </label>
              <p className="mt-1 text-[13px] text-[var(--ic-text-muted)]">
                Stablecoin, ACH, wire, card, RTP, etc.
              </p>
              <input
                type="range"
                min={1}
                max={8}
                value={inputs.paymentRails}
                onChange={(e) => setInputs({ ...inputs, paymentRails: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--ic-accent)]"
              />
              <span className="mt-1 block font-mono text-sm text-[var(--ic-accent)]">
                {inputs.paymentRails} rail{inputs.paymentRails !== 1 ? "s" : ""}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ic-text)]">
                How many screening or monitoring vendors?
              </label>
              <p className="mt-1 text-[13px] text-[var(--ic-text-muted)]">
                OFAC, Chainalysis, Elliptic, in-house tools, etc.
              </p>
              <input
                type="range"
                min={1}
                max={6}
                value={inputs.screeningVendors}
                onChange={(e) => setInputs({ ...inputs, screeningVendors: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--ic-accent)]"
              />
              <span className="mt-1 block font-mono text-sm text-[var(--ic-accent)]">
                {inputs.screeningVendors} vendor{inputs.screeningVendors !== 1 ? "s" : ""}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ic-text)]">
                How many systems do you touch per examiner request?
              </label>
              <p className="mt-1 text-[13px] text-[var(--ic-text-muted)]">
                Payment processor, blockchain explorer, screening dashboard, case management, etc.
              </p>
              <input
                type="range"
                min={1}
                max={12}
                value={inputs.systemsPerRequest}
                onChange={(e) => setInputs({ ...inputs, systemsPerRequest: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--ic-accent)]"
              />
              <span className="mt-1 block font-mono text-sm text-[var(--ic-accent)]">
                {inputs.systemsPerRequest} system{inputs.systemsPerRequest !== 1 ? "s" : ""}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ic-text)]">
                Compliance team size
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={inputs.teamSize}
                onChange={(e) => setInputs({ ...inputs, teamSize: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--ic-accent)]"
              />
              <span className="mt-1 block font-mono text-sm text-[var(--ic-accent)]">
                {inputs.teamSize} person{inputs.teamSize !== 1 ? "s" : ""}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--ic-text)]">
                Do AI agents initiate payments?
              </label>
              <div className="mt-3 flex gap-4">
                <button
                  onClick={() => setInputs({ ...inputs, aiAgents: true })}
                  className={`rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors ${
                    inputs.aiAgents
                      ? "border-[var(--ic-accent)] bg-[var(--ic-accent-dim)] text-[var(--ic-accent)]"
                      : "border-[var(--ic-border)] text-[var(--ic-text-muted)] hover:bg-[var(--ic-surface)]"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setInputs({ ...inputs, aiAgents: false })}
                  className={`rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors ${
                    !inputs.aiAgents
                      ? "border-[var(--ic-accent)] bg-[var(--ic-accent-dim)] text-[var(--ic-accent)]"
                      : "border-[var(--ic-border)] text-[var(--ic-text-muted)] hover:bg-[var(--ic-surface)]"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="pt-4">
              <Button size="lg" onClick={() => setShowResults(true)} className="w-full gap-2">
                Calculate my evidence burden
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>

          {showResults && (
            <div className="mt-12 space-y-6">
              <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
                Your evidence fragmentation profile
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6 text-center">
                  <p className="font-serif text-3xl text-[var(--ic-red)]">
                    {results.hoursPerRequest}h
                  </p>
                  <p className="mt-2 text-[13px] text-[var(--ic-text-muted)]">
                    Estimated hours per examiner request
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6 text-center">
                  <p className="font-serif text-3xl text-[var(--ic-red)]">
                    {results.annualHours.toLocaleString()}h
                  </p>
                  <p className="mt-2 text-[13px] text-[var(--ic-text-muted)]">
                    Annual hours on evidence assembly
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--ic-green)]/15 bg-[var(--ic-surface)] p-6 text-center">
                  <p className="font-serif text-3xl text-[var(--ic-green)]">
                    {results.kontextAnnualHours}h
                  </p>
                  <p className="mt-2 text-[13px] text-[var(--ic-text-muted)]">
                    With Kontext (automated capture + export)
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--ic-green)]/15 bg-[var(--ic-surface)] p-6 text-center">
                  <p className="font-serif text-3xl text-[var(--ic-green)]">
                    {results.hoursSaved.toLocaleString()}h
                  </p>
                  <p className="mt-2 text-[13px] text-[var(--ic-text-muted)]">
                    Hours saved annually
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--ic-text)]">
                    Fragmentation risk score
                  </span>
                  <span
                    className={`font-mono text-sm font-semibold ${
                      results.riskLevel === "High"
                        ? "text-[var(--ic-red)]"
                        : results.riskLevel === "Medium"
                          ? "text-[var(--ic-amber)]"
                          : "text-[var(--ic-green)]"
                    }`}
                  >
                    {results.fragmentationScore}/100 ({results.riskLevel})
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[var(--ic-border)]">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      results.riskLevel === "High"
                        ? "bg-[var(--ic-red)]"
                        : results.riskLevel === "Medium"
                          ? "bg-[var(--ic-amber)]"
                          : "bg-[var(--ic-green)]"
                    }`}
                    style={{ width: `${results.fragmentationScore}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/#evidence-package">
                    See what examiners get
                    <ArrowRight size={16} className="ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/assessment">Run full readiness assessment</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
