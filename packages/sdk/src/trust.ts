// ============================================================================
// Kontext SDK - Trust Scoring
// ============================================================================

import type {
  TrustScore,
  TrustFactor,
  TransactionEvaluation,
  RiskFactor,
  LogTransactionInput,
  KontextConfig,
  ActionLog,
  TransactionRecord,
  Task,
  AnomalyEvent,
} from './types.js';
import { KontextStore } from './store.js';
import { generateId, now, parseAmount, clamp } from './utils.js';

// ============================================================================
// Named constants — trust level thresholds
// ============================================================================

const TRUST_LEVEL_VERIFIED = 90;
const TRUST_LEVEL_HIGH = 70;
const TRUST_LEVEL_MEDIUM = 50;
const TRUST_LEVEL_LOW = 30;

// ============================================================================
// Named constants — risk thresholds
// ============================================================================

const RISK_FLAG_THRESHOLD = 60;
const RISK_BLOCK_THRESHOLD = 80;
const RISK_REVIEW_THRESHOLD = 50;

// ============================================================================
// Named constants — trust factor weights
// ============================================================================

const WEIGHT_HISTORY = 0.15;
const WEIGHT_TASK_COMPLETION = 0.25;
const WEIGHT_ANOMALY = 0.25;
const WEIGHT_TX_CONSISTENCY = 0.20;
const WEIGHT_COMPLIANCE = 0.15;

// ============================================================================
// Pre-fetched agent data interface (avoids redundant store queries)
// ============================================================================

/** Pre-fetched data for a single agent, passed to factor methods to avoid redundant store queries. */
export interface AgentData {
  actions: ActionLog[];
  transactions: TransactionRecord[];
  tasks: Task[];
  anomalies: AnomalyEvent[];
}

/**
 * TrustScorer computes trust scores for agents and risk scores for transactions.
 *
 * This MVP implementation uses rule-based scoring across multiple factors:
 * - **History depth**: More transaction history = higher trust.
 * - **Task completion rate**: Higher completion rate = higher trust.
 * - **Anomaly frequency**: Fewer anomalies = higher trust.
 * - **Transaction consistency**: Consistent patterns = higher trust.
 * - **Compliance adherence**: Following compliance rules = higher trust.
 *
 * Scores range from 0-100 with levels: untrusted, low, medium, high, verified.
 *
 * In a production system, these rules would be augmented with ML-based scoring,
 * graph analysis, and external reputation data.
 */
export class TrustScorer {
  private readonly config: KontextConfig;
  private readonly store: KontextStore;

  constructor(config: KontextConfig, store: KontextStore) {
    this.config = config;
    this.store = store;
  }

  /**
   * Compute the trust score for a given agent.
   *
   * @param agentId - The agent identifier
   * @returns TrustScore with overall score, factor breakdown, and trust level
   *
   * @example
   * ```typescript
   * const score = await scorer.getTrustScore('payment-agent-1');
   * console.log(`Trust: ${score.score}/100 (${score.level})`);
   * ```
   */
  async getTrustScore(agentId: string): Promise<TrustScore> {
    const factors = this.computeAgentFactors(agentId);

    const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
    const clampedScore = clamp(score, 0, 100);

    return {
      agentId,
      score: clampedScore,
      factors,
      computedAt: now(),
      level: this.scoreToLevel(clampedScore),
    };
  }

  /**
   * Evaluate the risk of a specific transaction.
   *
   * @param tx - Transaction input to evaluate
   * @returns TransactionEvaluation with risk score, factors, and recommendation
   *
   * @example
   * ```typescript
   * const eval = await scorer.evaluateTransaction({
   *   txHash: '0x...',
   *   chain: 'base',
   *   amount: '50000',
   *   token: 'USDC',
   *   from: '0xSender',
   *   to: '0xReceiver',
   *   agentId: 'agent-1',
   * });
   * if (eval.flagged) console.log('Transaction flagged for review');
   * ```
   */
  async evaluateTransaction(tx: LogTransactionInput): Promise<TransactionEvaluation> {
    const factors = this.computeTransactionRiskFactors(tx);

    const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
    const riskScore = clamp(Math.round(totalScore / Math.max(factors.length, 1)), 0, 100);

    const riskLevel = this.riskScoreToLevel(riskScore);
    const flagged = riskScore >= RISK_FLAG_THRESHOLD;
    const recommendation = riskScore >= RISK_BLOCK_THRESHOLD ? 'block' as const
      : riskScore >= RISK_REVIEW_THRESHOLD ? 'review' as const
      : 'approve' as const;

    return {
      txHash: tx.txHash,
      riskScore,
      riskLevel,
      factors,
      flagged,
      recommendation,
      evaluatedAt: now(),
    };
  }

  // --------------------------------------------------------------------------
  // Agent trust factor computation
  // --------------------------------------------------------------------------

  private computeAgentFactors(agentId: string): TrustFactor[] {
    // Query the store ONCE for all agent data (reduces ~8 scans to 4)
    const data: AgentData = {
      actions: this.store.getActionsByAgent(agentId),
      transactions: this.store.getTransactionsByAgent(agentId),
      tasks: this.store.queryTasks((t) => t.agentId === agentId),
      anomalies: this.store.queryAnomalies((a) => a.agentId === agentId),
    };

    return [
      this.computeHistoryDepthFactor(data),
      this.computeTaskCompletionFactor(data),
      this.computeAnomalyFrequencyFactor(data),
      this.computeTransactionConsistencyFactor(data),
      this.computeComplianceAdherenceFactor(data),
    ];
  }

  private computeHistoryDepthFactor(data: AgentData): TrustFactor {
    const count = data.actions.length;

    // More history = more trust. Max score at 100+ actions.
    let score: number;
    if (count === 0) score = 10;
    else if (count < 5) score = 30;
    else if (count < 20) score = 50;
    else if (count < 50) score = 70;
    else if (count < 100) score = 85;
    else score = 95;

    return {
      name: 'history_depth',
      score,
      weight: WEIGHT_HISTORY,
      description: `Agent has ${count} recorded actions`,
    };
  }

  private computeTaskCompletionFactor(data: AgentData): TrustFactor {
    const totalTasks = data.tasks.length;

    if (totalTasks === 0) {
      return {
        name: 'task_completion',
        score: 50, // Neutral if no tasks
        weight: WEIGHT_TASK_COMPLETION,
        description: 'No tasks recorded yet',
      };
    }

    const confirmed = data.tasks.filter((t) => t.status === 'confirmed').length;
    const failed = data.tasks.filter((t) => t.status === 'failed').length;
    const completionRate = confirmed / totalTasks;
    const failureRate = failed / totalTasks;

    // High completion and low failure = high trust
    const score = Math.round(completionRate * 100 - failureRate * 30);

    return {
      name: 'task_completion',
      score: clamp(score, 0, 100),
      weight: WEIGHT_TASK_COMPLETION,
      description: `${confirmed}/${totalTasks} tasks confirmed (${Math.round(completionRate * 100)}% rate)`,
    };
  }

  private computeAnomalyFrequencyFactor(data: AgentData): TrustFactor {
    const anomalyCount = data.anomalies.length;
    const actionCount = data.actions.length;

    if (actionCount === 0) {
      return {
        name: 'anomaly_frequency',
        score: 50,
        weight: WEIGHT_ANOMALY,
        description: 'No actions recorded yet',
      };
    }

    const anomalyRate = anomalyCount / actionCount;

    // Fewer anomalies = higher score
    let score: number;
    if (anomalyRate === 0) score = 100;
    else if (anomalyRate < 0.01) score = 90;
    else if (anomalyRate < 0.05) score = 70;
    else if (anomalyRate < 0.1) score = 50;
    else if (anomalyRate < 0.25) score = 30;
    else score = 10;

    // Weight critical anomalies more heavily
    const criticalCount = data.anomalies.filter((a) => a.severity === 'critical').length;
    const highCount = data.anomalies.filter((a) => a.severity === 'high').length;
    const penaltyFromSeverity = criticalCount * 15 + highCount * 8;

    return {
      name: 'anomaly_frequency',
      score: clamp(score - penaltyFromSeverity, 0, 100),
      weight: WEIGHT_ANOMALY,
      description: `${anomalyCount} anomalies across ${actionCount} actions (${Math.round(anomalyRate * 100)}% rate)`,
    };
  }

  private computeTransactionConsistencyFactor(data: AgentData): TrustFactor {
    const transactions = data.transactions;

    if (transactions.length < 2) {
      return {
        name: 'transaction_consistency',
        score: 50,
        weight: WEIGHT_TX_CONSISTENCY,
        description: 'Insufficient transaction history for consistency analysis',
      };
    }

    // Analyze amount consistency (standard deviation relative to mean)
    const amounts = transactions.map((t) => parseAmount(t.amount)).filter((a) => !isNaN(a));

    if (amounts.length < 2) {
      return {
        name: 'transaction_consistency',
        score: 50,
        weight: WEIGHT_TX_CONSISTENCY,
        description: 'Insufficient valid amounts for consistency analysis',
      };
    }

    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of variation

    // Lower CV = more consistent = higher score
    let score: number;
    if (cv < 0.1) score = 95;
    else if (cv < 0.3) score = 80;
    else if (cv < 0.5) score = 65;
    else if (cv < 1.0) score = 45;
    else if (cv < 2.0) score = 30;
    else score = 15;

    // Check for unique destination consistency
    const destinations = new Set(transactions.map((t) => t.to));
    const destRatio = destinations.size / transactions.length;
    // Many unique destinations with few transactions = less consistent
    if (destRatio > 0.8 && transactions.length > 5) {
      score = Math.max(score - 15, 0);
    }

    return {
      name: 'transaction_consistency',
      score: clamp(score, 0, 100),
      weight: WEIGHT_TX_CONSISTENCY,
      description: `CV=${cv.toFixed(2)}, ${destinations.size} unique destinations across ${transactions.length} transactions`,
    };
  }

  private computeComplianceAdherenceFactor(data: AgentData): TrustFactor {
    const { tasks, transactions } = data;

    // Check how many transactions have corresponding confirmed tasks
    const confirmedTasks = tasks.filter((t) => t.status === 'confirmed');
    const tasksWithEvidence = confirmedTasks.filter(
      (t) => t.providedEvidence !== null && Object.keys(t.providedEvidence).length > 0,
    );

    let score = 50; // Base score

    // Bonus for having tasks with evidence
    if (confirmedTasks.length > 0) {
      const evidenceRate = tasksWithEvidence.length / confirmedTasks.length;
      score += Math.round(evidenceRate * 30);
    }

    // Bonus for transaction volume with tasks
    if (transactions.length > 0 && tasks.length > 0) {
      const coverageRate = Math.min(tasks.length / transactions.length, 1);
      score += Math.round(coverageRate * 20);
    }

    return {
      name: 'compliance_adherence',
      score: clamp(score, 0, 100),
      weight: WEIGHT_COMPLIANCE,
      description: `${tasksWithEvidence.length} tasks with evidence, ${transactions.length} total transactions`,
    };
  }

  // --------------------------------------------------------------------------
  // Transaction risk factor computation
  // --------------------------------------------------------------------------

  private computeTransactionRiskFactors(tx: LogTransactionInput): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Factor 1: Amount risk
    factors.push(this.computeAmountRisk(tx));

    // Factor 2: New destination risk
    factors.push(this.computeNewDestinationRisk(tx));

    // Factor 3: Frequency risk
    factors.push(this.computeFrequencyRisk(tx));

    // Factor 4: Agent trust inverse
    factors.push(this.computeAgentRisk(tx.agentId));

    // Factor 5: Round amount risk
    factors.push(this.computeRoundAmountRisk(tx));

    return factors;
  }

  private computeAmountRisk(tx: LogTransactionInput): RiskFactor {
    const amount = parseAmount(tx.amount);

    if (isNaN(amount)) {
      return { name: 'amount_risk', score: 50, description: 'Unable to parse transaction amount' };
    }

    // Higher amounts = higher risk
    let score: number;
    if (amount < 100) score = 5;
    else if (amount < 1000) score = 15;
    else if (amount < 10000) score = 30;
    else if (amount < 50000) score = 55;
    else if (amount < 100000) score = 75;
    else score = 95;

    // Compare to agent's historical average
    const history = this.store.getTransactionsByAgent(tx.agentId);
    if (history.length > 0) {
      const avgAmount =
        history.reduce((sum, t) => sum + parseAmount(t.amount), 0) / history.length;
      if (avgAmount > 0 && amount > avgAmount * 5) {
        score = Math.min(score + 20, 100);
      }
    }

    return {
      name: 'amount_risk',
      score,
      description: `Transaction amount ${tx.amount} ${tx.token}`,
    };
  }

  private computeNewDestinationRisk(tx: LogTransactionInput): RiskFactor {
    const history = this.store.getTransactionsByAgent(tx.agentId);
    const knownDestinations = new Set(history.map((t) => t.to.toLowerCase()));

    const isNew = !knownDestinations.has(tx.to.toLowerCase());

    if (history.length === 0) {
      return {
        name: 'new_destination',
        score: 30,
        description: 'First transaction for this agent -- no destination history',
      };
    }

    return {
      name: 'new_destination',
      score: isNew ? 45 : 5,
      description: isNew
        ? `New destination address: ${tx.to}`
        : `Known destination address: ${tx.to}`,
    };
  }

  private computeFrequencyRisk(tx: LogTransactionInput): RiskFactor {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentTxs = this.store.queryTransactions(
      (t) =>
        t.agentId === tx.agentId && new Date(t.timestamp) >= oneHourAgo,
    );

    const count = recentTxs.length;

    let score: number;
    if (count < 5) score = 5;
    else if (count < 10) score = 20;
    else if (count < 25) score = 45;
    else if (count < 50) score = 70;
    else score = 90;

    return {
      name: 'frequency_risk',
      score,
      description: `${count} transactions in the last hour`,
    };
  }

  private computeAgentRisk(agentId: string): RiskFactor {
    const actions = this.store.getActionsByAgent(agentId);
    const anomalies = this.store.queryAnomalies((a) => a.agentId === agentId);

    if (actions.length === 0) {
      return {
        name: 'agent_reputation',
        score: 40,
        description: 'New agent with no history',
      };
    }

    const anomalyRate = anomalies.length / actions.length;
    const score = Math.round(anomalyRate * 100);

    return {
      name: 'agent_reputation',
      score: clamp(score, 0, 100),
      description: `Agent anomaly rate: ${Math.round(anomalyRate * 100)}%`,
    };
  }

  private computeRoundAmountRisk(tx: LogTransactionInput): RiskFactor {
    const amount = parseAmount(tx.amount);

    if (isNaN(amount)) {
      return { name: 'round_amount', score: 10, description: 'Unable to parse amount' };
    }

    // Round amounts (multiples of 1000, 5000, 10000) are slightly more suspicious
    // in anti-money-laundering heuristics (structuring detection)
    const isRound1000 = amount >= 1000 && amount % 1000 === 0;
    const isRound10000 = amount >= 10000 && amount % 10000 === 0;
    const isJustUnderThreshold = amount >= 9000 && amount <= 10000;

    let score = 5;
    if (isRound10000) score = 25;
    else if (isRound1000) score = 15;
    if (isJustUnderThreshold) score += 20; // Structuring indicator

    return {
      name: 'round_amount',
      score,
      description: `Amount ${tx.amount} -- ${isRound1000 ? 'round amount' : 'non-round amount'}`,
    };
  }

  // --------------------------------------------------------------------------
  // Scoring helpers
  // --------------------------------------------------------------------------

  private scoreToLevel(score: number): TrustScore['level'] {
    if (score >= TRUST_LEVEL_VERIFIED) return 'verified';
    if (score >= TRUST_LEVEL_HIGH) return 'high';
    if (score >= TRUST_LEVEL_MEDIUM) return 'medium';
    if (score >= TRUST_LEVEL_LOW) return 'low';
    return 'untrusted';
  }

  private riskScoreToLevel(score: number): TransactionEvaluation['riskLevel'] {
    if (score >= RISK_BLOCK_THRESHOLD) return 'critical';
    if (score >= RISK_FLAG_THRESHOLD) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }
}
