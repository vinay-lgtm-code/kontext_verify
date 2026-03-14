// ============================================================================
// TRMLabsProvider Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRMLabsProvider } from '../src/integrations/provider-trm.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeProvider(overrides = {}) {
  return new TRMLabsProvider({
    apiKey: 'trm_test_123',
    ...overrides,
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TRMLabsProvider', () => {
  it('has correct metadata', () => {
    const provider = makeProvider();
    expect(provider.id).toBe('trm-labs');
    expect(provider.name).toBe('TRM Labs Sanctions Screening');
    expect(provider.lists).toContain('OFAC_SDN');
    expect(provider.browserCompatible).toBe(true);
    expect(provider.requiresApiKey).toBe(true);
    expect(provider.queryTypes).toContain('address');
  });

  it('isAvailable returns true with API key', () => {
    const provider = makeProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it('isAvailable returns false without API key', () => {
    const provider = makeProvider({ apiKey: '' });
    expect(provider.isAvailable()).toBe(false);
  });

  describe('address screening', () => {
    it('detects sanctioned address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            address: '0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b',
            isSanctioned: true,
          },
        ]),
      });

      const provider = makeProvider();
      const result = await provider.screen('0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b');

      expect(result.hit).toBe(true);
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.matchType).toBe('exact_address');
      expect(result.matches[0]!.similarity).toBe(1.0);

      // Verify fetch was called with correct URL and auth
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.trmlabs.com/public/v2/screening/addresses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer trm_test_123',
          }),
        }),
      );
    });

    it('returns no hit for clean address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            address: '0x0000000000000000000000000000000000000000',
            isSanctioned: false,
          },
        ]),
      });

      const provider = makeProvider();
      const result = await provider.screen('0x0000000000000000000000000000000000000000');

      expect(result.hit).toBe(false);
      expect(result.matches.length).toBe(0);
    });

    it('handles empty response array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      const provider = makeProvider();
      const result = await provider.screen('0x0000000000000000000000000000000000000000');

      expect(result.hit).toBe(false);
      expect(result.matches.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('handles server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const provider = makeProvider();
      const result = await provider.screen('0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b');

      expect(result.hit).toBe(false);
      expect(result.error).toContain('TRM Labs API error: 429');
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      const provider = makeProvider();
      const result = await provider.screen('0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b');

      expect(result.hit).toBe(false);
      expect(result.error).toContain('fetch failed');
    });
  });

  it('uses custom base URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ address: '0x1234', isSanctioned: false }]),
    });

    const provider = makeProvider({ baseUrl: 'https://custom.trm.io/v2' });
    await provider.screen('0x0000000000000000000000000000000000001234');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.trm.io/v2/screening/addresses',
      expect.anything(),
    );
  });
});
