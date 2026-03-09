import type { StageEvent, StageName } from '@kontext/core';
import type { ProviderAdapter } from './types.js';

/** Bridge.xyz webhook event types */
interface BridgeEvent {
  type: 'quote.created' | 'transfer.initiated' | 'transfer.completed' | 'transfer.failed' | 'payout.completed' | 'payout.failed';
  quoteId?: string;
  transferId?: string;
  payoutId?: string;
  amount?: string;
  currency?: string;
  destinationCurrency?: string;
  status?: string;
  error?: string;
  transactionHash?: string;
  timestamp?: string;
}

/** Bridge.xyz adapter — normalizes Bridge payment events into StageEvents */
export class BridgeAdapter implements ProviderAdapter {
  readonly name = 'bridge';
  readonly supportedStages: readonly StageName[] = ['prepare', 'transmit', 'confirm', 'recipient_credit'];

  normalizeEvent(providerEvent: unknown): StageEvent {
    const event = providerEvent as BridgeEvent;
    const timestamp = event.timestamp ?? new Date().toISOString();

    switch (event.type) {
      case 'quote.created':
        return {
          stage: 'prepare',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'BRIDGE_QUOTE_CREATED',
          message: `Bridge quote created: ${event.quoteId ?? 'unknown'}`,
          timestamp,
          payload: {
            quoteId: event.quoteId,
            amount: event.amount,
            currency: event.currency,
            destinationCurrency: event.destinationCurrency,
          },
        };

      case 'transfer.initiated':
        return {
          stage: 'transmit',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'BRIDGE_TRANSFER_INITIATED',
          message: `Bridge transfer initiated: ${event.transferId ?? 'unknown'}`,
          timestamp,
          payload: { transferId: event.transferId, quoteId: event.quoteId },
        };

      case 'transfer.completed':
        return {
          stage: 'confirm',
          status: 'succeeded',
          actorSide: 'network',
          code: 'BRIDGE_TRANSFER_COMPLETED',
          message: 'Bridge transfer completed on-chain',
          timestamp,
          payload: { transferId: event.transferId, transactionHash: event.transactionHash },
        };

      case 'transfer.failed':
        return {
          stage: 'transmit',
          status: 'failed',
          actorSide: 'provider',
          code: 'BRIDGE_TRANSFER_FAILED',
          message: event.error ?? 'Bridge transfer failed',
          timestamp,
          payload: { transferId: event.transferId, error: event.error },
        };

      case 'payout.completed':
        return {
          stage: 'recipient_credit',
          status: 'succeeded',
          actorSide: 'recipient',
          code: 'BRIDGE_PAYOUT_COMPLETED',
          message: `Bridge payout completed: ${event.payoutId ?? 'unknown'}`,
          timestamp,
          payload: { payoutId: event.payoutId, transferId: event.transferId },
        };

      case 'payout.failed':
        return {
          stage: 'recipient_credit',
          status: 'failed',
          actorSide: 'provider',
          code: 'BRIDGE_PAYOUT_FAILED',
          message: event.error ?? 'Bridge payout failed — recipient not credited',
          timestamp,
          payload: { payoutId: event.payoutId, error: event.error },
        };

      default:
        throw new Error(`Unknown Bridge event type: ${(event as BridgeEvent).type}`);
    }
  }
}
