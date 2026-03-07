import type { StageEvent, StageName, Chain } from '@kontext/core';

/** Provider adapter interface — normalizes provider events into StageEvents */
export interface ProviderAdapter {
  readonly name: string;
  readonly supportedStages: readonly StageName[];
  normalizeEvent(providerEvent: unknown): StageEvent;
}

/** Configuration for RPC confirmation tracking */
export interface RPCConfirmationConfig {
  chain: Chain;
  rpcUrl: string;
  confirmations?: number;
  pollIntervalMs?: number;
}

/** Result of a confirmation check */
export interface ConfirmationResult {
  confirmed: boolean;
  blockNumber?: number;
  confirmations: number;
  failed?: boolean;
  failureReason?: string;
}

/** Generic provider event wrapper */
export interface ProviderEventEnvelope {
  provider: string;
  eventType: string;
  eventId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
