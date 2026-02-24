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
  UsdcComplianceCheck,
  Environment,
  VerifyInput,
  VerifyResult,
  LogReasoningInput,
  ReasoningEntry,
  TrustScore,
  TransactionEvaluation,
  AnomalyDetectionConfig,
  AnomalyCallback,
  GenerateComplianceCertificateInput,
  ComplianceCertificate,
} from './types.js';
import { TrustScorer } from './trust.js';
import { AnomalyDetector } from './anomaly.js';
import { createHash } from 'crypto';
import type { DigestVerification, DigestLink } from './digest.js';
import type { PlanTier, PlanUsage, LimitEvent } from './plans.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { ActionLogger } from './logger.js';
import { TaskManager } from './tasks.js';
import { AuditExporter } from './audit.js';
import { UsdcCompliance } from './integrations/usdc.js';
import { PaymentCompliance } from './integrations/payment-compliance.js';
import { isCryptoTransaction } from './types.js';
import { PlanManager } from './plans.js';
import { requirePlan } from './plan-gate.js';
import type { EventExporter } from './exporters.js';
import { NoopExporter } from './exporters.js';
import { FeatureFlagManager } from './feature-flags.js';
import { generateId, now, parseAmount } from './utils.js';

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
  private readonly mode: KontextMode;
  private readonly planManager: PlanManager;
  private readonly exporter: EventExporter;
  private readonly featureFlagManager: FeatureFlagManager | null;
  private readonly trustScorer: TrustScorer;
  private readonly anomalyDetector: AnomalyDetector;

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
    this.planManager = new PlanManager(planTier, undefined, config.seats ?? 1);

    // Configure upgrade URLs
    if (config.upgradeUrl) {
      this.planManager.upgradeUrl = config.upgradeUrl;
    }

    // Initialize event exporter (default: NoopExporter)
    this.exporter = config.exporter ?? new NoopExporter();

    this.logger = new ActionLogger(config, this.store);
    this.taskManager = new TaskManager(config, this.store);
    this.auditExporter = new AuditExporter(config, this.store);
    this.trustScorer = new TrustScorer(config, this.store);
    this.anomalyDetector = new AnomalyDetector(config, this.store);

    // Initialize feature flag manager if configured
    this.featureFlagManager = config.featureFlags
      ? new FeatureFlagManager(config.featureFlags)
      : null;

    // Auto-enable anomaly detection if rules provided in config
    if (config.anomalyRules && config.anomalyRules.length > 0) {
      const advancedRules = ['newDestination', 'offHoursActivity', 'rapidSuccession', 'roundAmount'];
      const hasAdvanced = config.anomalyRules.some((r) => advancedRules.includes(r));
      if (hasAdvanced) {
        requirePlan('advanced-anomaly-rules', planTier);
      }
      this.anomalyDetector.enableAnomalyDetection({
        rules: config.anomalyRules,
        thresholds: config.anomalyThresholds,
      });
    }
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

    // Ship to exporter (fire-and-forget to avoid blocking the caller)
    this.exporter.export([action]).catch(() => {});

    return action;
  }

  /**
   * Log a cryptocurrency transaction with full chain details.
   *
   * @param input - Transaction details
   * @returns The created transaction record
   */
  async logTransaction(input: LogTransactionInput): Promise<TransactionRecord> {
    // Multi-chain support requires Pro plan
    if (input.chain && input.chain !== 'base') {
      requirePlan('multi-chain', this.planManager.getTier());
    }

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

    // Ship to exporter (fire-and-forget to avoid blocking the caller)
    this.exporter.export([record]).catch(() => {});

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
    await this.exporter.flush();
  }

  /**
   * Restore state from the attached storage adapter.
   * Loads previously persisted actions, transactions, tasks, and anomalies.
   * Also restores the digest chain's terminal digest so that new actions
   * chain correctly across process boundaries.
   * No-op if no storage adapter is configured.
   */
  async restore(): Promise<void> {
    await this.store.restore();

    // Restore digest chain continuity: set terminal digest from last stored action
    const actions = this.store.getActions();
    if (actions.length > 0) {
      const sorted = [...actions].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const lastAction = sorted[sorted.length - 1]!;
      if (lastAction.digest) {
        this.logger.restoreChainState(lastAction.digest);
      }
    }
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
    // CSV export requires Pro plan
    if (options.format === 'csv') {
      requirePlan('csv-export', this.planManager.getTier());
    }

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
  // Agent Reasoning & Session Tracing
  // --------------------------------------------------------------------------

  /**
   * Generate a unique session ID for a single agent run.
   * Pass this as `sessionId` to logReasoning(), log(), logTransaction(),
   * and verify() calls within the same run to group them in the audit trail.
   *
   * Compatible with framework run IDs: pass LangGraph thread_id,
   * Vercel AI id, or OpenAI run_id directly instead if you prefer.
   *
   * @returns A short unique session identifier
   */
  static generateSessionId(): string {
    return generateId();
  }

  /**
   * Log an agent's reasoning step into the tamper-evident digest chain.
   *
   * Each entry records why the agent took an action, optionally linked
   * to a tool call. All entries for a sessionId can be replayed in
   * order via step numbering to reconstruct the full decision trace.
   *
   * @param input - Reasoning details including agentId, action, reasoning text
   * @returns The created reasoning entry
   *
   * @example
   * ```typescript
   * const sessionId = Kontext.generateSessionId();
   *
   * await ctx.logReasoning({
   *   agentId: 'payment-agent-v1',
   *   sessionId,
   *   step: 1,
   *   action: 'evaluate-transfer',
   *   reasoning: 'User requested $5K USDC to 0xabc. Running compliance check first.',
   *   confidence: 0.95,
   *   toolCall: 'verify',
   * });
   *
   * const result = await ctx.verify({ ..., sessionId });
   *
   * await ctx.logReasoning({
   *   agentId: 'payment-agent-v1',
   *   sessionId,
   *   step: 2,
   *   parentStep: 1,
   *   action: 'compliance-passed',
   *   reasoning: 'verify() returned compliant=true, riskLevel=low. Proceeding.',
   *   confidence: 0.99,
   *   context: { riskLevel: result.riskLevel },
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

    const entry: ReasoningEntry = {
      id: generateId(),
      timestamp: now(),
      agentId: input.agentId,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.step !== undefined ? { step: input.step } : {}),
      ...(input.parentStep !== undefined ? { parentStep: input.parentStep } : {}),
      action: input.action,
      reasoning: input.reasoning,
      confidence: input.confidence ?? 1.0,
      ...(input.toolCall ? { toolCall: input.toolCall } : {}),
      ...(input.toolResult !== undefined ? { toolResult: input.toolResult } : {}),
      context: input.context ?? {},
    };

    // Log into the digest chain as a 'reasoning' action
    await this.log({
      type: 'reasoning',
      description: `[${input.agentId}${input.sessionId ? `/${input.sessionId}` : ''}] step ${input.step ?? '?'}: ${input.action}`,
      agentId: input.agentId,
      sessionId: input.sessionId,
      metadata: {
        reasoningId: entry.id,
        action: entry.action,
        reasoning: entry.reasoning,
        confidence: entry.confidence,
        ...(entry.step !== undefined ? { step: entry.step } : {}),
        ...(entry.parentStep !== undefined ? { parentStep: entry.parentStep } : {}),
        ...(entry.toolCall ? { toolCall: entry.toolCall } : {}),
        ...(entry.toolResult !== undefined ? { toolResult: entry.toolResult } : {}),
        context: entry.context,
      },
    });

    return entry;
  }

  /**
   * Get all reasoning entries for a specific agent, optionally filtered
   * by session ID to retrieve a single run's decision trace.
   *
   * @param agentId - Agent identifier
   * @param sessionId - Optional: filter to a single run
   * @returns Array of reasoning entries in chronological order
   */
  getReasoningEntries(agentId: string, sessionId?: string): ReasoningEntry[] {
    const reasoningActions = this.store.queryActions((a) => {
      if (a.agentId !== agentId || a.type !== 'reasoning') return false;
      if (sessionId && a.sessionId !== sessionId) return false;
      return true;
    });

    return reasoningActions.map((action) => ({
      id: action.metadata['reasoningId'] as string,
      timestamp: action.timestamp,
      agentId: action.agentId,
      ...(action.sessionId ? { sessionId: action.sessionId } : {}),
      ...(action.metadata['step'] !== undefined ? { step: action.metadata['step'] as number } : {}),
      ...(action.metadata['parentStep'] !== undefined ? { parentStep: action.metadata['parentStep'] as number } : {}),
      action: action.metadata['action'] as string,
      reasoning: action.metadata['reasoning'] as string,
      confidence: action.metadata['confidence'] as number,
      ...(action.metadata['toolCall'] ? { toolCall: action.metadata['toolCall'] as string } : {}),
      ...(action.metadata['toolResult'] !== undefined ? { toolResult: action.metadata['toolResult'] } : {}),
      context: (action.metadata['context'] as Record<string, unknown>) ?? {},
    }));
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

  /**
   * Verify a transaction: compliance check, transaction log, trust score,
   * anomaly detection, reasoning, and digest proof — all in one call.
   *
   * @param input - Transaction details with optional reasoning
   * @returns Full verification result including compliance, trust, anomalies, and digest proof
   *
   * @example
   * ```typescript
   * const result = await ctx.verify({
   *   txHash: '0xabc...', chain: 'base', amount: '5000', token: 'USDC',
   *   from: '0xsender', to: '0xrecipient', agentId: 'agent-v1',
   *   reasoning: 'Transfer within daily limit. Recipient in allowlist.',
   *   confidence: 0.95,
   * });
   *
   * // result.compliant        — boolean
   * // result.trustScore       — { score: 87, level: 'high', factors: [...] }
   * // result.anomalies        — any flags triggered
   * // result.digestProof      — { terminalDigest, chainLength, valid }
   * // result.reasoningId      — ID of the reasoning entry (if reasoning provided)
   * ```
   */
  async verify(input: VerifyInput): Promise<VerifyResult> {
    // 1. Log the transaction (includes anomaly eval via logTransaction)
    const transaction = await this.logTransaction(input);

    // 2. Run compliance checks (crypto vs general payment)
    const compliance = isCryptoTransaction(input)
      ? UsdcCompliance.checkTransaction(input)
      : PaymentCompliance.checkPayment(input);

    // 3. Log reasoning if provided
    let reasoningId: string | undefined;
    if (input.reasoning) {
      const entry = await this.logReasoning({
        agentId: input.agentId,
        sessionId: input.sessionId,
        action: 'verify',
        reasoning: input.reasoning,
        confidence: input.confidence,
        toolCall: 'verify',
        toolResult: { compliant: compliance.compliant, riskLevel: compliance.riskLevel },
        context: input.context,
      });
      reasoningId = entry.id;
    }

    // 4. Auto-compute trust score
    const trustScore = await this.trustScorer.getTrustScore(input.agentId);

    // 5. Collect anomalies for this transaction
    const anomalies = this.store.queryAnomalies(
      (a) => a.actionId === transaction.id,
    );

    // 6. Digest proof
    const verification = this.verifyDigestChain();
    const chainLength = this.logger.getDigestChain().getChainLength();
    const terminalDigest = this.getTerminalDigest();

    // 7. Auto-create approval task if amount exceeds threshold
    let requiresApproval: boolean | undefined;
    let task: Task | undefined;
    if (this.config.approvalThreshold) {
      const amount = parseAmount(input.amount);
      const threshold = parseAmount(this.config.approvalThreshold);
      if (amount > threshold) {
        requiresApproval = true;
        const label = input.token
          ? `${input.token} ${input.amount} transfer`
          : `${input.currency ?? 'USD'} ${input.amount} payment`;
        task = await this.createTask({
          description: `Approve ${label} from ${input.from} to ${input.to}`,
          agentId: input.agentId,
          requiredEvidence: input.txHash ? ['txHash'] : ['paymentReference'],
          metadata: {
            amount: input.amount,
            from: input.from,
            to: input.to,
            approvalThreshold: this.config.approvalThreshold,
            ...(input.txHash ? { txHash: input.txHash } : {}),
            ...(input.chain ? { chain: input.chain } : {}),
            ...(input.token ? { token: input.token } : {}),
            ...(input.currency ? { currency: input.currency } : {}),
            ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
            ...(input.paymentReference ? { paymentReference: input.paymentReference } : {}),
          },
        });
      }
    }

    return {
      compliant: compliance.compliant,
      checks: compliance.checks,
      riskLevel: compliance.riskLevel,
      recommendations: compliance.recommendations,
      transaction,
      trustScore,
      anomalies,
      digestProof: {
        terminalDigest,
        chainLength,
        valid: verification.valid,
      },
      ...(reasoningId ? { reasoningId } : {}),
      ...(requiresApproval ? { requiresApproval, task } : {}),
    };
  }

  // --------------------------------------------------------------------------
  // Trust Scoring
  // --------------------------------------------------------------------------

  /**
   * Get the trust score for an agent based on historical behavioral signals.
   *
   * Computes a 0–100 score across 5 factors: history depth, task completion
   * rate, anomaly frequency, transaction consistency, and compliance adherence.
   *
   * @param agentId - Agent identifier
   * @returns Trust score with factor breakdown and level ('untrusted'|'low'|'medium'|'high'|'verified')
   */
  async getTrustScore(agentId: string): Promise<TrustScore> {
    return this.trustScorer.getTrustScore(agentId);
  }

  /**
   * Evaluate the risk of a specific transaction before or after executing it.
   *
   * @param tx - Transaction to evaluate
   * @returns Risk evaluation with score, factors, and recommendation (approve/review/block)
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
   * Free-tier rules: `unusualAmount`, `frequencySpike`
   * Pay as you go rules: `newDestination`, `offHoursActivity`, `rapidSuccession`, `roundAmount`
   *
   * @param config - Detection configuration with rules and optional thresholds
   *
   * @example
   * ```typescript
   * ctx.enableAnomalyDetection({
   *   rules: ['unusualAmount', 'frequencySpike'],
   *   thresholds: { maxAmount: '10000', maxFrequency: 30 },
   * });
   * ctx.onAnomaly((event) => {
   *   console.log(`Anomaly: ${event.type} [${event.severity}]`);
   * });
   * ```
   */
  enableAnomalyDetection(config: AnomalyDetectionConfig): void {
    // Advanced anomaly rules require Pro plan (Pay as you go)
    const advancedRules = ['newDestination', 'offHoursActivity', 'rapidSuccession', 'roundAmount'];
    const hasAdvanced = config.rules.some((r) => advancedRules.includes(r));
    if (hasAdvanced) {
      requirePlan('advanced-anomaly-rules', this.planManager.getTier());
    }
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
  // Compliance Certificates
  // --------------------------------------------------------------------------

  /**
   * Generate a compliance certificate that summarizes an agent's actions
   * and cryptographically verifies the digest chain integrity.
   *
   * The certificate includes: action/transaction/reasoning counts, digest chain
   * verification status (patented), the agent's current trust
   * score, and an overall compliance status. A SHA-256 content hash of the
   * certificate itself is included for tamper-evidence.
   *
   * @param input - Certificate generation options (agentId, optional timeRange, includeReasoning)
   * @returns Compliance certificate with digest chain proof and trust score
   *
   * @example
   * ```typescript
   * const cert = await ctx.generateComplianceCertificate({
   *   agentId: 'payment-agent-v1',
   *   includeReasoning: true,
   * });
   * console.log(cert.complianceStatus);       // 'compliant'
   * console.log(cert.digestChain.verified);   // true
   * console.log(cert.trustScore);             // 87
   * console.log(cert.contentHash);            // sha256 of certificate
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

    const transactions = agentActions.filter((a) => a.type === 'transaction');
    const toolCalls = agentActions.filter((a) => a.type === 'tool_call');
    const reasoningActions = agentActions.filter((a) => a.type === 'reasoning');

    // Build action type summary
    const typeCounts = new Map<string, number>();
    for (const action of agentActions) {
      typeCounts.set(action.type, (typeCounts.get(action.type) ?? 0) + 1);
    }
    const actionSummary = Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count }));

    // Verify digest chain
    const verification = this.verifyDigestChain();
    const chainLength = this.logger.getDigestChain().getChainLength();
    const terminalDigest = this.getTerminalDigest();

    // Get trust score
    const trustScore = await this.trustScorer.getTrustScore(agentId);

    // Determine compliance status
    let agentAnomalies = this.store.queryAnomalies((a) => a.agentId === agentId);
    if (timeRange) {
      const from = timeRange.from.getTime();
      const to = timeRange.to.getTime();
      agentAnomalies = agentAnomalies.filter((a) => {
        const ts = new Date(a.detectedAt).getTime();
        return ts >= from && ts <= to;
      });
    }

    const criticalAnomalies = agentAnomalies.filter((a) => a.severity === 'critical');
    const highAnomalies = agentAnomalies.filter((a) => a.severity === 'high');

    let complianceStatus: ComplianceCertificate['complianceStatus'];
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
        ...(action.sessionId ? { sessionId: action.sessionId } : {}),
        ...(action.metadata['step'] !== undefined ? { step: action.metadata['step'] as number } : {}),
        ...(action.metadata['parentStep'] !== undefined ? { parentStep: action.metadata['parentStep'] as number } : {}),
        action: action.metadata['action'] as string,
        reasoning: action.metadata['reasoning'] as string,
        confidence: action.metadata['confidence'] as number,
        ...(action.metadata['toolCall'] ? { toolCall: action.metadata['toolCall'] as string } : {}),
        ...(action.metadata['toolResult'] !== undefined ? { toolResult: action.metadata['toolResult'] } : {}),
        context: (action.metadata['context'] as Record<string, unknown>) ?? {},
      }));
    }

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

    return { ...certificateContent, contentHash };
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
  // Feature Flags
  // --------------------------------------------------------------------------

  /**
   * Check if a feature flag is enabled for the current environment and plan.
   * Returns `false` if feature flags are not configured.
   * Always synchronous — reads from in-memory cache.
   */
  isFeatureEnabled(
    flagName: string,
    environment?: Environment,
    plan?: 'free' | 'pro' | 'enterprise',
  ): boolean {
    if (!this.featureFlagManager) return false;
    return this.featureFlagManager.isEnabled(flagName, environment, plan);
  }

  /**
   * Get the underlying FeatureFlagManager (or null if not configured).
   */
  getFeatureFlagManager(): FeatureFlagManager | null {
    return this.featureFlagManager;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Gracefully shut down the SDK, flushing any pending data.
   */
  async destroy(): Promise<void> {
    await this.logger.destroy();
    await this.exporter.shutdown();
  }
}
