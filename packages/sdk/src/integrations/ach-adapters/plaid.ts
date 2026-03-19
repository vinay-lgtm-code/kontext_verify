// ============================================================================
// Kontext SDK - Plaid ACH Adapter
// ============================================================================
// Normalizes Plaid Transfer webhook events into AchTransferEvent.
// Webhook type: TRANSFER_EVENTS_UPDATE
// Poll endpoint: POST /transfer/event/list

import type { AchTransferEvent } from '../../types.js';
import type { AchProviderAdapter } from './types.js';
import { now } from '../../utils.js';

/** Plaid transfer event shape (subset of fields we need) */
interface PlaidTransferEvent {
  event_id: number;
  transfer_id: string;
  transfer_type: 'credit' | 'debit';
  transfer_amount: string;
  transfer_status: string;
  ach_class?: string;
  origination_account_id?: string;
  originator_client_id?: string;
  timestamp: string;
  account_id?: string;
  failure_reason?: { ach_return_code?: string; description?: string };
}

/** Plaid webhook payload */
interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  environment?: string;
  new_transfer_events?: PlaidTransferEvent[];
}

const STATUS_MAP: Record<string, AchTransferEvent['status']> = {
  pending: 'pending',
  posted: 'posted',
  settled: 'settled',
  returned: 'returned',
  failed: 'failed',
  cancelled: 'failed',
  reversed: 'returned',
};

export class PlaidAchAdapter implements AchProviderAdapter {
  readonly provider = 'plaid' as const;

  parseWebhook(payload: unknown): AchTransferEvent[] {
    const data = payload as PlaidWebhookPayload;
    if (data.webhook_type !== 'TRANSFER' || data.webhook_code !== 'TRANSFER_EVENTS_UPDATE') {
      return [];
    }

    const events = data.new_transfer_events;
    if (!Array.isArray(events)) return [];

    return events.map((e) => ({
      transferId: e.transfer_id,
      amount: e.transfer_amount,
      currency: 'USD',
      direction: e.transfer_type,
      status: STATUS_MAP[e.transfer_status] ?? 'pending',
      secCode: e.ach_class?.toUpperCase(),
      originatorId: e.originator_client_id,
      provider: this.provider,
      raw: e as unknown as Record<string, unknown>,
      timestamp: e.timestamp || now(),
    }));
  }

  async poll(since: string, config: Record<string, string>): Promise<AchTransferEvent[]> {
    const clientId = config['clientId'];
    const secret = config['secret'];
    const baseUrl = config['baseUrl'] ?? 'https://production.plaid.com';

    if (!clientId || !secret) {
      throw new Error('Plaid adapter requires clientId and secret in providerConfig');
    }

    const res = await fetch(`${baseUrl}/transfer/event/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        start_date: since,
        count: 25,
      }),
    });

    if (!res.ok) {
      throw new Error(`Plaid API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { transfer_events?: PlaidTransferEvent[] };
    const events = json.transfer_events ?? [];

    return events.map((e) => ({
      transferId: e.transfer_id,
      amount: e.transfer_amount,
      currency: 'USD',
      direction: e.transfer_type,
      status: STATUS_MAP[e.transfer_status] ?? 'pending',
      secCode: e.ach_class?.toUpperCase(),
      originatorId: e.originator_client_id,
      provider: this.provider,
      raw: e as unknown as Record<string, unknown>,
      timestamp: e.timestamp || now(),
    }));
  }
}
