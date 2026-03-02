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
    "Integrate Kontext with Vercel AI SDK, LangChain, CrewAI, AutoGen, USDC, Stripe, x402, on-chain anchoring, and A2A attestation. Add compliance to any agent framework or payment protocol.",
};

const vercelAICode = `import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Kontext, kontextWrapModel } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'payment-agent',
  environment: 'production',
});

// Wrap your model — every tool call gets logged
const model = kontextWrapModel(openai('gpt-4o'), ctx, {
  agentId: 'payment-agent',
});

const result = await generateText({
  model,
  tools: {
    transfer_usdc: {
      description: 'Transfer USDC to an address',
      parameters: { to: 'string', amount: 'string' },
      execute: async ({ to, amount }) => {
        return { success: true, hash: '0xabc...' };
      },
    },
  },
  prompt: 'Send 500 USDC to 0x1234 for the API invoice',
});

// Export the tamper-evident audit trail
const audit = await ctx.export({ format: 'json' });`;

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
    id: "vercel-ai-sdk",
    icon: Zap,
    title: "Vercel AI SDK",
    description:
      "First-class middleware for the Vercel AI SDK. Wraps generateText(), streamText(), and generateObject() with automatic digest chain logging, financial tool detection, trust scoring, and compliance checks. One line to add tamper-evident audit trails to every AI operation.",
    code: vercelAICode,
    filename: "vercel-ai-integration.ts",
    status: "SDK Wrapper",
    docsLink: "/docs",
  },
  {
    id: "langchain",
    icon: Link2,
    title: "LangChain",
    description:
      "Works with verify() and log() — add compliance logging to any LangChain agent by wrapping tool calls. No dedicated wrapper needed; the core SDK functions work directly in callbacks.",
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
      <section className="relative overflow-hidden border-b-2 border-border">
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Integrations
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Works with your{" "}
              <span className="text-primary">entire stack</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              First-class Vercel AI SDK wrapper plus verify() compatibility with
              any agent framework. Add compliance to any workflow in minutes.
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
      <section className="sticky top-16 z-40 border-b-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            <a
              href="#vercel-ai-sdk"
              className="inline-flex shrink-0 rounded-[5px] border-2 border-border bg-primary/10 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/20"
            >
              Vercel AI SDK
            </a>
            <a
              href="#agent-frameworks"
              className="inline-flex shrink-0 rounded-[5px] border-2 border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              Agent Frameworks
            </a>
            <a
              href="#payment-commerce"
              className="inline-flex shrink-0 rounded-[5px] border-2 border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              Payment &amp; Commerce
            </a>
            <a
              href="#protocols"
              className="inline-flex shrink-0 rounded-[5px] border-2 border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              Protocols
            </a>
            <a
              href="#cli-devops"
              className="inline-flex shrink-0 rounded-[5px] border-2 border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              CLI &amp; DevOps
            </a>
          </div>
        </div>
      </section>

      {/* Agent Frameworks */}
      <section id="agent-frameworks" className="scroll-mt-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Agent Frameworks
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Drop-in agent framework support
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              First-class Vercel AI SDK wrapper with automatic action logging.
              LangChain, CrewAI, and AutoGen work directly with verify() and log() —
              no dedicated wrapper needed.
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
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
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
                  <div className={`rounded-[5px] border-2 border-border shadow-shadow ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
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
        className="scroll-mt-32 border-t-2 border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Payment &amp; Commerce
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Payment and commerce integrations
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Verify and audit agent transactions across stablecoin transfers,
              traditional payment processors, and micropayment protocols.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paymentIntegrations.map((integration) => (
              <Card
                key={integration.title}
                className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
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
        className="scroll-mt-32 border-t-2 border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              Protocols
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Protocol integrations
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              On-chain anchoring and agent-to-agent attestation — cryptographic proof
              layers built into verify().
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {protocolIntegrations.map((integration) => (
              <Card
                key={integration.title}
                className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
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

      {/* CLI & DevOps */}
      <section
        id="cli-devops"
        className="scroll-mt-32 border-t-2 border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge variant="outline" className="mb-4">
              CLI &amp; DevOps
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Terminal-first compliance
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Run compliance operations from the command line or integrate with
              AI coding assistants via the MCP server.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
                    <Terminal size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">Kontext CLI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  12 commands for compliance operations: check, verify, reason,
                  cert, audit, anchor, attest, sync, session, checkpoint, status,
                  and mcp. Install globally or run via npx.
                </CardDescription>
                <div className="mt-4 overflow-hidden rounded-[5px] border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-primary">$</span> npm install -g @kontext-sdk/cli<br/>
                  <span className="text-primary">$</span> kontext verify --chain base --amount 5000
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-border bg-primary/20 text-primary">
                    <Wrench size={20} />
                  </div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <CardTitle className="text-lg">MCP Server</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  8 compliance tools exposed via Model Context Protocol for Claude
                  Code, Cursor, and Windsurf. AI coding assistants get compliance
                  verification, audit export, and trust scoring as native tools.
                </CardDescription>
                <div className="mt-4 overflow-hidden rounded-[5px] border border-border bg-muted/50 p-3 font-mono text-xs">
                  <span className="text-primary">$</span> kontext mcp
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Framework Agnostic Note */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[5px] border-2 border-border bg-primary/5 p-8 shadow-shadow sm:p-12">
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
                you can use <code className="rounded-[5px] bg-muted px-1.5 py-0.5 font-mono text-sm border border-border">ctx.verify()</code> and{" "}
                <code className="rounded-[5px] bg-muted px-1.5 py-0.5 font-mono text-sm border border-border">ctx.log()</code> directly in any
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
                  <a
                    href="https://github.com/Legaci-Labs/kontext"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    View Examples on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t-2 border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Start building with trust
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Add compliance to your agentic workflows in minutes. Open source,
              TypeScript-first, and ready for production.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
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
