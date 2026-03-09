import { describe, it, expect } from 'vitest';
import { BridgeAdapter } from '../src/adapters/bridge.js';

describe('BridgeAdapter', () => {
  const adapter = new BridgeAdapter();

  it('has correct name and supported stages', () => {
    expect(adapter.name).toBe('bridge');
    expect(adapter.supportedStages).toContain('prepare');
    expect(adapter.supportedStages).toContain('recipient_credit');
  });

  it('normalizes quote.created to prepare stage', () => {
    const event = adapter.normalizeEvent({
      type: 'quote.created',
      quoteId: 'qt_123',
      amount: '5000',
      currency: 'USD',
      destinationCurrency: 'USDC',
      timestamp: '2026-03-08T00:00:00.000Z',
    });

    expect(event.stage).toBe('prepare');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('BRIDGE_QUOTE_CREATED');
    expect(event.payload?.['quoteId']).toBe('qt_123');
  });

  it('normalizes transfer.initiated to transmit stage', () => {
    const event = adapter.normalizeEvent({
      type: 'transfer.initiated',
      transferId: 'tf_456',
      quoteId: 'qt_123',
    });

    expect(event.stage).toBe('transmit');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('BRIDGE_TRANSFER_INITIATED');
  });

  it('normalizes transfer.completed to confirm stage', () => {
    const event = adapter.normalizeEvent({
      type: 'transfer.completed',
      transferId: 'tf_456',
      transactionHash: '0xabc123',
    });

    expect(event.stage).toBe('confirm');
    expect(event.status).toBe('succeeded');
    expect(event.payload?.['transactionHash']).toBe('0xabc123');
  });

  it('normalizes transfer.failed to transmit failed', () => {
    const event = adapter.normalizeEvent({
      type: 'transfer.failed',
      transferId: 'tf_456',
      error: 'Insufficient funds',
    });

    expect(event.stage).toBe('transmit');
    expect(event.status).toBe('failed');
    expect(event.code).toBe('BRIDGE_TRANSFER_FAILED');
    expect(event.message).toBe('Insufficient funds');
  });

  it('normalizes payout.completed to recipient_credit', () => {
    const event = adapter.normalizeEvent({
      type: 'payout.completed',
      payoutId: 'po_789',
      transferId: 'tf_456',
    });

    expect(event.stage).toBe('recipient_credit');
    expect(event.status).toBe('succeeded');
    expect(event.code).toBe('BRIDGE_PAYOUT_COMPLETED');
  });

  it('normalizes payout.failed to recipient_credit failed', () => {
    const event = adapter.normalizeEvent({
      type: 'payout.failed',
      payoutId: 'po_789',
      error: 'Bank rejected',
    });

    expect(event.stage).toBe('recipient_credit');
    expect(event.status).toBe('failed');
    expect(event.code).toBe('BRIDGE_PAYOUT_FAILED');
  });

  it('throws on unknown event type', () => {
    expect(() => adapter.normalizeEvent({ type: 'unknown' })).toThrow(/Unknown Bridge event/);
  });
});
