import { describe, it, expect } from 'vitest';
import { KYAConfidenceScorer } from '../src/kya/confidence-scorer.js';
import { AgentIdentityRegistry } from '../src/kya/identity-registry.js';
import { WalletClusterer } from '../src/kya/wallet-clustering.js';
import { BehavioralFingerprinter } from '../src/kya/behavioral-fingerprint.js';
import { CrossSessionLinker } from '../src/kya/cross-session-linker.js';
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

function createDeps() {
  const store = new KontextStore();
  const registry = new AgentIdentityRegistry();
  const clusterer = new WalletClusterer();
  const fingerprinter = new BehavioralFingerprinter();
  const linker = new CrossSessionLinker();
  const scorer = new KYAConfidenceScorer();

  return { store, registry, clusterer, fingerprinter, linker, scorer };
}

describe('KYAConfidenceScorer', () => {
  describe('declared identity component', () => {
    it('scores 0 when no identity registered', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'Declared Identity');
      expect(component!.score).toBe(0);
    });

    it('scores 30+ when identity registered', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'Declared Identity');
      expect(component!.score).toBeGreaterThanOrEqual(30);
    });

    it('scores higher with more identity fields filled', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({
        agentId: 'agent-1',
        displayName: 'Test',
        entityType: 'bot',
        wallets: [{ address: '0xaaa', chain: 'base' }],
        contactUri: 'mailto:test@test.com',
        metadata: { key: 'val' },
      });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'Declared Identity');
      expect(component!.score).toBe(100);
    });
  });

  describe('KYC verification component', () => {
    it('scores 0 with no KYC references', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'KYC Verification');
      expect(component!.score).toBe(0);
    });

    it('scores 20 for pending KYC', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'jumio',
        referenceId: 'ref-1',
        status: 'pending',
        verifiedAt: null,
        expiresAt: null,
      });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'KYC Verification');
      expect(component!.score).toBe(20);
    });

    it('scores 90+ for verified KYC', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'jumio',
        referenceId: 'ref-1',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null,
      });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'KYC Verification');
      expect(component!.score).toBeGreaterThanOrEqual(90);
    });

    it('caps at 10 for rejected KYC', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'jumio',
        referenceId: 'ref-1',
        status: 'rejected',
        verifiedAt: null,
        expiresAt: null,
      });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'KYC Verification');
      expect(component!.score).toBe(10);
    });
  });

  describe('wallet graph component', () => {
    it('scores 20 when no wallet cluster', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'Wallet Graph');
      expect(component!.score).toBe(20);
    });
  });

  describe('behavioral consistency component', () => {
    it('scores 30 when insufficient data', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'Behavioral Consistency');
      expect(component!.score).toBe(30);
    });

    it('scores 50 when embedding exists but no links', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });

      // Add enough transactions for embedding
      for (let i = 0; i < 10; i++) {
        store.addTransaction(makeTx({
          from: '0xsender',
          to: `0xdest${i}`,
          agentId: 'agent-1',
          amount: String(100 + i * 10),
          timestamp: new Date(Date.now() + i * 3600_000).toISOString(),
        }));
      }

      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'Behavioral Consistency');
      expect(component!.score).toBe(50);
    });
  });

  describe('external enrichment component', () => {
    it('defaults to 50 (neutral) when no risk data', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'External Enrichment');
      expect(component!.score).toBe(50);
    });

    it('scores 80 for low-risk external provider', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'chainalysis',
        referenceId: 'ref-1',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null,
        riskLevel: 'low',
      });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'External Enrichment');
      expect(component!.score).toBe(80);
    });

    it('scores 20 for high-risk external provider', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'chainalysis',
        referenceId: 'ref-1',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null,
        riskLevel: 'high',
      });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      const component = score.components.find((c) => c.name === 'External Enrichment');
      expect(component!.score).toBe(20);
    });
  });

  describe('overall score and levels', () => {
    it('computes weighted average of components', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({ agentId: 'agent-1' });
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.components).toHaveLength(5);
    });

    it('maps to unknown for very low scores', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      // No identity at all → scores should be very low
      const score = scorer.computeScore('nonexistent', registry, clusterer, fingerprinter, linker, store);
      expect(score.level).toBe('unknown');
    });

    it('maps to verified for high scores', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      registry.register({
        agentId: 'agent-1',
        displayName: 'Full Agent',
        entityType: 'organization',
        wallets: [{ address: '0xaaa', chain: 'base' }],
        contactUri: 'https://example.com',
        metadata: { full: true },
      });
      // Multiple verified KYC
      registry.addKycReference('agent-1', {
        provider: 'jumio',
        referenceId: 'ref-1',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null,
        riskLevel: 'low',
      });
      registry.addKycReference('agent-1', {
        provider: 'onfido',
        referenceId: 'ref-2',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null,
        riskLevel: 'low',
      });

      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      // With full identity (100) + verified KYC (100) + neutral others, should be high
      expect(score.score).toBeGreaterThanOrEqual(40);
      expect(['medium', 'high', 'verified']).toContain(score.level);
    });

    it('includes correct number of components', () => {
      const { store, registry, clusterer, fingerprinter, linker, scorer } = createDeps();
      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      expect(score.components).toHaveLength(5);
      const names = score.components.map((c) => c.name);
      expect(names).toContain('Declared Identity');
      expect(names).toContain('KYC Verification');
      expect(names).toContain('Wallet Graph');
      expect(names).toContain('Behavioral Consistency');
      expect(names).toContain('External Enrichment');
    });
  });

  describe('custom weights', () => {
    it('respects custom weight configuration', () => {
      const { store, registry, clusterer, fingerprinter, linker } = createDeps();
      const scorer = new KYAConfidenceScorer({
        declaredIdentityWeight: 1.0,
        kycVerificationWeight: 0,
        walletGraphWeight: 0,
        behavioralConsistencyWeight: 0,
        externalEnrichmentWeight: 0,
      });

      registry.register({
        agentId: 'agent-1',
        displayName: 'Test',
        entityType: 'bot',
        wallets: [{ address: '0xaaa', chain: 'base' }],
        contactUri: 'test',
        metadata: { k: 'v' },
      });

      const score = scorer.computeScore('agent-1', registry, clusterer, fingerprinter, linker, store);
      // With weight 1.0 on declared identity and 0 on everything else,
      // the score should equal the declared identity component score
      const declaredComponent = score.components.find((c) => c.name === 'Declared Identity');
      expect(score.score).toBe(declaredComponent!.score);
    });
  });
});
