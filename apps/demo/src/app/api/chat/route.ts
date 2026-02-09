import { NextRequest, NextResponse } from "next/server";
import { Kontext } from "kontext-sdk";

// ---------------------------------------------------------------------------
// Session-scoped Kontext instance (persists across requests in dev)
// ---------------------------------------------------------------------------
let kontext: Kontext | null = null;

function getKontext(): Kontext {
  if (!kontext) {
    kontext = Kontext.init({
      projectId: "kontext-demo",
      environment: "development",
    });
    kontext.enableAnomalyDetection({
      rules: [
        "unusualAmount",
        "frequencySpike",
        "newDestination",
        "roundAmount",
      ],
      thresholds: {
        maxAmount: "50000",
        maxFrequency: 20,
      },
    });
  }
  return kontext;
}

// ---------------------------------------------------------------------------
// Mock AI Agent - simulates realistic AI responses to financial prompts
// ---------------------------------------------------------------------------

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface MockResponse {
  message: string;
  toolCalls: ToolCall[];
}

function generateMockTxHash(): string {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function parseMockPrompt(prompt: string): MockResponse {
  const lower = prompt.toLowerCase();

  // Transfer / Send patterns
  const transferMatch = lower.match(
    /(?:send|transfer|pay)\s+\$?([\d,]+(?:\.\d+)?)\s*(?:usdc|usd)?\s*(?:to\s+)?(0x[a-f0-9]+)?/i
  );
  if (transferMatch) {
    const amount = transferMatch[1]!.replace(/,/g, "");
    const to =
      transferMatch[2] || "0x742d35Cc6634C0532925a3b844Bc9e7595bBD1E";
    const txHash = generateMockTxHash();

    return {
      message: `I've initiated a transfer of ${amount} USDC to \`${to.slice(0, 6)}...${to.slice(-4)}\` on Base.\n\nTransaction hash: \`${txHash.slice(0, 10)}...${txHash.slice(-6)}\`\n\nThe transfer has been logged to the Kontext audit trail with a cryptographic digest for tamper-evident compliance.`,
      toolCalls: [
        {
          name: "transfer_usdc",
          args: {
            amount,
            to,
            chain: "base",
            token: "USDC",
          },
          result: {
            success: true,
            txHash,
            chain: "base",
            amount,
            to,
            gasUsed: "21000",
            blockNumber: 18942156 + Math.floor(Math.random() * 1000),
          },
        },
      ],
    };
  }

  // Check balance
  if (
    lower.includes("balance") ||
    lower.includes("how much") ||
    lower.includes("wallet")
  ) {
    const balance = (Math.random() * 50000 + 5000).toFixed(2);
    return {
      message: `Your wallet balance on Base:\n\n- **USDC**: ${balance}\n- **ETH**: ${(Math.random() * 2 + 0.1).toFixed(4)}\n\nAll balance queries are recorded in the Kontext audit trail.`,
      toolCalls: [
        {
          name: "check_balance",
          args: {
            chain: "base",
            address: "0x1234567890abcdef1234567890abcdef12345678",
          },
          result: {
            balances: {
              USDC: balance,
              ETH: (Math.random() * 2 + 0.1).toFixed(4),
            },
            chain: "base",
          },
        },
      ],
    };
  }

  // Trust score
  if (lower.includes("trust") || lower.includes("score")) {
    return {
      message:
        "I'll fetch the current trust score from Kontext. The trust score is computed from multiple factors including history depth, task completion rate, anomaly frequency, transaction consistency, and compliance adherence.",
      toolCalls: [],
    };
  }

  // Compliance check
  if (lower.includes("compliance") || lower.includes("compliant")) {
    return {
      message:
        "Kontext automatically runs compliance checks on every financial operation. This includes OFAC sanctions screening, amount threshold checks (EDD at $3,000, CTR at $10,000), address format validation, and chain support verification. All checks are logged to the tamper-evident digest chain.",
      toolCalls: [],
    };
  }

  // Digest / audit
  if (
    lower.includes("digest") ||
    lower.includes("audit") ||
    lower.includes("chain")
  ) {
    return {
      message:
        "The Kontext digest chain creates a tamper-evident audit trail using a patented cryptographic linking mechanism. Each event is chained to the full history before it -- modifying any past event breaks the chain, making tampering immediately detectable. You can verify integrity independently by exporting the chain and running the built-in verification function.",
      toolCalls: [],
    };
  }

  // Default
  return {
    message: `I'm the Kontext demo agent with access to financial tools. I can:\n\n- **Send USDC** - e.g., "Send $5,000 USDC to 0x742d...bD1E"\n- **Check balance** - e.g., "Check my wallet balance"\n- **View trust score** - e.g., "What's my trust score?"\n\nEvery action is logged to a tamper-evident digest chain with automatic OFAC sanctions screening and compliance checks.`,
    toolCalls: [],
  };
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const k = getKontext();
    const agentId = "demo-agent";

    // 1) Log the user prompt
    await k.log({
      type: "ai_generate",
      description: `User prompt: ${message.slice(0, 100)}`,
      agentId,
      metadata: { prompt: message, source: "demo-chat" },
    });

    // 2) Generate mock AI response
    const mockResponse = parseMockPrompt(message);

    // 3) Process tool calls through Kontext
    for (const tc of mockResponse.toolCalls) {
      // Log tool call
      await k.log({
        type: "ai_tool_call",
        description: `Tool call: ${tc.name}`,
        agentId,
        metadata: {
          toolName: tc.name,
          args: tc.args,
        },
      });

      // For financial tools, log additional financial data and run compliance
      if (
        tc.name === "transfer_usdc" ||
        tc.name === "send_payment"
      ) {
        const amount = String(tc.args.amount || "0");
        const to = String(tc.args.to || "0x0000000000000000000000000000000000000000");

        await k.log({
          type: "ai_financial_tool_call",
          description: `Financial tool "${tc.name}" invoked with amount ${amount} USDC`,
          agentId,
          metadata: {
            toolName: tc.name,
            amount,
            currency: "USDC",
            toolArgs: tc.args,
          },
        });

        // Log as a transaction in Kontext
        const txHash =
          (tc.result.txHash as string) || generateMockTxHash();
        await k.logTransaction({
          txHash,
          chain: "base",
          amount,
          token: "USDC",
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to,
          agentId,
          metadata: { source: "demo", toolName: tc.name },
        });
      }
    }

    // 4) Log AI response
    await k.log({
      type: "ai_response",
      description: `AI response generated (${mockResponse.message.length} chars)`,
      agentId,
      metadata: {
        responseLength: mockResponse.message.length,
        toolCallCount: mockResponse.toolCalls.length,
      },
    });

    // 5) Run compliance check if there was a financial tool call
    let complianceResult = null;
    const financialTc = mockResponse.toolCalls.find(
      (tc) =>
        tc.name === "transfer_usdc" || tc.name === "send_payment"
    );
    if (financialTc) {
      const to = String(
        financialTc.args.to ||
          "0x0000000000000000000000000000000000000000"
      );
      const amount = String(financialTc.args.amount || "0");
      complianceResult = k.checkUsdcCompliance({
        txHash: (financialTc.result.txHash as string) || generateMockTxHash(),
        chain: "base",
        amount,
        token: "USDC",
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to,
        agentId,
      });

      // Log the compliance check
      await k.log({
        type: "compliance_check",
        description: `USDC compliance check: ${complianceResult.compliant ? "PASSED" : "FAILED"} (risk: ${complianceResult.riskLevel})`,
        agentId,
        metadata: {
          compliant: complianceResult.compliant,
          riskLevel: complianceResult.riskLevel,
          checkCount: complianceResult.checks.length,
          passedCount: complianceResult.checks.filter((c) => c.passed)
            .length,
          recommendations: complianceResult.recommendations,
        },
      });
    }

    // 6) Gather state
    const actions = k.getActions();
    const chain = k.exportDigestChain();
    const trustScore = await k.getTrustScore(agentId);
    const verification = k.verifyDigestChain();

    return NextResponse.json({
      message: mockResponse.message,
      toolCalls: mockResponse.toolCalls,
      actions: actions.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        type: a.type,
        description: a.description,
        digest: a.digest,
        metadata: a.metadata,
      })),
      chain: {
        genesisHash: chain.genesisHash,
        terminalDigest: chain.terminalDigest,
        length: chain.links.length,
        links: chain.links.slice(-8).map((l) => ({
          digest: l.digest,
          priorDigest: l.priorDigest,
          sequence: l.sequence,
          actionId: l.actionId,
        })),
        verified: verification.valid,
        linksVerified: verification.linksVerified,
      },
      trustScore: {
        score: trustScore.score,
        level: trustScore.level,
        factors: trustScore.factors,
      },
      complianceResult: complianceResult
        ? {
            compliant: complianceResult.compliant,
            riskLevel: complianceResult.riskLevel,
            checks: complianceResult.checks,
            recommendations: complianceResult.recommendations,
          }
        : null,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/chat -- return current state (for polling)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const k = getKontext();
    const agentId = "demo-agent";

    const actions = k.getActions();
    const chain = k.exportDigestChain();
    const trustScore = await k.getTrustScore(agentId);
    const verification = k.verifyDigestChain();

    return NextResponse.json({
      actions: actions.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        type: a.type,
        description: a.description,
        digest: a.digest,
        metadata: a.metadata,
      })),
      chain: {
        genesisHash: chain.genesisHash,
        terminalDigest: chain.terminalDigest,
        length: chain.links.length,
        links: chain.links.slice(-8).map((l) => ({
          digest: l.digest,
          priorDigest: l.priorDigest,
          sequence: l.sequence,
          actionId: l.actionId,
        })),
        verified: verification.valid,
        linksVerified: verification.linksVerified,
      },
      trustScore: {
        score: trustScore.score,
        level: trustScore.level,
        factors: trustScore.factors,
      },
    });
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
