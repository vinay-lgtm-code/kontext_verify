import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';
import { GasStationManager } from '../src/integrations/gas-station.js';
import type { Chain } from '../src/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
  });
}

function createManager() {
  const kontext = createClient();
  return { kontext, manager: new GasStationManager(kontext) };
}

// ============================================================================
// Tests
// ============================================================================

describe('GasStationManager', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  describe('checkEligibility', () => {
    it('should report eligibility on supported chains', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const eligibility = await manager.checkEligibility('wallet-123', 'base');

      expect(eligibility.eligible).toBe(true);
      expect(parseFloat(eligibility.maxSponsoredAmount)).toBeGreaterThan(0);
      expect(eligibility.supportedOperations).toContain('transfer');
      expect(eligibility.remainingDailyQuota).toBeDefined();
    });

    it('should report ineligibility on unsupported chains', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const eligibility = await manager.checkEligibility('wallet-123', 'ethereum');

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBeDefined();
      expect(eligibility.supportedOperations.length).toBe(0);
    });

    it('should support gas sponsorship on polygon', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const eligibility = await manager.checkEligibility('wallet-456', 'polygon');

      expect(eligibility.eligible).toBe(true);
    });

    it('should support gas sponsorship on arbitrum', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const eligibility = await manager.checkEligibility('wallet-789', 'arbitrum');

      expect(eligibility.eligible).toBe(true);
    });

    it('should support gas sponsorship on optimism', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const eligibility = await manager.checkEligibility('wallet-000', 'optimism');

      expect(eligibility.eligible).toBe(true);
    });

    it('should support gas sponsorship on arc', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const eligibility = await manager.checkEligibility('wallet-arc', 'arc');

      expect(eligibility.eligible).toBe(true);
    });
  });

  describe('estimateGas', () => {
    it('should estimate gas with sponsorship on eligible chain', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const estimate = await manager.estimateGas({
        walletId: 'wallet-123',
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
        chain: 'base',
        token: 'USDC',
      });

      expect(estimate.sponsored).toBe(true);
      expect(estimate.userCost).toBe('0');
      expect(parseFloat(estimate.estimatedGas)).toBeGreaterThan(0);
      expect(parseFloat(estimate.sponsoredAmount)).toBeGreaterThan(0);
      expect(estimate.chain).toBe('base');
      expect(estimate.nativeToken).toBe('ETH');
    });

    it('should estimate gas without sponsorship on ineligible chain', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const estimate = await manager.estimateGas({
        walletId: 'wallet-123',
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
        chain: 'ethereum',
      });

      expect(estimate.sponsored).toBe(false);
      expect(estimate.userCost).toBe(estimate.estimatedGas);
      expect(estimate.sponsoredAmount).toBe('0');
    });

    it('should return correct native token for polygon', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const estimate = await manager.estimateGas({
        walletId: 'wallet-123',
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
        chain: 'polygon',
      });

      expect(estimate.nativeToken).toBe('MATIC');
    });

    it('should return correct native token for arc', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const estimate = await manager.estimateGas({
        walletId: 'wallet-123',
        destinationAddress: '0x' + '2'.repeat(40),
        amount: '100',
        chain: 'arc',
      });

      expect(estimate.nativeToken).toBe('ARC');
    });
  });

  describe('logGasSponsorship', () => {
    it('should log a gas sponsorship event', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const action = await manager.logGasSponsorship({
        walletId: 'wallet-123',
        transactionHash: '0x' + 'a'.repeat(64),
        sponsoredGasAmount: '0.0001',
        chain: 'base',
        agent: 'payment-agent',
      });

      expect(action.id).toBeDefined();
      expect(action.type).toBe('gas_sponsorship');
      expect(action.description).toContain('wallet-123');
      expect(action.description).toContain('base');
      expect(action.metadata['sponsoredGasAmount']).toBe('0.0001');
      expect(action.metadata['nativeToken']).toBe('ETH');
    });

    it('should log sponsorship with metadata', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const action = await manager.logGasSponsorship({
        walletId: 'wallet-456',
        transactionHash: '0x' + 'b'.repeat(64),
        sponsoredGasAmount: '0.01',
        chain: 'polygon',
        metadata: { purpose: 'user-onboarding' },
      });

      expect(action.metadata['purpose']).toBe('user-onboarding');
      expect(action.metadata['nativeToken']).toBe('MATIC');
    });

    it('should use default agent when not specified', async () => {
      const { kontext: k, manager } = createManager();
      kontext = k;

      const action = await manager.logGasSponsorship({
        walletId: 'wallet-789',
        transactionHash: '0x' + 'c'.repeat(64),
        sponsoredGasAmount: '0.0003',
        chain: 'arbitrum',
      });

      expect(action.agentId).toBe('gas-station-manager');
    });
  });

  describe('static helpers', () => {
    it('should return eligible chains', () => {
      const chains = GasStationManager.getEligibleChains();

      expect(chains).toContain('base');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
      expect(chains).toContain('optimism');
      expect(chains).toContain('arc');
      expect(chains).not.toContain('ethereum');
    });

    it('should return native tokens for chains', () => {
      expect(GasStationManager.getNativeToken('ethereum')).toBe('ETH');
      expect(GasStationManager.getNativeToken('base')).toBe('ETH');
      expect(GasStationManager.getNativeToken('polygon')).toBe('MATIC');
      expect(GasStationManager.getNativeToken('arbitrum')).toBe('ETH');
      expect(GasStationManager.getNativeToken('arc')).toBe('ARC');
    });
  });
});
