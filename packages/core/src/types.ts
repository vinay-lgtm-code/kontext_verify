export type Chain = 'base' | 'ethereum' | 'solana';
export type Token = 'USDC';

export type PaymentType = 'payroll' | 'remittance' | 'invoicing' | 'treasury' | 'other';

// === Payment Attempt Model (v1) ===

/** Fixed 8-stage payment lifecycle taxonomy */
export type StageName = 'intent' | 'authorize' | 'prepare' | 'transmit' | 'confirm' | 'recipient_credit' | 'reconcile' | 'retry_or_refund';

/** Who performed the action */
export type ActorSide = 'sender' | 'recipient' | 'network' | 'provider' | 'internal';

/** Terminal state of a payment attempt */
export type FinalState = 'pending' | 'succeeded' | 'failed' | 'review' | 'blocked' | 'refunded';

/** Payment archetype (superset of PaymentType for v1) */
export type Archetype = 'payroll' | 'remittance' | 'invoicing' | 'treasury' | 'micropayments';

/** Settlement asset */
export type SettlementAsset = 'USDC' | 'EURC' | 'USDT';

/** A single stage event in the payment lifecycle */
export interface StageEvent {
  stage: StageName;
  status: 'pending' | 'succeeded' | 'failed' | 'review' | 'collect_info';
  actorSide: ActorSide;
  code: string;
  message: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

/** The canonical payment attempt object */
export interface PaymentAttempt {
  attemptId: string;
  workspaceRef: string;
  appRef: string;
  archetype: Archetype;
  intentCurrency: string;
  settlementAsset: SettlementAsset;
  chain: Chain;
  senderRefs: Record<string, unknown>;
  recipientRefs: Record<string, unknown>;
  executionSurface: string;
  providerRefs: Record<string, unknown>;
  stageEvents: StageEvent[];
  finalState: FinalState;
  linkedReceiptIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Input to create a new payment attempt */
export interface StartAttemptInput {
  workspaceRef: string;
  appRef: string;
  archetype: Archetype;
  intentCurrency: string;
  settlementAsset: SettlementAsset;
  chain: Chain;
  senderRefs: Record<string, unknown>;
  recipientRefs: Record<string, unknown>;
  executionSurface: string;
  providerRefs?: Record<string, unknown>;
}

/** Filter criteria for listing attempts */
export interface AttemptFilter {
  archetype?: Archetype;
  chain?: Chain;
  finalState?: FinalState;
  since?: string;
  until?: string;
}

export type AuthorizationDecision = 'allow' | 'block' | 'review' | 'collect_info';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface AuthorizationCheck {
  name: string;
  passed: boolean;
  severity: Severity;
  description: string;
}

export interface PolicyViolation {
  code: string;
  message: string;
  severity: Severity;
}

export interface RequiredAction {
  code: string;
  message: string;
}

export interface AuthorizePaymentInput {
  chain: Chain;
  token: Token;
  amount: string;
  from: string;
  to: string;
  actorId: string;
  metadata?: Record<string, unknown> & {
    paymentType?: PaymentType;
  };
}

export interface PaymentReceipt {
  receiptId: string;
  decision: AuthorizationDecision;
  allowed: boolean;
  checksRun: AuthorizationCheck[];
  violations: PolicyViolation[];
  requiredActions: RequiredAction[];
  chain: Chain;
  token: Token;
  amount: string;
  from: string;
  to: string;
  createdAt: string;
  digestProof: {
    terminalDigest: string;
    chainLength: number;
    valid: boolean;
  };
}

export interface StoredReceipt extends PaymentReceipt {
  actorId: string;
  metadata: Record<string, unknown>;
  digest: string;
  priorDigest: string;
}

export interface DigestVerification {
  valid: boolean;
  linksVerified: number;
  firstInvalidIndex: number;
  terminalDigest: string;
}

export interface PaymentPolicy {
  maxTransactionAmount: string;
  dailyAggregateLimit: string;
  reviewThreshold?: string;
  sanctionsEnabled: boolean;
  blockedRecipients: string[];
  blockedSenders: string[];
  allowedRecipients: string[];
  requiredMetadataByPaymentType: Partial<Record<PaymentType, string[]>>;
}

export type RuntimeEnvironment = 'development' | 'staging' | 'production';

export interface KontextBaseConfig {
  projectId: string;
  environment: RuntimeEnvironment;
  storageDir?: string;
  policy: PaymentPolicy;
}

export interface ExplainResult {
  receipt: PaymentReceipt;
  actorId: string;
  metadata: Record<string, unknown>;
  digest: string;
  priorDigest: string;
  digestVerification: DigestVerification;
}

export interface AuditReport {
  generatedAt: string;
  projectId: string;
  receiptCount: number;
  digestVerification: DigestVerification;
  receipts: PaymentReceipt[];
}

export interface EvaluatePolicyResult {
  decision: AuthorizationDecision;
  checksRun: AuthorizationCheck[];
  violations: PolicyViolation[];
  requiredActions: RequiredAction[];
}
