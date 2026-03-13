import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenSanctionsProvider, ChainalysisFreeAPIProvider } from '../src/integrations/provider-apis.js';
import { ChainalysisOracleProvider } from '../src/integrations/provider-ofac.js';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// OpenSanctionsProvider
// ---------------------------------------------------------------------------
describe('OpenSanctionsProvider', () => {
  const provider = new OpenSanctionsProvider({ apiKey: 'test-key' });

  it('should implement ScreeningProvider interface', () => {
    expect(provider.id).toBe('opensanctions-api');
    expect(provider.queryTypes).toEqual(['both']);
    expect(provider.requiresApiKey).toBe(true);
    expect(provider.browserCompatible).toBe(false);
    expect(provider.lists).toContain('OPENSANCTIONS');
    expect(provider.isAvailable()).toBe(true);
  });

  it('should return not available when no API key', () => {
    const noKey = new OpenSanctionsProvider({ apiKey: '' });
    expect(noKey.isAvailable()).toBe(false);
  });

  it('should screen entity names via /match endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        responses: {
          q: {
            results: [
              {
                id: 'ofac-1234',
                caption: 'Lazarus Group',
                schema: 'LegalEntity',
                properties: { name: ['Lazarus Group'] },
                datasets: ['us_ofac_sdn'],
                features: {},
                score: 0.95,
                match: true,
              },
            ],
            total: { value: 1, relation: 'eq' },
          },
        },
      }),
    });

    const result = await provider.screen('Lazarus Group');
    expect(result.hit).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.entityName).toBe('Lazarus Group');
    expect(result.matches[0]!.matchType).toBe('fuzzy_name');
    expect(result.matches[0]!.similarity).toBe(0.95);
    expect(result.providerId).toBe('opensanctions-api');

    // Verify fetch was called with correct schema for entity
    const fetchCall = mockFetch.mock.calls[0]!;
    const body = JSON.parse(fetchCall[1].body);
    expect(body.queries.q.schema).toBe('LegalEntity');
    expect(body.queries.q.properties.name).toEqual(['Lazarus Group']);
  });

  it('should screen addresses via /match endpoint with CryptoWallet schema', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        responses: {
          q: {
            results: [],
            total: { value: 0, relation: 'eq' },
          },
        },
      }),
    });

    const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(false);
    expect(result.matches).toHaveLength(0);

    // Verify fetch was called with correct schema for address
    const fetchCall = mockFetch.mock.calls[0]!;
    const body = JSON.parse(fetchCall[1].body);
    expect(body.queries.q.schema).toBe('CryptoWallet');
    expect(body.queries.q.properties.cryptoAddress).toEqual(['0x098B716B8Aaf21512996dC57EB0615e2383E2f96']);
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await provider.screen('test query');
    expect(result.hit).toBe(false);
    expect(result.error).toContain('500');
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await provider.screen('test query');
    expect(result.hit).toBe(false);
    expect(result.error).toContain('Network timeout');
  });

  it('should filter matches below 0.7 threshold', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        responses: {
          q: {
            results: [
              { id: 'low-score', caption: 'Similar Name', schema: 'LegalEntity', properties: {}, datasets: ['test'], features: {}, score: 0.5, match: false },
              { id: 'high-score', caption: 'Exact Match', schema: 'LegalEntity', properties: {}, datasets: ['test'], features: {}, score: 0.9, match: true },
            ],
            total: { value: 2, relation: 'eq' },
          },
        },
      }),
    });

    const result = await provider.screen('test');
    // Only the high-score match that was flagged as match=true and score >= 0.7
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.similarity).toBe(0.9);
  });

  it('should send Authorization header with API key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responses: { q: { results: [], total: { value: 0 } } } }),
    });

    await provider.screen('test');
    const fetchCall = mockFetch.mock.calls[0]!;
    expect(fetchCall[1].headers['Authorization']).toBe('ApiKey test-key');
  });
});

// ---------------------------------------------------------------------------
// ChainalysisFreeAPIProvider
// ---------------------------------------------------------------------------
describe('ChainalysisFreeAPIProvider', () => {
  const provider = new ChainalysisFreeAPIProvider({ apiKey: 'test-key' });

  it('should implement ScreeningProvider interface', () => {
    expect(provider.id).toBe('chainalysis-free-api');
    expect(provider.queryTypes).toEqual(['address']);
    expect(provider.requiresApiKey).toBe(true);
    expect(provider.browserCompatible).toBe(false);
    expect(provider.lists).toContain('CHAINALYSIS');
    expect(provider.isAvailable()).toBe(true);
  });

  it('should return not available when no API key', () => {
    const noKey = new ChainalysisFreeAPIProvider({ apiKey: '' });
    expect(noKey.isAvailable()).toBe(false);
  });

  it('should detect sanctioned address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        identifications: [
          {
            category: 'sanctions',
            name: 'Lazarus Group',
            description: 'OFAC designated',
            url: 'https://example.com',
          },
        ],
      }),
    });

    const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.entityName).toBe('Lazarus Group');
    expect(result.matches[0]!.matchType).toBe('exact_address');
    expect(result.matches[0]!.list).toBe('CHAINALYSIS');
  });

  it('should return clean result for non-sanctioned address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ identifications: [] }),
    });

    const result = await provider.screen('0x1111111111111111111111111111111111111111');
    expect(result.hit).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(false);
    expect(result.error).toContain('403');
  });

  it('should send X-API-Key header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ identifications: [] }),
    });

    await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    const fetchCall = mockFetch.mock.calls[0]!;
    expect(fetchCall[1].headers['X-API-Key']).toBe('test-key');
  });
});

// ---------------------------------------------------------------------------
// ChainalysisOracleProvider
// ---------------------------------------------------------------------------
describe('ChainalysisOracleProvider', () => {
  it('should implement ScreeningProvider interface', () => {
    const provider = new ChainalysisOracleProvider({ apiKey: 'test-key' });
    expect(provider.id).toBe('chainalysis-oracle');
    expect(provider.queryTypes).toEqual(['address']);
    expect(provider.requiresApiKey).toBe(true);
    expect(provider.browserCompatible).toBe(false);
    expect(provider.lists).toContain('OFAC_SDN');
    expect(provider.lists).toContain('CHAINALYSIS');
    expect(provider.isAvailable()).toBe(true);
  });

  it('should return not available when neither API key nor RPC URL configured', () => {
    const noConfig = new ChainalysisOracleProvider({});
    expect(noConfig.isAvailable()).toBe(false);
  });

  it('should screen via REST API when apiKey is configured', async () => {
    const provider = new ChainalysisOracleProvider({ apiKey: 'test-key' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        identifications: [
          { category: 'sanctions', name: 'Test Entity', description: 'OFAC', url: '' },
        ],
      }),
    });

    const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(true);
    expect(result.matches[0]!.list).toBe('OFAC_SDN');
  });

  it('should screen via on-chain oracle when rpcUrl is configured', async () => {
    const provider = new ChainalysisOracleProvider({ rpcUrl: 'https://eth-rpc.example.com' });

    // isSanctioned returns true (0x...01)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: '0x0000000000000000000000000000000000000000000000000000000000000001',
      }),
    });

    const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.program).toBe('CHAINALYSIS_ORACLE');

    // Verify eth_call was made
    const fetchCall = mockFetch.mock.calls[0]!;
    const body = JSON.parse(fetchCall[1].body);
    expect(body.method).toBe('eth_call');
  });

  it('should return no hit when on-chain oracle returns false', async () => {
    const provider = new ChainalysisOracleProvider({ rpcUrl: 'https://eth-rpc.example.com' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: '0x0000000000000000000000000000000000000000000000000000000000000000',
      }),
    });

    const result = await provider.screen('0x1111111111111111111111111111111111111111');
    expect(result.hit).toBe(false);
  });

  it('should prefer on-chain oracle over API when both configured', async () => {
    const provider = new ChainalysisOracleProvider({
      apiKey: 'test-key',
      rpcUrl: 'https://eth-rpc.example.com',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: '0x0000000000000000000000000000000000000000000000000000000000000000',
      }),
    });

    await provider.screen('0x1111111111111111111111111111111111111111');

    // Should call RPC, not REST API
    const fetchCall = mockFetch.mock.calls[0]!;
    expect(fetchCall[0]).toBe('https://eth-rpc.example.com');
  });

  it('should handle on-chain RPC errors gracefully', async () => {
    const provider = new ChainalysisOracleProvider({ rpcUrl: 'https://eth-rpc.example.com' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: { message: 'execution reverted' },
      }),
    });

    const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(false);
    expect(result.error).toContain('execution reverted');
  });

  it('should return error when no credentials configured', async () => {
    const provider = new ChainalysisOracleProvider({});
    const result = await provider.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(false);
    expect(result.error).toContain('No API key or RPC URL');
  });
});
