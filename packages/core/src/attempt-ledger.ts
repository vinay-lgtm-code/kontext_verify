import { ReceiptLedger } from './ledger.js';
import { receiptToStageEvent } from './policy.js';
import type { StorageAdapter } from './storage.js';
import type {
  PaymentAttempt,
  StageEvent,
  StageName,
  StartAttemptInput,
  AttemptFilter,
  AuthorizePaymentInput,
  PaymentReceipt,
  FinalState,
} from './types.js';

const ATTEMPTS_STORAGE_KEY = 'kontext:attempts';

const STAGE_ORDER: readonly StageName[] = [
  'intent', 'authorize', 'prepare', 'transmit', 'confirm',
  'recipient_credit', 'reconcile', 'retry_or_refund',
] as const;

export class AttemptLedger {
  private readonly receiptLedger: ReceiptLedger;
  private readonly storage: StorageAdapter;
  private attempts: Map<string, PaymentAttempt> = new Map();
  private restored = false;

  constructor(receiptLedger: ReceiptLedger, storage: StorageAdapter) {
    this.receiptLedger = receiptLedger;
    this.storage = storage;
  }

  private async ensureRestored(): Promise<void> {
    if (this.restored) return;
    const stored = await this.storage.load<PaymentAttempt[]>(ATTEMPTS_STORAGE_KEY);
    if (Array.isArray(stored)) {
      for (const attempt of stored) {
        this.attempts.set(attempt.attemptId, attempt);
      }
    }
    this.restored = true;
  }

  private async persist(): Promise<void> {
    await this.storage.save(ATTEMPTS_STORAGE_KEY, Array.from(this.attempts.values()));
  }

  async startAttempt(input: StartAttemptInput): Promise<PaymentAttempt> {
    await this.ensureRestored();

    const attemptId = `att_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const timestamp = new Date().toISOString();

    const attempt: PaymentAttempt = {
      attemptId,
      workspaceRef: input.workspaceRef,
      appRef: input.appRef,
      archetype: input.archetype,
      intentCurrency: input.intentCurrency,
      settlementAsset: input.settlementAsset,
      chain: input.chain,
      senderRefs: input.senderRefs,
      recipientRefs: input.recipientRefs,
      executionSurface: input.executionSurface,
      providerRefs: input.providerRefs ?? {},
      stageEvents: [{
        stage: 'intent',
        status: 'succeeded',
        actorSide: 'sender',
        code: 'INTENT_CREATED',
        message: 'Payment attempt initiated',
        timestamp,
      }],
      finalState: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.attempts.set(attemptId, attempt);
    await this.persist();
    return { ...attempt, stageEvents: [...attempt.stageEvents] };
  }

  async appendStageEvent(attemptId: string, event: StageEvent): Promise<PaymentAttempt> {
    await this.ensureRestored();

    const attempt = this.attempts.get(attemptId);
    if (!attempt) throw new Error(`Attempt not found: ${attemptId}`);

    // Validate stage order
    const lastEvent = attempt.stageEvents[attempt.stageEvents.length - 1];
    if (lastEvent) {
      const lastIdx = STAGE_ORDER.indexOf(lastEvent.stage);
      const newIdx = STAGE_ORDER.indexOf(event.stage);
      if (newIdx < lastIdx) {
        throw new Error(
          `Stage "${event.stage}" cannot follow "${lastEvent.stage}" — stages must progress forward`,
        );
      }
    }

    attempt.stageEvents.push(event);
    attempt.updatedAt = event.timestamp;
    attempt.finalState = deriveFinalState(attempt);

    await this.persist();
    return { ...attempt, stageEvents: [...attempt.stageEvents] };
  }

  async authorizeAttempt(
    attemptId: string,
    authInput: AuthorizePaymentInput,
  ): Promise<{ attempt: PaymentAttempt; receipt: PaymentReceipt }> {
    await this.ensureRestored();

    const attempt = this.attempts.get(attemptId);
    if (!attempt) throw new Error(`Attempt not found: ${attemptId}`);

    const receipt = await this.receiptLedger.authorizePayment(authInput);
    const stageEvent = receiptToStageEvent(receipt);

    attempt.stageEvents.push(stageEvent);
    attempt.updatedAt = stageEvent.timestamp;
    if (!attempt.linkedReceiptIds) attempt.linkedReceiptIds = [];
    attempt.linkedReceiptIds.push(receipt.receiptId);
    attempt.finalState = deriveFinalState(attempt);

    await this.persist();
    return {
      attempt: { ...attempt, stageEvents: [...attempt.stageEvents] },
      receipt,
    };
  }

  async getAttempt(attemptId: string): Promise<PaymentAttempt | undefined> {
    await this.ensureRestored();
    const attempt = this.attempts.get(attemptId);
    return attempt ? { ...attempt, stageEvents: [...attempt.stageEvents] } : undefined;
  }

  listAttempts(filter?: AttemptFilter): PaymentAttempt[] {
    let results = Array.from(this.attempts.values());

    if (filter?.archetype) results = results.filter(a => a.archetype === filter.archetype);
    if (filter?.chain) results = results.filter(a => a.chain === filter.chain);
    if (filter?.finalState) results = results.filter(a => a.finalState === filter.finalState);
    if (filter?.since) results = results.filter(a => a.createdAt >= filter.since!);
    if (filter?.until) results = results.filter(a => a.createdAt <= filter.until!);

    return results.map(a => ({ ...a, stageEvents: [...a.stageEvents] }));
  }

  async flush(): Promise<void> {
    await this.persist();
    await this.receiptLedger.flush();
  }

  async destroy(): Promise<void> {
    this.attempts.clear();
    this.restored = false;
    await this.receiptLedger.destroy();
  }
}

function deriveFinalState(attempt: PaymentAttempt): FinalState {
  const lastEvent = attempt.stageEvents[attempt.stageEvents.length - 1];
  if (!lastEvent) return 'pending';

  if (lastEvent.stage === 'retry_or_refund' && lastEvent.status === 'succeeded') return 'refunded';
  if (lastEvent.stage === 'authorize' && lastEvent.status === 'failed') return 'blocked';
  if (lastEvent.status === 'failed') return 'failed';
  if (lastEvent.status === 'review') return 'review';
  if (lastEvent.stage === 'reconcile' && lastEvent.status === 'succeeded') return 'succeeded';
  if (lastEvent.stage === 'recipient_credit' && lastEvent.status === 'succeeded') return 'succeeded';
  return 'pending';
}

export { STAGE_ORDER };
