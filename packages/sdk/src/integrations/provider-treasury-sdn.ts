// ============================================================================
// Kontext SDK - OFAC SDN Address Provider
// ============================================================================
//
// Built-in address screening provider using the OFAC SDN list.
// Browser-safe, zero API calls, O(1) Set lookup.
//
// Imports shared address data from data/ofac-addresses.ts so that
// both UsdcCompliance and this provider use the same source of truth.
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
} from './screening-provider.js';
import {
  OFAC_SDN_ACTIVE_ADDRESSES,
  OFAC_SDN_DELISTED_ADDRESSES,
  OFAC_SDN_ADDRESSES,
} from './data/ofac-addresses.js';

/** Active address set for O(1) lookup (lowercase) */
const ACTIVE_SET = new Set(
  OFAC_SDN_ACTIVE_ADDRESSES.map((a) => a.toLowerCase()),
);

/** Delisted address set for backward-compat risk scoring */
const DELISTED_SET = new Set(
  OFAC_SDN_DELISTED_ADDRESSES.map((a) => a.toLowerCase()),
);

/** Full set (active + delisted) */
const ALL_SET = new Set(
  OFAC_SDN_ADDRESSES.map((a) => a.toLowerCase()),
);

/** Original-case lookup map */
const ORIGINAL_CASE = new Map<string, string>();
for (const addr of OFAC_SDN_ADDRESSES) {
  ORIGINAL_CASE.set(addr.toLowerCase(), addr);
}

/**
 * OFAC SDN Address Provider.
 *
 * Screens blockchain addresses against the U.S. Treasury OFAC Specially
 * Designated Nationals (SDN) list. Uses ~33 hardcoded addresses from
 * the public SDN list. Distinguishes between actively sanctioned and
 * delisted (formerly sanctioned) addresses.
 *
 * - **Free tier**, no API key required
 * - **Browser-safe** — pure in-memory lookups
 * - O(1) Set lookup, case-insensitive
 *
 * @example
 * ```typescript
 * const provider = new OFACAddressProvider();
 * const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
 * // result.hit === true (Lazarus Group, OFAC sanctioned)
 * ```
 */
export class OFACAddressProvider implements ScreeningProvider {
  readonly id = 'ofac-sdn-address';
  readonly name = 'OFAC SDN Address Screener';
  readonly lists: readonly SanctionsList[] = ['OFAC_SDN'];
  readonly requiresApiKey = false;
  readonly browserCompatible = true;
  readonly queryTypes: readonly QueryType[] = ['address'];

  async screen(
    query: string,
    _context?: ScreeningContext,
  ): Promise<ScreeningResult> {
    const start = Date.now();
    const lower = query.toLowerCase();
    const matches: ScreeningMatch[] = [];

    if (ACTIVE_SET.has(lower)) {
      const originalAddr = ORIGINAL_CASE.get(lower) ?? query;
      matches.push({
        list: 'OFAC_SDN',
        matchType: 'exact_address',
        similarity: 1.0,
        matchedValue: originalAddr,
        entityStatus: 'active',
        program: 'SDN',
      });
    } else if (DELISTED_SET.has(lower)) {
      const originalAddr = ORIGINAL_CASE.get(lower) ?? query;
      matches.push({
        list: 'OFAC_SDN',
        matchType: 'exact_address',
        similarity: 1.0,
        matchedValue: originalAddr,
        entityStatus: 'delisted',
        program: 'SDN_DELISTED',
      });
    }

    // Only active matches count as a hit
    const hasActiveHit = matches.some((m) => m.entityStatus === 'active');

    return {
      providerId: this.id,
      hit: hasActiveHit,
      matches,
      listsChecked: this.lists,
      entriesSearched: ALL_SET.size,
      durationMs: Date.now() - start,
    };
  }

  isAvailable(): boolean {
    return true;
  }

  getEntryCount(): number {
    return ALL_SET.size;
  }
}
