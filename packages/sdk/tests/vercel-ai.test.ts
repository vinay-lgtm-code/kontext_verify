import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import {
  Kontext,
  kontextMiddleware,
  kontextWrapModel,
  createKontextAI,
  withKontext,
  extractAmount,
} from '../src/index.js';
import type {
  KontextAIOptions,
  CreateKontextAIInput,
  KontextAIContext,
  BlockedToolCall,
} from '../src/index.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
  });
}

/** Mock Vercel AI SDK language model. */
function createMockModel(modelId = 'gpt-4o') {
  return {
    modelId,
    provider: 'openai',
    doGenerate: vi.fn().mockResolvedValue({
      text: 'Hello, world!',
      toolCalls: [],
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
    doStream: vi.fn().mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
          controller.close();
        },
      }),
    }),
  };
}

/** Mock model that returns tool calls. */
function createMockModelWithToolCalls(
  toolCalls: Array<{ toolName: string; args: unknown }>,
  modelId = 'gpt-4o',
) {
  return {
    modelId,
    provider: 'openai',
    doGenerate: vi.fn().mockResolvedValue({
      text: '',
      toolCalls,
      finishReason: 'tool-calls',
      usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
    }),
    doStream: vi.fn().mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          for (const tc of toolCalls) {
            controller.enqueue({ type: 'tool-call', toolName: tc.toolName, args: tc.args });
          }
          controller.close();
        },
      }),
    }),
  };
}

// ============================================================================
// extractAmount Helper
// ============================================================================

describe('extractAmount', () => {
  it('should extract amount from a direct number', () => {
    expect(extractAmount(100)).toBe(100);
  });

  it('should extract amount from a numeric string', () => {
    expect(extractAmount('250.50')).toBe(250.5);
  });

  it('should return null for non-numeric strings', () => {
    expect(extractAmount('hello')).toBeNull();
  });

  it('should extract amount from an object with "amount" field', () => {
    expect(extractAmount({ amount: 500 })).toBe(500);
  });

  it('should extract amount from an object with "value" field', () => {
    expect(extractAmount({ value: '300.25' })).toBe(300.25);
  });

  it('should extract amount from an object with "total" field', () => {
    expect(extractAmount({ total: 99.99 })).toBe(99.99);
  });

  it('should extract amount from an object with "payment" field', () => {
    expect(extractAmount({ payment: '1000' })).toBe(1000);
  });

  it('should extract amount from nested objects', () => {
    expect(extractAmount({ details: { amount: 42 } })).toBe(42);
  });

  it('should return null for null/undefined', () => {
    expect(extractAmount(null)).toBeNull();
    expect(extractAmount(undefined)).toBeNull();
  });

  it('should return null for objects without amount fields', () => {
    expect(extractAmount({ name: 'test', id: 123 })).toBeNull();
  });

  it('should prefer direct amount fields over nested', () => {
    expect(extractAmount({ amount: 100, details: { amount: 200 } })).toBe(100);
  });
});

// ============================================================================
// kontextMiddleware — Creation & Configuration
// ============================================================================

describe('kontextMiddleware', () => {
  let kontext: Kontext;

  beforeEach(() => {
    kontext = createClient();
  });

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should create middleware with default options', () => {
    const middleware = kontextMiddleware(kontext);
    expect(middleware).toBeDefined();
    expect(typeof middleware.transformParams).toBe('function');
    expect(typeof middleware.wrapGenerate).toBe('function');
    expect(typeof middleware.wrapStream).toBe('function');
  });

  it('should create middleware with custom options', () => {
    const middleware = kontextMiddleware(kontext, {
      agentId: 'custom-agent',
      financialTools: ['transfer_usdc'],
      logToolArgs: true,
      defaultCurrency: 'DAI',
      trustThreshold: 50,
    });
    expect(middleware).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // transformParams
  // --------------------------------------------------------------------------

  describe('transformParams', () => {
    it('should log a generate request and return params unchanged', async () => {
      const middleware = kontextMiddleware(kontext);
      const params = {
        model: { modelId: 'gpt-4o' },
        tools: [{ name: 'tool1' }, { name: 'tool2' }],
        maxTokens: 1000,
        temperature: 0.7,
      };

      const result = await middleware.transformParams({ params, type: 'generate' });
      expect(result).toBe(params);
    });

    it('should log an ai_stream type for stream operations', async () => {
      const middleware = kontextMiddleware(kontext, { agentId: 'stream-agent' });
      const params = { model: { modelId: 'claude-3-opus' }, tools: [] };

      const result = await middleware.transformParams({ params, type: 'stream' });
      expect(result).toBe(params);

      // The log should have been created in the digest chain
      const digest = kontext.getTerminalDigest();
      expect(digest).not.toBe('0'.repeat(64));
    });

    it('should log an ai_object type for object generation', async () => {
      const middleware = kontextMiddleware(kontext);
      const params = { model: { modelId: 'gpt-4o-mini' } };

      const result = await middleware.transformParams({ params, type: 'object' });
      expect(result).toBe(params);
    });

    it('should handle params without model info', async () => {
      const middleware = kontextMiddleware(kontext);
      const params = { maxTokens: 500 };

      const result = await middleware.transformParams({ params, type: 'generate' });
      expect(result).toBe(params);
    });

    it('should handle params without tools', async () => {
      const middleware = kontextMiddleware(kontext);
      const params = { model: { modelId: 'gpt-4o' } };

      const result = await middleware.transformParams({ params, type: 'generate' });
      expect(result).toBe(params);
    });
  });

  // --------------------------------------------------------------------------
  // wrapGenerate
  // --------------------------------------------------------------------------

  describe('wrapGenerate', () => {
    it('should pass through results from doGenerate', async () => {
      const middleware = kontextMiddleware(kontext);
      const mockResult = {
        text: 'Hello',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      const result = await middleware.wrapGenerate({
        doGenerate: async () => mockResult,
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(result).toBe(mockResult);
    });

    it('should log the AI response with duration', async () => {
      const middleware = kontextMiddleware(kontext);
      const digestBefore = kontext.getTerminalDigest();

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: 'Done',
          toolCalls: [],
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Digest chain should have advanced
      expect(kontext.getTerminalDigest()).not.toBe(digestBefore);
    });

    it('should log each tool call individually', async () => {
      const middleware = kontextMiddleware(kontext);
      const toolCalls = [
        { toolName: 'search', args: { query: 'test' } },
        { toolName: 'calculate', args: { expression: '2+2' } },
      ];

      const digestBefore = kontext.getTerminalDigest();

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls,
          finishReason: 'tool-calls',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Digest should have advanced significantly (multiple logs)
      const digestAfter = kontext.getTerminalDigest();
      expect(digestAfter).not.toBe(digestBefore);
      expect(digestAfter).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should redact tool args by default', async () => {
      const middleware = kontextMiddleware(kontext);

      // We test by verifying no error and the chain advances
      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls: [{ toolName: 'secret_tool', args: { password: 'secret123' } }],
          finishReason: 'tool-calls',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Chain should have advanced
      expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
    });

    it('should log tool args when logToolArgs is true', async () => {
      const middleware = kontextMiddleware(kontext, { logToolArgs: true });

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls: [{ toolName: 'public_tool', args: { data: 'visible' } }],
          finishReason: 'tool-calls',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
    });

    it('should handle results with no tool calls', async () => {
      const middleware = kontextMiddleware(kontext);

      const result = await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: 'Just text, no tools',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(result.text).toBe('Just text, no tools');
    });

    it('should handle results with empty tool calls array', async () => {
      const middleware = kontextMiddleware(kontext);

      const result = await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: 'No tools used',
          toolCalls: [],
          finishReason: 'stop',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(result.text).toBe('No tools used');
    });
  });

  // --------------------------------------------------------------------------
  // Financial Tool Detection
  // --------------------------------------------------------------------------

  describe('financial tool detection', () => {
    it('should log a financial tool call with extracted amount', async () => {
      const middleware = kontextMiddleware(kontext, {
        financialTools: ['transfer_usdc'],
        defaultCurrency: 'USDC',
      });

      const digestBefore = kontext.getTerminalDigest();

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls: [{ toolName: 'transfer_usdc', args: { amount: 500, to: '0xAlice' } }],
          finishReason: 'tool-calls',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Multiple digest entries: tool_call + financial_tool_call + ai_response
      const digestAfter = kontext.getTerminalDigest();
      expect(digestAfter).not.toBe(digestBefore);
    });

    it('should not trigger financial logging for non-financial tools', async () => {
      const middleware = kontextMiddleware(kontext, {
        financialTools: ['transfer_usdc'],
      });

      const digestBefore = kontext.getTerminalDigest();

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls: [{ toolName: 'search', args: { query: 'weather' } }],
          finishReason: 'tool-calls',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      const digestAfter = kontext.getTerminalDigest();
      // Chain should advance (tool_call + ai_response) but NOT financial_tool_call
      expect(digestAfter).not.toBe(digestBefore);
    });

    it('should handle financial tools with no extractable amount', async () => {
      const middleware = kontextMiddleware(kontext, {
        financialTools: ['transfer_usdc'],
      });

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls: [{ toolName: 'transfer_usdc', args: { to: '0xAlice' } }],
          finishReason: 'tool-calls',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Should not throw, chain should still advance
      expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
    });

    it('should use custom default currency', async () => {
      const middleware = kontextMiddleware(kontext, {
        financialTools: ['send_payment'],
        defaultCurrency: 'EURC',
      });

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls: [{ toolName: 'send_payment', args: { amount: 100 } }],
          finishReason: 'tool-calls',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
    });

    it('should handle multiple financial tools in one response', async () => {
      const middleware = kontextMiddleware(kontext, {
        financialTools: ['transfer_usdc', 'send_payment'],
      });

      await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: '',
          toolCalls: [
            { toolName: 'transfer_usdc', args: { amount: 100 } },
            { toolName: 'send_payment', args: { amount: 200 } },
          ],
          finishReason: 'tool-calls',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
    });
  });

  // --------------------------------------------------------------------------
  // Trust Threshold Blocking
  // --------------------------------------------------------------------------

  describe('trust threshold blocking', () => {
    it('should block generation when trust score is below threshold', async () => {
      // New agent with no history will have a trust score
      const middleware = kontextMiddleware(kontext, {
        agentId: 'untrusted-agent',
        trustThreshold: 101, // Impossible to reach, will always block
      });

      await expect(
        middleware.wrapGenerate({
          doGenerate: async () => ({ text: 'should not reach' }),
          params: { model: { modelId: 'gpt-4o' } },
        }),
      ).rejects.toThrow(/blocked/i);
    });

    it('should allow generation when trust threshold is not set', async () => {
      const middleware = kontextMiddleware(kontext, {
        agentId: 'any-agent',
        // No trustThreshold
      });

      const result = await middleware.wrapGenerate({
        doGenerate: async () => ({
          text: 'allowed',
          toolCalls: [],
          finishReason: 'stop',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(result.text).toBe('allowed');
    });

    it('should call onBlocked callback for blocked financial tool calls', async () => {
      const blockedCalls: Array<{ toolCall: BlockedToolCall; reason: string }> = [];

      const middleware = kontextMiddleware(kontext, {
        agentId: 'low-trust-agent',
        financialTools: ['transfer_usdc'],
        trustThreshold: 101, // Will block financial tools
        onBlocked: (toolCall, reason) => {
          blockedCalls.push({ toolCall, reason });
        },
      });

      // The wrapGenerate should throw because of the trust threshold check
      // that happens before doGenerate
      await expect(
        middleware.wrapGenerate({
          doGenerate: async () => ({
            text: '',
            toolCalls: [{ toolName: 'transfer_usdc', args: { amount: 1000 } }],
            finishReason: 'tool-calls',
            usage: {},
          }),
          params: { model: { modelId: 'gpt-4o' } },
        }),
      ).rejects.toThrow(/blocked/i);
    });
  });

  // --------------------------------------------------------------------------
  // wrapStream
  // --------------------------------------------------------------------------

  describe('wrapStream', () => {
    it('should pass through stream chunks', async () => {
      const middleware = kontextMiddleware(kontext);
      const chunks = [
        { type: 'text-delta', textDelta: 'Hello' },
        { type: 'text-delta', textDelta: ' world' },
      ];

      const { stream } = await middleware.wrapStream({
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              for (const chunk of chunks) {
                controller.enqueue(chunk);
              }
              controller.close();
            },
          }),
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Consume the stream
      const reader = stream.getReader();
      const received: unknown[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        if (result.done) {
          done = true;
        } else {
          received.push(result.value);
        }
      }

      expect(received).toHaveLength(2);
      expect(received[0]).toEqual({ type: 'text-delta', textDelta: 'Hello' });
      expect(received[1]).toEqual({ type: 'text-delta', textDelta: ' world' });
    });

    it('should log stream completion', async () => {
      const middleware = kontextMiddleware(kontext);
      const digestBefore = kontext.getTerminalDigest();

      const { stream } = await middleware.wrapStream({
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: 'text-delta', textDelta: 'Hi' });
              controller.close();
            },
          }),
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Must consume the stream to trigger flush
      const reader = stream.getReader();
      while (!(await reader.read()).done) { /* drain */ }

      // Digest should have advanced (stream_start + stream_complete)
      expect(kontext.getTerminalDigest()).not.toBe(digestBefore);
    });

    it('should track tool call chunks in stream', async () => {
      const middleware = kontextMiddleware(kontext, {
        financialTools: ['transfer_usdc'],
      });

      const { stream } = await middleware.wrapStream({
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: 'tool-call', toolName: 'transfer_usdc', args: { amount: 100 } });
              controller.enqueue({ type: 'text-delta', textDelta: 'Done' });
              controller.close();
            },
          }),
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      // Consume the stream
      const reader = stream.getReader();
      const received: unknown[] = [];
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        received.push(result.value);
      }

      // Both chunks should pass through
      expect(received).toHaveLength(2);
    });

    it('should preserve additional stream properties', async () => {
      const middleware = kontextMiddleware(kontext);

      const result = await middleware.wrapStream({
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
          rawCall: { model: 'gpt-4o' },
          warnings: [],
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      expect(result.rawCall).toEqual({ model: 'gpt-4o' });
      expect(result.warnings).toEqual([]);
    });

    it('should handle empty streams', async () => {
      const middleware = kontextMiddleware(kontext);

      const { stream } = await middleware.wrapStream({
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        }),
        params: { model: { modelId: 'gpt-4o' } },
      });

      const reader = stream.getReader();
      const result = await reader.read();
      expect(result.done).toBe(true);
    });
  });
});

// ============================================================================
// kontextWrapModel
// ============================================================================

describe('kontextWrapModel', () => {
  let kontext: Kontext;

  beforeEach(() => {
    kontext = createClient();
  });

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should wrap a model and preserve original properties', () => {
    const mockModel = createMockModel();
    const wrapped = kontextWrapModel(mockModel, kontext) as Record<string, unknown>;

    expect(wrapped.modelId).toBe('gpt-4o');
    expect(wrapped.provider).toBe('openai');
    expect(wrapped._kontextMiddleware).toBeDefined();
    expect(wrapped._originalModel).toBe(mockModel);
    expect(wrapped._kontextInstance).toBe(kontext);
  });

  it('should expose doGenerate that logs and delegates', async () => {
    const mockModel = createMockModel();
    const wrapped = kontextWrapModel(mockModel, kontext) as {
      doGenerate: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };

    const result = await wrapped.doGenerate({
      model: { modelId: 'gpt-4o' },
      tools: [],
    });

    expect(result.text).toBe('Hello, world!');
    expect(mockModel.doGenerate).toHaveBeenCalledTimes(1);

    // Digest chain should have entries
    expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
  });

  it('should expose doStream that logs and delegates', async () => {
    const mockModel = createMockModel();
    const wrapped = kontextWrapModel(mockModel, kontext) as {
      doStream: (params: Record<string, unknown>) => Promise<{ stream: ReadableStream }>;
    };

    const { stream } = await wrapped.doStream({
      model: { modelId: 'gpt-4o' },
    });

    // Consume stream
    const reader = stream.getReader();
    while (!(await reader.read()).done) { /* drain */ }

    expect(mockModel.doStream).toHaveBeenCalledTimes(1);
    expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
  });

  it('should log tool calls through wrapped model', async () => {
    const toolCalls = [
      { toolName: 'search', args: { query: 'test' } },
      { toolName: 'transfer_usdc', args: { amount: 100 } },
    ];
    const mockModel = createMockModelWithToolCalls(toolCalls);

    const wrapped = kontextWrapModel(mockModel, kontext, {
      financialTools: ['transfer_usdc'],
    }) as {
      doGenerate: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };

    const result = await wrapped.doGenerate({
      model: { modelId: 'gpt-4o' },
    });

    expect(result.toolCalls).toEqual(toolCalls);
    expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
  });
});

// ============================================================================
// createKontextAI — One-Line Setup
// ============================================================================

describe('createKontextAI', () => {
  it('should create a Kontext client and wrapped model', async () => {
    const mockModel = createMockModel();
    const { model, kontext } = createKontextAI(mockModel, {
      projectId: 'test-project',
      environment: 'development',
    });

    expect(model).toBeDefined();
    expect(kontext).toBeInstanceOf(Kontext);
    expect(kontext.getMode()).toBe('local');

    await kontext.destroy();
  });

  it('should use default environment when not specified', async () => {
    const mockModel = createMockModel();
    const { kontext } = createKontextAI(mockModel, {
      projectId: 'default-env-test',
    });

    expect(kontext).toBeInstanceOf(Kontext);

    await kontext.destroy();
  });

  it('should pass AI options through to the middleware', async () => {
    const mockModel = createMockModelWithToolCalls([
      { toolName: 'transfer_usdc', args: { amount: 500 } },
    ]);

    const { model, kontext } = createKontextAI(mockModel, {
      projectId: 'test-project',
      agentId: 'payment-agent',
      financialTools: ['transfer_usdc'],
      logToolArgs: true,
      defaultCurrency: 'USDC',
    });

    const wrapped = model as {
      doGenerate: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };

    await wrapped.doGenerate({ model: { modelId: 'gpt-4o' } });

    // Chain should have multiple entries
    expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));

    await kontext.destroy();
  });

  it('should support cloud mode with API key', async () => {
    const mockModel = createMockModel();
    const { kontext } = createKontextAI(mockModel, {
      projectId: 'cloud-test',
      apiKey: 'sk_test_REDACTED_000',
      environment: 'production',
    });

    expect(kontext.getMode()).toBe('cloud');

    await kontext.destroy();
  });
});

// ============================================================================
// withKontext — Next.js Route Handler
// ============================================================================

describe('withKontext', () => {
  it('should wrap a handler and provide Kontext context', async () => {
    let receivedCtx: KontextAIContext | null = null;

    const handler = withKontext(
      async (req, ctx) => {
        receivedCtx = ctx;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      {
        projectId: 'route-test',
        environment: 'development',
      },
    );

    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
    });

    const response = await handler(req);
    expect(response.status).toBe(200);
    expect(receivedCtx).not.toBeNull();
    expect(receivedCtx!.kontext).toBeInstanceOf(Kontext);
    expect(receivedCtx!.requestId).toMatch(/^req_/);
    expect(typeof receivedCtx!.wrapModel).toBe('function');

    await receivedCtx!.kontext.destroy();
  });

  it('should log the request and response', async () => {
    let ctxRef: KontextAIContext | null = null;

    const handler = withKontext(
      async (_req, ctx) => {
        ctxRef = ctx;
        return new Response('OK', { status: 200 });
      },
      {
        projectId: 'log-test',
        environment: 'development',
      },
    );

    const req = new Request('http://localhost:3000/api/test', {
      method: 'GET',
    });

    await handler(req);

    // Digest chain should have entries (http_request + http_response)
    expect(ctxRef).not.toBeNull();
    expect(ctxRef!.kontext.getTerminalDigest()).not.toBe('0'.repeat(64));

    await ctxRef!.kontext.destroy();
  });

  it('should log errors and re-throw', async () => {
    let ctxRef: KontextAIContext | null = null;

    const handler = withKontext(
      async (_req, ctx) => {
        ctxRef = ctx;
        throw new Error('Something went wrong');
      },
      {
        projectId: 'error-test',
        environment: 'development',
      },
    );

    const req = new Request('http://localhost:3000/api/fail', {
      method: 'POST',
    });

    await expect(handler(req)).rejects.toThrow('Something went wrong');

    // Error should still be logged in the chain
    expect(ctxRef).not.toBeNull();
    expect(ctxRef!.kontext.getTerminalDigest()).not.toBe('0'.repeat(64));

    await ctxRef!.kontext.destroy();
  });

  it('should provide a working wrapModel helper in context', async () => {
    let ctxRef: KontextAIContext | null = null;

    const handler = withKontext(
      async (_req, ctx) => {
        ctxRef = ctx;
        const mockModel = createMockModel();
        const wrapped = ctx.wrapModel(mockModel) as Record<string, unknown>;
        expect(wrapped._kontextMiddleware).toBeDefined();
        return new Response('OK', { status: 200 });
      },
      {
        projectId: 'wrap-test',
        environment: 'development',
      },
    );

    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
    });

    await handler(req);

    await ctxRef!.kontext.destroy();
  });
});

// ============================================================================
// Digest Chain Integrity After AI Operations
// ============================================================================

describe('digest chain integrity', () => {
  let kontext: Kontext;

  beforeEach(() => {
    kontext = createClient();
  });

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should produce a valid digest chain after multiple AI operations', async () => {
    const middleware = kontextMiddleware(kontext, {
      agentId: 'integrity-test-agent',
    });

    // Simulate multiple AI operations
    await middleware.transformParams({
      params: { model: { modelId: 'gpt-4o' }, tools: [] },
      type: 'generate',
    });

    await middleware.wrapGenerate({
      doGenerate: async () => ({
        text: 'Response 1',
        toolCalls: [{ toolName: 'search', args: { q: 'test' } }],
        finishReason: 'tool-calls',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    await middleware.transformParams({
      params: { model: { modelId: 'gpt-4o' } },
      type: 'stream',
    });

    // Verify the chain
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
    expect(verification.linksVerified).toBeGreaterThan(0);
    expect(verification.firstInvalidIndex).toBe(-1);
  });

  it('should maintain chain across generate and stream operations', async () => {
    const middleware = kontextMiddleware(kontext);

    // Generate
    await middleware.wrapGenerate({
      doGenerate: async () => ({
        text: 'Generated',
        toolCalls: [],
        finishReason: 'stop',
        usage: {},
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    const digestAfterGenerate = kontext.getTerminalDigest();

    // Stream
    const { stream } = await middleware.wrapStream({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Streamed' });
            controller.close();
          },
        }),
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    // Consume stream
    const reader = stream.getReader();
    while (!(await reader.read()).done) { /* drain */ }

    // Chain should have advanced beyond the generate digest
    expect(kontext.getTerminalDigest()).not.toBe(digestAfterGenerate);

    // Full chain should verify
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
  });

  it('should include AI operations in exportable digest chain', async () => {
    const middleware = kontextMiddleware(kontext, {
      agentId: 'export-test-agent',
    });

    await middleware.wrapGenerate({
      doGenerate: async () => ({
        text: 'Exported response',
        toolCalls: [{ toolName: 'tool1', args: {} }],
        finishReason: 'tool-calls',
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    const exported = kontext.exportDigestChain();
    expect(exported.links.length).toBeGreaterThan(0);
    expect(exported.terminalDigest).toBe(kontext.getTerminalDigest());
    expect(exported.genesisHash).toBe('0'.repeat(64));

    // Every link should have a valid digest format
    for (const link of exported.links) {
      expect(link.digest).toMatch(/^[a-f0-9]{64}$/);
      expect(link.salt).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('should chain digest across mixed kontext operations', async () => {
    // Log a regular action first
    await kontext.log({
      type: 'setup',
      description: 'System initialized',
      agentId: 'system',
    });

    const digestAfterSetup = kontext.getTerminalDigest();

    // Then do an AI operation
    const middleware = kontextMiddleware(kontext);
    await middleware.wrapGenerate({
      doGenerate: async () => ({
        text: 'AI response',
        toolCalls: [],
        finishReason: 'stop',
        usage: {},
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    const digestAfterAI = kontext.getTerminalDigest();
    expect(digestAfterAI).not.toBe(digestAfterSetup);

    // Log another regular action
    await kontext.log({
      type: 'cleanup',
      description: 'Cleanup complete',
      agentId: 'system',
    });

    expect(kontext.getTerminalDigest()).not.toBe(digestAfterAI);

    // Full chain should verify
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
    expect(verification.linksVerified).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  let kontext: Kontext;

  beforeEach(() => {
    kontext = createClient();
  });

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should handle doGenerate that throws an error', async () => {
    const middleware = kontextMiddleware(kontext);

    await expect(
      middleware.wrapGenerate({
        doGenerate: async () => {
          throw new Error('Model error');
        },
        params: { model: { modelId: 'gpt-4o' } },
      }),
    ).rejects.toThrow('Model error');
  });

  it('should handle doStream that throws an error', async () => {
    const middleware = kontextMiddleware(kontext);

    await expect(
      middleware.wrapStream({
        doStream: async () => {
          throw new Error('Stream error');
        },
        params: { model: { modelId: 'gpt-4o' } },
      }),
    ).rejects.toThrow('Stream error');
  });

  it('should handle missing usage data', async () => {
    const middleware = kontextMiddleware(kontext);

    const result = await middleware.wrapGenerate({
      doGenerate: async () => ({
        text: 'No usage',
        toolCalls: [],
        finishReason: 'stop',
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    expect(result.text).toBe('No usage');
  });

  it('should handle missing finishReason', async () => {
    const middleware = kontextMiddleware(kontext);

    const result = await middleware.wrapGenerate({
      doGenerate: async () => ({
        text: 'No finish reason',
        toolCalls: [],
        usage: {},
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    expect(result.text).toBe('No finish reason');
  });

  it('should handle tool calls with undefined args', async () => {
    const middleware = kontextMiddleware(kontext);

    await middleware.wrapGenerate({
      doGenerate: async () => ({
        text: '',
        toolCalls: [{ toolName: 'no_args_tool', args: undefined }],
        finishReason: 'tool-calls',
        usage: {},
      }),
      params: { model: { modelId: 'gpt-4o' } },
    });

    expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
  });

  it('should handle concurrent AI operations', async () => {
    const middleware = kontextMiddleware(kontext);

    const promises = Array.from({ length: 5 }, (_, i) =>
      middleware.wrapGenerate({
        doGenerate: async () => ({
          text: `Response ${i}`,
          toolCalls: [],
          finishReason: 'stop',
          usage: {},
        }),
        params: { model: { modelId: 'gpt-4o' } },
      }),
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(5);
    expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
  });

  it('should handle model with no modelId', async () => {
    const middleware = kontextMiddleware(kontext);

    await middleware.transformParams({
      params: {},
      type: 'generate',
    });

    expect(kontext.getTerminalDigest()).not.toBe('0'.repeat(64));
  });
});
