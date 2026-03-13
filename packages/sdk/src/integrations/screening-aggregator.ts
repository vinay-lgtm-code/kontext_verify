// ============================================================================
// Kontext SDK - Screening Aggregator
// ============================================================================
//
// Orchestrates multiple ScreeningProviders with:
// - Auto-detection of query type (address vs entity name)
// - Routing to compatible providers based on queryTypes
// - Consensus strategies (ANY_MATCH, ALL_MATCH, MAJORITY)
// - Per-provider timeout and error handling
// - Blocklist/allowlist overrides
// - Event metering hook for PlanManager integration
// - Jurisdiction-aware coverage tracking
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
  isBlockchainAddress,
  providerSupportsQuery,
  getRequiredLists,
} from './screening-provider.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsensusStrategy = 'ANY_MATCH' | 'ALL_MATCH' | 'MAJORITY';

export interface ScreeningAggregatorConfig {
  providers: ScreeningProvider[];
  consensus?: ConsensusStrategy;
  blocklist?: string[];
  allowlist?: string[];
  continueOnError?: boolean;
  providerTimeoutMs?: number;
  onEvent?: () => void;
  providerRateLimitPerSec?: number;
}

export interface AggregatedScreeningResult {
  providerId: string;
  hit: boolean;
  matches: ScreeningMatch[];
  listsChecked: readonly SanctionsList[];
  entriesSearched: number;
  durationMs: number;
  queryType: QueryType;
  totalProviders: number;
  hitCount: number;
  consensus: ConsensusStrategy;
  blocklisted?: boolean;
  allowlisted?: boolean;
  errors: Array<{ providerId: string; error: string }>;
  uncoveredLists: SanctionsList[];
  providerResults: ScreeningResult[];
}

// ---------------------------------------------------------------------------
// ScreeningAggregator
// ---------------------------------------------------------------------------

/**
 * Multi-provider screening orchestrator.
 *
 * Routes queries to compatible providers based on auto-detected query type,
 * applies consensus strategy, and tracks jurisdiction coverage.
 *
 * @example
 * ```typescript
 * const agg = new ScreeningAggregator({
 *   providers: [new OFACAddressProvider(), new UKOFSIProvider()],
 *   consensus: 'ANY_MATCH',
 *   onEvent: () => planManager.recordEvent(),
 * });
 *
 * const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
 * ```
 */
export class ScreeningAggregator {
  private readonly providers: ScreeningProvider[];
  private readonly consensus: ConsensusStrategy;
  private readonly blocklistSet: Set<string>;
  private readonly allowlistSet: Set<string>;
  private readonly continueOnError: boolean;
  private readonly providerTimeoutMs: number | undefined;
  private readonly onEvent: (() => void) | undefined;

  constructor(config: ScreeningAggregatorConfig) {
    this.providers = config.providers;
    this.consensus = config.consensus ?? 'ANY_MATCH';
    this.blocklistSet = new Set(
      (config.blocklist ?? []).map((s) => s.toLowerCase()),
    );
    this.allowlistSet = new Set(
      (config.allowlist ?? []).map((s) => s.toLowerCase()),
    );
    this.continueOnError = config.continueOnError ?? true;
    this.providerTimeoutMs = config.providerTimeoutMs;
    this.onEvent = config.onEvent;
  }

  /**
   * Screen a single query (address or entity name).
   */
  async screen(
    query: string,
    context?: ScreeningContext,
  ): Promise<AggregatedScreeningResult> {
    const start = Date.now();
    const queryLower = query.toLowerCase();
    const queryType: QueryType = isBlockchainAddress(query) ? 'address' : 'entity_name';

    // Fire event meter
    this.onEvent?.();

    // Check allowlist first (overrides blocklist)
    if (this.allowlistSet.has(queryLower)) {
      return this.buildResult({
        queryType,
        start,
        allowlisted: true,
        context,
      });
    }

    // Check blocklist
    if (this.blocklistSet.has(queryLower)) {
      return this.buildResult({
        queryType,
        start,
        blocklisted: true,
        context,
      });
    }

    // Filter to available providers that support this query type
    const compatibleProviders = this.providers.filter(
      (p) => p.isAvailable() && providerSupportsQuery(p, query),
    );

    if (compatibleProviders.length === 0) {
      return this.buildResult({
        queryType,
        start,
        providerResults: [],
        context,
      });
    }

    // Run all compatible providers in parallel
    const results: ScreeningResult[] = [];
    const errors: Array<{ providerId: string; error: string }> = [];

    const promises = compatibleProviders.map(async (provider) => {
      try {
        const result = await this.runWithTimeout(provider, query, context);
        return { type: 'success' as const, result };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { type: 'error' as const, providerId: provider.id, error: errorMsg };
      }
    });

    const settled = await Promise.all(promises);

    for (const outcome of settled) {
      if (outcome.type === 'success') {
        results.push(outcome.result);
      } else {
        if (!this.continueOnError) {
          throw new Error(outcome.error);
        }
        errors.push({ providerId: outcome.providerId, error: outcome.error });
      }
    }

    return this.buildResult({
      queryType,
      start,
      providerResults: results,
      errors,
      context,
    });
  }

  /**
   * Screen multiple queries in batch.
   */
  async screenBatch(
    queries: string[],
    context?: ScreeningContext,
  ): Promise<Map<string, AggregatedScreeningResult>> {
    const results = new Map<string, AggregatedScreeningResult>();
    const promises = queries.map(async (query) => {
      const result = await this.screen(query, context);
      return { query, result };
    });

    const settled = await Promise.all(promises);
    for (const { query, result } of settled) {
      results.set(query, result);
    }
    return results;
  }

  /**
   * Get available providers, optionally filtered by query type.
   */
  getAvailableProviders(queryType?: QueryType): ScreeningProvider[] {
    return this.providers.filter((p) => {
      if (!p.isAvailable()) return false;
      if (!queryType) return true;
      return p.queryTypes.includes(queryType) || p.queryTypes.includes('both');
    });
  }

  /**
   * Get the union of all sanctions lists covered by available providers.
   */
  getCoveredLists(): SanctionsList[] {
    const lists = new Set<SanctionsList>();
    for (const p of this.providers) {
      if (p.isAvailable()) {
        for (const list of p.lists) {
          lists.add(list);
        }
      }
    }
    return Array.from(lists);
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private async runWithTimeout(
    provider: ScreeningProvider,
    query: string,
    context?: ScreeningContext,
  ): Promise<ScreeningResult> {
    if (!this.providerTimeoutMs) {
      return provider.screen(query, context);
    }

    return Promise.race([
      provider.screen(query, context),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Provider ${provider.id} timed out after ${this.providerTimeoutMs}ms`)),
          this.providerTimeoutMs,
        ),
      ),
    ]);
  }

  private buildResult(opts: {
    queryType: QueryType;
    start: number;
    providerResults?: ScreeningResult[];
    errors?: Array<{ providerId: string; error: string }>;
    blocklisted?: boolean;
    allowlisted?: boolean;
    context?: ScreeningContext;
  }): AggregatedScreeningResult {
    const {
      queryType,
      start,
      providerResults = [],
      errors = [],
      blocklisted = false,
      allowlisted = false,
      context,
    } = opts;

    // If blocklisted, return immediate hit
    if (blocklisted) {
      return {
        providerId: 'aggregator',
        hit: true,
        matches: [],
        listsChecked: [],
        entriesSearched: 0,
        durationMs: Date.now() - start,
        queryType,
        totalProviders: 0,
        hitCount: 0,
        consensus: this.consensus,
        blocklisted: true,
        errors: [],
        uncoveredLists: [],
        providerResults: [],
      };
    }

    // If allowlisted, return immediate pass
    if (allowlisted) {
      return {
        providerId: 'aggregator',
        hit: false,
        matches: [],
        listsChecked: [],
        entriesSearched: 0,
        durationMs: Date.now() - start,
        queryType,
        totalProviders: 0,
        hitCount: 0,
        consensus: this.consensus,
        allowlisted: true,
        errors: [],
        uncoveredLists: [],
        providerResults: [],
      };
    }

    // Aggregate results
    const allMatches: ScreeningMatch[] = [];
    const allListsChecked = new Set<SanctionsList>();
    let totalEntries = 0;

    for (const r of providerResults) {
      allMatches.push(...r.matches);
      for (const list of r.listsChecked) {
        allListsChecked.add(list);
      }
      totalEntries += r.entriesSearched;
    }

    const hitCount = providerResults.filter((r) => r.hit).length;
    const totalProviders = providerResults.length;

    // Apply consensus strategy
    let hit: boolean;
    switch (this.consensus) {
      case 'ALL_MATCH':
        hit = totalProviders > 0 && hitCount === totalProviders;
        break;
      case 'MAJORITY':
        hit = totalProviders > 0 && hitCount > totalProviders / 2;
        break;
      case 'ANY_MATCH':
      default:
        hit = hitCount > 0;
        break;
    }

    // Compute uncovered lists
    const requiredLists = getRequiredLists(context);
    const coveredLists = allListsChecked;
    const uncoveredLists = requiredLists.filter(
      (l) => !coveredLists.has(l),
    ) as SanctionsList[];

    return {
      providerId: 'aggregator',
      hit,
      matches: allMatches,
      listsChecked: Array.from(allListsChecked),
      entriesSearched: totalEntries,
      durationMs: Date.now() - start,
      queryType,
      totalProviders,
      hitCount,
      consensus: this.consensus,
      errors,
      uncoveredLists,
      providerResults,
    };
  }
}
