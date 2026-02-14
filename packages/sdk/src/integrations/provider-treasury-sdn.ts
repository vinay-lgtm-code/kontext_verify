// ============================================================================
// Kontext SDK - Treasury SDN Direct Ingestion Provider
// ============================================================================
//
// Screening provider that reads the pre-processed SDN list from Cloud Storage
// (populated by the server-side TreasurySDNSyncService). Provides direct
// Treasury data ingestion without relying on community intermediaries.
//
// Features:
// - O(1) address lookup using Map-based indexes
// - Separate EVM and Solana address sets
// - Cross-chain EVM propagation (same key = same address on all EVM chains)
// - Periodic refresh from Cloud Storage
// - Staleness detection with configurable max age
// - Optional sync to built-in ofacScreener for backwards compatibility
//
// Architecture:
//   Cloud Storage (processed JSON) --> SDK fetch --> TreasurySDNProvider
//                                                        |
//                                                        v
//                                              ScreeningAggregator
// ============================================================================

import type {
  ScreeningProvider,
  ScreenAddressInput,
  ProviderScreeningResult,
  RiskSignal,
  RiskCategory,
} from './screening-provider.js';

import type { Chain } from '../types.js';

import { ofacScreener } from './ofac-sanctions.js';
import type { SanctionedAddressEntry, SanctionedEntityType } from './ofac-sanctions.js';

// ============================================================================
// Types
// ============================================================================

/** Configuration for the TreasurySDNProvider */
export interface TreasurySDNProviderConfig {
  /** URL to the processed SDN list in Cloud Storage */
  sdnListUrl?: string;
  /** Refresh interval in milliseconds (default: 3600000 -- 1 hour) */
  updateIntervalMs?: number;
  /** Request timeout in milliseconds (default: 30000 -- 30s) */
  requestTimeoutMs?: number;
  /** Sync parsed addresses to the built-in ofacScreener (default: true) */
  syncToBuiltinScreener?: boolean;
  /**
   * Fall back to the built-in ofacScreener when Cloud Storage fetch fails.
   * @default true
   */
  fallbackToBuiltin?: boolean;
  /** Maximum data age before considered unhealthy (default: 172800000 -- 48h) */
  maxStaleMs?: number;
  /** Custom fetch function for testing */
  fetchFn?: typeof fetch;
}

/** Metadata associated with a sanctioned address */
interface SDNAddressMetadata {
  entityName: string;
  entityType: string;
  sdnUid: string;
  currencyCode: string;
  chains: string[];
  lists: string[];
}

/** Structure of the processed SDN list fetched from Cloud Storage */
interface ProcessedSDNList {
  version: string;
  fetchedAt: string;
  addresses: Array<{
    address: string;
    entityName: string;
    entityType: string;
    sdnUid: string;
    currencyCode: string;
    chains: string[];
    lists: string[];
  }>;
  metadata: {
    totalEntries: number;
    digitalCurrencyEntries: number;
    currencyCodeCounts: Record<string, number>;
  };
}

// ============================================================================
// Constants
// ============================================================================

/** Default Cloud Storage URL for the processed SDN list */
const DEFAULT_SDN_LIST_URL =
  'https://storage.googleapis.com/kontext-sdn-data/sdn/processed-list.json';

/** Default refresh interval: 1 hour */
const DEFAULT_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/** Default request timeout: 30 seconds */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** Default max stale duration: 48 hours */
const DEFAULT_MAX_STALE_MS = 48 * 60 * 60 * 1000;

/** All supported EVM chains */
const EVM_CHAINS: Chain[] = [
  'ethereum',
  'base',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'arc',
];

/** All supported chains */
const ALL_CHAINS: Chain[] = [...EVM_CHAINS, 'solana'];

// ============================================================================
// TreasurySDNProvider
// ============================================================================

/**
 * Screening provider backed by direct Treasury SDN data via Cloud Storage.
 *
 * Replaces the 0xB10C-based `OFACListProvider` with authoritative government
 * data. The server-side `TreasurySDNSyncService` fetches the ~80MB Treasury
 * XML every 6 hours, parses it into a compact JSON, and uploads to Cloud
 * Storage. This provider reads that JSON for O(1) lookups.
 *
 * Key differences from the old OFACListProvider:
 * - Direct government source (not a community intermediary)
 * - Multi-chain support (not ETH-only)
 * - Entity metadata in screening results (name, type, SDN UID)
 * - Cross-chain EVM propagation
 * - Staleness detection
 *
 * @example
 * ```typescript
 * const provider = new TreasurySDNProvider({
 *   syncToBuiltinScreener: true,
 * });
 * await provider.initialize();
 *
 * const result = await provider.screenAddress({
 *   address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
 *   chain: 'ethereum',
 * });
 *
 * if (result.matched) {
 *   console.log('Treasury SDN match:', result.signals[0]?.entityName);
 * }
 *
 * provider.dispose();
 * ```
 */
export class TreasurySDNProvider implements ScreeningProvider {
  // --------------------------------------------------------------------------
  // ScreeningProvider interface fields
  // --------------------------------------------------------------------------

  readonly name = 'treasury-sdn-direct';
  readonly supportedCategories: RiskCategory[] = ['SANCTIONS'];
  readonly supportedChains: Chain[] = ALL_CHAINS;

  // --------------------------------------------------------------------------
  // Internal state
  // --------------------------------------------------------------------------

  /** EVM addresses indexed for O(1) lookup (lowercase address -> metadata) */
  private evmAddresses: Map<string, SDNAddressMetadata> = new Map();

  /** Solana addresses indexed for O(1) lookup */
  private solanaAddresses: Map<string, SDNAddressMetadata> = new Map();

  /** Version hash of the currently loaded list */
  private currentVersion: string | null = null;

  /** ISO timestamp of the last successful fetch */
  private lastFetchedAt: string | null = null;

  /** Handle for periodic refresh interval */
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  /** Resolved configuration */
  private readonly config: {
    sdnListUrl: string;
    updateIntervalMs: number;
    requestTimeoutMs: number;
    syncToBuiltinScreener: boolean;
    fallbackToBuiltin: boolean;
    maxStaleMs: number;
    fetchFn: typeof fetch;
  };

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  constructor(config: TreasurySDNProviderConfig = {}) {
    this.config = {
      sdnListUrl: config.sdnListUrl ?? DEFAULT_SDN_LIST_URL,
      updateIntervalMs: config.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS,
      requestTimeoutMs: config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      syncToBuiltinScreener: config.syncToBuiltinScreener ?? true,
      fallbackToBuiltin: config.fallbackToBuiltin ?? true,
      maxStaleMs: config.maxStaleMs ?? DEFAULT_MAX_STALE_MS,
      fetchFn: config.fetchFn ?? globalThis.fetch,
    };
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Fetch the processed SDN list from Cloud Storage and populate indexes.
   * Schedules periodic refreshes.
   *
   * Falls back to the built-in ofacScreener if the Cloud Storage fetch fails.
   */
  async initialize(): Promise<void> {
    await this.fetchAndPopulate();

    this.refreshInterval = setInterval(() => {
      void this.fetchAndPopulate();
    }, this.config.updateIntervalMs);
  }

  // --------------------------------------------------------------------------
  // Core Screening
  // --------------------------------------------------------------------------

  /**
   * Screen an address against the Treasury SDN list.
   *
   * - EVM chains: lookup in evmAddresses (cross-chain propagation)
   * - Solana: lookup in solanaAddresses
   * - Returns entity metadata in the risk signal
   */
  async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
    const start = Date.now();
    const screenedAt = new Date().toISOString();
    const normalizedAddress = input.address.toLowerCase();

    try {
      // Determine which index to use based on chain
      const isEvm = EVM_CHAINS.includes(input.chain);
      const isSolana = input.chain === 'solana';

      let metadata: SDNAddressMetadata | undefined;

      if (isEvm) {
        metadata = this.evmAddresses.get(normalizedAddress);
      } else if (isSolana) {
        // Solana addresses are case-sensitive but we store them as-is
        // Try both normalized and original
        metadata = this.solanaAddresses.get(normalizedAddress)
          ?? this.solanaAddresses.get(input.address);
      }

      const signals: RiskSignal[] = [];

      if (metadata) {
        signals.push({
          provider: this.name,
          category: 'SANCTIONS',
          severity: 'BLOCKLIST',
          riskScore: 100,
          actions: ['DENY', 'FREEZE_WALLET'],
          description:
            `Address ${input.address} found on U.S. Treasury OFAC SDN list ` +
            `(entity: ${metadata.entityName}, type: ${metadata.entityType}, ` +
            `SDN UID: ${metadata.sdnUid}, currency: ${metadata.currencyCode})`,
          entityName: metadata.entityName,
          entityType: metadata.entityType,
          direction: 'BOTH',
          metadata: {
            source: 'treasury-sdn-direct',
            sdnUid: metadata.sdnUid,
            currencyCode: metadata.currencyCode,
            chains: metadata.chains,
            lists: metadata.lists,
            version: this.currentVersion,
            lastFetchedAt: this.lastFetchedAt,
          },
        });
      }

      return {
        provider: this.name,
        matched: !!metadata,
        signals,
        success: true,
        latencyMs: Date.now() - start,
        screenedAt,
      };
    } catch (error) {
      return {
        provider: this.name,
        matched: false,
        signals: [],
        success: false,
        error: `TreasurySDNProvider screening failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - start,
        screenedAt,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  /**
   * Returns true if addresses are loaded AND data is not stale.
   *
   * Staleness check: if lastFetchedAt is more than maxStaleMs ago,
   * returns false. This triggers the aggregator's minProviderSuccess
   * safety net, forcing a REVIEW decision.
   */
  async isHealthy(): Promise<boolean> {
    if (this.evmAddresses.size === 0 && this.solanaAddresses.size === 0) {
      return false;
    }

    if (this.lastFetchedAt) {
      const age = Date.now() - new Date(this.lastFetchedAt).getTime();
      if (age > this.config.maxStaleMs) {
        return false;
      }
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // Observability
  // --------------------------------------------------------------------------

  /**
   * Return provider statistics for monitoring.
   */
  getStats(): {
    evmAddressCount: number;
    solanaAddressCount: number;
    totalAddressCount: number;
    lastFetchedAt: string | null;
    version: string | null;
    isStale: boolean;
  } {
    const isStale = this.lastFetchedAt
      ? Date.now() - new Date(this.lastFetchedAt).getTime() > this.config.maxStaleMs
      : true;

    return {
      evmAddressCount: this.evmAddresses.size,
      solanaAddressCount: this.solanaAddresses.size,
      totalAddressCount: this.evmAddresses.size + this.solanaAddresses.size,
      lastFetchedAt: this.lastFetchedAt,
      version: this.currentVersion,
      isStale,
    };
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  /**
   * Clear the periodic refresh interval and release resources.
   */
  dispose(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // --------------------------------------------------------------------------
  // Private: Fetch and Populate
  // --------------------------------------------------------------------------

  /**
   * Fetch the processed SDN list from Cloud Storage and populate indexes.
   * On failure, keeps the last-good data and falls back to built-in screener.
   */
  private async fetchAndPopulate(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

      let response: Response;
      try {
        response = await this.config.fetchFn(this.config.sdnListUrl, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(
          `Cloud Storage returned HTTP ${response.status} ${response.statusText}`,
        );
      }

      const list = (await response.json()) as ProcessedSDNList;

      if (!list.addresses || list.addresses.length === 0) {
        throw new Error('Processed SDN list is empty -- possible upstream issue');
      }

      // Populate indexes
      const newEvmAddresses = new Map<string, SDNAddressMetadata>();
      const newSolanaAddresses = new Map<string, SDNAddressMetadata>();

      for (const entry of list.addresses) {
        const meta: SDNAddressMetadata = {
          entityName: entry.entityName,
          entityType: entry.entityType,
          sdnUid: entry.sdnUid,
          currencyCode: entry.currencyCode,
          chains: entry.chains,
          lists: entry.lists,
        };

        // Classify by address format
        if (isEvmAddress(entry.address)) {
          newEvmAddresses.set(entry.address.toLowerCase(), meta);
        } else if (isSolanaAddress(entry.address)) {
          newSolanaAddresses.set(entry.address, meta);
        }
      }

      // Verify at least some addresses passed format validation
      if (newEvmAddresses.size === 0 && newSolanaAddresses.size === 0) {
        throw new Error(
          'Processed SDN list contains no valid addresses after format validation -- ' +
          'possible upstream data format change',
        );
      }

      this.evmAddresses = newEvmAddresses;
      this.solanaAddresses = newSolanaAddresses;
      this.currentVersion = list.version;
      this.lastFetchedAt = new Date().toISOString();

      // Sync to built-in ofacScreener for backwards compatibility
      if (this.config.syncToBuiltinScreener) {
        this.syncToBuiltinScreener(list.addresses);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // If we have no data at all, try to populate from built-in screener
      if (this.evmAddresses.size === 0 && this.solanaAddresses.size === 0 && this.config.fallbackToBuiltin) {
        this.populateFromBuiltinScreener();
      }

      // Log but don't throw -- keep last-good data
      if (this.evmAddresses.size > 0 || this.solanaAddresses.size > 0) {
        console.warn(
          `[TreasurySDNProvider] Refresh failed (keeping last-good data): ${message}`,
        );
      } else {
        // No data at all -- this is critical
        throw new Error(
          `TreasurySDNProvider: Failed to fetch SDN list and no fallback data available. ` +
          `Cause: ${message}`,
        );
      }
    }
  }

  /**
   * Sync parsed addresses to the built-in ofacScreener for backwards compat.
   */
  private syncToBuiltinScreener(
    addresses: Array<{
      address: string;
      entityName: string;
      entityType: string;
      chains: string[];
      lists: string[];
    }>,
  ): void {
    const entries: SanctionedAddressEntry[] = addresses.map((a) => ({
      address: a.address,
      lists: a.lists as SanctionedAddressEntry['lists'],
      entityName: a.entityName,
      entityType: mapEntityType(a.entityType),
      dateAdded: new Date().toISOString().split('T')[0]!,
      dateRemoved: null,
      chains: a.chains,
      notes: 'Synced from Treasury SDN direct ingestion',
    }));

    ofacScreener.addAddresses(entries);
  }

  /**
   * Populate from the built-in ofacScreener as a last-resort fallback.
   */
  private populateFromBuiltinScreener(): void {
    const builtinAddresses = ofacScreener.getActiveSanctionedAddresses();
    if (builtinAddresses.length > 0) {
      for (const addr of builtinAddresses) {
        if (isEvmAddress(addr)) {
          this.evmAddresses.set(addr.toLowerCase(), {
            entityName: 'Unknown (built-in fallback)',
            entityType: 'unknown',
            sdnUid: '',
            currencyCode: 'ETH',
            chains: [...EVM_CHAINS],
            lists: ['SDN'],
          });
        }
      }
      this.lastFetchedAt = new Date().toISOString();
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a string is a valid EVM address */
function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/** Check if a string is a valid Solana address (base58, 32-44 chars) */
function isSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/** Map free-form entity type strings to SanctionedEntityType */
function mapEntityType(type: string): SanctionedEntityType {
  const lower = type.toLowerCase();
  if (lower === 'individual') return 'INDIVIDUAL';
  if (lower === 'entity') return 'EXCHANGE'; // Best approximation
  if (lower === 'group') return 'GROUP';
  return 'UNKNOWN';
}
