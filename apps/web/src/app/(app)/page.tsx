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
  ArrowRight,
  Check,
  CreditCard,
  FileSearch,
  Globe,
  Lock,
  ScanEye,
  ShieldCheck,
  Code,
} from "lucide-react";

const controlsCards = [
  {
    title: "Pre-send blocking",
    desc: "Block or escalate non-compliant transfers before funds move. Start in advisory mode, graduate into enforced controls, and hold threshold exceptions for human review.",
  },
  {
    title: "Sanctions and policy proof",
    desc: "Show exactly which checks ran, when they ran, what list or policy version applied, and whether the payment stayed within bounds.",
  },
  {
    title: "Approval lineage",
    desc: "Capture who or what approved the action, under which authority, with support for workflow, API, and AI-initiated payment paths.",
  },
  {
    title: "Tamper-evident integrity",
    desc: "Cryptographic proof that no one altered the record \u2014 independently verifiable and portable beyond your internal tooling.",
  },
  {
    title: "Exportable review packets",
    desc: "Hand your examiner a complete packet \u2014 diligence, incident review, or redacted exports \u2014 without stitching together screenshots and logs after the fact.",
  },
];

const deploymentModes = [
  {
    mode: "Advisory",
    desc: "Capture the decision, explain what happened, and surface issues without interrupting the payment flow.",
  },
  {
    mode: "Blocking",
    desc: "Stop non-compliant payments automatically or route them into an explicit escalation path before execution.",
  },
  {
    mode: "Human review",
    desc: "Hold above-threshold or out-of-policy actions until an approver confirms the task and the evidence packet is complete.",
  },
];

const governanceItems = [
  {
    title: "PII separation",
    desc: "Keep sensitive payment and identity fields separate from the verifiable audit record so governance actions do not corrupt the evidence chain.",
  },
  {
    title: "Subject access export",
    desc: "Support SAR workflows with structured exports of the data associated with a subject or payment review.",
  },
  {
    title: "Erasure workflow logging",
    desc: "Log that a governance action occurred while preserving audit integrity and the proof that the request was handled.",
  },
  {
    title: "Redacted exports",
    desc: "Mask addresses and identifiers for partner diligence, internal distribution, and other non-compliance audiences.",
  },
];

const verificationItems = [
  "Cryptographic proof that no one altered the record, not hidden in a back office database",
  "Export files your auditors, counterparties, and regulators can independently verify",
  "Evidence stays portable across processors, ledgers, wallet providers, and workflow systems",
];

const developerOutcomes = [
  {
    n: "1",
    title: "Start without a platform migration",
    desc: "Wrap an existing payment call once and begin in advisory mode with local defaults or auto-configuration.",
  },
  {
    n: "2",
    title: "Plug into your current stack",
    desc: "Send evidence into OpenTelemetry, observability tools, screening providers, case systems, and approval workflows.",
  },
  {
    n: "3",
    title: "Promote controls over time",
    desc: "Move from capture-only to blocking and human review once policy thresholds and escalation paths are ready.",
  },
  {
    n: "4",
    title: "Export proof, not raw logs",
    desc: "Give compliance teams reviewer-ready packets while developers keep using SDK, CLI, API, and middleware entry points.",
  },
];

export default function LandingPage() {
  return (
    <>
      <GridBackground />

      <HeroSection />

      {/* Social proof bar */}
      <section className="relative px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
            Built with compliance teams at payment companies across stablecoin
            treasury, cross-border payouts, and embedded finance.
          </p>
        </div>
      </section>

      {/* Cost-of-inaction stats */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              The Cost of Fragmented Payment Evidence
            </span>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                stat: "$1.75B",
                label: "TD Bank's BSA penalty",
                detail: "Core finding: couldn't prove controls ran.",
                source: "NETBankAudit",
              },
              {
                stat: "61%",
                label: "Increase in compliance hours since 2016",
                detail: "While headcount grew only 20%.",
                source: "BPI Survey",
              },
              {
                stat: "4 hours",
                label: "Average time per alert investigation",
                detail: "Mostly ruling out false positives.",
                source: "Flagright",
              },
            ].map((item) => (
              <div
                key={item.stat}
                className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-8 text-center"
              >
                <p className="font-serif text-4xl font-normal text-[var(--ic-accent)]">
                  {item.stat}
                </p>
                <p className="mt-3 text-[15px] font-semibold text-[var(--ic-text)]">
                  {item.label}
                </p>
                <p className="mt-1 text-[13px] text-[var(--ic-text-muted)]">
                  {item.detail}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[var(--ic-text-dim)]">
                  Source: {item.source}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[15px] text-[var(--ic-text-muted)]">
            Every programmable money rail you add multiplies this problem. Kontext collapses it.
          </p>
        </div>
      </section>

      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              The Compliance Gap
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              What happens when the examiner calls
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Every compliance review comes down to the same questions. Here is
              what answering them looks like today — and what it could look like.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                scenario: "\u201cShow me the approval chain for this $50K USDC transfer\u201d",
                without: "3 systems, 2 hours, a stitched-together PDF",
                withK: "One evidence packet, approval chain with timestamps, exported in seconds",
              },
              {
                scenario: "\u201cProve sanctions screening ran before this payment executed\u201d",
                without: "Screening vendor log says it ran. Payment ledger says it settled. No proof they\u2019re connected.",
                withK: "OFAC/SDN result timestamped and cryptographically linked to the payment decision record",
              },
              {
                scenario: "\u201cAn AI agent initiated this payment. Who authorized it?\u201d",
                without: "Application logs show the agent ran. No record of delegation authority, policy bounds, or human approval.",
                withK: "Agent ID, instruction reference, policy version, approval chain, and enforcement mode \u2014 all in one record",
              },
            ].map((item) => (
              <div
                key={item.scenario}
                className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-7"
              >
                <p className="text-[15px] font-semibold leading-snug text-[var(--ic-text)]">
                  {item.scenario}
                </p>
                <div className="mt-5 space-y-4">
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-red)]">
                      Without Kontext
                    </span>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                      {item.without}
                    </p>
                  </div>
                  <div className="h-px bg-[var(--ic-border)]" />
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-green)]">
                      With Kontext
                    </span>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                      {item.withK}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Command Center
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              What your compliance team sees for every payment
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              One view across stablecoins, ACH, wire, card, and more, including
              payments initiated by humans, workflows, APIs, and AI agents.
            </p>
          </div>

          <div className="mt-12">
            <ComplianceCommandCenter />
          </div>
        </div>
      </section>

      <section id="evidence-package" className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Sample Artifact
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              The evidence package for a single payment
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Capture initiation source, enforcement mode, policy checks,
              screening results, approval lineage, verification proof, and
              export controls in one reviewer-ready record.
            </p>
          </div>

          <div className="mt-12">
            <PaymentDecisionPacket variant="full" />
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Controls + Evidence
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Built to prove your BSA/AML and OFAC controls ran
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Your compliance team can prove every BSA/AML and OFAC screening
              check ran, package the record for OCC/FinCEN examination prep, and
              export evidence an examiner can trust.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {controlsCards.map((card) => (
              <div
                key={card.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <ShieldCheck size={20} className="text-[var(--ic-accent)]" />
                <h3 className="mt-3 text-[15px] font-semibold text-[var(--ic-text)]">
                  {card.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--ic-border)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Deployment Modes
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Start with visibility, grow into enforcement
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Teams can adopt Kontext without replatforming, then move from
              evidence capture to blocking and approval workflows as controls
              mature.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {deploymentModes.map((item) => (
              <div
                key={item.mode}
                className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6"
              >
                <h3 className="text-[16px] font-semibold text-[var(--ic-text)]">
                  {item.mode}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <InitiationSourcesStrip />

      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Who It Serves
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Built for teams that carry review and control liability
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Compliance comes first, but treasury, audit, and engineering all
              need the same defensible record.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: ShieldCheck,
                title: "Compliance",
                desc: "The #1 pattern in recent consent orders \u2014 TD Bank ($1.75B), Bank of America, Wells Fargo \u2014 is \u2018couldn\u2019t produce evidence that controls ran.\u2019 Prove every check ran and export reviewer-ready packets before the examiner asks.",
              },
              {
                icon: ScanEye,
                title: "Risk",
                desc: "See when controls trigger, what got blocked or escalated, and where risky payment patterns need attention.",
              },
              {
                icon: CreditCard,
                title: "Treasury & Ops",
                desc: "Operate across rails with clear approval requirements, enforcement states, and exception workflows.",
              },
              {
                icon: FileSearch,
                title: "Internal Audit",
                desc: "Verify records were not altered, confirm the exact policy version applied, and review governance actions with context.",
              },
              {
                icon: Code,
                title: "Platform Engineering",
                desc: "One integration point into existing payment paths, with evidence exported to compliance teams instead of rebuilt from logs.",
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

      <ReviewerQuestions />

      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Independent Verification
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Proof that travels beyond your internal systems
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {verificationItems.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-6"
              >
                <Lock size={18} className="text-[var(--ic-accent)]" />
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--ic-border)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Data Governance
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Retention, redaction, and erasure without breaking audit integrity
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Built for FinCEN SAR preservation and GDPR Article 17 erasure
              workflows, while preserving the evidence that governance actions
              happened when they should have.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {governanceItems.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6"
              >
                <Globe size={18} className="text-[var(--ic-accent)]" />
                <h3 className="mt-3 text-[15px] font-semibold text-[var(--ic-text)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AssessmentSection />

      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Where Kontext Fits
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              8 systems. 1 evidence record.
            </h2>
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 md:flex-row md:gap-0">
            <div className="flex-1 rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] p-7">
              <h3 className="text-base font-semibold text-[var(--ic-text)]">Your Payment Stack</h3>
              <div className="my-4 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>Payment agents and orchestration</li>
                <li>Wallet APIs and ledgers</li>
                <li>Processors and banking rails</li>
                <li>Sanctions and risk vendors</li>
                <li>Case management and approval systems</li>
              </ul>
            </div>

            <div className="flex-shrink-0 px-3 text-[var(--ic-text-dim)]">
              <ArrowRight size={24} className="hidden md:block" />
              <ArrowRight size={24} className="rotate-90 md:hidden" />
            </div>

            <div className="flex-1 rounded-xl border border-[var(--ic-accent)]/25 bg-[var(--ic-accent-dim)] p-7">
              <h3 className="text-base font-semibold text-[var(--ic-accent)]">Kontext</h3>
              <span className="mt-1 font-mono text-[10px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
                Controls + Evidence
              </span>
              <div className="my-4 h-px bg-[var(--ic-accent)]/10" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>Policy evaluation and enforcement modes</li>
                <li>Sanctions and decision context capture</li>
                <li>Approval and escalation lineage</li>
                <li>Verifiable audit proof and exports</li>
              </ul>
            </div>

            <div className="flex-shrink-0 px-3 text-[var(--ic-text-dim)]">
              <ArrowRight size={24} className="hidden md:block" />
              <ArrowRight size={24} className="rotate-90 md:hidden" />
            </div>

            <div className="flex-1 rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] p-7">
              <h3 className="text-base font-semibold text-[var(--ic-text)]">Reviewer Outputs</h3>
              <div className="my-4 h-px bg-[var(--ic-border)]" />
              <ul className="space-y-2 text-[13px] text-[var(--ic-text-muted)]">
                <li>Examiner packets</li>
                <li>Partner diligence exports</li>
                <li>Incident review files</li>
                <li>Redacted evidence bundles</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-md bg-[var(--ic-green-dim)] px-5 py-2.5">
              <Check size={14} className="text-[var(--ic-green)]" />
              <span className="text-[13px] font-medium text-[var(--ic-green)]">
                Kontext does not custody or move funds. It evaluates, proves,
                and exports the controls around the payment decision.
              </span>
            </div>
          </div>
        </div>
      </section>

      <IntegrationsStrip />

      <section className="relative border-t border-[var(--ic-border)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Low-Friction Adoption
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Start without a platform migration
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Use one integration point, auto-configuration, and middleware
              patterns to fit Kontext around existing payment paths before you
              expand into tighter controls.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {developerOutcomes.map((item) => (
              <div key={item.n} className="flex gap-4 rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--ic-accent-dim)]">
                  <span className="font-mono text-xs font-semibold text-[var(--ic-accent)]">{item.n}</span>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[var(--ic-text)]">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="relative border-t border-[var(--ic-border)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              For Developers
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              One integration for controls, evidence, and exports
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Developer implementation comes after the business case: wrap the
              payment path once, start in advisory mode, then promote flows into
              blocking and human review.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-12 lg:grid-cols-2">
            <CodeBlock
              code={`const ctx = Kontext.auto();

const result = await ctx.verify({
  txHash: transfer.hash,
  chain: "base",
  amount: "28000",
  token: "USDC",
  from: sender,
  to: recipient,
  agentId: "treasury-v2",
  enforcement: "blocking",
  onBlock: "route_to_human_review"
});`}
              filename="payment-handler.ts"
            />

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-[var(--ic-text)]">
                What happens automatically
              </h3>
              {[
                {
                  n: "1",
                  title: "Policy and sanctions checks run",
                  desc: "Results are timestamped, versioned, and tied to the payment before execution.",
                },
                {
                  n: "2",
                  title: "Enforcement mode is recorded",
                  desc: "Advisory, blocking, and human review paths remain visible to reviewers later.",
                },
                {
                  n: "3",
                  title: "Proof is returned with the event",
                  desc: "Digest proof and trace context can travel into observability, audit, and diligence workflows.",
                },
                {
                  n: "4",
                  title: "Export paths stay ready",
                  desc: "Examiner, incident, diligence, and redacted exports are available without rebuilding the trail.",
                },
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

      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Developer Integration
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              SDK, CLI, API, and middleware entry points
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Developers can implement with the SDK, CLI, direct API calls, or
              middleware while compliance teams stay focused on the evidence
              outcome.
            </p>
          </div>

          <div className="mt-12">
            <AgentView />
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Pricing
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Controls maturity aligned to your operating stage
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Choose sponsor bank diligence readiness, live examination controls,
              or enterprise audit depth. Your compliance team picks the tier
              that matches their review obligations.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Starter",
                desc: "Pass your first partner review",
                items: ["Advisory mode", "Standard evidence retention", "JSON + CSV exports", "Human / API / workflow initiation tracking"],
              },
              {
                name: "Growth",
                desc: "Survive an examiner call",
                items: ["Blocking and escalation", "Examiner packet export", "Approval workflows", "OpenTelemetry and integrations"],
              },
              {
                name: "Enterprise",
                desc: "Prove it to anyone",
                items: ["Partner diligence exports", "Third-party verification", "GDPR / SAR support", "GRC and case system integration"],
              },
            ].map((plan) => (
              <div key={plan.name} className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-8">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                  {plan.name}
                </span>
                <p className="mt-3 text-sm font-medium text-[var(--ic-text)]">{plan.desc}</p>
                <ul className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check size={14} className="text-[var(--ic-green)]" />
                      <span className="text-[13px] text-[var(--ic-text)]">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="mt-8 flex w-full items-center justify-center rounded-lg border border-[var(--ic-border)] py-2.5 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)]"
                >
                  View pricing
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl lg:text-5xl">
            Explain every payment decision before reviewers ask.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
            Your compliance team can prove every control ran across
            programmable and AI-influenced payment flows \u2014 without rebuilding
            the rest of the stack.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="#evidence-package"
              className="inline-flex items-center rounded-lg bg-[var(--ic-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
            >
              See a sample case packet
            </a>
            <Link
              href="/assessment"
              className="inline-flex items-center rounded-lg border border-[var(--ic-border)] px-6 py-3 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)] hover:text-[var(--ic-text)]"
            >
              Run a readiness assessment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
