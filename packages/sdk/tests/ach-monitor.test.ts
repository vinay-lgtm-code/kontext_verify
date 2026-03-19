import { describe, it, expect } from 'vitest';
import {
  PlaidAchAdapter,
  MoovAchAdapter,
  StripeTreasuryAchAdapter,
  ModernTreasuryAchAdapter,
  ColumnAchAdapter,
  AchMonitor,
} from '../src/index.js';
import type { AchTransferEvent, VerifyInput, VerifyResult } from '../src/index.js';

// ---------------------------------------------------------------------------
// Mock Kontext for AchMonitor
// ---------------------------------------------------------------------------

function createMockKontext() {
  const verified: VerifyInput[] = [];
  return {
    verified,
    async verify(input: VerifyInput): Promise<VerifyResult> {
      verified.push(input);
      return {
        compliant: true,
        checks: [],
        riskLevel: 'low',
        recommendations: [],
        transaction: { id: 'tx-1', type: 'transaction', amount: input.amount, from: input.from, to: input.to } as any,
        trustScore: { score: 80, level: 'high', factors: [] } as any,
        anomalies: [],
        digestProof: { terminalDigest: 'abc', chainLength: 1, valid: true },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Plaid Adapter
// ---------------------------------------------------------------------------

describe('PlaidAchAdapter', () => {
  const adapter = new PlaidAchAdapter();

  it('parses TRANSFER_EVENTS_UPDATE webhook', () => {
    const payload = {
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      new_transfer_events: [
        {
          event_id: 1,
          transfer_id: 'tf_abc123',
          transfer_type: 'credit',
          transfer_amount: '5000.00',
          transfer_status: 'posted',
          ach_class: 'ccd',
          originator_client_id: 'client_xyz',
          timestamp: '2026-03-18T10:00:00Z',
        },
      ],
    };

    const events = adapter.parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0]!.transferId).toBe('tf_abc123');
    expect(events[0]!.amount).toBe('5000.00');
    expect(events[0]!.direction).toBe('credit');
    expect(events[0]!.status).toBe('posted');
    expect(events[0]!.secCode).toBe('CCD');
    expect(events[0]!.provider).toBe('plaid');
  });

  it('returns empty for non-transfer webhooks', () => {
    const events = adapter.parseWebhook({ webhook_type: 'AUTH', webhook_code: 'DEFAULT_UPDATE' });
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Moov Adapter
// ---------------------------------------------------------------------------

describe('MoovAchAdapter', () => {
  const adapter = new MoovAchAdapter();

  it('parses transfer.completed webhook', () => {
    const payload = {
      eventType: 'transfer.completed',
      data: {
        transfer: {
          transferID: 'moov_tf_456',
          amount: { value: 250000, currency: 'USD' },
          status: 'completed',
          source: {
            paymentMethodType: 'ach-debit-fund',
            achDetails: {
              secCode: 'ppd',
              traceNumber: '123456789012345',
              companyName: 'Acme Corp',
              companyEntryDescription: 'PAYROLL',
              routingNumber: '021000021',
            },
          },
          createdOn: '2026-03-18T10:00:00Z',
        },
      },
    };

    const events = adapter.parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0]!.transferId).toBe('moov_tf_456');
    expect(events[0]!.amount).toBe('2500.00');
    expect(events[0]!.direction).toBe('debit');
    expect(events[0]!.status).toBe('settled');
    expect(events[0]!.secCode).toBe('PPD');
    expect(events[0]!.originatorName).toBe('Acme Corp');
    expect(events[0]!.traceNumber).toBe('123456789012345');
    expect(events[0]!.provider).toBe('moov');
  });

  it('returns empty for non-transfer events', () => {
    const events = adapter.parseWebhook({ eventType: 'account.created' });
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Stripe Treasury Adapter
// ---------------------------------------------------------------------------

describe('StripeTreasuryAchAdapter', () => {
  const adapter = new StripeTreasuryAchAdapter();

  it('parses treasury.received_credit webhook', () => {
    const payload = {
      type: 'treasury.received_credit',
      data: {
        object: {
          id: 'rc_stripe_789',
          amount: 1500000,
          currency: 'usd',
          status: 'succeeded',
          linked_flows: {
            source_flow_details: {
              type: 'ach',
              ach_details: {
                routing_number: '021000021',
                originator_company_name: 'Acme Corp',
                sec: 'ccd',
                trace_number: '999888777666555',
              },
            },
          },
          created: 1710756000,
        },
      },
    };

    const events = adapter.parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0]!.transferId).toBe('rc_stripe_789');
    expect(events[0]!.amount).toBe('15000.00');
    expect(events[0]!.direction).toBe('credit');
    expect(events[0]!.status).toBe('settled');
    expect(events[0]!.originatorName).toBe('Acme Corp');
    expect(events[0]!.secCode).toBe('CCD');
    expect(events[0]!.provider).toBe('stripe_treasury');
  });

  it('returns empty for non-ACH flows', () => {
    const payload = {
      type: 'treasury.received_credit',
      data: {
        object: {
          id: 'rc_wire',
          amount: 100000,
          currency: 'usd',
          status: 'succeeded',
          linked_flows: {
            source_flow_details: {
              type: 'us_domestic_wire',
            },
          },
          created: 1710756000,
        },
      },
    };
    const events = adapter.parseWebhook(payload);
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Modern Treasury Adapter
// ---------------------------------------------------------------------------

describe('ModernTreasuryAchAdapter', () => {
  const adapter = new ModernTreasuryAchAdapter();

  it('parses payment_order.completed webhook', () => {
    const payload = {
      event: 'payment_order.completed',
      data: {
        id: 'mt_po_abc',
        amount: 500000,
        currency: 'USD',
        direction: 'credit',
        status: 'completed',
        type: 'ach',
        subtype: 'ccd',
        reference_numbers: [
          { reference_number: '111222333444555', reference_number_type: 'ach_trace_number' },
        ],
        created_at: '2026-03-18T10:00:00Z',
      },
    };

    const events = adapter.parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0]!.transferId).toBe('mt_po_abc');
    expect(events[0]!.amount).toBe('5000.00');
    expect(events[0]!.direction).toBe('credit');
    expect(events[0]!.secCode).toBe('CCD');
    expect(events[0]!.traceNumber).toBe('111222333444555');
    expect(events[0]!.provider).toBe('modern_treasury');
  });

  it('returns empty for non-ACH payment orders', () => {
    const payload = {
      event: 'payment_order.completed',
      data: {
        id: 'mt_wire',
        amount: 100000,
        currency: 'USD',
        direction: 'credit',
        status: 'completed',
        type: 'wire',
        created_at: '2026-03-18T10:00:00Z',
      },
    };
    const events = adapter.parseWebhook(payload);
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Column Adapter
// ---------------------------------------------------------------------------

describe('ColumnAchAdapter', () => {
  const adapter = new ColumnAchAdapter();

  it('parses ach.outgoing_transfer.completed webhook', () => {
    const payload = {
      type: 'ach.outgoing_transfer.completed',
      data: {
        id: 'col_tf_123',
        amount: 750000,
        currency_code: 'USD',
        type: 'credit',
        status: 'completed',
        routing_number: '021000021',
        originator_name: 'Acme Corp',
        originator_identification: '1234567890',
        sec_code: 'ccd',
        trace_number: '555444333222111',
        company_entry_description: 'VENDOR PMT',
        same_day: true,
        counterparty_name: 'Vendor Inc',
        counterparty_routing_number: '011401533',
        created_at: '2026-03-18T10:00:00Z',
      },
    };

    const events = adapter.parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0]!.transferId).toBe('col_tf_123');
    expect(events[0]!.amount).toBe('7500.00');
    expect(events[0]!.direction).toBe('credit');
    expect(events[0]!.originatorName).toBe('Acme Corp');
    expect(events[0]!.originatorId).toBe('1234567890');
    expect(events[0]!.secCode).toBe('CCD');
    expect(events[0]!.sameDay).toBe(true);
    expect(events[0]!.counterpartyName).toBe('Vendor Inc');
    expect(events[0]!.provider).toBe('column');
  });

  it('returns empty for non-ACH events', () => {
    const events = adapter.parseWebhook({ type: 'wire.transfer.completed', data: {} });
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AchMonitor
// ---------------------------------------------------------------------------

describe('AchMonitor', () => {
  it('processes webhook events and calls verify', async () => {
    const mockKontext = createMockKontext();
    const adapter = new PlaidAchAdapter();
    const monitor = new AchMonitor(
      mockKontext,
      {
        provider: 'plaid',
        providerConfig: {},
      },
      adapter,
      { agentId: 'test-ach-monitor' },
    );

    const payload = {
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      new_transfer_events: [
        {
          event_id: 1,
          transfer_id: 'tf_test_1',
          transfer_type: 'credit',
          transfer_amount: '5000.00',
          transfer_status: 'posted',
          ach_class: 'ccd',
          timestamp: '2026-03-18T10:00:00Z',
        },
      ],
    };

    const results = await monitor.handleWebhook(payload);
    expect(results).toHaveLength(1);
    expect(results[0]!.compliant).toBe(true);
    expect(mockKontext.verified).toHaveLength(1);
    expect(mockKontext.verified[0]!.paymentMethod).toBe('ach');
    expect(mockKontext.verified[0]!.achSecCode).toBe('CCD');
    expect(mockKontext.verified[0]!.agentId).toBe('test-ach-monitor');
  });

  it('deduplicates events by transferId', async () => {
    const mockKontext = createMockKontext();
    const adapter = new PlaidAchAdapter();
    const monitor = new AchMonitor(
      mockKontext,
      {
        provider: 'plaid',
        providerConfig: {},
      },
      adapter,
    );

    const payload = {
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      new_transfer_events: [
        {
          event_id: 1,
          transfer_id: 'tf_dedup',
          transfer_type: 'credit',
          transfer_amount: '1000.00',
          transfer_status: 'posted',
          timestamp: '2026-03-18T10:00:00Z',
        },
      ],
    };

    // First call should process
    await monitor.handleWebhook(payload);
    expect(mockKontext.verified).toHaveLength(1);

    // Second call should be deduped
    await monitor.handleWebhook(payload);
    expect(mockKontext.verified).toHaveLength(1);
  });

  it('filters events below minimumAmount', async () => {
    const mockKontext = createMockKontext();
    const adapter = new PlaidAchAdapter();
    const monitor = new AchMonitor(
      mockKontext,
      {
        provider: 'plaid',
        providerConfig: {},
        minimumAmount: '1000',
      },
      adapter,
    );

    const payload = {
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      new_transfer_events: [
        {
          event_id: 1,
          transfer_id: 'tf_small',
          transfer_type: 'credit',
          transfer_amount: '500.00',
          transfer_status: 'posted',
          timestamp: '2026-03-18T10:00:00Z',
        },
        {
          event_id: 2,
          transfer_id: 'tf_large',
          transfer_type: 'credit',
          transfer_amount: '5000.00',
          transfer_status: 'posted',
          timestamp: '2026-03-18T10:00:00Z',
        },
      ],
    };

    const results = await monitor.handleWebhook(payload);
    expect(results).toHaveLength(1);
    expect(mockKontext.verified).toHaveLength(1);
    expect(mockKontext.verified[0]!.amount).toBe('5000.00');
  });

  it('skips verify when autoVerify is false', async () => {
    const mockKontext = createMockKontext();
    const adapter = new PlaidAchAdapter();
    const monitor = new AchMonitor(
      mockKontext,
      {
        provider: 'plaid',
        providerConfig: {},
        autoVerify: false,
      },
      adapter,
    );

    const payload = {
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      new_transfer_events: [
        {
          event_id: 1,
          transfer_id: 'tf_no_verify',
          transfer_type: 'credit',
          transfer_amount: '5000.00',
          transfer_status: 'posted',
          timestamp: '2026-03-18T10:00:00Z',
        },
      ],
    };

    const results = await monitor.handleWebhook(payload);
    expect(results).toHaveLength(0);
    expect(mockKontext.verified).toHaveLength(0);
  });

  it('markVerified prevents future processing', async () => {
    const mockKontext = createMockKontext();
    const adapter = new PlaidAchAdapter();
    const monitor = new AchMonitor(
      mockKontext,
      { provider: 'plaid', providerConfig: {} },
      adapter,
    );

    monitor.markVerified('tf_pre_marked');

    const payload = {
      webhook_type: 'TRANSFER',
      webhook_code: 'TRANSFER_EVENTS_UPDATE',
      new_transfer_events: [
        {
          event_id: 1,
          transfer_id: 'tf_pre_marked',
          transfer_type: 'credit',
          transfer_amount: '5000.00',
          transfer_status: 'posted',
          timestamp: '2026-03-18T10:00:00Z',
        },
      ],
    };

    const results = await monitor.handleWebhook(payload);
    expect(results).toHaveLength(0);
    expect(mockKontext.verified).toHaveLength(0);
  });
});
