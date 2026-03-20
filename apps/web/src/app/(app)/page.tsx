import Link from "next/link";
import { GridBackground } from "@/components/grid-background";
import { CodeBlock } from "@/components/code-block";
import { HeroSection } from "@/components/hero-section";
import { AgentView } from "@/components/agent-view";
import { ComplianceCommandCenter } from "@/components/compliance-command-center";
import {
  ShieldCheck,
  ScanEye,
  FileSearch,
  CreditCard,
  Code,
  ArrowRight,
  Check,
  Download,
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
                  '"We think we checked" — no proof screening ran',
                  "Hours to reconstruct a single flagged payment",
                  "No exportable evidence for examiner review",
                  "No record of which system or agent authorized the payment decision",
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
                  "Cryptographic proof that screening checks ran",
                  "Patented tamper-evident audit trail with digest chain integrity",
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
              One view across stablecoins, ACH, wire, card, and SEPA — whether initiated by an agent, a human, or a scheduled system.
            </p>
          </div>

          <div className="mt-12">
            <ComplianceCommandCenter />
          </div>
        </div>
      </section>

      {/* ===== EVIDENCE PACKAGE ===== */}
      <section id="product" className="relative px-4 py-24 sm:px-6 lg:px-8">
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
              with full decision context — from intent to execution to export.
            </p>
          </div>

          {/* Evidence record card */}
          <div className="mt-12 overflow-hidden rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--ic-border)] px-6 py-4">
              <span className="font-mono text-xs font-medium text-[var(--ic-text)]">
                TXN-2026-03-19-7f8a2b
              </span>
              <span className="inline-flex items-center gap-1.5 rounded bg-[var(--ic-green-dim)] px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ic-green)]" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--ic-green)]">
                  Compliant
                </span>
              </span>
            </div>

            {/* Body */}
            <div className="space-y-5 p-6">
              {/* Row 1 */}
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Amount</span>
                  <p className="mt-1 text-[15px] font-semibold text-[var(--ic-text)]">$28,000.00 USDC</p>
                </div>
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Corridor</span>
                  <p className="mt-1 text-[15px] font-medium text-[var(--ic-text)]">US → EU (Base)</p>
                </div>
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Timestamp</span>
                  <p className="mt-1 text-[15px] font-medium text-[var(--ic-text)]">2026-03-19 14:32:07 UTC</p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">OFAC Screening</span>
                  <p className="mt-1 text-sm font-medium text-[var(--ic-green)]">
                    Passed — SDN v2026.03.18, checked in 42ms
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Intent Hash</span>
                  <p className="mt-1 font-mono text-xs text-[var(--ic-text-muted)]">
                    sha256:e3b0c44...9b2d8f (invoice-payment)
                  </p>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Approval</span>
                  <p className="mt-1 text-sm font-medium text-[var(--ic-text)]">
                    Auto-approved (within $50K daily limit)
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Digest Chain</span>
                  <p className="mt-1 text-sm font-medium text-[var(--ic-text)]">
                    Position #1,847 — chain verified
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">Risk Level</span>
                  <span className="mt-1 inline-flex rounded bg-[var(--ic-green-dim)] px-2 py-0.5">
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--ic-green)]">Low</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-[var(--ic-border)] px-6 py-3">
              <button className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ic-accent)]/20 bg-[var(--ic-accent-dim)] px-4 py-2 text-xs font-medium text-[var(--ic-accent)] transition-colors hover:bg-[var(--ic-accent)]/15">
                <Download size={14} />
                Export case packet
              </button>
            </div>
          </div>
        </div>
      </section>

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
                desc: "Patented tamper-evident digest chain proves no records were altered after the fact.",
              },
              {
                icon: CreditCard,
                title: "Payments Product",
                desc: "Add compliance controls without rebuilding your payment stack. Works across stablecoin, card, and banking rails.",
              },
              {
                icon: Code,
                title: "Platform Engineering",
                desc: "One SDK integration. Works whether payments are triggered by autonomous agents, orchestration systems, or direct API calls.",
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

      {/* ===== INTEGRATION POINT ===== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              One Integration
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
                { n: "2", title: "Intent context is hashed and bound", desc: "SHA-256 hash of payment purpose, scope, and limits" },
                { n: "3", title: "Evidence joins patented tamper-evident chain", desc: "Each event linked cryptographically to the previous" },
                { n: "4", title: "Optional on-chain anchoring", desc: "Anchor digest to Base for independent verification" },
                { n: "5", title: "Audit-ready export available", desc: "JSON or CSV case packet for any transaction" },
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
              <p className="mt-6 font-mono text-[11px] text-[var(--ic-text-dim)]">
                agentId identifies the autonomous system or service account that authorized the payment — captured in every evidence record.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== EXPLORE THE SDK ===== */}
      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Integration
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Drop into your existing payment flows
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              SDK, CLI, or direct API integration — however your team builds, Kontext fits.
            </p>
          </div>

          <div className="mt-12">
            <AgentView />
          </div>
        </div>
      </section>

      {/* ===== EXAMINER CARDS ===== */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Examiner Questions
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Three questions your examiner will ask
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                question: '"Were the counterparties screened?"',
                badge: "OFAC Cleared",
                badgeColor: "green",
                answer: "Both addresses screened against SDN list v2026.03.18. Result: no match. Check completed in 42ms with full provenance recorded.",
              },
              {
                question: '"Was this payment authorized for this purpose?"',
                badge: "Intent Verified",
                badgeColor: "accent",
                answer: "Intent hash binds payment purpose (invoice-payment), amount ($28K), and daily limit ($50K). Hash verified against execution parameters.",
              },
              {
                question: '"Has this audit record been modified?"',
                badge: "Chain Intact",
                badgeColor: "green",
                answer: "Patented tamper-evident digest chain verified. Position #1,847. Any modification would break the cryptographic link to all subsequent records.",
              },
            ].map((card) => (
              <div
                key={card.question}
                className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-7"
              >
                <p className="font-serif text-xl italic leading-snug text-[var(--ic-text)]">
                  {card.question}
                </p>
                <div className="my-5 h-px bg-[var(--ic-border)]" />
                <span
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 ${
                    card.badgeColor === "green"
                      ? "bg-[var(--ic-green-dim)]"
                      : "bg-[var(--ic-accent-dim)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      card.badgeColor === "green"
                        ? "bg-[var(--ic-green)]"
                        : "bg-[var(--ic-accent)]"
                    }`}
                  />
                  <span
                    className={`font-mono text-[9px] font-semibold uppercase tracking-wider ${
                      card.badgeColor === "green"
                        ? "text-[var(--ic-green)]"
                        : "text-[var(--ic-accent)]"
                    }`}
                  >
                    {card.badge}
                  </span>
                </span>
                <p className="mt-4 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {card.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              A compliance layer across your payment stack
            </h2>
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 md:flex-row md:gap-0">
            {/* Box 1 — Your Stack */}
            <div className="flex-1 rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] p-7">
              <h3 className="text-base font-semibold text-[var(--ic-text)]">Your Payment Stack</h3>
              <div className="my-4 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>Autonomous Payment Agents</li>
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
                Compliance Layer
              </span>
              <div className="my-4 h-px bg-[var(--ic-accent)]/10" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>OFAC Screening</li>
                <li>Decision Context Capture</li>
                <li>Evidence Logging</li>
                <li>Tamper-Evident Chain (Patented)</li>
                <li className="font-mono text-[9px] text-[var(--ic-text-dim)]">US 12,463,819 B1</li>
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

          {/* Doesn't replace */}
          <p className="mt-6 text-center text-[13px] text-[var(--ic-text-dim)]">
            Kontext doesn&apos;t replace your sanctions vendor, case management system, payment processor, ledger, or wallet provider.
            It sits across them as the evidence layer.
          </p>
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
            <p className="mx-auto mt-2 max-w-md text-[15px] text-[var(--ic-text-muted)]">
              Compliance infrastructure your board can point to.
            </p>
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
                For teams standing up programmable payments controls
              </p>
              <div className="my-6 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-3">
                {[
                  "1 production environment",
                  "Capped monthly payment volume",
                  "OFAC screening (built-in SDN)",
                  "Patented tamper-evident chain",
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
                For payment infrastructure companies with active compliance teams
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
                For regulated platforms with multi-rail programs and audit requirements
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
          <div className="mt-12 rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6">
            <p className="text-center text-sm font-medium text-[var(--ic-text)]">
              Why teams invest in Kontext
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                "Fewer hours reconstructing payment incidents",
                "Close bank partnerships and enterprise deals faster",
                "Reduce regulatory risk exposure across automated payment flows",
                "Lower operational risk from automated payments",
              ].map((v) => (
                <p key={v} className="text-[12px] leading-relaxed text-[var(--ic-text-muted)]">
                  {v}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl lg:text-5xl">
            Be ready to explain every payment decision
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
            Reduce risk, accelerate partner diligence, and give your board defensible proof that controls are in place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-[var(--ic-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              Book a demo
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center rounded-lg border border-[var(--ic-border)] px-6 py-3 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)] hover:text-[var(--ic-text)]"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
