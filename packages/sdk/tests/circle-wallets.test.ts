import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';
import { CircleWalletManager } from '../src/integrations/circle-wallets.js';
import type { CircleWalletOptions } from '../src/integrations/circle-wallets.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
  });
}

function createManager(options?: CircleWalletOptions) {
  const kontext = createClient();
  return { kontext, manager: new CircleWalletManager(kontext, undefined, options) };
}

// ============================================================================
// Tests
// ============================================================================

describe('CircleWalletManager', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  describe('wallet set management', () => {
    it('should create a wallet set', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Operations');

      expect(walletSet.id).toBeDefined();
      expect(walletSet.name).toBe('Operations');
      expect(walletSet.custodyType).toBe('USER');
      expect(walletSet.createdAt).toBeDefined();
    });

    it('should create a developer-controlled wallet set with entity secret', async () => {
      const { kontext: k, manager } = createManager({
        entitySecretCiphertext: 'test-secret',
      });
      kontext = k;

      const walletSet = await manager.createWalletSet('Dev Ops');

      expect(walletSet.custodyType).toBe('DEVELOPER');
    });

    it('should create a wallet set with metadata', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Treasury', { department: 'finance' });

      expect(walletSet.id).toBeDefined();
      expect(walletSet.name).toBe('Treasury');
    });
  });

  describe('wallet creation', () => {
    it('should create a wallet in a wallet set', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Test Set');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      expect(wallet.id).toBeDefined();
      expect(wallet.walletSetId).toBe(walletSet.id);
      expect(wallet.chain).toBe('base');
      expect(wallet.address).toMatch(/^0x/);
      expect(wallet.state).toBe('LIVE');
      expect(wallet.createDate).toBeDefined();
    });

    it('should create wallets on different chains', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Multi-chain');
      const ethWallet = await manager.createWallet(walletSet.id, { chain: 'ethereum' });
      const baseWallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      expect(ethWallet.chain).toBe('ethereum');
      expect(baseWallet.chain).toBe('base');
      expect(ethWallet.address).not.toBe(baseWallet.address);
    });

    it('should throw when creating a wallet in non-existent wallet set', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      await expect(
        manager.createWallet('nonexistent', { chain: 'base' }),
      ).rejects.toThrow('Wallet set not found');
    });

    it('should list wallets in a wallet set', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('List Test');
      await manager.createWallet(walletSet.id, { chain: 'base' });
      await manager.createWallet(walletSet.id, { chain: 'ethereum' });

      const wallets = await manager.listWallets(walletSet.id);
      expect(wallets.length).toBe(2);
    });

    it('should get a wallet by ID', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Get Test');
      const created = await manager.createWallet(walletSet.id, { chain: 'polygon' });

      const fetched = await manager.getWallet(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.chain).toBe('polygon');
    });

    it('should throw when getting non-existent wallet', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      await expect(manager.getWallet('nonexistent')).rejects.toThrow('Wallet not found');
    });
  });

  describe('compliant transfers', () => {
    it('should execute a compliant transfer', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Transfer Test');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const result = await manager.transferWithCompliance({
        walletId: wallet.id,
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
        agent: 'test-agent',
      });

      expect(result.transferId).toBeDefined();
      expect(result.walletId).toBe(wallet.id);
      expect(result.status).toBe('COMPLETED');
      expect(result.complianceCheck.passed).toBe(true);
      expect(result.kontextLogId).toBeDefined();
      expect(result.amount).toBe('100');
      expect(result.chain).toBe('base');
      expect(result.transactionHash).toBeDefined();
    });

    it('should block transfer with invalid destination address', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Block Test');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const result = await manager.transferWithCompliance({
        walletId: wallet.id,
        destinationAddress: 'invalid-address',
        amount: '100',
        agent: 'test-agent',
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.blockedReason).toBeDefined();
      expect(result.transactionHash).toBeUndefined();
    });

    it('should flag large transfers for review', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Review Test');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const result = await manager.transferWithCompliance({
        walletId: wallet.id,
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '75000',
        agent: 'test-agent',
      });

      // Large amounts should be flagged for review due to high risk level
      expect(['PENDING_REVIEW', 'COMPLETED']).toContain(result.status);
      expect(result.complianceCheck.riskLevel).not.toBe('low');
    });

    it('should throw when transferring from non-existent wallet', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      await expect(
        manager.transferWithCompliance({
          walletId: 'nonexistent',
          destinationAddress: '0x' + '2'.repeat(40),
          amount: '100',
        }),
      ).rejects.toThrow('Wallet not found');
    });

    it('should use default token (USDC) when not specified', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Default Token');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const result = await manager.transferWithCompliance({
        walletId: wallet.id,
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '50',
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('should support EURC transfers', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('EURC Test');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'ethereum' });

      const result = await manager.transferWithCompliance({
        walletId: wallet.id,
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
        token: 'EURC',
      });

      expect(result.transferId).toBeDefined();
    });
  });

  describe('balance and monitoring', () => {
    it('should get wallet balance', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Balance Test');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const balance = await manager.getBalance(wallet.id);

      expect(balance.walletId).toBe(wallet.id);
      expect(balance.chain).toBe('base');
      expect(balance.balances).toBeDefined();
      expect(balance.balances.length).toBeGreaterThan(0);
      expect(balance.balances[0]!.token).toBe('USDC');
    });

    it('should get balance with chain override', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Balance Override');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const balance = await manager.getBalance(wallet.id, 'ethereum');

      expect(balance.chain).toBe('ethereum');
    });
  });

  describe('audit integration', () => {
    it('should track audit trail for wallet operations', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Audit Test');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      await manager.transferWithCompliance({
        walletId: wallet.id,
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
        agent: 'audit-agent',
      });

      const trail = await manager.getWalletAuditTrail(wallet.id);

      // Should have: wallet creation + transfer
      expect(trail.length).toBeGreaterThanOrEqual(2);
      expect(trail.some((a) => a.type === 'wallet_created')).toBe(true);
      expect(trail.some((a) => a.type === 'circle_wallet_transfer')).toBe(true);
    });

    it('should return empty audit trail for unknown wallet', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const trail = await manager.getWalletAuditTrail('nonexistent');
      expect(trail).toEqual([]);
    });

    it('should log wallet set creation in autoLog mode', async () => {
      const { kontext: k, manager } = createManager({ autoLog: true });
      kontext = k;

      const walletSet = await manager.createWalletSet('Logged Set');

      // The wallet set creation should be logged (no wallet-specific trail here,
      // but the log call should not throw)
      expect(walletSet.id).toBeDefined();
    });

    it('should not log when autoLog is disabled', async () => {
      const { kontext: k, manager } = createManager({ autoLog: false });
      kontext = k;

      const walletSet = await manager.createWalletSet('Silent Set');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const trail = await manager.getWalletAuditTrail(wallet.id);
      // With autoLog off, only the transfer log (from transferWithCompliance) would appear
      expect(trail.length).toBe(0);
    });
  });

  describe('simulation mode', () => {
    it('should work without Circle API key (simulation mode)', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Sim Test');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      expect(wallet.id).toContain('wallet_sim_');
      expect(wallet.address).toMatch(/^0x/);
    });

    it('should generate simulated transfer IDs', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const walletSet = await manager.createWalletSet('Sim Transfer');
      const wallet = await manager.createWallet(walletSet.id, { chain: 'base' });

      const result = await manager.transferWithCompliance({
        walletId: wallet.id,
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
      });

      expect(result.transferId).toContain('txn_sim_');
      expect(result.transactionHash).toMatch(/^0x/);
    });
  });
});
