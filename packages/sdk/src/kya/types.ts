// ============================================================================
// Kontext SDK - KYA (Know Your Agent) Type Definitions
// ============================================================================

// --------------------------------------------------------------------------
// Identity
// --------------------------------------------------------------------------

/** Entity type for an agent identity */
export type EntityType = 'individual' | 'organization' | 'bot' | 'unknown';

/** KYC verification status */
export type KYCStatus = 'none' | 'pending' | 'verified' | 'rejected' | 'expired';

/** A wallet mapping associated with an agent */
export interface WalletMapping {
  /** Wallet address (normalized to lowercase) */
  address: string;
  /** Blockchain network */
  chain: string;
  /** Whether this wallet was verified on-chain */
  verified: boolean;
  /** When the wallet was added */
  addedAt: string;
  /** Optional label for the wallet */
  label?: string;
}

/** Reference to an external KYC provider verification */
export interface KYCProviderReference {
  /** KYC provider name (e.g., 'jumio', 'onfido', 'sumsub') */
  provider: string;
  /** External reference/case ID from the provider */
  referenceId: string;
  /** Verification status */
  status: KYCStatus;
  /** When the verification was completed */
  verifiedAt: string | null;
  /** When the verification expires */
  expiresAt: string | null;
  /** Risk level assigned by the provider */
  riskLevel?: 'low' | 'medium' | 'high';
}

/** Declared agent identity */
export interface AgentIdentity {
  /** Agent ID (primary key) */
  agentId: string;
  /** Display name */
  displayName?: string;
  /** Entity type */
  entityType: EntityType;
  /** Wallet addresses associated with the agent */
  wallets: WalletMapping[];
  /** External KYC provider references */
  kycReferences: KYCProviderReference[];
  /** Contact URI (email, ENS, etc.) */
  contactUri?: string;
  /** Arbitrary metadata */
  metadata: Record<string, unknown>;
  /** When the identity was first registered */
  createdAt: string;
  /** When the identity was last updated */
  updatedAt: string;
}

/** Input for registering a new agent identity */
export interface RegisterIdentityInput {
  /** Agent ID */
  agentId: string;
  /** Display name */
  displayName?: string;
  /** Entity type */
  entityType?: EntityType;
  /** Initial wallet mappings */
  wallets?: Array<{ address: string; chain: string; label?: string }>;
  /** Contact URI */
  contactUri?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** Input for updating an existing agent identity */
export interface UpdateIdentityInput {
  /** Updated display name */
  displayName?: string;
  /** Updated entity type */
  entityType?: EntityType;
  /** Updated contact URI */
  contactUri?: string;
  /** Metadata to merge */
  metadata?: Record<string, unknown>;
}

// --------------------------------------------------------------------------
// Wallet Clustering
// --------------------------------------------------------------------------

/** Heuristic used to cluster wallet addresses */
export type ClusteringHeuristic =
  | 'common-agent'
  | 'funding-chain'
  | 'gas-sponsorship'
  | 'temporal-co-spending'
  | 'declared-wallets';

/** Evidence for why two addresses were clustered */
export interface ClusteringEvidence {
  /** Heuristic that produced this evidence */
  heuristic: ClusteringHeuristic;
  /** Confidence of this particular heuristic (0-1) */
  confidence: number;
  /** Addresses involved */
  addresses: [string, string];
  /** When this evidence was detected */
  detectedAt: string;
  /** Additional detail */
  detail?: string;
}

/** A cluster of related wallet addresses */
export interface WalletCluster {
  /** Cluster ID */
  id: string;
  /** All addresses in the cluster (normalized lowercase) */
  addresses: string[];
  /** Agent IDs associated with this cluster */
  agentIds: string[];
  /** Evidence trail for this cluster */
  evidence: ClusteringEvidence[];
  /** Highest confidence from any evidence */
  confidence: number;
  /** When the cluster was formed */
  createdAt: string;
}

/** Configuration for wallet clustering */
export interface WalletClusteringConfig {
  /** Temporal co-spending window in seconds (default: 60) */
  temporalWindowSeconds?: number;
  /** Minimum destination overlap ratio for temporal heuristic (default: 0.3) */
  minDestinationOverlap?: number;
  /** Minimum number of sponsored wallets for gas sponsorship heuristic (default: 3) */
  minGasSponsoredWallets?: number;
}

// --------------------------------------------------------------------------
// Behavioral Fingerprinting
// --------------------------------------------------------------------------

/** Temporal features extracted from transaction patterns */
export interface TemporalFeatures {
  /** Mean inter-transaction interval in seconds */
  meanIntervalSeconds: number;
  /** Standard deviation of inter-transaction intervals */
  stddevIntervalSeconds: number;
  /** 24-bin hour-of-day histogram (normalized to sum=1) */
  hourHistogram: number[];
  /** 7-bin day-of-week histogram (normalized to sum=1) */
  dayHistogram: number[];
}

/** Financial features extracted from transaction amounts */
export interface FinancialFeatures {
  /** Mean transaction amount */
  meanAmount: number;
  /** Standard deviation of transaction amounts */
  stddevAmount: number;
  /** Median transaction amount */
  medianAmount: number;
  /** Ratio of round amounts (divisible by 100) */
  roundAmountRatio: number;
  /** Amount percentiles [p10, p25, p50, p75, p90] */
  percentiles: [number, number, number, number, number];
}

/** Network features from transaction graph */
export interface NetworkFeatures {
  /** Number of unique destination addresses */
  uniqueDestinations: number;
  /** Address reuse ratio: 1 - (unique / total) */
  reuseRatio: number;
  /** Herfindahl-Hirschman Index for destination concentration */
  concentrationIndex: number;
  /** Number of unique source addresses */
  uniqueSources: number;
}

/** Operational features from chain/token usage */
export interface OperationalFeatures {
  /** Distribution of transactions across chains (normalized) */
  chainDistribution: Record<string, number>;
  /** Distribution of transactions across tokens (normalized) */
  tokenDistribution: Record<string, number>;
  /** Primary chain (most used) */
  primaryChain: string;
  /** Primary token (most used) */
  primaryToken: string;
}

/** Complete behavioral embedding for an agent */
export interface BehavioralEmbedding {
  /** Agent ID */
  agentId: string;
  /** Temporal features */
  temporal: TemporalFeatures;
  /** Financial features */
  financial: FinancialFeatures;
  /** Network features */
  network: NetworkFeatures;
  /** Operational features */
  operational: OperationalFeatures;
  /** Number of transactions used to compute the embedding */
  sampleSize: number;
  /** When the embedding was computed */
  computedAt: string;
}

// --------------------------------------------------------------------------
// Cross-Session Linking
// --------------------------------------------------------------------------

/** A signal contributing to an agent link */
export interface LinkSignal {
  /** Signal type */
  type: 'wallet-overlap' | 'behavioral-similarity' | 'declared-identity';
  /** Signal strength (0-1) */
  strength: number;
  /** Weight of this signal type (0-1) */
  weight: number;
  /** Detail about the signal */
  detail?: string;
}

/** Link status */
export type LinkStatus = 'inferred' | 'confirmed' | 'rejected';

/** A link between two agents */
export interface AgentLink {
  /** Link ID */
  id: string;
  /** First agent ID */
  agentIdA: string;
  /** Second agent ID */
  agentIdB: string;
  /** Overall confidence (0-1) */
  confidence: number;
  /** Signals contributing to this link */
  signals: LinkSignal[];
  /** Link status */
  status: LinkStatus;
  /** When the link was created */
  createdAt: string;
  /** Who reviewed the link (if reviewed) */
  reviewedBy?: string;
  /** When the link was reviewed */
  reviewedAt?: string;
}

/** Configuration for cross-session linking */
export interface CrossSessionLinkerConfig {
  /** Minimum behavioral similarity to consider (default: 0.85) */
  minBehavioralSimilarity?: number;
  /** Minimum overall confidence to create a link (default: 0.6) */
  minLinkConfidence?: number;
}

// --------------------------------------------------------------------------
// Confidence Scoring
// --------------------------------------------------------------------------

/** A component contributing to the KYA confidence score */
export interface KYAScoreComponent {
  /** Component name */
  name: string;
  /** Raw component score (0-100) */
  score: number;
  /** Weight of this component (0-1) */
  weight: number;
  /** Weighted contribution to overall score */
  weightedScore: number;
  /** Human-readable detail */
  detail: string;
}

/** Confidence level label */
export type KYAConfidenceLevel = 'unknown' | 'low' | 'medium' | 'high' | 'verified';

/** Complete KYA confidence score for an agent */
export interface KYAConfidenceScore {
  /** Agent ID */
  agentId: string;
  /** Overall score (0-100) */
  score: number;
  /** Confidence level */
  level: KYAConfidenceLevel;
  /** Component breakdown */
  components: KYAScoreComponent[];
  /** When the score was computed */
  computedAt: string;
}

/** Configuration for confidence scoring weights */
export interface KYAConfidenceScorerConfig {
  /** Weight for declared identity component (default: 0.20) */
  declaredIdentityWeight?: number;
  /** Weight for KYC verification component (default: 0.30) */
  kycVerificationWeight?: number;
  /** Weight for wallet graph component (default: 0.20) */
  walletGraphWeight?: number;
  /** Weight for behavioral consistency component (default: 0.20) */
  behavioralConsistencyWeight?: number;
  /** Weight for external enrichment component (default: 0.10) */
  externalEnrichmentWeight?: number;
}

// --------------------------------------------------------------------------
// KYA Envelope (Aggregate for Export)
// --------------------------------------------------------------------------

/** Aggregated KYA data for inclusion in audit exports */
export interface KYAEnvelope {
  /** All registered identities */
  identities: AgentIdentity[];
  /** Wallet clusters */
  clusters: WalletCluster[];
  /** Behavioral embeddings (if enterprise) */
  embeddings: BehavioralEmbedding[];
  /** Agent links (if enterprise) */
  links: AgentLink[];
  /** Confidence scores */
  scores: KYAConfidenceScore[];
  /** When the envelope was generated */
  generatedAt: string;
}
