import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on agent compliance, stablecoin regulation, and building trust in the agent economy.",
};

const posts = [
  {
    slug: "introducing-kontext",
    title: "Introducing Kontext: Trust Layer for Agentic Stablecoin Transactions",
    description:
      "AI agents are moving real money. Here is why they need a compliance layer, and how Kontext provides it in five lines of code.",
    date: "2026-02-07",
    readTime: "6 min",
    tags: ["Launch", "GENIUS Act", "USDC"],
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
];

export default function BlogPage() {
  return (
    <>
      {/* Header */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="text-sm font-medium">
            <span className="text-[var(--term-green)]">$</span>{" "}
            BLOG
          </h1>
          <p className="mt-4 text-xs text-[var(--term-text-2)]">
            Insights on agent compliance, stablecoin regulation, and building
            trust in the agent economy.
          </p>
        </div>
      </section>

      {/* Posts — git-log style */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="space-y-0 divide-y divide-[var(--term-surface-2)]">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block py-6 first:pt-0 last:pb-0"
              >
                <div className="flex items-baseline gap-3 text-xs text-[var(--term-text-3)]">
                  <time dateTime={post.date} className="font-mono shrink-0">
                    [{post.date}]
                  </time>
                  <span>{post.readTime}</span>
                  <span className="hidden sm:inline">
                    {post.tags.map((tag) => `[${tag}]`).join(" ")}
                  </span>
                </div>
                <h2 className="mt-2 text-sm font-medium text-[var(--term-text)] group-hover:text-[var(--term-green)] transition-colors">
                  {post.title}
                </h2>
                <p className="mt-1 text-xs text-[var(--term-text-2)] leading-relaxed">
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
