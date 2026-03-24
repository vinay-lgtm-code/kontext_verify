import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CCTPTransferManager } from '../src/integrations/cctp.js';

describe('CCTPTransferManager', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  it('should construct with defaults', () => {
    const mgr = new CCTPTransferManager();
    expect(mgr).toBeDefined();
  });

  it('should construct with custom config', () => {
    const mgr = new CCTPTransferManager({
      irisApiKey: 'iris-key',
      attestationBaseUrl: 'https://custom-iris.example.com',
      version: 'v2',
    });
    expect(mgr).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // getDomain
  // --------------------------------------------------------------------------

  it('should return correct domain IDs', () => {
    const mgr = new CCTPTransferManager();
    expect(mgr.getDomain('ethereum')).toBe(0);
    expect(mgr.getDomain('base')).toBe(6);
    expect(mgr.getDomain('solana')).toBe(5);
  });

  it('should throw for unsupported chains', () => {
    const mgr = new CCTPTransferManager();
    expect(() => mgr.getDomain('arc' as any)).toThrow('not supported by CCTP');
  });

  // --------------------------------------------------------------------------
  // initiateTransfer
  // --------------------------------------------------------------------------

  describe('initiateTransfer', () => {
    it('should create a transfer record', async () => {
      const mgr = new CCTPTransferManager();
      const result = await mgr.initiateTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '10000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
      });

      expect(result.transfer.state).toBe('pending_burn');
      expect(result.transfer.sourceChain).toBe('ethereum');
      expect(result.transfer.destinationChain).toBe('base');
      expect(result.transfer.version).toBe('v1');
      expect(result.transfer.from).toBe('0xsender');
      expect(result.transfer.to).toBe('0xrecipient');
    });

    it('should advance to burned state if burnTxHash is provided', async () => {
      const mgr = new CCTPTransferManager();
      const result = await mgr.initiateTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '10000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
        burnTxHash: '0xburn123',
      });

      expect(result.transfer.state).toBe('burned');
      expect(result.transfer.burnTxHash).toBe('0xburn123');
    });

    it('should run verify() and block if non-compliant', async () => {
      const mgr = new CCTPTransferManager();
      const mockKontext = {
        verify: vi.fn().mockResolvedValue({
          compliant: false,
          checks: [],
          riskLevel: 'critical',
          recommendations: [],
        }),
        logReasoning: vi.fn().mockResolvedValue(undefined),
      };
      mgr.setKontext(mockKontext);

      const result = await mgr.initiateTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '10000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
      });

      expect(result.transfer.state).toBe('failed');
      expect(result.complianceResult?.compliant).toBe(false);
    });

    it('should reject same-chain transfers', async () => {
      const mgr = new CCTPTransferManager();
      await expect(mgr.initiateTransfer({
        sourceChain: 'base',
        destinationChain: 'base',
        amount: '10000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
      })).rejects.toThrow('Source and destination chains must be different');
    });

    it('should log reasoning when kontext is linked', async () => {
      const mgr = new CCTPTransferManager();
      const mockKontext = {
        verify: vi.fn().mockResolvedValue({
          compliant: true,
          checks: [],
          riskLevel: 'low',
          recommendations: [],
        }),
        logReasoning: vi.fn().mockResolvedValue(undefined),
      };
      mgr.setKontext(mockKontext);

      await mgr.initiateTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '10000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
        agentId: 'my-agent',
      });

      expect(mockKontext.logReasoning).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'my-agent',
          action: 'cctp-initiate-transfer',
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // initiateFastTransfer
  // --------------------------------------------------------------------------

  describe('initiateFastTransfer', () => {
    it('should set version to v2', async () => {
      const mgr = new CCTPTransferManager();
      const result = await mgr.initiateFastTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '5000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
      });

      expect(result.transfer.version).toBe('v2');
    });
  });

  // --------------------------------------------------------------------------
  // confirmTransfer
  // --------------------------------------------------------------------------

  describe('confirmTransfer', () => {
    it('should throw for non-existent transfer', async () => {
      const mgr = new CCTPTransferManager();
      await expect(mgr.confirmTransfer('nonexistent'))
        .rejects.toThrow('CCTP transfer nonexistent not found');
    });

    it('should return completed transfer without re-confirming', async () => {
      const mgr = new CCTPTransferManager();

      // Mock attestation response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'complete', attestation: '0xattest123' }),
      });

      const { transfer } = await mgr.initiateTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '10000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
        burnTxHash: '0xburn123',
      });

      const confirmed = await mgr.confirmTransfer(transfer.id);
      expect(confirmed.state).toBe('completed');
      expect(confirmed.attestation).toBe('0xattest123');

      // Calling again should return the completed transfer
      const again = await mgr.confirmTransfer(transfer.id);
      expect(again.state).toBe('completed');
    });
  });

  // --------------------------------------------------------------------------
  // getTransferStatus / getTransfers
  // --------------------------------------------------------------------------

  describe('getTransferStatus', () => {
    it('should return defensive copy', async () => {
      const mgr = new CCTPTransferManager();
      const { transfer } = await mgr.initiateTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '1000',
        token: 'USDC',
        from: '0xSender',
        to: '0xRecipient',
      });

      const status = mgr.getTransferStatus(transfer.id);
      status.amount = '999'; // mutate copy
      const status2 = mgr.getTransferStatus(transfer.id);
      expect(status2.amount).toBe('1000'); // original unchanged
    });

    it('should throw for non-existent transfer', () => {
      const mgr = new CCTPTransferManager();
      expect(() => mgr.getTransferStatus('nope')).toThrow('not found');
    });
  });

  describe('getTransfers', () => {
    it('should return all transfers as defensive copies', async () => {
      const mgr = new CCTPTransferManager();
      await mgr.initiateTransfer({
        sourceChain: 'ethereum',
        destinationChain: 'base',
        amount: '1000',
        token: 'USDC',
        from: '0xA',
        to: '0xB',
      });
      await mgr.initiateTransfer({
        sourceChain: 'base',
        destinationChain: 'polygon',
        amount: '2000',
        token: 'USDC',
        from: '0xC',
        to: '0xD',
      });

      const transfers = mgr.getTransfers();
      expect(transfers).toHaveLength(2);
    });
  });
});
