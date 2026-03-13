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
// Helper
// ---------------------------------------------------------------------------
function mockProvider(overrides: {
  id?: string;
  queryTypes?: readonly QueryType[];
  lists?: readonly SanctionsList[];
  hit?: boolean;
  available?: boolean;
}): ScreeningProvider {
  const {
    id = 'mock',
    queryTypes = ['both'],
    lists = ['OFAC_SDN'],
    hit = false,
    available = true,
  } = overrides;

  return {
    id,
    name: `Mock (${id})`,
    lists,
    requiresApiKey: false,
    browserCompatible: true,
    queryTypes,
    async screen(_query: string, _context?: ScreeningContext): Promise<ScreeningResult> {
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
        durationMs: 0,
      };
    },
    isAvailable: () => available,
  };
}

// ---------------------------------------------------------------------------
// Event metering tests
// ---------------------------------------------------------------------------
describe('Screening event metering', () => {
  it('should fire onEvent for each screen() call', async () => {
    const onEvent = vi.fn();
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p' })],
      onEvent,
    });

    await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(onEvent).toHaveBeenCalledTimes(1);

    await agg.screen('Lazarus Group');
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('should fire onEvent for each query in screenBatch()', async () => {
    const onEvent = vi.fn();
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p' })],
      onEvent,
    });

    await agg.screenBatch([
      '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
      'Lazarus Group',
      '0x1111111111111111111111111111111111111111',
    ]);

    expect(onEvent).toHaveBeenCalledTimes(3);
  });

  it('should fire onEvent even when blocklisted (short-circuit)', async () => {
    const onEvent = vi.fn();
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p' })],
      blocklist: ['0xbadaddress'],
      onEvent,
    });

    await agg.screen('0xbadaddress');
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('should fire onEvent even when allowlisted (short-circuit)', async () => {
    const onEvent = vi.fn();
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p' })],
      allowlist: ['0xtrusted'],
      onEvent,
    });

    await agg.screen('0xtrusted');
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('should fire onEvent even when no providers are available', async () => {
    const onEvent = vi.fn();
    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'unavail', available: false })],
      onEvent,
    });

    await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('should fire onEvent when provider throws', async () => {
    const onEvent = vi.fn();
    const failingProvider: ScreeningProvider = {
      id: 'failing',
      name: 'Failing Provider',
      lists: ['OFAC_SDN'],
      requiresApiKey: false,
      browserCompatible: true,
      queryTypes: ['both'],
      async screen(): Promise<ScreeningResult> {
        throw new Error('Provider crashed');
      },
      isAvailable: () => true,
    };

    const agg = new ScreeningAggregator({
      providers: [failingProvider],
      onEvent,
    });

    // Should still fire onEvent even though provider throws
    await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(onEvent).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Per-provider rate limiting (implicit via metering)
// ---------------------------------------------------------------------------
describe('Screening rate tracking', () => {
  it('should track provider call count via onEvent', async () => {
    let eventCount = 0;
    const onEvent = () => { eventCount++; };

    const agg = new ScreeningAggregator({
      providers: [
        mockProvider({ id: 'a', queryTypes: ['address'] }),
        mockProvider({ id: 'b', queryTypes: ['entity_name'] }),
      ],
      onEvent,
    });

    // Address query — only 'a' is called, but 1 screen() = 1 event
    await agg.screen('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(eventCount).toBe(1);

    // Entity query — only 'b' is called, but 1 screen() = 1 event
    await agg.screen('Lazarus Group');
    expect(eventCount).toBe(2);
  });

  it('should meter both from+to in a verify-like workflow', async () => {
    let eventCount = 0;
    const onEvent = () => { eventCount++; };

    const agg = new ScreeningAggregator({
      providers: [mockProvider({ id: 'p' })],
      onEvent,
    });

    // Simulate what verify() does: screen from + screen to
    await agg.screen('0x1111111111111111111111111111111111111111');
    await agg.screen('0x2222222222222222222222222222222222222222');

    // 2 screening events from the aggregator
    expect(eventCount).toBe(2);
  });
});
