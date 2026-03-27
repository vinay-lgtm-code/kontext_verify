// ============================================================================
// Yente Source Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YenteSource } from '../src/screening/sources/yente-source.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeYenteEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'Q12345',
    caption: 'Test Person',
    schema: 'Person',
    properties: {
      name: ['Test Person'],
      alias: [],
      weakAlias: [],
    },
    datasets: ['default'],
    ...overrides,
  };
}

function makeYentePage(
  results: unknown[],
  total: number,
  offset = 0,
  limit = 10000,
) {
  return {
    results,
    total,
    limit,
    offset,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('YenteSource', () => {
  let source: YenteSource;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    source = new YenteSource();
    delete process.env['YENTE_URL'];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env['YENTE_URL'];
  });

  // ---- isAvailable ----

  describe('isAvailable', () => {
    it('returns false when YENTE_URL is not set', () => {
      expect(source.isAvailable()).toBe(false);
    });

    it('returns true when YENTE_URL is set', () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      expect(source.isAvailable()).toBe(true);
    });
  });

  // ---- fetch ----

  describe('fetch', () => {
    it('returns empty array when YENTE_URL is not set', async () => {
      const result = await source.fetch();
      expect(result).toEqual([]);
    });

    it('maps FtM entity format correctly', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';

      const entity = makeYenteEntity({
        id: 'Q999',
        caption: 'Kim Jong Un',
        schema: 'Person',
        properties: {
          name: ['Kim Jong Un', 'Kim Jong-un'],
          alias: ['Kim Jeong-eun'],
          weakAlias: ['Rocket Man'],
          topics: ['DPRK'],
        },
      });

      globalThis.fetch = mockFetchResponse(makeYentePage([entity], 1));

      const result = await source.fetch();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'os:Q999',
        name: 'Kim Jong Un',
        aliases: ['Kim Jong-un', 'Kim Jeong-eun', 'Rocket Man'],
        type: 'person',
        cryptoAddresses: [],
        lists: ['OPENSANCTIONS'],
        programs: ['DPRK'],
        status: 'active',
        sourceIds: { opensanctions: 'Q999' },
      });
    });

    // ---- Schema mapping ----

    it('maps Person schema to person', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({ schema: 'Person' })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.type).toBe('person');
    });

    it('maps Company schema to entity', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({ schema: 'Company', caption: 'Test Corp' })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.type).toBe('entity');
    });

    it('maps Organization schema to entity', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({ schema: 'Organization', caption: 'Test Org' })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.type).toBe('entity');
    });

    it('maps Vessel schema to vessel', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({ schema: 'Vessel', caption: 'MV Test' })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.type).toBe('vessel');
    });

    it('maps Airplane schema to aircraft', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({ schema: 'Airplane', caption: 'Jet 1' })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.type).toBe('aircraft');
    });

    it('skips non-relevant schemas', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([
          makeYenteEntity({ schema: 'Address', caption: '123 Main St' }),
          makeYenteEntity({ schema: 'Person', id: 'Q1', caption: 'Valid Person' }),
        ], 2),
      );

      const result = await source.fetch();
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Valid Person');
    });

    // ---- Pagination ----

    it('handles multi-page responses', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';

      const page1 = makeYentePage(
        [makeYenteEntity({ id: 'Q1', caption: 'Person One' })],
        2, 0, 10000,
      );
      const page2 = makeYentePage(
        [makeYenteEntity({ id: 'Q2', caption: 'Person Two' })],
        2, 1, 10000,
      );

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        const body = callCount === 1 ? page1 : page2;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(body),
        });
      });

      const result = await source.fetch();
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('os:Q1');
      expect(result[1]!.id).toBe('os:Q2');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    // ---- Crypto address detection ----

    it('detects ETH 0x addresses from cryptoWalletId property', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({
          properties: {
            name: ['Crypto Guy'],
            cryptoWalletId: ['0xAbcDef1234567890abcdef1234567890AbCdEf12'],
          },
        })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.cryptoAddresses).toEqual(['0xabcdef1234567890abcdef1234567890abcdef12']);
    });

    it('detects BTC addresses from address property', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({
          properties: {
            name: ['BTC Guy'],
            address: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
          },
        })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.cryptoAddresses).toEqual(['1a1zp1ep5qgefi2dmptftl5slmv7divfna']);
    });

    it('ignores non-crypto strings in address property', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({
          properties: {
            name: ['Normal Guy'],
            address: ['123 Main Street, City, Country'],
          },
        })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.cryptoAddresses).toEqual([]);
    });

    // ---- Alias extraction ----

    it('extracts aliases from alias and weakAlias properties', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({
          caption: 'Primary Name',
          properties: {
            name: ['Primary Name', 'Alt Name 1'],
            alias: ['Alias A', 'Alias B'],
            weakAlias: ['Weak Alias C'],
          },
        })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.aliases).toEqual(['Alt Name 1', 'Alias A', 'Alias B', 'Weak Alias C']);
    });

    it('excludes primary name (caption) from aliases', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({
          caption: 'Same Name',
          properties: {
            name: ['Same Name'],
            alias: ['Same Name', 'Different Name'],
          },
        })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.aliases).toEqual(['Different Name']);
    });

    it('caps aliases at 50', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      const manyAliases = Array.from({ length: 60 }, (_, i) => `Alias ${i}`);
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({
          caption: 'Many Aliases Person',
          properties: { name: ['Many Aliases Person'], alias: manyAliases },
        })], 1),
      );

      const result = await source.fetch();
      expect(result[0]!.aliases.length).toBe(50);
    });

    // ---- Empty dataset ----

    it('returns empty array for empty results', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(makeYentePage([], 0));

      const result = await source.fetch();
      expect(result).toEqual([]);
    });

    it('skips entities without caption', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(
        makeYentePage([makeYenteEntity({ caption: '' })], 1),
      );

      const result = await source.fetch();
      expect(result).toEqual([]);
    });

    // ---- Error handling ----

    it('throws on API error', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = mockFetchResponse(null, 500, false);

      await expect(source.fetch()).rejects.toThrow(/Yente API error: 500/);
    });

    it('throws on network error', async () => {
      process.env['YENTE_URL'] = 'http://localhost:9000';
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(source.fetch()).rejects.toThrow('Network failure');
    });
  });

  // ---- Metadata ----

  describe('metadata', () => {
    it('has correct name and id', () => {
      expect(source.name).toBe('OpenSanctions (Yente)');
      expect(source.id).toBe('opensanctions');
    });
  });
});
