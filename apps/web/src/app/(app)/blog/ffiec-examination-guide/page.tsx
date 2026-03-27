import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title:
    "The FFIEC Appendix H Survival Guide for Payment Companies",
  description:
    "A practical walkthrough of the FFIEC BSA/AML first-request letter items most relevant to payment processors, with guidance for companies operating stablecoin, AI agent, and real-time payment flows.",
  openGraph: {
    title:
      "The FFIEC Appendix H Survival Guide for Payment Companies",
    description:
      "A practical walkthrough of the FFIEC BSA/AML first-request letter items most relevant to payment processors.",
    type: "article",
    publishedTime: "2026-03-26T00:00:00Z",
    authors: ["Kontext"],
  },
};

const blogPostJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline:
    "The FFIEC Appendix H Survival Guide for Payment Companies",
  description:
    "A practical walkthrough of the FFIEC BSA/AML first-request letter items most relevant to payment processors.",
  datePublished: "2026-03-26T00:00:00Z",
  author: {
    "@type": "Organization",
    name: "Kontext",
    url: "https://getkontext.com",
  },
  publisher: {
    "@type": "Organization",
    name: "Kontext",
    url: "https://getkontext.com",
    logo: {
      "@type": "ImageObject",
      url: "https://getkontext.com/og-image.png",
    },
  },
  url: "https://getkontext.com/blog/ffiec-examination-guide",
  mainEntityOfPage:
    "https://getkontext.com/blog/ffiec-examination-guide",
};

export default function FFIECExaminationGuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogPostJsonLd),
        }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-xs text-[var(--ic-text-dim)] hover:text-[var(--ic-accent)]"
      >
        <ArrowLeft size={12} />
        Back to blog
      </Link>

      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="outline">BSA/AML</Badge>
        <Badge variant="outline">FFIEC</Badge>
        <Badge variant="outline">Examination Prep</Badge>
      </div>

      <h1 className="mt-6 font-serif text-3xl font-normal leading-tight text-[var(--ic-text)] sm:text-4xl">
        The FFIEC Appendix H Survival Guide for Payment Companies
      </h1>

      <div className="mt-4 flex items-center gap-3 text-xs text-[var(--ic-text-dim)]">
        <time dateTime="2026-03-26" className="font-mono">
          2026-03-26
        </time>
        <span>18 min read</span>
      </div>

      <Separator className="my-8" />

      <div className="space-y-6 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
        <p>
          When an OCC or state banking examiner sends a first-request letter to
          your sponsor bank, the clock starts. Your bank partner has days to
          produce documentation across dozens of categories &mdash; and for
          third-party payment processors, many of those requests flow directly
          to you.
        </p>

        <p>
          The FFIEC BSA/AML Examination Manual, Appendix H, defines over 130
          document categories that examiners can request. Most payment companies
          have never read it. The ones that have usually discover their evidence
          is scattered across 5&ndash;8 systems with no structured way to
          produce it under time pressure.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          Why Appendix H matters for payment processors
        </h2>

        <p>
          Appendix H is not hypothetical. It is the literal document that drives
          examiner requests. When TD Bank received its $1.75B BSA penalty, the
          core finding was that they could not produce evidence that controls
          actually ran. When Bank of America received its consent order for
          monitoring gaps, the evidence deficit was in categories directly mapped
          to Appendix H.
        </p>

        <p>
          For payment processors &mdash; especially those operating stablecoin
          treasury, cross-border disbursements, or AI-agent initiated flows
          &mdash; the relevant Appendix H categories include:
        </p>

        <h3 className="mt-8 text-lg font-semibold text-[var(--ic-text)]">
          1. Processor policies and procedures
        </h3>
        <p>
          Examiners want written documentation of your compliance controls. Not
          a Confluence page that was last updated in 2024 &mdash; the specific
          policy version that was in force when a given payment was processed.
          This is where most payment companies fail first: they have policies,
          but they cannot prove which version applied to a specific transaction.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-[var(--ic-text)]">
          2. Transaction details and volume data
        </h3>
        <p>
          Activity records with amounts, counterparties, dates, and settlement
          details. For traditional processors, this comes from the core banking
          system. For stablecoin operations, it is split across blockchain
          explorers, wallet APIs, and processor dashboards &mdash; three systems
          minimum, with no unified view.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-[var(--ic-text)]">
          3. SARs filed on processor relationships
        </h3>
        <p>
          Filing history with supporting documentation. Examiners want to see
          not just that a SAR was filed, but the evidence chain that led to the
          filing decision &mdash; the alerts, the investigation notes, the
          transaction patterns that triggered the review.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-[var(--ic-text)]">
          4. Screening results and sanctions evidence
        </h3>
        <p>
          OFAC/SDN check evidence for each payment. The critical requirement is
          not just that screening happened, but that it happened <em>before</em>{" "}
          the payment executed. Most payment companies can show their screening
          vendor dashboard &mdash; but cannot prove the temporal relationship
          between the screen and the settlement.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-[var(--ic-text)]">
          5. NACHA return correspondence and alert documentation
        </h3>
        <p>
          High return rate documentation, alert investigation records, and
          correspondence with banking partners. For companies operating across
          multiple rails, this evidence lives in email inboxes, NACHA portals,
          and case management tools with no connection to payment records.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          The programmable money problem
        </h2>

        <p>
          Every new payment rail &mdash; stablecoins, real-time payments,
          AI-agent initiated flows &mdash; adds another system to the evidence
          assembly burden. A payment company operating USDC treasury on Base,
          ACH payouts through a banking partner, and card processing through a
          processor API might touch 8 systems to answer a single examiner
          question.
        </p>

        <p>
          The FFIEC did not write Appendix H with programmable money in mind.
          But examiners use it regardless. The gap between what examiners
          request and what modern payment infrastructure can produce is where
          enforcement actions happen.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          What to do about it
        </h2>

        <p>
          The companies that handle examinations well share one characteristic:
          they capture evidence at the point of decision, not after the fact.
          When an examiner asks about a specific payment, they can produce the
          decision record &mdash; policy version, screening result, approval
          chain, enforcement mode &mdash; in minutes, not days.
        </p>

        <p>
          This is not about buying more compliance tools. It is about ensuring
          the evidence from your existing tools is captured, linked, and
          exportable in a format that answers the specific categories in
          Appendix H.
        </p>

        <p>
          The GENIUS Act (signed July 2025, implementing regulations due July
          2026) will add stablecoin-specific requirements to this framework. The
          companies building evidence infrastructure now will be ready. The ones
          assembling evidence from screenshots at 11pm before an OCC exam will
          not.
        </p>
      </div>

      <Separator className="my-10" />

      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-[var(--ic-text-muted)]">
          See how Kontext maps to FFIEC examination request items.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/bank-readiness">
              Bank readiness
              <ArrowRight size={14} className="ml-2" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/#evidence-package">See sample packet</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
