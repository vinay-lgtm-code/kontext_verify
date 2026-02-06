// ============================================================================
// POST /api/chat — AI Agent with Kontext Compliance Audit Trail
// ============================================================================
//
// This is the key integration point. The Kontext SDK wraps the AI model so
// that every tool call, LLM request, and streaming response is automatically
// logged into a tamper-evident SHA-256 digest chain.
//
// One-line setup:
//   const { model, kontext } = createKontextAI(openai('gpt-4o'), { ... });
//
// That's it. Every subsequent `streamText()` / `generateText()` call using
// `model` will be compliance-logged with zero additional code.
// ============================================================================

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';
import { createKontextAI } from 'kontext-sdk';

export const maxDuration = 30;

export async function POST(req: Request) {
  // --------------------------------------------------------------------------
  // Guard: require an OpenAI API key
  // --------------------------------------------------------------------------
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error: 'Set OPENAI_API_KEY to enable the AI agent',
        demo: true,
        hint: 'Add OPENAI_API_KEY to your .env.local file or Vercel environment variables.',
      },
      { status: 503 },
    );
  }

  const { messages } = await req.json();

  // --------------------------------------------------------------------------
  // One-line Kontext setup — wraps the model with audit logging
  // --------------------------------------------------------------------------
  // `createKontextAI` initializes a Kontext client and returns a wrapped model
  // that intercepts every AI call through middleware. Tool calls, token usage,
  // and streaming events are all recorded in the digest chain automatically.
  const { model, kontext } = createKontextAI(openai('gpt-4o'), {
    projectId: process.env.KONTEXT_PROJECT_ID ?? 'ai-agent',
    environment: (process.env.KONTEXT_ENVIRONMENT as 'development' | 'staging' | 'production') ?? 'development',
    agentId: 'chat-agent',
    financialTools: ['transfer_usdc', 'send_payment', 'check_balance'],
    logToolArgs: true,
  });

  // --------------------------------------------------------------------------
  // Stream the response — all tool calls are automatically audit-logged
  // --------------------------------------------------------------------------
  const result = streamText({
    model: model as Parameters<typeof streamText>[0]['model'],
    system: `You are a helpful AI assistant that can execute stablecoin transactions.
You have access to financial tools for transferring USDC, sending payments, and checking balances.
Always confirm transaction details with the user before executing.
When discussing amounts, be precise and include the currency (USDC).
Every action you take is logged in a tamper-evident audit trail powered by Kontext.`,
    messages,
    tools: {
      // -----------------------------------------------------------------------
      // Tool: transfer_usdc
      // Transfers USDC stablecoins to a recipient address on a given chain.
      // Kontext automatically logs this as a financial tool call with amount
      // extraction and compliance checks.
      // -----------------------------------------------------------------------
      transfer_usdc: {
        description: 'Transfer USDC stablecoins to a recipient address',
        parameters: z.object({
          to: z.string().describe('Recipient wallet address'),
          amount: z.string().describe('Amount of USDC to transfer'),
          chain: z
            .enum(['base', 'ethereum', 'polygon'])
            .describe('Blockchain network for the transfer'),
        }),
        execute: async ({ to, amount, chain }) => {
          // In production, replace this with your actual wallet/transfer logic.
          // The Kontext middleware has already logged this tool invocation,
          // extracted the amount, and added it to the digest chain.
          const txHash =
            '0x' +
            Array.from({ length: 64 }, () =>
              Math.floor(Math.random() * 16).toString(16),
            ).join('');

          return {
            success: true,
            txHash,
            amount,
            to,
            chain,
            message: `Transferred ${amount} USDC to ${to} on ${chain}`,
          };
        },
      },

      // -----------------------------------------------------------------------
      // Tool: send_payment
      // Sends a payment with a memo/reason attached.
      // -----------------------------------------------------------------------
      send_payment: {
        description: 'Send a payment with a memo to a recipient',
        parameters: z.object({
          to: z.string().describe('Recipient wallet address'),
          amount: z.string().describe('Amount in USDC'),
          memo: z.string().describe('Payment memo or reason'),
        }),
        execute: async ({ to, amount, memo }) => {
          const txHash =
            '0x' +
            Array.from({ length: 64 }, () =>
              Math.floor(Math.random() * 16).toString(16),
            ).join('');

          return {
            success: true,
            txHash,
            amount,
            to,
            memo,
            message: `Payment of ${amount} USDC sent to ${to} (${memo})`,
          };
        },
      },

      // -----------------------------------------------------------------------
      // Tool: check_balance
      // Checks the USDC balance of a wallet address.
      // -----------------------------------------------------------------------
      check_balance: {
        description: 'Check the USDC balance of a wallet address',
        parameters: z.object({
          address: z.string().describe('Wallet address to check'),
        }),
        execute: async ({ address }) => {
          // Simulated balance for the demo
          const balance = (Math.random() * 10000).toFixed(2);

          return {
            address,
            balance,
            token: 'USDC',
            message: `Balance of ${address}: ${balance} USDC`,
          };
        },
      },
    },
  });

  // --------------------------------------------------------------------------
  // The audit trail is available after the stream completes.
  // In production, you could persist this or send it to an external system.
  // --------------------------------------------------------------------------
  // const chain = kontext.exportDigestChain();
  // console.log('Terminal digest:', kontext.getTerminalDigest());
  // console.log('Chain length:', chain.links.length);

  return result.toDataStreamResponse();
}
