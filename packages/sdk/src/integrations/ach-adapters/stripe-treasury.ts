// ============================================================================
// Kontext SDK - Stripe Treasury ACH Adapter
// ============================================================================
// Normalizes Stripe Treasury webhook events into AchTransferEvent.
// Webhook types: treasury.received_credit, treasury.received_debit,
//                treasury.outbound_transfer.posted
// Poll endpoint: GET /v1/treasury/received_credits

import type { AchTransferEvent } from '../../types.js';
import type { AchProviderAdapter } from './types.js';
import { now } from '../../utils.js';

/** Stripe Treasury event shape (subset) */
interface StripeReceivedFlow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  linked_flows?: {
    source_flow_details?: {
      type: string;
      ach_details?: {
        routing_number?: string;
        originator_company_name?: string;
        sec?: string;
        trace_number?: string;
      };
    };
  };
  created: number;
}

interface StripeOutboundTransfer {
  id: string;
  amount: number;
  currency: string;
  status: string;
  destination_payment_method_details?: {
    type: string;
    us_bank_account?: {
      routing_number?: string;
      bank_name?: string;
    };
  };
  created: number;
}

interface StripeWebhookPayload {
  type: string;
  data: {
    object: StripeReceivedFlow | StripeOutboundTransfer;
  };
}

const STATUS_MAP: Record<string, AchTransferEvent['status']> = {
  succeeded: 'settled',
  posted: 'posted',
  failed: 'failed',
  returned: 'returned',
  pending: 'pending',
};

export class StripeTreasuryAchAdapter implements AchProviderAdapter {
  readonly provider = 'stripe_treasury' as const;

  parseWebhook(payload: unknown): AchTransferEvent[] {
    const data = payload as StripeWebhookPayload;

    if (data.type === 'treasury.received_credit' || data.type === 'treasury.received_debit') {
      const flow = data.data.object as StripeReceivedFlow;
      const achDetails = flow.linked_flows?.source_flow_details;

      if (achDetails?.type !== 'ach') return [];

      const direction = data.type === 'treasury.received_credit' ? 'credit' as const : 'debit' as const;
      const amountStr = (flow.amount / 100).toFixed(2);

      return [{
        transferId: flow.id,
        amount: amountStr,
        currency: flow.currency?.toUpperCase() ?? 'USD',
        direction,
        status: STATUS_MAP[flow.status] ?? 'pending',
        originatorName: achDetails.ach_details?.originator_company_name,
        odfiRoutingNumber: achDetails.ach_details?.routing_number,
        secCode: achDetails.ach_details?.sec?.toUpperCase(),
        traceNumber: achDetails.ach_details?.trace_number,
        provider: this.provider,
        raw: flow as unknown as Record<string, unknown>,
        timestamp: new Date(flow.created * 1000).toISOString(),
      }];
    }

    if (data.type === 'treasury.outbound_transfer.posted') {
      const transfer = data.data.object as StripeOutboundTransfer;
      const bankDetails = transfer.destination_payment_method_details;

      if (bankDetails?.type !== 'us_bank_account') return [];

      const amountStr = (transfer.amount / 100).toFixed(2);

      return [{
        transferId: transfer.id,
        amount: amountStr,
        currency: transfer.currency?.toUpperCase() ?? 'USD',
        direction: 'credit',
        status: STATUS_MAP[transfer.status] ?? 'posted',
        rdfiRoutingNumber: bankDetails.us_bank_account?.routing_number,
        provider: this.provider,
        raw: transfer as unknown as Record<string, unknown>,
        timestamp: new Date(transfer.created * 1000).toISOString(),
      }];
    }

    return [];
  }

  async poll(since: string, config: Record<string, string>): Promise<AchTransferEvent[]> {
    const apiKey = config['apiKey'];
    const baseUrl = config['baseUrl'] ?? 'https://api.stripe.com';

    if (!apiKey) {
      throw new Error('Stripe Treasury adapter requires apiKey in providerConfig');
    }

    const sinceTimestamp = Math.floor(new Date(since).getTime() / 1000);
    const url = new URL(`${baseUrl}/v1/treasury/received_credits`);
    url.searchParams.set('created[gt]', sinceTimestamp.toString());
    url.searchParams.set('limit', '25');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Stripe API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { data?: StripeReceivedFlow[] };
    const flows = json.data ?? [];

    return flows
      .filter((f) => f.linked_flows?.source_flow_details?.type === 'ach')
      .map((f) => {
        const achDetails = f.linked_flows!.source_flow_details!.ach_details;
        return {
          transferId: f.id,
          amount: (f.amount / 100).toFixed(2),
          currency: f.currency?.toUpperCase() ?? 'USD',
          direction: 'credit' as const,
          status: STATUS_MAP[f.status] ?? 'pending' as const,
          originatorName: achDetails?.originator_company_name,
          odfiRoutingNumber: achDetails?.routing_number,
          secCode: achDetails?.sec?.toUpperCase(),
          traceNumber: achDetails?.trace_number,
          provider: this.provider,
          raw: f as unknown as Record<string, unknown>,
          timestamp: new Date(f.created * 1000).toISOString(),
        };
      });
  }
}
