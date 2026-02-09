// ============================================================================
// Kontext SDK - Public API
// ============================================================================

// Main client
export { Kontext } from './client.js';

// Storage adapters
export { MemoryStorage, FileStorage } from './storage.js';
export type { StorageAdapter } from './storage.js';

// All types
export type {
  // Config
  KontextConfig,
  KontextMode,
  Environment,
  LogLevel,

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

  // Agent Reasoning
  LogReasoningInput,
  ReasoningEntry,

  // Compliance Certificates
  GenerateComplianceCertificateInput,
  ComplianceCertificate,

  // Metadata Validation
  MetadataValidator,
} from './types.js';

// Error types
export { KontextError, KontextErrorCode } from './types.js';

// Plan/Tier System
export { PlanManager, PLAN_LIMITS } from './plans.js';
export type { PlanTier, PlanConfig, PlanUsage, LimitEvent } from './plans.js';

// Digest Chain
export { DigestChain, verifyExportedChain } from './digest.js';
export type { DigestLink, DigestVerification, PrecisionTimestamp } from './digest.js';

// USDC Integration (for direct use)
export { UsdcCompliance } from './integrations/usdc.js';
export type { SanctionsCheckResult } from './integrations/usdc.js';

// Comprehensive OFAC Sanctions Screening
export { OFACSanctionsScreener, ofacScreener } from './integrations/ofac-sanctions.js';
export type {
  SanctionsList,
  SanctionedJurisdiction,
  SanctionsRiskLevel,
  SanctionedEntityType,
  SanctionedAddressEntry,
  ComprehensiveSanctionsResult,
  SanctionsMatch,
  JurisdictionFlag,
  PatternFlag,
  OwnershipFlag,
  TransactionForAnalysis,
  EntityNameEntry,
  SanctionsListMetadata,
} from './integrations/ofac-sanctions.js';

// CCTP Integration (Cross-Chain Transfer Protocol) - V1 + V2
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
  // CCTP V2 types
  CCTPVersion,
  CCTPHook,
  CCTPHookResult,
  InitiateFastTransferInput,
  FastTransferValidation,
} from './integrations/cctp.js';

// Circle Programmable Wallets Integration
export { CircleWalletManager } from './integrations/circle-wallets.js';
export type {
  CircleWalletOptions,
  WalletSet,
  CircleWallet,
  CreateWalletOptions,
  CompliantTransferInput,
  CompliantTransferResult,
  ComplianceCheckSummary,
  WalletBalance,
  CircleApiAdapter,
} from './integrations/circle-wallets.js';

// Circle Compliance Engine Integration
export { CircleComplianceEngine } from './integrations/circle-compliance.js';
export type {
  ScreenTransactionInput,
  DualScreenResult,
  AddressScreenResult,
  RiskAssessmentInput,
  ComprehensiveRiskResult,
  ComprehensiveRiskFactor,
  CircleComplianceAdapter,
} from './integrations/circle-compliance.js';

// Gas Station Integration
export { GasStationManager } from './integrations/gas-station.js';
export type {
  GasEligibility,
  GasEstimateInput,
  GasEstimate,
  GasSponsorshipLog,
  GasStationAdapter,
} from './integrations/gas-station.js';

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

// Vercel AI SDK Integration
export {
  kontextMiddleware,
  kontextWrapModel,
  createKontextAI,
  withKontext,
  extractAmount,
} from './integrations/vercel-ai.js';
export type {
  AIOperationType,
  KontextAIOptions,
  BlockedToolCall,
  CreateKontextAIInput,
  CreateKontextAIResult,
  WithKontextOptions,
  KontextAIContext,
} from './integrations/vercel-ai.js';
