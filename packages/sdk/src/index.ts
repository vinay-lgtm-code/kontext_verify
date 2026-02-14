// ============================================================================
// Kontext SDK - Public API
// ============================================================================

// Main client
export { Kontext } from './client.js';

// Storage adapters
export { MemoryStorage, FileStorage } from './storage.js';
export type { StorageAdapter } from './storage.js';

// Event exporters
export {
  NoopExporter,
  ConsoleExporter,
  JsonFileExporter,
  HttpExporter,
  KontextCloudExporter,
  MultiExporter,
} from './exporters.js';
export type { EventExporter, ExporterResult } from './exporters.js';

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

// Feature Flags
export { FeatureFlagManager } from './feature-flags.js';
export type {
  FeatureFlag,
  FeatureFlagConfig,
  FlagScope,
  FlagTargeting,
  FlagPlanTargeting,
} from './types.js';

// Approval / Human-in-the-Loop
export { ApprovalManager } from './approval.js';
export type {
  ApprovalPolicy,
  ApprovalPolicyType,
  ApprovalStatus,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalEvaluation,
  EvaluateApprovalInput,
  SubmitDecisionInput,
} from './types.js';

// Error types
export { KontextError, KontextErrorCode } from './types.js';

// Plan/Tier System
export { PlanManager, PLAN_LIMITS } from './plans.js';
export type { PlanTier, PlanConfig, PlanUsage, LimitEvent } from './plans.js';

// Plan Gating
export { requirePlan, isFeatureAvailable } from './plan-gate.js';
export type { GatedFeature } from './plan-gate.js';

// Digest Chain
export { DigestChain, verifyExportedChain } from './digest.js';
export type { DigestLink, DigestVerification, PrecisionTimestamp } from './digest.js';

// USDC Integration (for direct use)
export { UsdcCompliance } from './integrations/usdc.js';
export type { SanctionsCheckResult } from './integrations/usdc.js';

// Comprehensive OFAC Sanctions Screening
export { OFACSanctionsScreener, ofacScreener, rebuildIndexes } from './integrations/ofac-sanctions.js';
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

// CFTC Compliance Integration (Letter No. 26-05 - FCM Digital Asset Margin)
export { CFTCCompliance } from './integrations/cftc-compliance.js';
export type {
  CFTCAccountClass,
  DigitalAssetType,
  CollateralValuation,
  SegregationCalculation,
  DigitalAssetReport,
  IncidentReport,
  CFTCComplianceConfig,
} from './integrations/cftc-compliance.js';

// Unified Screening Provider Architecture
export { ScreeningAggregator, createScreeningAggregator } from './integrations/screening-aggregator.js';
export type {
  ScreeningProvider,
  RiskCategory,
  RiskSeverity,
  RiskSignal,
  ScreeningAction,
  TransactionDirection,
  ProviderScreeningResult,
  UnifiedScreeningResult,
  ScreenAddressInput,
  ScreenTransactionProviderInput,
  ScreeningAggregatorConfig,
} from './integrations/screening-provider.js';

// Screening Providers - Treasury SDN Direct & Chainalysis Oracle
export { TreasurySDNProvider } from './integrations/provider-treasury-sdn.js';
export type { TreasurySDNProviderConfig } from './integrations/provider-treasury-sdn.js';
export { ChainalysisOracleProvider } from './integrations/provider-ofac.js';

// Screening Notification Manager
export { ScreeningNotificationManager } from './integrations/screening-notification.js';
export type {
  ScreeningNotificationConfig,
  PaymentProviderContact,
  EmailTransport,
  WebhookTransport,
  SMTPTransport,
  TransactionContext,
  ScreeningNotificationPayload,
  ScreeningNotificationBody,
  NotificationDeliveryResult,
} from './integrations/screening-notification.js';

// Screening Providers - Chainalysis Free API & OpenSanctions
export { ChainalysisFreeAPIProvider, OpenSanctionsProvider } from './integrations/provider-apis.js';

// KYA (Know Your Agent) Identity Resolution Engine
export {
  AgentIdentityRegistry,
  UnionFind,
  WalletClusterer,
  BehavioralFingerprinter,
  CrossSessionLinker,
  KYAConfidenceScorer,
} from './kya/index.js';

export type {
  // KYA Identity
  EntityType,
  KYCStatus,
  WalletMapping,
  KYCProviderReference,
  AgentIdentity,
  RegisterIdentityInput,
  UpdateIdentityInput,

  // KYA Wallet Clustering
  ClusteringHeuristic,
  ClusteringEvidence,
  WalletCluster,
  WalletClusteringConfig,

  // KYA Behavioral Fingerprinting
  TemporalFeatures,
  FinancialFeatures,
  NetworkFeatures,
  OperationalFeatures,
  BehavioralEmbedding,

  // KYA Cross-Session Linking
  LinkSignal,
  LinkStatus,
  AgentLink,
  CrossSessionLinkerConfig,

  // KYA Confidence Scoring
  KYAScoreComponent,
  KYAConfidenceLevel,
  KYAConfidenceScore,
  KYAConfidenceScorerConfig,

  // KYA Envelope
  KYAEnvelope,
} from './kya/index.js';
