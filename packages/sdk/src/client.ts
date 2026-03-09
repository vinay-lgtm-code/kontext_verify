import {
  AttemptLedger,
  ReceiptLedger,
  MemoryStorage,
  FileStorage,
} from '@kontext/core';
import type {
  KontextBaseConfig,
  AuthorizePaymentInput,
  PaymentReceipt,
  PaymentAttempt,
  StageEvent,
  StageName,
  StartAttemptInput,
  AttemptFilter,
  Chain,
  StorageAdapter,
  WorkspaceProfile,
} from '@kontext/core';
import { defaultWorkspaceProfile } from '@kontext/core';

export interface KontextConfig {
  projectId: string;
  environment: 'development' | 'staging' | 'production';
  apiUrl?: string;
  apiKey?: string;
  storageDir?: string;
  storage?: StorageAdapter;
  policy?: KontextBaseConfig['policy'];
}

export interface ConfirmationData {
  txHash: string;
  blockNumber?: number;
  confirmations?: number;
  chain?: Chain;
}

export interface CreditEvidence {
  confirmedAt: string;
  providerRef?: string;
}

export interface RefundData {
  refundTxHash?: string;
  reason: string;
  refundedAt?: string;
}

const DEFAULT_POLICY: KontextBaseConfig['policy'] = {
  maxTransactionAmount: '25000',
  dailyAggregateLimit: '100000',
  reviewThreshold: '10000',
  sanctionsEnabled: true,
  blockedRecipients: [],
  blockedSenders: [],
  allowedRecipients: [],
  requiredMetadataByPaymentType: {},
};

export class Kontext {
  private readonly config: KontextConfig;
  private readonly attemptLedger: AttemptLedger;
  private readonly receiptLedger: ReceiptLedger;
  private workspaceProfile: WorkspaceProfile | null = null;

  private constructor(config: KontextConfig, storage: StorageAdapter) {
    this.config = config;

    const coreConfig: KontextBaseConfig = {
      projectId: config.projectId,
      environment: config.environment,
      storageDir: config.storageDir,
      policy: config.policy ?? DEFAULT_POLICY,
    };

    this.receiptLedger = ReceiptLedger.init(coreConfig, storage);
    this.attemptLedger = new AttemptLedger(this.receiptLedger, storage);
  }

  static init(config: KontextConfig): Kontext {
    const storage = config.storage
      ?? new FileStorage(config.storageDir ?? '.kontext');
    return new Kontext(config, storage);
  }

  static inMemory(config: KontextConfig): Kontext {
    return new Kontext(config, new MemoryStorage());
  }

  // === Payment Attempt Lifecycle ===

  async start(input: StartAttemptInput): Promise<PaymentAttempt> {
    return this.attemptLedger.startAttempt(input);
  }

  async record(
    attemptId: string,
    stage: StageName,
    event: Omit<StageEvent, 'stage'>,
  ): Promise<PaymentAttempt> {
    return this.attemptLedger.appendStageEvent(attemptId, { ...event, stage });
  }

  async broadcast(
    attemptId: string,
    txHash: string,
    chain?: Chain,
  ): Promise<PaymentAttempt> {
    return this.attemptLedger.appendStageEvent(attemptId, {
      stage: 'transmit',
      status: 'succeeded',
      actorSide: 'network',
      code: 'TX_BROADCAST',
      message: `Transaction broadcast: ${txHash}`,
      timestamp: new Date().toISOString(),
      payload: { txHash, chain },
    });
  }

  async confirm(
    attemptId: string,
    confirmation: ConfirmationData,
  ): Promise<PaymentAttempt> {
    return this.attemptLedger.appendStageEvent(attemptId, {
      stage: 'confirm',
      status: 'succeeded',
      actorSide: 'network',
      code: 'TX_CONFIRMED',
      message: `Transaction confirmed: ${confirmation.txHash}`,
      timestamp: new Date().toISOString(),
      payload: confirmation as unknown as Record<string, unknown>,
    });
  }

  async credit(
    attemptId: string,
    evidence: CreditEvidence,
  ): Promise<PaymentAttempt> {
    return this.attemptLedger.appendStageEvent(attemptId, {
      stage: 'recipient_credit',
      status: 'succeeded',
      actorSide: 'recipient',
      code: 'CREDITED',
      message: 'Recipient received funds',
      timestamp: new Date().toISOString(),
      payload: evidence as unknown as Record<string, unknown>,
    });
  }

  async fail(
    attemptId: string,
    reason: string,
    stage: StageName = 'transmit',
  ): Promise<PaymentAttempt> {
    return this.attemptLedger.appendStageEvent(attemptId, {
      stage,
      status: 'failed',
      actorSide: 'internal',
      code: 'PAYMENT_FAILED',
      message: reason,
      timestamp: new Date().toISOString(),
    });
  }

  async refund(
    attemptId: string,
    data: RefundData,
  ): Promise<PaymentAttempt> {
    return this.attemptLedger.appendStageEvent(attemptId, {
      stage: 'retry_or_refund',
      status: 'succeeded',
      actorSide: 'provider',
      code: 'REFUNDED',
      message: data.reason,
      timestamp: new Date().toISOString(),
      payload: data as unknown as Record<string, unknown>,
    });
  }

  async get(attemptId: string): Promise<PaymentAttempt | undefined> {
    return this.attemptLedger.getAttempt(attemptId);
  }

  list(filter?: AttemptFilter): PaymentAttempt[] {
    return this.attemptLedger.listAttempts(filter);
  }

  // === Authorization ===

  async authorize(
    attemptId: string,
    input: AuthorizePaymentInput,
  ): Promise<{ attempt: PaymentAttempt; receipt: PaymentReceipt }> {
    return this.attemptLedger.authorizeAttempt(attemptId, input);
  }

  // === Workspace Profile ===

  profile(): WorkspaceProfile {
    if (!this.workspaceProfile) {
      this.workspaceProfile = defaultWorkspaceProfile(
        this.config.projectId,
        this.config.projectId,
        ['treasury'],
      );
    }
    return { ...this.workspaceProfile };
  }

  configure(p: WorkspaceProfile): void {
    this.workspaceProfile = { ...p };
  }

  // === Lifecycle ===

  async flush(): Promise<void> {
    await this.attemptLedger.flush();
  }

  async destroy(): Promise<void> {
    await this.attemptLedger.destroy();
  }
}
