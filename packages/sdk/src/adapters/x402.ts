import type { StageEvent, StageName } from '@kontext/core';
import type { ProviderAdapter } from './types.js';

interface X402Event {
  type: 'intent' | 'authorize' | 'transmit' | 'confirm' | 'failed';
  paymentHash?: string;
  amount?: string;
  resource?: string;
  error?: string;
  timestamp?: string;
}

/** x402 micropayment callback adapter */
export class X402Adapter implements ProviderAdapter {
  readonly name = 'x402';
  readonly supportedStages: readonly StageName[] = ['intent', 'authorize', 'transmit', 'confirm'];

  normalizeEvent(providerEvent: unknown): StageEvent {
    const event = providerEvent as X402Event;
    const timestamp = event.timestamp ?? new Date().toISOString();

    switch (event.type) {
      case 'intent':
        return {
          stage: 'intent',
          status: 'succeeded',
          actorSide: 'sender',
          code: 'X402_PAYMENT_REQUIRED',
          message: `x402 payment required for ${event.resource ?? 'resource'}`,
          timestamp,
          payload: { resource: event.resource, amount: event.amount },
        };

      case 'authorize':
        return {
          stage: 'authorize',
          status: 'succeeded',
          actorSide: 'internal',
          code: 'X402_AUTHORIZED',
          message: 'x402 micropayment authorized',
          timestamp,
          payload: { amount: event.amount },
        };

      case 'transmit':
        return {
          stage: 'transmit',
          status: 'succeeded',
          actorSide: 'network',
          code: 'X402_TX_BROADCAST',
          message: `x402 payment broadcast: ${event.paymentHash ?? 'unknown'}`,
          timestamp,
          payload: { paymentHash: event.paymentHash },
        };

      case 'confirm':
        return {
          stage: 'confirm',
          status: 'succeeded',
          actorSide: 'network',
          code: 'X402_TX_CONFIRMED',
          message: 'x402 payment confirmed, resource unlocked',
          timestamp,
          payload: { paymentHash: event.paymentHash, resource: event.resource },
        };

      case 'failed':
        return {
          stage: 'transmit',
          status: 'failed',
          actorSide: 'network',
          code: 'X402_FAILED',
          message: event.error ?? 'x402 payment failed',
          timestamp,
          payload: { error: event.error },
        };

      default:
        throw new Error(`Unknown x402 event type: ${(event as X402Event).type}`);
    }
  }
}
