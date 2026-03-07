import type { StageEvent, StageName } from '@kontext/core';
import type { ProviderAdapter } from './types.js';

interface CircleWalletEvent {
  type: 'prepare' | 'transmit' | 'confirm' | 'recipient_credit' | 'failed';
  transferId?: string;
  transactionHash?: string;
  status?: string;
  error?: string;
  timestamp?: string;
}

/** Circle Programmable Wallets adapter */
export class CircleAdapter implements ProviderAdapter {
  readonly name = 'circle';
  readonly supportedStages: readonly StageName[] = ['prepare', 'transmit', 'confirm', 'recipient_credit'];

  normalizeEvent(providerEvent: unknown): StageEvent {
    const event = providerEvent as CircleWalletEvent;
    const timestamp = event.timestamp ?? new Date().toISOString();

    switch (event.type) {
      case 'prepare':
        return {
          stage: 'prepare',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'CIRCLE_TX_PREPARED',
          message: `Circle transfer prepared: ${event.transferId ?? 'unknown'}`,
          timestamp,
          payload: { transferId: event.transferId },
        };

      case 'transmit':
        return {
          stage: 'transmit',
          status: 'succeeded',
          actorSide: 'provider',
          code: 'CIRCLE_TX_SUBMITTED',
          message: `Circle transfer submitted: ${event.transactionHash ?? 'pending'}`,
          timestamp,
          payload: { transferId: event.transferId, transactionHash: event.transactionHash },
        };

      case 'confirm':
        return {
          stage: 'confirm',
          status: 'succeeded',
          actorSide: 'network',
          code: 'CIRCLE_TX_CONFIRMED',
          message: `Circle transfer confirmed on-chain`,
          timestamp,
          payload: { transactionHash: event.transactionHash },
        };

      case 'recipient_credit':
        return {
          stage: 'recipient_credit',
          status: 'succeeded',
          actorSide: 'recipient',
          code: 'CIRCLE_CREDITED',
          message: 'Recipient wallet credited via Circle',
          timestamp,
          payload: { transferId: event.transferId },
        };

      case 'failed':
        return {
          stage: 'transmit',
          status: 'failed',
          actorSide: 'provider',
          code: 'CIRCLE_TX_FAILED',
          message: event.error ?? 'Circle transfer failed',
          timestamp,
          payload: { error: event.error, transferId: event.transferId },
        };

      default:
        throw new Error(`Unknown Circle event type: ${(event as CircleWalletEvent).type}`);
    }
  }
}
