// ============================================================================
// Kontext SDK - Kontext Cloud Screening Provider
// ============================================================================
//
// Screens addresses and entity names against Kontext's pre-cached government
// sanctions data (OFAC SDN, UK Sanctions List, EU FSF). All lookups hit the
// Kontext server — no third-party API keys needed.
//
// - **Pay-as-you-go tier** (requires Kontext API key)
// - **Browser-compatible** — HTTP calls only
// - Supports both address and entity name queries
//
// Coverage: ~95K entities, ~1,300 crypto addresses from 3 government sources.
// Address lookup: O(1) sub-ms. Entity name search: 1-5ms fuzzy matching.
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
} from './screening-provider.js';
import { isBlockchainAddress } from './screening-provider.js';

const DEFAULT_API_URL = 'https://api.getkontext.com';

export interface KontextCloudScreeningConfig {
  /** Kontext API key (not a third-party key) */
  apiKey: string;
  /** Kontext project ID */
  projectId: string;
  /** API base URL (default: https://api.getkontext.com) */
  apiUrl?: string;
  /** Fuzzy match threshold for entity names (default: 0.85) */
  threshold?: number;
  /** Max entity results (default: 5) */
  maxResults?: number;
}

/** Server response for address screening */
interface AddressResponse {
  hit: boolean;
  address: string;
  entity?: {
    id: string;
    name: string;
    type: string;
    lists: string[];
    programs: string[];
    status: string;
  };
  listsChecked: string[];
  totalAddresses: number;
  durationMs: number;
}

/** Server response for entity screening */
interface EntityResponse {
  hit: boolean;
  query: string;
  matches: Array<{
    entityId: string;
    name: string;
    matchedOn: string;
    similarity: number;
    type: string;
    lists: string[];
    programs: string[];
    status: string;
    cryptoAddresses: string[];
  }>;
  threshold: number;
  listsChecked: string[];
  totalEntities: number;
  durationMs: number;
}

/**
 * Kontext Cloud Screening Provider.
 *
 * Screens addresses and entity names against Kontext's pre-cached
 * government sanctions data. Covers OFAC SDN (~69K entities, ~1,245
 * crypto addresses), UK Sanctions List (~12K entities), and EU FSF
 * (~14K entities).
 *
 * - **Pay-as-you-go**, requires Kontext API key
 * - **Browser-compatible** — all HTTP
 * - Supports address + entity name queries
 *
 * @example
 * ```typescript
 * const provider = new KontextCloudScreeningProvider({
 *   apiKey: 'sk_live_...',
 *   projectId: 'my-project',
 * });
 *
 * // Address lookup (O(1) sub-ms on server)
 * const result = await provider.screen('0x1234...');
 *
 * // Entity name search (fuzzy, 1-5ms on server)
 * const result = await provider.screen('Lazarus Group');
 * ```
 */
export class KontextCloudScreeningProvider implements ScreeningProvider {
  readonly id = 'kontext-cloud';
  readonly name = 'Kontext Cloud Screening';
  readonly lists: readonly SanctionsList[] = ['OFAC_SDN', 'UK_OFSI', 'EU_CONSOLIDATED'];
  readonly requiresApiKey = true;
  readonly browserCompatible = true;
  readonly queryTypes: readonly QueryType[] = ['both'];

  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly apiUrl: string;
  private readonly threshold: number;
  private readonly maxResults: number;

  constructor(config: KontextCloudScreeningConfig) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.threshold = config.threshold ?? 0.85;
    this.maxResults = config.maxResults ?? 5;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async screen(query: string, _context?: ScreeningContext): Promise<ScreeningResult> {
    const t0 = Date.now();

    if (isBlockchainAddress(query)) {
      return this.screenAddress(query, t0);
    }
    return this.screenEntity(query, t0);
  }

  private async screenAddress(address: string, t0: number): Promise<ScreeningResult> {
    try {
      const res = await fetch(`${this.apiUrl}/v1/screening/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Project-Id': this.projectId,
        },
        body: JSON.stringify({ address }),
      });

      if (!res.ok) {
        return this.errorResult(`Server error: ${res.status}`, t0);
      }

      const data = (await res.json()) as AddressResponse;

      const matches: ScreeningMatch[] = [];
      if (data.hit && data.entity) {
        matches.push({
          list: (data.entity.lists[0] as SanctionsList) ?? 'OFAC_SDN',
          matchType: 'exact_address',
          similarity: 1.0,
          matchedValue: address.toLowerCase(),
          entityStatus: data.entity.status === 'delisted' ? 'delisted' : 'active',
          entityName: data.entity.name,
          program: data.entity.programs[0],
        });
      }

      return {
        providerId: this.id,
        hit: data.hit,
        matches,
        listsChecked: this.lists,
        entriesSearched: data.totalAddresses,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      return this.errorResult(err instanceof Error ? err.message : 'Network error', t0);
    }
  }

  private async screenEntity(query: string, t0: number): Promise<ScreeningResult> {
    try {
      const res = await fetch(`${this.apiUrl}/v1/screening/entity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Project-Id': this.projectId,
        },
        body: JSON.stringify({
          query,
          threshold: this.threshold,
          maxResults: this.maxResults,
        }),
      });

      if (!res.ok) {
        return this.errorResult(`Server error: ${res.status}`, t0);
      }

      const data = (await res.json()) as EntityResponse;

      const matches: ScreeningMatch[] = data.matches.map(m => ({
        list: (m.lists[0] as SanctionsList) ?? 'OFAC_SDN',
        matchType: m.matchedOn === m.name ? 'fuzzy_name' as const : 'alias_match' as const,
        similarity: m.similarity,
        matchedValue: m.matchedOn,
        entityStatus: m.status === 'delisted' ? 'delisted' as const : 'active' as const,
        entityName: m.name,
        program: m.programs[0],
      }));

      return {
        providerId: this.id,
        hit: data.hit,
        matches,
        listsChecked: this.lists,
        entriesSearched: data.totalEntities,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      return this.errorResult(err instanceof Error ? err.message : 'Network error', t0);
    }
  }

  private errorResult(error: string, t0: number): ScreeningResult {
    return {
      providerId: this.id,
      hit: false,
      matches: [],
      listsChecked: this.lists,
      entriesSearched: 0,
      durationMs: Date.now() - t0,
      error,
    };
  }
}
