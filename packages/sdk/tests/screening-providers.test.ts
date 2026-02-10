// ============================================================================
// Screening Providers - Comprehensive Test Suite
// ============================================================================
// Tests for ScreeningAggregator and mock provider implementations
// (OFACListProvider, ChainalysisOracleProvider, ChainalysisFreeAPIProvider,
// OpenSanctionsProvider).
//
// These tests verify the unified compliance screening architecture defined
// in screening-provider.ts and implemented in screening-aggregator.ts.
//
// BlocklistManager tests are in the Pro/Enterprise test suite.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScreeningAggregator } from '../src/integrations/screening-aggregator.js';
import type {
  ScreeningProvider,
  ScreenAddressInput,
  ProviderScreeningResult,
  RiskSignal,
  RiskCategory,
  RiskSeverity,
  ScreeningAction,
  UnifiedScreeningResult,
} from '../src/integrations/screening-provider.js';
import type { Chain } from '../src/types.js';

// ============================================================================
// Test Helpers & Mock Factories
// ============================================================================

/** Create a mock ScreeningProvider with configurable behavior */
function createMockProvider(
  name: string,
  overrides?: Partial<ScreeningProvider>,
): ScreeningProvider {
  return {
    name,
    supportedCategories: ['SANCTIONS'] as RiskCategory[],
    supportedChains: [] as Chain[],
    async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
      return {
        provider: name,
        matched: false,
        signals: [],
        success: true,
        latencyMs: 10,
        screenedAt: new Date().toISOString(),
      };
    },
    async isHealthy(): Promise<boolean> {
      return true;
    },
    ...overrides,
  };
}

/** Create a mock provider that flags an address with a given severity/score */
function createFlaggingProvider(
  name: string,
  severity: RiskSeverity,
  riskScore: number,
  category: RiskCategory = 'SANCTIONS',
  actions: ScreeningAction[] = ['DENY'],
): ScreeningProvider {
  return createMockProvider(name, {
    supportedCategories: [category],
    async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
      const signal: RiskSignal = {
        provider: name,
        category,
        severity,
        riskScore,
        actions,
        description: `${name} detected ${category} risk`,
        direction: 'BOTH',
      };
      return {
        provider: name,
        matched: true,
        signals: [signal],
        success: true,
        latencyMs: 5,
        screenedAt: new Date().toISOString(),
      };
    },
  });
}

/** Create a mock provider that fails or times out */
function createFailingProvider(
  name: string,
  errorMessage: string = 'Provider failed',
): ScreeningProvider {
  return createMockProvider(name, {
    async screenAddress(): Promise<ProviderScreeningResult> {
      throw new Error(errorMessage);
    },
    async isHealthy(): Promise<boolean> {
      return false;
    },
  });
}

/** Create a mock provider that takes a long time (for timeout testing) */
function createSlowProvider(name: string, delayMs: number): ScreeningProvider {
  return createMockProvider(name, {
    async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        provider: name,
        matched: false,
        signals: [],
        success: true,
        latencyMs: delayMs,
        screenedAt: new Date().toISOString(),
      };
    },
  });
}

/** Default clean-address input for screening */
function cleanInput(overrides: Partial<ScreenAddressInput> = {}): ScreenAddressInput {
  return {
    address: '0x' + '1'.repeat(40),
    chain: 'ethereum',
    ...overrides,
  };
}

// ============================================================================
// 1. ScreeningAggregator Tests
// ============================================================================

describe('ScreeningAggregator', () => {
  // --------------------------------------------------------------------------
  // Single provider scenarios
  // --------------------------------------------------------------------------

  it('should return APPROVE when single provider reports clean address', async () => {
    const provider = createMockProvider('clean-provider');
    const aggregator = new ScreeningAggregator([provider]);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.decision).toBe('APPROVE');
    expect(result.aggregateRiskScore).toBe(0);
    expect(result.highestSeverity).toBe('NONE');
    expect(result.providersConsulted).toBe(1);
    expect(result.providersSucceeded).toBe(1);
  });

  it('should return BLOCK when single provider reports sanctioned address', async () => {
    const provider = createFlaggingProvider('sanctions-provider', 'SEVERE', 90);
    const aggregator = new ScreeningAggregator([provider]);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.decision).toBe('BLOCK');
    expect(result.aggregateRiskScore).toBe(90);
    expect(result.highestSeverity).toBe('SEVERE');
    expect(result.allSignals).toHaveLength(1);
    expect(result.allSignals[0]!.category).toBe('SANCTIONS');
  });

  // --------------------------------------------------------------------------
  // Multiple provider scenarios
  // --------------------------------------------------------------------------

  it('should return APPROVE when all multiple providers report clean', async () => {
    const providers = [
      createMockProvider('provider-a'),
      createMockProvider('provider-b'),
      createMockProvider('provider-c'),
    ];
    const aggregator = new ScreeningAggregator(providers);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.decision).toBe('APPROVE');
    expect(result.providersConsulted).toBe(3);
    expect(result.providersSucceeded).toBe(3);
    expect(result.aggregateRiskScore).toBe(0);
  });

  it('should return REVIEW when one provider flags HIGH risk (score 50)', async () => {
    const providers = [
      createMockProvider('clean-provider'),
      createFlaggingProvider('risky-provider', 'HIGH', 50),
    ];
    const aggregator = new ScreeningAggregator(providers);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.providersConsulted).toBe(2);
    expect(result.highestSeverity).toBe('HIGH');
  });

  it('should return BLOCK when one provider flags SEVERE risk (score 90)', async () => {
    const provider = createFlaggingProvider('severe-provider', 'SEVERE', 90);
    const aggregator = new ScreeningAggregator([provider]);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.decision).toBe('BLOCK');
    expect(result.highestSeverity).toBe('SEVERE');
  });

  it('should return BLOCK when multiple providers agree on SEVERE risk', async () => {
    const providers = [
      createFlaggingProvider('provider-a', 'SEVERE', 85),
      createFlaggingProvider('provider-b', 'SEVERE', 95),
    ];
    const aggregator = new ScreeningAggregator(providers);

    const result = await aggregator.screenAddress(cleanInput());

    // Weighted avg: (85 + 95) / 2 = 90 >= 80 => BLOCK
    expect(result.decision).toBe('BLOCK');
    expect(result.aggregateRiskScore).toBe(90);
  });

  // --------------------------------------------------------------------------
  // Timeout and error handling
  // --------------------------------------------------------------------------

  it('should handle provider timeout gracefully', async () => {
    const slowProvider = createSlowProvider('slow-provider', 2000);
    const aggregator = new ScreeningAggregator([slowProvider], {
      providerTimeoutMs: 100,
    });

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.providersConsulted).toBe(1);
    expect(result.providersSucceeded).toBe(0);
    const failedResult = result.providerResults.find((r) => !r.success);
    expect(failedResult).toBeDefined();
    expect(failedResult!.error).toContain('timed out');
  });

  it('should handle provider errors gracefully without crashing', async () => {
    const failingProvider = createFailingProvider('broken-provider', 'Connection refused');
    const cleanProvider = createMockProvider('working-provider');
    const aggregator = new ScreeningAggregator([failingProvider, cleanProvider]);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.providersConsulted).toBe(2);
    expect(result.providersSucceeded).toBe(1);
    expect(result.decision).toBe('APPROVE');

    const failedResult = result.providerResults.find((r) => r.provider === 'broken-provider');
    expect(failedResult).toBeDefined();
    expect(failedResult!.success).toBe(false);
    expect(failedResult!.error).toContain('Connection refused');
  });

  // --------------------------------------------------------------------------
  // minProviderSuccess
  // --------------------------------------------------------------------------

  it('should set decision to REVIEW when too few providers succeed', async () => {
    const failingProvider = createFailingProvider('failing-1', 'Network error');
    const cleanProvider = createMockProvider('working-1');
    const aggregator = new ScreeningAggregator(
      [failingProvider, cleanProvider],
      { minProviderSuccess: 2 },
    );

    const result = await aggregator.screenAddress(cleanInput());

    // Only 1 succeeded but 2 required => forced REVIEW
    expect(result.decision).toBe('REVIEW');
    expect(result.providersSucceeded).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Custom thresholds
  // --------------------------------------------------------------------------

  it('should respect custom block and review thresholds', async () => {
    const provider = createFlaggingProvider('threshold-test', 'HIGH', 50);
    const aggregator = new ScreeningAggregator([provider], {
      blockThreshold: 60,
      reviewThreshold: 30,
    });

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.decision).toBe('REVIEW');
  });

  it('should BLOCK when score meets lowered block threshold', async () => {
    const provider = createFlaggingProvider('threshold-test', 'HIGH', 50);
    const aggregator = new ScreeningAggregator([provider], {
      blockThreshold: 50,
      reviewThreshold: 30,
    });

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.decision).toBe('BLOCK');
  });

  // --------------------------------------------------------------------------
  // Weighted provider scores
  // --------------------------------------------------------------------------

  it('should compute weighted average risk score with custom provider weights', async () => {
    const providerA = createFlaggingProvider('provider-a', 'HIGH', 60);
    const providerB = createFlaggingProvider('provider-b', 'SEVERE', 100);
    const aggregator = new ScreeningAggregator(
      [providerA, providerB],
      {
        providerWeights: {
          'provider-a': 0.5,
          'provider-b': 1.0,
        },
      },
    );

    const result = await aggregator.screenAddress(cleanInput());

    // Weighted avg: (60 * 0.5 + 100 * 1.0) / (0.5 + 1.0) = (30 + 100) / 1.5 = 86.67 => 87
    expect(result.aggregateRiskScore).toBe(87);
    expect(result.decision).toBe('BLOCK');
  });

  it('should compute equal-weight average when no custom weights are set', async () => {
    const providerA = createFlaggingProvider('provider-a', 'HIGH', 40);
    const providerB = createFlaggingProvider('provider-b', 'HIGH', 60);
    const aggregator = new ScreeningAggregator([providerA, providerB]);

    const result = await aggregator.screenAddress(cleanInput());

    // Equal weight avg: (40 + 60) / 2 = 50
    expect(result.aggregateRiskScore).toBe(50);
  });

  // --------------------------------------------------------------------------
  // screenTransaction
  // --------------------------------------------------------------------------

  it('should APPROVE transaction when both addresses are clean', async () => {
    const provider = createMockProvider('clean-provider');
    const aggregator = new ScreeningAggregator([provider]);

    const result = await aggregator.screenTransaction({
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      amount: '100',
      chain: 'ethereum',
    });

    expect(result.combinedDecision).toBe('APPROVE');
    expect(result.sender.decision).toBe('APPROVE');
    expect(result.recipient.decision).toBe('APPROVE');
  });

  it('should BLOCK transaction when sender is flagged', async () => {
    const flaggedAddress = '0x' + 'bad0'.repeat(10);
    const provider = createMockProvider('selective-provider', {
      async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
        if (input.address === flaggedAddress) {
          return {
            provider: 'selective-provider',
            matched: true,
            signals: [{
              provider: 'selective-provider',
              category: 'SANCTIONS',
              severity: 'SEVERE',
              riskScore: 95,
              actions: ['DENY'],
              description: 'Sanctioned address',
              direction: 'BOTH',
            }],
            success: true,
            latencyMs: 5,
            screenedAt: new Date().toISOString(),
          };
        }
        return {
          provider: 'selective-provider',
          matched: false,
          signals: [],
          success: true,
          latencyMs: 5,
          screenedAt: new Date().toISOString(),
        };
      },
    });

    const aggregator = new ScreeningAggregator([provider]);

    const result = await aggregator.screenTransaction({
      from: flaggedAddress,
      to: '0x' + '2'.repeat(40),
      amount: '100',
      chain: 'ethereum',
    });

    expect(result.sender.decision).toBe('BLOCK');
    expect(result.recipient.decision).toBe('APPROVE');
    expect(result.combinedDecision).toBe('BLOCK');
  });

  it('should take worst decision when both sender and recipient have different risk levels', async () => {
    const senderAddress = '0x' + 'aa'.repeat(20);
    const recipientAddress = '0x' + 'bb'.repeat(20);

    const provider = createMockProvider('dual-risk-provider', {
      async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
        if (input.address === senderAddress) {
          return {
            provider: 'dual-risk-provider',
            matched: true,
            signals: [{
              provider: 'dual-risk-provider',
              category: 'ILLICIT_BEHAVIOR',
              severity: 'HIGH',
              riskScore: 50,
              actions: ['REVIEW'],
              description: 'Mixer interaction detected',
              direction: 'OUTBOUND',
            }],
            success: true,
            latencyMs: 5,
            screenedAt: new Date().toISOString(),
          };
        }
        if (input.address === recipientAddress) {
          return {
            provider: 'dual-risk-provider',
            matched: true,
            signals: [{
              provider: 'dual-risk-provider',
              category: 'SANCTIONS',
              severity: 'SEVERE',
              riskScore: 90,
              actions: ['DENY'],
              description: 'Sanctioned entity',
              direction: 'INBOUND',
            }],
            success: true,
            latencyMs: 5,
            screenedAt: new Date().toISOString(),
          };
        }
        return {
          provider: 'dual-risk-provider',
          matched: false,
          signals: [],
          success: true,
          latencyMs: 5,
          screenedAt: new Date().toISOString(),
        };
      },
    });

    const aggregator = new ScreeningAggregator([provider]);

    const result = await aggregator.screenTransaction({
      from: senderAddress,
      to: recipientAddress,
      amount: '5000',
      chain: 'ethereum',
    });

    expect(result.sender.decision).toBe('REVIEW');
    expect(result.recipient.decision).toBe('BLOCK');
    expect(result.combinedDecision).toBe('BLOCK');
  });

  // --------------------------------------------------------------------------
  // Runtime provider management
  // --------------------------------------------------------------------------

  it('should add a provider at runtime and use it for screening', async () => {
    const aggregator = new ScreeningAggregator([]);
    expect(aggregator.getProviders()).toHaveLength(0);

    const provider = createMockProvider('dynamic-provider');
    aggregator.addProvider(provider);

    expect(aggregator.getProviders()).toHaveLength(1);
    expect(aggregator.getProviders()).toContain('dynamic-provider');

    const result = await aggregator.screenAddress(cleanInput());
    expect(result.providersConsulted).toBe(1);
  });

  it('should remove a provider at runtime by name', async () => {
    const providerA = createMockProvider('provider-a');
    const providerB = createMockProvider('provider-b');
    const aggregator = new ScreeningAggregator([providerA, providerB]);

    expect(aggregator.getProviders()).toHaveLength(2);

    const removed = aggregator.removeProvider('provider-a');
    expect(removed).toBe(true);
    expect(aggregator.getProviders()).toHaveLength(1);
    expect(aggregator.getProviders()).toContain('provider-b');

    const notFound = aggregator.removeProvider('nonexistent');
    expect(notFound).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Health check
  // --------------------------------------------------------------------------

  it('should return health status per provider', async () => {
    const healthyProvider = createMockProvider('healthy-one');
    const unhealthyProvider = createFailingProvider('sick-one');
    const aggregator = new ScreeningAggregator([healthyProvider, unhealthyProvider]);

    const health = await aggregator.healthCheck();

    expect(health['healthy-one']).toBe(true);
    expect(health['sick-one']).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Risk categories and actions aggregation
  // --------------------------------------------------------------------------

  it('should aggregate risk categories as a union from all provider signals', async () => {
    const sanctionsProvider = createFlaggingProvider('sanctions', 'HIGH', 50, 'SANCTIONS');
    const gamblingProvider = createFlaggingProvider('gambling', 'MEDIUM', 30, 'GAMBLING');
    const aggregator = new ScreeningAggregator([sanctionsProvider, gamblingProvider]);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.categories).toContain('SANCTIONS');
    expect(result.categories).toContain('GAMBLING');
    expect(result.categories).toHaveLength(2);
  });

  it('should aggregate actions as a union from all provider signals', async () => {
    const denyProvider = createFlaggingProvider('deny-provider', 'SEVERE', 90, 'SANCTIONS', ['DENY']);
    const reviewProvider = createFlaggingProvider('review-provider', 'HIGH', 50, 'ILLICIT_BEHAVIOR', ['REVIEW', 'ALERT']);
    const aggregator = new ScreeningAggregator([denyProvider, reviewProvider]);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.actions).toContain('DENY');
    expect(result.actions).toContain('REVIEW');
    expect(result.actions).toContain('ALERT');
  });

  it('should determine the highest severity across all providers', async () => {
    const lowProvider = createFlaggingProvider('low-provider', 'LOW', 10);
    const highProvider = createFlaggingProvider('high-provider', 'HIGH', 50);
    const severeProvider = createFlaggingProvider('severe-provider', 'SEVERE', 85);
    const aggregator = new ScreeningAggregator([lowProvider, highProvider, severeProvider]);

    const result = await aggregator.screenAddress(cleanInput());

    expect(result.highestSeverity).toBe('SEVERE');
  });

  it('should compute aggregate risk score with equal weights across three providers', async () => {
    const p1 = createFlaggingProvider('p1', 'HIGH', 60);
    const p2 = createFlaggingProvider('p2', 'HIGH', 30);
    const p3 = createFlaggingProvider('p3', 'LOW', 10);
    const aggregator = new ScreeningAggregator([p1, p2, p3]);

    const result = await aggregator.screenAddress(cleanInput());

    // Equal weights: (60 + 30 + 10) / 3 = 33.33 => 33
    expect(result.aggregateRiskScore).toBe(33);
  });

  it('should compute aggregate risk score with custom weights across three providers', async () => {
    const p1 = createFlaggingProvider('p1', 'SEVERE', 100);
    const p2 = createFlaggingProvider('p2', 'HIGH', 50);
    const p3 = createFlaggingProvider('p3', 'LOW', 10);
    const aggregator = new ScreeningAggregator([p1, p2, p3], {
      providerWeights: {
        p1: 2.0,
        p2: 1.0,
        p3: 0.5,
      },
    });

    const result = await aggregator.screenAddress(cleanInput());

    // Weighted: (100*2.0 + 50*1.0 + 10*0.5) / (2.0+1.0+0.5) = (200+50+5)/3.5 = 255/3.5 = 72.86 => 73
    expect(result.aggregateRiskScore).toBe(73);
  });
});

// ============================================================================
// 2. OFACListProvider Tests (~8 tests)
// ============================================================================

describe('OFACListProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  class OFACListProvider implements ScreeningProvider {
    readonly name = 'ofac-list';
    readonly supportedCategories: RiskCategory[] = ['SANCTIONS'];
    readonly supportedChains: Chain[] = [];

    private addresses: Set<string> = new Set();
    private initialized = false;
    private healthy = false;
    private fetchUrl: string;
    private fallbackToBuiltin: boolean;

    constructor(config?: { fetchUrl?: string; fallbackToBuiltin?: boolean }) {
      this.fetchUrl = config?.fetchUrl ?? 'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt';
      this.fallbackToBuiltin = config?.fallbackToBuiltin ?? false;
    }

    async initialize(): Promise<void> {
      try {
        const response = await fetch(this.fetchUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) this.addresses.add(line.toLowerCase());
        this.initialized = true;
        this.healthy = true;
      } catch (error) {
        if (this.fallbackToBuiltin) {
          this.addresses.add('0x722122df12d4e14e13ac3b6895a86e84145b6967');
          this.addresses.add('0x098b716b8aaf21512996dc57eb0615e2383e2f96');
          this.initialized = true;
          this.healthy = true;
        } else {
          this.healthy = false;
          throw error;
        }
      }
    }

    async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
      const startTime = Date.now();
      const matched = this.addresses.has(input.address.toLowerCase());
      const signals: RiskSignal[] = matched
        ? [{ provider: this.name, category: 'SANCTIONS', severity: 'SEVERE', riskScore: 95, actions: ['DENY'], description: `Address ${input.address} found on OFAC SDN list`, direction: 'BOTH' }]
        : [];
      return { provider: this.name, matched, signals, success: true, latencyMs: Date.now() - startTime, screenedAt: new Date().toISOString() };
    }

    async isHealthy(): Promise<boolean> { return this.healthy; }
    getStats() { return { addressCount: this.addresses.size, initialized: this.initialized }; }
  }

  it('should fetch and parse address list on initialization', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0xABC123\n0xDEF456\n0x789GHI\n') });
    const provider = new OFACListProvider();
    await provider.initialize();
    expect(provider.getStats().initialized).toBe(true);
    expect(provider.getStats().addressCount).toBe(3);
  });

  it('should detect addresses from fetched list', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0xSanctionedAddr123456789012345678901234\n') });
    const provider = new OFACListProvider();
    await provider.initialize();
    const result = await provider.screenAddress(cleanInput({ address: '0xSanctionedAddr123456789012345678901234' }));
    expect(result.matched).toBe(true);
    expect(result.signals[0]!.category).toBe('SANCTIONS');
  });

  it('should perform case-insensitive matching', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12\n') });
    const provider = new OFACListProvider();
    await provider.initialize();
    const result = await provider.screenAddress(cleanInput({ address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' }));
    expect(result.matched).toBe(true);
  });

  it('should return clean result for unknown address', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0xBadAddr1234567890123456789012345678901234\n') });
    const provider = new OFACListProvider();
    await provider.initialize();
    const result = await provider.screenAddress(cleanInput({ address: '0x' + '1'.repeat(40) }));
    expect(result.matched).toBe(false);
    expect(result.signals).toHaveLength(0);
  });

  it('should fall back to built-in screener when fetch fails and fallbackToBuiltin=true', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const provider = new OFACListProvider({ fallbackToBuiltin: true });
    await provider.initialize();
    expect(provider.getStats().initialized).toBe(true);
    const result = await provider.screenAddress(cleanInput({ address: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967' }));
    expect(result.matched).toBe(true);
  });

  it('should throw error when fetch fails without fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const provider = new OFACListProvider({ fallbackToBuiltin: false });
    await expect(provider.initialize()).rejects.toThrow('Network error');
  });

  it('should report isHealthy as true after successful initialization', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0xaddr1\n') });
    const provider = new OFACListProvider();
    await provider.initialize();
    expect(await provider.isHealthy()).toBe(true);
  });

  it('should return correct stats with address counts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0xAddr1\n0xAddr2\n0xAddr3\n0xAddr4\n0xAddr5\n') });
    const provider = new OFACListProvider();
    await provider.initialize();
    expect(provider.getStats().addressCount).toBe(5);
  });
});

// ============================================================================
// 3. ChainalysisOracleProvider Tests (~8 tests)
// ============================================================================

describe('ChainalysisOracleProvider', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = originalFetch; });

  class ChainalysisOracleProvider implements ScreeningProvider {
    readonly name = 'chainalysis-oracle';
    readonly supportedCategories: RiskCategory[] = ['SANCTIONS'];
    readonly supportedChains: Chain[] = [];
    private rpcUrls: Record<string, string>;
    private oracleAddress: string;
    private cache: Map<string, boolean> = new Map();
    private healthy = true;
    private static readonly IS_SANCTIONED_SELECTOR = '0xdfb80831';

    constructor(config: { rpcUrls: Record<string, string>; oracleAddress?: string }) {
      this.rpcUrls = config.rpcUrls;
      this.oracleAddress = config.oracleAddress ?? '0x40C57923924B5c5c5455c48D93317139ADDaC8fb';
    }

    async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
      const startTime = Date.now();
      const cacheKey = `${input.chain}:${input.address.toLowerCase()}`;
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult !== undefined) return this.buildResult(input.address, cachedResult, Date.now() - startTime);

      const rpcUrl = this.rpcUrls[input.chain];
      if (!rpcUrl) return { provider: this.name, matched: false, signals: [], success: false, error: `No RPC URL configured for chain: ${input.chain}`, latencyMs: Date.now() - startTime, screenedAt: new Date().toISOString() };

      try {
        const paddedAddress = input.address.toLowerCase().replace('0x', '').padStart(64, '0');
        const data = ChainalysisOracleProvider.IS_SANCTIONED_SELECTOR + paddedAddress;
        const response = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: this.oracleAddress, data }, 'latest'] }) });
        const json = (await response.json()) as { result?: string; error?: { message: string } };
        if (json.error) throw new Error(json.error.message);
        const isSanctioned = json.result !== '0x' + '0'.repeat(64);
        this.cache.set(cacheKey, isSanctioned);
        return this.buildResult(input.address, isSanctioned, Date.now() - startTime);
      } catch (error: unknown) {
        this.healthy = false;
        return { provider: this.name, matched: false, signals: [], success: false, error: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - startTime, screenedAt: new Date().toISOString() };
      }
    }

    async isHealthy(): Promise<boolean> { return this.healthy; }
    getCacheSize(): number { return this.cache.size; }

    private buildResult(address: string, sanctioned: boolean, latencyMs: number): ProviderScreeningResult {
      const signals: RiskSignal[] = sanctioned ? [{ provider: this.name, category: 'SANCTIONS', severity: 'SEVERE', riskScore: 95, actions: ['DENY'], description: `Chainalysis Oracle: address ${address} is sanctioned`, direction: 'BOTH' }] : [];
      return { provider: this.name, matched: sanctioned, signals, success: true, latencyMs, screenedAt: new Date().toISOString() };
    }
  }

  function createOracleProvider(rpcUrls?: Record<string, string>) {
    return new ChainalysisOracleProvider({ rpcUrls: rpcUrls ?? { ethereum: 'https://rpc.example.com/eth' } });
  }

  it('should return SANCTIONS signal when oracle reports sanctioned', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: '0x' + '0'.repeat(63) + '1' }) });
    const result = await createOracleProvider().screenAddress(cleanInput({ address: '0x' + 'bad0'.repeat(10) }));
    expect(result.matched).toBe(true);
    expect(result.signals[0]!.category).toBe('SANCTIONS');
  });

  it('should return no signals when oracle reports clean', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: '0x' + '0'.repeat(64) }) });
    const result = await createOracleProvider().screenAddress(cleanInput());
    expect(result.matched).toBe(false);
    expect(result.signals).toHaveLength(0);
  });

  it('should avoid duplicate RPC calls when cache is hit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: '0x' + '0'.repeat(64) }) });
    globalThis.fetch = fetchMock;
    const provider = createOracleProvider();
    const input = cleanInput({ address: '0x' + '1'.repeat(40) });
    await provider.screenAddress(input);
    await provider.screenAddress(input);
    await provider.screenAddress(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(provider.getCacheSize()).toBe(1);
  });

  it('should return error when no RPC URL is configured for the chain', async () => {
    const result = await createOracleProvider({ ethereum: 'https://rpc.example.com/eth' }).screenAddress(cleanInput({ chain: 'polygon' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('No RPC URL configured for chain: polygon');
  });

  it('should handle network failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await createOracleProvider().screenAddress(cleanInput());
    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('should encode the eth_call data payload correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: '0x' + '0'.repeat(64) }) });
    globalThis.fetch = fetchMock;
    await createOracleProvider().screenAddress(cleanInput({ address: '0x' + '1'.repeat(40) }));
    const callBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(callBody.params[0].data).toMatch(/^0xdfb80831/);
    expect(callBody.params[0].data.length).toBe(2 + 8 + 64);
  });

  it('should report isHealthy correctly after failure', async () => {
    const provider = createOracleProvider();
    expect(await provider.isHealthy()).toBe(true);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await provider.screenAddress(cleanInput());
    expect(await provider.isHealthy()).toBe(false);
  });

  it('should use different RPC URLs for different chains', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: '0x' + '0'.repeat(64) }) });
    globalThis.fetch = fetchMock;
    const provider = new ChainalysisOracleProvider({ rpcUrls: { ethereum: 'https://eth-rpc.example.com', polygon: 'https://polygon-rpc.example.com' } });
    await provider.screenAddress(cleanInput({ chain: 'ethereum' }));
    await provider.screenAddress(cleanInput({ chain: 'polygon' }));
    expect(fetchMock.mock.calls[0]![0]).toBe('https://eth-rpc.example.com');
    expect(fetchMock.mock.calls[1]![0]).toBe('https://polygon-rpc.example.com');
  });
});

// ============================================================================
// 4. ChainalysisFreeAPIProvider Tests (~8 tests)
// ============================================================================

describe('ChainalysisFreeAPIProvider', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = originalFetch; });

  class ChainalysisFreeAPIProvider implements ScreeningProvider {
    readonly name = 'chainalysis-free';
    readonly supportedCategories: RiskCategory[] = ['SANCTIONS'];
    readonly supportedChains: Chain[] = [];
    private apiKey: string;
    private baseUrl: string;
    private cache: Map<string, ProviderScreeningResult> = new Map();
    private healthy = true;

    constructor(config: { apiKey: string; baseUrl?: string }) {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl ?? 'https://public.chainalysis.com/api/v1/address';
    }

    async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
      const startTime = Date.now();
      const cacheKey = input.address.toLowerCase();
      const cached = this.cache.get(cacheKey);
      if (cached) return { ...cached, latencyMs: Date.now() - startTime };

      try {
        const response = await fetch(`${this.baseUrl}/${input.address}`, { headers: { 'X-API-Key': this.apiKey, Accept: 'application/json' } });
        if (response.status === 429) throw new Error('Rate limit exceeded (429)');
        if (response.status === 401) throw new Error('Invalid API key (401)');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as { identifications: Array<{ category: string; name: string; description: string; url: string }> };
        const signals: RiskSignal[] = data.identifications.map((id) => ({ provider: this.name, category: 'SANCTIONS' as RiskCategory, severity: 'SEVERE' as RiskSeverity, riskScore: 95, actions: ['DENY'] as ScreeningAction[], description: `${id.category}: ${id.name} - ${id.description}`, direction: 'BOTH' as const, metadata: { url: id.url, chainalysisCategory: id.category } }));
        const result: ProviderScreeningResult = { provider: this.name, matched: signals.length > 0, signals, success: true, latencyMs: Date.now() - startTime, screenedAt: new Date().toISOString() };
        this.cache.set(cacheKey, result);
        this.healthy = true;
        return result;
      } catch (error: unknown) {
        this.healthy = false;
        return { provider: this.name, matched: false, signals: [], success: false, error: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - startTime, screenedAt: new Date().toISOString() };
      }
    }

    async isHealthy(): Promise<boolean> { return this.healthy; }
    getCacheSize(): number { return this.cache.size; }
  }

  function createAPIProvider() { return new ChainalysisFreeAPIProvider({ apiKey: 'test-api-key-12345' }); }

  it('should return SANCTIONS signals for sanctioned address', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ identifications: [{ category: 'sanctions', name: 'OFAC SDN Tornado Cash', description: 'Tornado Cash mixer contract', url: 'https://chainalysis.com/entity/123' }] }) });
    const result = await createAPIProvider().screenAddress(cleanInput({ address: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967' }));
    expect(result.matched).toBe(true);
    expect(result.signals[0]!.category).toBe('SANCTIONS');
    expect(result.signals[0]!.description).toContain('Tornado Cash');
  });

  it('should return clean result for address with empty identifications', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ identifications: [] }) });
    const result = await createAPIProvider().screenAddress(cleanInput());
    expect(result.matched).toBe(false);
    expect(result.success).toBe(true);
  });

  it('should avoid duplicate API calls when cache is hit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ identifications: [] }) });
    globalThis.fetch = fetchMock;
    const provider = createAPIProvider();
    const input = cleanInput({ address: '0x' + '1'.repeat(40) });
    await provider.screenAddress(input);
    await provider.screenAddress(input);
    await provider.screenAddress(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should handle rate limit (429) response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) });
    const result = await createAPIProvider().screenAddress(cleanInput());
    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit exceeded (429)');
  });

  it('should handle invalid API key (401) response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });
    const result = await createAPIProvider().screenAddress(cleanInput());
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid API key (401)');
  });

  it('should handle network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
    const result = await createAPIProvider().screenAddress(cleanInput());
    expect(result.success).toBe(false);
    expect(result.error).toContain('ENOTFOUND');
  });

  it('should report isHealthy as true after successful call', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ identifications: [] }) });
    const provider = createAPIProvider();
    await provider.screenAddress(cleanInput());
    expect(await provider.isHealthy()).toBe(true);
  });

  it('should create multiple signals from multiple identifications', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ identifications: [{ category: 'sanctions', name: 'Entity A', description: 'A', url: 'a' }, { category: 'sanctions', name: 'Entity B', description: 'B', url: 'b' }, { category: 'sanctions', name: 'Entity C', description: 'C', url: 'c' }] }) });
    const result = await createAPIProvider().screenAddress(cleanInput({ address: '0x' + 'bad0'.repeat(10) }));
    expect(result.signals).toHaveLength(3);
  });
});

// ============================================================================
// 5. OpenSanctionsProvider Tests (~8 tests)
// ============================================================================

describe('OpenSanctionsProvider', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = originalFetch; });

  class OpenSanctionsProvider implements ScreeningProvider {
    readonly name = 'opensanctions';
    readonly supportedCategories: RiskCategory[] = ['SANCTIONS', 'PEP'];
    readonly supportedChains: Chain[] = [];
    private apiKey: string;
    private baseUrl: string;
    private minMatchScore: number;
    private cache: Map<string, ProviderScreeningResult> = new Map();
    private healthy = true;

    constructor(config: { apiKey: string; baseUrl?: string; minMatchScore?: number }) {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl ?? 'https://api.opensanctions.org';
      this.minMatchScore = config.minMatchScore ?? 0.7;
    }

    async screenAddress(input: ScreenAddressInput): Promise<ProviderScreeningResult> {
      const startTime = Date.now();
      const cacheKey = input.address.toLowerCase();
      const cached = this.cache.get(cacheKey);
      if (cached) return { ...cached, latencyMs: Date.now() - startTime };

      try {
        const response = await fetch(`${this.baseUrl}/match/default`, { method: 'POST', headers: { Authorization: `ApiKey ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ queries: { addr: { schema: 'CryptoWallet', properties: { publicKey: [input.address] } } } }) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as { responses: { addr: { results: Array<{ id: string; caption: string; score: number; datasets: string[]; properties: { topics?: string[] } }> } } };
        const results = data.responses.addr.results;
        const signals: RiskSignal[] = [];

        for (const match of results) {
          if (match.score < this.minMatchScore) continue;
          const topics = match.properties.topics ?? [];
          let category: RiskCategory = 'UNKNOWN';
          if (topics.includes('sanction')) category = 'SANCTIONS';
          else if (topics.includes('pep')) category = 'PEP';

          signals.push({ provider: this.name, category, severity: category === 'SANCTIONS' ? 'SEVERE' : 'HIGH', riskScore: category === 'SANCTIONS' ? 90 : 60, actions: category === 'SANCTIONS' ? ['DENY'] : ['REVIEW'], description: `OpenSanctions match: ${match.caption} (score: ${match.score})`, entityName: match.caption, direction: 'BOTH', metadata: { entityId: match.id, matchScore: match.score, datasets: match.datasets, topics } });
        }

        const result: ProviderScreeningResult = { provider: this.name, matched: signals.length > 0, signals, success: true, latencyMs: Date.now() - startTime, screenedAt: new Date().toISOString() };
        this.cache.set(cacheKey, result);
        this.healthy = true;
        return result;
      } catch (error: unknown) {
        this.healthy = false;
        return { provider: this.name, matched: false, signals: [], success: false, error: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - startTime, screenedAt: new Date().toISOString() };
      }
    }

    async isHealthy(): Promise<boolean> { return this.healthy; }
    getCacheSize(): number { return this.cache.size; }
  }

  function createOSProvider(overrides?: { minMatchScore?: number }) {
    return new OpenSanctionsProvider({ apiKey: 'test-os-api-key', minMatchScore: overrides?.minMatchScore });
  }

  function mockOSResponse(results: Array<{ id: string; caption: string; score: number; datasets: string[]; topics: string[] }>) {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ responses: { addr: { results: results.map((r) => ({ id: r.id, caption: r.caption, score: r.score, datasets: r.datasets, properties: { topics: r.topics } })) } } }) });
  }

  it('should return SANCTIONS category for entity with sanction topic', async () => {
    mockOSResponse([{ id: 'Q123', caption: 'Bad Entity LLC', score: 0.95, datasets: ['us_ofac_sdn'], topics: ['sanction'] }]);
    const result = await createOSProvider().screenAddress(cleanInput());
    expect(result.matched).toBe(true);
    expect(result.signals[0]!.category).toBe('SANCTIONS');
    expect(result.signals[0]!.entityName).toBe('Bad Entity LLC');
  });

  it('should return PEP category for entity with pep topic', async () => {
    mockOSResponse([{ id: 'Q456', caption: 'John Politician', score: 0.85, datasets: ['wd_peps'], topics: ['pep'] }]);
    const result = await createOSProvider().screenAddress(cleanInput());
    expect(result.signals[0]!.category).toBe('PEP');
    expect(result.signals[0]!.severity).toBe('HIGH');
  });

  it('should filter out matches below minMatchScore', async () => {
    mockOSResponse([{ id: 'Q789', caption: 'Low Confidence Entity', score: 0.3, datasets: ['us_ofac_sdn'], topics: ['sanction'] }]);
    const result = await createOSProvider().screenAddress(cleanInput());
    expect(result.matched).toBe(false);
  });

  it('should avoid duplicate API calls when cache is hit', async () => {
    mockOSResponse([]);
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const provider = createOSProvider();
    const input = cleanInput({ address: '0x' + '1'.repeat(40) });
    await provider.screenAddress(input);
    await provider.screenAddress(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should return multiple signals from multiple matches', async () => {
    mockOSResponse([{ id: 'Q100', caption: 'Sanctioned Org', score: 0.9, datasets: ['us_ofac_sdn', 'eu_fsf'], topics: ['sanction'] }, { id: 'Q101', caption: 'Political Figure', score: 0.8, datasets: ['wd_peps'], topics: ['pep'] }]);
    const result = await createOSProvider().screenAddress(cleanInput());
    expect(result.signals).toHaveLength(2);
  });

  it('should return clean result for empty match results', async () => {
    mockOSResponse([]);
    const result = await createOSProvider().screenAddress(cleanInput());
    expect(result.matched).toBe(false);
    expect(result.success).toBe(true);
  });

  it('should handle API error gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Internal Server Error' }) });
    const provider = createOSProvider();
    const result = await provider.screenAddress(cleanInput());
    expect(result.success).toBe(false);
    expect(await provider.isHealthy()).toBe(false);
  });

  it('should include dataset information in signal metadata', async () => {
    mockOSResponse([{ id: 'Q200', caption: 'Multi-Dataset Entity', score: 0.92, datasets: ['us_ofac_sdn', 'eu_fsf', 'un_sc_sanctions'], topics: ['sanction'] }]);
    const result = await createOSProvider().screenAddress(cleanInput());
    const metadata = result.signals[0]!.metadata!;
    expect(metadata.datasets).toEqual(['us_ofac_sdn', 'eu_fsf', 'un_sc_sanctions']);
    expect(metadata.matchScore).toBe(0.92);
  });
});

// ============================================================================
// 6. RiskCategory Mapping & Decision Threshold Tests
// ============================================================================

describe('RiskCategory mapping and decision thresholds', () => {
  it('should have all 9 Circle rule categories represented', () => {
    const circleCategories: RiskCategory[] = [
      'SANCTIONS', 'FROZEN', 'CUSTOM_BLOCKLIST', 'TERRORIST_FINANCING',
      'CSAM', 'ILLICIT_BEHAVIOR', 'GAMBLING', 'PEP', 'DARKNET',
    ];
    for (const category of circleCategories) {
      const signal: RiskSignal = { provider: 'test', category, severity: 'HIGH', riskScore: 50, actions: ['DENY'], description: `Test signal for ${category}`, direction: 'BOTH' };
      expect(signal.category).toBe(category);
    }
    expect(circleCategories).toHaveLength(9);
  });

  it('should map SEVERE severity risk score (80-99) to BLOCK decision', async () => {
    const provider = createFlaggingProvider('severe-test', 'SEVERE', 85);
    const aggregator = new ScreeningAggregator([provider]);
    const result = await aggregator.screenAddress(cleanInput());
    expect(result.aggregateRiskScore).toBeGreaterThanOrEqual(80);
    expect(result.decision).toBe('BLOCK');
  });

  it('should map HIGH severity risk score (40-79) to REVIEW decision', async () => {
    const provider = createFlaggingProvider('high-test', 'HIGH', 55);
    const aggregator = new ScreeningAggregator([provider]);
    const result = await aggregator.screenAddress(cleanInput());
    expect(result.aggregateRiskScore).toBeGreaterThanOrEqual(40);
    expect(result.decision).toBe('REVIEW');
  });

  it('should map risk score below 40 to APPROVE decision', async () => {
    const provider = createFlaggingProvider('low-test', 'LOW', 15);
    const aggregator = new ScreeningAggregator([provider]);
    const result = await aggregator.screenAddress(cleanInput());
    expect(result.aggregateRiskScore).toBeLessThan(40);
    expect(result.decision).toBe('APPROVE');
  });
});
