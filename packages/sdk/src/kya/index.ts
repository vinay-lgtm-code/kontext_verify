// ============================================================================
// Kontext SDK - KYA Module Barrel Export
// ============================================================================

export { AgentIdentityRegistry } from './identity-registry.js';
export { UnionFind, WalletClusterer } from './wallet-clustering.js';
export { BehavioralFingerprinter } from './behavioral-fingerprint.js';
export { CrossSessionLinker } from './cross-session-linker.js';
export { KYAConfidenceScorer } from './confidence-scorer.js';

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
} from './types.js';
