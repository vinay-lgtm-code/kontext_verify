import type { StageEvent, StageName } from '@kontext/core';
import type { ProviderAdapter } from './types.js';

/** Modern Treasury webhook event types */
interface ModernTreasuryEvent {
  type: 'payment_order.created' | 'payment_order.approved' | 'payment_order.processing' | 'payment_order.completed' | 'payment_order.failed' | 'payment_order.returned' | 'reconciliation.completed' | 'reconciliation.failed';
  paymentOrderId?: string;
  ledgerTransactionId?: string;
  counterpartyId?: string;
  amount?: number;
  currency?: string;
  direction?: 'credit' | 'debit';
  status?: string;
  error?: string;
  referenceNumber?: string;
  timestamp?: string;
}

/** Modern Treasury adapter — normalizes MT events into StageEvents */
export class ModernTreasuryAdapter implements ProviderAdapter {
  readonly name = 'modern-treasury';
  readonly supportedStages: readonly StageName[] = ['prepare', 'transmit', 'confirm', 'recipient_credit', 'reconcile'];

  normalizeEvent(providerEvent: unknown): StageEvent {
    const event = providerEvent as ModernTreasuryEvent;
    const timestamp = event.timestamp ?? new Date().toISOString();

    switch (event.type) {
      case 'payment_order.created':
        return {
          stage: 'prepare',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'MT_ORDER_CREATED',
          message: `Payment order created: ${event.paymentOrderId ?? 'unknown'}`,
          timestamp,
          payload: {
            paymentOrderId: event.paymentOrderId,
            amount: event.amount,
            currency: event.currency,
            direction: event.direction,
            counterpartyId: event.counterpartyId,
          },
        };

      case 'payment_order.approved':
        return {
          stage: 'prepare',
          status: 'succeeded',
          actorSide: 'internal',
          code: 'MT_ORDER_APPROVED',
          message: `Payment order approved: ${event.paymentOrderId ?? 'unknown'}`,
          timestamp,
          payload: { paymentOrderId: event.paymentOrderId },
        };

      case 'payment_order.processing':
        return {
          stage: 'transmit',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'MT_ORDER_PROCESSING',
          message: `Payment order processing: ${event.paymentOrderId ?? 'unknown'}`,
          timestamp,
          payload: { paymentOrderId: event.paymentOrderId, referenceNumber: event.referenceNumber },
        };

      case 'payment_order.completed':
        return {
          stage: 'confirm',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'MT_ORDER_COMPLETED',
          message: `Payment order completed: ${event.paymentOrderId ?? 'unknown'}`,
          timestamp,
          payload: { paymentOrderId: event.paymentOrderId, referenceNumber: event.referenceNumber },
        };

      case 'payment_order.failed':
        return {
          stage: 'transmit',
          status: 'failed',
          actorSide: 'provider',
          code: 'MT_ORDER_FAILED',
          message: event.error ?? `Payment order failed: ${event.paymentOrderId ?? 'unknown'}`,
          timestamp,
          payload: { paymentOrderId: event.paymentOrderId, error: event.error },
        };

      case 'payment_order.returned':
        return {
          stage: 'retry_or_refund',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'MT_ORDER_RETURNED',
          message: `Payment order returned: ${event.paymentOrderId ?? 'unknown'}`,
          timestamp,
          payload: { paymentOrderId: event.paymentOrderId, error: event.error },
        };

      case 'reconciliation.completed':
        return {
          stage: 'reconcile',
          status: 'succeeded',
          actorSide: 'internal',
          code: 'MT_RECONCILED',
          message: `Reconciliation completed: ${event.ledgerTransactionId ?? 'unknown'}`,
          timestamp,
          payload: { ledgerTransactionId: event.ledgerTransactionId, paymentOrderId: event.paymentOrderId },
        };

      case 'reconciliation.failed':
        return {
          stage: 'reconcile',
          status: 'failed',
          actorSide: 'internal',
          code: 'MT_RECONCILIATION_FAILED',
          message: event.error ?? 'Reconciliation failed — ERP not synced',
          timestamp,
          payload: { ledgerTransactionId: event.ledgerTransactionId, error: event.error },
        };

      default:
        throw new Error(`Unknown Modern Treasury event type: ${(event as ModernTreasuryEvent).type}`);
    }
  }
}
