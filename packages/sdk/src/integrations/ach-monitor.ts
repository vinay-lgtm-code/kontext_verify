// ============================================================================
// Kontext SDK - ACH Monitor
// ============================================================================
// Watches for ACH transfer events via banking provider webhooks and optional
// polling. Mirrors the WalletMonitor pattern: receives events, normalizes them
// via a provider adapter, deduplicates, and auto-calls verify().

import type { AchTransferEvent, AchMonitorConfig, VerifyResult } from '../types.js';
import type { VerifyInput } from '../types.js';
import type { AchProviderAdapter } from './ach-adapters/types.js';
import { parseAmount } from '../utils.js';

/** Minimal Kontext interface needed by the monitor */
export interface KontextForAchMonitor {
  verify(input: VerifyInput): Promise<VerifyResult>;
}

/**
 * Watches for ACH transfer events from banking providers and auto-verifies them.
 * Supports webhook-based and polling-based event ingestion.
 *
 * Usage:
 * ```typescript
 * const monitor = ctx.getAchMonitor();
 *
 * // Webhook mode: pipe provider webhooks through handleWebhook()
 * app.post('/webhooks/plaid', async (req, res) => {
 *   const results = await monitor.handleWebhook(req.body, req.headers);
 *   res.json({ verified: results.length });
 * });
 *
 * // Polling mode: start background polling
 * await monitor.startPolling();
 * ```
 */
export class AchMonitor {
  private readonly kontext: KontextForAchMonitor;
  private readonly config: AchMonitorConfig;
  private readonly adapter: AchProviderAdapter;
  private readonly agentId: string;
  private readonly autoVerify: boolean;
  private readonly minimumAmount: number | null;
  private running = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastPollCursor: string;

  /** Dedup set — tracks recently verified transferIds */
  readonly verifiedTransferIds = new Set<string>();
  private readonly transferTimestamps = new Map<string, number>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    kontext: KontextForAchMonitor,
    config: AchMonitorConfig,
    adapter: AchProviderAdapter,
    options?: { agentId?: string },
  ) {
    this.kontext = kontext;
    this.config = config;
    this.adapter = adapter;
    this.agentId = options?.agentId ?? 'ach-monitor';
    this.autoVerify = config.autoVerify ?? true;
    this.minimumAmount = config.minimumAmount ? parseAmount(config.minimumAmount) : null;
    this.lastPollCursor = new Date().toISOString();
  }

  /**
   * Process a webhook payload from the banking provider.
   * Parses, deduplicates, filters, and optionally auto-verifies.
   */
  async handleWebhook(
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<VerifyResult[]> {
    // Optionally verify signature
    if (headers && this.adapter.verifySignature && this.config.providerConfig['webhookSecret']) {
      const valid = this.adapter.verifySignature(
        payload,
        headers,
        this.config.providerConfig['webhookSecret'],
      );
      if (!valid) {
        throw new Error(`Webhook signature verification failed for ${this.adapter.provider}`);
      }
    }

    // Parse webhook into normalized events
    const events = this.adapter.parseWebhook(payload, headers);
    return this.processEvents(events);
  }

  /**
   * Start polling for ACH transfers (if the adapter supports it).
   */
  async startPolling(): Promise<void> {
    if (this.running) return;
    if (!this.adapter.poll) {
      throw new Error(`${this.adapter.provider} adapter does not support polling`);
    }

    const intervalMs = this.config.pollingIntervalMs ?? 60_000;

    // Initial poll
    await this.pollOnce();

    // Set up recurring poll
    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, intervalMs);

    if (this.pollTimer && typeof this.pollTimer === 'object' && 'unref' in this.pollTimer) {
      this.pollTimer.unref();
    }

    // Dedup cleanup: purge entries older than 10 minutes every 60 seconds
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - 10 * 60 * 1000;
      for (const [id, ts] of this.transferTimestamps) {
        if (ts < cutoff) {
          this.verifiedTransferIds.delete(id);
          this.transferTimestamps.delete(id);
        }
      }
    }, 60_000);

    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }

    this.running = true;
  }

  /** Stop polling and cleanup */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Mark a transferId as already verified (prevents double-processing).
   */
  markVerified(transferId: string): void {
    this.verifiedTransferIds.add(transferId);
    this.transferTimestamps.set(transferId, Date.now());
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private async pollOnce(): Promise<void> {
    if (!this.adapter.poll) return;

    try {
      const events = await this.adapter.poll(this.lastPollCursor, this.config.providerConfig);
      if (events.length > 0) {
        // Update cursor to latest event timestamp
        const latest = events.reduce((max, e) =>
          e.timestamp > max ? e.timestamp : max, this.lastPollCursor);
        this.lastPollCursor = latest;

        await this.processEvents(events);
      }
    } catch {
      // Polling failure must never propagate — log and continue
    }
  }

  private async processEvents(events: AchTransferEvent[]): Promise<VerifyResult[]> {
    const results: VerifyResult[] = [];

    for (const event of events) {
      // Dedup
      if (this.verifiedTransferIds.has(event.transferId)) continue;

      // Minimum amount filter
      if (this.minimumAmount !== null) {
        const amount = parseAmount(event.amount);
        if (!isNaN(amount) && amount < this.minimumAmount) continue;
      }

      // Mark as verified
      this.markVerified(event.transferId);

      // Auto-verify
      if (this.autoVerify) {
        try {
          const input = this.toVerifyInput(event);
          const result = await this.kontext.verify(input);
          results.push(result);
        } catch {
          // Compliance logging failure must never propagate
        }
      }
    }

    return results;
  }

  private toVerifyInput(event: AchTransferEvent): VerifyInput {
    return {
      amount: event.amount,
      currency: event.currency ?? 'USD',
      from: event.originatorName ?? event.counterpartyName ?? 'unknown',
      to: event.counterpartyName ?? event.originatorName ?? 'unknown',
      agentId: this.agentId,
      paymentMethod: 'ach',
      achSecCode: event.secCode,
      achOriginatorName: event.originatorName,
      achOriginatorId: event.originatorId,
      achOdfiRoutingNumber: event.odfiRoutingNumber,
      achRdfiRoutingNumber: event.rdfiRoutingNumber,
      achEntryDescription: event.entryDescription,
      achTraceNumber: event.traceNumber,
      achSameDay: event.sameDay,
      achTransactionType: event.direction,
      metadata: {
        source: 'ach-monitor',
        provider: event.provider,
        transferId: event.transferId,
        status: event.status,
        ...(event.raw ? { raw: event.raw } : {}),
      },
    } as VerifyInput;
  }
}
