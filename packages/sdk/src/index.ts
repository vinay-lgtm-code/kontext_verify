// ============================================================================
// Kontext SDK - Public API (v1 — Payment Control Plane)
// ============================================================================

// Main client
export { Kontext } from './client.js';
export type { KontextConfig, ConfirmationData, CreditEvidence, RefundData } from './client.js';

// Re-export core types for convenience
export type {
  PaymentAttempt,
  StageEvent,
  StageName,
  ActorSide,
  FinalState,
  Archetype,
  SettlementAsset,
  StartAttemptInput,
  AttemptFilter,
  Chain,
  PaymentReceipt,
  AuthorizePaymentInput,
  PaymentPolicy,
  WorkspaceProfile,
  PolicyPosture,
  StorageAdapter,
} from '@kontext/core';

export {
  AttemptLedger,
  ReceiptLedger,
  MemoryStorage,
  FileStorage,
  STAGE_ORDER,
  defaultWorkspaceProfile,
  validateWorkspaceProfile,
  PAYMENT_PRESETS,
  getPreset,
  mergeWithPreset,
} from '@kontext/core';

// Digest Chain (tamper-evident, patented)
export { DigestChain, verifyExportedChain } from './digest.js';
export type { DigestLink, DigestVerification, PrecisionTimestamp } from './digest.js';

// ERC-8021 Transaction Attribution
export { encodeERC8021Suffix, parseERC8021Suffix, fetchTransactionAttribution, KONTEXT_BUILDER_CODE } from './integrations/erc8021.js';

// x402 Client
export { createX402Fetch } from './integrations/x402-client.js';
export type { X402ClientConfig, X402FetchHandler } from './integrations/x402-client.js';

// Provider adapters
export { EVMAdapter, SolanaAdapter, CircleAdapter, X402Adapter } from './adapters/index.js';
export type { ProviderAdapter, RPCConfirmationConfig, ConfirmationResult, ProviderEventEnvelope } from './adapters/index.js';

// Utilities
export { generateId, now, parseAmount } from './utils.js';
