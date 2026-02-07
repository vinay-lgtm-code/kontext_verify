// ============================================================================
// Kontext SDK - Webhook Manager
// ============================================================================

import { createHmac, timingSafeEqual } from 'crypto';
import type { AnomalyEvent, TrustScore } from './types.js';
import type { Task } from './types.js';
import { generateId, now } from './utils.js';

// ============================================================================
// Types
// ============================================================================

/** Supported webhook event types */
export type WebhookEventType =
  | 'anomaly.detected'
  | 'task.confirmed'
  | 'task.failed'
  | 'trust.score_changed';

/** Webhook registration configuration */
export interface WebhookConfig {
  /** Unique identifier for this webhook */
  id: string;
  /** Target URL to receive webhook POST requests */
  url: string;
  /** Event types to listen for */
  events: WebhookEventType[];
  /** Optional secret for HMAC signature verification */
  secret?: string;
  /** Whether this webhook is active */
  active: boolean;
  /** When this webhook was registered */
  createdAt: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** Input for registering a new webhook */
export interface RegisterWebhookInput {
  /** Target URL */
  url: string;
  /** Event types to listen for */
  events: WebhookEventType[];
  /** Optional secret for payload signing */
  secret?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** Webhook delivery payload */
export interface WebhookPayload {
  /** Unique delivery ID */
  id: string;
  /** Event type */
  event: WebhookEventType;
  /** Timestamp of the event */
  timestamp: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/** Result of a webhook delivery attempt */
export interface WebhookDeliveryResult {
  /** Webhook ID */
  webhookId: string;
  /** Delivery payload ID */
  payloadId: string;
  /** Whether delivery succeeded */
  success: boolean;
  /** HTTP status code (if applicable) */
  statusCode: number | null;
  /** Number of attempts made */
  attempts: number;
  /** Error message if failed */
  error: string | null;
  /** Timestamp of last attempt */
  lastAttemptAt: string;
}

/** Retry configuration */
export interface WebhookRetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
}

/** Default retry configuration */
const DEFAULT_RETRY_CONFIG: WebhookRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// ============================================================================
// Webhook Manager
// ============================================================================

/**
 * WebhookManager handles registration and delivery of webhook notifications
 * for SDK events including anomaly detection, task confirmation, and trust
 * score changes.
 *
 * Features:
 * - Register multiple webhook URLs with event type filtering
 * - Automatic retry with exponential backoff on delivery failure
 * - Delivery result tracking
 * - Enable/disable individual webhooks
 *
 * @example
 * ```typescript
 * const manager = new WebhookManager();
 *
 * manager.register({
 *   url: 'https://example.com/webhooks/kontext',
 *   events: ['anomaly.detected', 'task.confirmed'],
 * });
 *
 * // Webhooks fire automatically when events occur
 * await manager.notifyAnomalyDetected(anomalyEvent);
 * ```
 */
export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveryResults: WebhookDeliveryResult[] = [];
  private retryConfig: WebhookRetryConfig;
  private fetchFn: typeof fetch;

  constructor(retryConfig?: Partial<WebhookRetryConfig>, fetchFn?: typeof fetch) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.fetchFn = fetchFn ?? globalThis.fetch;
  }

  /**
   * Register a new webhook endpoint.
   *
   * @param input - Webhook configuration
   * @returns The created WebhookConfig
   */
  register(input: RegisterWebhookInput): WebhookConfig {
    if (!input.url || input.url.trim() === '') {
      throw new Error('Webhook URL is required');
    }

    if (!input.events || input.events.length === 0) {
      throw new Error('At least one event type is required');
    }

    const config: WebhookConfig = {
      id: generateId(),
      url: input.url,
      events: input.events,
      secret: input.secret,
      active: true,
      createdAt: now(),
      metadata: input.metadata,
    };

    this.webhooks.set(config.id, config);

    return config;
  }

  /**
   * Unregister a webhook by ID.
   *
   * @param webhookId - The webhook to remove
   * @returns Whether the webhook was found and removed
   */
  unregister(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  /**
   * Enable or disable a webhook.
   *
   * @param webhookId - The webhook to update
   * @param active - Whether to enable or disable
   * @returns The updated WebhookConfig, or undefined if not found
   */
  setActive(webhookId: string, active: boolean): WebhookConfig | undefined {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return undefined;

    const updated = { ...webhook, active };
    this.webhooks.set(webhookId, updated);
    return updated;
  }

  /**
   * Get all registered webhooks.
   * Secrets are redacted to prevent accidental exposure in logs or API responses.
   */
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values()).map((w) => ({
      ...w,
      secret: w.secret ? '***REDACTED***' : w.secret,
    }));
  }

  /**
   * Get a specific webhook by ID.
   * The secret is redacted to prevent accidental exposure in logs or API responses.
   */
  getWebhook(webhookId: string): WebhookConfig | undefined {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return undefined;
    return {
      ...webhook,
      secret: webhook.secret ? '***REDACTED***' : webhook.secret,
    };
  }

  /**
   * Get delivery results for a specific webhook or all webhooks.
   */
  getDeliveryResults(webhookId?: string): WebhookDeliveryResult[] {
    if (webhookId) {
      return this.deliveryResults.filter((r) => r.webhookId === webhookId);
    }
    return [...this.deliveryResults];
  }

  /**
   * Notify all subscribed webhooks of an anomaly detection event.
   *
   * @param anomaly - The detected anomaly event
   * @returns Array of delivery results
   */
  async notifyAnomalyDetected(anomaly: AnomalyEvent): Promise<WebhookDeliveryResult[]> {
    const payload: WebhookPayload = {
      id: generateId(),
      event: 'anomaly.detected',
      timestamp: now(),
      data: {
        anomalyId: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity,
        description: anomaly.description,
        agentId: anomaly.agentId,
        actionId: anomaly.actionId,
        detectedAt: anomaly.detectedAt,
        data: anomaly.data,
      },
    };

    return this.deliver('anomaly.detected', payload);
  }

  /**
   * Notify all subscribed webhooks of a task confirmation.
   *
   * @param task - The confirmed task
   * @returns Array of delivery results
   */
  async notifyTaskConfirmed(task: Task): Promise<WebhookDeliveryResult[]> {
    const payload: WebhookPayload = {
      id: generateId(),
      event: 'task.confirmed',
      timestamp: now(),
      data: {
        taskId: task.id,
        description: task.description,
        agentId: task.agentId,
        status: task.status,
        confirmedAt: task.confirmedAt,
        correlationId: task.correlationId,
      },
    };

    return this.deliver('task.confirmed', payload);
  }

  /**
   * Notify all subscribed webhooks of a task failure.
   *
   * @param task - The failed task
   * @returns Array of delivery results
   */
  async notifyTaskFailed(task: Task): Promise<WebhookDeliveryResult[]> {
    const payload: WebhookPayload = {
      id: generateId(),
      event: 'task.failed',
      timestamp: now(),
      data: {
        taskId: task.id,
        description: task.description,
        agentId: task.agentId,
        status: task.status,
        correlationId: task.correlationId,
        metadata: task.metadata,
      },
    };

    return this.deliver('task.failed', payload);
  }

  /**
   * Notify all subscribed webhooks of a trust score change.
   *
   * @param trustScore - The new trust score
   * @param previousScore - The previous score value (if known)
   * @returns Array of delivery results
   */
  async notifyTrustScoreChanged(
    trustScore: TrustScore,
    previousScore?: number,
  ): Promise<WebhookDeliveryResult[]> {
    const payload: WebhookPayload = {
      id: generateId(),
      event: 'trust.score_changed',
      timestamp: now(),
      data: {
        agentId: trustScore.agentId,
        score: trustScore.score,
        previousScore: previousScore ?? null,
        level: trustScore.level,
        factors: trustScore.factors,
        computedAt: trustScore.computedAt,
      },
    };

    return this.deliver('trust.score_changed', payload);
  }

  // --------------------------------------------------------------------------
  // Delivery with retry
  // --------------------------------------------------------------------------

  private async deliver(
    eventType: WebhookEventType,
    payload: WebhookPayload,
  ): Promise<WebhookDeliveryResult[]> {
    const subscribers = Array.from(this.webhooks.values()).filter(
      (w) => w.active && w.events.includes(eventType),
    );

    const results: WebhookDeliveryResult[] = [];

    for (const webhook of subscribers) {
      const result = await this.deliverToWebhook(webhook, payload);
      results.push(result);
      this.deliveryResults.push(result);
    }

    return results;
  }

  private async deliverToWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
  ): Promise<WebhookDeliveryResult> {
    let lastError: string | null = null;
    let statusCode: number | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Exponential backoff: wait before retries (not before first attempt)
        if (attempt > 0) {
          const delay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelayMs,
          );
          await this.sleep(delay);
        }

        const response = await this.fetchFn(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kontext-Event': payload.event,
            'X-Kontext-Delivery': payload.id,
            ...(webhook.secret
              ? { 'X-Kontext-Signature': await this.computeSignature(payload, webhook.secret) }
              : {}),
          },
          body: JSON.stringify(payload),
        });

        statusCode = response.status;

        if (response.ok) {
          return {
            webhookId: webhook.id,
            payloadId: payload.id,
            success: true,
            statusCode,
            attempts: attempt + 1,
            error: null,
            lastAttemptAt: now(),
          };
        }

        lastError = `HTTP ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      webhookId: webhook.id,
      payloadId: payload.id,
      success: false,
      statusCode,
      attempts: this.retryConfig.maxRetries + 1,
      error: lastError,
      lastAttemptAt: now(),
    };
  }

  private async computeSignature(payload: WebhookPayload, secret: string): Promise<string> {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verify a webhook signature using constant-time comparison to prevent
   * timing attacks. Use this in your webhook handler to validate incoming
   * payloads from Kontext.
   *
   * @param payload - The raw JSON payload body (string)
   * @param signature - The signature from the X-Kontext-Signature header
   * @param secret - The webhook secret used during registration
   * @returns Whether the signature is valid
   *
   * @example
   * ```typescript
   * const isValid = WebhookManager.verifySignature(
   *   req.body, // raw JSON string
   *   req.headers['x-kontext-signature'],
   *   'my-webhook-secret',
   * );
   * if (!isValid) return res.status(401).send('Invalid signature');
   * ```
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expected = hmac.digest('hex');

    if (expected.length !== signature.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  }
}
