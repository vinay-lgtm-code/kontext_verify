import { describe, it, expect } from 'vitest';
import { ModernTreasuryAdapter } from '../src/adapters/modern-treasury.js';

describe('ModernTreasuryAdapter', () => {
  const adapter = new ModernTreasuryAdapter();

  it('has correct name and supported stages', () => {
    expect(adapter.name).toBe('modern-treasury');
    expect(adapter.supportedStages).toContain('prepare');
    expect(adapter.supportedStages).toContain('reconcile');
  });

  it('normalizes payment_order.created to prepare', () => {
    const event = adapter.normalizeEvent({
      type: 'payment_order.created',
      paymentOrderId: 'po_123',
      amount: 5000,
      currency: 'USD',
      direction: 'credit',
      counterpartyId: 'cp_456',
    });

    expect(event.stage).toBe('prepare');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('MT_ORDER_CREATED');
    expect(event.payload?.['amount']).toBe(5000);
    expect(event.payload?.['direction']).toBe('credit');
  });

  it('normalizes payment_order.approved to prepare (internal)', () => {
    const event = adapter.normalizeEvent({
      type: 'payment_order.approved',
      paymentOrderId: 'po_123',
    });

    expect(event.stage).toBe('prepare');
    expect(event.actorSide).toBe('internal');
    expect(event.code).toBe('MT_ORDER_APPROVED');
  });

  it('normalizes payment_order.processing to transmit', () => {
    const event = adapter.normalizeEvent({
      type: 'payment_order.processing',
      paymentOrderId: 'po_123',
      referenceNumber: 'REF-789',
    });

    expect(event.stage).toBe('transmit');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('MT_ORDER_PROCESSING');
  });

  it('normalizes payment_order.completed to confirm', () => {
    const event = adapter.normalizeEvent({
      type: 'payment_order.completed',
      paymentOrderId: 'po_123',
    });

    expect(event.stage).toBe('confirm');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('MT_ORDER_COMPLETED');
  });

  it('normalizes payment_order.failed to transmit failed', () => {
    const event = adapter.normalizeEvent({
      type: 'payment_order.failed',
      paymentOrderId: 'po_123',
      error: 'ACH return',
    });

    expect(event.stage).toBe('transmit');
    expect(event.status).toBe('failed');
    expect(event.message).toBe('ACH return');
  });

  it('normalizes payment_order.returned to retry_or_refund', () => {
    const event = adapter.normalizeEvent({
      type: 'payment_order.returned',
      paymentOrderId: 'po_123',
    });

    expect(event.stage).toBe('retry_or_refund');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('MT_ORDER_RETURNED');
  });

  it('normalizes reconciliation.completed to reconcile', () => {
    const event = adapter.normalizeEvent({
      type: 'reconciliation.completed',
      ledgerTransactionId: 'lt_abc',
      paymentOrderId: 'po_123',
    });

    expect(event.stage).toBe('reconcile');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('MT_RECONCILED');
  });

  it('normalizes reconciliation.failed to reconcile failed', () => {
    const event = adapter.normalizeEvent({
      type: 'reconciliation.failed',
      ledgerTransactionId: 'lt_abc',
      error: 'ERP sync timeout',
    });

    expect(event.stage).toBe('reconcile');
    expect(event.status).toBe('failed');
    expect(event.code).toBe('MT_RECONCILIATION_FAILED');
    expect(event.message).toBe('ERP sync timeout');
  });

  it('throws on unknown event type', () => {
    expect(() => adapter.normalizeEvent({ type: 'unknown' })).toThrow(/Unknown Modern Treasury event/);
  });
});
