import type { StageEvent, StageName } from '@kontext/core';
import type { ProviderAdapter } from './types.js';

interface SolanaTransactionEvent {
  type: 'prepare' | 'transmit' | 'confirm' | 'failed';
  signature?: string;
  slot?: number;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  error?: string;
  timestamp?: string;
}

/** Solana wallet adapter — normalizes @solana/web3.js events */
export class SolanaAdapter implements ProviderAdapter {
  readonly name = 'solana';
  readonly supportedStages: readonly StageName[] = ['prepare', 'transmit', 'confirm'];

  normalizeEvent(providerEvent: unknown): StageEvent {
    const event = providerEvent as SolanaTransactionEvent;
    const timestamp = event.timestamp ?? new Date().toISOString();

    switch (event.type) {
      case 'prepare':
        return {
          stage: 'prepare',
          status: 'succeeded',
          actorSide: 'sender',
          code: 'TX_PREPARED',
          message: 'Solana transaction prepared',
          timestamp,
        };

      case 'transmit':
        return {
          stage: 'transmit',
          status: 'succeeded',
          actorSide: 'network',
          code: 'TX_BROADCAST',
          message: `Transaction sent: ${event.signature ?? 'unknown'}`,
          timestamp,
          payload: { signature: event.signature },
        };

      case 'confirm':
        return {
          stage: 'confirm',
          status: 'succeeded',
          actorSide: 'network',
          code: 'TX_CONFIRMED',
          message: `Confirmed at slot ${event.slot ?? '?'} (${event.confirmationStatus ?? 'unknown'})`,
          timestamp,
          payload: {
            signature: event.signature,
            slot: event.slot,
            confirmationStatus: event.confirmationStatus,
          },
        };

      case 'failed':
        return {
          stage: 'transmit',
          status: 'failed',
          actorSide: 'network',
          code: 'TX_FAILED',
          message: event.error ?? 'Transaction failed',
          timestamp,
          payload: { error: event.error },
        };

      default:
        throw new Error(`Unknown Solana event type: ${(event as SolanaTransactionEvent).type}`);
    }
  }
}
