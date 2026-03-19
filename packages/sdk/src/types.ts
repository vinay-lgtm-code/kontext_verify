// ============================================================================
// Kontext SDK - Core Type Definitions
// ============================================================================

/** Supported blockchain networks */
export type Chain = 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'optimism' | 'arc' | 'avalanche' | 'solana';

/** Supported stablecoin tokens */
export type Token = 'USDC' | 'USDT' | 'DAI' | 'EURC' | 'USDP' | 'USDG';

/** SDK operating mode */
export type KontextMode = 'local' | 'cloud';

/** Log level for the SDK logger */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Environment configuration */
export type Environment = 'development' | 'staging' | 'production';

/** Anomaly severity levels */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/** Task status lifecycle */
export type TaskStatus = 'pending' | 'in_progress' | 'confirmed' | 'failed' | 'expired';

/** Supported export formats */
export type ExportFormat = 'json' | 'csv';

/** Report types */
export type ReportType = 'compliance' | 'transaction' | 'anomaly';

/** Anomaly detection rule types */
export type AnomalyRuleType =
  | 'unusualAmount'
  | 'frequencySpike'
  | 'newDestination'
  | 'offHoursActivity'
  | 'rapidSuccession'
  | 'roundAmount'
  | 'reserveDiscrepancy';

// ============================================================================
// Configuration
// ============================================================================

/** SDK initialization configuration */
export interface KontextConfig {
  /** API key for cloud mode (optional for local/OSS mode) */
  apiKey?: string;
  /** Unique project identifier */
  projectId: string;
  /** Deployment environment */
  environment: Environment;
  /** Backend API URL. Falls back to KONTEXT_API_URL env var, then https://api.kontext.so */
  apiUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Batch size for log flushing */
  batchSize?: number;
  /** Batch flush interval in milliseconds */
  flushIntervalMs?: number;
  /** Local file output directory for OSS mode */
  localOutputDir?: string;
  /** Minimum log level for SDK output (default: 'warn', or 'debug' if debug=true) */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Pluggable storage adapter for persistence (default: in-memory) */
  storage?: import('./storage.js').StorageAdapter;

  /**
   * Anomaly detection rules to enable at init time.
   * When provided, anomaly detection is automatically enabled and every
   * verify() call includes anomaly results in its response.
   *
   * Free-tier rules: `unusualAmount`, `frequencySpike`
   * Pay as you go rules: `newDestination`, `offHoursActivity`, `rapidSuccession`, `roundAmount`
   */
  anomalyRules?: AnomalyRuleType[];

  /**
   * Thresholds for anomaly detection. Only used when `anomalyRules` is set.
   */
  anomalyThresholds?: AnomalyThresholds;

  /**
   * Pluggable event exporter for shipping events to external systems.
   * Follows the OpenTelemetry exporter pattern.
   *
   * Built-in exporters:
   * - `NoopExporter` (default) — discards events, current SDK behavior
   * - `ConsoleExporter` — prints events to stdout
   * - `JsonFileExporter` — writes JSONL files to disk
   *
   * @example
   * ```typescript
   * import { Kontext, ConsoleExporter } from '@kontext/sdk';
   *
   * const kontext = Kontext.init({
   *   projectId: 'my-app',
   *   environment: 'development',
   *   exporter: new ConsoleExporter(),
   * });
   * ```
   */
  exporter?: import('./exporters.js').EventExporter;

  /**
   * Optional metadata schema validator. When provided, all metadata passed to
   * `log()`, `logTransaction()`, and `createTask()` will be validated against
   * this schema before being recorded.
   *
   * Accepts any object with a `parse(data: unknown)` method (e.g., a Zod schema).
   * Throws on validation failure, passes through on success.
   *
   * @example
   * ```typescript
   * import { z } from 'zod';
   *
   * const kontext = Kontext.init({
   *   projectId: 'my-app',
   *   environment: 'production',
   *   metadataSchema: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
   * });
   * ```
   */
  metadataSchema?: MetadataValidator;

  /**
   * Pricing plan tier. Controls event metering limits.
   * - 'free': 20,000 events/month
   * - 'pro': 100,000 events/user/month (multiplied by seats)
   * - 'enterprise': Unlimited events
   * @default 'free'
   */
  plan?: 'free' | 'pro' | 'enterprise';

  /**
   * Number of seats (users) on the plan. Pro plan limits are multiplied
   * by the number of seats: 100K events/user/mo.
   * @default 1
   */
  seats?: number;

  /**
   * Custom URL for the Pro plan upgrade page.
   * @default 'https://kontext.so/upgrade'
   */
  upgradeUrl?: string;

  /**
   * Feature flag configuration. When provided, the SDK initializes a
   * `FeatureFlagManager` that fetches flags from Firestore REST API.
   */
  featureFlags?: FeatureFlagConfig;

  /**
   * User / tenant identifier for storage isolation.
   * Required when using FirestoreStorageAdapter. Logs for each userId
   * are stored under separate Firestore paths:
   * users/{userId}/projects/{projectId}/...
   *
   * Use a stable, opaque identifier: your auth system's user ID,
   * a Stripe customer ID, or a hash of the API key.
   */
  userId?: string;

  /**
   * When set, verify() auto-creates a pending task if the transaction
   * amount exceeds this threshold (string, to preserve decimal precision).
   * The task is returned in `result.task` and `result.requiresApproval`
   * is set to `true`. Your agent should wait for confirmTask() before
   * executing the transfer.
   *
   * Free tier feature — works with createTask() / confirmTask().
   *
   * @example
   * ```typescript
   * const ctx = Kontext.init({
   *   projectId: 'my-agent',
   *   environment: 'production',
   *   approvalThreshold: '3000', // auto-task above $3K
   * });
   * ```
   */
  approvalThreshold?: string;

  /**
   * Pluggable sanctions screening configuration. When provided, verify()
   * uses the ScreeningAggregator instead of the built-in UsdcCompliance /
   * PaymentCompliance code paths.
   *
   * Free tier — no plan gating. Each screen() call counts as 1 event.
   *
   * @example
   * ```typescript
   * import { Kontext, OFACAddressProvider, UKOFSIProvider } from 'kontext-sdk';
   *
   * const ctx = Kontext.init({
   *   projectId: 'my-app',
   *   environment: 'production',
   *   screening: {
   *     providers: [new OFACAddressProvider(), new UKOFSIProvider()],
   *     consensus: 'ANY_MATCH',
   *   },
   * });
   * ```
   */
  screening?: ScreeningConfig;

  /**
   * Compliance policy configuration. Customizes thresholds, allowed
   * tokens/currencies, and blocked corridors.
   *
   * All fields optional — defaults match current behavior ($3K EDD,
   * $10K CTR, $50K large transaction).
   */
  policy?: PolicyConfig;

  /**
   * Default agent ID for verify/log calls when not specified per-call.
   * Set automatically when loading from kontext.config.json.
   */
  agentId?: string;

  /**
   * Wallet monitoring configuration. When provided, SDK watches these
   * addresses on-chain for stablecoin transfers and auto-calls verify().
   * Requires viem as a peer dependency.
   */
  walletMonitoring?: WalletMonitoringConfig;

  /**
   * ACH monitoring configuration. When provided, SDK can process ACH webhooks
   * and optionally poll for ACH transfers via banking provider APIs.
   */
  achMonitoring?: AchMonitorConfig;

  /**
   * Viem interceptor mode for withKontextCompliance() (default: 'post-send').
   * - 'post-send': verify() runs after tx succeeds, never blocks
   * - 'pre-send': verify() runs before tx, throws if non-compliant
   * - 'both': pre-send screening + post-send full verify
   */
  interceptorMode?: 'post-send' | 'pre-send' | 'both';

  /**
   * Wallet provider configuration. When provided, SDK initializes the
   * corresponding wallet manager (Circle, Coinbase, or MetaMask) for
   * compliance-wrapped wallet operations.
   */
  walletProvider?: WalletProviderConfig;
}

/** Screening configuration for pluggable multi-provider sanctions screening */
export interface ScreeningConfig {
  /** Screening providers to use */
  providers: import('./integrations/screening-provider.js').ScreeningProvider[];
  /** How to combine results from multiple providers (default: 'ANY_MATCH') */
  consensus?: 'ANY_MATCH' | 'ALL_MATCH' | 'MAJORITY';
  /** Addresses or entity names to always block */
  blocklist?: string[];
  /** Addresses or entity names to always allow (overrides provider hits) */
  allowlist?: string[];
  /** Per-provider timeout in milliseconds (default: 5000) */
  providerTimeoutMs?: number;
}

/** Compliance policy configuration */
export interface PolicyConfig {
  /** Customizable compliance thresholds */
  thresholds?: {
    /** Enhanced Due Diligence threshold (default: 3000) */
    edd?: number;
    /** CTR reporting threshold (default: 10000) */
    reporting?: number;
    /** Large transaction threshold (default: 50000) */
    largeTransaction?: number;
  };
  /** Restrict to specific tokens */
  allowedTokens?: Token[];
  /** Restrict to specific currencies */
  allowedCurrencies?: string[];
  /** Blocked jurisdiction pairs */
  corridors?: {
    blocked?: Array<{ from: string; to: string }>;
  };
  /** When true, refuse verify() if no screening provider is configured (default: false) */
  requireScreening?: boolean;
}

/** Wallet monitoring configuration for on-chain event listening */
export interface WalletMonitoringConfig {
  /** Wallet addresses to watch for outgoing stablecoin transfers */
  wallets: string[];
  /** RPC endpoints per chain (required for on-chain listening) */
  rpcEndpoints: Partial<Record<Chain, string>>;
  /** Polling interval in ms for HTTP transports (default: 12000) */
  pollingIntervalMs?: number;
}

// ============================================================================
// ACH Monitoring
// ============================================================================

/** Supported ACH banking provider names */
export type AchProvider = 'plaid' | 'moov' | 'stripe_treasury' | 'modern_treasury' | 'column';

/** Normalized ACH transfer event (provider-agnostic) */
export interface AchTransferEvent {
  /** Provider-assigned transfer ID */
  transferId: string;
  /** Amount in decimal string */
  amount: string;
  /** Currency code (default: 'USD') */
  currency?: string;
  /** Direction */
  direction: 'credit' | 'debit';
  /** Transfer status */
  status: 'pending' | 'posted' | 'settled' | 'returned' | 'failed';
  /** Originator name */
  originatorName?: string;
  /** Originator company ID (EIN/DUNS) */
  originatorId?: string;
  /** ODFI routing number */
  odfiRoutingNumber?: string;
  /** RDFI routing number */
  rdfiRoutingNumber?: string;
  /** SEC code */
  secCode?: string;
  /** Entry description */
  entryDescription?: string;
  /** Trace number */
  traceNumber?: string;
  /** Same-day ACH flag */
  sameDay?: boolean;
  /** Counterparty name (sender for credits, receiver for debits) */
  counterpartyName?: string;
  /** Counterparty account identifier (masked or tokenized) */
  counterpartyAccount?: string;
  /** Provider name */
  provider: AchProvider;
  /** Raw provider payload (for audit trail) */
  raw?: Record<string, unknown>;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/** ACH monitoring configuration */
export interface AchMonitorConfig {
  /** Which provider to listen to */
  provider: AchProvider;
  /** Provider-specific configuration (API keys, webhook secrets, account IDs) */
  providerConfig: Record<string, string>;
  /** Polling interval in ms (for polling-based providers, default: 60000) */
  pollingIntervalMs?: number;
  /** Only monitor transfers above this amount */
  minimumAmount?: string;
  /** Auto-verify all incoming events (default: true) */
  autoVerify?: boolean;
}

// ============================================================================
// Wallet Provider Configuration
// ============================================================================

export type WalletProviderType = 'none' | 'circle' | 'coinbase' | 'metamask';

export type WalletProviderConfig =
  | WalletProviderNone
  | WalletProviderCircle
  | WalletProviderCoinbase
  | WalletProviderMetaMask;

export interface WalletProviderNone {
  type: 'none';
}

export interface WalletProviderCircle {
  type: 'circle';
  apiKeyEnvVar: string;
  entitySecretEnvVar: string;
  circleEnvironment: 'sandbox' | 'production';
  walletSetName?: string;
  secretsStorage: SecretsStorageConfig;
}

export interface WalletProviderCoinbase {
  type: 'coinbase';
  apiKeyIdEnvVar: string;
  apiKeySecretEnvVar: string;
  walletSecretEnvVar: string;
  cdpEnvironment: 'testnet' | 'mainnet';
  secretsStorage: SecretsStorageConfig;
}

export interface WalletProviderMetaMask {
  type: 'metamask';
  clientIdEnvVar: string;
  authConnectionId: string;
  web3AuthNetwork: 'sapphire_mainnet' | 'sapphire_devnet';
  secretsStorage: SecretsStorageConfig;
}

export type SecretsStorageConfig =
  | { type: 'dotenv'; path: string }
  | { type: 'file'; path: string }
  | { type: 'gcp-secret-manager'; project: string }
  | { type: 'aws-secrets-manager'; region: string }
  | { type: 'hashicorp-vault'; address: string };

// ============================================================================
// Circle Wallet Manager Types
// ============================================================================

export interface CircleWalletConfig {
  apiKey: string;
  entitySecret: string;
  baseUrl?: string;
}

export interface CreateWalletSetInput {
  name: string;
  idempotencyKey?: string;
}

export interface CircleWalletSet {
  id: string;
  name: string;
  custodyType: string;
  createDate: string;
  updateDate: string;
}

export interface CreateWalletInput {
  walletSetId: string;
  blockchains: Chain[];
  count?: number;
  accountType?: 'EOA' | 'SCA';
  idempotencyKey?: string;
}

export interface CircleWallet {
  id: string;
  state: string;
  address: string;
  blockchain: string;
  walletSetId: string;
  createDate: string;
}

export interface CircleTransferInput {
  walletId: string;
  tokenAddress: string;
  destinationAddress: string;
  amount: string;
  blockchain: Chain;
  agentId?: string;
  idempotencyKey?: string;
}

export interface CircleTransferResult {
  id: string;
  state: string;
  txHash?: string;
  complianceResult?: VerifyResult;
}

// ============================================================================
// Coinbase CDP Wallet Manager Types
// ============================================================================

export interface CoinbaseWalletConfig {
  apiKeyId: string;
  apiKeySecret: string;
  walletSecret: string;
}

export interface CoinbaseAccount {
  address: string;
  name?: string;
  network: string;
}

export interface CoinbaseTransferInput {
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: Token;
  network: string;
  agentId?: string;
}

export interface CoinbaseTransferResult {
  transactionHash: string;
  status: string;
  complianceResult?: VerifyResult;
}

// ============================================================================
// MetaMask Embedded Wallet Manager Types
// ============================================================================

export interface MetaMaskWalletConfig {
  clientId: string;
  authConnectionId: string;
  web3AuthNetwork: 'sapphire_mainnet' | 'sapphire_devnet';
}

export interface MetaMaskAccount {
  address: string;
  publicKey: string;
}

export interface MetaMaskTransferInput {
  toAddress: string;
  amount: string;
  token: Token;
  chain: Chain;
  agentId?: string;
  idToken: string;
}

export interface MetaMaskTransferResult {
  transactionHash: string;
  status: string;
  complianceResult?: VerifyResult;
}

/**
 * Interface for metadata validation. Compatible with Zod schemas and any
 * validator that implements a `parse` method.
 */
export interface MetadataValidator {
  /** Validate and return the metadata. Should throw on invalid data. */
  parse(data: unknown): Record<string, unknown>;
}

// ============================================================================
// Actions & Logging
// ============================================================================

/** Base action log entry */
export interface ActionLog {
  /** Unique action identifier */
  id: string;
  /** Timestamp of the action */
  timestamp: string;
  /** ID of the project */
  projectId: string;
  /** ID of the agent performing the action */
  agentId: string;
  /** Session ID grouping all steps in one agent run */
  sessionId?: string;
  /** Correlation ID for tracing related actions */
  correlationId: string;
  /** Type of action */
  type: string;
  /** Human-readable description */
  description: string;
  /** Arbitrary metadata */
  metadata: Record<string, unknown>;
  /** Rolling SHA-256 digest for tamper-evident audit trail */
  digest?: string;
  /** Prior digest in the chain */
  priorDigest?: string;
}

/** Input for logging a generic action */
export interface LogActionInput {
  /** Type of action (e.g., 'transfer', 'approval', 'query') */
  type: string;
  /** Human-readable description */
  description: string;
  /** ID of the agent performing the action */
  agentId: string;
  /** Optional session ID grouping all steps in a single agent run */
  sessionId?: string;
  /** Optional correlation ID (auto-generated if not provided) */
  correlationId?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Payment Instruments — Unified Token Model
// ============================================================================

/** Authorization scope defining what a payment instrument is allowed to do */
export interface InstrumentScope {
  /** Maximum per-transaction amount */
  maxTransactionAmount?: string;
  /** Periodic spend limit */
  spendLimit?: string;
  /** Period for the spend limit */
  spendLimitPeriod?: 'daily' | 'weekly' | 'monthly';
  /** Allowed currencies or tokens (e.g., ['USD'], ['USDC', 'EURC']) */
  allowedCurrencies?: string[];
  /** Allowed networks (chain IDs or card networks) */
  allowedNetworks?: string[];
  /** Blocked merchant category codes (ISO 18245) */
  blockedMerchantCategories?: string[];
  /** Allowed countries (ISO 3166-1 alpha-2) */
  allowedCountries?: string[];
  /** Instrument expiry (ISO 8601) */
  expiresAt?: string;
}

/** A payment instrument is any tokenized value holder an agent can spend from */
export interface PaymentInstrument {
  /** Token identifier: blockchain address, tokenized PAN, account token */
  instrumentId: string;
  /** What kind of instrument */
  instrumentType: 'blockchain_wallet' | 'virtual_card' | 'bank_account' | 'payment_token';
  /** Settlement network: blockchain name OR card network OR banking network */
  instrumentNetwork: string;
  /** Who issued/minted the token (free-form: 'circle', 'marqeta', 'ramp', 'lithic', etc.) */
  instrumentIssuer?: string;
  /** Authorization scope: what this instrument is allowed to do */
  instrumentScope?: InstrumentScope;
}

/** Input for logging a transaction (crypto or general payment) */
export interface LogTransactionInput {
  /** On-chain transaction hash (required for crypto, optional for general payments) */
  txHash?: string;
  /** Blockchain network (required for crypto, optional for general payments) */
  chain?: Chain;
  /** Transaction amount (string to preserve decimal precision) */
  amount: string;
  /** Token being transferred (required for crypto, optional for general payments) */
  token?: Token;
  /** Sender address or entity name */
  from: string;
  /** Recipient address or entity name */
  to: string;
  /** ID of the agent initiating the transaction */
  agentId: string;
  /** Optional session ID grouping all steps in a single agent run */
  sessionId?: string;
  /** Optional correlation ID */
  correlationId?: string;
  /** Additional transaction metadata */
  metadata?: Record<string, unknown>;
  /** Currency code for general payments (e.g., 'USD', 'EUR'). Inferred from token for crypto. */
  currency?: string;
  /** Payment method (e.g., 'wire', 'ach', 'card', 'crypto') */
  paymentMethod?: string;
  /** External payment reference (invoice ID, wire reference, etc.) */
  paymentReference?: string;

  /** The payment instrument used for this transaction (unified token model) */
  instrument?: PaymentInstrument;

  /** Card network: visa, mastercard, amex, discover */
  cardNetwork?: string;
  /** Last 4 digits of virtual card number */
  cardLast4?: string;
  /** Merchant Category Code (ISO 18245) */
  merchantCategoryCode?: string;
  /** Merchant name */
  merchantName?: string;
  /** Merchant country (ISO 3166-1 alpha-2) */
  merchantCountry?: string;
  /** 3D Secure verification status */
  threeDSecureStatus?: 'authenticated' | 'attempted' | 'failed' | 'not_enrolled' | 'none';
  /** Card issuing platform (e.g., 'ramp', 'crossmint', 'lithic', 'marqeta') */
  cardPlatform?: string;
  /** Spending limit on this virtual card (string for precision) */
  cardSpendLimit?: string;
  /** Authorization ID from card network */
  cardAuthorizationId?: string;

  // ACH-specific fields (NACHA Operating Rules)
  /** ACH Standard Entry Class code (e.g., 'PPD', 'CCD', 'WEB', 'TEL', 'IAT') */
  achSecCode?: string;
  /** Originator company name (NACHA: Company Name field, 16 chars) */
  achOriginatorName?: string;
  /** Originator company identification (NACHA: Company Identification, 10 chars — typically EIN or DUNS) */
  achOriginatorId?: string;
  /** Originating Depository Financial Institution routing number (9 digits) */
  achOdfiRoutingNumber?: string;
  /** Receiving Depository Financial Institution routing number (9 digits) */
  achRdfiRoutingNumber?: string;
  /** Company Entry Description (NACHA: 10-char field, e.g., 'PAYROLL', 'VENDOR PMT') */
  achEntryDescription?: string;
  /** ACH batch number for grouping entries */
  achBatchNumber?: string;
  /** ACH trace number (unique per entry, 15 digits) */
  achTraceNumber?: string;
  /** Whether this is a same-day ACH entry */
  achSameDay?: boolean;
  /** ACH transaction type */
  achTransactionType?: 'credit' | 'debit';
  /** Originator's prefunding account balance at time of batch submission (string for precision) */
  achPrefundingBalance?: string;
  /** Settlement date (ISO 8601) */
  achSettlementDate?: string;
}

/** Stored transaction record */
export interface TransactionRecord extends ActionLog {
  type: 'transaction';
  txHash?: string;
  chain?: Chain;
  amount: string;
  token?: Token;
  from: string;
  to: string;
  currency?: string;
  paymentMethod?: string;
  paymentReference?: string;
  instrument?: PaymentInstrument;
  cardNetwork?: string;
  cardLast4?: string;
  merchantCategoryCode?: string;
  merchantName?: string;
  merchantCountry?: string;
  threeDSecureStatus?: string;
  cardPlatform?: string;
  cardAuthorizationId?: string;
  achSecCode?: string;
  achOriginatorName?: string;
  achOriginatorId?: string;
  achOdfiRoutingNumber?: string;
  achRdfiRoutingNumber?: string;
  achEntryDescription?: string;
  achBatchNumber?: string;
  achTraceNumber?: string;
  achSameDay?: boolean;
  achTransactionType?: 'credit' | 'debit';
  achPrefundingBalance?: string;
  achSettlementDate?: string;
}

/** Check whether a transaction input has all crypto-specific fields */
export function isCryptoTransaction(input: LogTransactionInput): boolean {
  return !!input.txHash && !!input.chain && !!input.token;
}

/** Check whether a transaction input is a card payment */
export function isCardTransaction(input: LogTransactionInput): boolean {
  return input.paymentMethod === 'card'
    || input.instrument?.instrumentType === 'virtual_card'
    || !!input.cardNetwork
    || !!input.cardLast4;
}

/** Check whether a transaction input is a bank transfer */
export function isBankTransaction(input: LogTransactionInput): boolean {
  return input.paymentMethod === 'bank'
    || input.paymentMethod === 'ach'
    || input.instrument?.instrumentType === 'bank_account';
}

/** Check whether a transaction input is an ACH payment */
export function isAchTransaction(input: LogTransactionInput): boolean {
  return input.paymentMethod === 'ach'
    || !!input.achSecCode
    || !!input.achOriginatorId
    || !!input.achOdfiRoutingNumber;
}

// ============================================================================
// Tasks
// ============================================================================

/** Input for creating a new tracked task */
export interface CreateTaskInput {
  /** Human-readable task description */
  description: string;
  /** ID of the agent responsible for the task */
  agentId: string;
  /** List of evidence types required for confirmation */
  requiredEvidence: string[];
  /** Optional correlation ID */
  correlationId?: string;
  /** Task expiration time in milliseconds from creation */
  expiresInMs?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Evidence provided for task confirmation */
export interface TaskEvidence {
  /** On-chain transaction hash */
  txHash?: string;
  /** Transaction receipt data */
  receipt?: Record<string, unknown>;
  /** Proof data (e.g., Merkle proof, signature) */
  proof?: string;
  /** Any additional evidence fields */
  [key: string]: unknown;
}

/** Input for confirming a task */
export interface ConfirmTaskInput {
  /** ID of the task to confirm */
  taskId: string;
  /** Evidence supporting task completion */
  evidence: TaskEvidence;
}

/** Complete task record */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Project ID */
  projectId: string;
  /** Task description */
  description: string;
  /** Responsible agent ID */
  agentId: string;
  /** Current task status */
  status: TaskStatus;
  /** Required evidence types */
  requiredEvidence: string[];
  /** Provided evidence (if any) */
  providedEvidence: TaskEvidence | null;
  /** Correlation ID */
  correlationId: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Confirmation timestamp */
  confirmedAt: string | null;
  /** Expiration timestamp */
  expiresAt: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Audit & Export
// ============================================================================

/** Date range filter */
export interface DateRange {
  /** Start date (inclusive) */
  start: Date;
  /** End date (inclusive) */
  end: Date;
}

/** Export configuration */
export interface ExportOptions {
  /** Output format */
  format: ExportFormat;
  /** Date range filter */
  dateRange?: DateRange;
  /** Filter by agent IDs */
  agentIds?: string[];
  /** Filter by action types */
  types?: string[];
  /** Filter by chains */
  chains?: Chain[];
  /** Include task data */
  includeTasks?: boolean;
  /** Include anomaly data */
  includeAnomalies?: boolean;
}

/** Report generation options */
export interface ReportOptions {
  /** Type of report */
  type: ReportType;
  /** Reporting period */
  period: DateRange;
  /** Filter by agent IDs */
  agentIds?: string[];
}

/** Generated compliance report */
export interface ComplianceReport {
  /** Report ID */
  id: string;
  /** Report type */
  type: ReportType;
  /** Generation timestamp */
  generatedAt: string;
  /** Reporting period */
  period: DateRange;
  /** Project ID */
  projectId: string;
  /** Summary statistics */
  summary: {
    totalActions: number;
    totalTransactions: number;
    totalTasks: number;
    confirmedTasks: number;
    failedTasks: number;
    totalAnomalies: number;
    averageTrustScore: number;
  };
  /** Action logs in the period */
  actions: ActionLog[];
  /** Transaction records in the period */
  transactions: TransactionRecord[];
  /** Tasks in the period */
  tasks: Task[];
  /** Anomalies detected in the period */
  anomalies: AnomalyEvent[];
}

/** Exported audit data */
export interface ExportResult {
  /** Export format */
  format: ExportFormat;
  /** Export timestamp */
  exportedAt: string;
  /** Number of records */
  recordCount: number;
  /** The data (JSON string or CSV string) */
  data: string;
  /** Terminal digest of the chain at time of export */
  terminalDigest?: string;
}

// ============================================================================
// Anomaly Detection
// ============================================================================

/** Detected anomaly event */
export interface AnomalyEvent {
  /** Unique anomaly ID */
  id: string;
  /** Anomaly type/rule that triggered */
  type: AnomalyRuleType;
  /** Severity level */
  severity: AnomalySeverity;
  /** Human-readable description */
  description: string;
  /** ID of the agent involved */
  agentId: string;
  /** Related action log ID */
  actionId: string;
  /** Detection timestamp */
  detectedAt: string;
  /** Related data */
  data: Record<string, unknown>;
  /** Whether the anomaly has been reviewed */
  reviewed: boolean;
}

/** Anomaly detection configuration */
export interface AnomalyDetectionConfig {
  /** Detection rules to enable */
  rules: AnomalyRuleType[];
  /** Thresholds for detection */
  thresholds?: AnomalyThresholds;
}

/** Configurable anomaly thresholds */
export interface AnomalyThresholds {
  /** Maximum transaction amount before flagging */
  maxAmount?: string;
  /** Maximum transactions per hour */
  maxFrequency?: number;
  /** Hours considered "off-hours" (24h format, e.g., [22, 23, 0, 1, 2, 3, 4, 5]) */
  offHours?: number[];
  /** Minimum seconds between transactions before "rapid succession" flag */
  minIntervalSeconds?: number;
}

/** Anomaly event callback */
export type AnomalyCallback = (anomaly: AnomalyEvent) => void;

// ============================================================================
// Trust Scoring
// ============================================================================

/** Trust score result for an agent */
export interface TrustScore {
  /** Agent ID */
  agentId: string;
  /** Overall trust score (0-100) */
  score: number;
  /** Score breakdown by factor */
  factors: TrustFactor[];
  /** Timestamp of computation */
  computedAt: string;
  /** Trust level label */
  level: 'untrusted' | 'low' | 'medium' | 'high' | 'verified';
}

/** Individual trust factor */
export interface TrustFactor {
  /** Factor name */
  name: string;
  /** Factor score (0-100) */
  score: number;
  /** Factor weight (0-1) */
  weight: number;
  /** Human-readable description */
  description: string;
}

/** Transaction evaluation result */
export interface TransactionEvaluation {
  /** Transaction hash (present for crypto transactions) */
  txHash?: string;
  /** Risk score (0-100, higher = more risky) */
  riskScore: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Individual risk factors */
  factors: RiskFactor[];
  /** Whether the transaction should be flagged */
  flagged: boolean;
  /** Recommended action */
  recommendation: 'approve' | 'review' | 'block';
  /** Evaluation timestamp */
  evaluatedAt: string;
}

/** Individual risk factor */
export interface RiskFactor {
  /** Factor name */
  name: string;
  /** Risk score contribution (0-100) */
  score: number;
  /** Human-readable description */
  description: string;
}

// ============================================================================
// Compliance Certificates
// ============================================================================

/** Input for generating a compliance certificate */
export interface GenerateComplianceCertificateInput {
  /** ID of the agent to generate the certificate for */
  agentId: string;
  /** Optional time window */
  timeRange?: { from: Date; to: Date };
  /** Whether to include reasoning entries */
  includeReasoning?: boolean;
}

/** Compliance certificate summarizing agent actions and verifying the digest chain */
export interface ComplianceCertificate {
  /** Unique certificate ID */
  certificateId: string;
  /** Agent ID */
  agentId: string;
  /** ISO timestamp of when the certificate was issued */
  issuedAt: string;
  /** Summary of counts */
  summary: {
    actions: number;
    transactions: number;
    toolCalls: number;
    reasoningEntries: number;
  };
  /** Digest chain verification status */
  digestChain: {
    terminalDigest: string;
    chainLength: number;
    verified: boolean;
  };
  /** Agent's current trust score */
  trustScore: number;
  /** Overall compliance status */
  complianceStatus: 'compliant' | 'non-compliant' | 'review-required';
  /** Summary list of action types and counts */
  actions: Array<{ type: string; count: number }>;
  /** Reasoning entries (if includeReasoning is true) */
  reasoning: ReasoningEntry[];
  /** Reserve reconciliation history (present when reserve snapshots exist for this agent) */
  reserveReconciliation?: {
    snapshots: Array<{
      token: Token;
      chain: Chain;
      onChainSupply: string;
      publishedReserves?: string;
      delta?: string;
      reconciliationStatus: string;
      snapshotBlockNumber: number;
      timestamp: string;
    }>;
    snapshotCount: number;
    discrepancyCount: number;
    latestStatus: string;
  };
  /** SHA-256 hash of the certificate content for integrity verification */
  contentHash: string;
}

// ============================================================================
// USDC Integration
// ============================================================================

/** USDC compliance check result */
export interface UsdcComplianceCheck {
  /** Whether the transaction is compliant */
  compliant: boolean;
  /** List of compliance checks performed */
  checks: ComplianceCheckResult[];
  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommendations */
  recommendations: string[];
}

/** Individual compliance check result */
export interface ComplianceCheckResult {
  /** Check name */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Human-readable description */
  description: string;
  /** Severity if failed */
  severity: AnomalySeverity;
}

// ============================================================================
// Feature Flags
// ============================================================================

/** Scope of a feature flag */
export type FlagScope = 'sdk' | 'server' | 'website' | 'all';

/** Plan-based targeting for a single environment */
export interface FlagPlanTargeting {
  free: boolean;
  pro: boolean;
  enterprise: boolean;
}

/** Targeting configuration across all environments */
export interface FlagTargeting {
  development: FlagPlanTargeting;
  staging: FlagPlanTargeting;
  production: FlagPlanTargeting;
}

/** A feature flag document stored in Firestore */
export interface FeatureFlag {
  name: string;
  description: string;
  scope: FlagScope;
  targeting: FlagTargeting;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Configuration for the FeatureFlagManager */
export interface FeatureFlagConfig {
  /** GCP project ID containing the Firestore database */
  gcpProjectId: string;
  /** Access token for Firestore REST API (optional — server uses metadata server) */
  accessToken?: string;
  /** Cache TTL in milliseconds (default: 300_000 for SDK, 60_000 for server) */
  cacheTtlMs?: number;
  /** Default value when a flag is not found (default: false) */
  defaultValue?: boolean;
  /** Current environment */
  environment: Environment;
  /** Current plan tier */
  plan: 'free' | 'pro' | 'enterprise';
  /** Scope filter — only load flags matching this scope (or 'all') */
  scope?: FlagScope;
}

// ============================================================================
// Verify
// ============================================================================

/** Input for the verify() convenience method */
export interface VerifyInput extends LogTransactionInput {
  /** Agent reasoning for this transaction (logged into digest chain if provided) */
  reasoning?: string;
  /** Confidence level 0–1 for the reasoning */
  confidence?: number;
  /** Additional reasoning context */
  context?: Record<string, unknown>;
  /** When provided, anchors the terminal digest on-chain after compliance checks */
  anchor?: OnChainAnchorConfig;
  /** Counterparty agent for bilateral A2A attestation exchange */
  counterparty?: CounterpartyConfig;
  /** ERC-8021 config: fetch and parse builder attribution from transaction calldata */
  erc8021?: ERC8021Config;
  /** Reserve snapshot config: auto-capture on-chain supply alongside payment */
  reserveSnapshot?: {
    /** JSON-RPC endpoint for on-chain supply query */
    rpcUrl: string;
    /** Published reserve figure from issuer's report (caller-supplied) */
    publishedReserves?: string;
    /** Acceptable delta percentage (default: 0.001 = 0.1%) */
    tolerance?: number;
  };
}

/** Result of the verify() convenience method */
export interface VerifyResult {
  /** Whether the transaction passed all compliance checks */
  compliant: boolean;
  /** Individual compliance check results */
  checks: ComplianceCheckResult[];
  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommended actions */
  recommendations: string[];
  /** The logged transaction record */
  transaction: TransactionRecord;
  /** Agent trust score (auto-computed when agentId is present) */
  trustScore: TrustScore;
  /** Anomalies detected for this transaction (empty if anomaly detection not configured) */
  anomalies: AnomalyEvent[];
  /** Digest chain proof at time of verification */
  digestProof: {
    terminalDigest: string;
    chainLength: number;
    valid: boolean;
  };
  /** Reasoning entry ID (present when reasoning was provided in input) */
  reasoningId?: string;
  /** On-chain anchor proof (present when anchor config provided in input) */
  anchorProof?: AnchorResult;
  /** Counterparty attestation (present when counterparty config provided in input) */
  counterparty?: CounterpartyAttestation;
  /** True when the transaction amount exceeds the approvalThreshold */
  requiresApproval?: boolean;
  /** The pending approval task (present when requiresApproval is true) */
  task?: Task;
  /** ERC-8021 builder attribution (present when erc8021 config provided and tx has attribution) */
  attribution?: ERC8021Attribution;
  /** Coverage warning when using built-in screening only (no external providers configured) */
  coverageWarning?: string;
  /** Reserve snapshot (present when reserveSnapshot config provided in input and token/chain available) */
  reserveSnapshot?: {
    token: Token;
    chain: Chain;
    onChainSupply: string;
    publishedReserves?: string;
    delta?: string;
    snapshotBlockNumber: number;
    snapshotBlockHash: string;
    reconciliationStatus: 'matched' | 'delta_within_tolerance' | 'discrepancy' | 'unverified';
    timestamp: string;
  };
}

// ============================================================================
// Agent Reasoning & Session Tracing
// ============================================================================

/**
 * Input for logging an agent's reasoning/decision step.
 * Supports full trace reconstruction via sessionId + step sequencing.
 */
export interface LogReasoningInput {
  /** ID of the agent performing the reasoning */
  agentId: string;
  /**
   * Session ID grouping all steps in one agent run.
   * Use Kontext.generateSessionId() or your framework's run ID
   * (LangGraph thread_id, Vercel AI id, OpenAI run_id).
   */
  sessionId?: string;
  /** Step number within the session (for ordering) */
  step?: number;
  /** Parent step number (links this step to a prior decision) */
  parentStep?: number;
  /** The action or decision being made (e.g., 'evaluate-transfer') */
  action: string;
  /** Natural language explanation of the reasoning */
  reasoning: string;
  /** Confidence level 0–1 */
  confidence?: number;
  /** Tool or method called as a result of this reasoning */
  toolCall?: string;
  /** Result returned by the tool call */
  toolResult?: unknown;
  /** Additional context */
  context?: Record<string, unknown>;
}

/** A stored reasoning/decision entry in the audit trail */
export interface ReasoningEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Agent ID */
  agentId: string;
  /** Session ID */
  sessionId?: string;
  /** Step number */
  step?: number;
  /** Parent step */
  parentStep?: number;
  /** Action name */
  action: string;
  /** Reasoning text */
  reasoning: string;
  /** Confidence 0–1 */
  confidence: number;
  /** Tool called */
  toolCall?: string;
  /** Tool result */
  toolResult?: unknown;
  /** Context */
  context: Record<string, unknown>;
}

// ============================================================================
// On-Chain Digest Anchoring
// ============================================================================

/** Configuration for on-chain digest anchoring */
export interface OnChainAnchorConfig {
  /** JSON-RPC URL for the target chain */
  rpcUrl: string;
  /** KontextAnchor contract address */
  contractAddress: string;
  /** Private key of the signer (hex with 0x prefix). Required for write operations. */
  privateKey?: string;
  /** ERC-8021 builder code for transaction attribution (default: 'kontext') */
  builderCode?: string;
}

/** Result of an on-chain anchor transaction */
export interface AnchorResult {
  /** The digest that was anchored */
  digest: string;
  /** The on-chain transaction hash */
  txHash: string;
  /** The block number containing the anchor */
  blockNumber: number;
  /** Block timestamp (unix seconds) */
  timestamp: number;
  /** Contract address used */
  contractAddress: string;
  /** Chain the anchor was submitted to */
  chain: string;
}

/** Result of verifying an anchor on-chain */
export interface AnchorVerification {
  /** Whether the digest was found on-chain */
  anchored: boolean;
  /** The digest that was checked */
  digest: string;
  /** Anchorer address (if anchored) */
  anchorer?: string;
  /** Project hash (if anchored) */
  projectHash?: string;
  /** Block timestamp (if anchored) */
  timestamp?: number;
}

// ============================================================================
// ERC-8021 Transaction Attribution
// ============================================================================

/** ERC-8021 transaction attribution data parsed from calldata suffix */
export interface ERC8021Attribution {
  /** Builder/entity codes extracted from the calldata suffix */
  codes: string[];
  /** Schema ID (0 = canonical code registry) */
  schemaId: number;
  /** Raw suffix hex (with 0x prefix) */
  rawSuffix: string;
}

/** ERC-8021 configuration for verify() */
export interface ERC8021Config {
  /** JSON-RPC URL for fetching transaction calldata */
  rpcUrl: string;
  /** Registry contract address for resolving codes to payout addresses (future use) */
  registryAddress?: string;
}

// ============================================================================
// A2A Attestation Exchange (Agent-to-Agent)
// ============================================================================

/** Agent card served at /.well-known/kontext.json */
export interface AgentCard {
  /** Agent identifier */
  agentId: string;
  /** Kontext SDK version */
  kontextVersion: string;
  /** Supported capabilities (e.g., ['verify', 'attest']) */
  capabilities: string[];
  /** Attestation endpoint path (relative to host) */
  attestEndpoint: string;
}

/** Counterparty configuration for verify() */
export interface CounterpartyConfig {
  /** Base URL of the counterparty agent (e.g., https://agent.example.com) */
  endpoint: string;
  /** Expected agent ID (optional, verified against agent card) */
  agentId?: string;
  /** Timeout for attestation exchange in milliseconds (default: 10000) */
  timeoutMs?: number;
}

/** Attestation request sent to counterparty */
export interface AttestationRequest {
  /** Sender's terminal digest */
  senderDigest: string;
  /** Sender's agent ID */
  senderAgentId: string;
  /** Transaction hash */
  txHash?: string;
  /** Chain */
  chain?: string;
  /** Transfer amount */
  amount: string;
  /** Token */
  token?: string;
  /** Timestamp of the request */
  timestamp: string;
}

/** Attestation response from counterparty */
export interface AttestationResponse {
  /** Whether the counterparty attested */
  attested: boolean;
  /** Counterparty's terminal digest */
  receiverDigest: string;
  /** Counterparty's agent ID */
  receiverAgentId: string;
  /** Timestamp of attestation */
  timestamp: string;
}

/** Counterparty attestation result included in VerifyResult */
export interface CounterpartyAttestation {
  /** Whether the counterparty successfully attested */
  attested: boolean;
  /** Counterparty's digest (proof they ran compliance) */
  digest: string;
  /** Counterparty's agent ID */
  agentId: string;
  /** Attestation timestamp */
  timestamp: string;
}

// ============================================================================
// Agent Provenance (3-Layer Model)
// ============================================================================

/** Session status */
export type SessionStatus = 'active' | 'ended' | 'expired';

/** Checkpoint status */
export type CheckpointStatus = 'pending' | 'attested' | 'rejected' | 'expired';

/** Attestation decision */
export type AttestationDecision = 'approved' | 'rejected';

// --- Layer 1: Session Delegation ---

/** Constraints on what an agent session is authorized to do */
export interface SessionConstraints {
  /** Maximum single transaction amount */
  maxAmount?: string;
  /** Allowed blockchain networks */
  allowedChains?: Chain[];
  /** Allowed tokens */
  allowedTokens?: Token[];
  /** Allowed recipient addresses (normalized to lowercase) */
  allowedRecipients?: string[];
}

/** Input for creating a delegated agent session */
export interface CreateSessionInput {
  /** Agent being delegated authority */
  agentId: string;
  /** Human principal who authorized this session */
  delegatedBy: string;
  /** Scoped capabilities (e.g., ['transfer', 'approve', 'query']) */
  scope: string[];
  /** Optional constraints on the session */
  constraints?: SessionConstraints;
  /** Session TTL in milliseconds (default: no expiry) */
  expiresIn?: number;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** A delegated agent session with provenance data */
export interface AgentSession {
  /** Unique session identifier */
  sessionId: string;
  /** Agent ID */
  agentId: string;
  /** Human who delegated authority */
  delegatedBy: string;
  /** Authorized scope */
  scope: string[];
  /** Session constraints */
  constraints?: SessionConstraints;
  /** Session status */
  status: SessionStatus;
  /** Creation timestamp */
  createdAt: string;
  /** End timestamp (when explicitly ended) */
  endedAt?: string;
  /** Expiry timestamp */
  expiresAt?: string;
  /** Digest from the chain link that recorded session creation */
  digest?: string;
  /** Prior digest in the chain */
  priorDigest?: string;
  /** Arbitrary metadata */
  metadata: Record<string, unknown>;
}

// --- Layer 3: Human Attestation Checkpoints ---

/** Interface for external attestation providers (developer implements) */
export interface ProvenanceAttestor {
  /** Sign an attestation payload */
  sign(payload: AttestationPayload): Promise<AttestationSignature>;
  /** Get the verification key for signature checking */
  getVerificationKey(): Promise<VerificationKey>;
}

/** Payload presented to an attestor for signing */
export interface AttestationPayload {
  /** Checkpoint ID */
  checkpointId: string;
  /** SHA-256 of concatenated action digests */
  actionsDigest: string;
  /** Session this checkpoint belongs to */
  sessionId: string;
  /** Timestamp of checkpoint creation */
  timestamp: string;
}

/** Cryptographic signature from an attestor */
export interface AttestationSignature {
  /** The signature bytes (hex or base64) */
  signature: string;
  /** Algorithm used (e.g., 'ES256', 'Ed25519', 'RS256') */
  algorithm: string;
  /** Optional key identifier */
  keyId?: string;
}

/** Public verification key for checking attestation signatures */
export interface VerificationKey {
  /** Public key (PEM, JWK string, or hex) */
  publicKey: string;
  /** Algorithm */
  algorithm: string;
  /** Optional key identifier */
  keyId?: string;
}

/** A human attestation attached to a checkpoint */
export interface HumanAttestation {
  /** Unique attestation identifier */
  attestationId: string;
  /** Checkpoint this attestation covers */
  checkpointId: string;
  /** Human reviewer identifier */
  reviewerId: string;
  /** Decision */
  decision: AttestationDecision;
  /** Optional evidence or notes from the reviewer */
  evidence?: string;
  /** Cryptographic signature */
  signature: AttestationSignature;
  /** Verification key for the signature */
  verificationKey: VerificationKey;
  /** Attestation timestamp */
  timestamp: string;
}

/** Input for creating a provenance checkpoint */
export interface CreateCheckpointInput {
  /** Session this checkpoint belongs to */
  sessionId: string;
  /** Action IDs to include in this checkpoint */
  actionIds: string[];
  /** Human-readable summary of what the agent did */
  summary: string;
  /** Checkpoint TTL in milliseconds (default: no expiry) */
  expiresIn?: number;
}

/** A provenance checkpoint -- a review point in the action stream */
export interface ProvenanceCheckpoint {
  /** Unique checkpoint identifier */
  id: string;
  /** Session this checkpoint belongs to */
  sessionId: string;
  /** Action IDs covered by this checkpoint */
  actionIds: string[];
  /** Human-readable summary */
  summary: string;
  /** SHA-256 of concatenated action digests (proves which actions were reviewed) */
  actionsDigest: string;
  /** Checkpoint status */
  status: CheckpointStatus;
  /** Attached human attestation (present after attestation) */
  attestation?: HumanAttestation;
  /** Creation timestamp */
  createdAt: string;
  /** Expiry timestamp */
  expiresAt?: string;
}

// --- Provenance Bundle (export) ---

/** A provenance action with session binding */
export interface ProvenanceAction {
  /** Action ID */
  actionId: string;
  /** Action type */
  type: string;
  /** Digest from the chain */
  digest: string;
  /** Prior digest */
  priorDigest: string;
  /** Session this action is bound to */
  sessionId: string;
  /** Action timestamp */
  timestamp: string;
}

/** Verification summary for a provenance bundle */
export interface ProvenanceBundleVerification {
  /** Whether the digest chain covering these actions is valid */
  digestChainValid: boolean;
  /** Total actions in the session */
  totalActions: number;
  /** Actions covered by an approved human attestation */
  humanAttested: number;
  /** Actions bound to the session */
  sessionScoped: number;
  /** Actions not yet covered by any checkpoint */
  unattested: number;
}

/** Complete provenance export for a session */
export interface ProvenanceBundle {
  /** The session record */
  session: AgentSession;
  /** All actions bound to this session */
  actions: ProvenanceAction[];
  /** All checkpoints for this session */
  checkpoints: ProvenanceCheckpoint[];
  /** Verification summary */
  verification: ProvenanceBundleVerification;
  /** Export timestamp */
  generatedAt: string;
}

// ============================================================================
// Errors
// ============================================================================

/** Error codes for Kontext SDK */
export enum KontextErrorCode {
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_ALREADY_CONFIRMED = 'TASK_ALREADY_CONFIRMED',
  TASK_EXPIRED = 'TASK_EXPIRED',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXPORT_ERROR = 'EXPORT_ERROR',
  ANOMALY_CONFIG_ERROR = 'ANOMALY_CONFIG_ERROR',
  PLAN_REQUIRED = 'PLAN_REQUIRED',
  APPROVAL_NOT_FOUND = 'APPROVAL_NOT_FOUND',
  APPROVAL_EXPIRED = 'APPROVAL_EXPIRED',
}

/** Kontext SDK error */
export class KontextError extends Error {
  public readonly code: KontextErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: KontextErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'KontextError';
    this.code = code;
    this.details = details;
  }
}
