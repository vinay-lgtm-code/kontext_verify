// ============================================================================
// Kontext SDK - Chainalysis OFAC Oracle Provider
// ============================================================================
//
// Screens blockchain addresses via the Chainalysis OFAC sanctions oracle.
// Supports both on-chain contract query and REST API fallback.
//
// The Chainalysis sanctions oracle is a publicly queryable smart contract
// on Ethereum mainnet that returns whether an address is on the OFAC SDN list.
// Contract: 0x40C57923924B5c5c5455c48D93317139ADDaC8fb
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
} from './screening-provider.js';

/** Chainalysis OFAC Oracle contract address (Ethereum mainnet) */
const ORACLE_CONTRACT = '0x40C57923924B5c5c5455c48D93317139ADDaC8fb';

/** ABI-encoded function selector for isSanctioned(address) */
const IS_SANCTIONED_SELECTOR = '0xdfb80831';

/** Chainalysis Oracle API response shape */
interface OracleApiResponse {
  identifications: Array<{
    category: string;
    name: string;
    description: string;
    url: string;
  }>;
}

/**
 * Chainalysis OFAC Oracle Provider.
 *
 * Screens blockchain addresses against the Chainalysis sanctions oracle,
 * which tracks OFAC SDN addresses. Supports two modes:
 *
 * 1. **REST API mode** (default): Queries the Chainalysis screening API
 * 2. **On-chain mode**: Queries the on-chain oracle contract via eth_call
 *    (requires an Ethereum RPC URL)
 *
 * - **Free tier** in Kontext (metered by events)
 * - **Requires API key** (REST mode) or **RPC URL** (on-chain mode)
 * - **NOT browser-compatible** — requires server-side calls
 *
 * @example
 * ```typescript
 * // REST API mode
 * const provider = new ChainalysisOracleProvider({
 *   apiKey: process.env.CHAINALYSIS_API_KEY!,
 * });
 *
 * // On-chain mode
 * const provider = new ChainalysisOracleProvider({
 *   rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
 * });
 * ```
 */
export class ChainalysisOracleProvider implements ScreeningProvider {
  readonly id = 'chainalysis-oracle';
  readonly name = 'Chainalysis OFAC Oracle';
  readonly lists: readonly SanctionsList[] = ['OFAC_SDN', 'CHAINALYSIS'];
  readonly requiresApiKey = true;
  readonly browserCompatible = false;
  readonly queryTypes: readonly QueryType[] = ['address'];

  private readonly apiKey: string | undefined;
  private readonly rpcUrl: string | undefined;
  private readonly apiBaseUrl: string;

  constructor(config: {
    apiKey?: string;
    rpcUrl?: string;
    apiBaseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.rpcUrl = config.rpcUrl;
    this.apiBaseUrl = config.apiBaseUrl ?? 'https://public.chainalysis.com/api/v1';
  }

  async screen(
    query: string,
    _context?: ScreeningContext,
  ): Promise<ScreeningResult> {
    const start = Date.now();

    // Prefer on-chain oracle if RPC URL is configured
    if (this.rpcUrl) {
      return this.screenOnChain(query, start);
    }

    // Fall back to REST API
    if (this.apiKey) {
      return this.screenApi(query, start);
    }

    return {
      providerId: this.id,
      hit: false,
      matches: [],
      listsChecked: this.lists,
      entriesSearched: 0,
      durationMs: Date.now() - start,
      error: 'No API key or RPC URL configured',
    };
  }

  isAvailable(): boolean {
    return !!(this.apiKey || this.rpcUrl);
  }

  // --------------------------------------------------------------------------
  // On-chain oracle query
  // --------------------------------------------------------------------------

  private async screenOnChain(
    address: string,
    start: number,
  ): Promise<ScreeningResult> {
    try {
      // ABI-encode: isSanctioned(address) — selector + left-padded address
      const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
      const callData = IS_SANCTIONED_SELECTOR + paddedAddress;

      const response = await fetch(this.rpcUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            { to: ORACLE_CONTRACT, data: callData },
            'latest',
          ],
        }),
      });

      if (!response.ok) {
        return this.errorResult(start, `RPC error: ${response.status}`);
      }

      const data = (await response.json()) as { result?: string; error?: { message: string } };

      if (data.error) {
        return this.errorResult(start, `RPC error: ${data.error.message}`);
      }

      // Result is ABI-encoded bool: 0x...01 = true, 0x...00 = false
      const isSanctioned = data.result
        ? parseInt(data.result.slice(-2), 16) === 1
        : false;

      const matches: ScreeningMatch[] = isSanctioned
        ? [{
            list: 'OFAC_SDN',
            matchType: 'exact_address',
            similarity: 1.0,
            matchedValue: address,
            entityStatus: 'active',
            program: 'CHAINALYSIS_ORACLE',
          }]
        : [];

      return {
        providerId: this.id,
        hit: isSanctioned,
        matches,
        listsChecked: this.lists,
        entriesSearched: 1,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return this.errorResult(
        start,
        `Oracle query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // REST API query
  // --------------------------------------------------------------------------

  private async screenApi(
    address: string,
    start: number,
  ): Promise<ScreeningResult> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/address/${address}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey!,
            'Accept': 'application/json',
          },
        },
      );

      if (!response.ok) {
        return this.errorResult(
          start,
          `Chainalysis API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as OracleApiResponse;
      const identifications = data.identifications ?? [];

      const matches: ScreeningMatch[] = identifications.map((id) => ({
        list: 'OFAC_SDN' as SanctionsList,
        matchType: 'exact_address' as ScreeningMatch['matchType'],
        similarity: 1.0,
        matchedValue: address,
        entityStatus: 'active' as const,
        entityName: id.name,
        program: id.category,
      }));

      return {
        providerId: this.id,
        hit: matches.length > 0,
        matches,
        listsChecked: this.lists,
        entriesSearched: 1,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return this.errorResult(
        start,
        `Chainalysis API error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private errorResult(start: number, error: string): ScreeningResult {
    return {
      providerId: this.id,
      hit: false,
      matches: [],
      listsChecked: this.lists,
      entriesSearched: 0,
      durationMs: Date.now() - start,
      error,
    };
  }
}
