import Link from "next/link";
import { GridBackground } from "@/components/grid-background";
import { CodeBlock } from "@/components/code-block";
import { HeroSection } from "@/components/hero-section";
import { AgentView } from "@/components/agent-view";
import { ComplianceCommandCenter } from "@/components/compliance-command-center";
import { AssessmentSection } from "@/components/assessment/assessment-section";
import { PaymentDecisionPacket } from "@/components/payment-decision-packet";
import { ReviewerQuestions } from "@/components/reviewer-questions";
import { IntegrationsStrip } from "@/components/integrations-strip";
import { InitiationSourcesStrip } from "@/components/initiation-sources-strip";
import {
  ShieldCheck,
  ScanEye,
  FileSearch,
  CreditCard,
  Code,
  ArrowRight,
  Check,
  Info,
} from "lucide-react";

export default function LandingPage() {
  return (
    <>
      <GridBackground />

      {/* ===== HERO ===== */}
      <HeroSection />

      {/* ===== COMPLIANCE GAP ===== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              The Compliance Gap
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Payment infrastructure teams can move money — but can they prove why?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Reconstructing the decision trail for a single flagged payment
              takes hours of log-diving across systems. Bank partners, auditors,
              and enterprise customers are asking for more.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Without Kontext */}
            <div className="rounded-lg border border-[var(--ic-red)]/15 bg-[var(--ic-surface)] p-8">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-red)]">
                Without Kontext
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[var(--ic-text)]">
                Scattered evidence, manual reconstruction
              </h3>
              <ul className="mt-6 space-y-4">
                {[
                  "Logs scattered across 4+ systems with no linkage",
                  '"We think we checked" — no proof screening ran before funds moved',
                  "Hours to reconstruct a single flagged payment",
                  "No exportable evidence for examiner review",
                  "No record of which system or person authorized the payment decision",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-red)]" />
                    <span className="text-sm text-[var(--ic-text-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* With Kontext */}
            <div className="rounded-lg border border-[var(--ic-green)]/15 bg-[var(--ic-surface)] p-8">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-green)]">
                With Kontext
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[var(--ic-text)]">
                Structured evidence, examiner-ready in seconds
              </h3>
              <ul className="mt-6 space-y-4">
                {[
                  "Every payment decision linked in one evidence trail",
                  "Proof that screening checks ran before funds moved",
                  "Tamper-evident audit trail — every record cryptographically linked",
                  "Export a complete case packet for any transaction",
                  "Configurable policy controls for payment thresholds and approval workflows",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-green)]" />
                    <span className="text-sm text-[var(--ic-text-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY KONTEXT ===== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Why Kontext
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Built for a fragmented payment stack
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Stablecoin payments now span multiple chains, wallet providers,
              payment APIs, and compliance models. Kontext gives teams one
              verifiable system of record for payment intent, screening,
              approvals, and execution, no matter which rail moves the money.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-8">
              <h3 className="text-[16px] font-semibold text-[var(--ic-text)]">
                One record across rails
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                Unify evidence from stablecoin rails, wallets, and fiat payment
                systems into a single reviewer-ready trail.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-8">
              <h3 className="text-[16px] font-semibold text-[var(--ic-text)]">
                One source of truth across teams
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                Give engineering, compliance, and operations the same view of
                what happened, who approved it, and what checks ran.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-8">
              <h3 className="text-[16px] font-semibold text-[var(--ic-text)]">
                One export for every review
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                Be ready for partner diligence, audits, launch reviews, and
                incident investigations without stitching together logs by hand.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="#evidence-package"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--ic-accent)] px-7 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              See the payment record
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ic-border)] px-7 py-3.5 text-[14px] font-semibold text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface-2)]"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </section>

      {/* ===== COMPLIANCE COMMAND CENTER ===== */}
      <section className="relative bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Command Center
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              What your compliance team sees for every payment
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              One view across stablecoins, ACH, wire, card, and more — whether initiated by an agent, a human, or a scheduled system.
            </p>
          </div>

          <div className="mt-12">
            <ComplianceCommandCenter />
          </div>
        </div>
      </section>

      {/* ===== EVIDENCE PACKAGE ===== */}
      <section id="evidence-package" className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              What Gets Captured
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              The evidence package for a single payment
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Every programmable payment generates a structured compliance record
              with full decision context — from initiation to execution to export.
            </p>
          </div>

          <div className="mt-12">
            <PaymentDecisionPacket variant="full" />
          </div>
        </div>
      </section>

      {/* ===== AI-INITIATED PAYMENTS ===== */}
      <section className="relative border-t border-[var(--ic-border)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              AI-Initiated Payments
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Why AI-initiated payments need more evidence
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              When software makes payment decisions faster, reviewers need better proof — not less.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Autonomy increases speed",
                desc: "AI agents and workflows can initiate or recommend payment actions faster than manual finance operations.",
              },
              {
                title: "Review pressure increases too",
                desc: "Risk, compliance, and partner reviewers still need to know what checks ran, who approved the action, and what policy was in force.",
              },
              {
                title: "Logs are not enough",
                desc: "Without structured payment evidence, teams end up reconstructing prompts, approvals, transactions, and exceptions from scattered systems after the fact.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6"
              >
                <h3 className="text-[15px] font-semibold text-[var(--ic-text)]">
                  {card.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/sample-ai-initiated-payment-packet"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ic-accent)] transition-colors hover:text-[var(--ic-accent)]/80"
            >
              See an AI-initiated payment packet
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== INITIATION SOURCES ===== */}
      <InitiationSourcesStrip />

      {/* ===== BUYER ROLES ===== */}
      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Who It Serves
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Built for the teams that own compliance liability
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              From the compliance team running daily reviews to the CEO presenting controls to the board.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: ShieldCheck,
                title: "Compliance",
                desc: "Prove every check ran. Export audit-ready evidence for examiner review and bank partner due diligence.",
              },
              {
                icon: ScanEye,
                title: "Risk & Fraud",
                desc: "Anomaly detection flags unusual patterns before they become incidents.",
              },
              {
                icon: FileSearch,
                title: "Internal Audit",
                desc: "Tamper-evident audit trail proves no records were altered after the fact.",
              },
              {
                icon: CreditCard,
                title: "Payments Product",
                desc: "Add compliance controls without rebuilding your payment stack. Works across stablecoin, card, and banking rails.",
              },
              {
                icon: Code,
                title: "Platform Engineering",
                desc: "One integration point. Captures initiation source, agent identity, and approval lineage — whether payments are triggered by AI agents, orchestration systems, or direct API calls.",
              },
            ].map((role) => (
              <div
                key={role.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6 transition-colors hover:border-[var(--ic-accent)]/30"
              >
                <role.icon size={24} className="text-[var(--ic-accent)]" />
                <h3 className="mt-4 text-base font-semibold text-[var(--ic-text)]">
                  {role.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {role.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REVIEWER QUESTIONS ===== */}
      <ReviewerQuestions />

      {/* ===== ASSESSMENT ===== */}
      <AssessmentSection />

      {/* ===== AUDIT / INCIDENT ===== */}
      <section id="solutions" className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Audit &amp; Incident Response
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              When someone asks &ldquo;what happened?&rdquo;
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              When audit, compliance, or a bank partner asks what happened with a payment, Kontext gives you:
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Complete event trail", desc: "Every action from payment initiation through final disposition, linked in sequence." },
              { title: "Exact decision inputs", desc: "The data the system had at decision time — amounts, counterparties, thresholds, context." },
              { title: "Policy results at the time", desc: "Which screening checks ran, what rules applied, and whether they passed or flagged." },
              { title: "Approval history", desc: "Who or what approved, when, and under which authority — human or automated." },
              { title: "Linked execution evidence", desc: "Transaction hashes, payment references, and settlement confirmations tied to the decision." },
              { title: "Exportable case packet", desc: "One-click export of the full evidence package for examiner review or partner diligence." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <h3 className="text-[15px] font-semibold text-[var(--ic-text)]">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ARCHITECTURE ===== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Where Kontext Fits
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              An evidence layer across your payment stack
            </h2>
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 md:flex-row md:gap-0">
            {/* Box 1 — Your Stack */}
            <div className="flex-1 rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] p-7">
              <h3 className="text-base font-semibold text-[var(--ic-text)]">Your Payment Stack</h3>
              <div className="my-4 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>Payment Agents &amp; Automation</li>
                <li>Wallet APIs</li>
                <li>Payment Orchestration</li>
                <li>Card Platforms</li>
                <li>Banking APIs</li>
                <li>Stablecoin Rails</li>
              </ul>
            </div>

            <div className="flex-shrink-0 px-3 text-[var(--ic-text-dim)]">
              <ArrowRight size={24} className="hidden md:block" />
              <ArrowRight size={24} className="rotate-90 md:hidden" />
            </div>

            {/* Box 2 — Kontext */}
            <div className="flex-1 rounded-xl border border-[var(--ic-accent)]/25 bg-[var(--ic-accent-dim)] p-7">
              <h3 className="text-base font-semibold text-[var(--ic-accent)]">Kontext</h3>
              <span className="mt-1 font-mono text-[10px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
                Evidence Layer
              </span>
              <div className="my-4 h-px bg-[var(--ic-accent)]/10" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>OFAC Screening</li>
                <li>Decision Context Capture</li>
                <li>Evidence Logging</li>
                <li>Tamper-Evident Chain (Patented)</li>
                <li>Audit Export</li>
              </ul>
            </div>

            <div className="flex-shrink-0 px-3 text-[var(--ic-text-dim)]">
              <ArrowRight size={24} className="hidden md:block" />
              <ArrowRight size={24} className="rotate-90 md:hidden" />
            </div>

            {/* Box 3 — Evidence Store */}
            <div className="flex-1 rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] p-7">
              <h3 className="text-base font-semibold text-[var(--ic-text)]">Evidence Store</h3>
              <div className="my-4 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>Audit Trails</li>
                <li>Case Packets</li>
                <li>Compliance Reports</li>
                <li>GRC / SIEM Export</li>
              </ul>
            </div>
          </div>

          {/* Green note */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-md bg-[var(--ic-green-dim)] px-5 py-2.5">
              <Info size={14} className="text-[var(--ic-green)]" />
              <span className="text-[13px] font-medium text-[var(--ic-green)]">
                Kontext doesn&apos;t touch funds. Read-only evidence capture.
              </span>
            </div>
          </div>

          <p className="mt-6 text-center text-[13px] text-[var(--ic-text-dim)]">
            Kontext doesn&apos;t replace your sanctions vendor, case management system, payment processor, ledger, or wallet provider.
            It sits across them as the evidence layer.
          </p>
        </div>
      </section>

      {/* ===== INTEGRATIONS STRIP ===== */}
      <IntegrationsStrip />

      {/* ===== WHAT KONTEXT IS NOT ===== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              What We Are
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Kontext is the evidence layer, not a replacement
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Kontext is not a fraud engine, banking core, or payment processor.
              It is the evidence and controls layer that explains payment
              decisions across your stack.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                label: "Payment Processor",
                does: "Moves money",
                color: "var(--ic-text-dim)",
              },
              {
                label: "Fraud Tool",
                does: "Scores risk",
                color: "var(--ic-text-dim)",
              },
              {
                label: "Kontext",
                does: "Proves the decision context",
                color: "var(--ic-accent)",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border p-6 text-center ${
                  item.label === "Kontext"
                    ? "border-[var(--ic-accent)]/25 bg-[var(--ic-accent-dim)]"
                    : "border-[var(--ic-border)] bg-[var(--ic-surface)]"
                }`}
              >
                <h3
                  className="text-base font-semibold"
                  style={{ color: item.color }}
                >
                  {item.label}
                </h3>
                <p className="mt-2 text-[15px] text-[var(--ic-text-muted)]">
                  {item.does}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Pricing
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Priced like a controls product, not a logging meter
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Annual platform fee based on payment decisions monitored — the unit
              your compliance and risk teams already think in.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Starter */}
            <div className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-8">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Starter</span>
              <p className="mt-3 text-sm font-medium text-[var(--ic-text)]">
                For teams preparing for launch or first partner review
              </p>
              <div className="my-6 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-3">
                {[
                  "1 production environment",
                  "Capped monthly payment volume",
                  "OFAC screening (built-in SDN)",
                  "Tamper-evident audit trail",
                  "JSON + CSV audit export",
                  "Standard evidence retention",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-[var(--ic-green)]" />
                    <span className="text-[13px] text-[var(--ic-text)]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-8 flex w-full items-center justify-center rounded-lg border border-[var(--ic-border)] py-2.5 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)]"
              >
                Book a demo
              </Link>
            </div>

            {/* Growth */}
            <div className="rounded-xl border border-[var(--ic-accent)]/40 bg-[hsl(var(--background))] p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-[var(--ic-accent)] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              </div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-accent)]">Growth</span>
              <p className="mt-3 text-sm font-medium text-[var(--ic-text)]">
                For startups running live payment operations with formal controls
              </p>
              <div className="my-6 h-px bg-[var(--ic-accent)]/10" />
              <ul className="space-y-3">
                {[
                  "Everything in Starter",
                  "Higher monthly payment volume",
                  "Multiple environments + integrations",
                  "Role-based access (compliance, risk, audit)",
                  "Advanced alerting + webhooks",
                  "SAR/CTR report templates",
                  "Multi-chain evidence trails",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-[var(--ic-green)]" />
                    <span className="text-[13px] text-[var(--ic-text)]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-8 flex w-full items-center justify-center rounded-lg bg-[var(--ic-accent)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
              >
                Book a demo
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-8">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Enterprise</span>
              <p className="mt-3 text-sm font-medium text-[var(--ic-text)]">
                For multi-rail teams with audit, bank, and enterprise diligence needs
              </p>
              <div className="my-6 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-3">
                {[
                  "Everything in Growth",
                  "Custom volume bands",
                  "Extended evidence retention",
                  "Custom policy + controls mapping",
                  "Case management / GRC integrations",
                  "Security review + procurement terms",
                  "Dedicated support + SLAs",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-[var(--ic-green)]" />
                    <span className="text-[13px] text-[var(--ic-text)]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-8 flex w-full items-center justify-center rounded-lg border border-[var(--ic-border)] py-2.5 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)]"
              >
                Contact sales
              </Link>
            </div>
          </div>

          {/* ROI strip */}
          <div className="mt-12 rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-8">
            <p className="text-center text-sm font-semibold text-[var(--ic-text)]">
              Why teams invest before they feel &ldquo;big enough&rdquo;
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-red)]">Before Kontext</span>
                <ul className="mt-3 space-y-2">
                  {[
                    "Launch reviews stall on missing evidence",
                    "Hours reconstructing each incident",
                    "Spreadsheets and screenshots for diligence",
                    "Manual responses to partner questionnaires",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-red)]" />
                      <span className="text-[13px] text-[var(--ic-text-muted)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-green)]">With Kontext</span>
                <ul className="mt-3 space-y-2">
                  {[
                    "Launch reviews close with structured evidence packets",
                    "Incident reconstruction in seconds, not hours",
                    "Examiner-ready exports replace ad hoc collection",
                    "Diligence responses backed by verifiable evidence",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ic-green)]" />
                      <span className="text-[13px] text-[var(--ic-text-muted)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOR DEVELOPERS ===== */}
      <section id="product" className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              For Developers
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              One integration. Full evidence trail.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Wrap your payment call once — whether it&apos;s triggered by an autonomous agent, an orchestration engine, or a direct API call. Kontext records the decision context
              around every transfer or payout.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-12 lg:grid-cols-2">
            {/* Code block */}
            <CodeBlock
              code={`const result = await ctx.verify({
  txHash: transfer.hash,
  chain: 'base',
  amount: '28000',
  token: 'USDC',
  from: sender,
  to: recipient,
  agentId: 'treasury-v2'
});`}
              filename="payment-handler.ts"
            />

            {/* Outcomes */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-[var(--ic-text)]">
                What happens automatically
              </h3>
              {[
                { n: "1", title: "OFAC sanctions screening runs", desc: "Against latest SDN list, result recorded with timestamp" },
                { n: "2", title: "Decision context captured with cryptographic proof", desc: "SHA-256 hash of payment purpose, scope, and limits" },
                { n: "3", title: "Evidence joins tamper-evident chain", desc: "Each event linked cryptographically to the previous" },
                { n: "4", title: "Audit-ready export available", desc: "JSON or CSV case packet for any transaction" },
              ].map((item) => (
                <div key={item.n} className="flex gap-3.5">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[var(--ic-accent-dim)]">
                    <span className="font-mono text-xs font-semibold text-[var(--ic-accent)]">{item.n}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[var(--ic-text)]">{item.title}</p>
                    <p className="text-[13px] text-[var(--ic-text-muted)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DEVELOPER INTEGRATION ===== */}
      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Developer Integration
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              SDK, CLI, or API — however your team builds
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Developer implementation: SDK wrap, CLI commands, or direct API integration.
            </p>
          </div>

          <div className="mt-12">
            <AgentView />
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl lg:text-5xl">
            Programmable payments need evidence. Autonomous payments need even more.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
            Kontext helps teams explain every payment decision — including actions initiated by AI agents, workflows, and APIs.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="#evidence-package"
              className="inline-flex items-center rounded-lg bg-[var(--ic-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              See sample packet
            </a>
            <Link
              href="/ai-agents"
              className="inline-flex items-center rounded-lg border border-[var(--ic-border)] px-6 py-3 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)] hover:text-[var(--ic-text)]"
            >
              Explore AI agents use case
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
