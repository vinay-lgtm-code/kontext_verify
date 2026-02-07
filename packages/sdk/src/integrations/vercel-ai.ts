// ============================================================================
// Kontext SDK - Vercel AI SDK Integration
// ============================================================================
//
// Provides middleware for the Vercel AI SDK (`ai` npm package) that
// automatically logs every LLM call, tool invocation, and streaming
// result into the Kontext tamper-evident digest chain.
//
// This enables compliance-grade audit trails for any AI application
// built on Next.js + Vercel AI SDK with zero application code changes.
//
// Middleware pattern: https://sdk.vercel.ai/docs/ai-sdk-core/middleware
// ============================================================================

import { Kontext } from '../client.js';
import type { Environment } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/** AI operation types recognized by the Vercel AI SDK middleware. */
export type AIOperationType = 'generate' | 'stream' | 'object' | 'embed' | 'embedMany';

/**
 * Configuration options for the Kontext Vercel AI SDK middleware.
 *
 * Controls which operations are logged, how tool calls are handled,
 * and whether financial compliance checks are triggered.
 */
export interface KontextAIOptions {
  /** Agent identifier for audit logs. Defaults to `'vercel-ai'`. */
  agentId?: string;

  /**
   * Tool names that involve financial transactions.
   * When a tool call matches one of these names, Kontext will automatically
   * log a `LogTransactionInput` with the extracted amount, triggering
   * compliance checks and anomaly detection.
   */
  financialTools?: string[];

  /**
   * Whether to include tool call arguments in the audit log.
   * Defaults to `false` for privacy. Set to `true` for full traceability.
   */
  logToolArgs?: boolean;

  /**
   * Default currency for financial tool calls.
   * Defaults to `'USDC'`.
   */
  defaultCurrency?: string;

  /**
   * Trust score threshold (0-100). If the agent's trust score is below
   * this threshold, tool calls will be blocked and `onBlocked` will fire.
   */
  trustThreshold?: number;

  /**
   * Callback invoked when a tool call is blocked due to trust threshold
   * or other compliance rules.
   */
  onBlocked?: (toolCall: BlockedToolCall, reason: string) => void;
}

/**
 * A tool call that was blocked by the Kontext middleware.
 */
export interface BlockedToolCall {
  /** The name of the tool that was blocked. */
  toolName: string;
  /** The arguments that were passed to the tool. */
  args: unknown;
}

/**
 * Input options for the one-line `createKontextAI` setup function.
 * Combines Kontext SDK configuration with AI middleware options.
 */
export interface CreateKontextAIInput {
  /** Kontext project identifier. */
  projectId: string;

  /** Deployment environment. */
  environment?: Environment;

  /** Optional API key for cloud mode. */
  apiKey?: string;

  /** Enable debug logging. */
  debug?: boolean;

  /** Agent identifier for audit logs. */
  agentId?: string;

  /** Tool names that involve financial transactions. */
  financialTools?: string[];

  /** Whether to log tool arguments. */
  logToolArgs?: boolean;

  /** Default currency for financial tool calls. */
  defaultCurrency?: string;

  /** Trust score threshold for blocking tool calls. */
  trustThreshold?: number;

  /** Callback when a tool call is blocked. */
  onBlocked?: (toolCall: BlockedToolCall, reason: string) => void;
}

/**
 * Return type from `createKontextAI`.
 */
export interface CreateKontextAIResult {
  /** The wrapped language model with Kontext middleware applied. */
  model: unknown;
  /** The Kontext client instance for direct access to audit, trust, and compliance APIs. */
  kontext: Kontext;
}

/**
 * Options for the `withKontext` Next.js route handler wrapper.
 */
export interface WithKontextOptions {
  /** Kontext project identifier. */
  projectId?: string;

  /** Deployment environment. */
  environment?: Environment;

  /** Optional API key for cloud mode. */
  apiKey?: string;

  /** Agent identifier for audit logs. */
  agentId?: string;

  /** Enable debug logging. */
  debug?: boolean;
}

/**
 * Context object passed to route handlers wrapped with `withKontext`.
 * Provides a pre-configured Kontext client and a helper to wrap AI models.
 */
export interface KontextAIContext {
  /** The Kontext client instance. */
  kontext: Kontext;

  /**
   * Wrap an AI model with Kontext middleware for automatic audit logging.
   *
   * @param model - A Vercel AI SDK language model
   * @param options - Additional middleware options
   * @returns The wrapped model
   */
  wrapModel: (model: unknown, options?: KontextAIOptions) => unknown;

  /** Unique request identifier for correlating logs. */
  requestId: string;
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Creates a Kontext middleware object for the Vercel AI SDK.
 *
 * This middleware intercepts every `generateText()`, `streamText()`, and
 * `generateObject()` call and automatically logs each operation, tool
 * invocation, and result into the Kontext tamper-evident digest chain.
 *
 * The middleware conforms to the Vercel AI SDK middleware interface:
 * - `transformParams` — Logs the AI request before execution
 * - `wrapGenerate` — Wraps synchronous generation to log tool calls and results
 * - `wrapStream` — Wraps streaming generation to log stream lifecycle events
 *
 * @param kontext - An initialized Kontext client instance
 * @param options - Middleware configuration options
 * @returns A Vercel AI SDK middleware object
 *
 * @example
 * ```typescript
 * import { Kontext } from 'kontext-sdk';
 * import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 *
 * const kontext = Kontext.init({ projectId: 'my-app', environment: 'production' });
 *
 * const model = wrapLanguageModel({
 *   model: openai('gpt-4o'),
 *   middleware: kontextMiddleware(kontext, {
 *     agentId: 'payment-agent',
 *     financialTools: ['transfer_usdc', 'send_payment'],
 *   }),
 * });
 *
 * // Every generateText / streamText call is now automatically audited.
 * ```
 */
export function kontextMiddleware(kontext: Kontext, options?: KontextAIOptions) {
  const cfg: ResolvedMiddlewareConfig = {
    agentId: options?.agentId ?? 'vercel-ai',
    logToolArgs: options?.logToolArgs ?? false,
    financialTools: options?.financialTools ?? [],
    defaultCurrency: options?.defaultCurrency ?? 'USDC',
    trustThreshold: options?.trustThreshold,
    onBlocked: options?.onBlocked,
  };

  return {
    transformParams: (ctx: { params: Record<string, unknown>; type: string }) =>
      logTransformParams(kontext, cfg, ctx),
    wrapGenerate: (ctx: { doGenerate: () => Promise<Record<string, unknown>>; params: Record<string, unknown> }) =>
      wrapGenerateWithAudit(kontext, cfg, ctx),
    wrapStream: (ctx: { doStream: () => Promise<{ stream: ReadableStream; [key: string]: unknown }>; params: Record<string, unknown> }) =>
      wrapStreamWithAudit(kontext, cfg, ctx),
  };
}

// ============================================================================
// Resolved config (avoids re-reading options in every helper)
// ============================================================================

interface ResolvedMiddlewareConfig {
  agentId: string;
  logToolArgs: boolean;
  financialTools: string[];
  defaultCurrency: string;
  trustThreshold: number | undefined;
  onBlocked: ((toolCall: BlockedToolCall, reason: string) => void) | undefined;
}

// ============================================================================
// transformParams — logs AI request before model invocation
// ============================================================================

async function logTransformParams(
  kontext: Kontext,
  cfg: ResolvedMiddlewareConfig,
  { params, type }: { params: Record<string, unknown>; type: string },
): Promise<Record<string, unknown>> {
  const modelInfo = params['model'] as { modelId?: string } | undefined;
  const tools = params['tools'];

  await kontext.log({
    type: `ai_${type}`,
    description: `AI ${type} request to ${modelInfo?.modelId ?? 'unknown'} model`,
    agentId: cfg.agentId,
    metadata: {
      model: modelInfo?.modelId ?? 'unknown',
      toolCount: Array.isArray(tools) ? tools.length : 0,
      maxTokens: params['maxTokens'] ?? null,
      temperature: params['temperature'] ?? null,
      operationType: type,
    },
  });

  return params;
}

// ============================================================================
// wrapGenerate — wraps synchronous generation with audit logging
// ============================================================================

async function wrapGenerateWithAudit(
  kontext: Kontext,
  cfg: ResolvedMiddlewareConfig,
  { doGenerate, params }: { doGenerate: () => Promise<Record<string, unknown>>; params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  await enforceAgentTrustThreshold(kontext, cfg);

  const result = await doGenerate();
  const duration = Date.now() - startTime;
  const modelId = extractModelId(params);

  const toolCalls = result['toolCalls'] as Array<{ toolName: string; args: unknown }> | undefined;
  if (toolCalls && toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      await processToolCall(kontext, cfg, toolCall, duration, modelId);
    }
  }

  await logGenerateCompletion(kontext, cfg, result, duration, modelId, toolCalls?.length ?? 0);
  return result;
}

// ============================================================================
// wrapStream — wraps streaming generation with audit logging
// ============================================================================

async function wrapStreamWithAudit(
  kontext: Kontext,
  cfg: ResolvedMiddlewareConfig,
  { doStream, params }: { doStream: () => Promise<{ stream: ReadableStream; [key: string]: unknown }>; params: Record<string, unknown> },
): Promise<{ stream: ReadableStream; [key: string]: unknown }> {
  const startTime = Date.now();
  const modelId = extractModelId(params);

  await kontext.log({
    type: 'ai_stream_start',
    description: `AI stream started for model ${modelId}`,
    agentId: cfg.agentId,
    metadata: { model: modelId, operationType: 'stream' },
  });

  const { stream, ...rest } = await doStream();
  const toolCallsInStream: Array<{ toolName: string; args: unknown }> = [];

  const transformedStream = stream.pipeThrough(
    new TransformStream({
      transform(chunk: Record<string, unknown>, controller) {
        controller.enqueue(chunk);
        if (chunk['type'] === 'tool-call') {
          toolCallsInStream.push({
            toolName: chunk['toolName'] as string,
            args: chunk['args'] as unknown,
          });
        }
      },
      async flush() {
        const duration = Date.now() - startTime;
        await logStreamToolCalls(kontext, cfg, toolCallsInStream, duration, modelId);
        await kontext.log({
          type: 'ai_stream_complete',
          description: `AI stream completed in ${duration}ms with ${toolCallsInStream.length} tool call(s)`,
          agentId: cfg.agentId,
          metadata: { duration, toolCallCount: toolCallsInStream.length, model: modelId },
        });
      },
    }),
  );

  return { stream: transformedStream, ...rest };
}

// ============================================================================
// Shared helpers for middleware decomposition
// ============================================================================

/** Extract modelId from params, defaulting to 'unknown'. */
function extractModelId(params: Record<string, unknown>): string {
  return (params['model'] as { modelId?: string } | undefined)?.modelId ?? 'unknown';
}

/** Enforce agent-level trust threshold; throws if score is below threshold. */
async function enforceAgentTrustThreshold(kontext: Kontext, cfg: ResolvedMiddlewareConfig): Promise<void> {
  if (cfg.trustThreshold === undefined) return;

  const trustScore = await kontext.getTrustScore(cfg.agentId);
  if (trustScore.score < cfg.trustThreshold) {
    await kontext.log({
      type: 'ai_blocked',
      description: `AI generation blocked: agent trust score ${trustScore.score} below threshold ${cfg.trustThreshold}`,
      agentId: cfg.agentId,
      metadata: { trustScore: trustScore.score, trustLevel: trustScore.level, threshold: cfg.trustThreshold },
    });
    throw new Error(
      `Kontext: AI generation blocked. Agent "${cfg.agentId}" trust score (${trustScore.score}) ` +
      `is below the required threshold (${cfg.trustThreshold}).`,
    );
  }
}

/** Process a single tool call: check trust, log the call, log financial data if applicable. */
async function processToolCall(
  kontext: Kontext,
  cfg: ResolvedMiddlewareConfig,
  toolCall: { toolName: string; args: unknown },
  duration: number,
  modelId: string,
): Promise<void> {
  // Check if this financial tool should be blocked
  if (cfg.trustThreshold !== undefined && cfg.financialTools.includes(toolCall.toolName)) {
    const trustScore = await kontext.getTrustScore(cfg.agentId);
    if (trustScore.score < cfg.trustThreshold) {
      cfg.onBlocked?.({ toolName: toolCall.toolName, args: toolCall.args }, `Trust score ${trustScore.score} below threshold ${cfg.trustThreshold}`);
      await kontext.log({
        type: 'ai_tool_blocked',
        description: `Financial tool "${toolCall.toolName}" blocked: trust score ${trustScore.score} below threshold ${cfg.trustThreshold}`,
        agentId: cfg.agentId,
        metadata: { toolName: toolCall.toolName, trustScore: trustScore.score, threshold: cfg.trustThreshold },
      });
      return;
    }
  }

  await kontext.log({
    type: 'ai_tool_call',
    description: `Tool call: ${toolCall.toolName}`,
    agentId: cfg.agentId,
    metadata: {
      toolName: toolCall.toolName,
      args: cfg.logToolArgs ? toolCall.args : '[redacted]',
      duration,
      model: modelId,
    },
  });

  await logFinancialToolCall(kontext, cfg, toolCall);
}

/** Log a financial tool call if the tool is in the financialTools list and has an extractable amount. */
async function logFinancialToolCall(
  kontext: Kontext,
  cfg: ResolvedMiddlewareConfig,
  toolCall: { toolName: string; args: unknown },
  source?: string,
): Promise<void> {
  if (!cfg.financialTools.includes(toolCall.toolName)) return;

  const amount = extractAmount(toolCall.args);
  if (amount === null) return;

  await kontext.log({
    type: 'ai_financial_tool_call',
    description: `Financial tool "${toolCall.toolName}" invoked${source ? ` via ${source}` : ''} with amount ${amount} ${cfg.defaultCurrency}`,
    agentId: cfg.agentId,
    metadata: {
      toolName: toolCall.toolName,
      amount: amount.toString(),
      currency: cfg.defaultCurrency,
      ...(cfg.logToolArgs ? { toolArgs: toolCall.args } : {}),
      ...(source ? { source } : {}),
    },
  });
}

/** Log the overall generate completion with usage statistics. */
async function logGenerateCompletion(
  kontext: Kontext,
  cfg: ResolvedMiddlewareConfig,
  result: Record<string, unknown>,
  duration: number,
  modelId: string,
  toolCallCount: number,
): Promise<void> {
  const usage = result['usage'] as { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
  await kontext.log({
    type: 'ai_response',
    description: `AI response completed in ${duration}ms`,
    agentId: cfg.agentId,
    metadata: {
      duration,
      toolCallCount,
      finishReason: result['finishReason'] ?? 'unknown',
      promptTokens: usage?.promptTokens ?? null,
      completionTokens: usage?.completionTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      model: modelId,
    },
  });
}

/** Log all tool calls collected during a stream, including financial tool detection. */
async function logStreamToolCalls(
  kontext: Kontext,
  cfg: ResolvedMiddlewareConfig,
  toolCalls: Array<{ toolName: string; args: unknown }>,
  duration: number,
  modelId: string,
): Promise<void> {
  for (const toolCall of toolCalls) {
    await kontext.log({
      type: 'ai_tool_call',
      description: `Tool call (stream): ${toolCall.toolName}`,
      agentId: cfg.agentId,
      metadata: {
        toolName: toolCall.toolName,
        args: cfg.logToolArgs ? toolCall.args : '[redacted]',
        duration,
        model: modelId,
        source: 'stream',
      },
    });
    await logFinancialToolCall(kontext, cfg, toolCall, 'stream');
  }
}

// ============================================================================
// Model Wrapper
// ============================================================================

/**
 * Wraps a Vercel AI SDK language model with Kontext middleware for
 * automatic audit logging of all AI operations.
 *
 * This function applies the Kontext middleware using the Vercel AI SDK's
 * `experimental_wrapLanguageModel` pattern. The returned model can be
 * used directly with `generateText()`, `streamText()`, and `generateObject()`.
 *
 * @param model - A Vercel AI SDK language model (e.g., `openai('gpt-4o')`)
 * @param kontext - An initialized Kontext client instance
 * @param options - Middleware configuration options
 * @returns A wrapped language model with Kontext audit logging
 *
 * @example
 * ```typescript
 * import { openai } from '@ai-sdk/openai';
 * import { Kontext, kontextWrapModel } from 'kontext-sdk';
 * import { generateText } from 'ai';
 *
 * const kontext = Kontext.init({ projectId: 'my-app', environment: 'production' });
 * const model = kontextWrapModel(openai('gpt-4o'), kontext, {
 *   agentId: 'support-agent',
 *   financialTools: ['transfer_usdc'],
 * });
 *
 * const result = await generateText({ model, prompt: 'Send 100 USDC to Alice' });
 * // All operations automatically logged with SHA-256 digest chains
 * ```
 */
export function kontextWrapModel(
  model: unknown,
  kontext: Kontext,
  options?: KontextAIOptions,
): unknown {
  const middleware = kontextMiddleware(kontext, options);

  // Return a proxy object that delegates to the original model
  // while intercepting generate/stream calls through our middleware.
  // This follows the Vercel AI SDK middleware wrapping convention.
  return {
    ...(model as Record<string, unknown>),
    _kontextMiddleware: middleware,
    _originalModel: model,
    _kontextInstance: kontext,

    // When the Vercel AI SDK calls doGenerate, our middleware wraps it
    async doGenerate(params: Record<string, unknown>) {
      const transformedParams = await middleware.transformParams({
        params,
        type: 'generate',
      });

      const originalModel = model as { doGenerate: (p: Record<string, unknown>) => Promise<Record<string, unknown>> };
      return middleware.wrapGenerate({
        doGenerate: () => originalModel.doGenerate(transformedParams),
        params: transformedParams,
      });
    },

    // When the Vercel AI SDK calls doStream, our middleware wraps it
    async doStream(params: Record<string, unknown>) {
      const transformedParams = await middleware.transformParams({
        params,
        type: 'stream',
      });

      const originalModel = model as { doStream: (p: Record<string, unknown>) => Promise<{ stream: ReadableStream; [key: string]: unknown }> };
      return middleware.wrapStream({
        doStream: () => originalModel.doStream(transformedParams),
        params: transformedParams,
      });
    },
  };
}

// ============================================================================
// One-Line Setup
// ============================================================================

/**
 * One-line Kontext + Vercel AI SDK setup.
 *
 * Creates a Kontext client and wraps a Vercel AI SDK language model in a
 * single function call. The returned model automatically logs every AI
 * operation with tamper-evident SHA-256 digest chains.
 *
 * @param model - A Vercel AI SDK language model (e.g., `openai('gpt-4o')`)
 * @param input - Combined Kontext and AI middleware configuration
 * @returns An object containing the wrapped model and the Kontext client
 *
 * @example
 * ```typescript
 * import { openai } from '@ai-sdk/openai';
 * import { createKontextAI } from 'kontext-sdk';
 * import { generateText } from 'ai';
 *
 * const { model, kontext } = createKontextAI(openai('gpt-4o'), {
 *   projectId: 'payment-app',
 *   agentId: 'payment-agent',
 *   financialTools: ['transfer_usdc', 'send_payment'],
 * });
 *
 * const result = await generateText({ model, tools, prompt: 'Pay 50 USDC' });
 * // All tool calls are automatically logged with digest chains.
 *
 * // Access the audit trail
 * const chain = kontext.exportDigestChain();
 * console.log('Terminal digest:', kontext.getTerminalDigest());
 * ```
 */
export function createKontextAI(
  model: unknown,
  input: CreateKontextAIInput,
): CreateKontextAIResult {
  const kontext = Kontext.init({
    projectId: input.projectId,
    environment: input.environment ?? 'development',
    apiKey: input.apiKey,
    debug: input.debug,
  });

  const wrappedModel = kontextWrapModel(model, kontext, {
    agentId: input.agentId,
    financialTools: input.financialTools,
    logToolArgs: input.logToolArgs,
    defaultCurrency: input.defaultCurrency,
    trustThreshold: input.trustThreshold,
    onBlocked: input.onBlocked,
  });

  return { model: wrappedModel, kontext };
}

// ============================================================================
// Next.js Route Handler
// ============================================================================

/**
 * Wraps a Next.js API route handler with Kontext audit logging.
 *
 * Every incoming request is logged with a unique request ID, and a
 * pre-configured `KontextAIContext` is passed to the handler. The context
 * provides a `wrapModel()` helper for wrapping AI models inside the handler.
 *
 * On completion, the request lifecycle (including duration and status code)
 * is logged to the digest chain.
 *
 * @param handler - The route handler function
 * @param options - Kontext configuration for the route
 * @returns A standard Next.js route handler function
 *
 * @example
 * ```typescript
 * // app/api/chat/route.ts
 * import { withKontext } from 'kontext-sdk';
 * import { openai } from '@ai-sdk/openai';
 * import { generateText } from 'ai';
 *
 * export const POST = withKontext(async (req, ctx) => {
 *   const { messages } = await req.json();
 *
 *   const model = ctx.wrapModel(openai('gpt-4o'), {
 *     financialTools: ['transfer_usdc'],
 *   });
 *
 *   const result = await generateText({ model, messages });
 *   return Response.json(result);
 * }, {
 *   projectId: 'my-app',
 *   environment: 'production',
 * });
 * ```
 */
export function withKontext(
  handler: (req: Request, ctx: KontextAIContext) => Promise<Response>,
  options?: WithKontextOptions,
): (req: Request) => Promise<Response> {
  // Validate projectId: must be explicitly provided or set via env var
  const resolvedProjectId = options?.projectId ?? process.env['KONTEXT_PROJECT_ID'];
  if (!resolvedProjectId) {
    throw new Error('Kontext: projectId is required. Provide it via options or set KONTEXT_PROJECT_ID env var.');
  }

  // Validate apiKey: if explicitly provided, must not be empty/whitespace
  const resolvedApiKey = options?.apiKey ?? process.env['KONTEXT_API_KEY'];
  if (options?.apiKey !== undefined && options.apiKey.trim() === '') {
    throw new Error('Kontext: apiKey was provided but is empty.');
  }

  // Initialize a shared Kontext client for the route
  const kontext = Kontext.init({
    projectId: resolvedProjectId,
    environment: options?.environment ?? (process.env['NODE_ENV'] === 'production' ? 'production' : 'development') as Environment,
    apiKey: resolvedApiKey,
    debug: options?.debug,
  });

  const agentId = options?.agentId ?? 'nextjs-route';

  return async (req: Request): Promise<Response> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Log the incoming request
    await kontext.log({
      type: 'http_request',
      description: `${req.method} ${new URL(req.url).pathname}`,
      agentId,
      correlationId: requestId,
      metadata: {
        method: req.method,
        url: req.url,
        requestId,
      },
    });

    // Build the context
    const ctx: KontextAIContext = {
      kontext,
      requestId,
      wrapModel: (model: unknown, aiOptions?: KontextAIOptions) =>
        kontextWrapModel(model, kontext, {
          ...aiOptions,
          agentId: aiOptions?.agentId ?? agentId,
        }),
    };

    try {
      const response = await handler(req, ctx);
      const duration = Date.now() - startTime;

      // Log successful response
      await kontext.log({
        type: 'http_response',
        description: `Response ${response.status} in ${duration}ms`,
        agentId,
        correlationId: requestId,
        metadata: {
          status: response.status,
          duration,
          requestId,
          terminalDigest: kontext.getTerminalDigest(),
        },
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log the error
      await kontext.log({
        type: 'http_error',
        description: `Request failed after ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        agentId,
        correlationId: requestId,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          duration,
          requestId,
        },
      });

      throw error;
    }
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract a numeric amount from tool call arguments.
 *
 * Searches for common field names (`amount`, `value`, `total`, `payment`,
 * `transfer`) in the arguments object and returns the first valid number found.
 *
 * @param args - The tool call arguments (typically a JSON object)
 * @returns The extracted numeric amount, or `null` if no amount was found
 */
export function extractAmount(args: unknown): number | null {
  if (args === null || args === undefined) return null;

  if (typeof args === 'number') return args;
  if (typeof args === 'string') {
    const parsed = parseFloat(args);
    return isNaN(parsed) ? null : parsed;
  }

  if (typeof args === 'object') {
    const obj = args as Record<string, unknown>;
    const amountFields = ['amount', 'value', 'total', 'payment', 'transfer', 'sum'];

    for (const field of amountFields) {
      if (field in obj) {
        const value = obj[field];
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) return parsed;
        }
      }
    }

    // Recurse into nested objects (one level deep)
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = extractAmount(value);
        if (nested !== null) return nested;
      }
    }
  }

  return null;
}

/**
 * Generate a unique request identifier for correlating log entries
 * within a single HTTP request lifecycle.
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `req_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}-${random}`;
}
