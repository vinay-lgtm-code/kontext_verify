import type { StageEvent, StageName } from '@kontext/core';
import type { ProviderAdapter } from './types.js';

interface EVMTransactionEvent {
  type: 'prepare' | 'transmit' | 'confirm' | 'failed';
  txHash?: string;
  blockNumber?: number;
  confirmations?: number;
  gasEstimate?: string;
  error?: string;
  timestamp?: string;
}

/** EVM wallet adapter — normalizes MetaMask/viem events for Base + Ethereum */
export class EVMAdapter implements ProviderAdapter {
  readonly name = 'evm';
  readonly supportedStages: readonly StageName[] = ['prepare', 'transmit', 'confirm'];

  normalizeEvent(providerEvent: unknown): StageEvent {
    const event = providerEvent as EVMTransactionEvent;
    const timestamp = event.timestamp ?? new Date().toISOString();

    switch (event.type) {
      case 'prepare':
        return {
          stage: 'prepare',
          status: 'succeeded',
          actorSide: 'sender',
          code: 'TX_PREPARED',
          message: `Gas estimated: ${event.gasEstimate ?? 'unknown'}`,
          timestamp,
          payload: { gasEstimate: event.gasEstimate },
        };

      case 'transmit':
        return {
          stage: 'transmit',
          status: 'succeeded',
          actorSide: 'network',
          code: 'TX_BROADCAST',
          message: `Transaction broadcast: ${event.txHash ?? 'unknown'}`,
          timestamp,
          payload: { txHash: event.txHash },
        };

      case 'confirm':
        return {
          stage: 'confirm',
          status: 'succeeded',
          actorSide: 'network',
          code: 'TX_CONFIRMED',
          message: `Confirmed in block ${event.blockNumber ?? '?'} (${event.confirmations ?? 0} confirmations)`,
          timestamp,
          payload: {
            txHash: event.txHash,
            blockNumber: event.blockNumber,
            confirmations: event.confirmations,
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
          payload: { error: event.error, txHash: event.txHash },
        };

      default:
        throw new Error(`Unknown EVM event type: ${(event as EVMTransactionEvent).type}`);
    }
  }
}
