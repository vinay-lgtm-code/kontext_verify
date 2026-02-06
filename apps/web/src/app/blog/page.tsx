import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on agent compliance, stablecoin regulation, and building trust in the agent economy.",
};

const posts = [
  {
    slug: "tamper-evident-audit-trails",
    title: "Building Tamper-Evident Audit Trails for AI Agent Transactions",
    description:
      "AI agents are making autonomous financial decisions. Learn how digest chains provide cryptographic proof that your audit logs have not been altered.",
    date: "2026-02-05",
    readTime: "8 min read",
    tags: ["Engineering", "Audit", "Cryptography"],
  },
  {
    slug: "introducing-kontext",
    title: "Introducing Kontext: Trust Layer for Agentic Stablecoin Transactions",
    description:
      "AI agents are moving real money. Here is why they need a compliance layer, and how Kontext provides it in five lines of code.",
    date: "2026-02-07",
    readTime: "6 min read",
    tags: ["Launch", "GENIUS Act", "USDC"],
  },
];

export default function BlogPage() {
  return (
    <>
      {/* Header */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Badge variant="secondary" className="mb-4">
            Blog
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            From the Kontext team
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Insights on agent compliance, stablecoin regulation, and building
            trust in the agent economy.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="group h-full transition-colors hover:border-primary/30">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                      <span aria-hidden="true">&middot;</span>
                      <span>{post.readTime}</span>
                    </div>
                    <CardTitle className="mt-2 text-xl group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">
                      {post.description}
                    </CardDescription>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                      Read more
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
