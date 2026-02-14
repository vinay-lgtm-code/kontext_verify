import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/client.js';
import { isFeatureAvailable, requirePlan } from '../src/plan-gate.js';

function createClient(plan: 'free' | 'pro' | 'enterprise' = 'enterprise') {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
    plan,
  });
}

describe('KYA Plan Gating', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  describe('isFeatureAvailable', () => {
    it('blocks kya-identity on free plan', () => {
      expect(isFeatureAvailable('kya-identity', 'free')).toBe(false);
    });

    it('allows kya-identity on pro plan', () => {
      expect(isFeatureAvailable('kya-identity', 'pro')).toBe(true);
    });

    it('allows kya-identity on enterprise plan', () => {
      expect(isFeatureAvailable('kya-identity', 'enterprise')).toBe(true);
    });

    it('blocks kya-behavioral on free plan', () => {
      expect(isFeatureAvailable('kya-behavioral', 'free')).toBe(false);
    });

    it('blocks kya-behavioral on pro plan', () => {
      expect(isFeatureAvailable('kya-behavioral', 'pro')).toBe(false);
    });

    it('allows kya-behavioral on enterprise plan', () => {
      expect(isFeatureAvailable('kya-behavioral', 'enterprise')).toBe(true);
    });
  });

  describe('requirePlan', () => {
    it('throws for kya-identity on free plan', () => {
      expect(() => requirePlan('kya-identity', 'free')).toThrow(/Pro plan/);
    });

    it('does not throw for kya-identity on pro plan', () => {
      expect(() => requirePlan('kya-identity', 'pro')).not.toThrow();
    });

    it('throws for kya-behavioral on pro plan', () => {
      expect(() => requirePlan('kya-behavioral', 'pro')).toThrow(/Enterprise plan/);
    });

    it('does not throw for kya-behavioral on enterprise plan', () => {
      expect(() => requirePlan('kya-behavioral', 'enterprise')).not.toThrow();
    });
  });

  describe('client: Phase 1 (Pro tier) methods', () => {
    it('registerAgentIdentity requires pro plan', () => {
      kontext = createClient('free');
      expect(() =>
        kontext.registerAgentIdentity({ agentId: 'agent-1' }),
      ).toThrow(/Pro plan/);
    });

    it('registerAgentIdentity works on pro plan', () => {
      kontext = createClient('pro');
      const identity = kontext.registerAgentIdentity({ agentId: 'agent-1' });
      expect(identity.agentId).toBe('agent-1');
    });

    it('getAgentIdentity requires pro plan', () => {
      kontext = createClient('free');
      expect(() => kontext.getAgentIdentity('agent-1')).toThrow(/Pro plan/);
    });

    it('updateAgentIdentity requires pro plan', () => {
      kontext = createClient('free');
      expect(() =>
        kontext.updateAgentIdentity('agent-1', { displayName: 'x' }),
      ).toThrow(/Pro plan/);
    });

    it('removeAgentIdentity requires pro plan', () => {
      kontext = createClient('free');
      expect(() => kontext.removeAgentIdentity('agent-1')).toThrow(/Pro plan/);
    });

    it('addAgentWallet requires pro plan', () => {
      kontext = createClient('free');
      expect(() =>
        kontext.addAgentWallet('agent-1', { address: '0x123', chain: 'base' }),
      ).toThrow(/Pro plan/);
    });

    it('lookupAgentByWallet requires pro plan', () => {
      kontext = createClient('free');
      expect(() => kontext.lookupAgentByWallet('0x123')).toThrow(/Pro plan/);
    });

    it('getWalletClusters requires pro plan', () => {
      kontext = createClient('free');
      expect(() => kontext.getWalletClusters()).toThrow(/Pro plan/);
    });

    it('getKYAExport requires pro plan', () => {
      kontext = createClient('free');
      expect(() => kontext.getKYAExport()).toThrow(/Pro plan/);
    });

    it('Phase 1 methods work on enterprise plan', () => {
      kontext = createClient('enterprise');
      kontext.registerAgentIdentity({ agentId: 'agent-1' });
      expect(kontext.getAgentIdentity('agent-1')).toBeDefined();
      kontext.addAgentWallet('agent-1', { address: '0xabc', chain: 'base' });
      expect(kontext.lookupAgentByWallet('0xabc')?.agentId).toBe('agent-1');
      expect(kontext.getWalletClusters()).toBeDefined();
      expect(kontext.getKYAExport()).toBeDefined();
    });
  });

  describe('client: Phase 2 (Enterprise tier) methods', () => {
    it('computeBehavioralEmbedding requires enterprise plan', () => {
      kontext = createClient('pro');
      expect(() => kontext.computeBehavioralEmbedding('agent-1')).toThrow(
        /Enterprise plan/,
      );
    });

    it('analyzeAgentLinks requires enterprise plan', () => {
      kontext = createClient('pro');
      expect(() => kontext.analyzeAgentLinks()).toThrow(/Enterprise plan/);
    });

    it('getLinkedAgents requires enterprise plan', () => {
      kontext = createClient('pro');
      expect(() => kontext.getLinkedAgents('agent-1')).toThrow(/Enterprise plan/);
    });

    it('getKYAConfidenceScore requires enterprise plan', () => {
      kontext = createClient('pro');
      expect(() => kontext.getKYAConfidenceScore('agent-1')).toThrow(
        /Enterprise plan/,
      );
    });

    it('Phase 2 methods work on enterprise plan', () => {
      kontext = createClient('enterprise');

      // These should not throw (even if data is insufficient)
      const embedding = kontext.computeBehavioralEmbedding('agent-1');
      expect(embedding).toBeNull(); // not enough data

      const links = kontext.analyzeAgentLinks();
      expect(links).toEqual([]);

      const linked = kontext.getLinkedAgents('agent-1');
      expect(linked).toEqual([]);

      kontext.registerAgentIdentity({ agentId: 'agent-1' });
      const score = kontext.getKYAConfidenceScore('agent-1');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.components).toHaveLength(5);
    });
  });
});
