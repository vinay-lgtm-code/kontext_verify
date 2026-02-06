// ============================================================================
// Kontext SDK - Core Type Definitions
// ============================================================================

/** Supported blockchain networks */
export type Chain = 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'optimism' | 'arc' | 'avalanche' | 'solana';

/** Supported stablecoin tokens */
export type Token = 'USDC' | 'USDT' | 'DAI' | 'EURC';

/** SDK operating mode */
export type KontextMode = 'local' | 'cloud';

/** Environment configuration */
export type Environment = 'development' | 'staging' | 'production';

/** Anomaly severity levels */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/** Task status lifecycle */
export type TaskStatus = 'pending' | 'in_progress' | 'confirmed' | 'failed' | 'expired';

/** Supported export formats */
export type ExportFormat = 'json' | 'csv';

/** Report types */
export type ReportType = 'compliance' | 'transaction' | 'anomaly' | 'sar' | 'ctr';

/** Anomaly detection rule types */
export type AnomalyRuleType =
  | 'unusualAmount'
  | 'frequencySpike'
  | 'newDestination'
  | 'offHoursActivity'
  | 'rapidSuccession'
  | 'roundAmount';

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
  /** Backend API URL (defaults to Kontext cloud API) */
  apiUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Batch size for log flushing */
  batchSize?: number;
  /** Batch flush interval in milliseconds */
  flushIntervalMs?: number;
  /** Local file output directory for OSS mode */
  localOutputDir?: string;
  /** Pluggable storage adapter for persistence (default: in-memory) */
  storage?: import('./storage.js').StorageAdapter;
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
  /** Optional correlation ID (auto-generated if not provided) */
  correlationId?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** Input for logging a cryptocurrency transaction */
export interface LogTransactionInput {
  /** On-chain transaction hash */
  txHash: string;
  /** Blockchain network */
  chain: Chain;
  /** Transaction amount (string to preserve decimal precision) */
  amount: string;
  /** Token being transferred */
  token: Token;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** ID of the agent initiating the transaction */
  agentId: string;
  /** Optional correlation ID */
  correlationId?: string;
  /** Additional transaction metadata */
  metadata?: Record<string, unknown>;
}

/** Stored transaction record */
export interface TransactionRecord extends ActionLog {
  type: 'transaction';
  txHash: string;
  chain: Chain;
  amount: string;
  token: Token;
  from: string;
  to: string;
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
// SAR/CTR Report Templates
// ============================================================================

/** Subject information for SAR/CTR reports */
export interface ReportSubject {
  /** Subject name or identifier */
  name: string;
  /** Agent ID (if applicable) */
  agentId?: string;
  /** Wallet addresses associated with the subject */
  addresses: string[];
  /** Additional identifying information */
  identifiers?: Record<string, string>;
}

/** Suspicious Activity Report template */
export interface SARReport {
  /** Report ID */
  id: string;
  /** Report type discriminator */
  type: 'sar';
  /** Generation timestamp */
  generatedAt: string;
  /** Reporting period */
  period: DateRange;
  /** Project ID */
  projectId: string;
  /** Filing institution information */
  filingInstitution: string;
  /** Subject(s) of the report */
  subjects: ReportSubject[];
  /** Narrative summary of suspicious activity */
  narrative: string;
  /** Suspicious activity categories */
  activityCategories: string[];
  /** Total amount involved */
  totalAmount: string;
  /** Currency/token */
  currency: string;
  /** Transactions flagged as suspicious */
  suspiciousTransactions: TransactionRecord[];
  /** Related anomalies */
  anomalies: AnomalyEvent[];
  /** Supporting action logs */
  supportingActions: ActionLog[];
  /** Whether this is a continuing activity report */
  isContinuingActivity: boolean;
  /** Prior report ID if continuing */
  priorReportId: string | null;
  /** Status of the report */
  status: 'draft' | 'review' | 'filed';
}

/** Currency Transaction Report template */
export interface CTRReport {
  /** Report ID */
  id: string;
  /** Report type discriminator */
  type: 'ctr';
  /** Generation timestamp */
  generatedAt: string;
  /** Reporting period */
  period: DateRange;
  /** Project ID */
  projectId: string;
  /** Filing institution information */
  filingInstitution: string;
  /** Person/entity conducting the transactions */
  conductors: ReportSubject[];
  /** Transactions included in the report */
  transactions: TransactionRecord[];
  /** Total cash-in amount */
  totalCashIn: string;
  /** Total cash-out amount */
  totalCashOut: string;
  /** Currency/token */
  currency: string;
  /** Whether multiple transactions are aggregated */
  isAggregated: boolean;
  /** Chains involved */
  chainsInvolved: Chain[];
  /** Supporting action logs */
  supportingActions: ActionLog[];
  /** Status of the report */
  status: 'draft' | 'review' | 'filed';
}

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
  /** Transaction hash */
  txHash: string;
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
// Anomaly Detection
// ============================================================================

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

/** Anomaly event callback */
export type AnomalyCallback = (anomaly: AnomalyEvent) => void;

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
// Agent Reasoning
// ============================================================================

/** Input for logging agent reasoning */
export interface LogReasoningInput {
  /** ID of the agent making the decision */
  agentId: string;
  /** What action was taken or is being considered */
  action: string;
  /** The agent's reasoning/justification */
  reasoning: string;
  /** Optional confidence score (0-1) */
  confidence?: number;
  /** Optional additional context */
  context?: Record<string, unknown>;
}

/** A reasoning entry stored in the action log */
export interface ReasoningEntry {
  /** Unique reasoning entry identifier */
  id: string;
  /** Timestamp of the reasoning entry */
  timestamp: string;
  /** ID of the agent making the decision */
  agentId: string;
  /** What action was taken or is being considered */
  action: string;
  /** The agent's reasoning/justification */
  reasoning: string;
  /** Confidence score (0-1), defaults to 1.0 */
  confidence: number;
  /** Additional context */
  context: Record<string, unknown>;
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
  /** SHA-256 hash of the certificate content for verification */
  signature: string;
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
