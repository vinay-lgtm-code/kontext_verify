// Types — legacy (receipt/policy)
export type {
  Chain,
  Token,
  PaymentType,
  Severity,
  AuthorizationDecision,
  AuthorizationCheck,
  PolicyViolation,
  RequiredAction,
  AuthorizePaymentInput,
  PaymentReceipt,
  StoredReceipt,
  DigestVerification,
  PaymentPolicy,
  KontextBaseConfig,
  RuntimeEnvironment,
  ExplainResult,
  AuditReport,
  EvaluatePolicyResult,
} from './types.js';

// Types — v1 PaymentAttempt model
export type {
  StageName,
  ActorSide,
  FinalState,
  Archetype,
  SettlementAsset,
  StageEvent,
  PaymentAttempt,
  StartAttemptInput,
  AttemptFilter,
} from './types.js';

// Receipt ledger (legacy, still used by authorize stage)
export { ReceiptLedger } from './ledger.js';

// Attempt ledger (v1)
export { AttemptLedger, STAGE_ORDER } from './attempt-ledger.js';

// Policy engine
export { evaluatePolicy, receiptToStageEvent } from './policy.js';

// Storage
export { FileStorage, MemoryStorage } from './storage.js';
export type { StorageAdapter } from './storage.js';

// Presets
export { getPreset, mergeWithPreset, PAYMENT_PRESETS } from './presets.js';

// Workspace profile
export { validateWorkspaceProfile, defaultWorkspaceProfile } from './profile.js';
export type { WorkspaceProfile, PolicyPosture } from './profile.js';

// Digest chain
export { verifyReceiptChain, GENESIS_HASH } from './digest.js';

// Utilities
export { generateId, nowIso, parseAmount, sha256, stableStringify } from './utils.js';
