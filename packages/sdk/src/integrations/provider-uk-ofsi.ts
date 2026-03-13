// ============================================================================
// Kontext SDK - UK OFSI Address Provider
// ============================================================================
//
// Built-in address screening provider using the UK Office of Financial
// Sanctions Implementation (OFSI) Consolidated List.
// Browser-safe, zero API calls, O(1) Set lookup.
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
} from './screening-provider.js';
import { UK_OFSI_ADDRESSES } from './data/uk-ofsi-addresses.js';

/** Combined address set for O(1) lookup (lowercase) */
const ADDRESS_SET = new Set(
  UK_OFSI_ADDRESSES.map((a) => a.toLowerCase()),
);

/** Original-case lookup map */
const ORIGINAL_CASE = new Map<string, string>();
for (const addr of UK_OFSI_ADDRESSES) {
  ORIGINAL_CASE.set(addr.toLowerCase(), addr);
}

/**
 * UK OFSI Address Provider.
 *
 * Screens blockchain addresses against the UK OFSI Consolidated List.
 * Coverage is limited compared to OFAC — most UK sanctions are entity-name-based.
 * For comprehensive UK entity screening, use OpenSanctionsProvider.
 *
 * - **Free tier**, no API key required
 * - **Browser-safe** — pure in-memory lookups
 *
 * @example
 * ```typescript
 * const provider = new UKOFSIProvider();
 * const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
 * // result.hit === true (Lazarus Group, OFSI designated)
 * ```
 */
export class UKOFSIProvider implements ScreeningProvider {
  readonly id = 'uk-ofsi-address';
  readonly name = 'UK OFSI Address Screener';
  readonly lists: readonly SanctionsList[] = ['UK_OFSI'];
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

    if (ADDRESS_SET.has(lower)) {
      const originalAddr = ORIGINAL_CASE.get(lower) ?? query;
      matches.push({
        list: 'UK_OFSI',
        matchType: 'exact_address',
        similarity: 1.0,
        matchedValue: originalAddr,
        entityStatus: 'active',
        program: 'OFSI_CONSOLIDATED',
      });
    }

    return {
      providerId: this.id,
      hit: matches.length > 0,
      matches,
      listsChecked: this.lists,
      entriesSearched: ADDRESS_SET.size,
      durationMs: Date.now() - start,
    };
  }

  isAvailable(): boolean {
    return true;
  }

  getEntryCount(): number {
    return ADDRESS_SET.size;
  }
}
