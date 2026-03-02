import { describe, it, expect } from 'vitest';
import { AgentIdentityRegistry } from '../src/kya/identity-registry.js';
import type { KYCProviderReference } from '../src/kya/types.js';

describe('AgentIdentityRegistry', () => {
  function createRegistry() {
    return new AgentIdentityRegistry();
  }

  describe('register', () => {
    it('registers a new agent identity', () => {
      const registry = createRegistry();
      const identity = registry.register({
        agentId: 'agent-1',
        displayName: 'Test Agent',
        entityType: 'bot',
        wallets: [{ address: '0xABCD', chain: 'ethereum' }],
        contactUri: 'mailto:test@example.com',
        metadata: { source: 'test' },
      });

      expect(identity.agentId).toBe('agent-1');
      expect(identity.displayName).toBe('Test Agent');
      expect(identity.entityType).toBe('bot');
      expect(identity.wallets).toHaveLength(1);
      expect(identity.wallets[0]!.address).toBe('0xabcd'); // normalized
      expect(identity.contactUri).toBe('mailto:test@example.com');
      expect(identity.metadata).toEqual({ source: 'test' });
      expect(identity.createdAt).toBeTruthy();
    });

    it('throws if agent already registered', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      expect(() => registry.register({ agentId: 'agent-1' })).toThrow(
        /already registered/,
      );
    });

    it('defaults entityType to unknown', () => {
      const registry = createRegistry();
      const identity = registry.register({ agentId: 'agent-1' });
      expect(identity.entityType).toBe('unknown');
    });
  });

  describe('update', () => {
    it('updates display name and entity type', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      const updated = registry.update('agent-1', {
        displayName: 'Updated',
        entityType: 'organization',
      });

      expect(updated.displayName).toBe('Updated');
      expect(updated.entityType).toBe('organization');
    });

    it('merges metadata', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1', metadata: { a: 1 } });
      const updated = registry.update('agent-1', { metadata: { b: 2 } });
      expect(updated.metadata).toEqual({ a: 1, b: 2 });
    });

    it('throws if agent not found', () => {
      const registry = createRegistry();
      expect(() => registry.update('nonexistent', {})).toThrow(/not found/);
    });
  });

  describe('get / getAll / remove', () => {
    it('returns undefined for unknown agent', () => {
      const registry = createRegistry();
      expect(registry.get('nope')).toBeUndefined();
    });

    it('gets all identities', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'a' });
      registry.register({ agentId: 'b' });
      expect(registry.getAll()).toHaveLength(2);
    });

    it('removes an identity and cleans wallet index', () => {
      const registry = createRegistry();
      registry.register({
        agentId: 'agent-1',
        wallets: [{ address: '0xAAA', chain: 'base' }],
      });

      expect(registry.remove('agent-1')).toBe(true);
      expect(registry.get('agent-1')).toBeUndefined();
      expect(registry.lookupByWallet('0xAAA')).toBeUndefined();
    });

    it('returns false when removing nonexistent agent', () => {
      const registry = createRegistry();
      expect(registry.remove('nope')).toBe(false);
    });
  });

  describe('wallet operations', () => {
    it('adds a wallet and updates the index', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      const updated = registry.addWallet('agent-1', {
        address: '0xBBB',
        chain: 'ethereum',
      });

      expect(updated.wallets).toHaveLength(1);
      expect(registry.lookupByWallet('0xBBB')?.agentId).toBe('agent-1');
    });

    it('normalizes wallet addresses to lowercase', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      registry.addWallet('agent-1', { address: '0xCCC', chain: 'base' });

      expect(registry.lookupByWallet('0xCCC')).toBeDefined();
      expect(registry.lookupByWallet('0xccc')).toBeDefined();
    });

    it('throws if wallet belongs to another agent', () => {
      const registry = createRegistry();
      registry.register({
        agentId: 'agent-1',
        wallets: [{ address: '0xDDD', chain: 'base' }],
      });
      registry.register({ agentId: 'agent-2' });

      expect(() =>
        registry.addWallet('agent-2', { address: '0xDDD', chain: 'base' }),
      ).toThrow(/already registered/);
    });

    it('is idempotent for same agent same wallet', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      registry.addWallet('agent-1', { address: '0xEEE', chain: 'base' });
      const result = registry.addWallet('agent-1', { address: '0xEEE', chain: 'base' });
      expect(result.wallets).toHaveLength(1);
    });

    it('removes a wallet', () => {
      const registry = createRegistry();
      registry.register({
        agentId: 'agent-1',
        wallets: [{ address: '0xFFF', chain: 'base' }],
      });
      const updated = registry.removeWallet('agent-1', '0xFFF');
      expect(updated.wallets).toHaveLength(0);
      expect(registry.lookupByWallet('0xFFF')).toBeUndefined();
    });
  });

  describe('KYC operations', () => {
    it('adds a KYC reference', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });

      const ref: KYCProviderReference = {
        provider: 'jumio',
        referenceId: 'ref-123',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null,
      };

      const updated = registry.addKycReference('agent-1', ref);
      expect(updated.kycReferences).toHaveLength(1);
    });

    it('returns none when no KYC references', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      expect(registry.getKycStatus('agent-1')).toBe('none');
    });

    it('returns verified when at least one verified ref', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'onfido',
        referenceId: 'ref-1',
        status: 'pending',
        verifiedAt: null,
        expiresAt: null,
      });
      registry.addKycReference('agent-1', {
        provider: 'jumio',
        referenceId: 'ref-2',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null,
      });

      expect(registry.getKycStatus('agent-1')).toBe('verified');
    });

    it('hasVerifiedKyc returns true for non-expired verified', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'jumio',
        referenceId: 'ref-1',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        expiresAt: null, // never expires
      });

      expect(registry.hasVerifiedKyc('agent-1')).toBe(true);
    });

    it('hasVerifiedKyc returns false for expired verified', () => {
      const registry = createRegistry();
      registry.register({ agentId: 'agent-1' });
      registry.addKycReference('agent-1', {
        provider: 'jumio',
        referenceId: 'ref-1',
        status: 'verified',
        verifiedAt: '2020-01-01T00:00:00.000Z',
        expiresAt: '2020-12-31T00:00:00.000Z', // expired
      });

      expect(registry.hasVerifiedKyc('agent-1')).toBe(false);
    });

    it('hasVerifiedKyc returns false for unknown agent', () => {
      const registry = createRegistry();
      expect(registry.hasVerifiedKyc('nope')).toBe(false);
    });
  });
});
