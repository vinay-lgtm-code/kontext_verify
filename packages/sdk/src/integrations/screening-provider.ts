// ============================================================================
// Kontext SDK - Unified Screening Provider Interface
// ============================================================================
//
// Pluggable provider architecture for aggregating compliance screening data
// from multiple open-source and free vendor feeds into a unified result.
//
// Providers:
//   - OFACListProvider: Auto-updated OFAC SDN addresses from 0xB10C GitHub
//   - ChainalysisOracleProvider: On-chain sanctions oracle (free, no API key)
//   - ChainalysisFreeAPIProvider: REST API sanctions screening (free with registration)
//   - OpenSanctionsProvider: Entity + PEP data from 325+ global sources
//   - BlocklistProvider: User-managed custom blocklist/allowlist
//   - KontextOFACProvider: Existing built-in OFAC SDN list (fallback)
//
// Usage:
//   const aggregator = new ScreeningAggregator([
//     new OFACListProvider(),
//     new ChainalysisFreeAPIProvider({ apiKey: '...' }),
//     new OpenSanctionsProvider({ apiKey: '...' }),
//     new BlocklistProvider(),
//   ]);
//
//   const result = await aggregator.screenAddress('0x...', 'ethereum');
//   if (result.decision === 'BLOCK') { /* deny transaction */ }
// ============================================================================

import type { Chain } from '../types.js';

// ============================================================================
// Risk Categories (aligned with Circle's 9 built-in rules)
// ============================================================================

/** Risk categories matching Circle Compliance Engine taxonomy */
export type RiskCategory =
  | 'SANCTIONS'            // Circle Rule #1, #4: OFAC SDN, sanctions lists
  | 'TERRORIST_FINANCING'  // Circle Rule #5: Terrorism-linked addresses
  | 'CSAM'                 // Circle Rule #6: Child sexual abuse material
  | 'ILLICIT_BEHAVIOR'     // Circle Rule #7, #8: HYIS, malware, mixers, scams
  | 'GAMBLING'             // Circle Rule #9: Gambling services
  | 'FROZEN'               // Circle Rule #2: Frozen wallet state
  | 'CUSTOM_BLOCKLIST'     // Circle Rule #3: User-managed blocklist
  | 'PEP'                  // Politically Exposed Person (OpenSanctions)
  | 'DARKNET'              // Darknet marketplace interaction
  | 'RANSOMWARE'           // Ransomware-linked addresses
  | 'MIXER'                // Mixing/tumbling service interaction
  | 'SCAM'                 // Known scam addresses
  | 'STOLEN_FUNDS'         // Addresses linked to hacks/theft
  | 'UNKNOWN';             // Uncategorized risk

/** Risk severity tiers (aligned with Circle's scoring) */
export type RiskSeverity =
  | 'BLOCKLIST'  // 100 — Direct blocklist match
  | 'SEVERE'     // 80-99 — Immediate block required
  | 'HIGH'       // 40-79 — Review/alert required
  | 'MEDIUM'     // 20-39 — Enhanced monitoring
  | 'LOW'        // 1-19 — Informational
  | 'NONE';      // 0 — Clean

/** Actions a screening rule can trigger */
export type ScreeningAction =
  | 'DENY'           // Block the transaction
  | 'REVIEW'         // Flag for manual review
  | 'FREEZE_WALLET'  // Freeze the wallet (if supported)
  | 'ALERT'          // Generate alert notification
  | 'ALLOW';         // Explicitly permit

/** Direction of transaction flow */
export type TransactionDirection = 'INBOUND' | 'OUTBOUND' | 'BOTH';

// ============================================================================
// Screening Provider Interface
// ============================================================================

/** A single risk signal from a screening provider */
export interface RiskSignal {
  /** The provider that generated this signal */
  provider: string;
  /** Risk category */
  category: RiskCategory;
  /** Risk severity */
  severity: RiskSeverity;
  /** Numeric risk score (0-100) */
  riskScore: number;
  /** Actions recommended by this signal */
  actions: ScreeningAction[];
  /** Human-readable description of the risk */
  description: string;
  /** Optional entity name associated with the risk */
  entityName?: string;
  /** Optional entity type */
  entityType?: string;
  /** Whether this signal applies to inbound, outbound, or both */
  direction: TransactionDirection;
  /** Additional metadata from the provider */
  metadata?: Record<string, unknown>;
}

/** Result from a single screening provider */
export interface ProviderScreeningResult {
  /** Provider name */
  provider: string;
  /** Whether the address was found in this provider's data */
  matched: boolean;
  /** Risk signals detected */
  signals: RiskSignal[];
  /** Whether the screening was successful (false if provider errored) */
  success: boolean;
  /** Error message if the provider failed */
  error?: string;
  /** Screening latency in milliseconds */
  latencyMs: number;
  /** Timestamp of the screening */
  screenedAt: string;
}

/** Input for screening an address */
export interface ScreenAddressInput {
  /** The blockchain address to screen */
  address: string;
  /** Blockchain network */
  chain: Chain;
  /** Optional transaction amount for contextual risk */
  amount?: string;
  /** Optional counterparty address */
  counterparty?: string;
  /** Transaction direction */
  direction?: TransactionDirection;
}

/** Input for screening a transaction */
export interface ScreenTransactionProviderInput {
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Transfer amount */
  amount: string;
  /** Blockchain network */
  chain: Chain;
  /** Token being transferred */
  token?: string;
}

/**
 * Interface that all screening providers must implement.
 *
 * Providers are responsible for checking addresses/transactions against
 * their data source and returning structured risk signals.
 */
export interface ScreeningProvider {
  /** Unique provider name (e.g., 'chainalysis-free', 'opensanctions') */
  readonly name: string;

  /** Risk categories this provider can detect */
  readonly supportedCategories: RiskCategory[];

  /** Chains this provider supports (empty = all chains) */
  readonly supportedChains: Chain[];

  /**
   * Screen a single address for risk.
   * Returns provider-specific risk signals.
   */
  screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult>;

  /**
   * Screen a transaction (both sender and recipient).
   * Default implementation screens both addresses individually.
   */
  screenTransaction?(input: ScreenTransactionProviderInput): Promise<ProviderScreeningResult>;

  /**
   * Initialize the provider (e.g., fetch initial data, warm caches).
   * Called once when added to the aggregator.
   */
  initialize?(): Promise<void>;

  /**
   * Check if the provider is healthy and able to screen.
   */
  isHealthy(): Promise<boolean>;
}

// ============================================================================
// Unified Screening Result (Aggregated)
// ============================================================================

/** Aggregated screening result combining all provider results */
export interface UnifiedScreeningResult {
  /** The screened address */
  address: string;
  /** Blockchain network */
  chain: Chain;

  /** Final aggregated decision */
  decision: 'APPROVE' | 'REVIEW' | 'BLOCK';
  /** Recommended actions (union of all provider actions) */
  actions: ScreeningAction[];
  /** Highest risk severity across all providers */
  highestSeverity: RiskSeverity;
  /** Aggregated risk score (0-100, weighted average across providers) */
  aggregateRiskScore: number;
  /** All risk categories detected across providers */
  categories: RiskCategory[];

  /** Individual provider results */
  providerResults: ProviderScreeningResult[];
  /** All risk signals from all providers */
  allSignals: RiskSignal[];

  /** Number of providers that were consulted */
  providersConsulted: number;
  /** Number of providers that succeeded */
  providersSucceeded: number;
  /** Total screening latency in milliseconds */
  totalLatencyMs: number;

  /** Screening timestamp */
  screenedAt: string;

  /** Whether the address is on the user's allowlist (overrides block) */
  allowlisted: boolean;
  /** Whether the address is on the user's blocklist */
  blocklisted: boolean;
}

/** Configuration for the screening aggregator */
export interface ScreeningAggregatorConfig {
  /** Minimum providers that must succeed for a valid result (default: 1) */
  minProviderSuccess?: number;
  /** Timeout per provider in milliseconds (default: 5000) */
  providerTimeoutMs?: number;
  /** Whether to run providers in parallel (default: true) */
  parallel?: boolean;
  /** Risk score threshold for BLOCK decision (default: 80) */
  blockThreshold?: number;
  /** Risk score threshold for REVIEW decision (default: 40) */
  reviewThreshold?: number;
  /** Custom provider weights for aggregation (provider name -> weight 0-1) */
  providerWeights?: Record<string, number>;
}
