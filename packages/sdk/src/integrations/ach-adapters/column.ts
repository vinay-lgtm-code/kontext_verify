// ============================================================================
// Kontext SDK - Column ACH Adapter
// ============================================================================
// Normalizes Column bank webhook events into AchTransferEvent.
// Webhook types: ach.outgoing_transfer.completed, ach.incoming_transfer.completed,
//                ach.transfer.returned
// Poll endpoint: GET /transfers/ach

import type { AchTransferEvent } from '../../types.js';
import type { AchProviderAdapter } from './types.js';
import { now } from '../../utils.js';

/** Column ACH transfer shape (subset) */
interface ColumnAchTransfer {
  id: string;
  amount: number;
  currency_code: string;
  type: 'credit' | 'debit';
  status: string;
  routing_number?: string;
  originator_name?: string;
  originator_identification?: string;
  sec_code?: string;
  trace_number?: string;
  company_entry_description?: string;
  same_day?: boolean;
  counterparty_name?: string;
  counterparty_routing_number?: string;
  created_at: string;
}

interface ColumnWebhookPayload {
  type: string;
  data: ColumnAchTransfer;
}

const STATUS_MAP: Record<string, AchTransferEvent['status']> = {
  completed: 'settled',
  pending: 'pending',
  initiated: 'pending',
  settled: 'settled',
  returned: 'returned',
  failed: 'failed',
};

export class ColumnAchAdapter implements AchProviderAdapter {
  readonly provider = 'column' as const;

  parseWebhook(payload: unknown): AchTransferEvent[] {
    const data = payload as ColumnWebhookPayload;
    if (!data.type?.startsWith('ach.')) return [];

    const transfer = data.data;
    if (!transfer) return [];

    const amountStr = (transfer.amount / 100).toFixed(2);
    const isIncoming = data.type.includes('incoming');

    return [{
      transferId: transfer.id,
      amount: amountStr,
      currency: transfer.currency_code?.toUpperCase() ?? 'USD',
      direction: transfer.type ?? (isIncoming ? 'credit' : 'debit'),
      status: STATUS_MAP[transfer.status] ?? 'pending',
      originatorName: transfer.originator_name,
      originatorId: transfer.originator_identification,
      odfiRoutingNumber: transfer.routing_number,
      rdfiRoutingNumber: transfer.counterparty_routing_number,
      secCode: transfer.sec_code?.toUpperCase(),
      traceNumber: transfer.trace_number,
      entryDescription: transfer.company_entry_description,
      sameDay: transfer.same_day,
      counterpartyName: transfer.counterparty_name,
      provider: this.provider,
      raw: transfer as unknown as Record<string, unknown>,
      timestamp: transfer.created_at || now(),
    }];
  }

  async poll(since: string, config: Record<string, string>): Promise<AchTransferEvent[]> {
    const apiKey = config['apiKey'];
    const baseUrl = config['baseUrl'] ?? 'https://api.column.com';

    if (!apiKey) {
      throw new Error('Column adapter requires apiKey in providerConfig');
    }

    const url = new URL(`${baseUrl}/transfers/ach`);
    url.searchParams.set('created_after', since);
    url.searchParams.set('limit', '25');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Column API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { transfers?: ColumnAchTransfer[] };
    const transfers = json.transfers ?? [];

    return transfers.map((t) => ({
      transferId: t.id,
      amount: (t.amount / 100).toFixed(2),
      currency: t.currency_code?.toUpperCase() ?? 'USD',
      direction: t.type,
      status: STATUS_MAP[t.status] ?? 'pending' as const,
      originatorName: t.originator_name,
      originatorId: t.originator_identification,
      odfiRoutingNumber: t.routing_number,
      rdfiRoutingNumber: t.counterparty_routing_number,
      secCode: t.sec_code?.toUpperCase(),
      traceNumber: t.trace_number,
      entryDescription: t.company_entry_description,
      sameDay: t.same_day,
      counterpartyName: t.counterparty_name,
      provider: this.provider,
      raw: t as unknown as Record<string, unknown>,
      timestamp: t.created_at || now(),
    }));
  }
}
