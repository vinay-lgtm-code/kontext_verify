// ============================================================================
// Kontext SDK - TRM Labs Sanctions Screening Provider
// ============================================================================
//
// Screens blockchain addresses via the TRM Labs free sanctions API.
// Address-only — does not support entity name screening.
//
// - **Free tier** — 100K req/day with API key, 100 req/day without
// - **Requires API key** from TRM Labs (developer brings own key)
// - **Browser-compatible** — simple REST API
// - **25 blockchains** supported including non-EVM (Solana, Bitcoin, Tron)
//

import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningMatch,
  ScreeningContext,
  SanctionsList,
  QueryType,
} from './screening-provider.js';

const DEFAULT_BASE_URL = 'https://api.trmlabs.com/public/v2';

export interface TRMLabsConfig {
  /** TRM Labs API key */
  apiKey: string;
  /** API base URL (default: https://api.trmlabs.com/public/v2) */
  baseUrl?: string;
}

/** TRM Labs screening response shape */
interface TRMScreeningResponse {
  address: string;
  isSanctioned: boolean;
}

/**
 * TRM Labs Sanctions Screening Provider.
 *
 * Screens blockchain addresses via the TRM Labs free sanctions API.
 * Covers 25 blockchains with cross-chain detection. Address-only —
 * does not support entity name screening.
 *
 * - **Free** — 100K req/day with API key
 * - **Browser-compatible** — simple REST API
 *
 * @example
 * ```typescript
 * const provider = new TRMLabsProvider({
 *   apiKey: process.env.TRM_API_KEY!,
 * });
 * const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
 * ```
 */
export class TRMLabsProvider implements ScreeningProvider {
  readonly id = 'trm-labs';
  readonly name = 'TRM Labs Sanctions Screening';
  readonly lists: readonly SanctionsList[] = ['OFAC_SDN'];
  readonly requiresApiKey = true;
  readonly browserCompatible = true;
  readonly queryTypes: readonly QueryType[] = ['address'];

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TRMLabsConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async screen(query: string, _context?: ScreeningContext): Promise<ScreeningResult> {
    const t0 = Date.now();

    try {
      const res = await fetch(`${this.baseUrl}/screening/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify([{ address: query }]),
      });

      if (!res.ok) {
        return this.errorResult(`TRM Labs API error: ${res.status}`, t0);
      }

      const data = (await res.json()) as TRMScreeningResponse[];
      const entry = data[0];

      if (!entry) {
        return {
          providerId: this.id,
          hit: false,
          matches: [],
          listsChecked: this.lists,
          entriesSearched: 1,
          durationMs: Date.now() - t0,
        };
      }

      const matches: ScreeningMatch[] = [];
      if (entry.isSanctioned) {
        matches.push({
          list: 'OFAC_SDN',
          matchType: 'exact_address',
          similarity: 1.0,
          matchedValue: query.toLowerCase(),
          entityStatus: 'active',
          entityName: undefined,
          program: undefined,
        });
      }

      return {
        providerId: this.id,
        hit: entry.isSanctioned,
        matches,
        listsChecked: this.lists,
        entriesSearched: 1,
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
