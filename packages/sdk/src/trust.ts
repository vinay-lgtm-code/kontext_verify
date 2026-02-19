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
//
// Trust levels map numeric scores to human-readable labels. The thresholds
// are calibrated so that:
// - "verified" (90+) requires sustained clean history across all factors
// - "high" (70+) is achievable with good task completion and low anomalies
// - "medium" (50+) is the default/neutral zone for new agents with some history
// - "low" (30+) indicates concerning anomaly rates or poor task completion
// - "untrusted" (<30) signals repeated failures or high-severity anomalies
// ============================================================================

const TRUST_LEVEL_VERIFIED = 90;
const TRUST_LEVEL_HIGH = 70;
const TRUST_LEVEL_MEDIUM = 50;
const TRUST_LEVEL_LOW = 30;

// ============================================================================
// Named constants — risk thresholds
//
// Transaction risk thresholds determine automated actions:
// - FLAG (60+): Transaction is marked for human review in the audit trail
// - BLOCK (80+): Transaction should be rejected or held pending manual approval
// - REVIEW (50+): Transaction is flagged as "review" but not blocked
//
// These align with common fintech risk tiers where 60+ is "medium-high"
// risk and 80+ is "high" risk. The gap between REVIEW (50) and FLAG (60)
// allows a soft warning zone before hard flagging.
// ============================================================================

const RISK_FLAG_THRESHOLD = 60;
const RISK_BLOCK_THRESHOLD = 80;
const RISK_REVIEW_THRESHOLD = 50;

// ============================================================================
// Named constants — trust factor weights
//
// Factor weights reflect the relative importance of each trust signal:
// - TASK_COMPLETION (0.25) and ANOMALY (0.25) are weighted highest because
//   they are the strongest behavioral indicators of agent reliability
// - TX_CONSISTENCY (0.20) captures spending pattern regularity, which is
//   a key anti-money-laundering signal
// - HISTORY (0.15) and COMPLIANCE (0.15) provide baseline context but are
//   less discriminating on their own — a long history doesn't guarantee
//   trustworthiness, and compliance is partially captured by other factors
//
// Weights sum to 1.0. The weighted average is normalized by total weight
// so adding/removing factors doesn't skew scores.
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

  /**
   * History depth factor: more recorded actions = more data to assess trust.
   *
   * Scoring curve (step function, not linear) prevents gaming by spamming
   * low-value actions — crossing each tier requires meaningfully more history:
   * - 0 actions → 10 (minimal trust, new agent)
   * - 1-4 → 30 (some activity but too little to draw conclusions)
   * - 5-19 → 50 (neutral, moderate activity)
   * - 20-49 → 70 (established agent with reasonable track record)
   * - 50-99 → 85 (well-established agent)
   * - 100+ → 95 (capped below 100 because history alone doesn't guarantee trust)
   */
  private computeHistoryDepthFactor(data: AgentData): TrustFactor {
    const count = data.actions.length;

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

  /**
   * Task completion factor: agents that confirm tasks build trust, failures erode it.
   *
   * Formula: score = (completionRate * 100) - (failureRate * 30)
   * - The 30x failure penalty means each failure costs 3x more than a confirmation gains.
   *   This asymmetry reflects real-world trust: it takes many good actions to build trust
   *   but only a few failures to lose it.
   * - Returns 50 (neutral) when no tasks exist, avoiding penalizing new agents.
   */
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

  /**
   * Anomaly frequency factor: fewer anomalies relative to total actions = higher trust.
   *
   * Uses anomaly rate (anomalies / actions) with step-function scoring:
   * - 0% → 100 (clean record)
   * - <1% → 90 (near-perfect, occasional false positive acceptable)
   * - <5% → 70 (some noise but generally clean)
   * - <10% → 50 (neutral, warrants monitoring)
   * - <25% → 30 (concerning pattern)
   * - 25%+ → 10 (severe anomaly rate)
   *
   * Critical anomalies incur a -15 point penalty each, high anomalies -8 each.
   * This severity weighting ensures a single critical anomaly (e.g., sanctions hit)
   * has outsized impact compared to multiple low-severity anomalies.
   */
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

  /**
   * Transaction consistency factor: stable spending patterns indicate legitimate usage.
   *
   * Uses the coefficient of variation (CV = stdDev / mean) to measure amount regularity:
   * - CV < 0.1 → 95 (extremely consistent, e.g., recurring payroll)
   * - CV < 0.3 → 80 (fairly consistent with some variance)
   * - CV < 0.5 → 65 (moderate variance, common for operational spending)
   * - CV < 1.0 → 45 (high variance, warrants attention)
   * - CV < 2.0 → 30 (very erratic, potential structuring)
   * - CV 2.0+ → 15 (extreme variance, strong structuring indicator)
   *
   * Also penalizes -15 points when >80% of destinations are unique with >5 txs,
   * which is a common money-laundering pattern (spray-and-pray distribution).
   */
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

  /**
   * Compliance adherence factor: agents that follow the task-confirm-evidence workflow
   * demonstrate higher operational integrity.
   *
   * Scoring:
   * - Base score: 50 (neutral)
   * - +30 max for evidence rate (confirmedTasksWithEvidence / confirmedTasks)
   * - +20 max for coverage rate (tasks / transactions, capped at 1.0)
   *
   * The rationale: tasks with evidence prove the agent completed auditable work.
   * Coverage rate measures what fraction of financial activity has corresponding
   * task tracking — higher coverage means better compliance discipline.
   */
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

  /**
   * Amount risk: higher transaction amounts carry inherently higher risk.
   *
   * Tiers are aligned with common fintech thresholds:
   * - <$100: near-zero risk (5), micro-transactions
   * - <$1K: low risk (15), typical consumer spending
   * - <$10K: moderate (30), approaches CTR reporting thresholds
   * - <$50K: elevated (55), large business transactions
   * - <$100K: high (75), requires enhanced due diligence
   * - $100K+: very high (95), institutional-scale transfers
   *
   * Additional +20 penalty when amount exceeds 5x the agent's historical average,
   * detecting sudden spending spikes that could indicate account compromise.
   */
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

  /**
   * Round amount risk: round numbers are a structuring indicator in AML heuristics.
   *
   * Money launderers often transact in round amounts (e.g., $10,000 exactly) or
   * just under regulatory thresholds (e.g., $9,500 to avoid $10K CTR filing).
   *
   * Scoring:
   * - Non-round amounts: 5 (baseline, most legitimate transactions)
   * - Multiples of $1,000: 15 (mildly suspicious)
   * - Multiples of $10,000: 25 (more suspicious)
   * - Amounts $9,000-$10,000: +20 penalty (classic structuring band)
   *
   * This factor alone rarely triggers flagging — it contributes to the composite
   * risk score alongside amount, frequency, and destination analysis.
   */
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
