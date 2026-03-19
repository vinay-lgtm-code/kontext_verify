// ============================================================================
// Kontext SDK - ACH Provider Adapter Interface
// ============================================================================

import type { AchTransferEvent } from '../../types.js';

/** Provider adapter interface — normalizes provider-specific events to AchTransferEvent */
export interface AchProviderAdapter {
  /** Provider name */
  readonly provider: AchTransferEvent['provider'];

  /**
   * Parse a webhook payload into normalized ACH events.
   * Returns empty array if the webhook isn't an ACH transfer event.
   */
  parseWebhook(payload: unknown, headers?: Record<string, string>): AchTransferEvent[];

  /**
   * Poll for recent ACH transfers (for providers that support polling).
   * Returns transfers since the given cursor/timestamp.
   * @param since - ISO 8601 timestamp or provider-specific cursor
   * @param config - Provider-specific configuration (API keys, account IDs)
   */
  poll?(since: string, config: Record<string, string>): Promise<AchTransferEvent[]>;

  /**
   * Verify webhook signature.
   * @returns true if valid, false if signature check fails
   */
  verifySignature?(payload: unknown, headers: Record<string, string>, secret: string): boolean;
}
