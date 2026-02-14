// ============================================================================
// Kontext SDK - Screening Aggregator
// ============================================================================
//
// Combines results from multiple ScreeningProvider instances into a unified
// screening decision using weighted scoring, configurable thresholds, and
// parallel provider execution.
//
// Custom blocklist/allowlist (BlocklistManager) is available on Pro and
// Enterprise plans. See https://getkontext.com/pricing for details.
//
// Usage:
//   const aggregator = new ScreeningAggregator(
//     [new OFACListProvider(), new ChainalysisFreeAPIProvider({ apiKey: '...' })],
//     { blockThreshold: 80, reviewThreshold: 40 },
//   );
//
//   const result = await aggregator.screenAddress({
//     address: '0x...',
//     chain: 'ethereum',
//   });
//   if (result.decision === 'BLOCK') { /* deny transaction */ }
// ============================================================================

import type {
  ScreeningProvider,
  ScreenAddressInput,
  ScreenTransactionProviderInput,
  ProviderScreeningResult,
  RiskSignal,
  RiskSeverity,
  RiskCategory,
  ScreeningAction,
  UnifiedScreeningResult,
  ScreeningAggregatorConfig,
} from './screening-provider.js';

import type { ScreeningNotificationManager } from './screening-notification.js';
import type { TransactionContext } from './screening-notification.js';

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
 * - Runs all providers in parallel (configurable) with per-provider timeout
 * - Computes a weighted-average aggregate risk score
 * - Determines the final decision based on configurable thresholds
 * - Enforces minimum provider success requirements
 *
 * Custom blocklist/allowlist support is available on Pro and Enterprise plans.
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
  };

  /** Optional notification manager for REVIEW/BLOCK decision alerts */
  private notificationManager: ScreeningNotificationManager | null = null;

  /**
   * Create a new ScreeningAggregator.
   *
   * @param providers - Array of screening providers to aggregate
   * @param config - Optional aggregator configuration
   */
  constructor(
    providers: ScreeningProvider[],
    config?: ScreeningAggregatorConfig,
  ) {
    this.providers = [...providers];
    this.config = {
      minProviderSuccess: config?.minProviderSuccess ?? 1,
      providerTimeoutMs: config?.providerTimeoutMs ?? 5000,
      parallel: config?.parallel ?? true,
      blockThreshold: config?.blockThreshold ?? 80,
      reviewThreshold: config?.reviewThreshold ?? 40,
      providerWeights: config?.providerWeights ?? {},
    };
  }

  // --------------------------------------------------------------------------
  // Address Screening
  // --------------------------------------------------------------------------

  /**
   * Set an optional notification manager to receive alerts on REVIEW/BLOCK
   * decisions. When set, the aggregator will fire notifications after
   * computing the unified result.
   *
   * @param manager - The notification manager instance, or null to disable
   */
  setNotificationManager(manager: ScreeningNotificationManager | null): void {
    this.notificationManager = manager;
  }

  /**
   * Screen a single address through all providers and return a unified result.
   *
   * Execution order:
   * 1. Run all providers (parallel or sequential) with per-provider timeout
   * 2. Aggregate results into a unified decision
   * 3. If notification manager is configured and decision is REVIEW/BLOCK,
   *    fire a notification (non-blocking)
   *
   * @param input - Address screening input
   * @param transactionContext - Optional transaction context for notifications
   * @returns Unified screening result with aggregated decision
   */
  async screenAddress(
    input: ScreenAddressInput,
    transactionContext?: TransactionContext,
  ): Promise<UnifiedScreeningResult> {
    const startTime = Date.now();

    // --- Run providers ---
    const providerResults = await this.runProviders(input);

    // --- Aggregate results ---
    const result = this.aggregateResults(input, providerResults, Date.now() - startTime);

    // --- Fire notification if configured and decision warrants it ---
    if (this.notificationManager && this.notificationManager.shouldNotify(result)) {
      void this.notificationManager.notifyReviewRequired(result, transactionContext);
    }

    return result;
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
      allowlisted: false,
      blocklisted: false,
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
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Convenience factory for creating a {@link ScreeningAggregator}.
 *
 * @param providers - Array of screening providers to aggregate
 * @param config - Optional aggregator configuration
 * @returns A configured ScreeningAggregator instance
 *
 * @example
 * ```typescript
 * const aggregator = createScreeningAggregator(
 *   [ofacProvider, chainalysisProvider],
 *   { blockThreshold: 75 },
 * );
 * ```
 */
export function createScreeningAggregator(
  providers: ScreeningProvider[],
  config?: ScreeningAggregatorConfig,
): ScreeningAggregator {
  return new ScreeningAggregator(providers, config);
}
