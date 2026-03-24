import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { X402PaymentManager, X402_HEADER, X402_PROOF_HEADER } from '../src/integrations/x402.js';

describe('X402PaymentManager', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  it('should construct with defaults', () => {
    const mgr = new X402PaymentManager();
    expect(mgr).toBeDefined();
  });

  it('should construct with custom config', () => {
    const mgr = new X402PaymentManager({
      walletAddress: '0xmywallet',
      defaultChain: 'base',
      defaultToken: 'USDC',
      maxAutoApproveAmount: '100',
    });
    expect(mgr).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // createPaymentRequirements
  // --------------------------------------------------------------------------

  describe('createPaymentRequirements', () => {
    it('should create requirements with requestId and expiry', () => {
      const mgr = new X402PaymentManager();
      const req = mgr.createPaymentRequirements({
        payTo: '0xMerchant',
        amount: '50',
      });

      expect(req.payTo).toBe('0xmerchant');
      expect(req.amount).toBe('50');
      expect(req.token).toBe('USDC');
      expect(req.chain).toBe('base');
      expect(req.requestId).toBeTruthy();
      expect(req.expiresAt).toBeTruthy();
    });

    it('should use config defaults for token and chain', () => {
      const mgr = new X402PaymentManager({
        defaultToken: 'EURC',
        defaultChain: 'ethereum',
      });
      const req = mgr.createPaymentRequirements({
        payTo: '0xMerchant',
        amount: '100',
      });

      expect(req.token).toBe('EURC');
      expect(req.chain).toBe('ethereum');
    });

    it('should throw if payTo is missing', () => {
      const mgr = new X402PaymentManager();
      expect(() => mgr.createPaymentRequirements({
        payTo: '',
        amount: '50',
      })).toThrow('payTo address is required');
    });

    it('should throw if amount is missing', () => {
      const mgr = new X402PaymentManager();
      expect(() => mgr.createPaymentRequirements({
        payTo: '0xMerchant',
        amount: '',
      })).toThrow('amount is required');
    });
  });

  // --------------------------------------------------------------------------
  // parsePaymentRequired
  // --------------------------------------------------------------------------

  describe('parsePaymentRequired', () => {
    it('should parse from header', () => {
      const mgr = new X402PaymentManager();
      const requirements = {
        payTo: '0xmerchant',
        amount: '50',
        token: 'USDC' as const,
        chain: 'base' as const,
        resource: '/api/data',
        requestId: 'req_123',
      };

      const parsed = mgr.parsePaymentRequired({
        [X402_HEADER]: JSON.stringify(requirements),
      });

      expect(parsed.payTo).toBe('0xmerchant');
      expect(parsed.amount).toBe('50');
      expect(parsed.requestId).toBe('req_123');
    });

    it('should parse from body if header missing', () => {
      const mgr = new X402PaymentManager();
      const requirements = {
        payTo: '0xmerchant',
        amount: '100',
        token: 'USDC',
        chain: 'base',
        resource: '/api/premium',
        requestId: 'req_456',
      };

      const parsed = mgr.parsePaymentRequired({}, JSON.stringify(requirements));
      expect(parsed.requestId).toBe('req_456');
    });

    it('should throw if no requirements found', () => {
      const mgr = new X402PaymentManager();
      expect(() => mgr.parsePaymentRequired({})).toThrow('No x402 payment requirements found');
    });
  });

  // --------------------------------------------------------------------------
  // handlePaymentRequired
  // --------------------------------------------------------------------------

  describe('handlePaymentRequired', () => {
    it('should execute payment and return proof', async () => {
      const mgr = new X402PaymentManager();

      const requirements = {
        payTo: '0xmerchant',
        amount: '50',
        token: 'USDC' as const,
        chain: 'base' as const,
        resource: '/api/data',
        requestId: 'req_123',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };

      const executePay = vi.fn().mockResolvedValue({
        txHash: '0xtxhash',
        from: '0xPayer',
      });

      const result = await mgr.handlePaymentRequired(requirements, executePay);

      expect(result.success).toBe(true);
      expect(result.proof).toBeDefined();
      expect(result.proof!.txHash).toBe('0xtxhash');
      expect(result.proof!.from).toBe('0xpayer');
      expect(result.proof!.requestId).toBe('req_123');
      expect(executePay).toHaveBeenCalledWith(requirements);
    });

    it('should fail if requirements are expired', async () => {
      const mgr = new X402PaymentManager();

      const requirements = {
        payTo: '0xmerchant',
        amount: '50',
        token: 'USDC' as const,
        chain: 'base' as const,
        resource: '/api/data',
        requestId: 'req_expired',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const result = await mgr.handlePaymentRequired(requirements, vi.fn());

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should fail if amount exceeds maxAutoApproveAmount', async () => {
      const mgr = new X402PaymentManager({
        maxAutoApproveAmount: '10',
      });

      const requirements = {
        payTo: '0xmerchant',
        amount: '50',
        token: 'USDC' as const,
        chain: 'base' as const,
        resource: '/api/data',
        requestId: 'req_toolarge',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };

      const result = await mgr.handlePaymentRequired(requirements, vi.fn());

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds max auto-approve');
    });

    it('should block if compliance check fails', async () => {
      const mgr = new X402PaymentManager();
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

      const requirements = {
        payTo: '0xmerchant',
        amount: '50',
        token: 'USDC' as const,
        chain: 'base' as const,
        resource: '/api/data',
        requestId: 'req_blocked',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };

      const result = await mgr.handlePaymentRequired(requirements, vi.fn());

      expect(result.success).toBe(false);
      expect(result.complianceResult?.compliant).toBe(false);
    });

    it('should log reasoning when kontext is linked', async () => {
      const mgr = new X402PaymentManager();
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

      const requirements = {
        payTo: '0xmerchant',
        amount: '50',
        token: 'USDC' as const,
        chain: 'base' as const,
        resource: '/api/data',
        requestId: 'req_logged',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };

      await mgr.handlePaymentRequired(requirements, vi.fn().mockResolvedValue({
        txHash: '0xtx',
        from: '0xpayer',
      }));

      expect(mockKontext.logReasoning).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'x402-payment',
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // verifyPayment
  // --------------------------------------------------------------------------

  describe('verifyPayment', () => {
    it('should validate a correct payment proof', async () => {
      const mgr = new X402PaymentManager();

      const proof = {
        txHash: '0xtxhash',
        chain: 'base' as const,
        from: '0xpayer',
        requestId: 'req_123',
        amount: '50',
        token: 'USDC' as const,
      };

      const result = await mgr.verifyPayment(proof, '50', '0xmerchant');

      expect(result.valid).toBe(true);
      expect(result.details.txConfirmed).toBe(true);
      expect(result.details.amountCorrect).toBe(true);
    });

    it('should reject incorrect amount', async () => {
      const mgr = new X402PaymentManager();

      const proof = {
        txHash: '0xtxhash',
        chain: 'base' as const,
        from: '0xpayer',
        requestId: 'req_123',
        amount: '25',
        token: 'USDC' as const,
      };

      const result = await mgr.verifyPayment(proof, '50', '0xmerchant');

      expect(result.valid).toBe(false);
      expect(result.details.amountCorrect).toBe(false);
    });

    it('should reject empty txHash', async () => {
      const mgr = new X402PaymentManager();

      const proof = {
        txHash: '',
        chain: 'base' as const,
        from: '0xpayer',
        requestId: 'req_123',
        amount: '50',
        token: 'USDC' as const,
      };

      const result = await mgr.verifyPayment(proof, '50', '0xmerchant');

      expect(result.valid).toBe(false);
      expect(result.details.txConfirmed).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Header helpers
  // --------------------------------------------------------------------------

  describe('header helpers', () => {
    it('buildPaymentRequiredHeaders should include X-Payment-Required', () => {
      const mgr = new X402PaymentManager();
      const headers = mgr.buildPaymentRequiredHeaders({
        payTo: '0xmerchant',
        amount: '50',
        token: 'USDC',
        chain: 'base',
        resource: '/api/data',
        requestId: 'req_123',
      });

      expect(headers[X402_HEADER]).toBeTruthy();
      const parsed = JSON.parse(headers[X402_HEADER]!);
      expect(parsed.payTo).toBe('0xmerchant');
    });

    it('buildPaymentProofHeaders should include X-Payment-Proof', () => {
      const mgr = new X402PaymentManager();
      const headers = mgr.buildPaymentProofHeaders({
        txHash: '0xtx',
        chain: 'base',
        from: '0xpayer',
        requestId: 'req_123',
        amount: '50',
        token: 'USDC',
      });

      expect(headers[X402_PROOF_HEADER]).toBeTruthy();
      const parsed = JSON.parse(headers[X402_PROOF_HEADER]!);
      expect(parsed.txHash).toBe('0xtx');
    });
  });

  // --------------------------------------------------------------------------
  // Constants
  // --------------------------------------------------------------------------

  it('should export header constants', () => {
    expect(X402_HEADER).toBe('X-Payment-Required');
    expect(X402_PROOF_HEADER).toBe('X-Payment-Proof');
  });
});
