import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/code-block";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Zap, Code2, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Get started with the Kontext SDK in minutes. Installation, quick start, API reference, and guides for compliance logging, trust scoring, on-chain anchoring, and A2A attestation.",
};

const installCode = `npm install kontext-sdk`;

const quickStartCode = `import { Kontext } from 'kontext-sdk';

// Initialize -- no API key needed for local mode
const ctx = Kontext.init({
  projectId: 'my-project',
  environment: 'development',
});

// Verify a USDC transfer in one call
const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'payment-agent-v2',
});

if (!result.compliant) {
  console.warn('Blocked:', result.checks.filter(c => !c.passed));
  console.warn('Risk level:', result.riskLevel);
  // result.recommendations tells you what to do next
} else {
  console.log('Trust score:', result.trustScore.score);
  console.log('Digest proof valid:', result.digestProof.valid);
}`;

const actionLoggingCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-project' });

// Log any agent action -- not just transfers
await ctx.log({
  action: 'data_access',
  agentId: 'research-agent',
  details: 'Queried customer database',
  metadata: { purpose: 'quarterly_report' },
});

// Log agent reasoning separately
// When regulators ask "why did your agent do that?" -- you can answer
await ctx.logReasoning({
  agentId: 'payment-agent-v2',
  action: 'approve-transfer',
  reasoning: 'Transfer within daily limit. Recipient verified in allowlist.',
  confidence: 0.95,
  context: { dailyTotal: '32000', recipientVerified: true },
});

// Retrieve reasoning entries later
const entries = ctx.getReasoningEntries('payment-agent-v2');`;

const taskConfirmationCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'treasury-app' });

// Create a task that requires human approval
const task = await ctx.createTask({
  description: 'Approve $25,000 USDC transfer to 0xrecipient',
  agentId: 'treasury-agent-v2',
  requiredEvidence: ['txHash', 'recipientVerified'],
});

// ... human reviews and approves ...

// Confirm with evidence
const confirmed = await ctx.confirmTask({
  taskId: task.id,
  evidence: {
    txHash: '0xabc...def',
    recipientVerified: true,
  },
  confirmedBy: 'admin@company.com',
});

// Check task status at any time
const status = await ctx.getTaskStatus(task.id);

// List all pending tasks
const pending = ctx.getTasks('pending');`;

const auditExportCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-project' });

// ... log some actions and transactions ...

// Export the full audit trail as JSON
const audit = await ctx.export({ format: 'json' });
// audit.data contains all action logs with digest proofs

// Verify the digest chain is intact (no tampering)
const chain = ctx.verifyDigestChain();
console.log('Chain valid:', chain.valid);
console.log('Chain length:', chain.chainLength);

// Get the terminal digest -- your tamper-evident fingerprint
const terminal = ctx.getTerminalDigest();

// Export the full digest chain for external verification
const exported = ctx.exportDigestChain();
// { genesisHash, links, terminalDigest }

// Generate a compliance certificate (includes digest proof + trust score)
const cert = await ctx.generateComplianceCertificate({
  agentId: 'treasury-agent-v2',
  timeRange: { from: startOfMonth, to: endOfMonth },
  includeReasoning: true,
});`;

const trustScoringCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-project' });

// Get trust score for any agent
const trust = await ctx.getTrustScore('payment-agent-v2');

console.log(trust.score);   // 87 (0-100)
console.log(trust.level);   // 'high'
console.log(trust.factors);
// {
//   history: 0.95,       -- agent's track record
//   amount: 0.88,        -- transaction amount patterns
//   frequency: 0.92,     -- how often the agent transacts
//   destination: 0.85,   -- recipient trust level
//   behavior: 0.90,      -- behavioral consistency
// }

// Evaluate a transaction before executing it
const evaluation = await ctx.evaluateTransaction({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '15000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'payment-agent-v2',
});`;

const anomalyDetectionCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-project' });

// Enable anomaly detection with rules
ctx.enableAnomalyDetection({
  rules: ['unusualAmount', 'frequencySpike'],
  thresholds: {
    maxAmount: '50000',
    maxFrequency: 20,
  },
});

// React to anomalies in real time
const unsubscribe = ctx.onAnomaly((event) => {
  console.log('Anomaly detected:', event.type);
  console.log('Details:', event.details);
  // Alert your compliance team via Slack, PagerDuty, etc.
});

// verify() automatically checks anomaly rules
const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '75000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'payment-agent-v2',
});

// Turn it off when you don't need it
ctx.disableAnomalyDetection();`;

const onChainAnchoringCode = `import { Kontext, verifyAnchor, getAnchor, anchorDigest } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-project' });

// Option 1: Anchor automatically via verify()
const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'payment-agent-v2',
  anchor: {
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
    contractAddress: '0xYourAnchorContract',
    privateKey: process.env.ANCHOR_PRIVATE_KEY,
  },
});
// result.anchorProof = { txHash, blockNumber, chain, ... }

// Option 2: Read-only verification -- zero dependencies
const verified = await verifyAnchor(rpcUrl, contractAddress, digest);
// verified.anchored = true/false

// Option 3: Get full anchor details
const details = await getAnchor(rpcUrl, contractAddress, digest);
// details = { anchorer, projectHash, timestamp }

// Option 4: Write an anchor manually (requires viem as peer dep)
const anchorResult = await anchorDigest(
  { rpcUrl, contractAddress, privateKey },
  digest,
  'my-project'
);`;

const a2aAttestationCode = `import { Kontext, fetchAgentCard, exchangeAttestation } from 'kontext-sdk';

const ctx = Kontext.init({ projectId: 'my-project' });

// Option 1: Attestation via verify()
const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xsender...',
  to: '0xrecipient...',
  agentId: 'sender-agent',
  counterparty: {
    endpoint: 'https://receiver.example.com',
    agentId: 'receiver-v1',
  },
});
// result.counterparty = { attested, digest, agentId, timestamp }

// Option 2: Discover a counterparty agent
const card = await fetchAgentCard('https://receiver.example.com');
// card = { agentId, kontextVersion, capabilities, attestEndpoint }

// Option 3: Exchange attestation directly
const attestation = await exchangeAttestation(
  { endpoint: 'https://receiver.example.com', agentId: 'receiver-v1' },
  {
    senderDigest: ctx.getTerminalDigest(),
    senderAgentId: 'sender-agent',
    amount: '5000',
    token: 'USDC',
    timestamp: new Date().toISOString(),
  }
);`;

const agentProvenanceCode = `import { Kontext, FileStorage } from 'kontext-sdk';

const ctx = Kontext.init({
  projectId: 'treasury-app',
  storage: new FileStorage('.kontext'),
});

// Layer 1: Session delegation — record who authorized the agent
const session = await ctx.createAgentSession({
  agentId: 'treasury-agent',
  delegatedBy: 'user:vinay',
  scope: ['transfer', 'approve'],
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
});

// Layer 2: Action binding — every verify() call ties to the session
const result = await ctx.verify({
  txHash: '0xabc...def',
  chain: 'base',
  amount: '5000',
  token: 'USDC',
  from: '0xAgentWallet',
  to: '0xRecipient',
  agentId: 'treasury-agent',
  sessionId: session.sessionId,
});

// Layer 3: Human attestation — reviewer signs off
const checkpoint = await ctx.createCheckpoint({
  sessionId: session.sessionId,
  actionIds: [result.transaction.id],
  summary: 'Reviewed $5K USDC transfer to known vendor',
});

// Attest with a key the agent never touches
const attested = await ctx.attestCheckpoint({
  checkpointId: checkpoint.checkpointId,
  attestedBy: 'compliance-officer@company.com',
  signature: reviewerSignature,
});

// End the session when done
await ctx.endAgentSession(session.sessionId);

// List all sessions and checkpoints
const sessions = ctx.getAgentSessions('treasury-agent');
const checkpoints = ctx.getCheckpoints(session.sessionId);`;

const apiReferenceCode = `// Initialization
const ctx = Kontext.init(config: KontextConfig): Kontext;

// The main function -- compliance check + transaction log in one call
await ctx.verify(input: VerifyInput): Promise<VerifyResult>;

// Action logging
await ctx.log(input: LogActionInput): Promise<ActionLog>;
await ctx.logTransaction(input: LogTransactionInput): Promise<TransactionRecord>;
await ctx.logReasoning(input: LogReasoningInput): Promise<ReasoningEntry>;
ctx.getReasoningEntries(agentId: string): ReasoningEntry[];
await ctx.flushLogs(): Promise<void>;

// Task confirmation (human-in-the-loop)
await ctx.createTask(input: CreateTaskInput): Promise<Task>;
await ctx.confirmTask(input: ConfirmTaskInput): Promise<Task>;
await ctx.getTaskStatus(taskId: string): Promise<Task | undefined>;
await ctx.startTask(taskId: string): Promise<Task>;
await ctx.failTask(taskId: string, reason: string): Promise<Task>;
ctx.getTasks(status?: TaskStatus): Task[];

// Trust scoring
await ctx.getTrustScore(agentId: string): Promise<TrustScore>;
await ctx.evaluateTransaction(tx: LogTransactionInput): Promise<TransactionEvaluation>;

// Anomaly detection
ctx.enableAnomalyDetection(config: AnomalyDetectionConfig): void;
ctx.disableAnomalyDetection(): void;
ctx.onAnomaly(callback: AnomalyCallback): () => void;

// Audit export
await ctx.export(options: ExportOptions): Promise<ExportResult>;
await ctx.generateReport(options: ReportOptions): Promise<ComplianceReport>;
await ctx.generateComplianceCertificate(input): Promise<ComplianceCertificate>;

// Digest chain (tamper-evidence)
ctx.getTerminalDigest(): string;
ctx.verifyDigestChain(): DigestVerification;
ctx.exportDigestChain(): { genesisHash, links, terminalDigest };
ctx.getActions(): ActionLog[];

// Agent provenance
await ctx.createAgentSession(input: CreateAgentSessionInput): Promise<AgentSession>;
await ctx.endAgentSession(sessionId: string): Promise<AgentSession>;
ctx.getAgentSessions(agentId: string): AgentSession[];
await ctx.createCheckpoint(input: CreateCheckpointInput): Promise<Checkpoint>;
await ctx.attestCheckpoint(input: AttestCheckpointInput): Promise<Checkpoint>;
ctx.getCheckpoints(sessionId: string): Checkpoint[];

// Persistence
await ctx.flush(): Promise<void>;
await ctx.restore(): Promise<void>;

// Plan management
ctx.getUsage(): PlanUsage;
ctx.setPlan(tier: PlanTier): void;
ctx.onUsageWarning(callback): () => void;
ctx.onLimitReached(callback): () => void;

// Lifecycle
await ctx.destroy(): Promise<void>;`;

const configCode = `import { Kontext, FileStorage } from 'kontext-sdk';

const ctx = Kontext.init({
  // Required
  projectId: 'my-project',

  // Optional
  environment: 'production',  // 'development' | 'staging' | 'production'
  apiKey: 'sk_live_...',      // only needed for cloud mode
  plan: 'free',               // 'free' | 'payg' | 'enterprise'

  // Persistence -- default is in-memory (resets on restart)
  storage: new FileStorage('./compliance-data'),

  // Event exporters -- where to send events
  exporters: [
    // new ConsoleExporter(),       // prints to stdout (dev)
    // new JsonFileExporter(path),  // writes JSONL to disk
    // new HttpExporter(config),    // sends to any HTTP endpoint
    // new KontextCloudExporter(),  // ships to api.getkontext.com (payg)
  ],
});`;

const typesCode = `import type {
  // Core
  KontextConfig,
  KontextMode,
  LogActionInput,
  LogTransactionInput,
  TransactionRecord,
  ActionLog,

  // Verify
  VerifyInput,
  VerifyResult,

  // Tasks
  Task,
  CreateTaskInput,
  ConfirmTaskInput,

  // Trust & Anomaly
  TrustScore,
  AnomalyEvent,
  AnomalyDetectionConfig,

  // Export & Reports
  ExportOptions,
  ExportResult,
  ComplianceReport,
  DigestVerification,

  // Reasoning & Certificates
  ReasoningEntry,
  ComplianceCertificate,

  // On-chain anchoring
  OnChainAnchorConfig,
  AnchorResult,
  AnchorVerification,

  // A2A attestation
  AgentCard,
  CounterpartyConfig,
  AttestationRequest,
  AttestationResponse,
  CounterpartyAttestation,

  // Agent provenance
  AgentSession,
  CreateAgentSessionInput,
  Checkpoint,
  CreateCheckpointInput,
  AttestCheckpointInput,
} from 'kontext-sdk';`;

const agentIdentityCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  apiKey: process.env.KONTEXT_KEY,
  projectId: 'forensics',
  plan: 'payg',
});

// Register an agent with wallet mappings
ctx.registerAgentIdentity({
  agentId: 'treasury-agent-v2',
  displayName: 'Treasury Agent',
  entityType: 'autonomous',  // 'autonomous' | 'semi-autonomous' | 'human-supervised'
  wallets: [
    { address: '0xTreasury...abc', chain: 'base', label: 'primary' },
    { address: '0xReserve...def', chain: 'base', label: 'reserve' },
  ],
});

// Add a wallet later
ctx.addAgentWallet('treasury-agent-v2', {
  address: '0xOps...ghi', chain: 'ethereum', label: 'operations',
});

// Reverse lookup: which agent owns this wallet?
const agent = ctx.lookupAgentByWallet('0xTreasury...abc');
console.log(agent?.agentId); // 'treasury-agent-v2'

// Retrieve identity
const identity = ctx.getAgentIdentity('treasury-agent-v2');`;

const walletClusteringCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  apiKey: process.env.KONTEXT_KEY,
  projectId: 'forensics',
  plan: 'payg',
});

// Register agents and their wallets...
// Then detect clusters across all registered agents
const clusters = ctx.getWalletClusters();

for (const cluster of clusters) {
  console.log('Cluster wallets:', cluster.wallets);
  console.log('Heuristics matched:', cluster.heuristics);
  // e.g. ['shared-owner', 'funding-chain', 'temporal-correlation']
  console.log('Evidence:', cluster.evidence);
}

// 5 clustering heuristics:
// - shared-owner: wallets registered to the same agent
// - temporal-correlation: wallets active in the same time windows
// - funding-chain: one wallet funds another
// - amount-pattern: matching transaction amounts across wallets
// - network-overlap: shared counterparties`;

const confidenceScoringCode = `import { Kontext } from 'kontext-sdk';

const ctx = Kontext.init({
  apiKey: process.env.KONTEXT_KEY,
  projectId: 'forensics',
  plan: 'payg',
});

// Compute identity confidence for an agent
const score = ctx.getKYAConfidenceScore('treasury-agent-v2');

console.log(score.score);      // 82 (0-100)
console.log(score.level);      // 'high' | 'medium' | 'low' | 'very-low'
console.log(score.components); // breakdown by factor

// Components: identity-completeness, wallet-verification,
//             behavioral-consistency, historical-depth, cluster-coherence

// Export all forensics data
const envelope = ctx.getKYAExport();
// { identities, clusters, embeddings, links, scores, generatedAt }`;

const cliInstallCode = `# Install globally
npm install -g @kontext-sdk/cli

# Or run directly with npx (no install)
npx @kontext-sdk/cli verify --chain base --amount 5000

# Verify installation
kontext --version  # 0.8.0`;

const cliCommandsCode = `# Static compliance check (no digest chain)
kontext check --chain base --amount 5000 --from 0xSender --to 0xRecipient

# Full verification with digest chain and trust scoring
kontext verify --chain base --amount 5000 --token USDC \\
  --from 0xSender --to 0xRecipient --agent payment-agent-v2

# Log agent reasoning
kontext reason --agent payment-agent-v2 \\
  --action approve-transfer \\
  --reasoning "Within daily limit. Recipient verified."

# Generate compliance certificate
kontext cert --agent payment-agent-v2 --format json

# Export audit trail
kontext audit --format json --output ./audit-trail.json

# Anchor digest on-chain
kontext anchor --rpc https://mainnet.base.org --contract 0xbc71...b46

# Exchange A2A attestation
kontext attest --endpoint https://counterparty.example.com

# Sync OFAC SDN list
kontext sync --list ofac

# Manage agent sessions and checkpoints
kontext session create --agent treasury-agent --scope transfer,approve
kontext checkpoint create --session <sessionId> --summary "Reviewed batch"`;

const cliMcpCode = `# Start the MCP server
kontext mcp

# Add to Claude Code / Cursor / Windsurf config:
{
  "mcpServers": {
    "kontext": {
      "command": "npx",
      "args": ["@kontext-sdk/cli", "mcp"]
    }
  }
}

# 8 MCP tools exposed:
# - kontext_check: static compliance check
# - kontext_verify: full verification
# - kontext_reason: log agent reasoning
# - kontext_cert: generate certificate
# - kontext_audit: export audit trail
# - kontext_trust: get trust score
# - kontext_anchor: on-chain anchoring
# - kontext_attest: A2A attestation`;

const sidebarSections = [
  {
    title: "Getting Started",
    items: [
      { id: "installation", label: "Installation" },
      { id: "quickstart", label: "Quick Start" },
    ],
  },
  {
    title: "Core Features",
    items: [
      { id: "action-logging", label: "Action Logging" },
      { id: "task-confirmation", label: "Task Confirmation" },
      { id: "audit-export", label: "Audit Export" },
      { id: "trust-scoring", label: "Trust Scoring" },
      { id: "anomaly-detection", label: "Anomaly Detection" },
    ],
  },
  {
    title: "On-Chain & A2A",
    items: [
      { id: "on-chain-anchoring", label: "On-Chain Anchoring" },
      { id: "a2a-attestation", label: "A2A Attestation" },
      { id: "agent-provenance", label: "Agent Provenance" },
    ],
  },
  {
    title: "Agent Forensics",
    items: [
      { id: "agent-identity", label: "Agent Identity" },
      { id: "wallet-clustering", label: "Wallet Clustering" },
      { id: "confidence-scoring", label: "Confidence Scoring" },
    ],
  },
  {
    title: "CLI",
    items: [
      { id: "cli-install", label: "Installation" },
      { id: "cli-commands", label: "Commands" },
      { id: "cli-mcp", label: "MCP Server" },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "api", label: "API Reference" },
      { id: "configuration", label: "Configuration" },
      { id: "types", label: "TypeScript Types" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Mobile section nav */}
      <div className="sticky top-16 z-40 -mx-4 overflow-x-auto border-b-2 border-border bg-background px-4 py-3 lg:hidden sm:-mx-6 sm:px-6">
        <div className="flex gap-2 min-w-max">
          {sidebarSections.flatMap((section) =>
            section.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex shrink-0 rounded-[5px] border-2 border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
              >
                {item.label}
              </a>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 py-10">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-6">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold text-foreground">
                  {section.title}
                </h4>
                <ul className="mt-2 space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="prose-kontext max-w-3xl">
            {/* Header */}
            <div className="mb-12">
              <Badge variant="secondary" className="mb-4">
                Documentation
              </Badge>
              <h1>Kontext SDK Documentation</h1>
              <p>
                Kontext is a TypeScript SDK that provides compliance
                infrastructure for agents that move money. Audit trails, OFAC
                screening, trust scoring, on-chain anchoring, and agent-to-agent
                attestation -- all in a single function call.
              </p>
            </div>

            {/* Quick links */}
            <div className="mb-12 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Zap,
                  title: "Quick Start",
                  description: "Get up and running in 2 minutes",
                  href: "#quickstart",
                },
                {
                  icon: Code2,
                  title: "API Reference",
                  description: "Full API documentation",
                  href: "#api",
                },
                {
                  icon: Shield,
                  title: "On-Chain & A2A",
                  description: "Anchoring and attestation guides",
                  href: "#on-chain-anchoring",
                },
                {
                  icon: BookOpen,
                  title: "Examples",
                  description: "Real-world code examples",
                  href: "https://github.com/Legaci-Labs/kontext",
                },
              ].map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className="group flex items-start gap-3 rounded-[5px] border-2 border-border p-4 no-underline transition-colors hover:bg-card"
                >
                  <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                    <link.icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                      {link.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {link.description}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <Separator className="my-12" />

            {/* Installation */}
            <section id="installation">
              <h2>Installation</h2>
              <p>
                Install the Kontext SDK using your preferred package manager.
              </p>
              <CodeBlock
                code={installCode}
                language="bash"
                filename="Terminal"
              />
              <p className="mt-4">
                Or with yarn / pnpm:
              </p>
              <CodeBlock
                code={`yarn add kontext-sdk\n# or\npnpm add kontext-sdk`}
                language="bash"
                filename="Terminal"
              />
              <p>
                <strong>Requirements:</strong> Node.js 18+ and TypeScript 5.0+.
                The SDK has zero runtime dependencies.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Quick Start */}
            <section id="quickstart">
              <h2>Quick Start</h2>
              <p>
                Get compliance working in your agent in under 2 minutes. Initialize
                the SDK, call <code>verify()</code>, and check the result.
              </p>
              <CodeBlock
                code={quickStartCode}
                language="typescript"
                filename="agent.ts"
              />
              <p>
                The <code>verify()</code> method is the core of Kontext. It
                logs the transaction, runs OFAC and threshold checks, computes a
                trust score, and returns everything you need to make a decision.
                Every call is chained into a tamper-evident SHA-256 digest.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Action Logging */}
            <section id="action-logging">
              <h2>Action Logging</h2>
              <p>
                Every action your agents take should be logged for auditability.
                Kontext provides action logging, transaction logging, and
                reasoning logging -- each feeds into the digest chain.
              </p>
              <CodeBlock
                code={actionLoggingCode}
                language="typescript"
                filename="logging.ts"
              />
              <p>
                Reasoning entries are separate from action logs. When regulators
                ask &quot;why did your agent approve that transfer?&quot; -- reasoning
                logs are your answer.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Task Confirmation */}
            <section id="task-confirmation">
              <h2>Task Confirmation</h2>
              <p>
                For high-value or sensitive actions, create a task that requires
                human approval before the agent proceeds. Tasks track required
                evidence and who confirmed them.
              </p>
              <CodeBlock
                code={taskConfirmationCode}
                language="typescript"
                filename="confirmation.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Audit Export */}
            <section id="audit-export">
              <h2>Audit Export</h2>
              <p>
                Export your complete audit trail as JSON (CSV on Pro). The
                digest chain provides cryptographic proof that no records have
                been tampered with. Generate compliance certificates that bundle
                the audit trail, trust scores, and reasoning.
              </p>
              <CodeBlock
                code={auditExportCode}
                language="typescript"
                filename="export.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Trust Scoring */}
            <section id="trust-scoring">
              <h2>Trust Scoring</h2>
              <p>
                Every agent gets a trust score from 0 to 100, computed from five
                factors: history, amount patterns, transaction frequency,
                destination trust, and behavioral consistency. Use it to
                gate actions, set thresholds, or flag agents for review.
              </p>
              <CodeBlock
                code={trustScoringCode}
                language="typescript"
                filename="trust.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Anomaly Detection */}
            <section id="anomaly-detection">
              <h2>Anomaly Detection</h2>
              <p>
                Enable rule-based anomaly detection to flag or block suspicious
                agent behavior. The free tier includes two rules (<code>unusualAmount</code> and <code>frequencySpike</code>).
                Pro unlocks four more: <code>newDestination</code>, <code>offHoursActivity</code>, <code>rapidSuccession</code>,
                and <code>roundAmount</code>.
              </p>
              <CodeBlock
                code={anomalyDetectionCode}
                language="typescript"
                filename="anomaly.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* On-Chain Anchoring */}
            <section id="on-chain-anchoring">
              <h2>On-Chain Anchoring</h2>
              <p>
                The digest chain gives you tamper-evidence at the software level.
                On-chain anchoring takes it further -- write the terminal digest
                to a smart contract on Base. Now anyone can independently verify
                that your compliance checks ran at a specific block height. No
                Kontext account needed.
              </p>
              <CodeBlock
                code={onChainAnchoringCode}
                language="typescript"
                filename="anchoring.ts"
              />
              <p>
                The <code>verifyAnchor()</code> and <code>getAnchor()</code> functions
                have zero dependencies -- they use native <code>fetch()</code> with
                ABI-encoded RPC calls. The <code>anchorDigest()</code> write function
                requires <code>viem</code> as a peer dependency.
              </p>
            </section>

            <Separator className="my-12" />

            {/* A2A Attestation */}
            <section id="a2a-attestation">
              <h2>A2A Attestation</h2>
              <p>
                When two agents transact, both sides need proof that the other
                ran compliance. A2A attestation handles this automatically --
                pass a <code>counterparty</code> config to <code>verify()</code> and
                the SDK exchanges digests via the counterparty&apos;s <code>/.well-known/kontext.json</code> agent
                card and <code>/kontext/attest</code> endpoint.
              </p>
              <CodeBlock
                code={a2aAttestationCode}
                language="typescript"
                filename="attestation.ts"
              />
              <p>
                The attestation protocol uses native <code>fetch()</code> with zero
                dependencies. Both agents end up with the other&apos;s digest linked
                in their audit trail -- bilateral, cryptographic proof of mutual
                compliance.
              </p>
            </section>

            <Separator className="my-12" />

            {/* Agent Provenance */}
            <section id="agent-provenance">
              <h2>Agent Provenance</h2>
              <p>
                Agent provenance adds three layers of accountability on top of the
                digest chain. Each layer answers a different question regulators ask.
              </p>
              <h3>Layer 1: Session Delegation</h3>
              <p>
                Records who authorized the agent to act. Every session captures the
                delegator, the agent, the permitted scope, and an optional expiration.
                The agent cannot create its own session -- a human or upstream system
                delegates authority.
              </p>
              <h3>Layer 2: Action Binding</h3>
              <p>
                Every <code>verify()</code>, <code>log()</code>, and <code>logReasoning()</code> call
                accepts a <code>sessionId</code>. The action envelope binds the call to the
                session that authorized it. Actions without a <code>sessionId</code> still log
                normally but lack the provenance binding.
              </p>
              <h3>Layer 3: Human Attestation</h3>
              <p>
                After actions execute, a human reviewer creates a checkpoint that
                references specific action IDs, then attests to it with a signature.
                The attestation key is held by the reviewer -- the agent never touches it.
                This proves a human reviewed the actions, not just that they ran.
              </p>
              <CodeBlock
                code={agentProvenanceCode}
                language="typescript"
                filename="provenance.ts"
              />
              <h3>CLI Commands</h3>
              <CodeBlock
                code={`# Create a session for an agent
npx kontext-sdk session create --agent treasury-agent --delegated-by user:vinay --scope transfer,approve

# List active sessions
npx kontext-sdk session list --agent treasury-agent

# End a session
npx kontext-sdk session end <sessionId>

# Create a checkpoint referencing specific actions
npx kontext-sdk checkpoint create --session <sessionId> --actions act_1,act_2 --summary "Reviewed transfers"

# Attest a checkpoint (human signs off)
npx kontext-sdk checkpoint attest <checkpointId> --attested-by compliance@company.com

# List checkpoints for a session
npx kontext-sdk checkpoint list --session <sessionId>`}
                language="bash"
                filename="Terminal"
              />
            </section>

            <Separator className="my-12" />

            {/* Agent Identity */}
            <section id="agent-identity">
              <h2>Agent Identity</h2>
              <Badge variant="outline" className="mb-4">Pro</Badge>
              <p>
                Register agent identities with wallet mappings, reverse-lookup
                which agent owns a wallet, and manage identity lifecycles.
                Requires the Pro plan (<code>kya-identity</code> gate).
              </p>
              <CodeBlock
                code={agentIdentityCode}
                language="typescript"
                filename="agent-identity.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Wallet Clustering */}
            <section id="wallet-clustering">
              <h2>Wallet Clustering</h2>
              <Badge variant="outline" className="mb-4">Pro</Badge>
              <p>
                Detect wallets controlled by the same agent using a Union-Find
                algorithm with 5 heuristics. Each cluster includes evidence
                trails documenting why wallets were grouped.
              </p>
              <CodeBlock
                code={walletClusteringCode}
                language="typescript"
                filename="wallet-clustering.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Confidence Scoring */}
            <section id="confidence-scoring">
              <h2>Confidence Scoring</h2>
              <Badge variant="outline" className="mb-4">Pro</Badge>
              <p>
                Compute a composite identity confidence score (0-100) for
                registered agents. The score combines 5 components:
                identity-completeness, wallet-verification, behavioral-consistency,
                historical-depth, and cluster-coherence.
              </p>
              <CodeBlock
                code={confidenceScoringCode}
                language="typescript"
                filename="confidence-scoring.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* CLI Installation */}
            <section id="cli-install">
              <h2>CLI Installation</h2>
              <p>
                The Kontext CLI (<code>@kontext-sdk/cli</code>) provides 12
                commands for compliance operations from the terminal. Install
                globally or run via npx — no project setup required.
              </p>
              <CodeBlock
                code={cliInstallCode}
                language="bash"
                filename="Terminal"
              />
            </section>

            <Separator className="my-12" />

            {/* CLI Commands */}
            <section id="cli-commands">
              <h2>CLI Commands</h2>
              <p>
                Every SDK operation has a CLI equivalent. Run compliance checks,
                verify transactions, generate certificates, export audit trails,
                and anchor digests — all from the command line.
              </p>
              <CodeBlock
                code={cliCommandsCode}
                language="bash"
                filename="Terminal"
              />
            </section>

            <Separator className="my-12" />

            {/* CLI MCP Server */}
            <section id="cli-mcp">
              <h2>MCP Server</h2>
              <p>
                The CLI includes a built-in MCP (Model Context Protocol) server
                that exposes 8 compliance tools to AI coding assistants like
                Claude Code, Cursor, and Windsurf. Start it
                with <code>kontext mcp</code>.
              </p>
              <CodeBlock
                code={cliMcpCode}
                language="bash"
                filename="Terminal"
              />
            </section>

            <Separator className="my-12" />

            {/* API Reference */}
            <section id="api">
              <h2>API Reference</h2>
              <p>
                Complete reference for all Kontext SDK methods. The SDK uses a
                private constructor with a static <code>Kontext.init(config)</code> factory.
              </p>
              <CodeBlock
                code={apiReferenceCode}
                language="typescript"
                filename="api-reference.ts"
              />
            </section>

            <Separator className="my-12" />

            {/* Configuration */}
            <section id="configuration">
              <h2>Configuration</h2>
              <p>
                Kontext is configured via <code>Kontext.init(config)</code>. No config
                files, no environment variable magic. Everything is explicit in code.
              </p>
              <CodeBlock
                code={configCode}
                language="typescript"
                filename="config.ts"
              />

              <h3>Environment Variables</h3>
              <CodeBlock
                code={`KONTEXT_API_KEY=sk_live_...     # API key for cloud mode (Pro)
KONTEXT_CHAIN=base              # Default chain
KONTEXT_ENVIRONMENT=production  # Environment`}
                language="bash"
                filename=".env"
              />
            </section>

            <Separator className="my-12" />

            {/* Types */}
            <section id="types">
              <h2>TypeScript Types</h2>
              <p>
                All types are exported from the main package. Full autocomplete
                in any TypeScript-aware editor.
              </p>
              <CodeBlock
                code={typesCode}
                language="typescript"
                filename="types.ts"
              />
            </section>

            {/* Next steps */}
            <div className="mt-16 rounded-[5px] border-2 border-border bg-primary/5 p-8">
              <h3 className="text-lg font-semibold">Need help?</h3>
              <p className="mt-2 text-muted-foreground">
                If you run into issues or have questions, reach out through any
                of these channels:
              </p>
              <ul className="mt-4">
                <li>
                  <a
                    href="https://github.com/Legaci-Labs/kontext"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Issues & Discussions
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@kontext.dev">hello@kontext.dev</a>
                </li>
                <li>
                  <a
                    href="https://x.com/kontextverify"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @kontextverify on X
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
