// ============================================================================
// x402 Middleware Tests
// ============================================================================
// Tests for the x402 USDC payment middleware. All external calls are mocked.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createX402Middleware } from '../src/x402.js';
import type { X402PaymentInfo } from '../src/x402.js';

// ---------------------------------------------------------------------------
// Mock environment
// ---------------------------------------------------------------------------

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env['X402_ENABLED'] = 'true';
  process.env['KONTEXT_PAYEE_ADDRESS'] = '0x18F596CCE5d414C1C0c71e68257f22c24d965434';
  process.env['X402_PRICE_PER_EVENT'] = '0.002';
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: create mock Hono context
// ---------------------------------------------------------------------------

function createMockContext(opts: {
  headers?: Record<string, string>;
  url?: string;
}): { c: Record<string, unknown>; response: { status: number; body: unknown; headers: Record<string, string> } | null } {
  const headers = opts.headers ?? {};
  const responseRef: { status: number; body: unknown; headers: Record<string, string> } | null = null;
  const responseHeaders: Record<string, string> = {};

  const c = {
    req: {
      header: (name: string) => headers[name],
      url: opts.url ?? 'https://api.getkontext.com/v1/actions',
    },
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
      const result = {
        status: init?.status ?? 200,
        body,
        headers: { ...responseHeaders, ...(init?.headers ?? {}) },
      };
      return result as unknown as Response;
    },
    header: (name: string, value: string) => {
      responseHeaders[name] = value;
    },
  };

  return { c: c as unknown as Record<string, unknown>, response: responseRef };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('x402 Middleware', () => {
  // =========================================================================
  // Pass-through scenarios (no 402)
  // =========================================================================

  describe('Pass-through scenarios', () => {
    it('should pass through when x402 is disabled', async () => {
      process.env['X402_ENABLED'] = 'false';

      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_free' },
      });

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 25_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      await middleware(c as never, next);
      expect(nextCalled).toBe(true);
    });

    it('should pass through for Pro plan users', async () => {
      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_pro' },
      });

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      const middleware = createX402Middleware(
        () => ({ plan: 'pro', eventCount: 50_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      await middleware(c as never, next);
      expect(nextCalled).toBe(true);
    });

    it('should pass through for Enterprise plan users', async () => {
      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_ent' },
      });

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      const middleware = createX402Middleware(
        () => ({ plan: 'enterprise', eventCount: 100_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      await middleware(c as never, next);
      expect(nextCalled).toBe(true);
    });

    it('should pass through when under free tier limit (20K)', async () => {
      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_free' },
      });

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 15_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      await middleware(c as never, next);
      expect(nextCalled).toBe(true);
    });

    it('should pass through at exactly 20K events (boundary)', async () => {
      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_free' },
      });

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 20_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      await middleware(c as never, next);
      expect(nextCalled).toBe(true);
    });
  });

  // =========================================================================
  // 402 Response (no payment header)
  // =========================================================================

  describe('402 Response', () => {
    it('should return 402 when over limit and no payment header', async () => {
      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_free' },
        url: 'https://api.getkontext.com/v1/actions',
      });

      const next = vi.fn();

      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 25_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      const response = await middleware(c as never, next) as unknown as { status: number; body: Record<string, unknown> };

      expect(next).not.toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(response.status).toBe(402);
      expect(response.body.error).toBe('Payment required');
      expect(response.body.accepts).toBeDefined();
    });

    it('should include correct payment requirements in 402 response', async () => {
      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_free' },
        url: 'https://api.getkontext.com/v1/actions',
      });

      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 25_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      const response = await middleware(c as never, vi.fn()) as unknown as { body: Record<string, unknown>; headers: Record<string, string> };

      const accepts = response.body.accepts as Array<Record<string, unknown>>;
      expect(accepts).toHaveLength(1);
      expect(accepts[0]!.scheme).toBe('exact');
      expect(accepts[0]!.network).toBe('base');
      expect(accepts[0]!.maxAmountRequired).toBe('0.002');
      expect(accepts[0]!.payTo).toBe('0x18F596CCE5d414C1C0c71e68257f22c24d965434');
      expect(accepts[0]!.asset).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');

      // Payment-Required header
      expect(response.headers['Payment-Required']).toBeDefined();
    });
  });

  // =========================================================================
  // Payment verification (with payment header)
  // =========================================================================

  describe('Payment verification', () => {
    it('should return 402 when payment verification fails (invalid JSON)', async () => {
      const { c } = createMockContext({
        headers: {
          Authorization: 'Bearer sk_test_free',
          'Payment-Signature': 'not-valid-json',
        },
      });

      // Mock fetch to return a failed verification
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });
      vi.stubGlobal('fetch', mockFetch);

      const creditEvent = vi.fn();
      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 25_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        creditEvent,
      );

      const response = await middleware(c as never, vi.fn()) as unknown as { status: number };

      expect(creditEvent).not.toHaveBeenCalled();
      expect(response.status).toBe(402);
    });

    it('should accept X-Payment header (V1 compat)', async () => {
      const { c } = createMockContext({
        headers: {
          Authorization: 'Bearer sk_test_free',
          'X-Payment': JSON.stringify({ x402Version: 1, scheme: 'exact', network: 'base', payload: {} }),
        },
      });

      // Mock fetch for verify + settle
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, payer: '0xPayer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, transaction: '0xTxHash', payer: '0xPayer', network: 'base' }),
        });
      vi.stubGlobal('fetch', mockFetch);

      let nextCalled = false;
      const next = async () => { nextCalled = true; };
      const creditEvent = vi.fn();

      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 25_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        creditEvent,
      );

      await middleware(c as never, next);

      expect(nextCalled).toBe(true);
      expect(creditEvent).toHaveBeenCalledOnce();
      const payment = creditEvent.mock.calls[0]![1] as X402PaymentInfo;
      expect(payment.verified).toBe(true);
      expect(payment.payer).toBe('0xPayer');
      expect(payment.txHash).toBe('0xTxHash');
    });

    it('should credit event and proceed on successful payment', async () => {
      const { c } = createMockContext({
        headers: {
          Authorization: 'Bearer sk_test_free',
          'Payment-Signature': JSON.stringify({ x402Version: 1, scheme: 'exact', network: 'base', payload: {} }),
        },
      });

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, payer: '0xAgent' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, transaction: '0xSettleTx', payer: '0xAgent', network: 'base' }),
        });
      vi.stubGlobal('fetch', mockFetch);

      let nextCalled = false;
      const next = async () => { nextCalled = true; };
      const creditEvent = vi.fn();

      const middleware = createX402Middleware(
        () => ({ plan: 'free', eventCount: 25_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        creditEvent,
      );

      await middleware(c as never, next);

      expect(nextCalled).toBe(true);
      expect(creditEvent).toHaveBeenCalledOnce();
      expect(creditEvent).toHaveBeenCalledWith('sk_test_free', expect.objectContaining({
        verified: true,
        payer: '0xAgent',
        txHash: '0xSettleTx',
        amountUsdc: '0.002',
        network: 'base',
      }));
    });
  });

  // =========================================================================
  // Stripe coexistence
  // =========================================================================

  describe('Stripe coexistence', () => {
    it('should never show 402 to Pro users regardless of event count', async () => {
      const { c } = createMockContext({
        headers: { Authorization: 'Bearer sk_test_pro' },
      });

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      const middleware = createX402Middleware(
        () => ({ plan: 'pro', eventCount: 500_000, x402EventCount: 0, x402TotalUsdcReceived: '0' }),
        vi.fn(),
      );

      await middleware(c as never, next);
      expect(nextCalled).toBe(true);
    });
  });
});
