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
} from './types.js';
import type { DigestVerification, DigestLink } from './digest.js';
import type { PlanTier, PlanUsage, LimitEvent } from './plans.js';
import { KontextError, KontextErrorCode } from './types.js';
import { KontextStore } from './store.js';
import { ActionLogger } from './logger.js';
import { TaskManager } from './tasks.js';
import { AuditExporter } from './audit.js';
import { UsdcCompliance } from './integrations/usdc.js';
import { PlanManager } from './plans.js';
import { requirePlan } from './plan-gate.js';
import type { EventExporter } from './exporters.js';
import { NoopExporter } from './exporters.js';
import { FeatureFlagManager } from './feature-flags.js';
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
  private readonly mode: KontextMode;
  private readonly planManager: PlanManager;
  private readonly exporter: EventExporter;
  private readonly featureFlagManager: FeatureFlagManager | null;

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

    // Initialize feature flag manager if configured
    this.featureFlagManager = config.featureFlags
      ? new FeatureFlagManager(config.featureFlags)
      : null;
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
    if (input.chain !== 'base') {
      requirePlan('multi-chain', this.planManager.getTier());
    }

    this.validateMetadata(input.metadata);
    const record = await this.logger.logTransaction(input);

    // Track event for plan metering
    const limitExceeded = this.planManager.recordEvent();
    if (limitExceeded) {
      record.metadata = { ...record.metadata, limitExceeded: true };
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
   * Log and compliance-check a transaction in a single call.
   *
   * @param input - Transaction details (same as logTransaction)
   * @returns Compliance result with the logged transaction record
   */
  async verify(input: VerifyInput): Promise<VerifyResult> {
    const transaction = await this.logTransaction(input);
    const compliance = UsdcCompliance.checkTransaction(input);
    return {
      compliant: compliance.compliant,
      checks: compliance.checks,
      riskLevel: compliance.riskLevel,
      recommendations: compliance.recommendations,
      transaction,
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
