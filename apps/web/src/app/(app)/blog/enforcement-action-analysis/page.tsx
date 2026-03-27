import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title:
    "What TD Bank's $1.75B Penalty Means for Payment Startups",
  description:
    "Analysis of the TD Bank, Bank of America, and Wells Fargo enforcement actions, distilled for payment company compliance teams. What was cited, how it maps to your risk, and what evidence infrastructure would have changed the outcome.",
  openGraph: {
    title:
      "What TD Bank's $1.75B Penalty Means for Payment Startups",
    description:
      "Analysis of recent BSA enforcement actions and what they mean for payment company compliance teams.",
    type: "article",
    publishedTime: "2026-03-26T00:00:00Z",
    authors: ["Kontext"],
  },
};

const blogPostJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline:
    "What TD Bank's $1.75B Penalty Means for Payment Startups",
  description:
    "Analysis of recent BSA enforcement actions and what they mean for payment company compliance teams.",
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
  url: "https://getkontext.com/blog/enforcement-action-analysis",
  mainEntityOfPage:
    "https://getkontext.com/blog/enforcement-action-analysis",
};

export default function EnforcementActionAnalysisPage() {
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
        <Badge variant="outline">Enforcement</Badge>
        <Badge variant="outline">BSA/AML</Badge>
        <Badge variant="outline">Risk</Badge>
      </div>

      <h1 className="mt-6 font-serif text-3xl font-normal leading-tight text-[var(--ic-text)] sm:text-4xl">
        What TD Bank&apos;s $1.75B Penalty Means for Payment Startups
      </h1>

      <div className="mt-4 flex items-center gap-3 text-xs text-[var(--ic-text-dim)]">
        <time dateTime="2026-03-26" className="font-mono">
          2026-03-26
        </time>
        <span>15 min read</span>
      </div>

      <Separator className="my-8" />

      <div className="space-y-6 text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
        <p>
          In 2024 and 2025, three of the largest US banks received enforcement
          actions for BSA/AML failures. The combined penalties exceeded $3
          billion. The details of each case contain lessons that every payment
          startup should understand &mdash; because the same evidence standards
          apply to you through your banking relationships.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          TD Bank: $1.75B &mdash; &ldquo;Couldn&apos;t prove controls ran&rdquo;
        </h2>

        <p>
          TD Bank&apos;s penalty was the largest BSA/AML enforcement action in
          US history. The core finding was not that TD Bank lacked compliance
          policies. They had policies. They had screening tools. They had a
          compliance team. What they could not do was produce evidence that
          those controls actually ran on the transactions examiners asked about.
        </p>

        <p>
          The distinction matters. Having a compliance program is not the same
          as proving your compliance program worked. Examiners asked for
          evidence of transaction monitoring, and TD Bank could not produce it
          in a format that answered the question.
        </p>

        <p className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-4 text-[13px]">
          <strong className="text-[var(--ic-text)]">Lesson for payment startups:</strong>{" "}
          Your compliance program is only as strong as the evidence it produces.
          If you cannot show an examiner the specific screening result, policy
          version, and approval chain for a flagged transaction, your controls
          may as well not exist.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          Bank of America: Governance and sanctions failures
        </h2>

        <p>
          Bank of America&apos;s consent order cited &ldquo;governance and
          sanctions failures&rdquo; &mdash; specifically, gaps in how the bank
          monitored transactions processed through third-party relationships.
          For every payment startup operating through a BaaS partnership or
          sponsor bank arrangement, this is directly relevant: your
          sponsor bank&apos;s examiner does not distinguish between the
          bank&apos;s transactions and yours.
        </p>

        <p>
          When the examiner finds monitoring gaps, every downstream partner
          feels the consequences. Sponsor banks respond by tightening diligence
          requirements for their payment processor partners &mdash; which means
          more evidence requests, shorter response windows, and higher standards
          for what constitutes &ldquo;proof.&rdquo;
        </p>

        <p className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-4 text-[13px]">
          <strong className="text-[var(--ic-text)]">Lesson for payment startups:</strong>{" "}
          Your sponsor bank&apos;s examination exposure is your examination
          exposure. Prepare for Section 8 diligence reviews as if the examiner
          is asking you directly &mdash; because functionally, they are.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          Wells Fargo: Suspicious activity reporting failures
        </h2>

        <p>
          Wells Fargo&apos;s enforcement action focused on suspicious activity
          reporting &mdash; specifically, failures to file SARs on transactions
          that met reporting thresholds. The issue was not that Wells Fargo
          lacked a SAR filing process. The issue was that the process could not
          keep pace with transaction volume, and the evidence trail between
          alert generation, investigation, and filing decision was incomplete.
        </p>

        <p>
          For payment companies processing stablecoin transactions &mdash;
          which settle in seconds, irreversibly, 24/7 &mdash; the volume and
          speed challenge is even more acute. When 86% of illicit crypto flows
          involve stablecoins (TRM Labs, 2025), the SAR filing burden for
          stablecoin payment processors is not hypothetical.
        </p>

        <p className="rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-4 text-[13px]">
          <strong className="text-[var(--ic-text)]">Lesson for payment startups:</strong>{" "}
          SAR filing is an evidence production problem, not just a detection
          problem. If your alert-to-filing pipeline cannot produce the
          supporting evidence (screening results, transaction context, policy
          applied) in a structured format, you will miss filing deadlines or
          produce incomplete filings.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          The pattern across all three
        </h2>

        <p>
          The common thread is not that these banks lacked compliance programs.
          All three had substantial compliance operations. The common thread is
          that they could not produce evidence that those programs worked on the
          specific transactions examiners asked about. The evidence was
          fragmented, incomplete, or not structured for examiner consumption.
        </p>

        <p>
          For payment startups, the implication is clear: the evidence
          infrastructure you build today determines whether your compliance
          program is defensible tomorrow. When the GENIUS Act implementing
          regulations arrive in July 2026, the companies with structured
          evidence capture will be ready. The ones relying on log reconstruction
          and screenshots will be in the same position TD Bank was &mdash;
          policies on paper, but no proof they ran.
        </p>

        <h2 className="mt-10 font-serif text-2xl font-normal text-[var(--ic-text)]">
          What payment startups should do now
        </h2>

        <p>
          Three concrete steps, in priority order:
        </p>

        <ol className="ml-6 list-decimal space-y-3">
          <li>
            <strong className="text-[var(--ic-text)]">
              Capture evidence at decision time, not after.
            </strong>{" "}
            Every payment decision should produce a structured record with
            policy version, screening result, approval chain, and enforcement
            mode &mdash; before the payment settles.
          </li>
          <li>
            <strong className="text-[var(--ic-text)]">
              Link screening results to payment records.
            </strong>{" "}
            The temporal relationship between the screen and the settlement
            must be provable &mdash; timestamped and cryptographically linked,
            not just &ldquo;we screen everything.&rdquo;
          </li>
          <li>
            <strong className="text-[var(--ic-text)]">
              Build examiner-ready exports now.
            </strong>{" "}
            Do not wait for the examiner to ask. Build the export capability
            before you need it, so that when the first-request letter arrives,
            your response time is minutes, not days.
          </li>
        </ol>
      </div>

      <Separator className="my-10" />

      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-[var(--ic-text-muted)]">
          See how Kontext helps payment companies build examiner-ready evidence.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/#evidence-package">
              See sample packet
              <ArrowRight size={14} className="ml-2" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/evidence-calculator">Calculate your evidence burden</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
