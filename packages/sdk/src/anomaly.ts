// ============================================================================
// Kontext SDK - Anomaly Detection
// ============================================================================

import type {
  AnomalyDetectionConfig,
  AnomalyThresholds,
  AnomalyEvent,
  AnomalyCallback,
  AnomalyRuleType,
  AnomalySeverity,
  TransactionRecord,
  ActionLog,
  KontextConfig,
} from './types.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { generateId, now, parseAmount, getCurrentHourUtc } from './utils.js';

/** Default anomaly detection thresholds */
const DEFAULT_THRESHOLDS: Required<AnomalyThresholds> = {
  maxAmount: '10000',
  maxFrequency: 30,
  offHours: [22, 23, 0, 1, 2, 3, 4, 5],
  minIntervalSeconds: 10,
};

/**
 * AnomalyDetector monitors agent actions and transactions for suspicious patterns.
 *
 * Supported detection rules:
 * - **unusualAmount**: Flags transactions above a configured threshold or
 *   significantly above the agent's historical average.
 * - **frequencySpike**: Flags when an agent's transaction rate exceeds
 *   the configured maximum per hour.
 * - **newDestination**: Flags transactions to previously unseen addresses.
 * - **offHoursActivity**: Flags activity during configured off-hours (UTC).
 * - **rapidSuccession**: Flags transactions that occur within a very short
 *   time interval of each other.
 * - **roundAmount**: Flags round-number amounts that may indicate structuring.
 *
 * Severity levels: low, medium, high, critical.
 */
export class AnomalyDetector {
  private readonly config: KontextConfig;
  private readonly store: KontextStore;
  private detectionConfig: AnomalyDetectionConfig | null = null;
  private thresholds: Required<AnomalyThresholds> = { ...DEFAULT_THRESHOLDS };
  private callbacks: AnomalyCallback[] = [];
  private enabled = false;

  constructor(config: KontextConfig, store: KontextStore) {
    this.config = config;
    this.store = store;
  }

  /**
   * Enable anomaly detection with the specified configuration.
   *
   * @param detectionConfig - Rules and thresholds for detection
   *
   * @example
   * ```typescript
   * detector.enableAnomalyDetection({
   *   rules: ['unusualAmount', 'frequencySpike', 'newDestination'],
   *   thresholds: { maxAmount: '10000', maxFrequency: 50 },
   * });
   * ```
   */
  enableAnomalyDetection(detectionConfig: AnomalyDetectionConfig): void {
    if (!detectionConfig.rules || detectionConfig.rules.length === 0) {
      throw new KontextError(
        KontextErrorCode.ANOMALY_CONFIG_ERROR,
        'At least one detection rule must be specified',
      );
    }

    this.detectionConfig = detectionConfig;
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...detectionConfig.thresholds,
    };
    this.enabled = true;

    if (this.config.debug) {
      console.debug(
        `[Kontext] Anomaly detection enabled with rules: ${detectionConfig.rules.join(', ')}`,
      );
    }
  }

  /**
   * Disable anomaly detection.
   */
  disableAnomalyDetection(): void {
    this.enabled = false;
    this.detectionConfig = null;

    if (this.config.debug) {
      console.debug('[Kontext] Anomaly detection disabled');
    }
  }

  /**
   * Register a callback for anomaly events.
   *
   * @param callback - Function to call when an anomaly is detected
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = detector.onAnomaly((anomaly) => {
   *   console.log(`Anomaly: ${anomaly.type} [${anomaly.severity}]`);
   * });
   * // Later: unsub();
   * ```
   */
  onAnomaly(callback: AnomalyCallback): () => void {
    this.callbacks.push(callback);

    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Evaluate a transaction against all enabled detection rules.
   * Called automatically when transactions are logged (via the client).
   *
   * @param tx - The transaction record to evaluate
   * @returns Array of detected anomalies (empty if none)
   */
  evaluateTransaction(tx: TransactionRecord): AnomalyEvent[] {
    if (!this.enabled || !this.detectionConfig) return [];

    const anomalies: AnomalyEvent[] = [];

    for (const rule of this.detectionConfig.rules) {
      const anomaly = this.runRule(rule, tx);
      if (anomaly) {
        anomalies.push(anomaly);
        this.store.addAnomaly(anomaly);
        this.notifyCallbacks(anomaly);
      }
    }

    return anomalies;
  }

  /**
   * Evaluate a generic action against all enabled detection rules.
   *
   * @param action - The action log to evaluate
   * @returns Array of detected anomalies (empty if none)
   */
  evaluateAction(action: ActionLog): AnomalyEvent[] {
    if (!this.enabled || !this.detectionConfig) return [];

    const anomalies: AnomalyEvent[] = [];

    // Only offHoursActivity and frequencySpike apply to generic actions
    const applicableRules: AnomalyRuleType[] = ['offHoursActivity', 'frequencySpike'];

    for (const rule of this.detectionConfig.rules) {
      if (!applicableRules.includes(rule)) continue;

      const anomaly = this.runActionRule(rule, action);
      if (anomaly) {
        anomalies.push(anomaly);
        this.store.addAnomaly(anomaly);
        this.notifyCallbacks(anomaly);
      }
    }

    return anomalies;
  }

  /**
   * Check whether anomaly detection is currently enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the current detection configuration.
   */
  getConfig(): AnomalyDetectionConfig | null {
    return this.detectionConfig;
  }

  // --------------------------------------------------------------------------
  // Rule execution
  // --------------------------------------------------------------------------

  private runRule(rule: AnomalyRuleType, tx: TransactionRecord): AnomalyEvent | null {
    switch (rule) {
      case 'unusualAmount':
        return this.checkUnusualAmount(tx);
      case 'frequencySpike':
        return this.checkFrequencySpike(tx);
      case 'newDestination':
        return this.checkNewDestination(tx);
      case 'offHoursActivity':
        return this.checkOffHours(tx);
      case 'rapidSuccession':
        return this.checkRapidSuccession(tx);
      case 'roundAmount':
        return this.checkRoundAmount(tx);
      default:
        return null;
    }
  }

  private runActionRule(rule: AnomalyRuleType, action: ActionLog): AnomalyEvent | null {
    switch (rule) {
      case 'offHoursActivity':
        return this.checkOffHoursAction(action);
      case 'frequencySpike':
        return this.checkActionFrequencySpike(action);
      default:
        return null;
    }
  }

  // --------------------------------------------------------------------------
  // Individual rule implementations
  // --------------------------------------------------------------------------

  private checkUnusualAmount(tx: TransactionRecord): AnomalyEvent | null {
    const amount = parseAmount(tx.amount);
    if (isNaN(amount)) return null;

    const threshold = parseAmount(this.thresholds.maxAmount);

    // Check against absolute threshold
    if (amount > threshold) {
      return this.createAnomaly(
        'unusualAmount',
        amount > threshold * 5 ? 'critical' : amount > threshold * 2 ? 'high' : 'medium',
        `Transaction amount ${tx.amount} ${tx.token ?? tx.currency ?? ''} exceeds threshold of ${this.thresholds.maxAmount}`,
        tx.agentId,
        tx.id,
        { amount: tx.amount, threshold: this.thresholds.maxAmount, token: tx.token ?? tx.currency },
      );
    }

    // Check against agent's historical average
    const history = this.store.getTransactionsByAgent(tx.agentId);
    if (history.length >= 3) {
      const amounts = history.map((t) => parseAmount(t.amount)).filter((a) => !isNaN(a));
      if (amounts.length >= 3) {
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        if (avg > 0 && amount > avg * 5) {
          return this.createAnomaly(
            'unusualAmount',
            amount > avg * 10 ? 'high' : 'medium',
            `Transaction amount ${tx.amount} is ${(amount / avg).toFixed(1)}x the agent's average of ${avg.toFixed(2)}`,
            tx.agentId,
            tx.id,
            { amount: tx.amount, average: avg.toFixed(2), multiplier: (amount / avg).toFixed(1) },
          );
        }
      }
    }

    return null;
  }

  private checkFrequencySpike(tx: TransactionRecord): AnomalyEvent | null {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentTxs = this.store.queryTransactions(
      (t) => t.agentId === tx.agentId && new Date(t.timestamp) >= oneHourAgo,
    );

    const count = recentTxs.length;
    const maxFrequency = this.thresholds.maxFrequency;

    if (count > maxFrequency) {
      return this.createAnomaly(
        'frequencySpike',
        count > maxFrequency * 3 ? 'critical' : count > maxFrequency * 2 ? 'high' : 'medium',
        `Agent ${tx.agentId} has ${count} transactions in the last hour (threshold: ${maxFrequency})`,
        tx.agentId,
        tx.id,
        { count, threshold: maxFrequency },
      );
    }

    return null;
  }

  private checkNewDestination(tx: TransactionRecord): AnomalyEvent | null {
    const history = this.store.getTransactionsByAgent(tx.agentId);

    // Only flag if agent has some history (new agents get a pass)
    if (history.length < 3) return null;

    const knownDestinations = new Set(
      history.filter((t) => t.id !== tx.id).map((t) => t.to.toLowerCase()),
    );

    if (!knownDestinations.has(tx.to.toLowerCase())) {
      const amount = parseAmount(tx.amount);
      const severity: AnomalySeverity =
        !isNaN(amount) && amount > parseAmount(this.thresholds.maxAmount) * 0.5
          ? 'high'
          : 'low';

      return this.createAnomaly(
        'newDestination',
        severity,
        `Transaction to new destination ${tx.to} (agent has ${knownDestinations.size} known destinations)`,
        tx.agentId,
        tx.id,
        { destination: tx.to, knownDestinationCount: knownDestinations.size },
      );
    }

    return null;
  }

  private checkOffHours(tx: TransactionRecord): AnomalyEvent | null {
    const txHour = new Date(tx.timestamp).getUTCHours();

    if (this.thresholds.offHours.includes(txHour)) {
      return this.createAnomaly(
        'offHoursActivity',
        'low',
        `Transaction at ${txHour}:00 UTC falls within off-hours window`,
        tx.agentId,
        tx.id,
        { hour: txHour, offHours: this.thresholds.offHours },
      );
    }

    return null;
  }

  private checkRapidSuccession(tx: TransactionRecord): AnomalyEvent | null {
    const recentTxs = this.store
      .getTransactionsByAgent(tx.agentId)
      .filter((t) => t.id !== tx.id);

    if (recentTxs.length === 0) return null;

    const lastTx = recentTxs[recentTxs.length - 1];
    if (!lastTx) return null;

    const timeDiffMs =
      new Date(tx.timestamp).getTime() - new Date(lastTx.timestamp).getTime();
    const timeDiffSeconds = timeDiffMs / 1000;

    if (timeDiffSeconds >= 0 && timeDiffSeconds < this.thresholds.minIntervalSeconds) {
      return this.createAnomaly(
        'rapidSuccession',
        timeDiffSeconds < 2 ? 'high' : 'medium',
        `Transaction occurred ${timeDiffSeconds.toFixed(1)}s after previous transaction (minimum: ${this.thresholds.minIntervalSeconds}s)`,
        tx.agentId,
        tx.id,
        {
          intervalSeconds: timeDiffSeconds,
          threshold: this.thresholds.minIntervalSeconds,
          previousTxId: lastTx.id,
        },
      );
    }

    return null;
  }

  private checkRoundAmount(tx: TransactionRecord): AnomalyEvent | null {
    const amount = parseAmount(tx.amount);
    if (isNaN(amount)) return null;

    // Check for structuring indicators: amounts just under common thresholds
    const structuringThresholds = [10000, 5000, 3000, 1000];
    for (const threshold of structuringThresholds) {
      const diff = threshold - amount;
      if (diff > 0 && diff <= threshold * 0.05) {
        // Within 5% below a threshold
        return this.createAnomaly(
          'roundAmount',
          threshold >= 10000 ? 'high' : 'medium',
          `Transaction amount ${tx.amount} is just below the ${threshold} threshold (potential structuring)`,
          tx.agentId,
          tx.id,
          { amount: tx.amount, nearThreshold: threshold, difference: diff },
        );
      }
    }

    // Check for exact round amounts above 5000
    if (amount >= 5000 && amount % 1000 === 0) {
      return this.createAnomaly(
        'roundAmount',
        'low',
        `Transaction amount ${tx.amount} is a round number`,
        tx.agentId,
        tx.id,
        { amount: tx.amount },
      );
    }

    return null;
  }

  private checkOffHoursAction(action: ActionLog): AnomalyEvent | null {
    const actionHour = new Date(action.timestamp).getUTCHours();

    if (this.thresholds.offHours.includes(actionHour)) {
      return this.createAnomaly(
        'offHoursActivity',
        'low',
        `Action at ${actionHour}:00 UTC falls within off-hours window`,
        action.agentId,
        action.id,
        { hour: actionHour, offHours: this.thresholds.offHours },
      );
    }

    return null;
  }

  private checkActionFrequencySpike(action: ActionLog): AnomalyEvent | null {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentActions = this.store.queryActions(
      (a) => a.agentId === action.agentId && new Date(a.timestamp) >= oneHourAgo,
    );

    const count = recentActions.length;
    // Use 3x the transaction frequency threshold for general actions
    const maxFrequency = this.thresholds.maxFrequency * 3;

    if (count > maxFrequency) {
      return this.createAnomaly(
        'frequencySpike',
        count > maxFrequency * 2 ? 'high' : 'medium',
        `Agent ${action.agentId} has ${count} actions in the last hour (threshold: ${maxFrequency})`,
        action.agentId,
        action.id,
        { count, threshold: maxFrequency },
      );
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private createAnomaly(
    type: AnomalyRuleType,
    severity: AnomalySeverity,
    description: string,
    agentId: string,
    actionId: string,
    data: Record<string, unknown>,
  ): AnomalyEvent {
    return {
      id: generateId(),
      type,
      severity,
      description,
      agentId,
      actionId,
      detectedAt: now(),
      data,
      reviewed: false,
    };
  }

  private notifyCallbacks(anomaly: AnomalyEvent): void {
    for (const cb of this.callbacks) {
      try {
        cb(anomaly);
      } catch (error) {
        console.warn(
          `[Kontext] Anomaly callback error for ${anomaly.type} (${anomaly.id}):`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }
}
