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
  Users,
  ArrowLeftRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Integrate Kontext with LangChain, CrewAI, AutoGen, USDC, Stripe, x402, Google UCP, and CCTP. Add compliance to any agent framework or payment protocol.",
};

const langchainCode = `import { Kontext } from 'kontext-sdk';
import { CallbackHandler } from '@kontext/langchain';

const ctx = new Kontext({ apiKey: process.env.KONTEXT_KEY });

// Automatic logging for every LLM call and tool use
const kontextHandler = new CallbackHandler(ctx, {
  logLLMCalls: true,
  logToolUse: true,
  logRetrieval: true,
});

// Attach to any LangChain chain or agent
const agent = new AgentExecutor({
  agent,
  tools,
  callbacks: [kontextHandler],
});

// Every LLM call, tool invocation, and retrieval
// is automatically logged to your Kontext audit trail
const result = await agent.invoke({
  input: 'Transfer 500 USDC to vendor 0x1234',
});

// Query the audit trail
const trail = await ctx.export({
  agent: 'langchain-agent',
  format: 'json',
});`;

const crewaiCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext({ apiKey: process.env.KONTEXT_KEY });

// CrewAI task observer -- hooks into task lifecycle
function kontextTaskObserver(ctx) {
  return {
    onTaskStart: async (task, agent) => {
      await ctx.log({
        action: 'crew_task_start',
        agent: agent.role,
        metadata: {
          taskDescription: task.description,
          expectedOutput: task.expected_output,
          crewId: task.crew_id,
        },
      });
    },

    onTaskComplete: async (task, agent, output) => {
      const result = await ctx.verify({
        action: 'crew_task_complete',
        agent: agent.role,
        metadata: {
          taskDescription: task.description,
          output: output.raw,
          tokensUsed: output.token_usage,
        },
      });

      console.log('Task trust score:', result.trustScore);
    },

    onTaskError: async (task, agent, error) => {
      await ctx.log({
        action: 'crew_task_error',
        agent: agent.role,
        metadata: { error: error.message },
      });
    },
  };
}`;

const autogenCode = `import { Kontext } from 'kontext-sdk';

const ctx = new Kontext({ apiKey: process.env.KONTEXT_KEY });

// AutoGen message interceptor for multi-agent conversations
function kontextMiddleware(ctx) {
  return {
    async processMessage(sender, receiver, message) {
      // Log every agent-to-agent message
      await ctx.log({
        action: 'autogen_message',
        agent: sender.name,
        metadata: {
          receiver: receiver.name,
          messageType: message.type,
          content: message.content?.substring(0, 500),
        },
      });

      // Verify transaction decisions
      if (message.metadata?.isTransaction) {
        const result = await ctx.verify({
          action: 'autogen_transaction_decision',
          amount: message.metadata.amount,
          currency: message.metadata.currency,
          agent: sender.name,
          metadata: {
            receiver: receiver.name,
            conversationId: message.conversation_id,
            reasoning: message.metadata.reasoning,
          },
        });

        if (result.flagged) {
          return {
            ...message,
            blocked: true,
            reason: 'Kontext compliance check failed',
          };
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
      "Callback handler for automatic action logging. Every LLM call, tool use, and retrieval is captured in your Kontext audit trail with zero extra code.",
    code: langchainCode,
    filename: "langchain-integration.ts",
    status: "Available",
    statusColor: "border-green-500/30 bg-green-500/10 text-green-400",
    docsLink: "/docs",
  },
  {
    id: "crewai",
    icon: Bot,
    title: "CrewAI",
    description:
      "Task observer that hooks into the CrewAI task lifecycle. Log task starts, verify completions with trust scoring, and capture errors across your entire crew.",
    code: crewaiCode,
    filename: "crewai-integration.ts",
    status: "Available",
    statusColor: "border-green-500/30 bg-green-500/10 text-green-400",
    docsLink: "/docs",
  },
  {
    id: "autogen",
    icon: MessageSquare,
    title: "AutoGen",
    description:
      "Message interceptor for multi-agent conversations. Log agent message exchanges, verify transaction decisions, and block non-compliant actions in real time.",
    code: autogenCode,
    filename: "autogen-integration.ts",
    status: "Available",
    statusColor: "border-green-500/30 bg-green-500/10 text-green-400",
    docsLink: "/docs",
  },
];

const paymentIntegrations = [
  {
    icon: DollarSign,
    title: "USDC / Circle",
    description:
      "Native stablecoin compliance for USDC transfers on Base and Ethereum. Audit trails, trust scoring, and GENIUS Act readiness.",
    status: "Available",
    statusColor: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    linkHref: "/use-cases#usdc-payments",
    linkLabel: "View use case",
  },
  {
    icon: CreditCard,
    title: "Stripe",
    description:
      "Verify agent-initiated Stripe payment intents with trust scoring. Audit IDs embedded in Stripe metadata for full traceability.",
    status: "Available",
    statusColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
    linkHref: "/use-cases#stripe-agentic",
    linkLabel: "View use case",
  },
  {
    icon: Zap,
    title: "x402",
    description:
      "HTTP-native micropayment verification middleware. Per-request compliance checks for agent-to-service payment flows.",
    status: "Available",
    statusColor: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    linkHref: "/use-cases#x402-protocol",
    linkLabel: "View use case",
  },
];

const protocolIntegrations = [
  {
    icon: Users,
    title: "Google UCP / A2A",
    description:
      "Agent-to-agent commerce verification via Google's Universal Checkout Protocol. Trust scoring for cross-agent transactions.",
    status: "Coming Soon",
    statusColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    linkHref: "/use-cases#google-ucp",
    linkLabel: "View use case",
  },
  {
    icon: ArrowLeftRight,
    title: "CCTP",
    description:
      "Cross-chain USDC transfer compliance via Circle's Cross-Chain Transfer Protocol. Audit trails spanning source and destination chains.",
    status: "Coming Soon",
    statusColor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    linkHref: "/use-cases#cctp-transfers",
    linkLabel: "View use case",
  },
];

export default function IntegrationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Integrations
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Works with your{" "}
              <span className="gradient-text">entire stack</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              First-class integrations with leading agent frameworks, payment
              protocols, and commerce platforms. Add compliance to any workflow
              in minutes.
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
      <section className="sticky top-16 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            <a
              href="#agent-frameworks"
              className="inline-flex shrink-0 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              Agent Frameworks
            </a>
            <a
              href="#payment-commerce"
              className="inline-flex shrink-0 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              Payment &amp; Commerce
            </a>
            <a
              href="#protocols"
              className="inline-flex shrink-0 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              Protocols
            </a>
          </div>
        </div>
      </section>

      {/* Agent Frameworks */}
      <section id="agent-frameworks" className="scroll-mt-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge
              variant="outline"
              className="mb-4 border-primary/20 text-primary"
            >
              Agent Frameworks
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Drop-in agent framework support
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Automatic action logging and compliance verification for the most
              popular agent frameworks. Add a callback, observer, or middleware
              and every agent action flows into your audit trail.
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
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <framework.icon size={20} />
                      </div>
                      <Badge
                        variant="outline"
                        className={framework.statusColor}
                      >
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
                  <div className={`glow rounded-xl ${index % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
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
        className="scroll-mt-32 border-t border-border/40 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge
              variant="outline"
              className="mb-4 border-primary/20 text-primary"
            >
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
                className="group relative overflow-hidden transition-colors hover:border-primary/30"
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <integration.icon size={20} />
                    </div>
                    <Badge
                      variant="outline"
                      className={integration.statusColor}
                    >
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
        className="scroll-mt-32 border-t border-border/40 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge
              variant="outline"
              className="mb-4 border-primary/20 text-primary"
            >
              Protocols
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Protocol integrations
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Support for emerging agent commerce and cross-chain protocols.
              Built for the next generation of agentic infrastructure.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {protocolIntegrations.map((integration) => (
              <Card
                key={integration.title}
                className="group relative overflow-hidden transition-colors hover:border-primary/30"
              >
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <integration.icon size={20} />
                    </div>
                    <Badge
                      variant="outline"
                      className={integration.statusColor}
                    >
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
      <section className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-8 sm:p-12">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Cpu size={20} className="text-primary" />
                <h3 className="text-lg font-semibold">
                  Framework Agnostic
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Kontext is a standalone TypeScript SDK with zero framework
                dependencies. The integrations above are convenience wrappers --
                you can use <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">ctx.verify()</code> and{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">ctx.log()</code> directly in any
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
                    href="https://github.com/vinay-lgtm-code/kontext_verify"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    View Examples on GitHub
                  </a>
                </Button>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/40 bg-background">
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
                  href="https://github.com/vinay-lgtm-code/kontext_verify"
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
