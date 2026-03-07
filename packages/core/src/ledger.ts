import {
  buildDigestPayload,
  ReceiptDigestChain,
  verifyReceiptChain,
} from './digest.js';
import { evaluatePolicy } from './policy.js';
import { FileStorage, MemoryStorage, type StorageAdapter } from './storage.js';
import type {
  AuditReport,
  AuthorizePaymentInput,
  ExplainResult,
  KontextBaseConfig,
  PaymentReceipt,
  StoredReceipt,
} from './types.js';
import { generateId, nowIso } from './utils.js';

const RECEIPTS_STORAGE_KEY = 'kontext_base:receipts';

export class ReceiptLedger {
  private readonly config: KontextBaseConfig;
  private readonly storage: StorageAdapter;
  private readonly digestChain = new ReceiptDigestChain();
  private receipts: StoredReceipt[] = [];
  private restored = false;

  private constructor(config: KontextBaseConfig, storage: StorageAdapter) {
    this.config = config;
    this.storage = storage;
  }

  static init(config: KontextBaseConfig, storage?: StorageAdapter): ReceiptLedger {
    const adapter = storage ?? new FileStorage(config.storageDir ?? '.kontext-base');
    return new ReceiptLedger(config, adapter);
  }

  static inMemory(config: KontextBaseConfig): ReceiptLedger {
    return new ReceiptLedger(config, new MemoryStorage());
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<PaymentReceipt> {
    await this.ensureRestored();

    const createdAt = nowIso();
    const policy = evaluatePolicy(input, this.config.policy, this.receipts, createdAt);
    const receiptId = generateId('rcpt');

    const baseReceipt: Omit<StoredReceipt, 'digest' | 'priorDigest'> = {
      receiptId,
      decision: policy.decision,
      allowed: policy.decision === 'allow',
      checksRun: policy.checksRun,
      violations: policy.violations,
      requiredActions: policy.requiredActions,
      chain: input.chain,
      token: input.token,
      amount: input.amount,
      from: input.from,
      to: input.to,
      createdAt,
      digestProof: {
        terminalDigest: '',
        chainLength: this.receipts.length + 1,
        valid: true,
      },
      actorId: input.actorId,
      metadata: input.metadata ?? {},
    };

    const digestPayload = buildDigestPayload({
      ...baseReceipt,
      digest: '',
      priorDigest: '',
    });

    const { digest, priorDigest } = this.digestChain.append(digestPayload);

    const storedReceipt: StoredReceipt = {
      ...baseReceipt,
      digest,
      priorDigest,
      digestProof: {
        terminalDigest: digest,
        chainLength: this.receipts.length + 1,
        valid: true,
      },
    };

    const updatedReceipts = [...this.receipts, storedReceipt];
    const verification = verifyReceiptChain(updatedReceipts);

    storedReceipt.digestProof = {
      terminalDigest: verification.terminalDigest,
      chainLength: updatedReceipts.length,
      valid: verification.valid,
    };

    this.receipts = updatedReceipts;
    await this.flush();

    return toPublicReceipt(storedReceipt);
  }

  async explain(receiptId: string): Promise<ExplainResult> {
    await this.ensureRestored();

    const stored = this.receipts.find((receipt) => receipt.receiptId === receiptId);
    if (!stored) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }

    const verification = verifyReceiptChain(this.receipts);

    return {
      receipt: toPublicReceipt(stored),
      actorId: stored.actorId,
      metadata: stored.metadata,
      digest: stored.digest,
      priorDigest: stored.priorDigest,
      digestVerification: verification,
    };
  }

  async getReceipt(receiptId: string): Promise<PaymentReceipt | undefined> {
    await this.ensureRestored();
    return this.receipts.find((receipt) => receipt.receiptId === receiptId)
      ? toPublicReceipt(this.receipts.find((receipt) => receipt.receiptId === receiptId)!)
      : undefined;
  }

  async listReceipts(): Promise<PaymentReceipt[]> {
    await this.ensureRestored();
    return this.receipts.map((receipt) => toPublicReceipt(receipt));
  }

  async audit(): Promise<AuditReport> {
    await this.ensureRestored();

    const verification = verifyReceiptChain(this.receipts);

    return {
      generatedAt: nowIso(),
      projectId: this.config.projectId,
      receiptCount: this.receipts.length,
      digestVerification: verification,
      receipts: this.receipts.map((receipt) => toPublicReceipt(receipt)),
    };
  }

  async flush(): Promise<void> {
    await this.storage.save(RECEIPTS_STORAGE_KEY, this.receipts);
  }

  async restore(): Promise<void> {
    const saved = await this.storage.load<StoredReceipt[]>(RECEIPTS_STORAGE_KEY);
    this.receipts = Array.isArray(saved) ? saved : [];

    const last = this.receipts[this.receipts.length - 1];
    if (last) {
      this.digestChain.restore(last.digest, this.receipts.length);
    }

    this.restored = true;
  }

  async destroy(): Promise<void> {
    await this.flush();
  }

  private async ensureRestored(): Promise<void> {
    if (this.restored) {
      return;
    }
    await this.restore();
  }
}

function toPublicReceipt(receipt: StoredReceipt): PaymentReceipt {
  return {
    receiptId: receipt.receiptId,
    decision: receipt.decision,
    allowed: receipt.allowed,
    checksRun: receipt.checksRun,
    violations: receipt.violations,
    requiredActions: receipt.requiredActions,
    chain: receipt.chain,
    token: receipt.token,
    amount: receipt.amount,
    from: receipt.from,
    to: receipt.to,
    createdAt: receipt.createdAt,
    digestProof: receipt.digestProof,
  };
}
