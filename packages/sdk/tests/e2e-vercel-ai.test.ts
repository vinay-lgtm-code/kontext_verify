// ============================================================================
// End-to-End Test: Vercel AI SDK + Kontext Integration
//
// This test spins up a simulated Vercel AI agent with financial tools,
// runs it through Kontext's middleware, and verifies the complete audit
// trail, digest chain integrity, trust scoring, and compliance checks.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  Kontext,
  kontextMiddleware,
  kontextWrapModel,
  createKontextAI,
  withKontext,
  extractAmount,
  verifyExportedChain,
} from '../src/index.js';

// ============================================================================
// Mock Vercel AI SDK model
// ============================================================================

function createMockModel(options?: {
  toolCalls?: Array<{ toolName: string; args: unknown }>;
  finishReason?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  text?: string;
}) {
  const toolCalls = options?.toolCalls ?? [];
  const finishReason = options?.finishReason ?? 'stop';
  const usage = options?.usage ?? { promptTokens: 100, completionTokens: 50, totalTokens: 150 };
  const text = options?.text ?? 'Transfer completed successfully.';

  return {
    modelId: 'gpt-4o',
    provider: 'openai',
    specificationVersion: 'v1',

    async doGenerate(params: Record<string, unknown>) {
      return {
        text,
        toolCalls,
        finishReason,
        usage,
        rawCall: { rawPrompt: null, rawSettings: {} },
      };
    },

    async doStream(params: Record<string, unknown>) {
      const chunks: Array<Record<string, unknown>> = [];

      // Add tool-call chunks
      for (const tc of toolCalls) {
        chunks.push({ type: 'tool-call', toolName: tc.toolName, args: tc.args, toolCallId: `call_${tc.toolName}` });
      }

      // Add text delta
      chunks.push({ type: 'text-delta', textDelta: text });
      chunks.push({ type: 'finish', finishReason, usage });

      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      return { stream, rawCall: { rawPrompt: null, rawSettings: {} } };
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('E2E: Vercel AI Agent + Kontext', () => {
  // --------------------------------------------------------------------------
  // Scenario 1: Agent makes a USDC transfer — full audit trail
  // --------------------------------------------------------------------------
  describe('Scenario: AI agent initiates a $5,000 USDC transfer', () => {
    it('should log the complete AI operation lifecycle with digest chain', async () => {
      const kontext = Kontext.init({
        projectId: 'e2e-test',
        environment: 'development',
      });

      const mockModel = createMockModel({
        toolCalls: [
          {
            toolName: 'transfer_usdc',
            args: { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1E', amount: '5000.00', chain: 'base' },
          },
        ],
        finishReason: 'tool-calls',
        usage: { promptTokens: 200, completionTokens: 80, totalTokens: 280 },
      });

      // Wrap the model with Kontext
      const wrappedModel = kontextWrapModel(mockModel, kontext, {
        agentId: 'treasury-agent-v3',
        financialTools: ['transfer_usdc', 'send_payment'],
        logToolArgs: true,
        defaultCurrency: 'USDC',
      });

      // Simulate generateText() — calls doGenerate
      const result = await (wrappedModel as any).doGenerate({
        model: { modelId: 'gpt-4o' },
        tools: [{ name: 'transfer_usdc' }],
        maxTokens: 1000,
        temperature: 0,
      });

      // Verify the AI response passed through
      expect(result.text).toBe('Transfer completed successfully.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].toolName).toBe('transfer_usdc');

      // Verify the digest chain has entries
      // Expected: transformParams + tool_call + financial_tool + response = 4
      const chain = kontext.exportDigestChain();
      expect(chain.links.length).toBeGreaterThanOrEqual(3);

      // Verify chain integrity using internal verification
      const terminalDigest = kontext.getTerminalDigest();
      expect(terminalDigest).toBeTruthy();
      expect(terminalDigest.length).toBe(64); // SHA-256 hex

      // Verify the chain using exported verification (requires actions)
      const actions = kontext.getActions();
      const verification = verifyExportedChain(chain, actions);
      expect(verification.valid).toBe(true);
      expect(verification.linksVerified).toBe(chain.links.length);
    });

    it('should detect the financial tool call and log the amount', async () => {
      const kontext = Kontext.init({
        projectId: 'e2e-financial-test',
        environment: 'development',
      });

      const mockModel = createMockModel({
        toolCalls: [
          { toolName: 'transfer_usdc', args: { amount: '5000.00', to: '0xabc' } },
        ],
      });

      const wrappedModel = kontextWrapModel(mockModel, kontext, {
        agentId: 'payment-agent',
        financialTools: ['transfer_usdc'],
        logToolArgs: true,
      });

      await (wrappedModel as any).doGenerate({
        model: { modelId: 'gpt-4o' },
        tools: [],
      });

      // Check actions for financial entries (avoids BigInt JSON issue with chain links)
      const actions = kontext.getActions();
      const financialActions = actions.filter((a) => a.type === 'ai_financial_tool_call');
      expect(financialActions.length).toBeGreaterThanOrEqual(1);

      // Verify the amount was logged in the action metadata
      const financialAction = financialActions[0];
      expect(financialAction.metadata).toBeDefined();
      expect(String(financialAction.metadata?.amount)).toContain('5000');
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Streaming AI agent with multiple tool calls
  // --------------------------------------------------------------------------
  describe('Scenario: Streaming agent with multiple financial operations', () => {
    it('should log tool calls from the stream and maintain chain integrity', async () => {
      const kontext = Kontext.init({
        projectId: 'e2e-stream-test',
        environment: 'development',
      });

      const mockModel = createMockModel({
        toolCalls: [
          { toolName: 'check_balance', args: { walletId: 'w-123' } },
          { toolName: 'transfer_usdc', args: { amount: '2500', to: '0xdef' } },
          { toolName: 'send_payment', args: { amount: '750', to: '0xghi', currency: 'USDC' } },
        ],
      });

      const wrappedModel = kontextWrapModel(mockModel, kontext, {
        agentId: 'multi-tool-agent',
        financialTools: ['transfer_usdc', 'send_payment'],
        logToolArgs: true,
      });

      // Simulate streamText() — calls doStream
      const streamResult = await (wrappedModel as any).doStream({
        model: { modelId: 'gpt-4o' },
        tools: [],
      });

      // Consume the stream to trigger the flush handler
      const reader = streamResult.stream.getReader();
      const chunks: any[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Verify chunks passed through (3 tool-calls + text-delta + finish)
      expect(chunks.length).toBeGreaterThanOrEqual(3);

      // Verify the digest chain logged everything
      // Expected: stream_start (from transformParams) + stream_start + 3 tool calls + 2 financial + stream_complete
      const chain = kontext.exportDigestChain();
      expect(chain.links.length).toBeGreaterThanOrEqual(4);

      // Chain integrity via internal verification
      const verification = kontext.verifyDigestChain();
      expect(verification.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 3: createKontextAI one-liner + audit export
  // --------------------------------------------------------------------------
  describe('Scenario: One-line createKontextAI setup', () => {
    it('should create a working Kontext client and wrapped model in one call', async () => {
      const mockModel = createMockModel({
        toolCalls: [
          { toolName: 'transfer_usdc', args: { amount: '10000', to: '0xvendor' } },
        ],
      });

      const { model, kontext } = createKontextAI(mockModel, {
        projectId: 'one-liner-test',
        agentId: 'quick-agent',
        financialTools: ['transfer_usdc'],
        logToolArgs: true,
      });

      // Run a generate
      const result = await (model as any).doGenerate({
        model: { modelId: 'gpt-4o' },
        tools: [{ name: 'transfer_usdc' }],
      });

      expect(result.text).toBe('Transfer completed successfully.');

      // Verify Kontext logged everything
      const chain = kontext.exportDigestChain();
      expect(chain.links.length).toBeGreaterThanOrEqual(3);

      // Verify tamper-evidence using exported chain + actions
      const actions = kontext.getActions();
      const verification = verifyExportedChain(chain, actions);
      expect(verification.valid).toBe(true);

      // Terminal digest exists
      const digest = kontext.getTerminalDigest();
      expect(digest).toHaveLength(64);
    });

    it('should track trust scores across multiple operations', async () => {
      const mockModel = createMockModel({
        toolCalls: [
          { toolName: 'transfer_usdc', args: { amount: '100' } },
        ],
      });

      const { model, kontext } = createKontextAI(mockModel, {
        projectId: 'trust-tracking-test',
        agentId: 'tracked-agent',
        financialTools: ['transfer_usdc'],
      });

      // Run multiple generates to build trust history
      for (let i = 0; i < 3; i++) {
        await (model as any).doGenerate({
          model: { modelId: 'gpt-4o' },
          tools: [],
        });
      }

      // Check trust score
      const trust = await kontext.getTrustScore('tracked-agent');
      expect(trust.score).toBeGreaterThan(0);
      expect(trust.level).toBeTruthy();

      // Chain should have entries from all 3 generates
      // Each generate: transformParams + tool_call + financial_tool + response = 4
      const chain = kontext.exportDigestChain();
      expect(chain.links.length).toBeGreaterThanOrEqual(9);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 4: withKontext Next.js route handler
  // --------------------------------------------------------------------------
  describe('Scenario: withKontext Next.js route handler', () => {
    it('should wrap a handler and provide a working Kontext context', async () => {
      let capturedContext: any = null;

      const handler = withKontext(
        async (req, ctx) => {
          capturedContext = ctx;

          // Verify context has the expected shape
          expect(ctx.kontext).toBeDefined();
          expect(ctx.wrapModel).toBeTypeOf('function');
          expect(ctx.requestId).toBeTruthy();

          // Wrap a model within the handler
          const mockModel = createMockModel({
            toolCalls: [{ toolName: 'process_payment', args: { amount: '99.99' } }],
          });

          const wrapped = ctx.wrapModel(mockModel, {
            financialTools: ['process_payment'],
            logToolArgs: true,
          });

          await (wrapped as any).doGenerate({
            model: { modelId: 'gpt-4o' },
            tools: [],
          });

          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        },
        { projectId: 'nextjs-handler-test', agentId: 'api-handler' },
      );

      // Simulate a request
      const request = new Request('https://example.com/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Pay my invoice' }] }),
      });

      const response = await handler(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.ok).toBe(true);

      // Verify Kontext logged within the handler
      const chain = capturedContext.kontext.exportDigestChain();
      expect(chain.links.length).toBeGreaterThanOrEqual(2);

      // Use internal verification (avoids needing actions from withKontext's internal kontext)
      const verification = capturedContext.kontext.verifyDigestChain();
      expect(verification.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Tamper detection
  // --------------------------------------------------------------------------
  describe('Scenario: Tamper-evident chain detects modification', () => {
    it('should detect if an audit log entry is tampered with', async () => {
      const { model, kontext } = createKontextAI(
        createMockModel({
          toolCalls: [
            { toolName: 'transfer_usdc', args: { amount: '50000', to: '0xbigspend' } },
          ],
        }),
        {
          projectId: 'tamper-test',
          agentId: 'tamper-agent',
          financialTools: ['transfer_usdc'],
          logToolArgs: true,
        },
      );

      await (model as any).doGenerate({
        model: { modelId: 'gpt-4o' },
        tools: [],
      });

      // Verify the chain is valid
      const validCheck = kontext.verifyDigestChain();
      expect(validCheck.valid).toBe(true);

      // Export chain and actions for tampering test
      const chain = kontext.exportDigestChain();
      const actions = kontext.getActions();
      expect(chain.links.length).toBeGreaterThanOrEqual(3);
      expect(actions.length).toBe(chain.links.length);

      // Tamper with the actions (simulating someone changing audit records)
      // Must modify a top-level field since serializeForDigest uses top-level keys as JSON replacer
      const tamperedActions = actions.map((a) => ({ ...a }));
      if (tamperedActions.length > 1) {
        tamperedActions[1] = {
          ...tamperedActions[1],
          description: 'TAMPERED: This record was modified after the fact',
        };
      }

      // Verify tampered actions are detected
      const tamperedCheck = verifyExportedChain(chain, tamperedActions);
      expect(tamperedCheck.valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Full lifecycle — generate + compliance + export
  // --------------------------------------------------------------------------
  describe('Scenario: Complete agent lifecycle', () => {
    it('should handle generate -> compliance check -> export in sequence', async () => {
      const kontext = Kontext.init({
        projectId: 'lifecycle-test',
        environment: 'development',
      });

      const mockModel = createMockModel({
        toolCalls: [
          { toolName: 'transfer_usdc', args: { amount: '25000', to: '0xRecipient', chain: 'base' } },
        ],
      });

      const wrappedModel = kontextWrapModel(mockModel, kontext, {
        agentId: 'lifecycle-agent',
        financialTools: ['transfer_usdc'],
        logToolArgs: true,
        defaultCurrency: 'USDC',
      });

      // Step 1: AI generates a transaction
      await (wrappedModel as any).doGenerate({
        model: { modelId: 'gpt-4o' },
        tools: [{ name: 'transfer_usdc' }],
        maxTokens: 1000,
      });

      // Step 2: Run compliance check (uses LogTransactionInput format)
      const compliance = kontext.checkUsdcCompliance({
        txHash: '0xpending',
        chain: 'base',
        amount: '25000',
        token: 'USDC',
        from: '0xAgent',
        to: '0xRecipient',
        agentId: 'lifecycle-agent',
      });
      expect(compliance).toBeDefined();
      expect(compliance.compliant).toBeDefined();

      // Step 3: Log the actual transaction
      const txRecord = await kontext.logTransaction({
        txHash: '0xabc123def456',
        chain: 'base',
        amount: '25000',
        token: 'USDC',
        from: '0xAgent',
        to: '0xRecipient',
        agentId: 'lifecycle-agent',
      });
      expect(txRecord).toBeDefined();

      // Step 4: Get trust score
      const trust = await kontext.getTrustScore('lifecycle-agent');
      expect(trust.score).toBeGreaterThan(0);

      // Step 5: Export and verify the full chain
      const chain = kontext.exportDigestChain();
      expect(chain.links.length).toBeGreaterThanOrEqual(5);

      // Verify using internal method
      const verification = kontext.verifyDigestChain();
      expect(verification.valid).toBe(true);

      // Verify terminal digest
      const terminal = kontext.getTerminalDigest();
      expect(terminal).toHaveLength(64);
      expect(terminal).toBe(chain.terminalDigest);
    });
  });
});
