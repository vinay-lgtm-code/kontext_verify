import { describe, it, expect, vi } from 'vitest';
import { ScreeningAggregator } from '../src/integrations/screening-aggregator.js';
import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningContext,
  QueryType,
  SanctionsList,
} from '../src/integrations/screening-provider.js';

// ---------------------------------------------------------------------------
// Helper: configurable mock provider
// ---------------------------------------------------------------------------
function mockProvider(overrides: {
  id?: string;
  queryTypes?: readonly QueryType[];
  lists?: readonly SanctionsList[];
  hit?: boolean;
  requiresApiKey?: boolean;
  browserCompatible?: boolean;
  available?: boolean;
  delay?: number;
  shouldThrow?: boolean;
}): ScreeningProvider {
  const {
    id = 'mock',
    queryTypes = ['both'],
    lists = ['OFAC_SDN'],
    hit = false,
    requiresApiKey = false,
    browserCompatible = true,
    available = true,
    delay = 0,
    shouldThrow = false,
  } = overrides;

  return {
    id,
    name: `Mock Provider (${id})`,
    lists,
    requiresApiKey,
    browserCompatible,
    queryTypes,
    async screen(_query: string, _context?: ScreeningContext): Promise<ScreeningResult> {
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
      if (shouldThrow) {
        throw new Error(`Provider ${id} failed`);
      }
      return {
        providerId: id,
        hit,
        matches: hit
          ? [{
              list: lists[0] ?? 'OFAC_SDN',
              matchType: 'exact_address',
              similarity: 1.0,
              matchedValue: 'test',
              entityStatus: 'active',
            }]
          : [],
        listsChecked: lists,
        entriesSearched: 100,
        durationMs: delay,
      };
    },
    isAvailable: () => available,
  };
}

// ---------------------------------------------------------------------------
// Query routing
// ---------------------------------------------------------------------------
describe('ScreeningAggregator — query routing', () => {
  it('should route address queries to address-capable providers only', async () => {
    const addressProvider = mockProvider({ id: 'addr', queryTypes: ['address'], hit: true });
    const entityProvider = mockProvider({ id: 'entity', queryTypes: ['entity_name'], hit: true });
    const screenSpy = vi.spyOn(entityProvider, 'screen');

    const agg = new ScreeningAggregator({
      providers: [addressProvider, entityProvider],
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(true);
    expect(result.queryType).toBe('address');
    expect(screenSpy).not.toHaveBeenCalled();
    expect(result.totalProviders).toBe(1);
  });

  it('should route entity name queries to entity-capable providers only', async () => {
    const addressProvider = mockProvider({ id: 'addr', queryTypes: ['address'], hit: true });
    const entityProvider = mockProvider({ id: 'entity', queryTypes: ['entity_name'], hit: true });
    const addrSpy = vi.spyOn(addressProvider, 'screen');

    const agg = new ScreeningAggregator({
      providers: [addressProvider, entityProvider],
    });

    const result = await agg.screen('Lazarus Group');
    expect(result.hit).toBe(true);
    expect(result.queryType).toBe('entity_name');
    expect(addrSpy).not.toHaveBeenCalled();
    expect(result.totalProviders).toBe(1);
  });

  it('should include "both" providers for any query type', async () => {
    const bothProvider = mockProvider({ id: 'both', queryTypes: ['both'], hit: true });

    const agg = new ScreeningAggregator({ providers: [bothProvider] });

    const addrResult = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(addrResult.totalProviders).toBe(1);

    const nameResult = await agg.screen('Lazarus Group');
    expect(nameResult.totalProviders).toBe(1);
  });

  it('should skip unavailable providers', async () => {
    const available = mockProvider({ id: 'up', hit: true, available: true });
    const unavailable = mockProvider({ id: 'down', hit: true, available: false });
    const downSpy = vi.spyOn(unavailable, 'screen');

    const agg = new ScreeningAggregator({ providers: [available, unavailable] });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.totalProviders).toBe(1);
    expect(downSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Consensus strategies
// ---------------------------------------------------------------------------
describe('ScreeningAggregator — consensus', () => {
  it('ANY_MATCH: hit when any provider flags', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', hit: true }),
        mockProvider({ id: 'b', hit: false }),
        mockProvider({ id: 'c', hit: false }),
      ],
      consensus: 'ANY_MATCH',
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(true);
    expect(result.hitCount).toBe(1);
    expect(result.consensus).toBe('ANY_MATCH');
  });

  it('ALL_MATCH: no hit unless all providers flag', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', hit: true }),
        mockProvider({ id: 'b', hit: false }),
      ],
      consensus: 'ALL_MATCH',
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(false);
    expect(result.hitCount).toBe(1);
  });

  it('ALL_MATCH: hit when all providers flag', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', hit: true }),
        mockProvider({ id: 'b', hit: true }),
      ],
      consensus: 'ALL_MATCH',
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(true);
  });

  it('MAJORITY: hit when majority of providers flag', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', hit: true }),
        mockProvider({ id: 'b', hit: true }),
        mockProvider({ id: 'c', hit: false }),
      ],
      consensus: 'MAJORITY',
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(true);
    expect(result.hitCount).toBe(2);
  });

  it('MAJORITY: no hit when minority flags', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', hit: true }),
        mockProvider({ id: 'b', hit: false }),
        mockProvider({ id: 'c', hit: false }),
      ],
      consensus: 'MAJORITY',
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(false);
  });

  it('defaults to ANY_MATCH when consensus not specified', async () => {
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'a', hit: true })],
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.consensus).toBe('ANY_MATCH');
    expect(result.hit).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Blocklist / Allowlist
// ---------------------------------------------------------------------------
describe('ScreeningAggregator — blocklist/allowlist', () => {
  it('should block addresses on the blocklist without querying providers', async () => {
    const provider = mockProvider({ id: 'p', hit: false });
    const spy = vi.spyOn(provider, 'screen');

    const agg = new ScreeningAggregator({
      providers: [provider],
      blocklist: ['0xBadAddress'],
    });

    const result = await agg.screen('0xbadaddress'); // case-insensitive
    expect(result.hit).toBe(true);
    expect(result.blocklisted).toBe(true);
    expect(result.totalProviders).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should allow addresses on the allowlist without querying providers', async () => {
    const provider = mockProvider({ id: 'p', hit: true });
    const spy = vi.spyOn(provider, 'screen');

    const agg = new ScreeningAggregator({
      providers: [provider],
      allowlist: ['0xTrustedAddress'],
    });

    const result = await agg.screen('0xtrustedaddress'); // case-insensitive
    expect(result.hit).toBe(false);
    expect(result.allowlisted).toBe(true);
    expect(result.totalProviders).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('allowlist overrides blocklist', async () => {
    const agg = new ScreeningAggregator({
      providers: [],
      blocklist: ['0xConflict'],
      allowlist: ['0xConflict'],
    });

    // Allowlist is checked first per the implementation
    const result = await agg.screen('0xconflict');
    expect(result.hit).toBe(false);
    expect(result.allowlisted).toBe(true);
  });

  it('blocklist works for entity names', async () => {
    const agg = new ScreeningAggregator({
      providers: [],
      blocklist: ['Evil Corp'],
    });

    const result = await agg.screen('evil corp');
    expect(result.hit).toBe(true);
    expect(result.blocklisted).toBe(true);
    expect(result.queryType).toBe('entity_name');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe('ScreeningAggregator — error handling', () => {
  it('should continue on provider error when continueOnError is true (default)', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'fails', shouldThrow: true }),
        mockProvider({ id: 'ok', hit: false }),
      ],
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.providerId).toBe('fails');
    expect(result.totalProviders).toBe(1); // only 'ok' returned result
  });

  it('should throw when continueOnError is false and a provider fails', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'fails', shouldThrow: true }),
        mockProvider({ id: 'ok', hit: false }),
      ],
      continueOnError: false,
    });

    await expect(
      agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96'),
    ).rejects.toThrow('Provider fails failed');
  });

  it('should handle provider timeout', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'slow', delay: 200, hit: true }),
        mockProvider({ id: 'fast', delay: 0, hit: false }),
      ],
      providerTimeoutMs: 50,
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    // The slow provider should have timed out
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.error).toContain('timed out');
    // Only fast provider result counted
    expect(result.totalProviders).toBe(1);
    expect(result.hit).toBe(false);
  });

  it('should return no hit when zero providers are available', async () => {
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'unavail', available: false })],
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.hit).toBe(false);
    expect(result.totalProviders).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Event metering
// ---------------------------------------------------------------------------
describe('ScreeningAggregator — event metering', () => {
  it('should fire onEvent for each screen() call', async () => {
    const onEvent = vi.fn();
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p' })],
      onEvent,
    });

    await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    await agg.screen('Lazarus Group');
    expect(onEvent).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Batch screening
// ---------------------------------------------------------------------------
describe('ScreeningAggregator — batch', () => {
  it('should screen multiple queries in batch', async () => {
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p', hit: false })],
    });

    const results = await agg.screenBatch([
      '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
      'Lazarus Group',
    ]);

    expect(results.size).toBe(2);
    expect(results.has('0x098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(true);
    expect(results.has('Lazarus Group')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Coverage helpers
// ---------------------------------------------------------------------------
describe('ScreeningAggregator — coverage', () => {
  it('should report available providers filtered by query type', () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'addr', queryTypes: ['address'] }),
        mockProvider({ id: 'entity', queryTypes: ['entity_name'] }),
        mockProvider({ id: 'both', queryTypes: ['both'] }),
      ],
    });

    expect(agg.getAvailableProviders('address')).toHaveLength(2);  // addr + both
    expect(agg.getAvailableProviders('entity_name')).toHaveLength(2);  // entity + both
    expect(agg.getAvailableProviders()).toHaveLength(3);  // all
  });

  it('should report covered lists', () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', lists: ['OFAC_SDN'] }),
        mockProvider({ id: 'b', lists: ['UK_OFSI'] }),
        mockProvider({ id: 'c', lists: ['OFAC_SDN', 'EU_CONSOLIDATED'] }),
      ],
    });

    const covered = agg.getCoveredLists();
    expect(covered).toContain('OFAC_SDN');
    expect(covered).toContain('UK_OFSI');
    expect(covered).toContain('EU_CONSOLIDATED');
  });

  it('should report uncovered lists based on context', async () => {
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'a', lists: ['OFAC_SDN'] })],
    });

    // EUR currency requires EU_CONSOLIDATED which is not covered
    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96', {
      currency: 'EUR',
    });

    expect(result.uncoveredLists).toContain('EU_CONSOLIDATED');
  });

  it('should track duration', async () => {
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p', delay: 10 })],
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should aggregate lists checked from all providers', async () => {
    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', lists: ['OFAC_SDN'] }),
        mockProvider({ id: 'b', lists: ['UK_OFSI'] }),
      ],
    });

    const result = await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.listsChecked).toContain('OFAC_SDN');
    expect(result.listsChecked).toContain('UK_OFSI');
  });
});
