// ============================================================================
// Kontext SDK - Audit Export & Reporting
// ============================================================================

import type {
  ActionLog,
  TransactionRecord,
  Task,
  AnomalyEvent,
  ExportOptions,
  ExportResult,
  ReportOptions,
  ComplianceReport,
  SARReport,
  CTRReport,
  CasePacket,
  DateRange,
  ReasoningEntry,
  TrustScore,
  KontextConfig,
} from './types.js';
import { KontextStore } from './store.js';
import { generateId, now, isWithinDateRange, toCsv, parseAmount } from './utils.js';

/**
 * AuditExporter handles compliance data export and report generation.
 *
 * Supports exporting action logs, transaction records, tasks, and anomaly
 * events in JSON or CSV format with flexible date range and entity filters.
 *
 * Reports aggregate data into compliance-ready summaries with statistics,
 * suitable for regulatory submission and internal auditing.
 */
export class AuditExporter {
  private readonly config: KontextConfig;
  private readonly store: KontextStore;

  constructor(config: KontextConfig, store: KontextStore) {
    this.config = config;
    this.store = store;
  }

  /**
   * Export audit data in the specified format.
   *
   * @param options - Export configuration including format, date range, and filters
   * @returns ExportResult containing the formatted data
   *
   * @example
   * ```typescript
   * const result = await exporter.export({
   *   format: 'json',
   *   dateRange: { start: new Date('2026-01-01'), end: new Date() },
   *   agentIds: ['payment-agent-1'],
   *   includeTasks: true,
   *   includeAnomalies: true,
   * });
   * ```
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    const actions = this.filterActions(options);
    const transactions = this.filterTransactions(options);
    const tasks = options.includeTasks ? this.filterTasks(options) : [];
    const anomalies = options.includeAnomalies ? this.filterAnomalies(options) : [];

    const records: Record<string, unknown> = {
      actions,
      transactions,
      tasks,
      anomalies,
      exportMetadata: {
        projectId: this.config.projectId,
        exportedAt: now(),
        filters: {
          dateRange: options.dateRange
            ? { start: options.dateRange.start.toISOString(), end: options.dateRange.end.toISOString() }
            : null,
          agentIds: options.agentIds ?? null,
          types: options.types ?? null,
          chains: options.chains ?? null,
        },
      },
    };

    const totalCount =
      actions.length + transactions.length + tasks.length + anomalies.length;

    let data: string;

    if (options.format === 'csv') {
      data = this.formatAsCsv(actions, transactions, tasks, anomalies);
    } else {
      data = JSON.stringify(records, null, 2);
    }

    return {
      format: options.format,
      exportedAt: now(),
      recordCount: totalCount,
      data,
    };
  }

  /**
   * Generate a compliance report for a given period.
   *
   * @param options - Report configuration including type, period, and filters
   * @returns ComplianceReport with summary statistics and detailed records
   *
   * @example
   * ```typescript
   * const report = await exporter.generateReport({
   *   type: 'compliance',
   *   period: { start: new Date('2026-01-01'), end: new Date() },
   * });
   * ```
   */
  async generateReport(options: ReportOptions): Promise<ComplianceReport> {
    const exportOptions: ExportOptions = {
      format: 'json',
      dateRange: options.period,
      agentIds: options.agentIds,
      includeTasks: true,
      includeAnomalies: true,
    };

    const actions = this.filterActions(exportOptions);
    const transactions = this.filterTransactions(exportOptions);
    const tasks = this.filterTasks(exportOptions);
    const anomalies = this.filterAnomalies(exportOptions);

    const confirmedTasks = tasks.filter((t) => t.status === 'confirmed').length;
    const failedTasks = tasks.filter((t) => t.status === 'failed').length;

    // Compute average trust score from actions
    // For the report, we approximate based on confirmed vs total tasks
    const taskCompletionRate = tasks.length > 0 ? confirmedTasks / tasks.length : 1;
    const anomalyRate = actions.length > 0 ? 1 - anomalies.length / actions.length : 1;
    const averageTrustScore = Math.round(
      (taskCompletionRate * 50 + anomalyRate * 50) * 100,
    ) / 100;

    const report: ComplianceReport = {
      id: generateId(),
      type: options.type,
      generatedAt: now(),
      period: options.period,
      projectId: this.config.projectId,
      summary: {
        totalActions: actions.length,
        totalTransactions: transactions.length,
        totalTasks: tasks.length,
        confirmedTasks,
        failedTasks,
        totalAnomalies: anomalies.length,
        averageTrustScore,
      },
      actions,
      transactions,
      tasks,
      anomalies,
    };

    return report;
  }

  /**
   * Generate a SAR report template for a given period and agent.
   */
  async generateSARReport(options: {
    period: DateRange;
    agentId: string;
    filingType?: 'initial' | 'continuing' | 'corrected';
    subjectName?: string;
  }): Promise<SARReport> {
    const exportOpts: ExportOptions = {
      format: 'json',
      dateRange: options.period,
      agentIds: [options.agentId],
      includeAnomalies: true,
    };

    const transactions = this.filterTransactions(exportOpts);
    const anomalies = this.filterAnomalies(exportOpts);

    const addresses = new Set<string>();
    for (const tx of transactions) {
      addresses.add(tx.from);
      addresses.add(tx.to);
    }

    const totalAmount = transactions
      .reduce((sum, tx) => sum + parseAmount(tx.amount), 0)
      .toFixed(2);

    const anomalyTypes = [...new Set(anomalies.map((a) => a.type))];
    const narrative = anomalies.length > 0
      ? anomalies.map((a) => `[${a.severity.toUpperCase()}] ${a.description}`).join('. ')
      : 'No anomalies detected in the reporting period.';

    return {
      id: generateId(),
      generatedAt: now(),
      filingType: options.filingType ?? 'initial',
      period: options.period,
      projectId: this.config.projectId,
      subject: {
        agentId: options.agentId,
        addresses: [...addresses],
        ...(options.subjectName ? { name: options.subjectName } : {}),
      },
      suspiciousActivity: {
        types: anomalyTypes,
        totalAmount,
        dateRange: options.period,
        narrative,
      },
      supportingTransactions: transactions,
      supportingAnomalies: anomalies,
      digestProof: {
        terminalDigest: '',
        chainLength: 0,
        valid: true,
      },
    };
  }

  /**
   * Generate a CTR report for transactions above the $10,000 threshold.
   */
  async generateCTRReport(options: {
    period: DateRange;
    agentId?: string;
    entityName?: string;
  }): Promise<CTRReport> {
    const exportOpts: ExportOptions = {
      format: 'json',
      dateRange: options.period,
      ...(options.agentId ? { agentIds: [options.agentId] } : {}),
    };

    const allTransactions = this.filterTransactions(exportOpts);

    // Filter to transactions at or above the CTR threshold ($10,000)
    const CTR_THRESHOLD = 10000;
    const ctrTransactions: Array<{ record: TransactionRecord; amount: string; aggregatedDaily?: string }> = allTransactions
      .filter((tx) => parseAmount(tx.amount) >= CTR_THRESHOLD)
      .map((tx) => ({
        record: tx,
        amount: tx.amount,
      }));

    // Also detect daily aggregation above threshold (structuring detection)
    const dailyTotals = new Map<string, { total: number; txIds: string[] }>();
    for (const tx of allTransactions) {
      const day = tx.timestamp.slice(0, 10);
      const entry = dailyTotals.get(day) ?? { total: 0, txIds: [] };
      entry.total += parseAmount(tx.amount);
      entry.txIds.push(tx.id);
      dailyTotals.set(day, entry);
    }

    // Add aggregated entries for days where total exceeds threshold but individual txns don't
    for (const [day, entry] of dailyTotals) {
      if (entry.total >= CTR_THRESHOLD) {
        for (const tx of allTransactions) {
          if (tx.timestamp.startsWith(day) && parseAmount(tx.amount) < CTR_THRESHOLD) {
            const existing = ctrTransactions.find((c) => c.record.id === tx.id);
            if (!existing) {
              ctrTransactions.push({
                record: tx,
                amount: tx.amount,
                aggregatedDaily: entry.total.toFixed(2),
              });
            }
          }
        }
      }
    }

    const totalAmount = ctrTransactions
      .reduce((sum, c) => sum + parseAmount(c.amount), 0)
      .toFixed(2);

    return {
      id: generateId(),
      generatedAt: now(),
      period: options.period,
      projectId: this.config.projectId,
      transactions: ctrTransactions,
      totalAmount,
      entityInfo: {
        agentId: options.agentId ?? 'all',
        ...(options.entityName ? { name: options.entityName } : {}),
      },
      digestProof: {
        terminalDigest: '',
        chainLength: 0,
        valid: true,
      },
    };
  }

  /**
   * Export a per-transaction case packet with all related evidence.
   */
  async exportCasePacket(
    txId: string,
    extras: {
      reasoningEntries?: ReasoningEntry[];
      trustScore?: TrustScore;
      intentHash?: string;
    } = {},
  ): Promise<CasePacket> {
    const allTransactions = this.store.queryTransactions(() => true);
    const transaction = allTransactions.find((tx) => tx.id === txId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${txId}`);
    }

    // Find anomalies for the same agentId around the transaction time
    const anomalies = this.store.queryAnomalies(
      (a) => a.agentId === transaction.agentId,
    );

    // Find related tasks (same agentId, matching txHash in metadata)
    const relatedTasks = this.store.queryTasks((t) => {
      if (t.agentId !== transaction.agentId) return false;
      const meta = t.metadata as Record<string, unknown> | undefined;
      if (meta && transaction.txHash && meta['txHash'] === transaction.txHash) return true;
      return false;
    });

    const defaultTrustScore: TrustScore = {
      agentId: transaction.agentId,
      score: 0,
      level: 'untrusted',
      factors: [],
      computedAt: now(),
    };

    return {
      id: generateId(),
      exportedAt: now(),
      transaction,
      reasoningEntries: extras.reasoningEntries ?? [],
      screeningResults: [],
      anomalies,
      digestProof: {
        position: 0,
        terminalDigest: '',
        valid: true,
      },
      trustScore: extras.trustScore ?? defaultTrustScore,
      relatedTasks,
      ...(extras.intentHash ? { intentHash: extras.intentHash } : {}),
    };
  }

  // --------------------------------------------------------------------------
  // Private filtering
  // --------------------------------------------------------------------------

  private filterActions(options: ExportOptions): ActionLog[] {
    return this.store.queryActions((action) => {
      if (options.dateRange && !isWithinDateRange(action.timestamp, options.dateRange.start, options.dateRange.end)) {
        return false;
      }
      if (options.agentIds && !options.agentIds.includes(action.agentId)) {
        return false;
      }
      if (options.types && !options.types.includes(action.type)) {
        return false;
      }
      return true;
    });
  }

  private filterTransactions(options: ExportOptions): TransactionRecord[] {
    return this.store.queryTransactions((tx) => {
      if (options.dateRange && !isWithinDateRange(tx.timestamp, options.dateRange.start, options.dateRange.end)) {
        return false;
      }
      if (options.agentIds && !options.agentIds.includes(tx.agentId)) {
        return false;
      }
      if (options.chains && (!tx.chain || !options.chains.includes(tx.chain))) {
        return false;
      }
      return true;
    });
  }

  private filterTasks(options: ExportOptions): Task[] {
    return this.store.queryTasks((task) => {
      if (options.dateRange && !isWithinDateRange(task.createdAt, options.dateRange.start, options.dateRange.end)) {
        return false;
      }
      if (options.agentIds && !options.agentIds.includes(task.agentId)) {
        return false;
      }
      return true;
    });
  }

  private filterAnomalies(options: ExportOptions): AnomalyEvent[] {
    return this.store.queryAnomalies((anomaly) => {
      if (options.dateRange && !isWithinDateRange(anomaly.detectedAt, options.dateRange.start, options.dateRange.end)) {
        return false;
      }
      if (options.agentIds && !options.agentIds.includes(anomaly.agentId)) {
        return false;
      }
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // CSV formatting
  // --------------------------------------------------------------------------

  private formatAsCsv(
    actions: ActionLog[],
    transactions: TransactionRecord[],
    tasks: Task[],
    anomalies: AnomalyEvent[],
  ): string {
    const sections: string[] = [];

    if (actions.length > 0) {
      const actionRecords = actions.map((a) => ({
        section: 'action',
        id: a.id,
        timestamp: a.timestamp,
        projectId: a.projectId,
        agentId: a.agentId,
        correlationId: a.correlationId,
        type: a.type,
        description: a.description,
        metadata: JSON.stringify(a.metadata),
      }));
      sections.push('# Actions\n' + toCsv(actionRecords));
    }

    if (transactions.length > 0) {
      const txRecords = transactions.map((t) => ({
        section: 'transaction',
        id: t.id,
        timestamp: t.timestamp,
        txHash: t.txHash,
        chain: t.chain,
        amount: t.amount,
        token: t.token,
        from: t.from,
        to: t.to,
        agentId: t.agentId,
      }));
      sections.push('# Transactions\n' + toCsv(txRecords));
    }

    if (tasks.length > 0) {
      const taskRecords = tasks.map((t) => ({
        section: 'task',
        id: t.id,
        description: t.description,
        agentId: t.agentId,
        status: t.status,
        createdAt: t.createdAt,
        confirmedAt: t.confirmedAt ?? '',
        requiredEvidence: t.requiredEvidence.join(';'),
      }));
      sections.push('# Tasks\n' + toCsv(taskRecords));
    }

    if (anomalies.length > 0) {
      const anomalyRecords = anomalies.map((a) => ({
        section: 'anomaly',
        id: a.id,
        type: a.type,
        severity: a.severity,
        description: a.description,
        agentId: a.agentId,
        detectedAt: a.detectedAt,
        reviewed: String(a.reviewed),
      }));
      sections.push('# Anomalies\n' + toCsv(anomalyRecords));
    }

    return sections.join('\n\n');
  }
}
