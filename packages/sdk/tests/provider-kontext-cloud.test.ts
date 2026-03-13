// ============================================================================
// KontextCloudScreeningProvider Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KontextCloudScreeningProvider } from '../src/integrations/provider-kontext-cloud.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeProvider(overrides = {}) {
  return new KontextCloudScreeningProvider({
    apiKey: 'sk_test_123',
    projectId: 'test-project',
    apiUrl: 'https://api.test.com',
    ...overrides,
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('KontextCloudScreeningProvider', () => {
  it('has correct metadata', () => {
    const provider = makeProvider();
    expect(provider.id).toBe('kontext-cloud');
    expect(provider.name).toBe('Kontext Cloud Screening');
    expect(provider.lists).toContain('OFAC_SDN');
    expect(provider.lists).toContain('UK_OFSI');
    expect(provider.lists).toContain('EU_CONSOLIDATED');
    expect(provider.browserCompatible).toBe(true);
    expect(provider.requiresApiKey).toBe(true);
    expect(provider.queryTypes).toContain('both');
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
    it('calls address endpoint for blockchain addresses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hit: true,
          address: '0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b',
          entity: {
            id: 'ofac:1001',
            name: 'Lazarus Group',
            type: 'entity',
            lists: ['OFAC_SDN'],
            programs: ['CYBER2'],
            status: 'active',
          },
          listsChecked: ['OFAC_SDN', 'UK_OFSI', 'EU_CONSOLIDATED'],
          totalAddresses: 1300,
          durationMs: 0.01,
        }),
      });

      const provider = makeProvider();
      const result = await provider.screen('0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b');

      expect(result.hit).toBe(true);
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.matchType).toBe('exact_address');
      expect(result.matches[0]!.entityName).toBe('Lazarus Group');
      expect(result.matches[0]!.similarity).toBe(1.0);

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/screening/address',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk_test_123',
            'X-Project-Id': 'test-project',
          }),
        }),
      );
    });

    it('returns no hit for clean address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hit: false,
          address: '0x0000000000000000000000000000000000000000',
          listsChecked: ['OFAC_SDN', 'UK_OFSI', 'EU_CONSOLIDATED'],
          totalAddresses: 1300,
          durationMs: 0.01,
        }),
      });

      const provider = makeProvider();
      const result = await provider.screen('0x0000000000000000000000000000000000000000');

      expect(result.hit).toBe(false);
      expect(result.matches.length).toBe(0);
    });
  });

  describe('entity screening', () => {
    it('calls entity endpoint for non-address queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hit: true,
          query: 'Lazarus Group',
          matches: [
            {
              entityId: 'ofac:1001',
              name: 'Lazarus Group',
              matchedOn: 'Lazarus Group',
              similarity: 1.0,
              type: 'entity',
              lists: ['OFAC_SDN'],
              programs: ['CYBER2'],
              status: 'active',
              cryptoAddresses: ['0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b'],
            },
          ],
          threshold: 0.85,
          listsChecked: ['OFAC_SDN', 'UK_OFSI', 'EU_CONSOLIDATED'],
          totalEntities: 95000,
          durationMs: 2.5,
        }),
      });

      const provider = makeProvider();
      const result = await provider.screen('Lazarus Group');

      expect(result.hit).toBe(true);
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.matchType).toBe('fuzzy_name');
      expect(result.matches[0]!.entityName).toBe('Lazarus Group');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/screening/entity',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('matches aliases as alias_match type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hit: true,
          query: 'HIDDEN COBRA',
          matches: [
            {
              entityId: 'ofac:1001',
              name: 'Lazarus Group',
              matchedOn: 'HIDDEN COBRA',
              similarity: 1.0,
              type: 'entity',
              lists: ['OFAC_SDN'],
              programs: ['CYBER2'],
              status: 'active',
              cryptoAddresses: [],
            },
          ],
          threshold: 0.85,
          listsChecked: ['OFAC_SDN'],
          totalEntities: 95000,
          durationMs: 3.0,
        }),
      });

      const provider = makeProvider();
      const result = await provider.screen('HIDDEN COBRA');

      expect(result.matches[0]!.matchType).toBe('alias_match');
    });
  });

  describe('error handling', () => {
    it('handles server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const provider = makeProvider();
      const result = await provider.screen('Lazarus Group');

      expect(result.hit).toBe(false);
      expect(result.error).toContain('Server error: 500');
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      const provider = makeProvider();
      const result = await provider.screen('Lazarus Group');

      expect(result.hit).toBe(false);
      expect(result.error).toContain('fetch failed');
    });
  });
});
