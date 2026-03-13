import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircleWalletManager } from '../src/integrations/circle-wallets.js';
import { KontextError } from '../src/index.js';

describe('CircleWalletManager', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw if apiKey is missing', () => {
    expect(
      () => new CircleWalletManager({ apiKey: '', entitySecret: 'abc123' }),
    ).toThrow('Circle API key is required');
  });

  it('should throw if entitySecret is missing', () => {
    expect(
      () => new CircleWalletManager({ apiKey: 'test-key', entitySecret: '' }),
    ).toThrow('Circle entity secret is required');
  });

  it('should construct with valid config', () => {
    const mgr = new CircleWalletManager({
      apiKey: 'test-key',
      entitySecret: 'test-secret',
    });
    expect(mgr).toBeDefined();
  });

  describe('validateCredentials', () => {
    it('should return true when Circle API returns 200', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const mgr = new CircleWalletManager({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await mgr.validateCredentials();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.circle.com/v1/w3s/config/entity',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        }),
      );
    });

    it('should return false when Circle API returns error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

      const mgr = new CircleWalletManager({
        apiKey: 'bad-key',
        entitySecret: 'test-secret',
      });

      const result = await mgr.validateCredentials();
      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

      const mgr = new CircleWalletManager({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await mgr.validateCredentials();
      expect(result).toBe(false);
    });
  });

  describe('createWalletSet', () => {
    it('should create a wallet set', async () => {
      const walletSet = {
        id: 'ws-1',
        name: 'test-set',
        custodyType: 'DEVELOPER',
        createDate: '2026-01-01',
        updateDate: '2026-01-01',
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { walletSet } }),
      }));

      const mgr = new CircleWalletManager({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await mgr.createWalletSet({ name: 'test-set' });
      expect(result.id).toBe('ws-1');
      expect(result.name).toBe('test-set');
    });
  });

  describe('createWallet', () => {
    it('should create wallets', async () => {
      const wallets = [{
        id: 'w-1',
        state: 'LIVE',
        address: '0xabc',
        blockchain: 'BASE',
        walletSetId: 'ws-1',
        createDate: '2026-01-01',
      }];
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { wallets } }),
      }));

      const mgr = new CircleWalletManager({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await mgr.createWallet({
        walletSetId: 'ws-1',
        blockchains: ['base'],
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.address).toBe('0xabc');
    });
  });

  describe('transferWithCompliance', () => {
    it('should execute transfer and return result', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { id: 'tx-1', state: 'INITIATED', txHash: '0xdef' },
        }),
      }));

      const mgr = new CircleWalletManager({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await mgr.transferWithCompliance({
        walletId: 'w-1',
        tokenAddress: '0xtoken',
        destinationAddress: '0xdest',
        amount: '100',
        blockchain: 'base',
      });

      expect(result.id).toBe('tx-1');
      expect(result.state).toBe('INITIATED');
    });

    it('should block transfer when compliance check fails', async () => {
      const mgr = new CircleWalletManager({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      // Mock kontext that returns non-compliant
      const mockKontext = {
        verify: vi.fn().mockResolvedValue({ compliant: false, checks: [], riskLevel: 'critical', recommendations: [] }),
        logReasoning: vi.fn(),
      };
      mgr.setKontext(mockKontext);

      const result = await mgr.transferWithCompliance({
        walletId: 'w-1',
        tokenAddress: '0xtoken',
        destinationAddress: '0xdest',
        amount: '100',
        blockchain: 'base',
      });

      expect(result.state).toBe('BLOCKED');
      expect(result.complianceResult?.compliant).toBe(false);
    });

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      }));

      const mgr = new CircleWalletManager({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      await expect(
        mgr.transferWithCompliance({
          walletId: 'w-1',
          tokenAddress: '0xtoken',
          destinationAddress: '0xdest',
          amount: '100',
          blockchain: 'base',
        }),
      ).rejects.toThrow(/Circle API error 500/);
    });
  });
});
