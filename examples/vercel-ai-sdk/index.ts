// ============================================================================
// Kontext + Vercel AI SDK Integration Example
// ============================================================================
// Shows how to wrap AI tool calls with Kontext audit trails so every
// AI-initiated action is logged, scored, and compliance-checked.
//
// Prerequisites:
//   npm install kontext-sdk ai @ai-sdk/openai zod
//
// Run:
//   npx tsx examples/vercel-ai-sdk/index.ts
// ============================================================================

import { Kontext, FileStorage, UsdcCompliance } from 'kontext-sdk';
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// 1. Initialize Kontext with persistent file storage
const kontext = Kontext.init({
  projectId: 'vercel-ai-demo',
  environment: 'development',
  storage: new FileStorage('./kontext-data'),
});

// 2. Restore any previously persisted state
await kontext.restore();

// 3. Enable anomaly detection for financial transactions
kontext.enableAnomalyDetection({
  rules: ['unusualAmount', 'rapidSuccession', 'newDestination'],
  thresholds: { maxAmount: '5000' },
});

// 4. Register an anomaly handler
kontext.onAnomaly((anomaly) => {
  console.log(`[ANOMALY] ${anomaly.severity}: ${anomaly.description}`);
});

// 5. Define tools that the AI agent can call -- each wrapped with Kontext logging
const transferTool = tool({
  description: 'Transfer USDC to a recipient address on Base',
  parameters: z.object({
    to: z.string().describe('Recipient Ethereum address'),
    amount: z.string().describe('Amount of USDC to transfer'),
    reason: z.string().describe('Business reason for the transfer'),
  }),
  execute: async ({ to, amount, reason }) => {
    // Step A: Run compliance check before executing
    const compliance = kontext.checkUsdcCompliance({
      txHash: '0x' + '0'.repeat(64), // placeholder until real tx
      chain: 'base',
      amount,
      token: 'USDC',
      from: '0xYourAgentWallet1234567890abcdef12345678',
      to,
      agentId: 'vercel-ai-agent',
    });

    if (!compliance.compliant) {
      // Log the blocked attempt
      await kontext.log({
        type: 'transfer_blocked',
        description: `Transfer of ${amount} USDC to ${to} blocked: ${compliance.recommendations[0]}`,
        agentId: 'vercel-ai-agent',
        metadata: { to, amount, reason, riskLevel: compliance.riskLevel },
      });
      return { success: false, reason: compliance.recommendations[0] };
    }

    // Step B: Create a tracked task requiring on-chain evidence
    const task = await kontext.createTask({
      description: `Transfer ${amount} USDC to ${to} for: ${reason}`,
      agentId: 'vercel-ai-agent',
      requiredEvidence: ['txHash'],
    });

    // Step C: Simulate the on-chain transaction (replace with real wallet SDK)
    const txHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');

    // Step D: Log the transaction through Kontext
    await kontext.logTransaction({
      txHash,
      chain: 'base',
      amount,
      token: 'USDC',
      from: '0xYourAgentWallet1234567890abcdef12345678',
      to,
      agentId: 'vercel-ai-agent',
      metadata: { reason, taskId: task.id },
    });

    // Step E: Confirm the task with evidence
    await kontext.confirmTask({
      taskId: task.id,
      evidence: { txHash },
    });

    return { success: true, txHash, taskId: task.id };
  },
});

const balanceTool = tool({
  description: 'Check USDC balance of an address',
  parameters: z.object({
    address: z.string().describe('Ethereum address to check'),
  }),
  execute: async ({ address }) => {
    // Log every balance check for audit trail
    await kontext.log({
      type: 'balance_check',
      description: `Checking USDC balance of ${address}`,
      agentId: 'vercel-ai-agent',
      metadata: { address },
    });

    // Simulated balance (replace with real RPC call)
    return { address, balance: '10000.00', token: 'USDC' };
  },
});

// 6. Run the AI agent with Kontext-wrapped tools
const result = await generateText({
  model: openai('gpt-4o'),
  tools: { transfer: transferTool, balance: balanceTool },
  maxSteps: 5,
  prompt: 'Check the balance of 0xRecipient and transfer 100 USDC for invoice #1234.',
});

console.log('AI response:', result.text);

// 7. Get trust score for the AI agent
const trustScore = await kontext.getTrustScore('vercel-ai-agent');
console.log(`Agent trust score: ${trustScore.score}/100 (${trustScore.level})`);

// 8. Export the audit trail
const digest = kontext.getTerminalDigest();
console.log(`Terminal digest (tamper-evident proof): ${digest}`);

// 9. Persist all state for next run
await kontext.flush();

// 10. Clean shutdown
await kontext.destroy();
