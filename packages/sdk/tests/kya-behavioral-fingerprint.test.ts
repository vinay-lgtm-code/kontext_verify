import { describe, it, expect } from 'vitest';
import { BehavioralFingerprinter } from '../src/kya/behavioral-fingerprint.js';
import { KontextStore } from '../src/store.js';
import type { TransactionRecord } from '../src/types.js';

function makeTx(overrides: Partial<TransactionRecord>): TransactionRecord {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    projectId: 'test',
    agentId: overrides.agentId ?? 'agent-1',
    correlationId: 'corr-1',
    type: 'transaction',
    description: 'test tx',
    metadata: {},
    txHash: `0x${Math.random().toString(16).slice(2)}`,
    chain: overrides.chain ?? 'base',
    amount: overrides.amount ?? '100',
    token: overrides.token ?? 'USDC',
    from: overrides.from ?? '0xsender',
    to: overrides.to ?? '0xreceiver',
  };
}

function createStoreWithTxs(agentId: string, count: number, options?: {
  baseTime?: Date;
  intervalMs?: number;
  amounts?: number[];
  destinations?: string[];
  chains?: string[];
  tokens?: string[];
}): KontextStore {
  const store = new KontextStore();
  const baseTime = options?.baseTime ?? new Date('2026-01-15T10:00:00Z');
  const intervalMs = options?.intervalMs ?? 3600_000; // 1 hour default

  for (let i = 0; i < count; i++) {
    store.addTransaction(makeTx({
      agentId,
      timestamp: new Date(baseTime.getTime() + i * intervalMs).toISOString(),
      amount: String(options?.amounts?.[i] ?? 100 + i * 10),
      to: options?.destinations?.[i % (options?.destinations?.length ?? 1)] ?? `0xdest${i}`,
      chain: (options?.chains?.[i % (options?.chains?.length ?? 1)] ?? 'base') as any,
      token: (options?.tokens?.[i % (options?.tokens?.length ?? 1)] ?? 'USDC') as any,
    }));
  }
  return store;
}

describe('BehavioralFingerprinter', () => {
  const fp = new BehavioralFingerprinter();

  describe('computeEmbedding', () => {
    it('returns null with fewer than 5 transactions', () => {
      const store = createStoreWithTxs('agent-1', 4);
      expect(fp.computeEmbedding('agent-1', store)).toBeNull();
    });

    it('returns an embedding with 5+ transactions', () => {
      const store = createStoreWithTxs('agent-1', 10);
      const embedding = fp.computeEmbedding('agent-1', store);

      expect(embedding).not.toBeNull();
      expect(embedding!.agentId).toBe('agent-1');
      expect(embedding!.sampleSize).toBe(10);
      expect(embedding!.temporal.hourHistogram).toHaveLength(24);
      expect(embedding!.temporal.dayHistogram).toHaveLength(7);
    });

    it('extracts correct temporal features', () => {
      const store = createStoreWithTxs('agent-1', 6, {
        intervalMs: 60_000, // 1 min apart
      });
      const embedding = fp.computeEmbedding('agent-1', store);

      expect(embedding!.temporal.meanIntervalSeconds).toBeCloseTo(60, 0);
      expect(embedding!.temporal.stddevIntervalSeconds).toBeCloseTo(0, 0);
    });

    it('extracts correct financial features', () => {
      const store = createStoreWithTxs('agent-1', 5, {
        amounts: [100, 200, 300, 400, 500],
      });
      const embedding = fp.computeEmbedding('agent-1', store);

      expect(embedding!.financial.meanAmount).toBe(300);
      expect(embedding!.financial.medianAmount).toBe(300);
      expect(embedding!.financial.roundAmountRatio).toBe(1); // all divisible by 100
    });

    it('computes network features', () => {
      const store = createStoreWithTxs('agent-1', 6, {
        destinations: ['0xA', '0xA', '0xB'],
      });
      const embedding = fp.computeEmbedding('agent-1', store);

      expect(embedding!.network.uniqueDestinations).toBe(2);
      expect(embedding!.network.reuseRatio).toBeGreaterThan(0);
    });

    it('computes operational features', () => {
      const store = createStoreWithTxs('agent-1', 6, {
        chains: ['base', 'ethereum'],
        tokens: ['USDC', 'USDT'],
      });
      const embedding = fp.computeEmbedding('agent-1', store);

      expect(embedding!.operational.chainDistribution).toHaveProperty('base');
      expect(embedding!.operational.chainDistribution).toHaveProperty('ethereum');
      expect(embedding!.operational.tokenDistribution).toHaveProperty('USDC');
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical embeddings', () => {
      const store = createStoreWithTxs('agent-1', 10);
      const embedding = fp.computeEmbedding('agent-1', store)!;

      const similarity = fp.cosineSimilarity(embedding, embedding);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('returns high similarity for similar agents', () => {
      // Two agents with very similar patterns
      const storeA = createStoreWithTxs('agent-a', 10, {
        amounts: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
        destinations: ['0xdest1', '0xdest2'],
      });
      const storeB = createStoreWithTxs('agent-b', 10, {
        amounts: [105, 205, 305, 405, 505, 605, 705, 805, 905, 1005],
        destinations: ['0xdest1', '0xdest2'],
      });

      // Combine stores by adding B's txs to A's store
      for (const tx of storeB.getTransactions()) {
        storeA.addTransaction(tx);
      }

      const embA = fp.computeEmbedding('agent-a', storeA)!;
      const embB = fp.computeEmbedding('agent-b', storeA)!;

      const similarity = fp.cosineSimilarity(embA, embB);
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('returns lower similarity for dissimilar agents', () => {
      const store = new KontextStore();

      // Agent A: small, frequent, single destination
      for (let i = 0; i < 10; i++) {
        store.addTransaction(makeTx({
          agentId: 'agent-a',
          amount: String(10 + i),
          to: '0xsingle',
          timestamp: new Date(Date.now() + i * 60_000).toISOString(),
          chain: 'base',
          token: 'USDC',
        }));
      }

      // Agent B: large, infrequent, many destinations
      for (let i = 0; i < 10; i++) {
        store.addTransaction(makeTx({
          agentId: 'agent-b',
          amount: String(10000 + i * 5000),
          to: `0xdest${i}`,
          timestamp: new Date(Date.now() + i * 86400_000).toISOString(),
          chain: 'ethereum',
          token: 'DAI',
        }));
      }

      const embA = fp.computeEmbedding('agent-a', store)!;
      const embB = fp.computeEmbedding('agent-b', store)!;

      const similarity = fp.cosineSimilarity(embA, embB);
      // Should be noticeably lower than identical (1.0)
      expect(similarity).toBeLessThan(1.0);
    });
  });
});
