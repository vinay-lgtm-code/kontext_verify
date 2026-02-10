// ============================================================================
// Kontext SDK - Screening Aggregator & Blocklist Manager
// ============================================================================
//
// Provides two core components for unified compliance screening:
//
// 1. **BlocklistManager**: Manages user-defined blocklist and allowlist addresses
//    with O(1) lookup, chain filtering, and time-based expiration. Maps to
//    Circle Compliance Engine Rule #3 (Custom Blocklist).
//
// 2. **ScreeningAggregator**: Combines results from multiple ScreeningProvider
//    instances into a unified screening decision using weighted scoring,
//    configurable thresholds, and parallel provider execution.
//
// Usage:
//   const blocklist = new BlocklistManager();
//   blocklist.addToBlocklist({
//     address: '0xBad...',
//     chains: ['ethereum'],
//     reason: 'Known scammer',
//     addedBy: 'admin',
//     addedAt: new Date().toISOString(),
//   });
//
//   const aggregator = new ScreeningAggregator(
//     [new OFACListProvider(), new ChainalysisFreeAPIProvider({ apiKey: '...' })],
//     { blockThreshold: 80, reviewThreshold: 40 },
//     blocklist,
//   );
//
//   const result = await aggregator.screenAddress({
//     address: '0x...',
//     chain: 'ethereum',
//   });
//   if (result.decision === 'BLOCK') { /* deny transaction */ }
// ============================================================================

import type { Chain } from '../types.js';
import type {
  ScreeningProvider,
  ScreenAddressInput,
  ScreenTransactionProviderInput,
  ProviderScreeningResult,
  RiskSignal,
  RiskSeverity,
  RiskCategory,
  ScreeningAction,
  ListEntry,
  BlocklistConfig,
  UnifiedScreeningResult,
  ScreeningAggregatorConfig,
} from './screening-provider.js';

// ============================================================================
// BlocklistManager
// ============================================================================

/**
 * Manages user-defined blocklist and allowlist addresses for compliance
 * screening. Maps to Circle Compliance Engine Rule #3 (Custom Blocklist).
 *
 * Features:
 * - O(1) address lookup via Map with lowercase keys
 * - Per-chain filtering: entries can target specific chains or all chains
 * - Time-based expiration: entries with an `expiresAt` date are skipped
 *   (not removed) when expired
 * - Bulk import/export for list management
 *
 * @example
 * ```typescript
 * const manager = new BlocklistManager();
 *
 * manager.addToBlocklist({
 *   address: '0xBadActor...',
 *   chains: ['ethereum', 'base'],
 *   reason: 'Known phishing address',
 *   addedBy: 'compliance-team',
 *   addedAt: new Date().toISOString(),
 *   expiresAt: '2026-12-31T23:59:59Z',
 * });
 *
 * if (manager.isBlocklisted('0xbadactor...', 'ethereum')) {
 *   // Block the transaction
 * }
 * ```
 */
export class BlocklistManager {
  /** Internal blocklist store — lowercase address -> ListEntry */
  private readonly blocklist: Map<string, ListEntry> = new Map();
  /** Internal allowlist store — lowercase address -> ListEntry */
  private readonly allowlist: Map<string, ListEntry> = new Map();
  /** Optional configuration */
  private readonly config: BlocklistConfig;

  constructor(config?: BlocklistConfig) {
    this.config = config ?? {};
  }

  // --------------------------------------------------------------------------
  // Blocklist Operations
  // --------------------------------------------------------------------------

  /**
   * Add an address to the blocklist.
   *
   * If the address already exists, the entry is overwritten with the new one.
   *
   * @param entry - The list entry to add
   */
  addToBlocklist(entry: ListEntry): void {
    const key = entry.address.toLowerCase();
    this.blocklist.set(key, entry);
  }

  /**
   * Add an address to the allowlist.
   *
   * If the address already exists, the entry is overwritten with the new one.
   *
   * @param entry - The list entry to add
   */
  addToAllowlist(entry: ListEntry): void {
    const key = entry.address.toLowerCase();
    this.allowlist.set(key, entry);
  }

  /**
   * Remove an address from the blocklist.
   *
   * @param address - The blockchain address to remove (case-insensitive)
   * @returns `true` if the address was found and removed, `false` otherwise
   */
  removeFromBlocklist(address: string): boolean {
    return this.blocklist.delete(address.toLowerCase());
  }

  /**
   * Remove an address from the allowlist.
   *
   * @param address - The blockchain address to remove (case-insensitive)
   * @returns `true` if the address was found and removed, `false` otherwise
   */
  removeFromAllowlist(address: string): boolean {
    return this.allowlist.delete(address.toLowerCase());
  }

  /**
   * Check whether an address is on the blocklist.
   *
   * Performs case-insensitive lookup and honors:
   * - Chain filtering: if the entry specifies chains, the address is only
   *   considered blocklisted if the given chain matches (or entry has no chains).
   * - Expiration: if the entry has an `expiresAt` date in the past, it is
   *   skipped (not removed from storage).
   *
   * @param address - The blockchain address to check
   * @param chain - Optional chain to filter against
   * @returns `true` if the address is actively blocklisted
   */
  isBlocklisted(address: string, chain?: Chain): boolean {
    return this.isListed(this.blocklist, address, chain);
  }

  /**
   * Check whether an address is on the allowlist.
   *
   * Same matching semantics as {@link isBlocklisted}: case-insensitive,
   * chain-aware, and expiration-aware.
   *
   * @param address - The blockchain address to check
   * @param chain - Optional chain to filter against
   * @returns `true` if the address is actively allowlisted
   */
  isAllowlisted(address: string, chain?: Chain): boolean {
    return this.isListed(this.allowlist, address, chain);
  }

  /**
   * Return all blocklist entries.
   */
  getBlocklist(): ListEntry[] {
    return Array.from(this.blocklist.values());
  }

  /**
   * Return all allowlist entries.
   */
  getAllowlist(): ListEntry[] {
    return Array.from(this.allowlist.values());
  }

  // --------------------------------------------------------------------------
  // Bulk Import / Export
  // --------------------------------------------------------------------------

  /**
   * Bulk-import entries into either the blocklist or allowlist.
   *
   * @param entries - Array of list entries to import
   * @param type - Target list: `'blocklist'` or `'allowlist'`
   * @returns The number of entries that were imported
   */
  importList(entries: ListEntry[], type: 'blocklist' | 'allowlist'): number {
    const target = type === 'blocklist' ? this.blocklist : this.allowlist;
    let imported = 0;

    for (const entry of entries) {
      const key = entry.address.toLowerCase();
      target.set(key, entry);
      imported++;
    }

    return imported;
  }

  /**
   * Export all entries from either the blocklist or allowlist.
   *
   * @param type - Source list: `'blocklist'` or `'allowlist'`
   * @returns Array of all list entries (including expired ones)
   */
  exportList(type: 'blocklist' | 'allowlist'): ListEntry[] {
    const source = type === 'blocklist' ? this.blocklist : this.allowlist;
    return Array.from(source.values());
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Check whether an address is present and active in a given list map.
   * Expired entries are skipped but not removed from storage.
   */
  private isListed(
    list: Map<string, ListEntry>,
    address: string,
    chain?: Chain,
  ): boolean {
    const key = address.toLowerCase();
    const entry = list.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration — expired entries are considered inactive
    if (entry.expiresAt) {
      const expiresAt = new Date(entry.expiresAt);
      if (expiresAt.getTime() <= Date.now()) {
        return false;
      }
    }

    // Check chain filter — if the entry specifies chains, the given chain
    // must be in the list. An empty chains array means "all chains".
    if (chain && entry.chains.length > 0) {
      if (!entry.chains.includes(chain)) {
        return false;
      }
    }

    return true;
  }
}

// ============================================================================
// Severity Ordering (for comparison)
// ============================================================================

/** Ordered severity levels from lowest to highest */
const SEVERITY_ORDER: RiskSeverity[] = [
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'SEVERE',
  'BLOCKLIST',
];

/**
 * Compare two severity levels. Returns the higher of the two.
 */
function higherSeverity(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  const aIndex = SEVERITY_ORDER.indexOf(a);
  const bIndex = SEVERITY_ORDER.indexOf(b);
  return aIndex >= bIndex ? a : b;
}

// ============================================================================
// Decision Ordering (for comparison)
// ============================================================================

/** Decision priority: BLOCK > REVIEW > APPROVE */
const DECISION_ORDER: Array<'APPROVE' | 'REVIEW' | 'BLOCK'> = [
  'APPROVE',
  'REVIEW',
  'BLOCK',
];

/**
 * Return the worst (most restrictive) of two decisions.
 */
function worstDecision(
  a: 'APPROVE' | 'REVIEW' | 'BLOCK',
  b: 'APPROVE' | 'REVIEW' | 'BLOCK',
): 'APPROVE' | 'REVIEW' | 'BLOCK' {
  const aIndex = DECISION_ORDER.indexOf(a);
  const bIndex = DECISION_ORDER.indexOf(b);
  return aIndex >= bIndex ? a : b;
}

// ============================================================================
// Provider Timeout Helper
// ============================================================================

/**
 * Race a promise against a timeout. If the timeout fires first, the returned
 * promise rejects with a timeout error.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Provider "${label}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// ============================================================================
// ScreeningAggregator
// ============================================================================

/**
 * Combines results from multiple {@link ScreeningProvider} instances into a
 * unified screening decision.
 *
 * The aggregator:
 * - Checks the optional {@link BlocklistManager} first (allowlist and blocklist)
 * - Runs all providers in parallel (configurable) with per-provider timeout
 * - Computes a weighted-average aggregate risk score
 * - Determines the final decision based on configurable thresholds
 * - Enforces minimum provider success requirements
 *
 * @example
 * ```typescript
 * const aggregator = new ScreeningAggregator(
 *   [ofacProvider, chainalysisProvider, openSanctionsProvider],
 *   {
 *     blockThreshold: 80,
 *     reviewThreshold: 40,
 *     providerTimeoutMs: 5000,
 *     minProviderSuccess: 2,
 *     providerWeights: {
 *       'ofac-list': 1.0,
 *       'chainalysis-free': 0.8,
 *       'opensanctions': 0.6,
 *     },
 *   },
 *   blocklistManager,
 * );
 *
 * const result = await aggregator.screenAddress({
 *   address: '0x...',
 *   chain: 'ethereum',
 * });
 *
 * switch (result.decision) {
 *   case 'BLOCK': // Deny transaction
 *   case 'REVIEW': // Flag for manual review
 *   case 'APPROVE': // Proceed
 * }
 * ```
 */
export class ScreeningAggregator {
  private providers: ScreeningProvider[];
  private readonly config: Required<
    Pick<
      ScreeningAggregatorConfig,
      'minProviderSuccess' | 'providerTimeoutMs' | 'parallel' | 'blockThreshold' | 'reviewThreshold'
    >
  > & {
    providerWeights: Record<string, number>;
    blocklist: BlocklistConfig;
  };
  private readonly blocklist: BlocklistManager | undefined;

  /**
   * Create a new ScreeningAggregator.
   *
   * @param providers - Array of screening providers to aggregate
   * @param config - Optional aggregator configuration
   * @param blocklist - Optional blocklist manager for custom block/allow lists
   */
  constructor(
    providers: ScreeningProvider[],
    config?: ScreeningAggregatorConfig,
    blocklist?: BlocklistManager,
  ) {
    this.providers = [...providers];
    this.config = {
      minProviderSuccess: config?.minProviderSuccess ?? 1,
      providerTimeoutMs: config?.providerTimeoutMs ?? 5000,
      parallel: config?.parallel ?? true,
      blockThreshold: config?.blockThreshold ?? 80,
      reviewThreshold: config?.reviewThreshold ?? 40,
      providerWeights: config?.providerWeights ?? {},
      blocklist: config?.blocklist ?? {},
    };
    this.blocklist = blocklist;
  }

  // --------------------------------------------------------------------------
  // Address Screening
  // --------------------------------------------------------------------------

  /**
   * Screen a single address through all providers and return a unified result.
   *
   * Execution order:
   * 1. Check allowlist (if allowlisted AND `config.blocklist.allowlistPriority`, approve immediately)
   * 2. Check blocklist (if blocklisted, block immediately with CUSTOM_BLOCKLIST category)
   * 3. Run all providers (parallel or sequential) with per-provider timeout
   * 4. Aggregate results into a unified decision
   *
   * @param input - Address screening input
   * @returns Unified screening result with aggregated decision
   */
  async screenAddress(input: ScreenAddressInput): Promise<UnifiedScreeningResult> {
    const startTime = Date.now();
    const address = input.address;
    const chain = input.chain;

    // --- Step 1: Allowlist check ---
    const allowlisted = this.blocklist
      ? this.blocklist.isAllowlisted(address, chain)
      : false;

    if (allowlisted && this.config.blocklist.allowlistPriority) {
      return this.buildAllowlistedResult(input, Date.now() - startTime);
    }

    // --- Step 2: Blocklist check ---
    const blocklisted = this.blocklist
      ? this.blocklist.isBlocklisted(address, chain)
      : false;

    if (blocklisted) {
      return this.buildBlocklistedResult(input, Date.now() - startTime);
    }

    // --- Step 3: Run providers ---
    const providerResults = await this.runProviders(input);

    // --- Step 4: Aggregate results ---
    return this.aggregateResults(input, providerResults, allowlisted, blocklisted, Date.now() - startTime);
  }

  // --------------------------------------------------------------------------
  // Transaction Screening
  // --------------------------------------------------------------------------

  /**
   * Screen a transaction by screening both sender and recipient addresses.
   *
   * The combined decision is the worst (most restrictive) of the two
   * individual decisions: BLOCK > REVIEW > APPROVE.
   *
   * @param input - Transaction screening input
   * @returns Sender result, recipient result, and combined decision
   */
  async screenTransaction(input: ScreenTransactionProviderInput): Promise<{
    sender: UnifiedScreeningResult;
    recipient: UnifiedScreeningResult;
    combinedDecision: 'APPROVE' | 'REVIEW' | 'BLOCK';
  }> {
    const [sender, recipient] = await Promise.all([
      this.screenAddress({
        address: input.from,
        chain: input.chain,
        amount: input.amount,
        counterparty: input.to,
        direction: 'OUTBOUND',
      }),
      this.screenAddress({
        address: input.to,
        chain: input.chain,
        amount: input.amount,
        counterparty: input.from,
        direction: 'INBOUND',
      }),
    ]);

    const combinedDecision = worstDecision(sender.decision, recipient.decision);

    return { sender, recipient, combinedDecision };
  }

  // --------------------------------------------------------------------------
  // Provider Management
  // --------------------------------------------------------------------------

  /**
   * Add a screening provider at runtime.
   *
   * @param provider - The provider to add
   */
  addProvider(provider: ScreeningProvider): void {
    this.providers.push(provider);
  }

  /**
   * Remove a screening provider by name.
   *
   * @param name - The provider name to remove
   * @returns `true` if the provider was found and removed, `false` otherwise
   */
  removeProvider(name: string): boolean {
    const index = this.providers.findIndex((p) => p.name === name);
    if (index === -1) {
      return false;
    }
    this.providers.splice(index, 1);
    return true;
  }

  /**
   * List the names of all registered providers.
   *
   * @returns Array of provider name strings
   */
  getProviders(): string[] {
    return this.providers.map((p) => p.name);
  }

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  /**
   * Check the health of all registered providers.
   *
   * @returns A record mapping provider name to its health status
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const checks = this.providers.map(async (provider) => {
      try {
        const healthy = await withTimeout(
          provider.isHealthy(),
          this.config.providerTimeoutMs,
          provider.name,
        );
        results[provider.name] = healthy;
      } catch {
        results[provider.name] = false;
      }
    });

    await Promise.allSettled(checks);
    return results;
  }

  // --------------------------------------------------------------------------
  // Internal: Run Providers
  // --------------------------------------------------------------------------

  /**
   * Execute all providers against the given input, respecting the parallel
   * configuration and per-provider timeout.
   */
  private async runProviders(
    input: ScreenAddressInput,
  ): Promise<ProviderScreeningResult[]> {
    if (this.config.parallel) {
      return this.runProvidersParallel(input);
    }
    return this.runProvidersSequential(input);
  }

  /**
   * Run all providers in parallel using Promise.allSettled, with per-provider
   * timeout enforcement.
   */
  private async runProvidersParallel(
    input: ScreenAddressInput,
  ): Promise<ProviderScreeningResult[]> {
    const promises = this.providers.map((provider) =>
      withTimeout(
        provider.screenAddress(input),
        this.config.providerTimeoutMs,
        provider.name,
      ).catch((error: unknown): ProviderScreeningResult => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          provider: provider.name,
          matched: false,
          signals: [],
          success: false,
          error: errorMessage,
          latencyMs: 0,
          screenedAt: new Date().toISOString(),
        };
      }),
    );

    const settled = await Promise.allSettled(promises);
    const results: ProviderScreeningResult[] = [];

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i]!;
      const provider = this.providers[i]!;

      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        // This branch handles any unexpected rejection not caught above
        results.push({
          provider: provider.name,
          matched: false,
          signals: [],
          success: false,
          error: outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason),
          latencyMs: 0,
          screenedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Run all providers sequentially (one at a time), with per-provider
   * timeout enforcement.
   */
  private async runProvidersSequential(
    input: ScreenAddressInput,
  ): Promise<ProviderScreeningResult[]> {
    const results: ProviderScreeningResult[] = [];

    for (const provider of this.providers) {
      try {
        const result = await withTimeout(
          provider.screenAddress(input),
          this.config.providerTimeoutMs,
          provider.name,
        );
        results.push(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          provider: provider.name,
          matched: false,
          signals: [],
          success: false,
          error: errorMessage,
          latencyMs: 0,
          screenedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // Internal: Result Aggregation
  // --------------------------------------------------------------------------

  /**
   * Aggregate individual provider results into a unified screening result.
   */
  private aggregateResults(
    input: ScreenAddressInput,
    providerResults: ProviderScreeningResult[],
    allowlisted: boolean,
    blocklisted: boolean,
    totalLatencyMs: number,
  ): UnifiedScreeningResult {
    const succeededResults = providerResults.filter((r) => r.success);
    const allSignals: RiskSignal[] = [];

    for (const result of providerResults) {
      allSignals.push(...result.signals);
    }

    // --- Compute aggregate risk score (weighted average of successful providers) ---
    const aggregateRiskScore = this.computeWeightedRiskScore(succeededResults);

    // --- Determine highest severity across all signals ---
    let highestSeverity: RiskSeverity = 'NONE';
    for (const signal of allSignals) {
      highestSeverity = higherSeverity(highestSeverity, signal.severity);
    }

    // --- Collect unique categories ---
    const categorySet = new Set<RiskCategory>();
    for (const signal of allSignals) {
      categorySet.add(signal.category);
    }
    const categories = Array.from(categorySet);

    // --- Collect union of all actions ---
    const actionSet = new Set<ScreeningAction>();
    for (const signal of allSignals) {
      for (const action of signal.actions) {
        actionSet.add(action);
      }
    }
    const actions = Array.from(actionSet);

    // --- Determine decision based on thresholds ---
    let decision: 'APPROVE' | 'REVIEW' | 'BLOCK';
    if (aggregateRiskScore >= this.config.blockThreshold) {
      decision = 'BLOCK';
    } else if (aggregateRiskScore >= this.config.reviewThreshold) {
      decision = 'REVIEW';
    } else {
      decision = 'APPROVE';
    }

    // --- Check minimum provider success ---
    if (succeededResults.length < this.config.minProviderSuccess) {
      decision = 'REVIEW';
      // Add an error note as a signal so the caller can see why
      allSignals.push({
        provider: 'screening-aggregator',
        category: 'UNKNOWN',
        severity: 'MEDIUM',
        riskScore: 0,
        actions: ['REVIEW'],
        description: `Insufficient provider responses: ${succeededResults.length}/${this.config.minProviderSuccess} required providers succeeded`,
        direction: 'BOTH',
      });
    }

    return {
      address: input.address,
      chain: input.chain,
      decision,
      actions,
      highestSeverity,
      aggregateRiskScore,
      categories,
      providerResults,
      allSignals,
      providersConsulted: providerResults.length,
      providersSucceeded: succeededResults.length,
      totalLatencyMs,
      screenedAt: new Date().toISOString(),
      allowlisted,
      blocklisted,
    };
  }

  /**
   * Compute the weighted average risk score across successful provider results.
   *
   * Uses `config.providerWeights` when set; otherwise treats all providers
   * with equal weight. Only providers that succeeded are included in the
   * computation. If no providers succeeded, returns 0.
   */
  private computeWeightedRiskScore(
    succeededResults: ProviderScreeningResult[],
  ): number {
    if (succeededResults.length === 0) {
      return 0;
    }

    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of succeededResults) {
      const weight = this.config.providerWeights[result.provider] ?? 1;

      // Compute the maximum risk score across all signals for this provider.
      // If the provider returned no signals, its score is 0.
      let providerMaxScore = 0;
      for (const signal of result.signals) {
        if (signal.riskScore > providerMaxScore) {
          providerMaxScore = signal.riskScore;
        }
      }

      weightedSum += providerMaxScore * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return 0;
    }

    return Math.round(weightedSum / totalWeight);
  }

  // --------------------------------------------------------------------------
  // Internal: Shortcut Results
  // --------------------------------------------------------------------------

  /**
   * Build an immediate APPROVE result for an allowlisted address.
   */
  private buildAllowlistedResult(
    input: ScreenAddressInput,
    totalLatencyMs: number,
  ): UnifiedScreeningResult {
    return {
      address: input.address,
      chain: input.chain,
      decision: 'APPROVE',
      actions: ['ALLOW'],
      highestSeverity: 'NONE',
      aggregateRiskScore: 0,
      categories: [],
      providerResults: [],
      allSignals: [],
      providersConsulted: 0,
      providersSucceeded: 0,
      totalLatencyMs,
      screenedAt: new Date().toISOString(),
      allowlisted: true,
      blocklisted: false,
    };
  }

  /**
   * Build an immediate BLOCK result for a blocklisted address.
   */
  private buildBlocklistedResult(
    input: ScreenAddressInput,
    totalLatencyMs: number,
  ): UnifiedScreeningResult {
    const signal: RiskSignal = {
      provider: 'blocklist-manager',
      category: 'CUSTOM_BLOCKLIST',
      severity: 'BLOCKLIST',
      riskScore: 100,
      actions: ['DENY'],
      description: `Address ${input.address} is on the custom blocklist`,
      direction: 'BOTH',
    };

    return {
      address: input.address,
      chain: input.chain,
      decision: 'BLOCK',
      actions: ['DENY'],
      highestSeverity: 'BLOCKLIST',
      aggregateRiskScore: 100,
      categories: ['CUSTOM_BLOCKLIST'],
      providerResults: [],
      allSignals: [signal],
      providersConsulted: 0,
      providersSucceeded: 0,
      totalLatencyMs,
      screenedAt: new Date().toISOString(),
      allowlisted: false,
      blocklisted: true,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Convenience factory for creating a {@link ScreeningAggregator} with optional
 * blocklist support.
 *
 * @param providers - Array of screening providers to aggregate
 * @param config - Optional aggregator configuration
 * @param blocklist - Optional blocklist manager
 * @returns A configured ScreeningAggregator instance
 *
 * @example
 * ```typescript
 * const aggregator = createScreeningAggregator(
 *   [ofacProvider, chainalysisProvider],
 *   { blockThreshold: 75 },
 *   myBlocklistManager,
 * );
 * ```
 */
export function createScreeningAggregator(
  providers: ScreeningProvider[],
  config?: ScreeningAggregatorConfig,
  blocklist?: BlocklistManager,
): ScreeningAggregator {
  return new ScreeningAggregator(providers, config, blocklist);
}
