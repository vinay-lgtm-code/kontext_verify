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

  // Wallet Monitoring
  WalletMonitoringConfig,

  // Wallet Provider Configuration
  WalletProviderType,
  WalletProviderConfig,
  WalletProviderNone,
  WalletProviderCircle,
  WalletProviderCoinbase,
  WalletProviderMetaMask,
  SecretsStorageConfig,

  // Circle Wallet Types
  CircleWalletConfig,
  CreateWalletSetInput,
  CircleWalletSet,
  CreateWalletInput,
  CircleWallet,
  CircleTransferInput,
  CircleTransferResult,

  // Coinbase CDP Wallet Types
  CoinbaseWalletConfig,
  CoinbaseAccount,
  CoinbaseTransferInput,
  CoinbaseTransferResult,

  // MetaMask Wallet Types
  MetaMaskWalletConfig,
  MetaMaskAccount,
  MetaMaskTransferInput,
  MetaMaskTransferResult,
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

// General Payment Compliance (for direct use)
export { PaymentCompliance } from './integrations/payment-compliance.js';

// Type guards
export { isCryptoTransaction } from './types.js';

// On-Chain Anchoring
export { verifyAnchor, getAnchor, anchorDigest, OnChainExporter } from './onchain.js';

// ERC-8021 Transaction Attribution
export { encodeERC8021Suffix, parseERC8021Suffix, fetchTransactionAttribution, KONTEXT_BUILDER_CODE } from './integrations/erc8021.js';
export type { ERC8021Attribution, ERC8021Config } from './types.js';

// A2A Attestation
export { fetchAgentCard, exchangeAttestation } from './attestation.js';

// On-Chain + A2A types
export type {
  OnChainAnchorConfig,
  AnchorResult,
  AnchorVerification,
  AgentCard,
  CounterpartyConfig,
  AttestationRequest,
  AttestationResponse,
  CounterpartyAttestation,
} from './types.js';

// Agent Provenance
export { ProvenanceManager } from './provenance.js';
export type {
  AgentSession,
  SessionStatus,
  SessionConstraints,
  CreateSessionInput,
  ProvenanceCheckpoint,
  CheckpointStatus,
  CreateCheckpointInput,
  HumanAttestation,
  AttestationDecision,
  AttestationPayload,
  AttestationSignature,
  VerificationKey,
  ProvenanceAttestor,
  ProvenanceBundle,
  ProvenanceAction,
  ProvenanceBundleVerification,
} from './types.js';

// Trust Scoring and Anomaly Detection (for direct use)
export { TrustScorer } from './trust.js';
export type { AgentData } from './trust.js';
export { AnomalyDetector } from './anomaly.js';

// Screening Providers
export { OFACAddressProvider } from './integrations/provider-treasury-sdn.js';
export { OFACEntityProvider } from './integrations/provider-ofac-entity.js';
export { UKOFSIProvider } from './integrations/provider-uk-ofsi.js';
export { OpenSanctionsLocalProvider } from './integrations/provider-opensanctions-local.js';
export { OpenSanctionsProvider, ChainalysisFreeAPIProvider } from './integrations/provider-apis.js';
export { ChainalysisOracleProvider } from './integrations/provider-ofac.js';
export { KontextCloudScreeningProvider } from './integrations/provider-kontext-cloud.js';
export type { KontextCloudScreeningConfig } from './integrations/provider-kontext-cloud.js';
export { TRMLabsProvider } from './integrations/provider-trm.js';
export type { TRMLabsConfig } from './integrations/provider-trm.js';

// Screening Aggregator
export { ScreeningAggregator } from './integrations/screening-aggregator.js';
export type {
  ConsensusStrategy,
  ScreeningAggregatorConfig,
  AggregatedScreeningResult,
} from './integrations/screening-aggregator.js';

// Screening Types
export type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  QueryType,
  SanctionsList,
  MatchType,
  EntityStatus,
  Jurisdiction,
} from './integrations/screening-provider.js';
export {
  isBlockchainAddress,
  providerSupportsQuery,
  getRequiredLists,
  TOKEN_REQUIRED_LISTS,
  CURRENCY_REQUIRED_LISTS,
} from './integrations/screening-provider.js';

// Screening Config types (re-exported from types.ts)
export type { ScreeningConfig, PolicyConfig } from './types.js';

// Viem Auto-Instrumentation
export { withKontextCompliance, ViemComplianceError } from './integrations/viem-interceptor.js';
export type { ViemInstrumentationOptions, WalletClientLike } from './integrations/viem-interceptor.js';

// Wallet Monitoring
export { WalletMonitor } from './integrations/wallet-monitor.js';

// Stablecoin Registry
export { STABLECOIN_CONTRACTS, CHAIN_ID_MAP } from './integrations/data/stablecoin-contracts.js';

// Config Loading
export { loadConfigFile } from './config-loader.js';

// Wallet Provider Managers
export { CircleWalletManager } from './integrations/circle-wallets.js';
export { CoinbaseWalletManager } from './integrations/coinbase-wallets.js';
export { MetaMaskWalletManager } from './integrations/metamask-wallets.js';

// Agent Forensics (KYA)
export {
  AgentIdentityRegistry,
  WalletClusterer,
  BehavioralFingerprinter,
  CrossSessionLinker,
  KYAConfidenceScorer,
} from './kya/index.js';

export type {
  // Identity
  EntityType,
  KYCStatus,
  WalletMapping,
  KYCProviderReference,
  AgentIdentity,
  RegisterIdentityInput,
  UpdateIdentityInput,

  // Wallet Clustering
  ClusteringHeuristic,
  ClusteringEvidence,
  WalletCluster,
  WalletClusteringConfig,

  // Behavioral Fingerprinting
  TemporalFeatures,
  FinancialFeatures,
  NetworkFeatures,
  OperationalFeatures,
  BehavioralEmbedding,

  // Cross-Session Linking
  LinkSignal,
  LinkStatus,
  AgentLink,
  CrossSessionLinkerConfig,

  // Confidence Scoring
  KYAScoreComponent,
  KYAConfidenceLevel,
  KYAConfidenceScore,
  KYAConfidenceScorerConfig,

  // Envelope
  KYAEnvelope,
} from './kya/index.js';
