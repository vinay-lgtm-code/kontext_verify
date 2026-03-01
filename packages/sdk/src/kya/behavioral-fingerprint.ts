// ============================================================================
// Kontext SDK - KYA Behavioral Fingerprinting
// ============================================================================

import type {
  BehavioralEmbedding,
  TemporalFeatures,
  FinancialFeatures,
  NetworkFeatures,
  OperationalFeatures,
} from './types.js';
import type { KontextStore } from '../store.js';
import type { TransactionRecord } from '../types.js';
import { now } from '../utils.js';

/** Minimum number of transactions required to compute an embedding */
const MIN_SAMPLE_SIZE = 5;

/**
 * Computes behavioral fingerprints (embeddings) from agent transaction patterns.
 * Used for cross-session linking and behavioral consistency scoring.
 */
export class BehavioralFingerprinter {
  /**
   * Compute a behavioral embedding for an agent from their transaction history.
   * Returns null if the agent has fewer than MIN_SAMPLE_SIZE transactions.
   */
  computeEmbedding(agentId: string, store: KontextStore): BehavioralEmbedding | null {
    const transactions = store.getTransactionsByAgent(agentId);
    if (transactions.length < MIN_SAMPLE_SIZE) return null;

    return {
      agentId,
      temporal: this.extractTemporalFeatures(transactions),
      financial: this.extractFinancialFeatures(transactions),
      network: this.extractNetworkFeatures(transactions),
      operational: this.extractOperationalFeatures(transactions),
      sampleSize: transactions.length,
      computedAt: now(),
    };
  }

  /**
   * Compute cosine similarity between two behavioral embeddings.
   * Returns a value in [0, 1] where 1 means identical and 0 means orthogonal.
   */
  cosineSimilarity(a: BehavioralEmbedding, b: BehavioralEmbedding): number {
    const vecA = this.flattenEmbedding(a);
    const vecB = this.flattenEmbedding(b);

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i]! * vecB[i]!;
      magA += vecA[i]! * vecA[i]!;
      magB += vecB[i]! * vecB[i]!;
    }

    const denominator = Math.sqrt(magA) * Math.sqrt(magB);
    if (denominator === 0) return 0;

    return dot / denominator;
  }

  // --------------------------------------------------------------------------
  // Feature Extraction
  // --------------------------------------------------------------------------

  private extractTemporalFeatures(txs: TransactionRecord[]): TemporalFeatures {
    // Sort by timestamp
    const sorted = [...txs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // Inter-transaction intervals
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff =
        (new Date(sorted[i]!.timestamp).getTime() -
          new Date(sorted[i - 1]!.timestamp).getTime()) /
        1000;
      intervals.push(diff);
    }

    const meanInterval = intervals.length > 0
      ? intervals.reduce((s, v) => s + v, 0) / intervals.length
      : 0;
    const stddevInterval = intervals.length > 1
      ? Math.sqrt(
          intervals.reduce((s, v) => s + (v - meanInterval) ** 2, 0) /
            (intervals.length - 1),
        )
      : 0;

    // Hour-of-day histogram (24 bins)
    const hourCounts = new Array<number>(24).fill(0);
    for (const tx of txs) {
      const hour = new Date(tx.timestamp).getUTCHours();
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    }
    const hourTotal = hourCounts.reduce((s, v) => s + v, 0);
    const hourHistogram = hourTotal > 0
      ? hourCounts.map((c) => c / hourTotal)
      : hourCounts;

    // Day-of-week histogram (7 bins)
    const dayCounts = new Array<number>(7).fill(0);
    for (const tx of txs) {
      const day = new Date(tx.timestamp).getUTCDay();
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    }
    const dayTotal = dayCounts.reduce((s, v) => s + v, 0);
    const dayHistogram = dayTotal > 0
      ? dayCounts.map((c) => c / dayTotal)
      : dayCounts;

    return {
      meanIntervalSeconds: meanInterval,
      stddevIntervalSeconds: stddevInterval,
      hourHistogram,
      dayHistogram,
    };
  }

  private extractFinancialFeatures(txs: TransactionRecord[]): FinancialFeatures {
    const amounts = txs
      .map((tx) => parseFloat(tx.amount))
      .filter((a) => !isNaN(a));

    if (amounts.length === 0) {
      return {
        meanAmount: 0,
        stddevAmount: 0,
        medianAmount: 0,
        roundAmountRatio: 0,
        percentiles: [0, 0, 0, 0, 0],
      };
    }

    const sorted = [...amounts].sort((a, b) => a - b);
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const stddev = amounts.length > 1
      ? Math.sqrt(
          amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / (amounts.length - 1),
        )
      : 0;
    const median = this.percentile(sorted, 50);
    const roundCount = amounts.filter((a) => a % 100 === 0).length;

    return {
      meanAmount: mean,
      stddevAmount: stddev,
      medianAmount: median,
      roundAmountRatio: amounts.length > 0 ? roundCount / amounts.length : 0,
      percentiles: [
        this.percentile(sorted, 10),
        this.percentile(sorted, 25),
        this.percentile(sorted, 50),
        this.percentile(sorted, 75),
        this.percentile(sorted, 90),
      ],
    };
  }

  private extractNetworkFeatures(txs: TransactionRecord[]): NetworkFeatures {
    const destinations = txs.map((tx) => tx.to.toLowerCase());
    const sources = txs.map((tx) => tx.from.toLowerCase());
    const uniqueDests = new Set(destinations);
    const uniqueSrcs = new Set(sources);

    // Address reuse ratio
    const reuseRatio = destinations.length > 0
      ? 1 - uniqueDests.size / destinations.length
      : 0;

    // HHI concentration index
    const destCounts = new Map<string, number>();
    for (const d of destinations) {
      destCounts.set(d, (destCounts.get(d) ?? 0) + 1);
    }
    let hhi = 0;
    for (const count of destCounts.values()) {
      const share = count / destinations.length;
      hhi += share * share;
    }

    return {
      uniqueDestinations: uniqueDests.size,
      reuseRatio,
      concentrationIndex: hhi,
      uniqueSources: uniqueSrcs.size,
    };
  }

  private extractOperationalFeatures(txs: TransactionRecord[]): OperationalFeatures {
    const chainCounts = new Map<string, number>();
    const tokenCounts = new Map<string, number>();

    for (const tx of txs) {
      const chain = tx.chain ?? 'unknown';
      const token = tx.token ?? 'unknown';
      chainCounts.set(chain, (chainCounts.get(chain) ?? 0) + 1);
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }

    const total = txs.length;

    const chainDistribution: Record<string, number> = {};
    for (const [chain, count] of chainCounts) {
      chainDistribution[chain] = total > 0 ? count / total : 0;
    }

    const tokenDistribution: Record<string, number> = {};
    for (const [token, count] of tokenCounts) {
      tokenDistribution[token] = total > 0 ? count / total : 0;
    }

    const primaryChain = chainCounts.size > 0
      ? Array.from(chainCounts.entries()).sort((a, b) => b[1] - a[1])[0]![0]
      : '';
    const primaryToken = tokenCounts.size > 0
      ? Array.from(tokenCounts.entries()).sort((a, b) => b[1] - a[1])[0]![0]
      : '';

    return {
      chainDistribution,
      tokenDistribution,
      primaryChain,
      primaryToken,
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower]!;
    return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (idx - lower);
  }

  /**
   * Flatten an embedding into a numeric vector for cosine similarity.
   * Log-scales magnitude values with log(1+x).
   */
  private flattenEmbedding(e: BehavioralEmbedding): number[] {
    const vec: number[] = [];

    // Temporal: 2 magnitude + 24 hour histogram + 7 day histogram = 33
    vec.push(Math.log(1 + e.temporal.meanIntervalSeconds));
    vec.push(Math.log(1 + e.temporal.stddevIntervalSeconds));
    vec.push(...e.temporal.hourHistogram);
    vec.push(...e.temporal.dayHistogram);

    // Financial: 3 magnitude + 1 ratio + 5 percentiles = 9
    vec.push(Math.log(1 + e.financial.meanAmount));
    vec.push(Math.log(1 + e.financial.stddevAmount));
    vec.push(Math.log(1 + e.financial.medianAmount));
    vec.push(e.financial.roundAmountRatio);
    vec.push(...e.financial.percentiles.map((p) => Math.log(1 + p)));

    // Network: 2 magnitude + 1 ratio + 1 index = 4
    vec.push(Math.log(1 + e.network.uniqueDestinations));
    vec.push(e.network.reuseRatio);
    vec.push(e.network.concentrationIndex);
    vec.push(Math.log(1 + e.network.uniqueSources));

    // Operational: chain/token distributions as sorted value arrays (up to ~10)
    // Normalize to fixed-length by using sorted values
    const chainValues = Object.values(e.operational.chainDistribution).sort(
      (a, b) => b - a,
    );
    const tokenValues = Object.values(e.operational.tokenDistribution).sort(
      (a, b) => b - a,
    );

    // Pad/truncate to 5 values each
    for (let i = 0; i < 5; i++) {
      vec.push(chainValues[i] ?? 0);
    }
    for (let i = 0; i < 5; i++) {
      vec.push(tokenValues[i] ?? 0);
    }

    return vec;
  }
}
