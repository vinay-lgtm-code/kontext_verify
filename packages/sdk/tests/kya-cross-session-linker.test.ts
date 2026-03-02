import { describe, it, expect } from 'vitest';
import { CrossSessionLinker } from '../src/kya/cross-session-linker.js';
import { AgentIdentityRegistry } from '../src/kya/identity-registry.js';
import { WalletClusterer } from '../src/kya/wallet-clustering.js';
import { BehavioralFingerprinter } from '../src/kya/behavioral-fingerprint.js';
import { KontextStore } from '../src/store.js';
import type { TransactionRecord } from '../src/types.js';

function makeTx(overrides: Partial<TransactionRecord> & { from: string; to: string; agentId: string }): TransactionRecord {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    projectId: 'test',
    agentId: overrides.agentId,
    correlationId: 'corr-1',
    type: 'transaction',
    description: 'test tx',
    metadata: {},
    txHash: `0x${Math.random().toString(16).slice(2)}`,
    chain: overrides.chain ?? 'base',
    amount: overrides.amount ?? '100',
    token: overrides.token ?? 'USDC',
    from: overrides.from,
    to: overrides.to,
  };
}

describe('CrossSessionLinker', () => {
  describe('analyzeAndLink', () => {
    it('creates a link when agents share declared wallets', () => {
      const store = new KontextStore();
      const registry = new AgentIdentityRegistry();
      const clusterer = new WalletClusterer();
      const fingerprinter = new BehavioralFingerprinter();

      // Add transactions for both agents
      for (let i = 0; i < 6; i++) {
        store.addTransaction(makeTx({
          from: '0xshared',
          to: `0xdest${i}`,
          agentId: 'agent-a',
          amount: String(100 + i * 10),
          timestamp: new Date(Date.now() + i * 3600_000).toISOString(),
        }));
        store.addTransaction(makeTx({
          from: '0xshared',
          to: `0xdest${i}`,
          agentId: 'agent-b',
          amount: String(100 + i * 10),
          timestamp: new Date(Date.now() + i * 3600_000 + 1000).toISOString(),
        }));
      }

      // Both agents declare the same wallet
      registry.register({
        agentId: 'agent-a',
        wallets: [{ address: '0xShared', chain: 'base' }],
      });
      registry.register({
        agentId: 'agent-b',
        wallets: [{ address: '0xShared', chain: 'base' }],
      });

      // Run clustering first
      clusterer.analyzeFromStore(store, registry);

      const linker = new CrossSessionLinker({ minLinkConfidence: 0.2 });
      const links = linker.analyzeAndLink(store, registry, clusterer, fingerprinter);

      expect(links.length).toBeGreaterThanOrEqual(1);
      const link = links.find(
        (l) =>
          (l.agentIdA === 'agent-a' && l.agentIdB === 'agent-b') ||
          (l.agentIdA === 'agent-b' && l.agentIdB === 'agent-a'),
      );
      expect(link).toBeDefined();
      expect(link!.signals.some((s) => s.type === 'declared-identity')).toBe(true);
    });

    it('does not link agents below confidence threshold', () => {
      const store = new KontextStore();
      const registry = new AgentIdentityRegistry();
      const clusterer = new WalletClusterer();
      const fingerprinter = new BehavioralFingerprinter();

      // Two completely different agents with no overlap
      store.addTransaction(makeTx({ from: '0xaaa', to: '0xbbb', agentId: 'agent-a' }));
      store.addTransaction(makeTx({ from: '0xccc', to: '0xddd', agentId: 'agent-b' }));

      registry.register({ agentId: 'agent-a' });
      registry.register({ agentId: 'agent-b' });
      clusterer.analyzeFromStore(store, registry);

      const linker = new CrossSessionLinker({ minLinkConfidence: 0.6 });
      const links = linker.analyzeAndLink(store, registry, clusterer, fingerprinter);

      // No links should be created since they have no overlap and insufficient txs
      expect(links).toHaveLength(0);
    });
  });

  describe('manual link / review', () => {
    it('creates a confirmed manual link', () => {
      const linker = new CrossSessionLinker();
      const link = linker.manualLink('agent-a', 'agent-b', 'admin');

      expect(link.status).toBe('confirmed');
      expect(link.confidence).toBe(1.0);
      expect(link.reviewedBy).toBe('admin');
    });

    it('updates an existing inferred link to confirmed', () => {
      const store = new KontextStore();
      const registry = new AgentIdentityRegistry();
      const clusterer = new WalletClusterer();
      const fingerprinter = new BehavioralFingerprinter();

      for (let i = 0; i < 6; i++) {
        store.addTransaction(makeTx({
          from: '0xshared',
          to: `0xdest${i}`,
          agentId: 'agent-a',
          amount: String(100 + i * 10),
          timestamp: new Date(Date.now() + i * 3600_000).toISOString(),
        }));
        store.addTransaction(makeTx({
          from: '0xshared',
          to: `0xdest${i}`,
          agentId: 'agent-b',
          amount: String(100 + i * 10),
          timestamp: new Date(Date.now() + i * 3600_000 + 1000).toISOString(),
        }));
      }

      registry.register({
        agentId: 'agent-a',
        wallets: [{ address: '0xShared', chain: 'base' }],
      });
      registry.register({
        agentId: 'agent-b',
        wallets: [{ address: '0xShared', chain: 'base' }],
      });

      clusterer.analyzeFromStore(store, registry);
      const linker = new CrossSessionLinker({ minLinkConfidence: 0.2 });
      linker.analyzeAndLink(store, registry, clusterer, fingerprinter);

      const confirmed = linker.manualLink('agent-a', 'agent-b', 'admin');
      expect(confirmed.status).toBe('confirmed');
    });

    it('reviews a link and changes status', () => {
      const linker = new CrossSessionLinker();
      const link = linker.manualLink('agent-a', 'agent-b', 'admin');

      const rejected = linker.reviewLink(link.id, 'rejected', 'reviewer');
      expect(rejected).toBeDefined();
      expect(rejected!.status).toBe('rejected');
    });

    it('reviewLink returns undefined for unknown link ID', () => {
      const linker = new CrossSessionLinker();
      expect(linker.reviewLink('unknown-id', 'confirmed', 'admin')).toBeUndefined();
    });
  });

  describe('queries', () => {
    it('getLinkedAgents returns linked agent IDs', () => {
      const linker = new CrossSessionLinker();
      linker.manualLink('a', 'b', 'admin');
      linker.manualLink('a', 'c', 'admin');

      expect(linker.getLinkedAgents('a').sort()).toEqual(['b', 'c']);
      expect(linker.getLinkedAgents('b')).toEqual(['a']);
    });

    it('getLinkedAgents excludes rejected links', () => {
      const linker = new CrossSessionLinker();
      const link = linker.manualLink('a', 'b', 'admin');
      linker.reviewLink(link.id, 'rejected', 'admin');

      expect(linker.getLinkedAgents('a')).toEqual([]);
    });

    it('getLinksForAgent returns all links for an agent', () => {
      const linker = new CrossSessionLinker();
      linker.manualLink('a', 'b', 'admin');
      linker.manualLink('a', 'c', 'admin');
      linker.manualLink('d', 'e', 'admin');

      expect(linker.getLinksForAgent('a')).toHaveLength(2);
      expect(linker.getLinksForAgent('d')).toHaveLength(1);
    });

    it('getAllLinks returns all links', () => {
      const linker = new CrossSessionLinker();
      linker.manualLink('a', 'b', 'admin');
      linker.manualLink('c', 'd', 'admin');

      expect(linker.getAllLinks()).toHaveLength(2);
    });
  });
});
