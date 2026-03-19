// ============================================================================
// Kontext SDK - Moov ACH Adapter
// ============================================================================
// Normalizes Moov transfer webhook events into AchTransferEvent.
// Webhook types: transfer.created, transfer.completed, transfer.returned, transfer.failed
// Poll endpoint: GET /transfers

import type { AchTransferEvent } from '../../types.js';
import type { AchProviderAdapter } from './types.js';
import { now } from '../../utils.js';

/** Moov transfer shape (subset) */
interface MoovTransfer {
  transferID: string;
  amount: { value: number; currency: string };
  status: string;
  source?: { paymentMethodType?: string; achDetails?: MoovAchDetails };
  destination?: { paymentMethodType?: string; achDetails?: MoovAchDetails };
  createdOn?: string;
}

interface MoovAchDetails {
  secCode?: string;
  traceNumber?: string;
  companyName?: string;
  companyEntryDescription?: string;
  routingNumber?: string;
}

interface MoovWebhookPayload {
  eventType: string;
  data?: { transfer?: MoovTransfer };
}

const STATUS_MAP: Record<string, AchTransferEvent['status']> = {
  created: 'pending',
  pending: 'pending',
  completed: 'settled',
  returned: 'returned',
  failed: 'failed',
  reversed: 'returned',
};

export class MoovAchAdapter implements AchProviderAdapter {
  readonly provider = 'moov' as const;

  parseWebhook(payload: unknown): AchTransferEvent[] {
    const data = payload as MoovWebhookPayload;
    if (!data.eventType?.startsWith('transfer.')) return [];

    const transfer = data.data?.transfer;
    if (!transfer) return [];

    const achDetails = transfer.source?.achDetails ?? transfer.destination?.achDetails;
    if (!achDetails && transfer.source?.paymentMethodType !== 'ach-debit-fund' && transfer.destination?.paymentMethodType !== 'ach-credit-standard') {
      return [];
    }

    const amountStr = (transfer.amount.value / 100).toFixed(2);

    return [{
      transferId: transfer.transferID,
      amount: amountStr,
      currency: transfer.amount.currency ?? 'USD',
      direction: transfer.source?.paymentMethodType?.includes('debit') ? 'debit' : 'credit',
      status: STATUS_MAP[transfer.status] ?? 'pending',
      originatorName: achDetails?.companyName,
      odfiRoutingNumber: achDetails?.routingNumber,
      secCode: achDetails?.secCode?.toUpperCase(),
      traceNumber: achDetails?.traceNumber,
      entryDescription: achDetails?.companyEntryDescription,
      provider: this.provider,
      raw: transfer as unknown as Record<string, unknown>,
      timestamp: transfer.createdOn || now(),
    }];
  }

  async poll(since: string, config: Record<string, string>): Promise<AchTransferEvent[]> {
    const accountId = config['accountId'];
    const apiKey = config['apiKey'];
    const baseUrl = config['baseUrl'] ?? 'https://api.moov.io';

    if (!accountId || !apiKey) {
      throw new Error('Moov adapter requires accountId and apiKey in providerConfig');
    }

    const url = new URL(`${baseUrl}/accounts/${accountId}/transfers`);
    url.searchParams.set('createdAfter', since);
    url.searchParams.set('count', '25');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Moov API error: ${res.status} ${res.statusText}`);
    }

    const transfers = (await res.json()) as MoovTransfer[];
    return transfers.map((t) => {
      const achDetails = t.source?.achDetails ?? t.destination?.achDetails;
      return {
        transferId: t.transferID,
        amount: (t.amount.value / 100).toFixed(2),
        currency: t.amount.currency ?? 'USD',
        direction: t.source?.paymentMethodType?.includes('debit') ? 'debit' as const : 'credit' as const,
        status: STATUS_MAP[t.status] ?? 'pending' as const,
        originatorName: achDetails?.companyName,
        odfiRoutingNumber: achDetails?.routingNumber,
        secCode: achDetails?.secCode?.toUpperCase(),
        traceNumber: achDetails?.traceNumber,
        entryDescription: achDetails?.companyEntryDescription,
        provider: this.provider,
        raw: t as unknown as Record<string, unknown>,
        timestamp: t.createdOn || now(),
      };
    });
  }
}
