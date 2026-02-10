// ============================================================================
// Kontext SDK - OFAC Screening Providers
// ============================================================================
//
// Two complementary sanctions screening providers that implement the unified
// ScreeningProvider interface:
//
//   1. OFACListProvider
//      Auto-updates OFAC sanctioned digital currency addresses from the 0xB10C
//      GitHub repository. The `lists` branch is regenerated nightly at 0 UTC
//      from official OFAC SDN data, providing a machine-readable, line-per-
//      address format ideal for fast bulk lookups.
//
//      Source: https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses
//
//   2. ChainalysisOracleProvider
//      Integrates with the Chainalysis free on-chain sanctions oracle smart
//      contract. The oracle is deployed at the same address across multiple EVM
//      chains and exposes a single `isSanctioned(address)` view function. No
//      API key required -- the check is a simple `eth_call`.
//
//      Oracle: 0x40C57923924B5c5c5455c48D93317139ADDaC8fb
//
// Both providers return structured RiskSignal data suitable for aggregation
// by the ScreeningAggregator. They use only native `fetch()` -- no ethers.js,
// web3.js, or other external dependencies.
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

// ============================================================================
// Constants
// ============================================================================

/** GitHub raw URL for the auto-updated ETH sanctioned addresses list */
const OFAC_ETH_LIST_URL =
  'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt';

/** Default refresh interval: 24 hours (matches the nightly 0 UTC rebuild) */
const DEFAULT_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Chainalysis sanctions oracle contract address (same on all supported chains) */
const CHAINALYSIS_ORACLE_ADDRESS = '0x40C57923924B5c5c5455c48D93317139ADDaC8fb';

/**
 * Function selector for `isSanctioned(address)`.
 * keccak256("isSanctioned(address)") = 0x01e43d40...
 */
const IS_SANCTIONED_SELECTOR = '0x01e43d40';

/** Default cache TTL for oracle results: 5 minutes */
const DEFAULT_CACHE_TIME_MS = 5 * 60 * 1000;

/** EVM-compatible chains where ETH-format addresses are valid */
const EVM_CHAINS: Chain[] = [
  'ethereum',
  'base',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
];

/** Chains where the Chainalysis oracle contract is deployed */
const ORACLE_SUPPORTED_CHAINS: Chain[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
];

// ============================================================================
// OFACListProvider
// ============================================================================

/** Configuration for the OFACListProvider */
export interface OFACListProviderConfig {
  /**
   * How often to re-fetch the address list from GitHub, in milliseconds.
   * @default 86400000 (24 hours)
   */
  updateIntervalMs?: number;

  /**
   * GitHub branch containing the auto-generated list files.
   * @default 'lists'
   */
  githubBranch?: string;

  /**
   * If true, fall back to the built-in `ofacScreener` from `./ofac-sanctions.js`
   * when the GitHub fetch fails during initialization.
   * @default false
   */
  fallbackToBuiltin?: boolean;
}

/**
 * OFAC sanctions screening provider backed by the 0xB10C GitHub repository.
 *
 * The repository's `lists` branch contains nightly-updated plain text files
 * with one sanctioned digital currency address per line, sourced from the
 * official U.S. Treasury OFAC SDN list. This provider fetches the ETH
 * address file, parses it into a `Set<string>` for O(1) lookups, and
 * periodically re-fetches to stay current.
 *
 * Because Ethereum-format addresses are valid across all EVM-compatible
 * chains, this provider supports screening on any EVM chain.
 *
 * @example
 * ```typescript
 * const provider = new OFACListProvider({ fallbackToBuiltin: true });
 * await provider.initialize();
 *
 * const result = await provider.screenAddress({
 *   address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
 *   chain: 'ethereum',
 * });
 *
 * if (result.matched) {
 *   console.log('OFAC sanctioned address detected');
 * }
 *
 * // Cleanup when done
 * provider.dispose();
 * ```
 */
export class OFACListProvider implements ScreeningProvider {
  // --------------------------------------------------------------------------
  // ScreeningProvider interface fields
  // --------------------------------------------------------------------------

  readonly name = 'ofac-list-auto';
  readonly supportedCategories: RiskCategory[] = ['SANCTIONS'];
  readonly supportedChains: Chain[] = EVM_CHAINS;

  // --------------------------------------------------------------------------
  // Internal state
  // --------------------------------------------------------------------------

  /** Lowercased sanctioned addresses for O(1) lookup */
  private sanctionedAddresses: Set<string> = new Set();

  /** ISO timestamp of the last successful address list update */
  private lastUpdatedAt: string | null = null;

  /** Handle for the periodic re-fetch interval */
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  /** Resolved configuration with defaults applied */
  private readonly config: Required<OFACListProviderConfig>;

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  constructor(config: OFACListProviderConfig = {}) {
    this.config = {
      updateIntervalMs: config.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS,
      githubBranch: config.githubBranch ?? 'lists',
      fallbackToBuiltin: config.fallbackToBuiltin ?? false,
    };
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Fetch the initial address list from GitHub and schedule periodic refreshes.
   *
   * If the fetch fails and `fallbackToBuiltin` is enabled, the provider will
   * populate its address set from the built-in `ofacScreener` instead of
   * throwing. This ensures screening can proceed even if GitHub is unreachable.
   */
  async initialize(): Promise<void> {
    await this.fetchAddressList();

    // Schedule periodic re-fetch
    this.refreshInterval = setInterval(() => {
      void this.fetchAddressList();
    }, this.config.updateIntervalMs);
  }

  // --------------------------------------------------------------------------
  // Core screening
  // --------------------------------------------------------------------------

  /**
   * Screen a single address against the OFAC sanctioned addresses set.
   *
   * @param input - The address and chain to screen
   * @returns A ProviderScreeningResult with match information and risk signals
   */
  async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
    const start = Date.now();
    const screenedAt = new Date().toISOString();
    const normalizedAddress = input.address.toLowerCase();

    try {
      const matched = this.sanctionedAddresses.has(normalizedAddress);
      const signals: RiskSignal[] = [];

      if (matched) {
        signals.push({
          provider: this.name,
          category: 'SANCTIONS',
          severity: 'BLOCKLIST',
          riskScore: 100,
          actions: ['DENY', 'FREEZE_WALLET'],
          description:
            `Address ${input.address} found on OFAC sanctioned digital currency addresses list ` +
            `(source: 0xB10C/ofac-sanctioned-digital-currency-addresses, ` +
            `last updated: ${this.lastUpdatedAt ?? 'unknown'})`,
          direction: 'BOTH',
          metadata: {
            source: 'ofac-sanctioned-digital-currency-addresses',
            listBranch: this.config.githubBranch,
            lastUpdated: this.lastUpdatedAt,
            addressCount: this.sanctionedAddresses.size,
          },
        });
      }

      return {
        provider: this.name,
        matched,
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
        error: `OFACListProvider screening failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - start,
        screenedAt,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Health check
  // --------------------------------------------------------------------------

  /**
   * Returns true if the address set has been successfully populated.
   * A healthy provider has at least one address loaded.
   */
  async isHealthy(): Promise<boolean> {
    return this.sanctionedAddresses.size > 0;
  }

  // --------------------------------------------------------------------------
  // Observability
  // --------------------------------------------------------------------------

  /**
   * Return provider statistics for observability and monitoring.
   *
   * @returns Object containing the current address count and last update timestamp
   */
  getStats(): { addressCount: number; lastUpdatedAt: string | null } {
    return {
      addressCount: this.sanctionedAddresses.size,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  /**
   * Clear the periodic refresh interval and release resources.
   * Call this when the provider is no longer needed to prevent memory leaks.
   */
  dispose(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Fetch the sanctioned ETH address list from GitHub and parse it into
   * the internal Set. Falls back to the built-in screener if configured.
   */
  private async fetchAddressList(): Promise<void> {
    const url = OFAC_ETH_LIST_URL.replace('/lists/', `/${this.config.githubBranch}/`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `GitHub returned HTTP ${response.status} ${response.statusText} for ${url}`,
        );
      }

      const text = await response.text();
      const addresses = this.parseAddressList(text);

      if (addresses.size === 0) {
        throw new Error('Parsed address list is empty -- possible format change or empty file');
      }

      this.sanctionedAddresses = addresses;
      this.lastUpdatedAt = new Date().toISOString();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (this.config.fallbackToBuiltin) {
        // Populate from the built-in ofacScreener as a fallback
        const builtinAddresses = ofacScreener.getActiveSanctionedAddresses();
        if (builtinAddresses.length > 0) {
          this.sanctionedAddresses = new Set(
            builtinAddresses.map((addr) => addr.toLowerCase()),
          );
          this.lastUpdatedAt = new Date().toISOString();
        }
        // If the built-in list is also empty, we leave the set as-is
        // (could be a subsequent failed refresh; preserve the last good set)
      }

      // If this is the first load and we have no addresses, the caller should
      // check isHealthy() to determine if the provider is usable.
      if (this.sanctionedAddresses.size === 0) {
        throw new Error(
          `OFACListProvider: Failed to fetch address list and no fallback data available. ` +
          `Cause: ${message}`,
        );
      }
    }
  }

  /**
   * Parse a plain text address list into a Set of lowercased addresses.
   * Handles:
   * - Empty lines
   * - Lines with leading/trailing whitespace
   * - Comment lines starting with '#'
   * - Carriage return / line feed differences
   */
  private parseAddressList(text: string): Set<string> {
    const addresses = new Set<string>();

    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Skip empty lines and comments
      if (line === '' || line.startsWith('#')) {
        continue;
      }

      addresses.add(line.toLowerCase());
    }

    return addresses;
  }
}

// ============================================================================
// ChainalysisOracleProvider
// ============================================================================

/** Configuration for the ChainalysisOracleProvider */
export interface ChainalysisOracleProviderConfig {
  /**
   * Mapping of chain names to JSON-RPC endpoint URLs.
   * Only chains with an entry here will be screenable.
   *
   * @example
   * ```typescript
   * {
   *   ethereum: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
   *   polygon: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
   * }
   * ```
   */
  rpcUrls: Record<string, string>;

  /**
   * How long to cache oracle results per address+chain pair, in milliseconds.
   * @default 300000 (5 minutes)
   */
  cacheTimeMs?: number;
}

/** Internal cache entry for oracle results */
interface OracleCacheEntry {
  /** Whether the address is sanctioned */
  sanctioned: boolean;
  /** Timestamp when the entry was cached */
  cachedAt: number;
}

/**
 * Chainalysis on-chain sanctions oracle screening provider.
 *
 * The Chainalysis sanctions oracle is a free, permissionless smart contract
 * deployed at `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` on multiple EVM
 * chains. It exposes a single `isSanctioned(address)` view function that
 * returns true if the address appears on the Chainalysis sanctions list.
 *
 * This provider makes raw `eth_call` JSON-RPC requests to the oracle --
 * no ethers.js or web3.js dependency required. Results are cached per
 * address+chain pair to reduce RPC call volume.
 *
 * Supported chains: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche.
 *
 * @see https://go.chainalysis.com/chainalysis-oracle-docs.html
 *
 * @example
 * ```typescript
 * const provider = new ChainalysisOracleProvider({
 *   rpcUrls: {
 *     ethereum: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
 *     polygon: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
 *   },
 *   cacheTimeMs: 60_000, // 1 minute cache
 * });
 *
 * const result = await provider.screenAddress({
 *   address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
 *   chain: 'ethereum',
 * });
 *
 * if (result.matched) {
 *   console.log('Address flagged by Chainalysis oracle');
 * }
 * ```
 */
export class ChainalysisOracleProvider implements ScreeningProvider {
  // --------------------------------------------------------------------------
  // ScreeningProvider interface fields
  // --------------------------------------------------------------------------

  readonly name = 'chainalysis-oracle';
  readonly supportedCategories: RiskCategory[] = ['SANCTIONS'];
  readonly supportedChains: Chain[] = ORACLE_SUPPORTED_CHAINS;

  // --------------------------------------------------------------------------
  // Internal state
  // --------------------------------------------------------------------------

  /** RPC URL mapping: chain name -> JSON-RPC endpoint */
  private readonly rpcUrls: Record<string, string>;

  /** Cache TTL in milliseconds */
  private readonly cacheTimeMs: number;

  /** In-memory cache keyed by `${chain}:${lowercasedAddress}` */
  private readonly cache: Map<string, OracleCacheEntry> = new Map();

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  constructor(config: ChainalysisOracleProviderConfig) {
    this.rpcUrls = { ...config.rpcUrls };
    this.cacheTimeMs = config.cacheTimeMs ?? DEFAULT_CACHE_TIME_MS;
  }

  // --------------------------------------------------------------------------
  // Core screening
  // --------------------------------------------------------------------------

  /**
   * Screen a single address using the Chainalysis on-chain sanctions oracle.
   *
   * Makes an `eth_call` to the oracle contract on the specified chain. If no
   * RPC URL is configured for the chain, returns a failed result with an error.
   *
   * @param input - The address and chain to screen
   * @returns A ProviderScreeningResult with oracle verdict and risk signals
   */
  async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
    const start = Date.now();
    const screenedAt = new Date().toISOString();
    const normalizedAddress = input.address.toLowerCase();
    const chain = input.chain;

    // Check if we have an RPC URL for this chain
    const rpcUrl = this.rpcUrls[chain];
    if (!rpcUrl) {
      return {
        provider: this.name,
        matched: false,
        signals: [],
        success: false,
        error:
          `ChainalysisOracleProvider: No RPC URL configured for chain "${chain}". ` +
          `Configured chains: ${Object.keys(this.rpcUrls).join(', ') || '(none)'}`,
        latencyMs: Date.now() - start,
        screenedAt,
      };
    }

    try {
      // Check cache first
      const cacheKey = `${chain}:${normalizedAddress}`;
      const cached = this.getCachedResult(cacheKey);

      let sanctioned: boolean;
      if (cached !== null) {
        sanctioned = cached;
      } else {
        sanctioned = await this.callOracle(rpcUrl, normalizedAddress);
        this.setCachedResult(cacheKey, sanctioned);
      }

      const signals: RiskSignal[] = [];

      if (sanctioned) {
        signals.push({
          provider: this.name,
          category: 'SANCTIONS',
          severity: 'SEVERE',
          riskScore: 95,
          actions: ['DENY', 'REVIEW'],
          description:
            `Address ${input.address} flagged as sanctioned by the Chainalysis on-chain oracle ` +
            `(contract ${CHAINALYSIS_ORACLE_ADDRESS} on ${chain})`,
          direction: 'BOTH',
          metadata: {
            oracleContract: CHAINALYSIS_ORACLE_ADDRESS,
            chain,
            queriedAt: screenedAt,
          },
        });
      }

      return {
        provider: this.name,
        matched: sanctioned,
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
        error: `ChainalysisOracleProvider: Oracle call failed on ${chain}: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - start,
        screenedAt,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Health check
  // --------------------------------------------------------------------------

  /**
   * Verify RPC connectivity by calling the oracle with the zero address.
   *
   * The zero address (`0x0000...0000`) should not be sanctioned, so the oracle
   * should return `false`. Any successful response (true or false) indicates
   * the RPC and oracle contract are reachable.
   */
  async isHealthy(): Promise<boolean> {
    // Find any configured RPC URL to test
    const chains = Object.keys(this.rpcUrls);
    if (chains.length === 0) {
      return false;
    }

    const chain = chains[0]!;
    const rpcUrl = this.rpcUrls[chain]!;
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    try {
      // We don't care about the boolean result -- just that the call succeeds
      await this.callOracle(rpcUrl, zeroAddress);
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Make a raw `eth_call` to the Chainalysis oracle's `isSanctioned(address)` function.
   *
   * @param rpcUrl - JSON-RPC endpoint URL
   * @param address - Lowercased Ethereum address to check (with or without 0x prefix)
   * @returns true if the oracle reports the address as sanctioned
   */
  private async callOracle(rpcUrl: string, address: string): Promise<boolean> {
    // ABI-encode: function selector (4 bytes) + address padded to 32 bytes
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    const paddedAddress = cleanAddress.padStart(64, '0');
    const callData = `${IS_SANCTIONED_SELECTOR}${paddedAddress}`;

    const payload = {
      jsonrpc: '2.0' as const,
      method: 'eth_call',
      params: [
        {
          to: CHAINALYSIS_ORACLE_ADDRESS,
          data: callData,
        },
        'latest',
      ],
      id: 1,
    };

    let response: Response;
    try {
      response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(
        `Failed to connect to RPC endpoint ${rpcUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `RPC endpoint returned HTTP ${response.status} ${response.statusText}`,
      );
    }

    let json: { result?: string; error?: { message: string; code: number } };
    try {
      json = (await response.json()) as typeof json;
    } catch {
      throw new Error('Failed to parse JSON response from RPC endpoint');
    }

    if (json.error) {
      throw new Error(
        `RPC error (code ${json.error.code}): ${json.error.message}`,
      );
    }

    if (typeof json.result !== 'string') {
      throw new Error(
        `Unexpected RPC response: missing "result" field. Got: ${JSON.stringify(json)}`,
      );
    }

    // The result is an ABI-encoded bool (32 bytes).
    // 0x000...0001 = true (sanctioned), 0x000...0000 = false (not sanctioned)
    return this.decodeBoolResult(json.result);
  }

  /**
   * Decode an ABI-encoded boolean return value from an eth_call.
   *
   * The return data is a 32-byte (64 hex char) value. Any non-zero value
   * is treated as `true` per Solidity's bool encoding.
   *
   * @param hexData - The hex-encoded return data (with 0x prefix)
   * @returns The decoded boolean value
   */
  private decodeBoolResult(hexData: string): boolean {
    // Strip 0x prefix if present
    const data = hexData.startsWith('0x') ? hexData.slice(2) : hexData;

    // An empty response or all-zero response means false
    if (data.length === 0) {
      return false;
    }

    // Parse the last byte (or check if any non-zero byte exists)
    // Standard ABI encoding: bool is right-padded in 32 bytes
    const value = BigInt(`0x${data}`);
    return value !== 0n;
  }

  /**
   * Look up a cached oracle result. Returns null if no valid cache entry exists.
   *
   * @param cacheKey - The cache key (`chain:address`)
   * @returns The cached sanctioned boolean, or null if not cached / expired
   */
  private getCachedResult(cacheKey: string): boolean | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.cachedAt;
    if (age > this.cacheTimeMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.sanctioned;
  }

  /**
   * Store an oracle result in the cache.
   *
   * @param cacheKey - The cache key (`chain:address`)
   * @param sanctioned - Whether the address is sanctioned
   */
  private setCachedResult(cacheKey: string, sanctioned: boolean): void {
    this.cache.set(cacheKey, {
      sanctioned,
      cachedAt: Date.now(),
    });
  }
}
