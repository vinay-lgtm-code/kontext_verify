import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircleComplianceEngine } from '../src/integrations/circle-compliance.js';

describe('CircleComplianceEngine', () => {
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

  it('should throw if apiKey is missing', () => {
    expect(
      () => new CircleComplianceEngine({ apiKey: '', entitySecret: 'secret' }),
    ).toThrow('Circle API key is required');
  });

  it('should throw if entitySecret is missing', () => {
    expect(
      () => new CircleComplianceEngine({ apiKey: 'key', entitySecret: '' }),
    ).toThrow('Circle entity secret is required');
  });

  it('should construct with valid config', () => {
    const engine = new CircleComplianceEngine({
      apiKey: 'test-key',
      entitySecret: 'test-secret',
    });
    expect(engine).toBeDefined();
    expect(engine.id).toBe('circle-compliance-engine');
    expect(engine.requiresApiKey).toBe(true);
    expect(engine.browserCompatible).toBe(false);
  });

  // --------------------------------------------------------------------------
  // screenAddress
  // --------------------------------------------------------------------------

  describe('screenAddress', () => {
    it('should call Circle compliance API and return result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'scr_123',
            status: 'approved',
            riskScore: 10,
            riskLevel: 'low',
            flags: [],
            details: {},
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await engine.screenAddress({ address: '0xABC123' });

      expect(result.id).toBe('scr_123');
      expect(result.status).toBe('approved');
      expect(result.riskScore).toBe(10);
      expect(result.riskLevel).toBe('low');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.circle.com/v1/w3s/compliance/screenings/addresses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'X-Entity-Secret': 'test-secret',
          }),
        }),
      );
    });

    it('should log reasoning when kontext is linked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'scr_456',
            status: 'denied',
            riskScore: 95,
            riskLevel: 'critical',
            flags: ['OFAC_SDN'],
            details: {},
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const mockKontext = { logReasoning: vi.fn().mockResolvedValue(undefined) };
      engine.setKontext(mockKontext);

      await engine.screenAddress({ address: '0xBAD', agentId: 'my-agent' });

      expect(mockKontext.logReasoning).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'my-agent',
          action: 'circle-screen-address',
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // screenTransaction
  // --------------------------------------------------------------------------

  describe('screenTransaction', () => {
    it('should call Circle compliance API for transaction screening', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'scr_789',
            status: 'approved',
            riskScore: 5,
            riskLevel: 'low',
            flags: [],
            details: {},
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await engine.screenTransaction({
        txHash: '0xabc',
        chain: 'base',
        amount: '5000',
      });

      expect(result.status).toBe('approved');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.circle.com/v1/w3s/compliance/screenings/transactions',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // getComprehensiveRisk
  // --------------------------------------------------------------------------

  describe('getComprehensiveRisk', () => {
    it('should run address + transaction screening in parallel', async () => {
      // Two API calls: address screening + transaction screening
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              id: 'scr_addr',
              status: 'approved',
              riskScore: 15,
              riskLevel: 'low',
              flags: [],
              details: {},
              createdAt: '2026-01-01T00:00:00Z',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              id: 'scr_tx',
              status: 'approved',
              riskScore: 20,
              riskLevel: 'low',
              flags: [],
              details: {},
              createdAt: '2026-01-01T00:00:00Z',
            },
          }),
        });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await engine.getComprehensiveRisk({
        txHash: '0xabc',
        chain: 'base',
        to: '0xrecipient',
      });

      expect(result.overallStatus).toBe('approved');
      expect(result.overallRiskScore).toBe(20);
      expect(result.addressScreening).not.toBeNull();
      expect(result.transactionScreening).not.toBeNull();
    });

    it('should return denied if either screening is denied', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              id: 'scr_addr',
              status: 'denied',
              riskScore: 95,
              riskLevel: 'critical',
              flags: ['OFAC_SDN'],
              details: {},
              createdAt: '2026-01-01T00:00:00Z',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              id: 'scr_tx',
              status: 'approved',
              riskScore: 10,
              riskLevel: 'low',
              flags: [],
              details: {},
              createdAt: '2026-01-01T00:00:00Z',
            },
          }),
        });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await engine.getComprehensiveRisk({
        txHash: '0xabc',
        chain: 'base',
        to: '0xrecipient',
      });

      expect(result.overallStatus).toBe('denied');
      expect(result.overallRiskScore).toBe(95);
      expect(result.overallRiskLevel).toBe('critical');
    });
  });

  // --------------------------------------------------------------------------
  // ScreeningProvider interface (screen)
  // --------------------------------------------------------------------------

  describe('screen (ScreeningProvider interface)', () => {
    it('should map Circle result to ScreeningResult format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'scr_sp',
            status: 'approved',
            riskScore: 5,
            riskLevel: 'low',
            flags: [],
            details: {},
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await engine.screen('0xaddress');

      expect(result.providerId).toBe('circle-compliance-engine');
      expect(result.hit).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should report hit when address is denied', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'scr_bad',
            status: 'denied',
            riskScore: 95,
            riskLevel: 'critical',
            flags: ['OFAC_SDN'],
            details: {},
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await engine.screen('0xbadactor');

      expect(result.hit).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]!.list).toBe('OFAC_SDN');
    });
  });

  // --------------------------------------------------------------------------
  // Error handling
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const engine = new CircleComplianceEngine({
        apiKey: 'bad-key',
        entitySecret: 'test-secret',
      });

      await expect(engine.screenAddress({ address: '0xtest' }))
        .rejects.toThrow('Circle Compliance API error 401');
    });

    it('screen() should return error result on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const engine = new CircleComplianceEngine({
        apiKey: 'test-key',
        entitySecret: 'test-secret',
      });

      const result = await engine.screen('0xtest');
      expect(result.hit).toBe(false);
      expect(result.error).toContain('Circle Compliance API error 500');
    });
  });

  it('isAvailable should return true', () => {
    const engine = new CircleComplianceEngine({
      apiKey: 'test-key',
      entitySecret: 'test-secret',
    });
    expect(engine.isAvailable()).toBe(true);
  });
});
