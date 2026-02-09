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
  LogReasoningInput,
  ReasoningEntry,
  GenerateComplianceCertificateInput,
  ComplianceCertificate,
} from './types.js';
import type { DigestVerification, DigestLink } from './digest.js';
import type { PlanTier, PlanUsage, LimitEvent } from './plans.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { ActionLogger } from './logger.js';
import { TaskManager } from './tasks.js';
import { AuditExporter } from './audit.js';
import { TrustScorer } from './trust.js';
import { AnomalyDetector } from './anomaly.js';
import { UsdcCompliance } from './integrations/usdc.js';
import { PlanManager } from './plans.js';
import { createHash } from 'crypto';
import { generateId, now } from './utils.js';

/** Storage key for plan metering data */
const PLAN_STORAGE_KEY = 'kontext:plan';

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
  private readonly planManager: PlanManager;

  private constructor(config: KontextConfig) {
    this.config = config;
    this.mode = config.apiKey ? 'cloud' : 'local';
    this.store = new KontextStore();

    // Validate metadataSchema eagerly — if provided, it must have a parse() method
    if (config.metadataSchema && typeof config.metadataSchema.parse !== 'function') {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'metadataSchema must have a parse() method',
      );
    }

    // Attach storage adapter if provided
    if (config.storage) {
      this.store.setStorageAdapter(config.storage);
    }

    // Initialize plan manager
    const planTier: PlanTier = config.plan ?? 'free';
    this.planManager = new PlanManager(planTier);

    // Configure upgrade URLs
    if (config.upgradeUrl) {
      this.planManager.upgradeUrl = config.upgradeUrl;
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
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Validate metadata against the configured schema, if any.
   * No-op when metadataSchema is not configured.
   */
  private validateMetadata(metadata: Record<string, unknown> | undefined): void {
    if (!metadata || !this.config.metadataSchema) return;
    try {
      this.config.metadataSchema.parse(metadata);
    } catch (err) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Metadata validation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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
    this.validateMetadata(input.metadata);
    const action = await this.logger.log(input);

    // Track event for plan metering
    const limitExceeded = this.planManager.recordEvent();
    if (limitExceeded) {
      action.metadata = { ...action.metadata, limitExceeded: true };
    }

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
    this.validateMetadata(input.metadata);
    const record = await this.logger.logTransaction(input);

    // Track event for plan metering
    const limitExceeded = this.planManager.recordEvent();
    if (limitExceeded) {
      record.metadata = { ...record.metadata, limitExceeded: true };
    }

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
    this.validateMetadata(input.metadata);
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

  /**
   * Get all action log entries. Required for independent third-party
   * verification via `verifyExportedChain(chain, actions)`.
   *
   * @returns A copy of the action log array
   */
  getActions(): ActionLog[] {
    return this.store.getActions();
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
  // Agent Reasoning
  // --------------------------------------------------------------------------

  /**
   * Log an agent's reasoning/justification for an action.
   * The reasoning entry is recorded into the digest chain as a tamper-evident
   * part of the audit trail (type: 'reasoning').
   *
   * @param input - Reasoning details
   * @returns The created reasoning entry
   *
   * @example
   * ```typescript
   * const entry = await kontext.logReasoning({
   *   agentId: 'payment-agent-1',
   *   action: 'approve_transfer',
   *   reasoning: 'Recipient is a verified vendor with 50+ prior transactions',
   *   confidence: 0.95,
   *   context: { recipientId: 'vendor-42' },
   * });
   * ```
   */
  async logReasoning(input: LogReasoningInput): Promise<ReasoningEntry> {
    if (!input.agentId || input.agentId.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'agentId is required for reasoning entries',
      );
    }

    if (!input.action || input.action.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'action is required for reasoning entries',
      );
    }

    if (!input.reasoning || input.reasoning.trim() === '') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'reasoning is required for reasoning entries',
      );
    }

    if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 1)) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'confidence must be between 0 and 1',
      );
    }

    const reasoningEntry: ReasoningEntry = {
      id: generateId(),
      timestamp: now(),
      agentId: input.agentId,
      action: input.action,
      reasoning: input.reasoning,
      confidence: input.confidence ?? 1.0,
      context: input.context ?? {},
    };

    // Log into the digest chain as a 'reasoning' action
    await this.log({
      type: 'reasoning',
      description: `Reasoning for ${input.action}: ${input.reasoning}`,
      agentId: input.agentId,
      metadata: {
        reasoningId: reasoningEntry.id,
        action: input.action,
        reasoning: input.reasoning,
        confidence: reasoningEntry.confidence,
        context: reasoningEntry.context,
      },
    });

    return reasoningEntry;
  }

  /**
   * Get all reasoning entries for a specific agent.
   *
   * @param agentId - Agent identifier
   * @returns Array of reasoning entries
   */
  getReasoningEntries(agentId: string): ReasoningEntry[] {
    const reasoningActions = this.store.queryActions(
      (a) => a.agentId === agentId && a.type === 'reasoning',
    );

    return reasoningActions.map((action) => ({
      id: action.metadata['reasoningId'] as string,
      timestamp: action.timestamp,
      agentId: action.agentId,
      action: action.metadata['action'] as string,
      reasoning: action.metadata['reasoning'] as string,
      confidence: action.metadata['confidence'] as number,
      context: (action.metadata['context'] as Record<string, unknown>) ?? {},
    }));
  }

  // --------------------------------------------------------------------------
  // Compliance Certificates
  // --------------------------------------------------------------------------

  /**
   * Generate a compliance certificate that summarizes agent actions and
   * verifies the terminal digest.
   *
   * @param input - Certificate generation options
   * @returns A compliance certificate with digest chain verification
   *
   * @example
   * ```typescript
   * const cert = await kontext.generateComplianceCertificate({
   *   agentId: 'payment-agent-1',
   *   includeReasoning: true,
   * });
   * console.log(cert.complianceStatus); // 'compliant'
   * console.log(cert.digestChain.verified); // true
   * ```
   */
  async generateComplianceCertificate(
    input: GenerateComplianceCertificateInput,
  ): Promise<ComplianceCertificate> {
    const { agentId, timeRange, includeReasoning } = input;

    // Get all actions for the agent, optionally filtered by time range
    let agentActions = this.store.getActionsByAgent(agentId);
    if (timeRange) {
      const from = timeRange.from.getTime();
      const to = timeRange.to.getTime();
      agentActions = agentActions.filter((a) => {
        const ts = new Date(a.timestamp).getTime();
        return ts >= from && ts <= to;
      });
    }

    // Count transactions
    const transactions = agentActions.filter((a) => a.type === 'transaction');

    // Count tool calls
    const toolCalls = agentActions.filter((a) => a.type === 'tool_call');

    // Count reasoning entries
    const reasoningActions = agentActions.filter((a) => a.type === 'reasoning');

    // Build action type summary
    const typeCounts = new Map<string, number>();
    for (const action of agentActions) {
      typeCounts.set(action.type, (typeCounts.get(action.type) ?? 0) + 1);
    }
    const actionSummary = Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Verify digest chain
    const verification = this.verifyDigestChain();
    const chainLength = this.logger.getDigestChain().getChainLength();
    const terminalDigest = this.getTerminalDigest();

    // Get trust score
    const trustScore = await this.trustScorer.getTrustScore(agentId);

    // Determine compliance status
    const anomalies = this.store.queryAnomalies((a) => a.agentId === agentId);
    let filteredAnomalies = anomalies;
    if (timeRange) {
      const from = timeRange.from.getTime();
      const to = timeRange.to.getTime();
      filteredAnomalies = anomalies.filter((a) => {
        const ts = new Date(a.detectedAt).getTime();
        return ts >= from && ts <= to;
      });
    }

    let complianceStatus: ComplianceCertificate['complianceStatus'];
    const criticalAnomalies = filteredAnomalies.filter((a) => a.severity === 'critical');
    const highAnomalies = filteredAnomalies.filter((a) => a.severity === 'high');

    if (!verification.valid || criticalAnomalies.length > 0) {
      complianceStatus = 'non-compliant';
    } else if (highAnomalies.length > 0 || trustScore.score < 50) {
      complianceStatus = 'review-required';
    } else {
      complianceStatus = 'compliant';
    }

    // Build reasoning entries if requested
    let reasoningEntries: ReasoningEntry[] = [];
    if (includeReasoning) {
      reasoningEntries = reasoningActions.map((action) => ({
        id: action.metadata['reasoningId'] as string,
        timestamp: action.timestamp,
        agentId: action.agentId,
        action: action.metadata['action'] as string,
        reasoning: action.metadata['reasoning'] as string,
        confidence: action.metadata['confidence'] as number,
        context: (action.metadata['context'] as Record<string, unknown>) ?? {},
      }));
    }

    // Build the certificate content (before signature)
    const certificateId = generateId();
    const issuedAt = now();

    const certificateContent = {
      certificateId,
      agentId,
      issuedAt,
      summary: {
        actions: agentActions.length,
        transactions: transactions.length,
        toolCalls: toolCalls.length,
        reasoningEntries: reasoningActions.length,
      },
      digestChain: {
        terminalDigest,
        chainLength,
        verified: verification.valid,
      },
      trustScore: trustScore.score,
      complianceStatus,
      actions: actionSummary,
      reasoning: reasoningEntries,
    };

    // Compute SHA-256 hash of the certificate content for integrity verification
    const hash = createHash('sha256');
    hash.update(JSON.stringify(certificateContent));
    const contentHash = hash.digest('hex');

    return {
      ...certificateContent,
      contentHash,
    };
  }

  // --------------------------------------------------------------------------
  // Plan & Usage Metering
  // --------------------------------------------------------------------------

  /**
   * Get current usage statistics for the plan.
   *
   * @returns Usage data including plan, event count, limits, and whether the limit is exceeded
   */
  getUsage(): PlanUsage {
    return this.planManager.getUsage();
  }

  /**
   * Change the plan tier at runtime (e.g., after Stripe checkout succeeds).
   *
   * @param tier - The new plan tier
   */
  setPlan(tier: PlanTier): void {
    this.planManager.setPlan(tier);
  }

  /**
   * Register a callback for when usage reaches 80% of the plan limit.
   *
   * @param callback - Function to call with the limit event
   * @returns Unsubscribe function
   */
  onUsageWarning(callback: (event: LimitEvent) => void): () => void {
    return this.planManager.onUsageWarning(callback);
  }

  /**
   * Register a callback for when the plan event limit is reached.
   *
   * @param callback - Function to call with the limit event
   * @returns Unsubscribe function
   */
  onLimitReached(callback: (event: LimitEvent) => void): () => void {
    return this.planManager.onLimitReached(callback);
  }

  /**
   * Get the URL for upgrading to the Pro plan.
   *
   * @returns The upgrade URL (configurable via init)
   */
  getUpgradeUrl(): string {
    return this.planManager.upgradeUrl;
  }

  /**
   * Get the URL for contacting the team about Enterprise pricing.
   *
   * @returns The enterprise contact URL
   */
  getEnterpriseContactUrl(): string {
    return this.planManager.enterpriseContactUrl;
  }

  /**
   * Persist plan metering state to the storage adapter.
   * Call this alongside flush() to persist event counts across restarts.
   */
  async flushPlanState(): Promise<void> {
    const adapter = this.store.getStorageAdapter();
    if (!adapter) return;
    await adapter.save(PLAN_STORAGE_KEY, this.planManager.toJSON());
  }

  /**
   * Restore plan metering state from the storage adapter.
   * Call this after restore() to reload event counts.
   */
  async restorePlanState(): Promise<void> {
    const adapter = this.store.getStorageAdapter();
    if (!adapter) return;
    const data = await adapter.load(PLAN_STORAGE_KEY);
    if (data && typeof data === 'object' && data.tier && typeof data.eventCount === 'number') {
      this.planManager.setPlan(data.tier);
      this.planManager.setEventCount(data.eventCount);
      if (data.billingPeriodStart) {
        this.planManager.resetBillingPeriod(new Date(data.billingPeriodStart));
        this.planManager.setEventCount(data.eventCount);
      }
    }
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
