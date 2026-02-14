import { describe, it, expect } from 'vitest';
import { UnionFind, WalletClusterer } from '../src/kya/wallet-clustering.js';
import { AgentIdentityRegistry } from '../src/kya/identity-registry.js';
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

describe('UnionFind', () => {
  it('initially each element is its own root', () => {
    const uf = new UnionFind();
    expect(uf.find('a')).toBe('a');
    expect(uf.find('b')).toBe('b');
    expect(uf.connected('a', 'b')).toBe(false);
  });

  it('unions two elements', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    expect(uf.connected('a', 'b')).toBe(true);
  });

  it('transitive union', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.union('b', 'c');
    expect(uf.connected('a', 'c')).toBe(true);
  });

  it('getComponents returns all components', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.union('c', 'd');
    uf.find('e'); // standalone
    const components = uf.getComponents();
    expect(components).toHaveLength(3);

    const sizes = components.map((c) => c.length).sort();
    expect(sizes).toEqual([1, 2, 2]);
  });

  it('getComponentOf returns the component containing x', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.union('a', 'c');
    const component = uf.getComponentOf('b');
    expect(component.sort()).toEqual(['a', 'b', 'c']);
  });

  it('union is idempotent', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.union('a', 'b');
    expect(uf.getComponents()).toHaveLength(1);
  });
});

describe('WalletClusterer', () => {
  describe('common-agent heuristic', () => {
    it('clusters addresses used by the same agent', () => {
      const store = new KontextStore();
      store.addTransaction(makeTx({ from: '0xaaa', to: '0xddd', agentId: 'agent-1' }));
      store.addTransaction(makeTx({ from: '0xbbb', to: '0xeee', agentId: 'agent-1' }));

      const clusterer = new WalletClusterer();
      const clusters = clusterer.analyzeFromStore(store);

      // 0xaaa and 0xbbb should be in the same cluster
      const cluster = clusters.find(
        (c) => c.addresses.includes('0xaaa') && c.addresses.includes('0xbbb'),
      );
      expect(cluster).toBeDefined();
      expect(
        cluster!.evidence.some((e) => e.heuristic === 'common-agent'),
      ).toBe(true);
    });
  });

  describe('funding-chain heuristic', () => {
    it('clusters sender and receiver when sender is agent-associated', () => {
      const store = new KontextStore();
      store.addTransaction(makeTx({ from: '0xaaa', to: '0xbbb', agentId: 'agent-1' }));

      const clusterer = new WalletClusterer();
      const clusters = clusterer.analyzeFromStore(store);

      const cluster = clusters.find(
        (c) => c.addresses.includes('0xaaa') && c.addresses.includes('0xbbb'),
      );
      expect(cluster).toBeDefined();
    });
  });

  describe('gas-sponsorship heuristic', () => {
    it('clusters a gas sponsor with 3+ agent wallets', () => {
      const store = new KontextStore();
      // Gas sponsor 0xgas sends to 3+ agent wallets
      store.addTransaction(makeTx({ from: '0xgas', to: '0xa1', agentId: 'agent-1' }));
      store.addTransaction(makeTx({ from: '0xgas', to: '0xa2', agentId: 'agent-2' }));
      store.addTransaction(makeTx({ from: '0xgas', to: '0xa3', agentId: 'agent-3' }));
      // Each agent wallet also sends (to be agent-associated)
      store.addTransaction(makeTx({ from: '0xa1', to: '0xext', agentId: 'agent-1' }));
      store.addTransaction(makeTx({ from: '0xa2', to: '0xext', agentId: 'agent-2' }));
      store.addTransaction(makeTx({ from: '0xa3', to: '0xext', agentId: 'agent-3' }));

      const clusterer = new WalletClusterer();
      const clusters = clusterer.analyzeFromStore(store);

      // 0xgas should be in a cluster with agent wallets
      const gasCluster = clusters.find(
        (c) => c.addresses.includes('0xgas'),
      );
      expect(gasCluster).toBeDefined();
    });
  });

  describe('temporal-co-spending heuristic', () => {
    it('clusters addresses transacting within temporal window to same destinations', () => {
      const store = new KontextStore();
      const baseTime = new Date('2026-01-01T12:00:00Z');

      store.addTransaction(makeTx({
        from: '0xaaa',
        to: '0xdest',
        agentId: 'agent-1',
        timestamp: baseTime.toISOString(),
      }));
      store.addTransaction(makeTx({
        from: '0xbbb',
        to: '0xdest',
        agentId: 'agent-2',
        timestamp: new Date(baseTime.getTime() + 30_000).toISOString(), // 30s later
      }));

      const clusterer = new WalletClusterer({ temporalWindowSeconds: 60, minDestinationOverlap: 0.3 });
      const clusters = clusterer.analyzeFromStore(store);

      const cluster = clusters.find(
        (c) => c.addresses.includes('0xaaa') && c.addresses.includes('0xbbb'),
      );
      expect(cluster).toBeDefined();
    });
  });

  describe('declared-wallets heuristic', () => {
    it('clusters wallets declared by the same identity', () => {
      const store = new KontextStore();
      const registry = new AgentIdentityRegistry();
      registry.register({
        agentId: 'agent-1',
        wallets: [
          { address: '0xWALLET1', chain: 'ethereum' },
          { address: '0xWALLET2', chain: 'ethereum' },
        ],
      });

      // Add a transaction so addresses are in the union-find
      store.addTransaction(makeTx({ from: '0xwallet1', to: '0xother', agentId: 'agent-1' }));

      const clusterer = new WalletClusterer();
      const clusters = clusterer.analyzeFromStore(store, registry);

      const cluster = clusters.find(
        (c) => c.addresses.includes('0xwallet1') && c.addresses.includes('0xwallet2'),
      );
      expect(cluster).toBeDefined();
      expect(cluster!.evidence.some((e) => e.heuristic === 'declared-wallets')).toBe(true);
    });
  });

  describe('cache', () => {
    it('getClusters returns empty before analysis', () => {
      const clusterer = new WalletClusterer();
      expect(clusterer.getClusters()).toEqual([]);
    });

    it('getClusters returns cached results', () => {
      const store = new KontextStore();
      store.addTransaction(makeTx({ from: '0xa', to: '0xb', agentId: 'a1' }));

      const clusterer = new WalletClusterer();
      const result = clusterer.analyzeFromStore(store);
      expect(clusterer.getClusters()).toEqual(result);
    });

    it('invalidateCache clears cached results', () => {
      const store = new KontextStore();
      store.addTransaction(makeTx({ from: '0xa', to: '0xb', agentId: 'a1' }));

      const clusterer = new WalletClusterer();
      clusterer.analyzeFromStore(store);
      clusterer.invalidateCache();
      expect(clusterer.getClusters()).toEqual([]);
    });
  });
});
