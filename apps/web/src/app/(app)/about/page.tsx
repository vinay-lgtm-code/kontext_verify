import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Lock, FileSearch } from "lucide-react";

export const metadata: Metadata = {
  title: "About Kontext",
  description:
    "The agent economy is growing fast, but compliance infrastructure hasn't kept up. Kontext provides the evidence layer that makes programmable stablecoin and fiat transactions auditable.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
            About Kontext
          </span>
          <div className="mt-4 max-w-3xl">
            <p className="text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              AI agents are moving money. They are paying vendors, settling
              invoices, and executing transactions at a pace no human team can
              manually audit. The infrastructure to verify, log, and trust these
              actions simply does not exist yet.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ic-text)]">
              That is what Kontext is building.
            </p>
          </div>
        </div>
      </section>

      {/* Problem + Regulatory — left-right split */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-start gap-16 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-6 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
              <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
                The Problem
              </span>
              <p>
                The agent economy is exploding. AI agents are being deployed to
                handle procurement, treasury management, vendor payments, and
                customer refunds -- all involving real money moving through
                stablecoins and traditional payment rails.
              </p>
              <p>
                But here is the gap: <strong className="text-[var(--ic-text)]">there is no evidence layer</strong>.
              </p>
              <p>
                When a human employee sends a $10,000 wire transfer, there are
                approval chains, audit trails, and compliance checks. When an AI
                agent does the same thing, most teams have... console logs. Maybe a
                Slack notification if they are lucky.
              </p>
              <p>
                This is not a theoretical problem. As agents gain more autonomy
                and handle higher-value transactions, the lack of compliance
                infrastructure becomes a regulatory risk, an operational risk, and
                a trust risk. Companies cannot adopt autonomous payment workflows at scale
                without solving this.
              </p>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-accent)]">
                  Regulatory Context
                </span>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  The Guiding and Establishing National Innovation for U.S.
                  Stablecoins (GENIUS) Act represents a significant shift in how the
                  United States approaches stablecoin regulation. It creates a
                  framework for stablecoin issuers and, by extension, sets
                  expectations for how stablecoin transactions should be tracked and
                  reported.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">
                  Our Position
                </span>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">
                  For builders in the agent economy, this means that compliance is
                  not optional -- it is a prerequisite for operating at scale.
                  Kontext is designed with this regulatory trajectory in mind. We
                  provide the technical infrastructure developers need to meet
                  compliance requirements without slowing down their agent
                  architectures. We are not a legal advisor and we do not replace
                  your compliance team. We give your engineers the tools to build
                  compliance into the product from the start.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution — numbered steps */}
      <section className="border-b border-[var(--ic-border)] bg-[var(--ic-surface)]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
            The Solution
          </span>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Kontext is a TypeScript SDK that sits between your agents
            and the actions they take. Every action passes through Kontext,
            where it is:
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { n: "1", label: "Logged", desc: "immutable audit trail with full context" },
              { n: "2", label: "Scored", desc: "real-time trust score based on historical behavior, amount, velocity, and context" },
              { n: "3", label: "Checked", desc: "automated anomaly detection against configurable rules" },
              { n: "4", label: "Confirmed", desc: "optional human-in-the-loop approval for high-value actions" },
              { n: "5", label: "Exported", desc: "compliance-ready audit reports in standard formats" },
            ].map((step) => (
              <div key={step.n} className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--ic-accent-dim)]">
                  <span className="font-mono text-xs font-semibold text-[var(--ic-accent)]">{step.n}</span>
                </div>
                <p className="mt-3 text-[15px] font-semibold text-[var(--ic-text)]">{step.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--ic-text-muted)]">{step.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Five lines of code gives you all of this. The SDK is lightweight
            (under 10kb gzipped) and works
            with any agent framework.
          </p>
        </div>
      </section>

      {/* Three Layers of Proof — icon cards */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
            Three Layers of Proof
          </span>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Proving compliance ran is harder than running compliance. Kontext
            provides three independent layers of cryptographic proof, each
            making it harder to claim checks didn&apos;t happen:
          </p>

          <div className="mt-10 space-y-6">
            {[
              {
                icon: ShieldCheck,
                title: "Digest chain",
                desc: "every action is SHA-256 linked to the one before it. Tamper with a single record and the chain breaks. This is your local, tamper-evident audit trail.",
              },
              {
                icon: Lock,
                title: "On-chain anchor",
                desc: "the terminal digest gets anchored to the KontextAnchor contract on Base. It\u2019s immutable and publicly verifiable. Anyone with an RPC URL can confirm the digest existed at a specific block. No Kontext account needed.",
              },
              {
                icon: FileSearch,
                title: "A2A attestation",
                desc: "both agents in a transaction exchange their terminal digests. Each side independently proves they ran compliance checks. The counterparty\u2019s digest is your receipt that they checked too.",
              },
            ].map((layer) => (
              <div key={layer.title} className="flex gap-5 rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6">
                <layer.icon size={24} className="mt-0.5 flex-shrink-0 text-[var(--ic-accent)]" />
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--ic-text)]">{layer.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--ic-text-muted)]">{layer.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
            Each layer works independently. Use one, two, or all three. The
            on-chain anchor costs under $0.01 on Base. The A2A attestation
            uses native fetch() with zero dependencies.
          </p>
        </div>
      </section>

      {/* Why + Vision — side by side */}
      <section>
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
                Why We Build This
              </span>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
                <p>
                  There is a clear gap in the market that will only grow as agents
                  become more autonomous and handle more money.
                </p>
                <p>
                  We have spent time at the intersection of developer tools,
                  compliance, and crypto infrastructure, and we believe the right
                  approach is developer-first: make compliance as easy as adding a
                  middleware. If the developer experience is bad, teams will bolt it
                  on as an afterthought -- or worse, skip it entirely.
                </p>
                <p>
                  Kontext is designed to be the compliance-support layer you
                  actually want to use. Clean API, great TypeScript support,
                  sensible defaults, and clear documentation.
                </p>
                <p>
                  This is early. If you are working on programmable payments
                  with stablecoins or fiat payments, we would love to hear from you.
                </p>
              </div>
            </div>

            <div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
                Vision
              </span>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
                <p>
                  The agent economy will be bigger than the app economy. Trillions
                  of dollars will flow through AI agents in the next decade. Every
                  one of those transactions needs to be verifiable, auditable, and
                  trustworthy.
                </p>
                <p>
                  Kontext&apos;s vision is to be the compliance evidence infrastructure for this
                  new economy -- the evidence layer that every payment
                  builder reaches for, the way Stripe became the payment layer
                  every developer reaches for.
                </p>
                <p>
                  We started with stablecoins because that is where the regulatory
                  pressure is highest, and have expanded to fiat payment rails
                  like Stripe. The architecture is designed for any action an
                  agent takes that needs verification and trust.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 flex flex-col items-start gap-4 sm:flex-row">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/docs">
                Read the Docs
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <Link href="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
