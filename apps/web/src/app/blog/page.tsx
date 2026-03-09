import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on payment infrastructure, lifecycle management, and fintech compliance.",
};

const posts = [
  {
    slug: "payment-control-plane",
    title: "Introducing the Kontext Payment Control Plane",
    description:
      "We rebuilt Kontext from a compliance logging SDK into a full payment lifecycle manager. Here is why.",
    date: "2026-03-08",
    readTime: "7 min",
    tags: ["Launch", "Payment Lifecycle", "SDK"],
  },
  {
    slug: "8-stage-payment-lifecycle",
    title: "Why Every Payment Needs 8 Stages",
    description:
      "From intent to reconciliation: the taxonomy that makes payment operations auditable, debuggable, and compliant.",
    date: "2026-03-06",
    readTime: "10 min",
    tags: ["Engineering", "Architecture", "Compliance"],
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
            Insights on payment infrastructure, lifecycle management, and
            fintech compliance.
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
