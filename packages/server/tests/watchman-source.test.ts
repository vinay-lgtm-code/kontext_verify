// ============================================================================
// Watchman Source Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchmanSource } from '../src/screening/sources/watchman-source.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWatchmanEntity(overrides: Record<string, unknown> = {}) {
  return {
    entityID: '12345',
    sdnName: 'Lazarus Group',
    sdnType: 'entity',
    programs: ['CYBER2', 'DPRK'],
    addresses: [],
    alts: [],
    digitalCurrencyAddresses: [],
    ...overrides,
  };
}

function mockFetchResponse(body: unknown, status = 200, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(body),
  });
}

/** Wrap an array of SDN entries in the Watchman search response envelope */
function wrapSDNs(sdns: unknown[]) {
  return { SDNs: sdns };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WatchmanSource', () => {
  let source: WatchmanSource;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env['WATCHMAN_URL'];
    source = new WatchmanSource();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env['WATCHMAN_URL'];
  });

  // ---- isAvailable ----

  describe('isAvailable', () => {
    it('returns false when WATCHMAN_URL is not set', () => {
      expect(source.isAvailable()).toBe(false);
    });

    it('returns true when WATCHMAN_URL is set', () => {
      const s = new WatchmanSource('http://localhost:8084');
      expect(s.isAvailable()).toBe(true);
    });
  });

  // ---- fetch — basic mapping ----

  describe('fetch', () => {
    it('throws when WATCHMAN_URL is not configured', async () => {
      await expect(source.fetch()).rejects.toThrow('WATCHMAN_URL is not configured');
    });

    it('maps Watchman response to SanctionsEntity[] correctly', async () => {
      const s = new WatchmanSource('http://localhost:8084');

      const entity = makeWatchmanEntity({
        entityID: '999',
        sdnName: 'Test Entity',
        sdnType: 'entity',
        programs: ['IRAN'],
        digitalCurrencyAddresses: [
          { currency: 'ETH', address: '0xAbcDef1234567890abcdef1234567890AbCdEf12' },
        ],
        alts: [
          { alternateID: 'alt1', alternateType: 'aka', alternateName: 'Alias One' },
        ],
      });

      globalThis.fetch = mockFetchResponse(wrapSDNs([entity]));

      const result = await s.fetch();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'watchman:999',
        name: 'Test Entity',
        aliases: ['Alias One'],
        type: 'entity',
        cryptoAddresses: ['0xabcdef1234567890abcdef1234567890abcdef12'],
        lists: ['OFAC_SDN'],
        programs: ['IRAN'],
        status: 'active',
        sourceIds: { watchman: '999' },
      });
    });

    // ---- Entity type mapping ----

    it('maps individual to person', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({ sdnType: 'individual' })]));

      const result = await s.fetch();
      expect(result[0]!.type).toBe('person');
    });

    it('maps entity to entity', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({ sdnType: 'entity' })]));

      const result = await s.fetch();
      expect(result[0]!.type).toBe('entity');
    });

    it('maps vessel to vessel', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({ sdnType: 'vessel' })]));

      const result = await s.fetch();
      expect(result[0]!.type).toBe('vessel');
    });

    it('maps aircraft to aircraft', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({ sdnType: 'aircraft' })]));

      const result = await s.fetch();
      expect(result[0]!.type).toBe('aircraft');
    });

    it('maps unknown type to unknown', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({ sdnType: 'spaceship' })]));

      const result = await s.fetch();
      expect(result[0]!.type).toBe('unknown');
    });

    // ---- Crypto address extraction ----

    it('extracts multiple crypto addresses from digitalCurrencyAddresses', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({
        digitalCurrencyAddresses: [
          { currency: 'ETH', address: '0xAbcDef1234567890abcdef1234567890AbCdEf12' },
          { currency: 'BTC', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
        ],
      })]));

      const result = await s.fetch();
      expect(result[0]!.cryptoAddresses).toEqual([
        '0xabcdef1234567890abcdef1234567890abcdef12',
        '1a1zp1ep5qgefi2dmptftl5slmv7divfna',
      ]);
    });

    // ---- Alias collection ----

    it('collects aliases from alts', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({
        sdnName: 'Primary Name',
        alts: [
          { alternateID: 'alt1', alternateType: 'aka', alternateName: 'Alias A' },
          { alternateID: 'alt2', alternateType: 'fka', alternateName: 'Alias B' },
        ],
      })]));

      const result = await s.fetch();
      expect(result[0]!.aliases).toEqual(['Alias A', 'Alias B']);
    });

    it('excludes primary name from aliases', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({
        sdnName: 'Same Name',
        alts: [
          { alternateID: 'alt1', alternateType: 'aka', alternateName: 'Same Name' },
          { alternateID: 'alt2', alternateType: 'aka', alternateName: 'Different Name' },
        ],
      })]));

      const result = await s.fetch();
      expect(result[0]!.aliases).toEqual(['Different Name']);
    });

    // ---- Programs ----

    it('extracts programs correctly', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({
        programs: ['IRAN', 'DPRK', 'CYBER2'],
      })]));

      const result = await s.fetch();
      expect(result[0]!.programs).toEqual(['IRAN', 'DPRK', 'CYBER2']);
    });

    it('handles entity with no programs', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([makeWatchmanEntity({ programs: undefined })]));

      const result = await s.fetch();
      expect(result[0]!.programs).toEqual([]);
    });

    // ---- Empty / edge cases ----

    it('returns empty array for empty SDNs', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([]));

      const result = await s.fetch();
      expect(result).toEqual([]);
    });

    it('returns empty array when SDNs key is missing', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse({ error: 'something' });

      const result = await s.fetch();
      expect(result).toEqual([]);
    });

    // ---- Error handling ----

    it('throws on HTTP 500', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(null, 500, false);

      await expect(s.fetch()).rejects.toThrow(/Watchman fetch failed: 500/);
    });

    it('throws on network error', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(s.fetch()).rejects.toThrow('ECONNREFUSED');
    });

    // ---- URL construction ----

    it('strips trailing slash from base URL', async () => {
      const s = new WatchmanSource('http://localhost:8084/');
      globalThis.fetch = mockFetchResponse(wrapSDNs([]));

      await s.fetch();

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8084/v2/search?type=person&limit=10000');
    });

    // ---- Multiple entities ----

    it('handles multiple entities in response', async () => {
      const s = new WatchmanSource('http://localhost:8084');
      globalThis.fetch = mockFetchResponse(wrapSDNs([
        makeWatchmanEntity({ entityID: '1', sdnName: 'Entity One', sdnType: 'individual' }),
        makeWatchmanEntity({ entityID: '2', sdnName: 'Entity Two', sdnType: 'vessel' }),
        makeWatchmanEntity({ entityID: '3', sdnName: 'Entity Three', sdnType: 'aircraft' }),
      ]));

      const result = await s.fetch();
      expect(result).toHaveLength(3);
      expect(result[0]!.id).toBe('watchman:1');
      expect(result[1]!.id).toBe('watchman:2');
      expect(result[2]!.id).toBe('watchman:3');
    });
  });

  // ---- Source metadata ----

  describe('metadata', () => {
    it('has correct name and id', () => {
      expect(source.name).toBe('Moov Watchman');
      expect(source.id).toBe('watchman');
    });
  });
});
