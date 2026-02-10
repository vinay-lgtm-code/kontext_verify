import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Kontext",
  description:
    "The agent economy is growing fast, but trust infrastructure hasn't kept up. Kontext provides the compliance layer that makes agentic stablecoin and fiat transactions verifiable.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              About Kontext
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Every agent transaction should be verifiable
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              AI agents are moving money. They are paying vendors, settling
              invoices, and executing transactions at a pace no human team can
              manually audit. The infrastructure to verify, log, and trust these
              actions simply does not exist yet.
            </p>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              That is what Kontext is building.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="prose-kontext max-w-3xl">
            <h2>The problem</h2>
            <p>
              The agent economy is exploding. AI agents are being deployed to
              handle procurement, treasury management, vendor payments, and
              customer refunds -- all involving real money moving through
              stablecoins and traditional payment rails.
            </p>
            <p>
              But here is the gap: <strong>there is no trust layer</strong>.
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
              a trust risk. Companies cannot adopt agentic workflows at scale
              without solving this.
            </p>

            <Separator className="my-12" />

            <h2>The GENIUS Act and what it means</h2>
            <p>
              The Guiding and Establishing National Innovation for U.S.
              Stablecoins (GENIUS) Act represents a significant shift in how the
              United States approaches stablecoin regulation. It creates a
              framework for stablecoin issuers and, by extension, sets
              expectations for how stablecoin transactions should be tracked and
              reported.
            </p>
            <p>
              For builders in the agent economy, this means that compliance is
              not optional -- it is a prerequisite for operating at scale.
              Transaction logging, audit trails, and risk assessment are moving
              from "nice to have" to "must have."
            </p>
            <p>
              Kontext is designed with this regulatory trajectory in mind. We
              provide the technical infrastructure that helps developers meet
              compliance requirements without slowing down their agent
              architectures. We are not a legal advisor and we do not replace
              your compliance team. We give your engineers the tools to build
              compliance into the product from the start.
            </p>

            <Separator className="my-12" />

            <h2>The solution</h2>
            <p>
              Kontext is a TypeScript SDK and API that sits between your agents
              and the actions they take. Every action passes through Kontext,
              where it is:
            </p>
            <ol>
              <li>
                <strong>Logged</strong> -- immutable audit trail with full
                context
              </li>
              <li>
                <strong>Scored</strong> -- real-time trust score based on
                historical behavior, amount, velocity, and context
              </li>
              <li>
                <strong>Checked</strong> -- automated anomaly detection against
                configurable rules
              </li>
              <li>
                <strong>Confirmed</strong> -- optional human-in-the-loop
                approval for high-value actions
              </li>
              <li>
                <strong>Exported</strong> -- compliance-ready audit reports in
                standard formats
              </li>
            </ol>
            <p>
              Five lines of code gives you all of this. The SDK is lightweight
              (under 10kb gzipped), has zero runtime dependencies, and works
              with any agent framework. It is open source under the MIT license.
            </p>

            <Separator className="my-12" />

            <h2>Why we are building this</h2>
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
              This is early. The SDK is open source and we are building in the
              open. If you are working on agentic commerce
              with stablecoins or fiat payments, we would love to hear from you.
            </p>

            <Separator className="my-12" />

            <h2>Vision</h2>
            <p>
              The agent economy will be bigger than the app economy. Trillions
              of dollars will flow through AI agents in the next decade. Every
              one of those transactions needs to be verifiable, auditable, and
              trustworthy.
            </p>
            <p>
              Kontext&apos;s vision is to be the trust infrastructure for this
              new economy -- the compliance-support layer that every agent
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

          {/* CTA */}
          <div className="mt-16 flex flex-col items-start gap-4 sm:flex-row">
            <Button size="lg" className="gap-2" asChild>
              <a
                href="https://github.com/vinay-lgtm-code/kontext_verify"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </Button>
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <Link href="/docs">
                Read the Docs
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <a
                href="https://x.com/kontextverify"
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow on X
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
