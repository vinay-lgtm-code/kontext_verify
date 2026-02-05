// ============================================================================
// Kontext SDK - Public API
// ============================================================================

// Main client
export { Kontext } from './client.js';

// All types
export type {
  // Config
  KontextConfig,
  KontextMode,
  Environment,

  // Actions & Logging
  ActionLog,
  LogActionInput,
  LogTransactionInput,
  TransactionRecord,
  Chain,
  Token,

  // Tasks
  Task,
  TaskStatus,
  CreateTaskInput,
  ConfirmTaskInput,
  TaskEvidence,

  // Audit & Export
  ExportOptions,
  ExportResult,
  ExportFormat,
  ReportOptions,
  ReportType,
  ComplianceReport,
  DateRange,

  // SAR/CTR Report Templates
  SARReport,
  CTRReport,
  ReportSubject,

  // Trust Scoring
  TrustScore,
  TrustFactor,
  TransactionEvaluation,
  RiskFactor,

  // Anomaly Detection
  AnomalyDetectionConfig,
  AnomalyThresholds,
  AnomalyEvent,
  AnomalyCallback,
  AnomalyRuleType,
  AnomalySeverity,

  // USDC Integration
  UsdcComplianceCheck,
  ComplianceCheckResult,
} from './types.js';

// Error types
export { KontextError, KontextErrorCode } from './types.js';

// Digest Chain
export { DigestChain, verifyExportedChain } from './digest.js';
export type { DigestLink, DigestVerification, PrecisionTimestamp } from './digest.js';

// USDC Integration (for direct use)
export { UsdcCompliance } from './integrations/usdc.js';

// CCTP Integration (Cross-Chain Transfer Protocol)
export { CCTPTransferManager } from './integrations/cctp.js';
export type {
  CrossChainTransfer,
  InitiateCCTPTransferInput,
  CCTPAttestationInput,
  ConfirmCCTPTransferInput,
  CCTPValidationResult,
  CCTPValidationCheck,
  CrossChainAuditEntry,
  CCTPMessageStatus,
} from './integrations/cctp.js';

// Webhook Manager
export { WebhookManager } from './webhooks.js';
export type {
  WebhookConfig,
  RegisterWebhookInput,
  WebhookEventType,
  WebhookPayload,
  WebhookDeliveryResult,
  WebhookRetryConfig,
} from './webhooks.js';
