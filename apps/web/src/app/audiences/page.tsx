import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Bot,
  Coins,
  Network,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Audiences",
  description:
    "Kontext serves AI agent startups, stablecoin issuers, and DeFi protocols with trust infrastructure tailored to each audience's compliance needs.",
};

const audiences = [
  {
    slug: "ai-agent-startups",
    icon: Bot,
    title: "AI Agent Startups",
    description:
      "Building agents that move money? Ship compliance in 5 lines of code.",
    tags: ["x402", "Stripe", "Vercel AI SDK"],
  },
  {
    slug: "stablecoin-issuers",
    icon: Coins,
    title: "Stablecoin Issuers",
    description:
      "GENIUS Act-aligned audit trails for stablecoin operations.",
    tags: ["USDC", "GENIUS Act", "Reserves"],
  },
  {
    slug: "defi-protocols",
    icon: Network,
    title: "DeFi Protocols",
    description:
      "On-chain compliance for decentralized finance.",
    tags: ["Multi-chain", "Governance", "Treasury"],
  },
];

export default function AudiencesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-border">
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Audiences
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Built for{" "}
              <span className="text-primary">your team</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Different builders have different compliance needs. Whether you are
              shipping AI agents, issuing stablecoins, or building DeFi protocols —
              Kontext adapts to your regulatory reality.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <a
                  href="https://github.com/Legaci-Labs/kontext"
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
                <Link href="/use-cases">
                  View Use Cases
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Cards */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {audiences.map((audience) => (
              <Link
                key={audience.slug}
                href={`/audiences/${audience.slug}`}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
                  <CardHeader>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
                        <audience.icon size={20} />
                      </div>
                      <Badge variant="outline">
                        {audience.title}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {audience.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {audience.description}
                    </CardDescription>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {audience.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded-[5px] border-2 border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Learn more
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

      {/* Bottom CTA */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Not sure where to start?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Install the SDK and start logging agent transactions in under 5
              minutes. Open source and free to start.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-[5px] border-2 border-border bg-card px-4 py-2 font-mono text-sm text-muted-foreground shadow-shadow-sm">
              <span className="text-primary">$</span>
              npm install kontext-sdk
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/use-cases">View Use Cases</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
