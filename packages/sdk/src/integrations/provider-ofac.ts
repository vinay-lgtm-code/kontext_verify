// ============================================================================
// Kontext SDK - OFAC Screening Providers
// ============================================================================
//
// Sanctions screening provider implementing the unified ScreeningProvider
// interface via the Chainalysis on-chain oracle.
//
// Note: The OFACListProvider (0xB10C GitHub dependency) has been removed in
// favor of the TreasurySDNProvider (direct Treasury SDN ingestion). See
// provider-treasury-sdn.ts for the replacement.
//
//   ChainalysisOracleProvider
//      Integrates with the Chainalysis free on-chain sanctions oracle smart
//      contract. The oracle is deployed at the same address across multiple EVM
//      chains and exposes a single `isSanctioned(address)` view function. No
//      API key required -- the check is a simple `eth_call`.
//
//      Oracle: 0x40C57923924B5c5c5455c48D93317139ADDaC8fb
//
// The provider returns structured RiskSignal data suitable for aggregation
// by the ScreeningAggregator. It uses only native `fetch()` -- no ethers.js,
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

// ============================================================================
// Constants
// ============================================================================

/** Chainalysis sanctions oracle contract address (same on all supported chains) */
const CHAINALYSIS_ORACLE_ADDRESS = '0x40C57923924B5c5c5455c48D93317139ADDaC8fb';

/**
 * Function selector for `isSanctioned(address)`.
 * keccak256("isSanctioned(address)") = 0x01e43d40...
 */
const IS_SANCTIONED_SELECTOR = '0x01e43d40';

/** Default cache TTL for oracle results: 5 minutes */
const DEFAULT_CACHE_TIME_MS = 5 * 60 * 1000;

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
