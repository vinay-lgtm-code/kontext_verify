// ============================================================================
// Kontext + LangChain Agent Integration Example
// ============================================================================
// Shows how to add compliance screening to LangChain agent tool calls.
// Every tool invocation goes through Kontext for audit logging,
// sanctions screening, and anomaly detection.
//
// Prerequisites:
//   npm install kontext-sdk langchain @langchain/openai @langchain/core
//
// Run:
//   npx tsx examples/langchain-agent/index.ts
// ============================================================================

import { Kontext, UsdcCompliance, FileStorage } from 'kontext-sdk';
import type { LogTransactionInput } from 'kontext-sdk';
import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

// 1. Initialize Kontext with file-based persistence
const kontext = Kontext.init({
  projectId: 'langchain-compliance-demo',
  environment: 'development',
  storage: new FileStorage('./langchain-kontext-data'),
});

await kontext.restore();

// 2. Enable anomaly detection
kontext.enableAnomalyDetection({
  rules: ['unusualAmount', 'frequencySpike', 'newDestination', 'roundAmount'],
  thresholds: { maxAmount: '10000', maxFrequency: 20 },
});

// 3. Create a compliance-wrapped transfer tool for LangChain
const complianceTransferTool = new DynamicStructuredTool({
  name: 'compliant_transfer',
  description: 'Transfer USDC with full compliance screening. Checks OFAC sanctions, amount thresholds, and logs for audit.',
  schema: z.object({
    to: z.string().describe('Recipient Ethereum address (0x...)'),
    amount: z.string().describe('Amount of USDC to send'),
    purpose: z.string().describe('Business purpose for the transfer'),
  }),
  func: async ({ to, amount, purpose }) => {
    const agentId = 'langchain-payment-agent';

    // Step 1: Pre-flight sanctions screening
    if (UsdcCompliance.isSanctioned(to)) {
      const details = UsdcCompliance.checkSanctionsDetailed(to);
      await kontext.log({
        type: 'sanctions_block',
        description: `Blocked transfer to sanctioned address ${to} (${details.listMatch})`,
        agentId,
        metadata: { to, amount, purpose, sanctionsList: details.listMatch },
      });
      return `BLOCKED: Recipient ${to} is on the ${details.listMatch} sanctions list. Transfer prohibited.`;
    }

    // Step 2: Full compliance check
    const txInput: LogTransactionInput = {
      txHash: '0x' + '0'.repeat(64),
      chain: 'base',
      amount,
      token: 'USDC',
      from: '0xAgentWallet000000000000000000000000000001',
      to,
      agentId,
    };

    const compliance = kontext.checkUsdcCompliance(txInput);
    if (!compliance.compliant) {
      await kontext.log({
        type: 'compliance_block',
        description: `Transfer of ${amount} USDC blocked: ${compliance.recommendations.join('; ')}`,
        agentId,
        metadata: { to, amount, compliance: compliance.checks },
      });
      return `BLOCKED: ${compliance.recommendations[0]}`;
    }

    // Step 3: Risk evaluation
    const riskEval = await kontext.evaluateTransaction(txInput);
    if (riskEval.recommendation === 'block') {
      await kontext.log({
        type: 'risk_block',
        description: `Transfer blocked due to high risk score: ${riskEval.riskScore}`,
        agentId,
        metadata: { riskScore: riskEval.riskScore, factors: riskEval.factors },
      });
      return `BLOCKED: Risk score ${riskEval.riskScore}/100 exceeds threshold.`;
    }

    // Step 4: Create task and simulate execution
    const task = await kontext.createTask({
      description: `Transfer ${amount} USDC to ${to}: ${purpose}`,
      agentId,
      requiredEvidence: ['txHash'],
      metadata: { riskScore: riskEval.riskScore, riskLevel: riskEval.riskLevel },
    });

    // Simulate on-chain tx (replace with real wallet SDK in production)
    const txHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');

    // Step 5: Log the transaction
    await kontext.logTransaction({
      txHash,
      chain: 'base',
      amount,
      token: 'USDC',
      from: '0xAgentWallet000000000000000000000000000001',
      to,
      agentId,
      metadata: { purpose, taskId: task.id },
    });

    // Step 6: Confirm task with evidence
    await kontext.confirmTask({
      taskId: task.id,
      evidence: { txHash },
    });

    const riskNote = riskEval.recommendation === 'review' ? ' (flagged for review)' : '';
    return `SUCCESS: Transferred ${amount} USDC to ${to}. TX: ${txHash}${riskNote}`;
  },
});

// 4. Create an audit query tool
const auditQueryTool = new DynamicStructuredTool({
  name: 'query_audit_trail',
  description: 'Query the compliance audit trail for recent transactions and trust scores',
  schema: z.object({
    agentId: z.string().describe('Agent ID to query').default('langchain-payment-agent'),
  }),
  func: async ({ agentId }) => {
    const trustScore = await kontext.getTrustScore(agentId);
    const exportResult = await kontext.export({
      format: 'json',
      agentIds: [agentId],
    });
    const data = JSON.parse(exportResult.data);

    return JSON.stringify({
      trustScore: { score: trustScore.score, level: trustScore.level },
      totalActions: data.actions.length,
      totalTransactions: data.transactions.length,
      terminalDigest: kontext.getTerminalDigest(),
    });
  },
});

// 5. Set up the LangChain agent
const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
const tools = [complianceTransferTool, auditQueryTool];

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a compliant payment agent. Always use the compliant_transfer tool for payments. Check the audit trail after transfers.'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

const agent = await createOpenAIFunctionsAgent({ llm: model, tools, prompt });
const executor = new AgentExecutor({ agent, tools, verbose: true });

// 6. Run the agent
const result = await executor.invoke({
  input: 'Transfer 500 USDC to 0xRecipient12345678901234567890abcdef12345678 for Q1 vendor payment, then check the audit trail.',
});

console.log('\nAgent output:', result.output);

// 7. Final trust score
const finalScore = await kontext.getTrustScore('langchain-payment-agent');
console.log(`\nFinal trust score: ${finalScore.score}/100 (${finalScore.level})`);

// 8. Persist and shutdown
await kontext.flush();
await kontext.destroy();
