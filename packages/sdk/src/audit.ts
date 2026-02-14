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
  KontextConfig,
  SARReport,
  CTRReport,
  ReportSubject,
  DateRange,
  Chain,
} from './types.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { generateId, now, isWithinDateRange, toCsv, parseAmount } from './utils.js';
import type { KYAEnvelope } from './kya/types.js';

/** Provider function that returns a KYA envelope for inclusion in audit exports */
export type KYAProvider = (options: ExportOptions) => KYAEnvelope | null;

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
  private kyaProvider: KYAProvider | null = null;

  constructor(config: KontextConfig, store: KontextStore) {
    this.config = config;
    this.store = store;
  }

  /**
   * Set a KYA envelope provider for inclusion in audit exports.
   */
  setKYAProvider(provider: KYAProvider): void {
    this.kyaProvider = provider;
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

    // Build KYA envelope if provider is set
    const kyaEnvelope = this.kyaProvider ? this.kyaProvider(options) : null;

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

    if (kyaEnvelope) {
      records['kyaEnvelope'] = kyaEnvelope;
    }

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

  // --------------------------------------------------------------------------
  // SAR Report Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a Suspicious Activity Report (SAR) template.
   *
   * This produces a structured SAR template populated with data from the SDK.
   * It is a template/structure, not an actual regulatory filing. Organizations
   * should review and supplement this data before formal submission.
   *
   * @param options - Report configuration including period and optional filters
   * @returns SARReport template populated with flagged transactions and anomalies
   *
   * @example
   * ```typescript
   * const sar = await exporter.generateSARReport({
   *   type: 'sar',
   *   period: { start: new Date('2026-01-01'), end: new Date() },
   * });
   * console.log(`SAR contains ${sar.suspiciousTransactions.length} flagged transactions`);
   * ```
   */
  async generateSARReport(options: ReportOptions): Promise<SARReport> {
    const exportOptions: ExportOptions = {
      format: 'json',
      dateRange: options.period,
      agentIds: options.agentIds,
      includeTasks: true,
      includeAnomalies: true,
    };

    const actions = this.filterActions(exportOptions);
    const transactions = this.filterTransactions(exportOptions);
    const anomalies = this.filterAnomalies(exportOptions);

    // Identify suspicious transactions: those with associated anomalies
    const anomalyActionIds = new Set(anomalies.map((a) => a.actionId));
    const suspiciousTransactions = transactions.filter(
      (tx) => anomalyActionIds.has(tx.id),
    );

    // If no directly linked suspicious transactions, include transactions
    // associated with agents who have anomalies
    const anomalyAgentIds = new Set(anomalies.map((a) => a.agentId));
    const additionalSuspicious = suspiciousTransactions.length === 0
      ? transactions.filter((tx) => anomalyAgentIds.has(tx.agentId))
      : [];

    const allSuspicious = [...suspiciousTransactions, ...additionalSuspicious];

    // Build subjects from agents involved in suspicious activity
    const subjectMap = new Map<string, ReportSubject>();
    for (const tx of allSuspicious) {
      if (!subjectMap.has(tx.agentId)) {
        const agentTxs = transactions.filter((t) => t.agentId === tx.agentId);
        const addresses = new Set<string>();
        for (const t of agentTxs) {
          addresses.add(t.from);
          addresses.add(t.to);
        }
        subjectMap.set(tx.agentId, {
          name: tx.agentId,
          agentId: tx.agentId,
          addresses: Array.from(addresses),
        });
      }
    }

    // Compute total amount involved
    const totalAmount = allSuspicious
      .reduce((sum, tx) => sum + (parseAmount(tx.amount) || 0), 0)
      .toFixed(2);

    // Determine primary token
    const tokenCounts = new Map<string, number>();
    for (const tx of allSuspicious) {
      tokenCounts.set(tx.token, (tokenCounts.get(tx.token) ?? 0) + 1);
    }
    const currency = tokenCounts.size > 0
      ? Array.from(tokenCounts.entries()).sort((a, b) => b[1] - a[1])[0]![0]
      : 'USDC';

    // Build activity categories from anomaly types
    const activityCategories = Array.from(
      new Set(anomalies.map((a) => this.anomalyTypeToCategory(a.type))),
    );

    // Generate narrative
    const narrative = this.generateSARNarrative(
      allSuspicious,
      anomalies,
      options.period,
    );

    return {
      id: generateId(),
      type: 'sar',
      generatedAt: now(),
      period: options.period,
      projectId: this.config.projectId,
      filingInstitution: this.config.projectId,
      subjects: Array.from(subjectMap.values()),
      narrative,
      activityCategories,
      totalAmount,
      currency,
      suspiciousTransactions: allSuspicious,
      anomalies,
      supportingActions: actions.filter((a) =>
        anomalyAgentIds.has(a.agentId),
      ),
      isContinuingActivity: false,
      priorReportId: null,
      status: 'draft',
    };
  }

  // --------------------------------------------------------------------------
  // CTR Report Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a Currency Transaction Report (CTR) template.
   *
   * This produces a structured CTR template for transactions that meet or
   * exceed reporting thresholds. It is a template/structure, not an actual
   * regulatory filing. Organizations should review and supplement this data
   * before formal submission.
   *
   * @param options - Report configuration including period and optional filters
   * @returns CTRReport template populated with qualifying transactions
   *
   * @example
   * ```typescript
   * const ctr = await exporter.generateCTRReport({
   *   type: 'ctr',
   *   period: { start: new Date('2026-01-01'), end: new Date() },
   * });
   * console.log(`CTR covers ${ctr.transactions.length} reportable transactions`);
   * ```
   */
  async generateCTRReport(options: ReportOptions): Promise<CTRReport> {
    const REPORTING_THRESHOLD = 10000;

    const exportOptions: ExportOptions = {
      format: 'json',
      dateRange: options.period,
      agentIds: options.agentIds,
      includeTasks: false,
      includeAnomalies: false,
    };

    const actions = this.filterActions(exportOptions);
    const transactions = this.filterTransactions(exportOptions);

    // Filter transactions at or above the reporting threshold
    const reportableTransactions = transactions.filter((tx) => {
      const amount = parseAmount(tx.amount);
      return !isNaN(amount) && amount >= REPORTING_THRESHOLD;
    });

    // Also include aggregated transactions from the same agent/day that
    // together exceed the threshold (structuring detection)
    const agentDailyTotals = new Map<string, number>();
    for (const tx of transactions) {
      const day = tx.timestamp.split('T')[0];
      const key = `${tx.agentId}:${day}`;
      agentDailyTotals.set(key, (agentDailyTotals.get(key) ?? 0) + (parseAmount(tx.amount) || 0));
    }

    // Find agents with daily totals above threshold who have individual
    // transactions below threshold (potential structuring)
    const structuringKeys = new Set<string>();
    for (const [key, total] of agentDailyTotals.entries()) {
      if (total >= REPORTING_THRESHOLD) {
        structuringKeys.add(key);
      }
    }

    const reportableIds = new Set(reportableTransactions.map((tx) => tx.id));
    const additionalStructuring = transactions.filter((tx) => {
      if (reportableIds.has(tx.id)) return false;
      const day = tx.timestamp.split('T')[0];
      const key = `${tx.agentId}:${day}`;
      return structuringKeys.has(key);
    });

    const allReportable = [...reportableTransactions, ...additionalStructuring];
    const isAggregated = additionalStructuring.length > 0;

    // Build conductors
    const conductorMap = new Map<string, ReportSubject>();
    for (const tx of allReportable) {
      if (!conductorMap.has(tx.agentId)) {
        const agentTxs = allReportable.filter((t) => t.agentId === tx.agentId);
        const addresses = new Set<string>();
        for (const t of agentTxs) {
          addresses.add(t.from);
          addresses.add(t.to);
        }
        conductorMap.set(tx.agentId, {
          name: tx.agentId,
          agentId: tx.agentId,
          addresses: Array.from(addresses),
        });
      }
    }

    // Compute totals
    let cashIn = 0;
    let cashOut = 0;
    for (const tx of allReportable) {
      const amount = parseAmount(tx.amount) || 0;
      cashOut += amount; // Transfers out from the agent's perspective
      cashIn += amount;  // Received on the other end
    }

    // Collect chains
    const chainsInvolved = Array.from(
      new Set(allReportable.map((tx) => tx.chain)),
    ) as Chain[];

    // Determine primary currency
    const tokenCounts = new Map<string, number>();
    for (const tx of allReportable) {
      tokenCounts.set(tx.token, (tokenCounts.get(tx.token) ?? 0) + 1);
    }
    const currency = tokenCounts.size > 0
      ? Array.from(tokenCounts.entries()).sort((a, b) => b[1] - a[1])[0]![0]
      : 'USDC';

    return {
      id: generateId(),
      type: 'ctr',
      generatedAt: now(),
      period: options.period,
      projectId: this.config.projectId,
      filingInstitution: this.config.projectId,
      conductors: Array.from(conductorMap.values()),
      transactions: allReportable,
      totalCashIn: cashIn.toFixed(2),
      totalCashOut: cashOut.toFixed(2),
      currency,
      isAggregated,
      chainsInvolved,
      supportingActions: actions.filter((a) =>
        conductorMap.has(a.agentId),
      ),
      status: 'draft',
    };
  }

  // --------------------------------------------------------------------------
  // SAR/CTR helpers
  // --------------------------------------------------------------------------

  private anomalyTypeToCategory(type: string): string {
    const mapping: Record<string, string> = {
      unusualAmount: 'Unusual transaction amount',
      frequencySpike: 'Unusually high transaction frequency',
      newDestination: 'Transactions to unknown destinations',
      offHoursActivity: 'Activity during unusual hours',
      rapidSuccession: 'Rapid succession of transactions',
      roundAmount: 'Potential structuring (round amounts)',
    };
    return mapping[type] ?? `Other: ${type}`;
  }

  private generateSARNarrative(
    transactions: TransactionRecord[],
    anomalies: AnomalyEvent[],
    period: DateRange,
  ): string {
    const startDate = period.start.toISOString().split('T')[0];
    const endDate = period.end.toISOString().split('T')[0];

    const parts: string[] = [];

    parts.push(
      `During the period from ${startDate} to ${endDate}, ` +
      `${transactions.length} transaction(s) were identified as potentially suspicious.`,
    );

    if (anomalies.length > 0) {
      const typeCounts = new Map<string, number>();
      for (const a of anomalies) {
        typeCounts.set(a.type, (typeCounts.get(a.type) ?? 0) + 1);
      }
      const typeDesc = Array.from(typeCounts.entries())
        .map(([type, count]) => `${this.anomalyTypeToCategory(type)} (${count} occurrence(s))`)
        .join('; ');

      parts.push(`Anomaly detection identified the following patterns: ${typeDesc}.`);
    }

    const totalAmount = transactions
      .reduce((sum, tx) => sum + (parseAmount(tx.amount) || 0), 0)
      .toFixed(2);
    parts.push(`Total amount involved: ${totalAmount}.`);

    const agents = new Set(transactions.map((t) => t.agentId));
    parts.push(`Agent(s) involved: ${Array.from(agents).join(', ')}.`);

    parts.push(
      'This report is generated as a template for review. ' +
      'Additional investigation and supporting documentation should be attached before filing.',
    );

    return parts.join(' ');
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
      if (options.chains && !options.chains.includes(tx.chain)) {
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
