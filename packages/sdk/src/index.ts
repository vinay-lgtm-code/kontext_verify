// ============================================================================
// Kontext SDK - Public API
// ============================================================================

// Main client
export { Kontext } from './client.js';

// Storage adapters
export { MemoryStorage, FileStorage } from './storage.js';
export type { StorageAdapter } from './storage.js';

// Firestore storage adapter (persistent, hierarchical — GCP project "Kontext")
export { FirestoreStorageAdapter } from './storage-firestore.js';
export type { FirestoreStorageConfig } from './storage-firestore.js';

// Event exporters
export {
  NoopExporter,
  ConsoleExporter,
  JsonFileExporter,
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

  // Verify
  VerifyInput,
  VerifyResult,

  // Agent Reasoning & Session Tracing
  LogReasoningInput,
  ReasoningEntry,

  // Anomaly Events and Detection Config
  AnomalyEvent,
  AnomalyRuleType,
  AnomalySeverity,
  AnomalyDetectionConfig,
  AnomalyThresholds,
  AnomalyCallback,

  // Trust Scoring
  TrustScore,
  TrustFactor,
  TransactionEvaluation,
  RiskFactor,

  // Compliance Certificates
  GenerateComplianceCertificateInput,
  ComplianceCertificate,

  // USDC Integration
  UsdcComplianceCheck,
  ComplianceCheckResult,

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

// Trust Scoring and Anomaly Detection (for direct use)
export { TrustScorer } from './trust.js';
export type { AgentData } from './trust.js';
export { AnomalyDetector } from './anomaly.js';
