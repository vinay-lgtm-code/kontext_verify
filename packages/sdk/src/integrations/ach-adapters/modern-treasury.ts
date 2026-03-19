// ============================================================================
// Kontext SDK - Modern Treasury ACH Adapter
// ============================================================================
// Normalizes Modern Treasury webhook events into AchTransferEvent.
// Webhook types: payment_order.completed, payment_order.failed, payment_order.returned
// Poll endpoint: GET /api/payment_orders

import type { AchTransferEvent } from '../../types.js';
import type { AchProviderAdapter } from './types.js';
import { now } from '../../utils.js';

/** Modern Treasury payment order shape (subset) */
interface MTPaymentOrder {
  id: string;
  amount: number;
  currency: string;
  direction: 'credit' | 'debit';
  status: string;
  type: string;
  subtype?: string;
  originating_account_id?: string;
  receiving_account_id?: string;
  reference_numbers?: Array<{ reference_number: string; reference_number_type: string }>;
  metadata?: Record<string, string>;
  created_at: string;
}

interface MTWebhookPayload {
  event: string;
  data: MTPaymentOrder;
}

const STATUS_MAP: Record<string, AchTransferEvent['status']> = {
  completed: 'settled',
  pending_sending: 'pending',
  pending: 'pending',
  sent: 'posted',
  failed: 'failed',
  returned: 'returned',
  cancelled: 'failed',
};

export class ModernTreasuryAchAdapter implements AchProviderAdapter {
  readonly provider = 'modern_treasury' as const;

  parseWebhook(payload: unknown): AchTransferEvent[] {
    const data = payload as MTWebhookPayload;
    if (!data.event?.startsWith('payment_order.')) return [];

    const order = data.data;
    if (!order || order.type !== 'ach') return [];

    const amountStr = (order.amount / 100).toFixed(2);
    const traceNumber = order.reference_numbers?.find(
      (r) => r.reference_number_type === 'ach_trace_number',
    )?.reference_number;

    return [{
      transferId: order.id,
      amount: amountStr,
      currency: order.currency?.toUpperCase() ?? 'USD',
      direction: order.direction,
      status: STATUS_MAP[order.status] ?? 'pending',
      secCode: order.subtype?.toUpperCase(),
      traceNumber,
      provider: this.provider,
      raw: order as unknown as Record<string, unknown>,
      timestamp: order.created_at || now(),
    }];
  }

  async poll(since: string, config: Record<string, string>): Promise<AchTransferEvent[]> {
    const apiKey = config['apiKey'];
    const orgId = config['organizationId'];
    const baseUrl = config['baseUrl'] ?? 'https://app.moderntreasury.com';

    if (!apiKey || !orgId) {
      throw new Error('Modern Treasury adapter requires apiKey and organizationId in providerConfig');
    }

    const url = new URL(`${baseUrl}/api/payment_orders`);
    url.searchParams.set('created_at_lower_bound', since);
    url.searchParams.set('type', 'ach');
    url.searchParams.set('per_page', '25');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${btoa(`${orgId}:${apiKey}`)}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Modern Treasury API error: ${res.status} ${res.statusText}`);
    }

    const orders = (await res.json()) as MTPaymentOrder[];
    return orders.map((o) => {
      const traceNumber = o.reference_numbers?.find(
        (r) => r.reference_number_type === 'ach_trace_number',
      )?.reference_number;

      return {
        transferId: o.id,
        amount: (o.amount / 100).toFixed(2),
        currency: o.currency?.toUpperCase() ?? 'USD',
        direction: o.direction,
        status: STATUS_MAP[o.status] ?? 'pending' as const,
        secCode: o.subtype?.toUpperCase(),
        traceNumber,
        provider: this.provider,
        raw: o as unknown as Record<string, unknown>,
        timestamp: o.created_at || now(),
      };
    });
  }
}
