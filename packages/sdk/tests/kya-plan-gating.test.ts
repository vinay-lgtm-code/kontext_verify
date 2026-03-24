import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/client.js';
import { isFeatureAvailable, requirePlan } from '../src/plan-gate.js';

function createClient(plan: 'startup' | 'growth' | 'enterprise' = 'enterprise') {
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
    it('allows kya-identity on startup plan', () => {
      expect(isFeatureAvailable('kya-identity', 'startup')).toBe(true);
    });

    it('allows kya-identity on growth plan', () => {
      expect(isFeatureAvailable('kya-identity', 'growth')).toBe(true);
    });

    it('allows kya-identity on enterprise plan', () => {
      expect(isFeatureAvailable('kya-identity', 'enterprise')).toBe(true);
    });

    it('blocks kya-behavioral on startup plan', () => {
      expect(isFeatureAvailable('kya-behavioral', 'startup')).toBe(false);
    });

    it('blocks kya-behavioral on growth plan', () => {
      expect(isFeatureAvailable('kya-behavioral', 'growth')).toBe(false);
    });

    it('allows kya-behavioral on enterprise plan', () => {
      expect(isFeatureAvailable('kya-behavioral', 'enterprise')).toBe(true);
    });
  });

  describe('requirePlan', () => {
    it('does not throw for kya-identity on startup plan', () => {
      expect(() => requirePlan('kya-identity', 'startup')).not.toThrow();
    });

    it('does not throw for kya-identity on growth plan', () => {
      expect(() => requirePlan('kya-identity', 'growth')).not.toThrow();
    });

    it('throws for kya-behavioral on startup plan', () => {
      expect(() => requirePlan('kya-behavioral', 'startup')).toThrow(/Enterprise plan/);
    });

    it('throws for kya-behavioral on growth plan', () => {
      expect(() => requirePlan('kya-behavioral', 'growth')).toThrow(/Enterprise plan/);
    });

    it('does not throw for kya-behavioral on enterprise plan', () => {
      expect(() => requirePlan('kya-behavioral', 'enterprise')).not.toThrow();
    });
  });

  describe('client: Phase 1 (Startup tier) methods', () => {
    it('registerAgentIdentity works on startup plan', () => {
      kontext = createClient('startup');
      const identity = kontext.registerAgentIdentity({ agentId: 'agent-1' });
      expect(identity.agentId).toBe('agent-1');
    });

    it('getAgentIdentity works on startup plan', () => {
      kontext = createClient('startup');
      kontext.registerAgentIdentity({ agentId: 'agent-1' });
      expect(kontext.getAgentIdentity('agent-1')).toBeDefined();
    });

    it('updateAgentIdentity works on startup plan', () => {
      kontext = createClient('startup');
      kontext.registerAgentIdentity({ agentId: 'agent-1' });
      expect(() =>
        kontext.updateAgentIdentity('agent-1', { displayName: 'x' }),
      ).not.toThrow();
    });

    it('removeAgentIdentity works on startup plan', () => {
      kontext = createClient('startup');
      kontext.registerAgentIdentity({ agentId: 'agent-1' });
      expect(() => kontext.removeAgentIdentity('agent-1')).not.toThrow();
    });

    it('addAgentWallet works on startup plan', () => {
      kontext = createClient('startup');
      kontext.registerAgentIdentity({ agentId: 'agent-1' });
      expect(() =>
        kontext.addAgentWallet('agent-1', { address: '0x123', chain: 'base' }),
      ).not.toThrow();
    });

    it('lookupAgentByWallet works on startup plan', () => {
      kontext = createClient('startup');
      expect(() => kontext.lookupAgentByWallet('0x123')).not.toThrow();
    });

    it('getWalletClusters works on startup plan', () => {
      kontext = createClient('startup');
      expect(() => kontext.getWalletClusters()).not.toThrow();
    });

    it('getKYAExport works on startup plan', () => {
      kontext = createClient('startup');
      expect(() => kontext.getKYAExport()).not.toThrow();
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
      kontext = createClient('startup');
      expect(() => kontext.computeBehavioralEmbedding('agent-1')).toThrow(
        /Enterprise plan/,
      );
    });

    it('analyzeAgentLinks requires enterprise plan', () => {
      kontext = createClient('startup');
      expect(() => kontext.analyzeAgentLinks()).toThrow(/Enterprise plan/);
    });

    it('getLinkedAgents requires enterprise plan', () => {
      kontext = createClient('startup');
      expect(() => kontext.getLinkedAgents('agent-1')).toThrow(/Enterprise plan/);
    });

    it('getKYAConfidenceScore requires enterprise plan', () => {
      kontext = createClient('startup');
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
