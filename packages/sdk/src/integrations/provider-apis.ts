// ============================================================================
// Kontext SDK - External API Screening Providers
// ============================================================================
//
// API-based screening providers that require developer-supplied API keys.
// All providers use native fetch() — zero additional runtime dependencies.
//
// Providers:
// - OpenSanctionsProvider: REST API, address + entity name, 331+ sources
// - ChainalysisFreeAPIProvider: REST API, address-only
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
  EntityStatus,
} from './screening-provider.js';
import { isBlockchainAddress } from './screening-provider.js';

// ---------------------------------------------------------------------------
// OpenSanctionsProvider
// ---------------------------------------------------------------------------

/** OpenSanctions /match API response shape */
interface OpenSanctionsMatchResponse {
  responses: Record<string, {
    query: Record<string, unknown>;
    results: Array<{
      id: string;
      caption: string;
      schema: string;
      properties: Record<string, string[]>;
      datasets: string[];
      features: Record<string, number>;
      score: number;
      match: boolean;
    }>;
    total: { value: number; relation: string };
  }>;
}

/**
 * OpenSanctions REST API Provider.
 *
 * Screens both blockchain addresses AND entity names via the OpenSanctions
 * `/match` endpoint. Covers 331+ sanctions sources worldwide including
 * OFAC, EU, UN, UK, and APAC domestic lists.
 *
 * - **Free tier** in Kontext (metered by events)
 * - **Requires API key** from OpenSanctions (developer brings own key)
 * - **NOT browser-compatible** — requires server-side API calls
 *
 * @example
 * ```typescript
 * const provider = new OpenSanctionsProvider({
 *   apiKey: process.env.OPENSANCTIONS_API_KEY!,
 * });
 * const result = await provider.screen('Lazarus Group');
 * ```
 */
export class OpenSanctionsProvider implements ScreeningProvider {
  readonly id = 'opensanctions-api';
  readonly name = 'OpenSanctions (API)';
  readonly lists: readonly SanctionsList[] = ['OPENSANCTIONS'];
  readonly requiresApiKey = true;
  readonly browserCompatible = false;
  readonly queryTypes: readonly QueryType[] = ['both'];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly dataset: string;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    dataset?: string;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.opensanctions.org';
    this.dataset = config.dataset ?? 'default';
  }

  async screen(
    query: string,
    _context?: ScreeningContext,
  ): Promise<ScreeningResult> {
    const start = Date.now();

    const isAddr = isBlockchainAddress(query);

    // Build match request based on query type
    const schema = isAddr ? 'CryptoWallet' : 'LegalEntity';
    const properties: Record<string, string[]> = isAddr
      ? { cryptoAddress: [query] }
      : { name: [query] };

    const body = {
      queries: {
        q: {
          schema,
          properties,
        },
      },
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/match/${this.dataset}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        return {
          providerId: this.id,
          hit: false,
          matches: [],
          listsChecked: this.lists,
          entriesSearched: 0,
          durationMs: Date.now() - start,
          error: `OpenSanctions API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as OpenSanctionsMatchResponse;
      const queryResult = data.responses?.['q'];

      if (!queryResult) {
        return {
          providerId: this.id,
          hit: false,
          matches: [],
          listsChecked: this.lists,
          entriesSearched: 0,
          durationMs: Date.now() - start,
        };
      }

      const matches: ScreeningMatch[] = queryResult.results
        .filter((r) => r.match && r.score >= 0.7)
        .map((r) => ({
          list: 'OPENSANCTIONS' as SanctionsList,
          matchType: (r.score >= 0.99 ? 'exact_address' : 'fuzzy_name') as ScreeningMatch['matchType'],
          similarity: r.score,
          matchedValue: r.caption,
          entityStatus: 'active' as EntityStatus,
          entityName: r.caption,
          program: r.datasets.join(', '),
        }));

      const hasActiveHit = matches.some((m) => m.entityStatus === 'active');

      return {
        providerId: this.id,
        hit: hasActiveHit,
        matches,
        listsChecked: this.lists,
        entriesSearched: queryResult.total?.value ?? 0,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        providerId: this.id,
        hit: false,
        matches: [],
        listsChecked: this.lists,
        entriesSearched: 0,
        durationMs: Date.now() - start,
        error: `OpenSanctions API error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// ---------------------------------------------------------------------------
// ChainalysisFreeAPIProvider
// ---------------------------------------------------------------------------

/** Chainalysis screening API response shape */
interface ChainalysisScreeningResponse {
  identifications: Array<{
    category: string;
    name: string;
    description: string;
    url: string;
  }>;
}

/**
 * Chainalysis Free API Provider.
 *
 * Screens blockchain addresses via the Chainalysis free screening API.
 * Address-only — does not support entity name screening.
 *
 * - **Free tier** in Kontext (metered by events)
 * - **Requires API key** from Chainalysis (developer brings own key)
 * - **NOT browser-compatible** — requires server-side API calls
 *
 * @example
 * ```typescript
 * const provider = new ChainalysisFreeAPIProvider({
 *   apiKey: process.env.CHAINALYSIS_API_KEY!,
 * });
 * const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
 * ```
 */
export class ChainalysisFreeAPIProvider implements ScreeningProvider {
  readonly id = 'chainalysis-free-api';
  readonly name = 'Chainalysis Free API';
  readonly lists: readonly SanctionsList[] = ['CHAINALYSIS'];
  readonly requiresApiKey = true;
  readonly browserCompatible = false;
  readonly queryTypes: readonly QueryType[] = ['address'];

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://public.chainalysis.com/api/v1';
  }

  async screen(
    query: string,
    _context?: ScreeningContext,
  ): Promise<ScreeningResult> {
    const start = Date.now();

    try {
      const response = await fetch(
        `${this.baseUrl}/address/${query}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json',
          },
        },
      );

      if (!response.ok) {
        return {
          providerId: this.id,
          hit: false,
          matches: [],
          listsChecked: this.lists,
          entriesSearched: 0,
          durationMs: Date.now() - start,
          error: `Chainalysis API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as ChainalysisScreeningResponse;
      const identifications = data.identifications ?? [];

      const matches: ScreeningMatch[] = identifications.map((id) => ({
        list: 'CHAINALYSIS' as SanctionsList,
        matchType: 'exact_address' as ScreeningMatch['matchType'],
        similarity: 1.0,
        matchedValue: query,
        entityStatus: 'active' as EntityStatus,
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
      return {
        providerId: this.id,
        hit: false,
        matches: [],
        listsChecked: this.lists,
        entriesSearched: 0,
        durationMs: Date.now() - start,
        error: `Chainalysis API error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
