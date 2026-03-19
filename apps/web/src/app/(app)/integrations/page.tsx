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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Integrate Kontext with LangChain, CrewAI, AutoGen, USDC, Stripe, x402, on-chain anchoring, and A2A attestation. Add proof of compliance to any agent framework or payment protocol.",
};

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
      "Works with verify() and log() — add proof of compliance to any LangChain agent by wrapping tool calls. No dedicated wrapper needed; the core SDK functions work directly in callbacks.",
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
      "Works with verify() and log() — hook into CrewAI's task lifecycle to log task starts, verify completions with trust scoring, and capture errors across your entire crew.",
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
      "Works with verify() and log() — intercept multi-agent messages, log exchanges, verify transaction decisions, and block non-compliant actions in real time.",
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
      "Native stablecoin compliance support for USDC transfers on Base and Ethereum. Audit trails, trust scoring, and GENIUS Act alignment.",
    status: "Available",
    linkHref: "/use-cases#usdc-payments",
    linkLabel: "View use case",
  },
  {
    icon: CreditCard,
    title: "Stripe",
    description:
      "Verify agent-initiated Stripe payment intents with trust scoring. Audit IDs embedded in Stripe metadata for full traceability.",
    status: "Available",
    linkHref: "/use-cases#stripe-agentic",
    linkLabel: "View use case",
  },
  {
    icon: Zap,
    title: "x402",
    description:
      "HTTP-native micropayment verification middleware. Per-request compliance checks for agent-to-service payment flows.",
    status: "Available",
    linkHref: "/use-cases#x402-protocol",
    linkLabel: "View use case",
  },
];

const protocolIntegrations = [
  {
    icon: Anchor,
    title: "On-Chain Anchoring",
    description:
      "Anchor your terminal digest to Base via the KontextAnchor contract. Immutable, publicly verifiable proof that compliance checks ran. Read-only verification needs zero dependencies.",
    status: "Available",
    linkHref: "/use-cases#on-chain-anchoring",
    linkLabel: "View use case",
  },
  {
    icon: Handshake,
    title: "A2A Attestation",
    description:
      "Exchange compliance proofs between agents via .well-known/kontext.json discovery. Both sides prove they ran checks on the same transaction. Zero dependencies.",
    status: "Available",
    linkHref: "/use-cases#a2a-attestation",
    linkLabel: "View use case",
  },
];

export default function IntegrationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              INTEGRATIONS
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              verify() works with any agent framework. Add proof of compliance to any workflow in minutes.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/docs">
                  Get Started
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

      {/* Quick Navigation */}
      <section className="sticky top-16 z-40 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            <a
              href="#cli-devops"
              className="inline-flex shrink-0 border border-border bg-[var(--term-surface-2)] px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-[var(--term-surface-2)]"
            >
              CLI &amp; DevOps
            </a>
            <a
              href="#agent-frameworks"
              className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
            >
              Agent Frameworks
            </a>
            <a
              href="#payment-commerce"
              className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
            >
              Payment &amp; Commerce
            </a>
            <a
              href="#protocols"
              className="inline-flex shrink-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
            >
              Protocols
            </a>
          </div>
        </div>
      </section>

      {/* CLI & DevOps */}
      <section
        id="cli-devops"
        className="scroll-mt-32 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              CLI &amp; DevOps
            </Badge>
            <h2 className="text-sm font-medium">
              Terminal-first proof of compliance
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Run proof of compliance operations from the command line or integrate with
              AI coding assistants via the MCP server.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="group relative overflow-hidden transition-all ">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                    <Terminal size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">Kontext CLI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  12 commands for proof of compliance operations: check, verify, reason,
                  cert, audit, anchor, attest, sync, session, checkpoint, status,
                  and mcp. Install globally or run via npx.
                </CardDescription>
                <div className="mt-4 overflow-hidden border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-primary">$</span> npm install -g @kontext-sdk/cli<br/>
                  <span className="text-primary">$</span> kontext verify --chain base --amount 5000
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden transition-all ">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                    <Wrench size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">MCP Server</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  8 proof of compliance tools exposed via Model Context Protocol for Claude
                  Code, Cursor, and Windsurf. AI coding assistants get proof of compliance
                  verification, audit export, and trust scoring as native tools.
                </CardDescription>
                <div className="mt-4 overflow-hidden border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-primary">$</span> kontext mcp
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Agent Frameworks */}
      <section id="agent-frameworks" className="scroll-mt-32 border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Agent Frameworks
            </Badge>
            <h2 className="text-sm font-medium">
              Drop-in agent framework support
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              LangChain, CrewAI, and AutoGen work directly with verify() and log().
              No dedicated wrapper needed — the core SDK functions work in any callback or lifecycle hook.
            </p>
          </div>

          <div className="space-y-16">
            {agentFrameworks.map((framework, index) => (
              <div key={framework.id} id={framework.id} className="scroll-mt-32">
                <div
                  className={`grid items-start gap-8 lg:gap-12 ${
                    index % 2 === 0
                      ? "lg:grid-cols-2"
                      : "lg:grid-cols-2 lg:[direction:rtl]"
                  }`}
                >
                  {/* Info */}
                  <div className={index % 2 !== 0 ? "lg:[direction:ltr]" : ""}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                        <framework.icon size={20} />
                      </div>
                      <Badge variant="outline">
                        {framework.status}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {framework.title}
                    </h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {framework.description}
                    </p>
                    <div className="mt-6">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href={framework.docsLink}>
                          View docs
                          <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Code */}
                  <div className={`border border-border ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
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
        </div>
      </section>

      {/* Payment & Commerce */}
      <section
        id="payment-commerce"
        className="scroll-mt-32 border-t border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Payment &amp; Commerce
            </Badge>
            <h2 className="text-sm font-medium">
              Payment and commerce integrations
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              Verify and audit agent transactions across stablecoin transfers,
              traditional payment processors, and micropayment protocols.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paymentIntegrations.map((integration) => (
              <Card
                key={integration.title}
                className="group relative overflow-hidden transition-all "
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                      <integration.icon size={20} />
                    </div>
                    <Badge variant="outline">
                      {integration.status}
                    </Badge>
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
      <section
        id="protocols"
        className="scroll-mt-32 border-t border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Protocols
            </Badge>
            <h2 className="text-sm font-medium">
              Protocol integrations
            </h2>
            <p className="mt-4 max-w-2xl text-xs text-[var(--term-text-2)]">
              On-chain anchoring and agent-to-agent attestation — cryptographic proof
              layers built into verify().
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {protocolIntegrations.map((integration) => (
              <Card
                key={integration.title}
                className="group relative overflow-hidden transition-all "
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-[var(--term-surface-2)] text-primary">
                      <integration.icon size={20} />
                    </div>
                    <Badge variant="outline">
                      {integration.status}
                    </Badge>
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

      {/* Framework Agnostic Note */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="border border-border bg-[var(--term-surface)] p-8 sm:p-12">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Cpu size={20} className="text-primary" />
                <h3 className="text-lg font-semibold">
                  Framework Agnostic
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Kontext is a standalone TypeScript SDK with zero framework
                dependencies. The integrations above are convenience wrappers —
                you can use <code className="bg-muted px-1.5 py-0.5 font-mono text-sm border border-border">ctx.verify()</code> and{" "}
                <code className="bg-muted px-1.5 py-0.5 font-mono text-sm border border-border">ctx.log()</code> directly in any
                agent framework, custom pipeline, or serverless function.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="sm" className="gap-2" asChild>
                  <Link href="/docs">
                    Read the Docs
                    <ArrowRight size={14} />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href="/docs">
                    <ExternalLink size={14} />
                    View Examples in Docs
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
            <h2 className="text-sm font-medium">
              Start building with trust
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Add proof of compliance to your agentic workflows in minutes. TypeScript-first,
              zero dependencies, and ready for production.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
