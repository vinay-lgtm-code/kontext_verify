import { describe, it, expect, vi, afterEach } from 'vitest';
import { MetaMaskWalletManager } from '../src/integrations/metamask-wallets.js';

describe('MetaMaskWalletManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw if clientId is missing', () => {
    expect(
      () => new MetaMaskWalletManager({ clientId: '', authConnectionId: 'conn', web3AuthNetwork: 'sapphire_mainnet' }),
    ).toThrow('MetaMask Web3Auth Client ID is required');
  });

  it('should throw if authConnectionId is missing', () => {
    expect(
      () => new MetaMaskWalletManager({ clientId: 'id', authConnectionId: '', web3AuthNetwork: 'sapphire_mainnet' }),
    ).toThrow('MetaMask Auth Connection ID is required');
  });

  it('should construct with valid config', () => {
    const mgr = new MetaMaskWalletManager({
      clientId: 'test-id',
      authConnectionId: 'test-conn',
      web3AuthNetwork: 'sapphire_devnet',
    });
    expect(mgr).toBeDefined();
  });

  describe('validateCredentials', () => {
    it('should return false when @web3auth/node-sdk is not installed', async () => {
      const mgr = new MetaMaskWalletManager({
        clientId: 'test-id',
        authConnectionId: 'test-conn',
        web3AuthNetwork: 'sapphire_devnet',
      });

      // Since @web3auth/node-sdk is likely not installed in test env,
      // validateCredentials should return false gracefully
      const result = await mgr.validateCredentials();
      expect(result).toBe(false);
    });
  });

  describe('connect', () => {
    it('should throw when @web3auth/node-sdk is not installed', async () => {
      const mgr = new MetaMaskWalletManager({
        clientId: 'test-id',
        authConnectionId: 'test-conn',
        web3AuthNetwork: 'sapphire_devnet',
      });

      await expect(
        mgr.connect('test-jwt'),
      ).rejects.toThrow('MetaMask Embedded Wallets requires @web3auth/node-sdk');
    });
  });

  describe('transferWithCompliance', () => {
    it('should block transfer when compliance check fails', async () => {
      const mgr = new MetaMaskWalletManager({
        clientId: 'test-id',
        authConnectionId: 'test-conn',
        web3AuthNetwork: 'sapphire_devnet',
      });

      const mockKontext = {
        verify: vi.fn().mockResolvedValue({ compliant: false, checks: [], riskLevel: 'critical', recommendations: [] }),
        logReasoning: vi.fn(),
      };
      mgr.setKontext(mockKontext);

      // Mock the connect method to return a test account
      vi.spyOn(mgr, 'connect').mockResolvedValue({
        address: '0xtest',
        publicKey: '0xtest',
      });

      const result = await mgr.transferWithCompliance({
        toAddress: '0xto',
        amount: '100',
        token: 'USDC',
        chain: 'base',
        idToken: 'test-jwt',
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.complianceResult?.compliant).toBe(false);
    });
  });
});
