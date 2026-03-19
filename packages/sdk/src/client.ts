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
  ComplianceCheckResult,
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
  AnchorResult,
  CounterpartyAttestation,
  ERC8021Attribution,
  AgentSession,
  CreateSessionInput,
  ProvenanceCheckpoint,
  CreateCheckpointInput,
  HumanAttestation,
  ProvenanceBundle,
  CircleWalletConfig,
  CreateWalletSetInput,
  CircleWalletSet,
  CreateWalletInput,
  CircleWallet,
  CircleTransferInput,
  CircleTransferResult,
  CoinbaseWalletConfig,
  CoinbaseAccount,
  CoinbaseTransferInput,
  CoinbaseTransferResult,
  MetaMaskWalletConfig,
  MetaMaskAccount,
  MetaMaskTransferInput,
  MetaMaskTransferResult,
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
import { CardCompliance } from './integrations/card-compliance.js';
import { AchCompliance } from './integrations/ach-compliance.js';
import { isCryptoTransaction, isCardTransaction, isAchTransaction } from './types.js';
import { ScreeningAggregator } from './integrations/screening-aggregator.js';
import type { AggregatedScreeningResult } from './integrations/screening-aggregator.js';
import { PlanManager } from './plans.js';
import { requirePlan } from './plan-gate.js';
import type { EventExporter } from './exporters.js';
import { NoopExporter } from './exporters.js';
import { FeatureFlagManager } from './feature-flags.js';
import { generateId, now, parseAmount } from './utils.js';
import { loadConfigFile } from './config-loader.js';
import { WalletMonitor } from './integrations/wallet-monitor.js';
import { AchMonitor } from './integrations/ach-monitor.js';
import { ProvenanceManager } from './provenance.js';
import {
  AgentIdentityRegistry,
  WalletClusterer,
  BehavioralFingerprinter,
  CrossSessionLinker,
  KYAConfidenceScorer,
} from './kya/index.js';
import { ReserveReconciler } from './integrations/reserve-reconciliation.js';
import type { ReserveSnapshotInput, ReserveSnapshot } from './integrations/reserve-reconciliation.js';
import { CircleWalletManager } from './integrations/circle-wallets.js';
import { CoinbaseWalletManager } from './integrations/coinbase-wallets.js';
import { MetaMaskWalletManager } from './integrations/metamask-wallets.js';
import type {
  AgentIdentity,
  RegisterIdentityInput,
  UpdateIdentityInput,
  WalletCluster,
  BehavioralEmbedding,
  AgentLink,
  KYAConfidenceScore,
  KYAEnvelope,
} from './kya/index.js';

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
  private readonly screeningAggregator: ScreeningAggregator | null;
  private walletMonitor: WalletMonitor | null = null;
  private achMonitor: AchMonitor | null = null;
  private provenanceManager: ProvenanceManager | null = null;
  private identityRegistry: AgentIdentityRegistry | null = null;
  private walletClusterer: WalletClusterer | null = null;
  private behavioralFingerprinter: BehavioralFingerprinter | null = null;
  private crossSessionLinker: CrossSessionLinker | null = null;
  private confidenceScorer: KYAConfidenceScorer | null = null;
  private circleWalletManager: CircleWalletManager | null = null;
  private coinbaseWalletManager: CoinbaseWalletManager | null = null;
  private metamaskWalletManager: MetaMaskWalletManager | null = null;

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

    // Initialize screening aggregator if configured (free — no plan gating)
    this.screeningAggregator = config.screening
      ? new ScreeningAggregator({
          providers: config.screening.providers,
          consensus: config.screening.consensus,
          blocklist: config.screening.blocklist,
          allowlist: config.screening.allowlist,
          providerTimeoutMs: config.screening.providerTimeoutMs,
          onEvent: () => this.planManager.recordEvent(),
        })
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

    // Start wallet monitoring if configured (requires viem peer dep)
    if (config.walletMonitoring && config.walletMonitoring.wallets.length > 0) {
      const tokens = config.policy?.allowedTokens;
      this.walletMonitor = new WalletMonitor(
        this,
        config.walletMonitoring,
        { agentId: config.agentId, tokens: tokens ?? undefined },
      );
      // Start asynchronously — don't block init
      this.walletMonitor.start().catch((err) => {
        if (config.debug) {
          console.debug(`[Kontext] Wallet monitor failed to start: ${err}`);
        }
      });
    }

    // Start ACH monitoring if configured
    if (config.achMonitoring) {
      const { PlaidAchAdapter, MoovAchAdapter, StripeTreasuryAchAdapter, ModernTreasuryAchAdapter, ColumnAchAdapter } = require('./integrations/ach-adapters/index.js');
      const adapterMap: Record<string, new () => import('./integrations/ach-adapters/types.js').AchProviderAdapter> = {
        plaid: PlaidAchAdapter,
        moov: MoovAchAdapter,
        stripe_treasury: StripeTreasuryAchAdapter,
        modern_treasury: ModernTreasuryAchAdapter,
        column: ColumnAchAdapter,
      };
      const AdapterClass = adapterMap[config.achMonitoring.provider];
      if (AdapterClass) {
        const adapter = new AdapterClass();
        this.achMonitor = new AchMonitor(
          this,
          config.achMonitoring,
          adapter,
          { agentId: config.agentId },
        );
      }
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
  static init(config?: KontextConfig): Kontext {
    // Zero-arg: load from kontext.config.json
    if (!config) {
      const fileConfig = loadConfigFile();
      if (!fileConfig) {
        throw new KontextError(
          KontextErrorCode.INITIALIZATION_ERROR,
          'No config provided and no kontext.config.json found. Run `npx kontext init` to create one, or pass config to Kontext.init().',
        );
      }
      const mapped: KontextConfig = {
        projectId: fileConfig.projectId,
        environment: fileConfig.environment ?? 'production',
        apiKey: fileConfig.apiKey,
        agentId: fileConfig.agentId,
        interceptorMode: fileConfig.mode,
        walletProvider: fileConfig.walletProvider,
        policy: {
          allowedTokens: fileConfig.tokens,
          corridors: fileConfig.corridors?.from
            ? { blocked: fileConfig.corridors.to ? [{ from: fileConfig.corridors.from, to: fileConfig.corridors.to }] : undefined }
            : undefined,
          thresholds: fileConfig.thresholds
            ? { edd: fileConfig.thresholds.alertAmount ? Number(fileConfig.thresholds.alertAmount) : undefined }
            : undefined,
        },
        walletMonitoring: fileConfig.wallets && fileConfig.wallets.length > 0 && fileConfig.rpcEndpoints
          ? { wallets: fileConfig.wallets, rpcEndpoints: fileConfig.rpcEndpoints }
          : undefined,
      };
      return Kontext.init(mapped);
    }

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

  /**
   * Map aggregated screening results into UsdcComplianceCheck format.
   * Produces the same check/riskLevel/recommendations shape as
   * UsdcCompliance.checkTransaction() and PaymentCompliance.checkPayment().
   */
  private buildComplianceFromScreening(
    input: VerifyInput,
    fromResult: AggregatedScreeningResult,
    toResult: AggregatedScreeningResult,
  ): UsdcComplianceCheck {
    const checks: ComplianceCheckResult[] = [];

    // Sanctions check: sender
    const fromHit = fromResult.hit;
    const fromProviders = fromResult.providerResults
      .filter((r) => r.hit)
      .map((r) => r.providerId)
      .join(', ');
    checks.push({
      name: 'sanctions_sender',
      passed: !fromHit,
      description: fromHit
        ? `Sender flagged by: ${fromProviders}`
        : `Sender cleared (${fromResult.totalProviders} provider${fromResult.totalProviders !== 1 ? 's' : ''} checked)`,
      severity: fromHit ? 'critical' : 'low',
    });

    // Sanctions check: recipient
    const toHit = toResult.hit;
    const toProviders = toResult.providerResults
      .filter((r) => r.hit)
      .map((r) => r.providerId)
      .join(', ');
    checks.push({
      name: 'sanctions_recipient',
      passed: !toHit,
      description: toHit
        ? `Recipient flagged by: ${toProviders}`
        : `Recipient cleared (${toResult.totalProviders} provider${toResult.totalProviders !== 1 ? 's' : ''} checked)`,
      severity: toHit ? 'critical' : 'low',
    });

    // Jurisdiction coverage warning
    const allUncovered = [
      ...new Set([...fromResult.uncoveredLists, ...toResult.uncoveredLists]),
    ];
    if (allUncovered.length > 0) {
      checks.push({
        name: 'jurisdiction_coverage',
        passed: false,
        description: `Required lists not covered: ${allUncovered.join(', ')}`,
        severity: 'medium',
      });
    }

    // Threshold checks (EDD, CTR, large transaction)
    const thresholds = this.config.policy?.thresholds;
    const eddThreshold = thresholds?.edd ?? 3000;
    const reportingThreshold = thresholds?.reporting ?? 10000;
    const largeThreshold = thresholds?.largeTransaction ?? 50000;
    const amount = parseAmount(input.amount);

    if (amount >= eddThreshold) {
      checks.push({
        name: 'enhanced_due_diligence',
        passed: false,
        description: `Amount $${amount.toLocaleString()} meets EDD threshold ($${eddThreshold.toLocaleString()})`,
        severity: 'low',
      });
    }

    if (amount >= reportingThreshold) {
      checks.push({
        name: 'reporting_threshold',
        passed: false,
        description: `Amount $${amount.toLocaleString()} meets CTR threshold ($${reportingThreshold.toLocaleString()})`,
        severity: 'low',
      });
    }

    if (amount >= largeThreshold) {
      checks.push({
        name: 'large_transaction',
        passed: false,
        description: `Large transaction: $${amount.toLocaleString()} exceeds $${largeThreshold.toLocaleString()}`,
        severity: 'medium',
      });
    }

    // Provider errors
    const allErrors = [...fromResult.errors, ...toResult.errors];
    if (allErrors.length > 0) {
      checks.push({
        name: 'screening_errors',
        passed: false,
        description: `Provider errors: ${allErrors.map((e) => `${e.providerId}: ${e.error}`).join('; ')}`,
        severity: 'medium',
      });
    }

    // Compute overall result
    const failedChecks = checks.filter((c) => !c.passed);
    const compliant = failedChecks.every((c) => c.severity === 'low');

    const severityOrder: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const highestSeverity = failedChecks.reduce<'low' | 'medium' | 'high' | 'critical'>(
      (max, c) => (severityOrder.indexOf(c.severity) > severityOrder.indexOf(max) ? c.severity : max),
      'low',
    );

    // Recommendations
    const recommendations: string[] = [];
    if (fromHit || toHit) {
      recommendations.push('Block transaction: sanctions match detected');
    }
    if (allUncovered.length > 0) {
      recommendations.push(`Add providers covering: ${allUncovered.join(', ')}`);
    }
    if (amount >= eddThreshold && amount < reportingThreshold) {
      recommendations.push('Collect enhanced due diligence information');
    }
    if (amount >= reportingThreshold) {
      recommendations.push('File Currency Transaction Report (CTR)');
    }

    return {
      compliant,
      checks,
      riskLevel: highestSeverity,
      recommendations,
    };
  }

  /** Lazy-init ProvenanceManager on first use. */
  private getProvenanceManager(): ProvenanceManager {
    if (!this.provenanceManager) {
      this.provenanceManager = new ProvenanceManager(this.store, this.logger);
    }
    return this.provenanceManager;
  }

  /** Lazy-init AgentIdentityRegistry on first use. */
  private getIdentityRegistry(): AgentIdentityRegistry {
    if (!this.identityRegistry) {
      this.identityRegistry = new AgentIdentityRegistry();
    }
    return this.identityRegistry;
  }

  /** Lazy-init WalletClusterer on first use. */
  private getWalletClusterer(): WalletClusterer {
    if (!this.walletClusterer) {
      this.walletClusterer = new WalletClusterer();
    }
    return this.walletClusterer;
  }

  /** Lazy-init BehavioralFingerprinter on first use. */
  private getBehavioralFingerprinter(): BehavioralFingerprinter {
    if (!this.behavioralFingerprinter) {
      this.behavioralFingerprinter = new BehavioralFingerprinter();
    }
    return this.behavioralFingerprinter;
  }

  /** Lazy-init CrossSessionLinker on first use. */
  private getCrossSessionLinker(): CrossSessionLinker {
    if (!this.crossSessionLinker) {
      this.crossSessionLinker = new CrossSessionLinker();
    }
    return this.crossSessionLinker;
  }

  /** Lazy-init KYAConfidenceScorer on first use. */
  private getConfidenceScorer(): KYAConfidenceScorer {
    if (!this.confidenceScorer) {
      this.confidenceScorer = new KYAConfidenceScorer();
    }
    return this.confidenceScorer;
  }

  /** Lazy-init CircleWalletManager from config.walletProvider */
  private getCircleManager(): CircleWalletManager {
    if (!this.circleWalletManager) {
      const wp = this.config.walletProvider;
      if (!wp || wp.type !== 'circle') {
        throw new KontextError(
          KontextErrorCode.INITIALIZATION_ERROR,
          'Circle wallet provider not configured. Set walletProvider.type to "circle" in your config.',
        );
      }
      const apiKey = process.env[wp.apiKeyEnvVar] ?? '';
      const entitySecret = process.env[wp.entitySecretEnvVar] ?? '';
      this.circleWalletManager = new CircleWalletManager({
        apiKey,
        entitySecret,
        baseUrl: wp.circleEnvironment === 'sandbox' ? 'https://api.circle.com' : undefined,
      });
      this.circleWalletManager.setKontext(this);
    }
    return this.circleWalletManager;
  }

  /** Lazy-init CoinbaseWalletManager from config.walletProvider */
  private getCoinbaseManager(): CoinbaseWalletManager {
    if (!this.coinbaseWalletManager) {
      const wp = this.config.walletProvider;
      if (!wp || wp.type !== 'coinbase') {
        throw new KontextError(
          KontextErrorCode.INITIALIZATION_ERROR,
          'Coinbase wallet provider not configured. Set walletProvider.type to "coinbase" in your config.',
        );
      }
      const apiKeyId = process.env[wp.apiKeyIdEnvVar] ?? '';
      const apiKeySecret = process.env[wp.apiKeySecretEnvVar] ?? '';
      const walletSecret = process.env[wp.walletSecretEnvVar] ?? '';
      this.coinbaseWalletManager = new CoinbaseWalletManager({
        apiKeyId,
        apiKeySecret,
        walletSecret,
      });
      this.coinbaseWalletManager.setKontext(this);
    }
    return this.coinbaseWalletManager;
  }

  /** Lazy-init MetaMaskWalletManager from config.walletProvider */
  private getMetaMaskManager(): MetaMaskWalletManager {
    if (!this.metamaskWalletManager) {
      const wp = this.config.walletProvider;
      if (!wp || wp.type !== 'metamask') {
        throw new KontextError(
          KontextErrorCode.INITIALIZATION_ERROR,
          'MetaMask wallet provider not configured. Set walletProvider.type to "metamask" in your config.',
        );
      }
      const clientId = process.env[wp.clientIdEnvVar] ?? '';
      this.metamaskWalletManager = new MetaMaskWalletManager({
        clientId,
        authConnectionId: wp.authConnectionId,
        web3AuthNetwork: wp.web3AuthNetwork,
      });
      this.metamaskWalletManager.setKontext(this);
    }
    return this.metamaskWalletManager;
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
    if (input.chain && input.chain !== 'base' && input.chain !== 'arc') {
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
   * Log a reserve reconciliation snapshot. Queries on-chain totalSupply()
   * for a stablecoin, computes reconciliation status against caller-supplied
   * published reserves, and logs the snapshot into the digest chain.
   *
   * Read-only — never touches funds. Uses raw JSON-RPC (zero dependencies).
   *
   * @param input - Token, chain, RPC URL, and optional published reserves
   * @returns The computed ReserveSnapshot with on-chain supply and reconciliation status
   */
  async logReserveSnapshot(input: ReserveSnapshotInput): Promise<ReserveSnapshot> {
    // All 8 chains unlocked from day one — no plan gate for reserve snapshots

    if (input.metadata) this.validateMetadata(input.metadata);

    // Query on-chain supply
    const snapshot = await ReserveReconciler.querySupply(input);

    // Log into digest chain as ActionLog with type 'reserve_snapshot'
    const action = await this.logger.log({
      type: 'reserve_snapshot',
      description: `Reserve snapshot: ${input.token}/${input.chain} supply=${snapshot.onChainSupply} status=${snapshot.reconciliationStatus}`,
      agentId: input.agentId ?? 'system',
      metadata: {
        ...snapshot,
        ...(input.metadata ?? {}),
      },
    });

    // Plan metering
    this.planManager.recordEvent();

    // Export (fire-and-forget)
    this.exporter.export([action]).catch(() => {});

    // Tolerance alerting: fire anomaly on discrepancy
    if (snapshot.reconciliationStatus === 'discrepancy' && this.anomalyDetector.isEnabled()) {
      this.anomalyDetector.reportAnomaly({
        type: 'reserveDiscrepancy',
        severity: 'high',
        description: `Reserve discrepancy: ${snapshot.delta} delta for ${input.token} on ${input.chain}`,
        agentId: input.agentId ?? 'system',
        actionId: action.id,
        data: { ...snapshot },
      });
    }

    return snapshot;
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

    // 2. Run compliance checks
    let compliance: UsdcComplianceCheck;
    if (this.screeningAggregator) {
      // Unified path: ScreeningAggregator handles both crypto addresses and fiat entity names
      const fromResult = await this.screeningAggregator.screen(input.from, {
        chain: input.chain,
        token: input.token,
        currency: input.currency,
        amount: input.amount,
        agentId: input.agentId,
      });
      const toResult = await this.screeningAggregator.screen(input.to, {
        chain: input.chain,
        token: input.token,
        currency: input.currency,
        amount: input.amount,
        agentId: input.agentId,
      });
      compliance = this.buildComplianceFromScreening(input, fromResult, toResult);
    } else if (isCryptoTransaction(input)) {
      compliance = UsdcCompliance.checkTransaction(input);
    } else if (isCardTransaction(input)) {
      compliance = CardCompliance.checkPayment(input);
    } else if (isAchTransaction(input)) {
      compliance = AchCompliance.checkPayment(input);
    } else {
      compliance = PaymentCompliance.checkPayment(input);
    }

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

    // 6b. On-chain anchor (optional)
    let anchorProof: AnchorResult | undefined;
    if (input.anchor) {
      const { anchorDigest } = await import('./onchain.js');
      anchorProof = await anchorDigest(input.anchor, terminalDigest, this.config.projectId);
    }

    // 6c. A2A attestation exchange (optional)
    let counterpartyResult: CounterpartyAttestation | undefined;
    if (input.counterparty) {
      const { exchangeAttestation } = await import('./attestation.js');
      counterpartyResult = await exchangeAttestation(input.counterparty, {
        senderDigest: terminalDigest,
        senderAgentId: input.agentId,
        txHash: input.txHash,
        chain: input.chain,
        amount: input.amount,
        token: input.token,
        timestamp: new Date().toISOString(),
      });
    }

    // 6d. ERC-8021 builder attribution (optional)
    let attribution: ERC8021Attribution | undefined;
    if (input.erc8021 && input.txHash) {
      const { fetchTransactionAttribution } = await import('./integrations/erc8021.js');
      attribution = (await fetchTransactionAttribution(input.erc8021.rpcUrl, input.txHash)) ?? undefined;
    }

    // 6e. Reserve snapshot (optional)
    let reserveSnapshot: ReserveSnapshot | undefined;
    if (input.reserveSnapshot && input.token && input.chain) {
      // All 8 chains unlocked from day one — no plan gate for reserve snapshots
      reserveSnapshot = await ReserveReconciler.querySupply({
        token: input.token,
        chain: input.chain,
        rpcUrl: input.reserveSnapshot.rpcUrl,
        publishedReserves: input.reserveSnapshot.publishedReserves,
        tolerance: input.reserveSnapshot.tolerance,
        agentId: input.agentId,
      });
      await this.logger.log({
        type: 'reserve_snapshot',
        agentId: input.agentId,
        description: `Reserve snapshot: ${input.token}/${input.chain} supply=${reserveSnapshot.onChainSupply} status=${reserveSnapshot.reconciliationStatus}`,
        metadata: { ...reserveSnapshot },
      });
      if (reserveSnapshot.reconciliationStatus === 'discrepancy' && this.anomalyDetector.isEnabled()) {
        this.anomalyDetector.reportAnomaly({
          type: 'reserveDiscrepancy',
          severity: 'high',
          description: `Reserve discrepancy: ${reserveSnapshot.delta} delta for ${input.token} on ${input.chain}`,
          agentId: input.agentId,
          data: { ...reserveSnapshot },
        });
      }
    }

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
      ...(anchorProof ? { anchorProof } : {}),
      ...(counterpartyResult ? { counterparty: counterpartyResult } : {}),
      ...(attribution ? { attribution } : {}),
      ...(reserveSnapshot ? { reserveSnapshot } : {}),
      ...(!this.screeningAggregator ? { coverageWarning: 'Built-in screening covers ~3% of OFAC crypto addresses. Configure external providers for comprehensive coverage.' } : {}),
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

    // Build reserve reconciliation section if snapshots exist
    const reserveActions = agentActions.filter((a) => a.type === 'reserve_snapshot');
    let reserveReconciliation: ComplianceCertificate['reserveReconciliation'];
    if (reserveActions.length > 0) {
      const snapshots = reserveActions.map((a) => ({
        token: a.metadata['token'] as string as import('./types.js').Token,
        chain: a.metadata['chain'] as string as import('./types.js').Chain,
        onChainSupply: a.metadata['onChainSupply'] as string,
        publishedReserves: a.metadata['publishedReserves'] as string | undefined,
        delta: a.metadata['delta'] as string | undefined,
        reconciliationStatus: a.metadata['reconciliationStatus'] as string,
        snapshotBlockNumber: a.metadata['snapshotBlockNumber'] as number,
        timestamp: a.timestamp,
      }));
      const discrepancyCount = snapshots.filter((s) => s.reconciliationStatus === 'discrepancy').length;
      const latest = snapshots[snapshots.length - 1]!;
      reserveReconciliation = {
        snapshots,
        snapshotCount: snapshots.length,
        discrepancyCount,
        latestStatus: latest.reconciliationStatus,
      };
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
      ...(reserveReconciliation ? { reserveReconciliation } : {}),
    };

    // Compute SHA-256 hash of the certificate content for integrity verification
    const hash = createHash('sha256');
    hash.update(JSON.stringify(certificateContent));
    const contentHash = hash.digest('hex');

    return { ...certificateContent, contentHash };
  }

  // --------------------------------------------------------------------------
  // Agent Provenance
  // --------------------------------------------------------------------------

  /**
   * Create a delegated agent session. Records the delegation in the
   * tamper-evident digest chain as the session's genesis event.
   */
  async createAgentSession(input: CreateSessionInput): Promise<AgentSession> {
    return this.getProvenanceManager().createSession(input);
  }

  /**
   * Get an agent session by ID. Automatically marks expired sessions.
   */
  getAgentSession(sessionId: string): AgentSession | undefined {
    return this.getProvenanceManager().getSession(sessionId);
  }

  /**
   * Get all agent sessions.
   */
  getAgentSessions(): AgentSession[] {
    return this.getProvenanceManager().getSessions();
  }

  /**
   * End an active agent session. Records the termination in the digest chain.
   */
  async endAgentSession(sessionId: string): Promise<AgentSession> {
    return this.getProvenanceManager().endSession(sessionId);
  }

  /**
   * Check whether an action is within a session's delegated scope.
   */
  validateSessionScope(sessionId: string, action: string): boolean {
    return this.getProvenanceManager().validateScope(sessionId, action);
  }

  /**
   * Get all actions bound to a session (via sessionId on log/verify calls).
   */
  getSessionActions(sessionId: string): ActionLog[] {
    return this.store.getActionsBySession(sessionId);
  }

  /**
   * Create a provenance checkpoint -- a review point where a human
   * can attest to a batch of agent actions.
   */
  async createCheckpoint(input: CreateCheckpointInput): Promise<ProvenanceCheckpoint> {
    return this.getProvenanceManager().createCheckpoint(input);
  }

  /**
   * Attach an externally-produced human attestation to a checkpoint.
   * The attestation includes a cryptographic signature that the agent
   * never touches -- key separation is the critical security property.
   */
  async attachAttestation(checkpointId: string, attestation: HumanAttestation): Promise<ProvenanceCheckpoint> {
    return this.getProvenanceManager().attachAttestation(checkpointId, attestation);
  }

  /**
   * Get a checkpoint by ID.
   */
  getCheckpoint(checkpointId: string): ProvenanceCheckpoint | undefined {
    return this.getProvenanceManager().getCheckpoint(checkpointId);
  }

  /**
   * Get all checkpoints, optionally filtered by session.
   */
  getCheckpoints(sessionId?: string): ProvenanceCheckpoint[] {
    return this.getProvenanceManager().getCheckpoints(sessionId);
  }

  /**
   * Export the full provenance bundle for a session: session record,
   * all bound actions, all checkpoints, and verification stats.
   */
  getProvenanceBundle(sessionId: string): ProvenanceBundle {
    return this.getProvenanceManager().getProvenanceBundle(sessionId);
  }

  // --------------------------------------------------------------------------
  // Agent Forensics (KYA)
  // --------------------------------------------------------------------------

  /**
   * Register a new agent identity with optional wallet mappings.
   * Requires Pro plan.
   */
  registerAgentIdentity(input: RegisterIdentityInput): AgentIdentity {
    requirePlan('kya-identity', this.planManager.getTier());
    return this.getIdentityRegistry().register(input);
  }

  /**
   * Get a registered agent identity by ID.
   * Requires Pro plan.
   */
  getAgentIdentity(agentId: string): AgentIdentity | undefined {
    requirePlan('kya-identity', this.planManager.getTier());
    return this.getIdentityRegistry().get(agentId);
  }

  /**
   * Update an existing agent identity.
   * Requires Pro plan.
   */
  updateAgentIdentity(agentId: string, input: UpdateIdentityInput): AgentIdentity {
    requirePlan('kya-identity', this.planManager.getTier());
    return this.getIdentityRegistry().update(agentId, input);
  }

  /**
   * Remove an agent identity.
   * Requires Pro plan.
   */
  removeAgentIdentity(agentId: string): boolean {
    requirePlan('kya-identity', this.planManager.getTier());
    return this.getIdentityRegistry().remove(agentId);
  }

  /**
   * Add a wallet to an existing agent identity.
   * Requires Pro plan.
   */
  addAgentWallet(agentId: string, wallet: { address: string; chain: string; label?: string; isPrimary?: boolean }): AgentIdentity {
    requirePlan('kya-identity', this.planManager.getTier());
    return this.getIdentityRegistry().addWallet(agentId, wallet);
  }

  /**
   * Look up which agent owns a wallet address.
   * Requires Pro plan.
   */
  lookupAgentByWallet(address: string): AgentIdentity | undefined {
    requirePlan('kya-identity', this.planManager.getTier());
    return this.getIdentityRegistry().lookupByWallet(address);
  }

  /**
   * Compute wallet clusters from transaction patterns and declared identities.
   * Requires Pro plan.
   */
  getWalletClusters(): WalletCluster[] {
    requirePlan('kya-identity', this.planManager.getTier());
    const clusterer = this.getWalletClusterer();
    clusterer.analyzeFromStore(this.store, this.getIdentityRegistry());
    return clusterer.getClusters();
  }

  /**
   * Export all KYA data as a single envelope.
   * Requires Pro plan.
   */
  getKYAExport(): KYAEnvelope {
    requirePlan('kya-identity', this.planManager.getTier());
    const registry = this.getIdentityRegistry();
    const clusterer = this.getWalletClusterer();
    clusterer.analyzeFromStore(this.store, registry);
    return {
      identities: registry.getAll(),
      clusters: clusterer.getClusters(),
      embeddings: [],
      links: [],
      scores: [],
      generatedAt: now(),
    };
  }

  /**
   * Compute a behavioral embedding for an agent from transaction history.
   * Returns null if insufficient data. Requires Enterprise plan.
   */
  computeBehavioralEmbedding(agentId: string): BehavioralEmbedding | null {
    requirePlan('kya-behavioral', this.planManager.getTier());
    return this.getBehavioralFingerprinter().computeEmbedding(agentId, this.store);
  }

  /**
   * Analyze all agents and create cross-session links.
   * Requires Enterprise plan.
   */
  analyzeAgentLinks(): AgentLink[] {
    requirePlan('kya-behavioral', this.planManager.getTier());
    const clusterer = this.getWalletClusterer();
    clusterer.analyzeFromStore(this.store, this.getIdentityRegistry());
    return this.getCrossSessionLinker().analyzeAndLink(
      this.store,
      this.getIdentityRegistry(),
      clusterer,
      this.getBehavioralFingerprinter(),
    );
  }

  /**
   * Get agents linked to a specific agent.
   * Requires Enterprise plan.
   */
  getLinkedAgents(agentId: string): string[] {
    requirePlan('kya-behavioral', this.planManager.getTier());
    return this.getCrossSessionLinker().getLinkedAgents(agentId);
  }

  /**
   * Compute a composite identity confidence score for an agent.
   * Requires Enterprise plan.
   */
  getKYAConfidenceScore(agentId: string): KYAConfidenceScore {
    requirePlan('kya-behavioral', this.planManager.getTier());
    const clusterer = this.getWalletClusterer();
    clusterer.analyzeFromStore(this.store, this.getIdentityRegistry());
    return this.getConfidenceScorer().computeScore(
      agentId,
      this.getIdentityRegistry(),
      clusterer,
      this.getBehavioralFingerprinter(),
      this.getCrossSessionLinker(),
      this.store,
    );
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
  // Circle Programmable Wallets (Enterprise)
  // --------------------------------------------------------------------------

  /** Create a Circle wallet set. Enterprise plan required. */
  async createCircleWalletSet(input: CreateWalletSetInput): Promise<CircleWalletSet> {
    requirePlan('circle-wallets', this.planManager.getTier());
    return this.getCircleManager().createWalletSet(input);
  }

  /** Create Circle wallet(s) in a wallet set. Enterprise plan required. */
  async createCircleWallet(input: CreateWalletInput): Promise<CircleWallet[]> {
    requirePlan('circle-wallets', this.planManager.getTier());
    return this.getCircleManager().createWallet(input);
  }

  /** Transfer via Circle with auto-compliance. Enterprise plan required. */
  async circleTransferWithCompliance(input: CircleTransferInput): Promise<CircleTransferResult> {
    requirePlan('circle-wallets', this.planManager.getTier());
    return this.getCircleManager().transferWithCompliance(input);
  }

  // --------------------------------------------------------------------------
  // Coinbase Developer Platform Wallets (Enterprise)
  // --------------------------------------------------------------------------

  /** Create a Coinbase CDP account. Enterprise plan required. */
  async createCoinbaseAccount(opts?: { name?: string; network?: string }): Promise<CoinbaseAccount> {
    requirePlan('coinbase-wallets', this.planManager.getTier());
    return this.getCoinbaseManager().createAccount(opts);
  }

  /** List Coinbase CDP accounts. Enterprise plan required. */
  async listCoinbaseAccounts(): Promise<CoinbaseAccount[]> {
    requirePlan('coinbase-wallets', this.planManager.getTier());
    return this.getCoinbaseManager().listAccounts();
  }

  /** Transfer via Coinbase CDP with auto-compliance. Enterprise plan required. */
  async coinbaseTransferWithCompliance(input: CoinbaseTransferInput): Promise<CoinbaseTransferResult> {
    requirePlan('coinbase-wallets', this.planManager.getTier());
    return this.getCoinbaseManager().transferWithCompliance(input);
  }

  // --------------------------------------------------------------------------
  // MetaMask Embedded Wallets (Enterprise)
  // --------------------------------------------------------------------------

  /** Connect to MetaMask Embedded Wallet for a user. Enterprise plan required. */
  async metamaskConnect(idToken: string): Promise<MetaMaskAccount> {
    requirePlan('metamask-wallets', this.planManager.getTier());
    return this.getMetaMaskManager().connect(idToken);
  }

  /** Transfer via MetaMask with auto-compliance. Enterprise plan required. */
  async metamaskTransferWithCompliance(input: MetaMaskTransferInput): Promise<MetaMaskTransferResult> {
    requirePlan('metamask-wallets', this.planManager.getTier());
    return this.getMetaMaskManager().transferWithCompliance(input);
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Get the wallet monitor instance (or null if not configured).
   * Used by the viem interceptor for dedup registration.
   */
  getWalletMonitor(): WalletMonitor | null {
    return this.walletMonitor;
  }

  /**
   * Get the ACH monitor instance (or null if not configured).
   * Use this to process ACH webhooks or start polling.
   */
  getAchMonitor(): AchMonitor | null {
    return this.achMonitor;
  }

  /**
   * Gracefully shut down the SDK, flushing any pending data and stopping watchers.
   */
  async destroy(): Promise<void> {
    if (this.walletMonitor) {
      this.walletMonitor.stop();
      this.walletMonitor = null;
    }
    if (this.achMonitor) {
      this.achMonitor.stop();
      this.achMonitor = null;
    }
    await this.logger.destroy();
    await this.exporter.shutdown();
  }
}
