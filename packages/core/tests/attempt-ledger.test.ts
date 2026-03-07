import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AttemptLedger,
  ReceiptLedger,
  MemoryStorage,
  STAGE_ORDER,
} from '../src/index.js';
import type {
  KontextBaseConfig,
  StartAttemptInput,
  StageEvent,
  Archetype,
} from '../src/index.js';

const TEST_CONFIG: KontextBaseConfig = {
  projectId: 'test',
  environment: 'development',
  policy: {
    maxTransactionAmount: '50000',
    dailyAggregateLimit: '200000',
    reviewThreshold: '25000',
    sanctionsEnabled: false,
    blockedRecipients: [],
    blockedSenders: [],
    allowedRecipients: [],
    requiredMetadataByPaymentType: {},
  },
};

const TEST_INPUT: StartAttemptInput = {
  workspaceRef: 'ws_test',
  appRef: 'app_test',
  archetype: 'treasury',
  intentCurrency: 'USD',
  settlementAsset: 'USDC',
  chain: 'base',
  senderRefs: { address: '0x1111111111111111111111111111111111111111' },
  recipientRefs: { address: '0x2222222222222222222222222222222222222222' },
  executionSurface: 'sdk',
};

function createLedger() {
  const storage = new MemoryStorage();
  const receiptLedger = ReceiptLedger.inMemory(TEST_CONFIG);
  return new AttemptLedger(receiptLedger, storage);
}

describe('AttemptLedger', () => {
  let ledger: AttemptLedger;

  beforeEach(() => {
    ledger = createLedger();
  });

  afterEach(async () => {
    await ledger.destroy();
  });

  describe('startAttempt', () => {
    it('creates attempt with intent stage event', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      expect(attempt.attemptId).toMatch(/^att_/);
      expect(attempt.workspaceRef).toBe('ws_test');
      expect(attempt.appRef).toBe('app_test');
      expect(attempt.archetype).toBe('treasury');
      expect(attempt.intentCurrency).toBe('USD');
      expect(attempt.settlementAsset).toBe('USDC');
      expect(attempt.chain).toBe('base');
      expect(attempt.finalState).toBe('pending');
      expect(attempt.stageEvents).toHaveLength(1);
      expect(attempt.stageEvents[0]!.stage).toBe('intent');
      expect(attempt.stageEvents[0]!.status).toBe('succeeded');
      expect(attempt.stageEvents[0]!.code).toBe('INTENT_CREATED');
    });

    it('accepts all 5 archetypes', async () => {
      const archetypes: Archetype[] = ['payroll', 'remittance', 'invoicing', 'treasury', 'micropayments'];
      for (const archetype of archetypes) {
        const attempt = await ledger.startAttempt({ ...TEST_INPUT, archetype });
        expect(attempt.archetype).toBe(archetype);
      }
    });

    it('accepts all 3 chains', async () => {
      for (const chain of ['base', 'ethereum', 'solana'] as const) {
        const attempt = await ledger.startAttempt({ ...TEST_INPUT, chain });
        expect(attempt.chain).toBe(chain);
      }
    });

    it('defaults providerRefs to empty object', async () => {
      const { providerRefs, ...inputWithout } = TEST_INPUT;
      const attempt = await ledger.startAttempt(inputWithout as StartAttemptInput);
      expect(attempt.providerRefs).toEqual({});
    });
  });

  describe('appendStageEvent', () => {
    it('adds events in forward order', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      const event: StageEvent = {
        stage: 'authorize',
        status: 'succeeded',
        actorSide: 'internal',
        code: 'AUTHORIZED',
        message: 'Payment authorized',
        timestamp: new Date().toISOString(),
      };

      const updated = await ledger.appendStageEvent(attempt.attemptId, event);
      expect(updated.stageEvents).toHaveLength(2);
      expect(updated.stageEvents[1]!.stage).toBe('authorize');
    });

    it('rejects out-of-order stages', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      // Add authorize stage
      await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'transmit',
        status: 'succeeded',
        actorSide: 'network',
        code: 'TX_BROADCAST',
        message: 'Broadcast',
        timestamp: new Date().toISOString(),
      });

      // Try to go backwards to authorize
      await expect(
        ledger.appendStageEvent(attempt.attemptId, {
          stage: 'authorize',
          status: 'succeeded',
          actorSide: 'internal',
          code: 'AUTHORIZED',
          message: 'Too late',
          timestamp: new Date().toISOString(),
        }),
      ).rejects.toThrow(/cannot follow/i);
    });

    it('allows same stage repeated (retry within stage)', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      const event: StageEvent = {
        stage: 'authorize',
        status: 'failed',
        actorSide: 'internal',
        code: 'AUTH_FAILED',
        message: 'First attempt',
        timestamp: new Date().toISOString(),
      };

      await ledger.appendStageEvent(attempt.attemptId, event);

      // Same stage again is OK (e.g., retry)
      const retry: StageEvent = {
        stage: 'authorize',
        status: 'succeeded',
        actorSide: 'internal',
        code: 'AUTHORIZED',
        message: 'Retry succeeded',
        timestamp: new Date().toISOString(),
      };

      const updated = await ledger.appendStageEvent(attempt.attemptId, retry);
      expect(updated.stageEvents).toHaveLength(3);
    });

    it('throws for unknown attempt', async () => {
      await expect(
        ledger.appendStageEvent('att_nonexistent', {
          stage: 'authorize',
          status: 'succeeded',
          actorSide: 'internal',
          code: 'AUTHORIZED',
          message: 'Test',
          timestamp: new Date().toISOString(),
        }),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('authorizeAttempt', () => {
    it('delegates to ReceiptLedger and creates authorize stage event', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      const { attempt: updated, receipt } = await ledger.authorizeAttempt(attempt.attemptId, {
        chain: 'base',
        token: 'USDC',
        amount: '5000',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        actorId: 'agent-1',
        metadata: { paymentType: 'treasury', purpose: 'test', counterpartyType: 'vendor' },
      });

      expect(receipt.receiptId).toMatch(/^rcpt_/);
      expect(receipt.decision).toBe('allow');
      expect(updated.stageEvents).toHaveLength(2);
      expect(updated.stageEvents[1]!.stage).toBe('authorize');
      expect(updated.stageEvents[1]!.status).toBe('succeeded');
      expect(updated.linkedReceiptIds).toContain(receipt.receiptId);
    });

    it('produces failed status and blocked finalState on block decision', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      // Use amount that exceeds max
      const { attempt: updated, receipt } = await ledger.authorizeAttempt(attempt.attemptId, {
        chain: 'base',
        token: 'USDC',
        amount: '999999',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        actorId: 'agent-1',
        metadata: { paymentType: 'treasury', purpose: 'test', counterpartyType: 'vendor' },
      });

      expect(receipt.decision).toBe('block');
      expect(updated.stageEvents[1]!.status).toBe('failed');
      expect(updated.finalState).toBe('blocked');
    });
  });

  describe('finalState derivation', () => {
    it('full lifecycle reaches succeeded', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);
      const ts = () => new Date().toISOString();

      await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'authorize', status: 'succeeded', actorSide: 'internal',
        code: 'AUTHORIZED', message: 'OK', timestamp: ts(),
      });
      await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'prepare', status: 'succeeded', actorSide: 'sender',
        code: 'TX_PREPARED', message: 'Gas estimated', timestamp: ts(),
      });
      await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'transmit', status: 'succeeded', actorSide: 'network',
        code: 'TX_BROADCAST', message: 'Broadcast to Base', timestamp: ts(),
      });
      await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'confirm', status: 'succeeded', actorSide: 'network',
        code: 'TX_CONFIRMED', message: '12 confirmations', timestamp: ts(),
      });
      const final = await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'recipient_credit', status: 'succeeded', actorSide: 'recipient',
        code: 'CREDITED', message: 'Recipient received funds', timestamp: ts(),
      });

      expect(final.finalState).toBe('succeeded');
    });

    it('failed transmit produces failed finalState', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'authorize', status: 'succeeded', actorSide: 'internal',
        code: 'AUTHORIZED', message: 'OK', timestamp: new Date().toISOString(),
      });

      const failed = await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'transmit', status: 'failed', actorSide: 'network',
        code: 'TX_REVERTED', message: 'Out of gas', timestamp: new Date().toISOString(),
      });

      expect(failed.finalState).toBe('failed');
    });

    it('refund produces refunded finalState', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      const refunded = await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'retry_or_refund', status: 'succeeded', actorSide: 'provider',
        code: 'REFUNDED', message: 'Funds returned', timestamp: new Date().toISOString(),
      });

      expect(refunded.finalState).toBe('refunded');
    });

    it('review status produces review finalState', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);

      const reviewed = await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'authorize', status: 'review', actorSide: 'internal',
        code: 'REQUIRES_REVIEW', message: 'Amount exceeds threshold', timestamp: new Date().toISOString(),
      });

      expect(reviewed.finalState).toBe('review');
    });
  });

  describe('getAttempt', () => {
    it('returns attempt by ID', async () => {
      const created = await ledger.startAttempt(TEST_INPUT);
      const found = await ledger.getAttempt(created.attemptId);
      expect(found).toBeDefined();
      expect(found!.attemptId).toBe(created.attemptId);
    });

    it('returns undefined for unknown ID', async () => {
      const found = await ledger.getAttempt('att_nonexistent');
      expect(found).toBeUndefined();
    });

    it('returns defensive copy', async () => {
      const created = await ledger.startAttempt(TEST_INPUT);
      const copy1 = await ledger.getAttempt(created.attemptId);
      const copy2 = await ledger.getAttempt(created.attemptId);
      expect(copy1).not.toBe(copy2);
      expect(copy1!.stageEvents).not.toBe(copy2!.stageEvents);
    });
  });

  describe('listAttempts', () => {
    it('lists all attempts', async () => {
      await ledger.startAttempt(TEST_INPUT);
      await ledger.startAttempt({ ...TEST_INPUT, archetype: 'payroll' });

      const all = ledger.listAttempts();
      expect(all).toHaveLength(2);
    });

    it('filters by archetype', async () => {
      await ledger.startAttempt(TEST_INPUT);
      await ledger.startAttempt({ ...TEST_INPUT, archetype: 'payroll' });

      const filtered = ledger.listAttempts({ archetype: 'payroll' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.archetype).toBe('payroll');
    });

    it('filters by chain', async () => {
      await ledger.startAttempt(TEST_INPUT);
      await ledger.startAttempt({ ...TEST_INPUT, chain: 'ethereum' });

      const filtered = ledger.listAttempts({ chain: 'ethereum' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.chain).toBe('ethereum');
    });

    it('filters by finalState', async () => {
      const attempt = await ledger.startAttempt(TEST_INPUT);
      await ledger.appendStageEvent(attempt.attemptId, {
        stage: 'authorize', status: 'failed', actorSide: 'internal',
        code: 'BLOCKED', message: 'Blocked', timestamp: new Date().toISOString(),
      });
      await ledger.startAttempt({ ...TEST_INPUT, archetype: 'payroll' });

      const blocked = ledger.listAttempts({ finalState: 'blocked' });
      expect(blocked).toHaveLength(1);

      const pending = ledger.listAttempts({ finalState: 'pending' });
      expect(pending).toHaveLength(1);
    });
  });

  describe('STAGE_ORDER', () => {
    it('has 8 stages in correct order', () => {
      expect(STAGE_ORDER).toEqual([
        'intent', 'authorize', 'prepare', 'transmit', 'confirm',
        'recipient_credit', 'reconcile', 'retry_or_refund',
      ]);
    });
  });
});
