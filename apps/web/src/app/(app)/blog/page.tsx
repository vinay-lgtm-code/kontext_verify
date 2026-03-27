import type { Metadata } from "next";
import Link from "next/link";

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
  return (
    <>
      {/* Header */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="font-serif text-3xl italic text-[var(--ic-text)]">
            Blog
          </h1>
          <p className="mt-4 text-sm text-[var(--ic-text-muted)]">
            Insights on compliance controls, evidence integrity, and regulatory
            readiness for programmable payments infrastructure.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="space-y-0 divide-y divide-[var(--ic-border)]">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block py-6 first:pt-0 last:pb-0"
              >
                <div className="flex items-baseline gap-3 text-xs text-[var(--ic-text-dim)]">
                  <time dateTime={post.date} className="font-mono shrink-0">
                    {post.date}
                  </time>
                  <span>{post.readTime}</span>
                  <span className="hidden sm:flex sm:gap-1.5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-[var(--ic-accent-dim)] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--ic-accent)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                </div>
                <h2 className="mt-2 text-sm font-medium text-[var(--ic-text)] group-hover:text-[var(--ic-accent)] transition-colors">
                  {post.title}
                </h2>
                <p className="mt-1 text-xs text-[var(--ic-text-muted)] leading-relaxed">
                  {post.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
