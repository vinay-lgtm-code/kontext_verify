import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';
import type { StartAttemptInput, KontextConfig } from '../src/index.js';

const TEST_SDK_CONFIG: KontextConfig = {
  projectId: 'test-project',
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

const TEST_ATTEMPT: StartAttemptInput = {
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

describe('Kontext SDK Client', () => {
  let kontext: Kontext;

  beforeEach(() => {
    kontext = Kontext.inMemory(TEST_SDK_CONFIG);
  });

  afterEach(async () => {
    await kontext.destroy();
  });

  describe('start', () => {
    it('creates attempt with intent stage', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);
      expect(attempt.attemptId).toMatch(/^att_/);
      expect(attempt.finalState).toBe('pending');
      expect(attempt.stageEvents).toHaveLength(1);
      expect(attempt.stageEvents[0]!.stage).toBe('intent');
    });
  });

  describe('broadcast', () => {
    it('adds transmit stage event', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);
      const updated = await kontext.broadcast(attempt.attemptId, '0xabc123');

      expect(updated.stageEvents).toHaveLength(2);
      expect(updated.stageEvents[1]!.stage).toBe('transmit');
      expect(updated.stageEvents[1]!.payload!['txHash']).toBe('0xabc123');
    });
  });

  describe('confirm', () => {
    it('adds confirm stage event', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);
      await kontext.broadcast(attempt.attemptId, '0xabc123');
      const updated = await kontext.confirm(attempt.attemptId, {
        txHash: '0xabc123',
        blockNumber: 12345,
        confirmations: 12,
      });

      expect(updated.stageEvents).toHaveLength(3);
      expect(updated.stageEvents[2]!.stage).toBe('confirm');
    });
  });

  describe('credit', () => {
    it('produces succeeded finalState', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);
      await kontext.broadcast(attempt.attemptId, '0xabc123');
      await kontext.confirm(attempt.attemptId, {
        txHash: '0xabc123',
        confirmations: 12,
      });
      const updated = await kontext.credit(attempt.attemptId, {
        confirmedAt: new Date().toISOString(),
      });

      expect(updated.finalState).toBe('succeeded');
    });
  });

  describe('fail', () => {
    it('produces failed finalState', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);
      const updated = await kontext.fail(attempt.attemptId, 'Out of gas');

      expect(updated.finalState).toBe('failed');
    });
  });

  describe('refund', () => {
    it('produces refunded finalState', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);
      const updated = await kontext.refund(attempt.attemptId, {
        reason: 'Customer requested refund',
        refundTxHash: '0xrefund123',
      });

      expect(updated.finalState).toBe('refunded');
    });
  });

  describe('authorize', () => {
    it('integrates receipt into attempt', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);
      const { attempt: updated, receipt } = await kontext.authorize(attempt.attemptId, {
        chain: 'base',
        token: 'USDC',
        amount: '5000',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        actorId: 'agent-1',
        metadata: { paymentType: 'treasury', purpose: 'test', counterpartyType: 'vendor' },
      });

      expect(receipt.decision).toBe('allow');
      expect(updated.stageEvents).toHaveLength(2);
      expect(updated.stageEvents[1]!.stage).toBe('authorize');
      expect(updated.linkedReceiptIds).toContain(receipt.receiptId);
    });
  });

  describe('get', () => {
    it('retrieves attempt by ID', async () => {
      const created = await kontext.start(TEST_ATTEMPT);
      const found = await kontext.get(created.attemptId);
      expect(found).toBeDefined();
      expect(found!.attemptId).toBe(created.attemptId);
    });
  });

  describe('list', () => {
    it('lists all attempts', async () => {
      await kontext.start(TEST_ATTEMPT);
      await kontext.start({ ...TEST_ATTEMPT, archetype: 'payroll' });
      const all = kontext.list();
      expect(all).toHaveLength(2);
    });
  });

  describe('full lifecycle', () => {
    it('intent -> authorize -> prepare -> transmit -> confirm -> credit = succeeded', async () => {
      const attempt = await kontext.start(TEST_ATTEMPT);

      // Authorize
      await kontext.authorize(attempt.attemptId, {
        chain: 'base',
        token: 'USDC',
        amount: '5000',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        actorId: 'agent-1',
        metadata: { paymentType: 'treasury', purpose: 'test', counterpartyType: 'vendor' },
      });

      // Prepare
      await kontext.record(attempt.attemptId, 'prepare', {
        status: 'succeeded',
        actorSide: 'sender',
        code: 'TX_PREPARED',
        message: 'Gas estimated at 0.001 ETH',
        timestamp: new Date().toISOString(),
      });

      // Transmit
      await kontext.broadcast(attempt.attemptId, '0xdeadbeef');

      // Confirm
      await kontext.confirm(attempt.attemptId, {
        txHash: '0xdeadbeef',
        blockNumber: 99999,
        confirmations: 12,
      });

      // Recipient credited
      const final = await kontext.credit(attempt.attemptId, {
        confirmedAt: new Date().toISOString(),
      });

      expect(final.finalState).toBe('succeeded');
      expect(final.stageEvents).toHaveLength(6);
      expect(final.stageEvents.map(e => e.stage)).toEqual([
        'intent', 'authorize', 'prepare', 'transmit', 'confirm', 'recipient_credit',
      ]);
    });
  });
});
