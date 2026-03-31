import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on compliance controls, evidence integrity, and regulatory readiness for programmable payments infrastructure.",
};

const posts = [
  {
    slug: "ffiec-examination-guide",
    title: "The FFIEC Appendix H Survival Guide for Payment Companies",
    description:
      "A practical walkthrough of the FFIEC BSA/AML first-request letter items most relevant to payment processors, with guidance for companies operating stablecoin, AI agent, and real-time payment flows.",
    date: "2026-03-26",
    readTime: "18 min",
    tags: ["BSA/AML", "FFIEC", "Examination Prep"],
  },
  {
    slug: "enforcement-action-analysis",
    title: "What TD Bank's $1.75B Penalty Means for Payment Startups",
    description:
      "Analysis of the TD Bank, Bank of America, and Wells Fargo enforcement actions, distilled for payment company compliance teams. What was cited, how it maps to your risk, and what evidence infrastructure would have changed the outcome.",
    date: "2026-03-26",
    readTime: "15 min",
    tags: ["Enforcement", "BSA/AML", "Risk"],
  },
  {
    slug: "bsa-always-on-settlement",
    title: "Your BSA Program Wasn't Built for 24/7 Settlement. Here's What Breaks.",
    description:
      "The GENIUS Act doesn't just add stablecoins to the BSA framework. It exposes fundamental architectural assumptions in how most institutions run their compliance programs.",
    date: "2026-03-15",
    readTime: "12 min",
    tags: ["BSA", "Stablecoins", "Compliance"],
  },
  {
    slug: "who-authorized-this",
    title: "The Examiner Question That Will Define Agentic Payments: 'Who Authorized This?'",
    description:
      "Compliance frameworks assume human agency. When AI agents autonomously send USDC, concepts like 'authorized' and 'intentional' become ambiguous. The first enforcement action will set the precedent.",
    date: "2026-03-18",
    readTime: "14 min",
    tags: ["Agentic Payments", "Compliance", "Risk"],
  },
  {
    slug: "regulated-entity-partner-problem",
    title: "You're the Regulated Entity. Your Partner Initiated the Transaction. Now What?",
    description:
      "The BaaS compliance tension amplifies with stablecoins. Irreversible transactions, 24/7 settlement, multi-chain monitoring, and the GENIUS Act overlay mean platform providers need fundamentally different compliance architecture.",
    date: "2026-03-20",
    readTime: "13 min",
    tags: ["BaaS", "Stablecoin Infrastructure", "Risk"],
  },
  {
    slug: "tamper-evident-audit-trails",
    title: "Building Tamper-Evident Audit Trails for AI Agent Transactions",
    description:
      "AI agents are making autonomous financial decisions. Learn how digest chains provide cryptographic proof that your audit logs have not been altered.",
    date: "2026-02-05",
    readTime: "8 min",
    tags: ["Engineering", "Audit", "Cryptography"],
  },
  {
    slug: "introducing-kontext",
    title: "Introducing Kontext: Trust Layer for Agentic Stablecoin Transactions",
    description:
      "AI agents are moving real money. Here is why they need a compliance layer, and how Kontext provides it in five lines of code.",
    date: "2026-02-07",
    readTime: "6 min",
    tags: ["Launch", "GENIUS Act", "USDC"],
  },
];

export default function BlogPage() {
  const [featured, ...rest] = posts;

  return (
    <>
      {/* Header */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="font-serif text-4xl italic text-[var(--ic-text)]">
            Blog
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
            Insights on compliance controls, evidence integrity, and regulatory
            readiness for programmable payments infrastructure.
          </p>
        </div>
      </section>

      {/* Featured post */}
      <section className="border-b border-[var(--ic-border)] bg-[var(--ic-surface)]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ic-accent)]">
            Latest
          </span>
          <Link
            href={`/blog/${featured.slug}`}
            className="group mt-4 block"
          >
            <h2 className="font-serif text-2xl font-normal leading-snug text-[var(--ic-text)] transition-colors group-hover:text-[var(--ic-accent)] sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ic-text-muted)]">
              {featured.description}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <time dateTime={featured.date} className="font-mono text-xs text-[var(--ic-text-dim)]">
                {featured.date}
              </time>
              <span className="text-xs text-[var(--ic-text-dim)]">{featured.readTime}</span>
              <div className="flex gap-1.5">
                {featured.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-[var(--ic-accent-dim)] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--ic-accent)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--ic-accent)] transition-all group-hover:gap-2">
              Read article <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* Remaining posts */}
      <section>
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] p-6 transition-colors hover:border-[var(--ic-accent)]/30"
              >
                <div className="flex items-center gap-3 text-xs text-[var(--ic-text-dim)]">
                  <time dateTime={post.date} className="font-mono shrink-0">
                    {post.date}
                  </time>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="mt-3 text-[15px] font-semibold leading-snug text-[var(--ic-text)] transition-colors group-hover:text-[var(--ic-accent)]">
                  {post.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ic-text-muted)] line-clamp-3">
                  {post.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-[var(--ic-accent-dim)] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--ic-accent)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
