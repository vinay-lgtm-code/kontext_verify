"use client";

import { useState } from "react";
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
import { CodeBlock } from "@/components/code-block";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ExternalLink,
  Link2,
  Bot,
  Cpu,
  MessageSquare,
  DollarSign,
  CreditCard,
  Zap,
  Anchor,
  Handshake,
  Terminal,
  Wrench,
  ChevronDown,
  Shield,
  FileText,
  Search,
} from "lucide-react";
import { track } from "@/lib/analytics";

const marketingCategories = [
  {
    title: "Payment Rails",
    icon: DollarSign,
    items: ["USDC / Circle", "Stripe", "ACH", "Wire", "Card"],
  },
  {
    title: "Screening",
    icon: Search,
    items: ["OFAC SDN (built-in)", "Chainalysis", "OpenSanctions"],
  },
  {
    title: "Export Formats",
    icon: FileText,
    items: ["JSON", "CSV", "Examiner Packet", "Partner Diligence Packet"],
  },
  {
    title: "Compliance Controls",
    icon: Shield,
    items: [
      "Approval workflows",
      "Policy versioning",
      "Anomaly detection",
      "Tamper-evident audit trail",
    ],
  },
];

const langchainCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'langchain-agent',
  environment: 'production',
});

// Log each tool call in your LangChain agent
async function onToolCall(toolName, input, output) {
  await ctx.log({
    action: toolName,
    agentId: 'langchain-agent',
    details: JSON.stringify(input),
    metadata: { output },
  });

  // If it's a financial action, verify it
  if (toolName === 'transfer_usdc') {
    const result = await ctx.verify({
      txHash: output.hash,
      chain: 'base',
      amount: input.amount,
      token: 'USDC',
      from: input.from,
      to: input.to,
      agentId: 'langchain-agent',
    });
    console.log('Compliant:', result.compliant);
  }
}

// Export tamper-evident audit trail
const audit = await ctx.export({ format: 'json' });`;

const crewaiCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'crew-project',
  environment: 'production',
});

// CrewAI task observer — hooks into task lifecycle
function kontextTaskObserver(ctx) {
  return {
    onTaskStart: async (task, agent) => {
      await ctx.log({
        action: 'crew_task_start',
        agentId: agent.role,
        metadata: {
          taskDescription: task.description,
          crewId: task.crew_id,
        },
      });
    },

    onTaskComplete: async (task, agent, output) => {
      await ctx.log({
        action: 'crew_task_complete',
        agentId: agent.role,
        metadata: {
          output: output.raw,
          tokensUsed: output.token_usage,
        },
      });

      const trust = await ctx.getTrustScore(agent.role);
      console.log('Trust score:', trust.score);
    },
  };
}`;

const autogenCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'autogen-agents',
  environment: 'production',
});

// AutoGen message interceptor for multi-agent conversations
function kontextMiddleware(ctx) {
  return {
    async processMessage(sender, receiver, message) {
      await ctx.log({
        action: 'autogen_message',
        agentId: sender.name,
        metadata: {
          receiver: receiver.name,
          content: message.content?.substring(0, 500),
        },
      });

      // Verify financial decisions
      if (message.metadata?.isTransaction) {
        const result = await ctx.verify({
          txHash: message.metadata.txHash,
          chain: 'base',
          amount: message.metadata.amount,
          token: 'USDC',
          from: sender.wallet,
          to: receiver.wallet,
          agentId: sender.name,
        });

        if (!result.compliant) {
          return { ...message, blocked: true };
        }
      }

      return message;
    },
  };
}`;

const agentFrameworks = [
  {
    id: "langchain",
    icon: Link2,
    title: "LangChain",
    description:
      "Works with verify() and log() — add compliance evidence to any LangChain agent by wrapping tool calls.",
    code: langchainCode,
    filename: "langchain-integration.ts",
    status: "Works with verify()",
    docsLink: "/docs",
  },
  {
    id: "crewai",
    icon: Bot,
    title: "CrewAI",
    description:
      "Works with verify() and log() — hook into CrewAI's task lifecycle to capture compliance evidence across your entire crew.",
    code: crewaiCode,
    filename: "crewai-integration.ts",
    status: "Works with verify()",
    docsLink: "/docs",
  },
  {
    id: "autogen",
    icon: MessageSquare,
    title: "AutoGen",
    description:
      "Works with verify() and log() — intercept multi-agent messages and verify transaction decisions with compliance evidence.",
    code: autogenCode,
    filename: "autogen-integration.ts",
    status: "Works with verify()",
    docsLink: "/docs",
  },
];

const paymentIntegrations = [
  {
    icon: DollarSign,
    title: "USDC / Circle",
    description:
      "Native stablecoin compliance evidence for USDC transfers on Base and Ethereum. Audit trails and GENIUS Act alignment.",
    status: "Available",
    linkHref: "/use-cases/stablecoin-infrastructure",
    linkLabel: "View use case",
  },
  {
    icon: CreditCard,
    title: "Stripe",
    description:
      "Compliance evidence for agent-initiated Stripe payment intents. Audit IDs embedded in Stripe metadata for full traceability.",
    status: "Available",
    linkHref: "/use-cases",
    linkLabel: "View use cases",
  },
  {
    icon: Zap,
    title: "x402",
    description:
      "HTTP-native micropayment verification middleware. Per-request compliance checks for agent-to-service payment flows.",
    status: "Available",
    linkHref: "/use-cases",
    linkLabel: "View use cases",
  },
];

const protocolIntegrations = [
  {
    icon: Anchor,
    title: "On-Chain Anchoring",
    description:
      "Anchor your terminal digest to Base via the KontextAnchor contract. Immutable, publicly verifiable proof that compliance checks ran.",
    status: "Available",
    linkHref: "/docs",
    linkLabel: "View docs",
  },
  {
    icon: Handshake,
    title: "A2A Attestation",
    description:
      "Exchange compliance proofs between agents via .well-known/kontext.json discovery. Both sides prove they ran checks on the same transaction.",
    status: "Available",
    linkHref: "/docs",
    linkLabel: "View docs",
  },
];

function DeveloperSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border">
      <button
        onClick={() => {
          setOpen(!open);
          track("developer_details_toggle", { section: title });
        }}
        className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
      >
        <span className="text-[13px] font-medium text-[var(--ic-text-muted)]">
          Developer details: {title}
        </span>
        <ChevronDown
          size={16}
          className={`text-[var(--ic-text-dim)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-12 sm:px-6 lg:px-8">{children}</div>}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Integrations
            </span>
            <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              Kontext works across your payment stack
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--ic-text-muted)]">
              Compliance evidence for stablecoin, fiat, and cross-chain payment
              flows. One integration captures screening, approvals, and audit
              trails across every rail.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/contact">
                  Book a Demo
                  <ArrowRight size={16} />
                </Link>
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

      {/* Marketing categories */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {marketingCategories.map((cat) => (
              <div
                key={cat.title}
                className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-5"
              >
                <div className="flex items-center gap-2">
                  <cat.icon
                    size={16}
                    className="text-[var(--ic-accent)]"
                  />
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--ic-text)]">
                    {cat.title}
                  </h3>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {cat.items.map((item) => (
                    <li
                      key={item}
                      className="text-[13px] text-[var(--ic-text-muted)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment & Commerce */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Payment & Commerce
            </span>
            <h2 className="mt-3 font-serif text-2xl font-normal text-[var(--ic-text)]">
              Payment and commerce integrations
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] text-[var(--ic-text-muted)]">
              Compliance evidence for stablecoin transfers, traditional payment
              processors, and micropayment protocols.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paymentIntegrations.map((integration) => (
              <Card
                key={integration.title}
                className="group relative overflow-hidden transition-all"
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] text-primary">
                      <integration.icon size={20} />
                    </div>
                    <Badge variant="outline">{integration.status}</Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {integration.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {integration.description}
                  </CardDescription>
                  <div className="mt-4">
                    <Link
                      href={integration.linkHref}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      {integration.linkLabel}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Protocols */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Protocols
            </span>
            <h2 className="mt-3 font-serif text-2xl font-normal text-[var(--ic-text)]">
              Protocol integrations
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] text-[var(--ic-text-muted)]">
              On-chain anchoring and agent-to-agent attestation for
              cryptographic evidence verification.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {protocolIntegrations.map((integration) => (
              <Card
                key={integration.title}
                className="group relative overflow-hidden transition-all"
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] text-primary">
                      <integration.icon size={20} />
                    </div>
                    <Badge variant="outline">{integration.status}</Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {integration.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {integration.description}
                  </CardDescription>
                  <div className="mt-4">
                    <Link
                      href={integration.linkHref}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      {integration.linkLabel}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Developers separator */}
      <section className="border-t border-border bg-[var(--ic-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Cpu size={18} className="text-[var(--ic-accent)]" />
            <div>
              <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--ic-accent)]">
                For Developers
              </h2>
              <p className="mt-1 text-[13px] text-[var(--ic-text-muted)]">
                SDK integration details, code examples, and framework-specific
                guides
              </p>
            </div>
          </div>
        </div>

        {/* CLI & MCP */}
        <DeveloperSection title="CLI & MCP Server">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="group relative overflow-hidden transition-all">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] text-primary">
                      <Terminal size={20} />
                    </div>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <CardTitle className="text-lg">Kontext CLI</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    12 commands for compliance operations: check, verify,
                    reason, cert, audit, anchor, attest, sync, session,
                    checkpoint, status, and mcp.
                  </CardDescription>
                  <div className="mt-4 overflow-hidden rounded border border-[var(--ic-border)] bg-muted/50 p-3 font-mono text-xs">
                    <span className="text-primary">$</span> npm install -g
                    @kontext-sdk/cli
                    <br />
                    <span className="text-primary">$</span> kontext verify
                    --chain base --amount 5000
                  </div>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden transition-all">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] text-primary">
                      <Wrench size={20} />
                    </div>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <CardTitle className="text-lg">MCP Server</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    8 compliance tools exposed via Model Context Protocol for
                    Claude Code, Cursor, and Windsurf. AI coding assistants get
                    compliance verification, audit export, and trust scoring as
                    native tools.
                  </CardDescription>
                  <div className="mt-4 overflow-hidden rounded border border-[var(--ic-border)] bg-muted/50 p-3 font-mono text-xs">
                    <span className="text-primary">$</span> kontext mcp
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DeveloperSection>

        {/* Agent Frameworks */}
        <DeveloperSection title="Agent Framework Examples">
          <div className="mx-auto max-w-7xl space-y-16">
            {agentFrameworks.map((framework, index) => (
              <div
                key={framework.id}
                id={framework.id}
                className="scroll-mt-32"
              >
                <div
                  className={`grid items-start gap-8 lg:gap-12 ${
                    index % 2 === 0
                      ? "lg:grid-cols-2"
                      : "lg:grid-cols-2 lg:[direction:rtl]"
                  }`}
                >
                  <div
                    className={
                      index % 2 !== 0 ? "lg:[direction:ltr]" : ""
                    }
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] text-primary">
                        <framework.icon size={20} />
                      </div>
                      <Badge variant="outline">{framework.status}</Badge>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {framework.title}
                    </h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {framework.description}
                    </p>
                    <div className="mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <Link href={framework.docsLink}>
                          View docs
                          <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div
                    className={`rounded border border-[var(--ic-border)] ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}
                  >
                    <CodeBlock
                      code={framework.code}
                      language="typescript"
                      filename={framework.filename}
                    />
                  </div>
                </div>

                {index < agentFrameworks.length - 1 && (
                  <Separator className="mt-16" />
                )}
              </div>
            ))}
          </div>
        </DeveloperSection>

        {/* Framework agnostic note */}
        <div className="mx-auto max-w-7xl border-t border-border px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[var(--ic-border)] bg-[hsl(var(--background))] p-8 sm:p-12">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Cpu size={20} className="text-primary" />
                <h3 className="text-lg font-semibold">Framework Agnostic</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Kontext is a standalone TypeScript SDK with zero framework
                dependencies. Use{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm border border-[var(--ic-border)]">
                  ctx.verify()
                </code>{" "}
                and{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm border border-[var(--ic-border)]">
                  ctx.log()
                </code>{" "}
                directly in any agent framework, custom pipeline, or serverless
                function.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="sm" className="gap-2" asChild>
                  <Link href="/docs">
                    Read the Docs
                    <ArrowRight size={14} />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <Link href="/docs">
                    <ExternalLink size={14} />
                    View Examples
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--ic-text)]">
              See how Kontext fits your payment stack
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Compliance evidence across stablecoin, fiat, and cross-chain
              payment flows. One integration point.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/contact">
                  Book a Demo
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/docs">Read the Docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
