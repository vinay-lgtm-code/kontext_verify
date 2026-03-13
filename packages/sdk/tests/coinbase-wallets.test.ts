import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoinbaseWalletManager } from '../src/integrations/coinbase-wallets.js';

describe('CoinbaseWalletManager', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw if apiKeyId is missing', () => {
    expect(
      () => new CoinbaseWalletManager({ apiKeyId: '', apiKeySecret: 'sec', walletSecret: 'ws' }),
    ).toThrow('Coinbase CDP API Key ID is required');
  });

  it('should throw if apiKeySecret is missing', () => {
    expect(
      () => new CoinbaseWalletManager({ apiKeyId: 'id', apiKeySecret: '', walletSecret: 'ws' }),
    ).toThrow('Coinbase CDP API Key Secret is required');
  });

  it('should throw if walletSecret is missing', () => {
    expect(
      () => new CoinbaseWalletManager({ apiKeyId: 'id', apiKeySecret: 'sec', walletSecret: '' }),
    ).toThrow('Coinbase CDP Wallet Secret is required');
  });

  it('should construct with valid config', () => {
    const mgr = new CoinbaseWalletManager({
      apiKeyId: 'test-id',
      apiKeySecret: 'test-secret',
      walletSecret: 'test-wallet',
    });
    expect(mgr).toBeDefined();
  });

  describe('validateCredentials', () => {
    it('should return true when CDP API returns 200', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const mgr = new CoinbaseWalletManager({
        apiKeyId: 'test-id',
        apiKeySecret: 'test-secret',
        walletSecret: 'test-wallet',
      });

      const result = await mgr.validateCredentials();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cdp.coinbase.com/v1/evm/accounts',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should return false on API error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      const mgr = new CoinbaseWalletManager({
        apiKeyId: 'test-id',
        apiKeySecret: 'test-secret',
        walletSecret: 'test-wallet',
      });

      expect(await mgr.validateCredentials()).toBe(false);
    });
  });

  describe('createAccount', () => {
    it('should create an account', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ address: '0xabc', network: 'base' }),
      }));

      const mgr = new CoinbaseWalletManager({
        apiKeyId: 'test-id',
        apiKeySecret: 'test-secret',
        walletSecret: 'test-wallet',
      });

      const result = await mgr.createAccount({ network: 'base' });
      expect(result.address).toBe('0xabc');
      expect(result.network).toBe('base');
    });
  });

  describe('listAccounts', () => {
    it('should list accounts', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accounts: [
            { address: '0xabc', network: 'base' },
            { address: '0xdef', network: 'ethereum' },
          ],
        }),
      }));

      const mgr = new CoinbaseWalletManager({
        apiKeyId: 'test-id',
        apiKeySecret: 'test-secret',
        walletSecret: 'test-wallet',
      });

      const result = await mgr.listAccounts();
      expect(result).toHaveLength(2);
    });
  });

  describe('transferWithCompliance', () => {
    it('should execute transfer and return result', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          transactionHash: '0xtx1',
          status: 'COMPLETED',
        }),
      }));

      const mgr = new CoinbaseWalletManager({
        apiKeyId: 'test-id',
        apiKeySecret: 'test-secret',
        walletSecret: 'test-wallet',
      });

      const result = await mgr.transferWithCompliance({
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amount: '100',
        token: 'USDC',
        network: 'base',
      });

      expect(result.transactionHash).toBe('0xtx1');
      expect(result.status).toBe('COMPLETED');
    });

    it('should block transfer when compliance check fails', async () => {
      const mgr = new CoinbaseWalletManager({
        apiKeyId: 'test-id',
        apiKeySecret: 'test-secret',
        walletSecret: 'test-wallet',
      });

      const mockKontext = {
        verify: vi.fn().mockResolvedValue({ compliant: false, checks: [], riskLevel: 'critical', recommendations: [] }),
        logReasoning: vi.fn(),
      };
      mgr.setKontext(mockKontext);

      const result = await mgr.transferWithCompliance({
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amount: '100',
        token: 'USDC',
        network: 'base',
      });

      expect(result.status).toBe('BLOCKED');
      expect(result.complianceResult?.compliant).toBe(false);
    });

    it('should throw on CDP API error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      }));

      const mgr = new CoinbaseWalletManager({
        apiKeyId: 'test-id',
        apiKeySecret: 'test-secret',
        walletSecret: 'test-wallet',
      });

      await expect(
        mgr.transferWithCompliance({
          fromAddress: '0xfrom',
          toAddress: '0xto',
          amount: '100',
          token: 'USDC',
          network: 'base',
        }),
      ).rejects.toThrow(/Coinbase CDP API error 403/);
    });
  });
});
