// ============================================================================
// Kontext SDK - Core Client
// ============================================================================

import type {
  KontextConfig,
  KontextMode,
  LogActionInput,
  LogTransactionInput,
  ActionLog,
  TransactionRecord,
  CreateTaskInput,
  ConfirmTaskInput,
  Task,
  TaskStatus,
  ExportOptions,
  ExportResult,
  ReportOptions,
  ComplianceReport,
  TrustScore,
  TransactionEvaluation,
  AnomalyDetectionConfig,
  AnomalyCallback,
  AnomalyEvent,
  UsdcComplianceCheck,
  SARReport,
  CTRReport,
} from './types.js';
import type { DigestVerification, DigestLink } from './digest.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { ActionLogger } from './logger.js';
import { TaskManager } from './tasks.js';
import { AuditExporter } from './audit.js';
import { TrustScorer } from './trust.js';
import { AnomalyDetector } from './anomaly.js';
import { UsdcCompliance } from './integrations/usdc.js';

/**
 * Main Kontext SDK client. Provides a unified interface to all SDK features:
 * action logging, task confirmation, audit export, trust scoring, and
 * anomaly detection.
 *
 * Supports two operating modes:
 * - **Local mode** (no API key): All data stored locally, suitable for
 *   open-source usage and development.
 * - **Cloud mode** (with API key): Data synced to Kontext API for
 *   persistent storage and advanced features.
 *
 * @example
 * ```typescript
 * import { Kontext } from '@kontext/sdk';
 *
 * const kontext = Kontext.init({
 *   projectId: 'my-project',
 *   environment: 'development',
 * });
 *
 * await kontext.logTransaction({
 *   txHash: '0x...',
 *   chain: 'base',
 *   amount: '100',
 *   token: 'USDC',
 *   from: '0xSender',
 *   to: '0xReceiver',
 *   agentId: 'agent-1',
 * });
 * ```
 */
export class Kontext {
  private readonly config: KontextConfig;
  private readonly store: KontextStore;
  private readonly logger: ActionLogger;
  private readonly taskManager: TaskManager;
  private readonly auditExporter: AuditExporter;
  private readonly trustScorer: TrustScorer;
  private readonly anomalyDetector: AnomalyDetector;
  private readonly mode: KontextMode;

  private constructor(config: KontextConfig) {
    this.config = config;
    this.mode = config.apiKey ? 'cloud' : 'local';
    this.store = new KontextStore();

    // Attach storage adapter if provided
    if (config.storage) {
      this.store.setStorageAdapter(config.storage);
    }

    this.logger = new ActionLogger(config, this.store);
    this.taskManager = new TaskManager(config, this.store);
    this.auditExporter = new AuditExporter(config, this.store);
    this.trustScorer = new TrustScorer(config, this.store);
    this.anomalyDetector = new AnomalyDetector(config, this.store);
  }

  /**
   * Initialize the Kontext SDK.
   *
   * @param config - Configuration options
   * @returns Initialized Kontext client instance
   *
   * @example
   * ```typescript
   * // Local/OSS mode (no API key)
   * const kontext = Kontext.init({
   *   projectId: 'my-project',
   *   environment: 'development',
   * });
   *
   * // Cloud mode (with API key)
   * const kontext = Kontext.init({
   *   apiKey: 'sk_live_...',
   *   projectId: 'my-project',
   *   environment: 'production',
   * });
   *
   * // With persistent file storage
   * const kontext = Kontext.init({
   *   projectId: 'my-project',
   *   environment: 'development',
   *   storage: new FileStorage('./kontext-data'),
   * });
   * ```
   */
  static init(config: KontextConfig): Kontext {
    if (!config.projectId || config.projectId.trim() === '') {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'projectId is required',
      );
    }

    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(config.environment)) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        `Invalid environment: ${config.environment}. Must be one of: ${validEnvironments.join(', ')}`,
      );
    }

    if (config.debug) {
      const mode = config.apiKey ? 'cloud' : 'local';
      console.debug(
        `[Kontext] Initializing in ${mode} mode for project ${config.projectId} (${config.environment})`,
      );
    }

    return new Kontext(config);
  }

  // --------------------------------------------------------------------------
  // Mode & Config
  // --------------------------------------------------------------------------

  /**
   * Get the current operating mode.
   */
  getMode(): KontextMode {
    return this.mode;
  }

  /**
   * Get the current configuration (API key is masked).
   */
  getConfig(): Omit<KontextConfig, 'apiKey'> & { apiKey?: string } {
    return {
      ...this.config,
      apiKey: this.config.apiKey ? `${this.config.apiKey.slice(0, 8)}...` : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // Action Logging
  // --------------------------------------------------------------------------

  /**
   * Log a generic agent action.
   *
   * @param input - Action details
   * @returns The created action log entry
   */
  async log(input: LogActionInput): Promise<ActionLog> {
    const action = await this.logger.log(input);

    // Run anomaly detection if enabled
    if (this.anomalyDetector.isEnabled()) {
      this.anomalyDetector.evaluateAction(action);
    }

    return action;
  }

  /**
   * Log a cryptocurrency transaction with full chain details.
   *
   * @param input - Transaction details
   * @returns The created transaction record
   */
  async logTransaction(input: LogTransactionInput): Promise<TransactionRecord> {
    const record = await this.logger.logTransaction(input);

    // Run anomaly detection if enabled
    if (this.anomalyDetector.isEnabled()) {
      this.anomalyDetector.evaluateTransaction(record);
    }

    return record;
  }

  /**
   * Flush any pending log batches.
   */
  async flushLogs(): Promise<void> {
    await this.logger.flush();
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  /**
   * Persist all current in-memory state to the attached storage adapter.
   * No-op if no storage adapter is configured.
   */
  async flush(): Promise<void> {
    await this.logger.flush();
    await this.store.flush();
  }

  /**
   * Restore state from the attached storage adapter.
   * Loads previously persisted actions, transactions, tasks, and anomalies.
   * No-op if no storage adapter is configured.
   */
  async restore(): Promise<void> {
    await this.store.restore();
  }

  // --------------------------------------------------------------------------
  // Task Confirmation
  // --------------------------------------------------------------------------

  /**
   * Create a new tracked task that requires evidence for confirmation.
   *
   * @param input - Task details including required evidence types
   * @returns The created task
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    return this.taskManager.createTask(input);
  }

  /**
   * Confirm a task by providing evidence.
   *
   * @param input - Task ID and evidence data
   * @returns The confirmed task
   */
  async confirmTask(input: ConfirmTaskInput): Promise<Task> {
    return this.taskManager.confirmTask(input);
  }

  /**
   * Get the current status of a task.
   *
   * @param taskId - Task identifier
   * @returns The task or undefined if not found
   */
  async getTaskStatus(taskId: string): Promise<Task | undefined> {
    return this.taskManager.getTaskStatus(taskId);
  }

  /**
   * Mark a task as in-progress.
   *
   * @param taskId - Task identifier
   * @returns The updated task
   */
  async startTask(taskId: string): Promise<Task> {
    return this.taskManager.startTask(taskId);
  }

  /**
   * Mark a task as failed.
   *
   * @param taskId - Task identifier
   * @param reason - Reason for failure
   * @returns The updated task
   */
  async failTask(taskId: string, reason: string): Promise<Task> {
    return this.taskManager.failTask(taskId, reason);
  }

  /**
   * Get all tasks, optionally filtered by status.
   *
   * @param status - Optional status filter
   * @returns Array of tasks
   */
  getTasks(status?: TaskStatus): Task[] {
    return this.taskManager.getTasks(status);
  }

  // --------------------------------------------------------------------------
  // Audit Export
  // --------------------------------------------------------------------------

  /**
   * Export audit data in JSON or CSV format.
   *
   * @param options - Export configuration
   * @returns Export result with formatted data
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    return this.auditExporter.export(options);
  }

  /**
   * Generate a compliance report for a given period.
   *
   * @param options - Report configuration
   * @returns Compliance report with summary and detailed records
   */
  async generateReport(options: ReportOptions): Promise<ComplianceReport> {
    return this.auditExporter.generateReport(options);
  }

  /**
   * Generate a Suspicious Activity Report (SAR) template.
   *
   * This produces a structured SAR template populated with data from the SDK.
   * It is a template/structure, not an actual regulatory filing.
   *
   * @param options - Report configuration
   * @returns SAR report template
   */
  async generateSARReport(options: ReportOptions): Promise<SARReport> {
    return this.auditExporter.generateSARReport(options);
  }

  /**
   * Generate a Currency Transaction Report (CTR) template.
   *
   * This produces a structured CTR template for transactions that meet or
   * exceed reporting thresholds. It is a template/structure, not an actual
   * regulatory filing.
   *
   * @param options - Report configuration
   * @returns CTR report template
   */
  async generateCTRReport(options: ReportOptions): Promise<CTRReport> {
    return this.auditExporter.generateCTRReport(options);
  }

  // --------------------------------------------------------------------------
  // Trust Scoring
  // --------------------------------------------------------------------------

  /**
   * Get the trust score for an agent.
   *
   * @param agentId - Agent identifier
   * @returns Trust score with factor breakdown
   */
  async getTrustScore(agentId: string): Promise<TrustScore> {
    return this.trustScorer.getTrustScore(agentId);
  }

  /**
   * Evaluate the risk of a specific transaction.
   *
   * @param tx - Transaction to evaluate
   * @returns Transaction evaluation with risk score and recommendation
   */
  async evaluateTransaction(tx: LogTransactionInput): Promise<TransactionEvaluation> {
    return this.trustScorer.evaluateTransaction(tx);
  }

  // --------------------------------------------------------------------------
  // Anomaly Detection
  // --------------------------------------------------------------------------

  /**
   * Enable anomaly detection with the specified rules and thresholds.
   *
   * @param config - Detection configuration
   */
  enableAnomalyDetection(config: AnomalyDetectionConfig): void {
    this.anomalyDetector.enableAnomalyDetection(config);
  }

  /**
   * Disable anomaly detection.
   */
  disableAnomalyDetection(): void {
    this.anomalyDetector.disableAnomalyDetection();
  }

  /**
   * Register a callback for anomaly events.
   *
   * @param callback - Function to call when an anomaly is detected
   * @returns Unsubscribe function
   */
  onAnomaly(callback: AnomalyCallback): () => void {
    return this.anomalyDetector.onAnomaly(callback);
  }

  // --------------------------------------------------------------------------
  // Digest Chain
  // --------------------------------------------------------------------------

  /**
   * Get the terminal digest — the latest SHA-256 hash in the rolling digest chain.
   * Embed this in outgoing messages as tamper-evident proof of the entire action history.
   *
   * @returns The terminal SHA-256 digest hex string
   */
  getTerminalDigest(): string {
    return this.logger.getTerminalDigest();
  }

  /**
   * Verify the integrity of the digest chain.
   * Recomputes every digest from genesis and compares against stored values.
   * Any tampering will cause verification to fail.
   *
   * @returns Verification result with timing and validity data
   */
  verifyDigestChain(): DigestVerification {
    const actions = this.store.getActions();
    return this.logger.verifyChain(actions);
  }

  /**
   * Export the digest chain for independent third-party verification.
   *
   * @returns Chain data including genesis hash, all links, and terminal digest
   */
  exportDigestChain(): { genesisHash: string; links: DigestLink[]; terminalDigest: string } {
    return this.logger.getDigestChain().exportChain();
  }

  // --------------------------------------------------------------------------
  // USDC Integration
  // --------------------------------------------------------------------------

  /**
   * Run USDC-specific compliance checks on a transaction.
   *
   * @param tx - Transaction to check
   * @returns Compliance check result
   */
  checkUsdcCompliance(tx: LogTransactionInput): UsdcComplianceCheck {
    return UsdcCompliance.checkTransaction(tx);
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Gracefully shut down the SDK, flushing any pending data.
   */
  async destroy(): Promise<void> {
    await this.logger.destroy();
  }
}
