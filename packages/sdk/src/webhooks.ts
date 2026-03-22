// ============================================================================
// WebhookManager — Real-time event delivery to configured endpoints
// ============================================================================

export type WebhookEventType =
  | 'anomaly.detected'
  | 'task.created'
  | 'task.confirmed'
  | 'action.logged'
  | 'transaction.logged';

export interface WebhookConfig {
  /** The endpoint URL to deliver events to. */
  url: string;
  /** Optional shared secret for HMAC-SHA256 signature verification. */
  secret?: string;
  /** Optional filter — only deliver these event types. If omitted, all events are delivered. */
  events?: WebhookEventType[];
}

export interface WebhookDeliveryResult {
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

export class WebhookManager {
  private readonly configs: WebhookConfig[];

  constructor(configs: WebhookConfig[]) {
    this.configs = configs;
  }

  async emit(
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<WebhookDeliveryResult[]> {
    const targets = this.configs.filter(
      (c) => !c.events || c.events.includes(eventType),
    );

    const results = await Promise.allSettled(
      targets.map((config) => this.deliver(config, eventType, payload)),
    );

    return results.map((r, i) => {
      const target = targets[i]!;
      if (r.status === 'fulfilled') {
        return r.value;
      }
      return {
        url: target.url,
        success: false,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
    });
  }

  private async deliver(
    config: WebhookConfig,
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<WebhookDeliveryResult> {
    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.secret) {
      const signature = await this.sign(body, config.secret);
      headers['X-Kontext-Signature'] = signature;
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      return {
        url: config.url,
        success: response.ok,
        statusCode: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        url: config.url,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async sign(payload: string, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
