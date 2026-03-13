// ============================================================================
// Kontext SDK - OFAC SDN Entity Name Provider
// ============================================================================
//
// Built-in entity name screening provider using the OFAC SDN list.
// Wraps the existing OFACSanctionsScreener for fuzzy name matching
// against 18,664 OFAC SDN entities.
//
// NOT browser-compatible — loads full SDN XML data (~4MB parsed).
// When OFACSanctionsScreener is unavailable (free-tier CI build or
// browser environment), isAvailable() returns false.
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
} from './screening-provider.js';

/** Similarity threshold for fuzzy name matching (higher = fewer false positives) */
const NAME_MATCH_THRESHOLD = 0.85;

/** Minimum matched name length to avoid tiny alias false positives */
const MIN_MATCH_LENGTH = 4;

/** Lazy-loaded screener interface */
interface EntityScreenResult {
  entity: { list: string; name?: string; programs?: string[] };
  similarity: number;
  matchedOn: string;
}

interface EntityScreener {
  searchEntityName(query: string, threshold: number): EntityScreenResult[];
  getEntityCount?(): number;
}

let _screener: EntityScreener | null = null;
let _screenerLoaded = false;

function getScreener(): EntityScreener | null {
  if (!_screenerLoaded) {
    _screenerLoaded = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./ofac-sanctions.js');
      if (mod.OFACSanctionsScreener) {
        _screener = new mod.OFACSanctionsScreener();
      }
    } catch {
      // ofac-sanctions module not available — entity screening disabled
    }
  }
  return _screener;
}

/**
 * OFAC SDN Entity Name Provider.
 *
 * Screens entity/person names against the full OFAC SDN entity database
 * (18,664 entities) using fuzzy string matching. Wraps the existing
 * `OFACSanctionsScreener` from `ofac-sanctions.ts`.
 *
 * - **Free tier**, no API key required
 * - **Node.js only** — loads full SDN data, too large for browser
 * - Fuzzy matching at 0.85 threshold with minimum 4-char match length
 * - Distinguishes between active and delisted entities
 *
 * @example
 * ```typescript
 * const provider = new OFACEntityProvider();
 * if (provider.isAvailable()) {
 *   const result = await provider.screen('Lazarus Group');
 *   // result.hit === true
 * }
 * ```
 */
export class OFACEntityProvider implements ScreeningProvider {
  readonly id = 'ofac-sdn-entity';
  readonly name = 'OFAC SDN Entity Screener';
  readonly lists: readonly SanctionsList[] = ['OFAC_SDN'];
  readonly requiresApiKey = false;
  readonly browserCompatible = false;
  readonly queryTypes: readonly QueryType[] = ['entity_name'];

  async screen(
    query: string,
    _context?: ScreeningContext,
  ): Promise<ScreeningResult> {
    const start = Date.now();
    const screener = getScreener();

    if (!screener) {
      return {
        providerId: this.id,
        hit: false,
        matches: [],
        listsChecked: this.lists,
        entriesSearched: 0,
        durationMs: Date.now() - start,
        error: 'OFACSanctionsScreener not available',
      };
    }

    const rawMatches = screener.searchEntityName(query, NAME_MATCH_THRESHOLD);

    // Filter: enforce threshold + minimum match length to avoid tiny alias false positives
    const filteredMatches = rawMatches.filter(
      (m) => m.similarity >= NAME_MATCH_THRESHOLD && m.matchedOn.length >= MIN_MATCH_LENGTH,
    );

    const matches: ScreeningMatch[] = filteredMatches.map((m) => {
      const isActive = m.entity.list !== 'DELISTED';
      return {
        list: 'OFAC_SDN' as SanctionsList,
        matchType: m.similarity >= 0.99 ? 'exact_address' as const : 'fuzzy_name' as const,
        similarity: m.similarity,
        matchedValue: m.matchedOn,
        entityStatus: isActive ? 'active' as const : 'delisted' as const,
        entityName: m.entity.name,
        program: m.entity.programs?.[0],
      };
    });

    const hasActiveHit = matches.some((m) => m.entityStatus === 'active');

    return {
      providerId: this.id,
      hit: hasActiveHit,
      matches,
      listsChecked: this.lists,
      entriesSearched: screener.getEntityCount?.() ?? 0,
      durationMs: Date.now() - start,
    };
  }

  isAvailable(): boolean {
    return getScreener() !== null;
  }

  getEntryCount(): number {
    const screener = getScreener();
    return screener?.getEntityCount?.() ?? 0;
  }
}
