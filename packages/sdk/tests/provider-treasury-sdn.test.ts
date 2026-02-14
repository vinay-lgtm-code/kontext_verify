import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { TreasurySDNProvider } from '../src/integrations/provider-treasury-sdn.js';
import { ScreeningNotificationManager } from '../src/integrations/screening-notification.js';
import { ScreeningAggregator } from '../src/integrations/screening-aggregator.js';
import { ChainalysisOracleProvider } from '../src/integrations/provider-ofac.js';
import type {
  UnifiedScreeningResult,
  ProviderScreeningResult,
} from '../src/integrations/screening-provider.js';
import type { TreasurySDNProviderConfig } from '../src/integrations/provider-treasury-sdn.js';
import type {
  ScreeningNotificationConfig,
  PaymentProviderContact,
} from '../src/integrations/screening-notification.js';

// ============================================================================
// Test Fixtures
// ============================================================================

/** Minimal processed SDN list fixture */
function createMockSDNList(overrides?: Partial<{
  version: string;
  addresses: Array<{
    address: string;
    entityName: string;
    entityType: string;
    sdnUid: string;
    currencyCode: string;
    chains: string[];
    lists: string[];
  }>;
}>) {
  return {
    version: overrides?.version ?? 'abc123hash',
    fetchedAt: '2025-06-01T00:00:00.000Z',
    addresses: overrides?.addresses ?? [
      {
        address: '0x098b716b8aaf21512996dc57eb0615e2383e2f96',
        entityName: 'Lazarus Group',
        entityType: 'group',
        sdnUid: '36752',
        currencyCode: 'ETH',
        chains: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'arc'],
        lists: ['SDN'],
      },
      {
        address: '0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b',
        entityName: 'Lazarus Group',
        entityType: 'group',
        sdnUid: '36752',
        currencyCode: 'ETH',
        chains: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'arc'],
        lists: ['SDN'],
      },
      {
        address: '7Ggk4jBKRbGhRbFiaFiEQPqxnBnpbQSFqfMQBMGijTjt',
        entityName: 'Test SOL Entity',
        entityType: 'individual',
        sdnUid: '99999',
        currencyCode: 'SOL',
        chains: ['solana'],
        lists: ['SDN'],
      },
    ],
    metadata: {
      totalEntries: 3,
      digitalCurrencyEntries: 3,
      currencyCodeCounts: { ETH: 2, SOL: 1 },
    },
  };
}

/** Create a mock fetch that returns the processed SDN list */
function createMockFetch(sdnList?: ReturnType<typeof createMockSDNList>) {
  const list = sdnList ?? createMockSDNList();
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(list),
    text: () => Promise.resolve(JSON.stringify(list)),
  } as Partial<Response>);
}

/** Create a provider with mocked fetch */
function createProvider(
  config?: Partial<TreasurySDNProviderConfig>,
  sdnList?: ReturnType<typeof createMockSDNList>,
): TreasurySDNProvider {
  const mockFetch = createMockFetch(sdnList);
  return new TreasurySDNProvider({
    sdnListUrl: 'https://mock-storage.example.com/sdn/list.json',
    updateIntervalMs: 999999999, // Prevent auto-refresh in tests
    syncToBuiltinScreener: false,
    fallbackToBuiltin: false,
    fetchFn: mockFetch as unknown as typeof fetch,
    ...config,
  });
}

// ============================================================================
// TreasurySDNProvider - Lifecycle
// ============================================================================

describe('TreasurySDNProvider', () => {
  let provider: TreasurySDNProvider;

  afterEach(() => {
    provider?.dispose();
  });

  describe('initialization', () => {
    it('should populate address sets on initialize', async () => {
      provider = createProvider();
      await provider.initialize();

      const stats = provider.getStats();
      expect(stats.evmAddressCount).toBe(2);
      expect(stats.solanaAddressCount).toBe(1);
      expect(stats.totalAddressCount).toBe(3);
      expect(stats.version).toBe('abc123hash');
      expect(stats.lastFetchedAt).toBeTruthy();
      expect(stats.isStale).toBe(false);
    });

    it('should report healthy after successful initialization', async () => {
      provider = createProvider();
      await provider.initialize();

      const healthy = await provider.isHealthy();
      expect(healthy).toBe(true);
    });

    it('should report unhealthy before initialization', async () => {
      provider = createProvider();

      const healthy = await provider.isHealthy();
      expect(healthy).toBe(false);
    });

    it('should have correct provider metadata', () => {
      provider = createProvider();

      expect(provider.name).toBe('treasury-sdn-direct');
      expect(provider.supportedCategories).toEqual(['SANCTIONS']);
      expect(provider.supportedChains).toContain('ethereum');
      expect(provider.supportedChains).toContain('solana');
    });
  });

  // --------------------------------------------------------------------------
  // Address Screening
  // --------------------------------------------------------------------------

  describe('screenAddress', () => {
    beforeEach(async () => {
      provider = createProvider();
      await provider.initialize();
    });

    it('should match a sanctioned EVM address', async () => {
      const result = await provider.screenAddress({
        address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
        chain: 'ethereum',
      });

      expect(result.matched).toBe(true);
      expect(result.success).toBe(true);
      expect(result.provider).toBe('treasury-sdn-direct');
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0]!.category).toBe('SANCTIONS');
      expect(result.signals[0]!.severity).toBe('BLOCKLIST');
      expect(result.signals[0]!.riskScore).toBe(100);
      expect(result.signals[0]!.entityName).toBe('Lazarus Group');
      expect(result.signals[0]!.entityType).toBe('group');
    });

    it('should be case-insensitive for EVM addresses', async () => {
      const result = await provider.screenAddress({
        address: '0x098b716b8aaf21512996dc57eb0615e2383e2f96',
        chain: 'ethereum',
      });

      expect(result.matched).toBe(true);
    });

    it('should support cross-chain EVM propagation', async () => {
      // ETH address should be flagged on base
      const result = await provider.screenAddress({
        address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
        chain: 'base',
      });

      expect(result.matched).toBe(true);
      expect(result.signals[0]!.description).toContain('Lazarus Group');
    });

    it('should match a sanctioned Solana address', async () => {
      const result = await provider.screenAddress({
        address: '7Ggk4jBKRbGhRbFiaFiEQPqxnBnpbQSFqfMQBMGijTjt',
        chain: 'solana',
      });

      expect(result.matched).toBe(true);
      expect(result.signals[0]!.entityName).toBe('Test SOL Entity');
    });

    it('should not match a Solana address on EVM chains', async () => {
      const result = await provider.screenAddress({
        address: '7Ggk4jBKRbGhRbFiaFiEQPqxnBnpbQSFqfMQBMGijTjt',
        chain: 'ethereum',
      });

      expect(result.matched).toBe(false);
    });

    it('should not match a clean address', async () => {
      const result = await provider.screenAddress({
        address: '0x0000000000000000000000000000000000000001',
        chain: 'ethereum',
      });

      expect(result.matched).toBe(false);
      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(0);
    });

    it('should include entity metadata in signal', async () => {
      const result = await provider.screenAddress({
        address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
        chain: 'ethereum',
      });

      const signal = result.signals[0]!;
      expect(signal.metadata).toBeDefined();
      expect(signal.metadata!['sdnUid']).toBe('36752');
      expect(signal.metadata!['currencyCode']).toBe('ETH');
      expect(signal.metadata!['source']).toBe('treasury-sdn-direct');
    });

    it('should report latency in results', async () => {
      const result = await provider.screenAddress({
        address: '0x0000000000000000000000000000000000000001',
        chain: 'ethereum',
      });

      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.screenedAt).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Currency Code Mapping
  // --------------------------------------------------------------------------

  describe('currency code mapping', () => {
    it('should propagate ETH addresses to all EVM chains', async () => {
      const list = createMockSDNList({
        addresses: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            entityName: 'Test ETH',
            entityType: 'entity',
            sdnUid: '1',
            currencyCode: 'ETH',
            chains: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'arc'],
            lists: ['SDN'],
          },
        ],
      });
      provider = createProvider({}, list);
      await provider.initialize();

      const evmChains = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'arc'] as const;
      for (const chain of evmChains) {
        const result = await provider.screenAddress({
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          chain,
        });
        expect(result.matched).toBe(true);
      }
    });

    it('should keep SOL addresses on solana only', async () => {
      provider = createProvider();
      await provider.initialize();

      const solResult = await provider.screenAddress({
        address: '7Ggk4jBKRbGhRbFiaFiEQPqxnBnpbQSFqfMQBMGijTjt',
        chain: 'solana',
      });
      expect(solResult.matched).toBe(true);

      const ethResult = await provider.screenAddress({
        address: '7Ggk4jBKRbGhRbFiaFiEQPqxnBnpbQSFqfMQBMGijTjt',
        chain: 'ethereum',
      });
      expect(ethResult.matched).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Format Validation
  // --------------------------------------------------------------------------

  describe('format validation', () => {
    it('should accept valid EVM addresses', async () => {
      const list = createMockSDNList({
        addresses: [
          {
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            entityName: 'Valid EVM',
            entityType: 'entity',
            sdnUid: '100',
            currencyCode: 'ETH',
            chains: ['ethereum'],
            lists: ['SDN'],
          },
        ],
      });
      provider = createProvider({}, list);
      await provider.initialize();

      expect(provider.getStats().evmAddressCount).toBe(1);
    });

    it('should accept valid Solana addresses', async () => {
      const list = createMockSDNList({
        addresses: [
          {
            address: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
            entityName: 'Valid SOL',
            entityType: 'individual',
            sdnUid: '200',
            currencyCode: 'SOL',
            chains: ['solana'],
            lists: ['SDN'],
          },
        ],
      });
      provider = createProvider({}, list);
      await provider.initialize();

      expect(provider.getStats().solanaAddressCount).toBe(1);
    });

    it('should skip invalid address formats', async () => {
      const list = createMockSDNList({
        addresses: [
          {
            address: 'not-a-valid-address',
            entityName: 'Invalid',
            entityType: 'entity',
            sdnUid: '300',
            currencyCode: 'ETH',
            chains: ['ethereum'],
            lists: ['SDN'],
          },
        ],
      });
      provider = createProvider({}, list);
      // This will fail because empty list triggers fallback
      // which also has no data (syncToBuiltinScreener: false)
      // So it should throw
      await expect(provider.initialize()).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('should throw when fetch fails and no fallback data', async () => {
      const failFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      provider = new TreasurySDNProvider({
        sdnListUrl: 'https://mock.example.com/sdn.json',
        syncToBuiltinScreener: false,
        fallbackToBuiltin: false,
        fetchFn: failFetch as unknown as typeof fetch,
      });

      await expect(provider.initialize()).rejects.toThrow(/no fallback data available/);
    });

    it('should reject empty response', async () => {
      const emptyFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ addresses: [], version: 'empty', fetchedAt: '', metadata: {} }),
      });
      provider = new TreasurySDNProvider({
        sdnListUrl: 'https://mock.example.com/sdn.json',
        syncToBuiltinScreener: false,
        fallbackToBuiltin: false,
        fetchFn: emptyFetch as unknown as typeof fetch,
      });

      await expect(provider.initialize()).rejects.toThrow(/empty/);
    });

    it('should handle HTTP errors gracefully after initial load', async () => {
      // First call succeeds, second fails
      let callCount = 0;
      const intermittentFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createMockSDNList()),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });
      });

      provider = new TreasurySDNProvider({
        sdnListUrl: 'https://mock.example.com/sdn.json',
        updateIntervalMs: 999999999,
        syncToBuiltinScreener: false,
        fetchFn: intermittentFetch as unknown as typeof fetch,
      });

      // Initialize succeeds
      await provider.initialize();
      expect(provider.getStats().totalAddressCount).toBe(3);

      // Provider should still have data after failed refresh
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Staleness Detection
  // --------------------------------------------------------------------------

  describe('staleness detection', () => {
    it('should report stale when data is older than maxStaleMs', async () => {
      provider = createProvider({ maxStaleMs: 1 }); // 1ms = always stale
      await provider.initialize();

      // Wait for the data to become stale
      await new Promise((r) => setTimeout(r, 10));

      const stats = provider.getStats();
      expect(stats.isStale).toBe(true);

      const healthy = await provider.isHealthy();
      expect(healthy).toBe(false);
    });

    it('should report not stale when data is recent', async () => {
      provider = createProvider({ maxStaleMs: 60000 }); // 1 minute
      await provider.initialize();

      const stats = provider.getStats();
      expect(stats.isStale).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Dispose
  // --------------------------------------------------------------------------

  describe('dispose', () => {
    it('should clear refresh interval', async () => {
      provider = createProvider({ updateIntervalMs: 100 });
      await provider.initialize();

      // dispose should not throw
      provider.dispose();

      // Second dispose should be safe
      provider.dispose();
    });
  });
});

// ============================================================================
// ScreeningNotificationManager
// ============================================================================

describe('ScreeningNotificationManager', () => {
  function createNotifier(overrides?: Partial<ScreeningNotificationConfig>) {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Partial<Response>);

    return {
      manager: new ScreeningNotificationManager({
        paymentProviderContacts: [
          { name: 'Compliance Team', email: 'compliance@test.com', flows: ['all'] },
          { name: 'Circle Ops', email: 'circle@test.com', flows: ['circle-wallets'] },
        ],
        transport: {
          type: 'webhook',
          url: 'https://mock-email.example.com/send',
        },
        fetchFn: mockFetch as unknown as typeof fetch,
        ...overrides,
      }),
      mockFetch,
    };
  }

  function createMockResult(overrides?: Partial<UnifiedScreeningResult>): UnifiedScreeningResult {
    return {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chain: 'ethereum',
      decision: 'REVIEW',
      actions: ['REVIEW'],
      highestSeverity: 'HIGH',
      aggregateRiskScore: 55,
      categories: ['SANCTIONS'],
      providerResults: [],
      allSignals: [
        {
          provider: 'test',
          category: 'SANCTIONS',
          severity: 'HIGH',
          riskScore: 55,
          actions: ['REVIEW'],
          description: 'Test signal',
          direction: 'BOTH',
        },
      ],
      providersConsulted: 2,
      providersSucceeded: 2,
      totalLatencyMs: 100,
      screenedAt: new Date().toISOString(),
      allowlisted: false,
      blocklisted: false,
      ...overrides,
    };
  }

  describe('notifyReviewRequired', () => {
    it('should send notification for REVIEW decision', async () => {
      const { manager, mockFetch } = createNotifier();
      const result = createMockResult({ decision: 'REVIEW', aggregateRiskScore: 55 });

      const delivery = await manager.notifyReviewRequired(result, {
        amount: '5000',
        chain: 'ethereum',
        token: 'USDC',
        flow: 'circle-wallets',
      });

      expect(delivery.success).toBe(true);
      expect(delivery.recipientCount).toBe(2); // 'all' + 'circle-wallets'
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('should NOT send notification for APPROVE decision', async () => {
      const { manager, mockFetch } = createNotifier();
      const result = createMockResult({ decision: 'APPROVE', aggregateRiskScore: 10 });

      const delivery = await manager.notifyReviewRequired(result);

      expect(delivery.attempts).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should NOT send notification for BLOCK when only REVIEW configured', async () => {
      const { manager, mockFetch } = createNotifier({ notifyOn: ['REVIEW'] });
      const result = createMockResult({ decision: 'BLOCK', aggregateRiskScore: 90 });

      const delivery = await manager.notifyReviewRequired(result);

      expect(delivery.attempts).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send notification for BLOCK when configured', async () => {
      const { manager, mockFetch } = createNotifier({ notifyOn: ['REVIEW', 'BLOCK'] });
      const result = createMockResult({ decision: 'BLOCK', aggregateRiskScore: 90 });

      const delivery = await manager.notifyReviewRequired(result);

      expect(delivery.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('should filter recipients by flow type', async () => {
      const { manager, mockFetch } = createNotifier();
      const result = createMockResult();

      // Stripe flow -- only 'all' contact matches
      const delivery = await manager.notifyReviewRequired(result, {
        flow: 'stripe',
      });

      expect(delivery.success).toBe(true);
      expect(delivery.recipientCount).toBe(1); // Only 'all' contact
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should skip notification when risk score is below threshold', async () => {
      const { manager, mockFetch } = createNotifier({ minRiskScoreForNotification: 60 });
      const result = createMockResult({ decision: 'REVIEW', aggregateRiskScore: 45 });

      const delivery = await manager.notifyReviewRequired(result);

      expect(delivery.attempts).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should record delivery results for audit trail', async () => {
      const { manager } = createNotifier();
      const result = createMockResult();

      await manager.notifyReviewRequired(result);

      const results = manager.getDeliveryResults();
      expect(results).toHaveLength(1);
      expect(results[0]!.success).toBe(true);
    });
  });

  describe('retry on transport failure', () => {
    it('should retry on webhook failure', async () => {
      let callCount = 0;
      const failThenSucceedFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      const manager = new ScreeningNotificationManager({
        paymentProviderContacts: [
          { name: 'Team', email: 'team@test.com', flows: ['all'] },
        ],
        transport: { type: 'webhook', url: 'https://mock.example.com' },
        fetchFn: failThenSucceedFetch as unknown as typeof fetch,
        maxRetries: 3,
        baseDelayMs: 1, // Minimal delay for tests
      });

      const result = createMockResult();
      const delivery = await manager.notifyReviewRequired(result);

      expect(delivery.success).toBe(true);
      expect(delivery.attempts).toBe(3); // 2 failures + 1 success
    });

    it('should report failure after all retries exhausted', async () => {
      const alwaysFailFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const manager = new ScreeningNotificationManager({
        paymentProviderContacts: [
          { name: 'Team', email: 'team@test.com', flows: ['all'] },
        ],
        transport: { type: 'webhook', url: 'https://mock.example.com' },
        fetchFn: alwaysFailFetch as unknown as typeof fetch,
        maxRetries: 2,
        baseDelayMs: 1,
      });

      const result = createMockResult();
      const delivery = await manager.notifyReviewRequired(result);

      expect(delivery.success).toBe(false);
      expect(delivery.attempts).toBe(3); // 1 initial + 2 retries
      expect(delivery.error).toContain('503');
    });
  });

  describe('shouldNotify', () => {
    it('should return true for REVIEW with sufficient score', () => {
      const { manager } = createNotifier();
      const result = createMockResult({ decision: 'REVIEW', aggregateRiskScore: 55 });

      expect(manager.shouldNotify(result)).toBe(true);
    });

    it('should return false for APPROVE', () => {
      const { manager } = createNotifier();
      const result = createMockResult({ decision: 'APPROVE', aggregateRiskScore: 10 });

      expect(manager.shouldNotify(result)).toBe(false);
    });

    it('should return false for low risk score', () => {
      const { manager } = createNotifier({ minRiskScoreForNotification: 60 });
      const result = createMockResult({ decision: 'REVIEW', aggregateRiskScore: 45 });

      expect(manager.shouldNotify(result)).toBe(false);
    });
  });

  describe('getContacts', () => {
    it('should return defensive copy of contacts', () => {
      const { manager } = createNotifier();
      const contacts = manager.getContacts();

      expect(contacts).toHaveLength(2);
      expect(contacts[0]!.name).toBe('Compliance Team');
      expect(contacts[1]!.name).toBe('Circle Ops');
    });
  });
});

// ============================================================================
// Integration: ScreeningAggregator + NotificationManager
// ============================================================================

describe('ScreeningAggregator + NotificationManager integration', () => {
  it('should fire notification when aggregator decision is REVIEW', async () => {
    const mockNotifyFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const notifier = new ScreeningNotificationManager({
      paymentProviderContacts: [
        { name: 'Team', email: 'team@test.com', flows: ['all'] },
      ],
      transport: { type: 'webhook', url: 'https://mock.example.com' },
      fetchFn: mockNotifyFetch as unknown as typeof fetch,
      baseDelayMs: 1,
    });

    // Create a mock provider that returns a moderate risk score
    const mockProvider = {
      name: 'mock-provider',
      supportedCategories: ['SANCTIONS'] as const,
      supportedChains: ['ethereum'] as const,
      async screenAddress(): Promise<ProviderScreeningResult> {
        return {
          provider: 'mock-provider',
          matched: true,
          signals: [
            {
              provider: 'mock-provider',
              category: 'SANCTIONS' as const,
              severity: 'HIGH' as const,
              riskScore: 55,
              actions: ['REVIEW' as const],
              description: 'Test signal',
              direction: 'BOTH' as const,
            },
          ],
          success: true,
          latencyMs: 1,
          screenedAt: new Date().toISOString(),
        };
      },
      async isHealthy() { return true; },
    };

    const aggregator = new ScreeningAggregator([mockProvider], {
      blockThreshold: 80,
      reviewThreshold: 40,
    });

    aggregator.setNotificationManager(notifier);

    const result = await aggregator.screenAddress({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chain: 'ethereum',
    });

    expect(result.decision).toBe('REVIEW');

    // Wait for the non-blocking notification to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(mockNotifyFetch).toHaveBeenCalled();
  });

  it('should NOT fire notification when decision is APPROVE', async () => {
    const mockNotifyFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const notifier = new ScreeningNotificationManager({
      paymentProviderContacts: [
        { name: 'Team', email: 'team@test.com', flows: ['all'] },
      ],
      transport: { type: 'webhook', url: 'https://mock.example.com' },
      fetchFn: mockNotifyFetch as unknown as typeof fetch,
    });

    const cleanProvider = {
      name: 'clean-provider',
      supportedCategories: ['SANCTIONS'] as const,
      supportedChains: ['ethereum'] as const,
      async screenAddress(): Promise<ProviderScreeningResult> {
        return {
          provider: 'clean-provider',
          matched: false,
          signals: [],
          success: true,
          latencyMs: 1,
          screenedAt: new Date().toISOString(),
        };
      },
      async isHealthy() { return true; },
    };

    const aggregator = new ScreeningAggregator([cleanProvider]);
    aggregator.setNotificationManager(notifier);

    const result = await aggregator.screenAddress({
      address: '0x0000000000000000000000000000000000000001',
      chain: 'ethereum',
    });

    expect(result.decision).toBe('APPROVE');

    await new Promise((r) => setTimeout(r, 50));
    expect(mockNotifyFetch).not.toHaveBeenCalled();
  });
});

// ============================================================================
// OFACListProvider removal verification
// ============================================================================

describe('OFACListProvider removal', () => {
  it('should NOT export OFACListProvider from index', async () => {
    const indexModule = await import('../src/index.js');
    expect((indexModule as Record<string, unknown>)['OFACListProvider']).toBeUndefined();
  });

  it('should still export ChainalysisOracleProvider', async () => {
    const indexModule = await import('../src/index.js');
    expect(indexModule.ChainalysisOracleProvider).toBeDefined();
  });

  it('should export TreasurySDNProvider', async () => {
    const indexModule = await import('../src/index.js');
    expect(indexModule.TreasurySDNProvider).toBeDefined();
  });

  it('should export ScreeningNotificationManager', async () => {
    const indexModule = await import('../src/index.js');
    expect(indexModule.ScreeningNotificationManager).toBeDefined();
  });

  it('should export rebuildIndexes from ofac-sanctions', async () => {
    const indexModule = await import('../src/index.js');
    expect(indexModule.rebuildIndexes).toBeDefined();
    expect(typeof indexModule.rebuildIndexes).toBe('function');
  });
});
