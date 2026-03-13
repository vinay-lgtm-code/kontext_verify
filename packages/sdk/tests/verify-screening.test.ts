import { describe, it, expect, afterEach, vi } from 'vitest';
import { Kontext } from '../src/index.js';
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
}): ScreeningProvider {
  const {
    id = 'mock',
    queryTypes = ['both'],
    lists = ['OFAC_SDN'],
    hit = false,
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
    isAvailable: () => true,
  };
}

function createClient(options: {
  providers?: ScreeningProvider[];
  consensus?: 'ANY_MATCH' | 'ALL_MATCH' | 'MAJORITY';
  policy?: {
    thresholds?: { edd?: number; reporting?: number; largeTransaction?: number };
  };
}) {
  return Kontext.init({
    projectId: 'test-verify-screening',
    environment: 'development',
    screening: {
      providers: options.providers ?? [mockProvider({})],
      consensus: options.consensus,
    },
    policy: options.policy,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
let kontext: Kontext;
afterEach(async () => {
  if (kontext) await kontext.destroy();
});

describe('verify() with ScreeningAggregator', () => {
  it('should use aggregator for crypto address screening', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'ofac', queryTypes: ['address'], hit: false })],
    });

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    expect(result.compliant).toBe(true);
    expect(result.checks.some((c) => c.name === 'sanctions_sender')).toBe(true);
    expect(result.checks.some((c) => c.name === 'sanctions_recipient')).toBe(true);
  });

  it('should flag non-compliant when screening hits on sender', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'ofac', queryTypes: ['both'], hit: true })],
    });

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    expect(result.compliant).toBe(false);
    expect(result.riskLevel).toBe('critical');
    expect(result.recommendations).toContain('Block transaction: sanctions match detected');
  });

  it('should use aggregator for fiat entity name screening', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'entity', queryTypes: ['entity_name'], hit: false })],
    });

    const result = await kontext.verify({
      amount: '500',
      currency: 'USD',
      from: 'Acme Corp',
      to: 'Global Payments',
      agentId: 'agent-1',
      paymentMethod: 'wire',
    });

    expect(result.compliant).toBe(true);
    expect(result.checks.some((c) => c.name === 'sanctions_sender')).toBe(true);
    expect(result.checks.some((c) => c.name === 'sanctions_recipient')).toBe(true);
  });

  it('should include EDD check for amounts at threshold', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'p', hit: false })],
    });

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    const eddCheck = result.checks.find((c) => c.name === 'enhanced_due_diligence');
    expect(eddCheck).toBeDefined();
    expect(eddCheck!.passed).toBe(false);
    expect(eddCheck!.severity).toBe('low');
    // EDD at low severity doesn't break compliance
    expect(result.compliant).toBe(true);
  });

  it('should include CTR check for amounts at reporting threshold', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'p', hit: false })],
    });

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '15000',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    const ctrCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(ctrCheck).toBeDefined();
    expect(ctrCheck!.passed).toBe(false);
    expect(result.recommendations).toContain('File Currency Transaction Report (CTR)');
  });

  it('should respect custom policy thresholds', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'p', hit: false })],
      policy: {
        thresholds: { edd: 1000, reporting: 5000, largeTransaction: 20000 },
      },
    });

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '1500',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    // With edd=1000, $1500 should trigger EDD
    const eddCheck = result.checks.find((c) => c.name === 'enhanced_due_diligence');
    expect(eddCheck).toBeDefined();
    // With reporting=5000, $1500 should NOT trigger CTR
    const ctrCheck = result.checks.find((c) => c.name === 'reporting_threshold');
    expect(ctrCheck).toBeUndefined();
  });

  it('should include large transaction check', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'p', hit: false })],
    });

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '75000',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    const largeCheck = result.checks.find((c) => c.name === 'large_transaction');
    expect(largeCheck).toBeDefined();
    expect(largeCheck!.severity).toBe('medium');
  });
});

describe('verify() without screening config', () => {
  it('should fall back to UsdcCompliance for crypto transactions', async () => {
    kontext = Kontext.init({
      projectId: 'test-no-screening',
      environment: 'development',
    });

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    // Standard USDC compliance checks should be present (check name: sanctions_sender)
    expect(result.checks.some((c) => c.name.includes('sanctions'))).toBe(true);
    expect(result.compliant).toBe(true);
  });

  it('should fall back to PaymentCompliance for fiat transactions', async () => {
    kontext = Kontext.init({
      projectId: 'test-no-screening-fiat',
      environment: 'development',
    });

    const result = await kontext.verify({
      amount: '500',
      currency: 'USD',
      from: 'Acme Corp',
      to: 'Global Payments',
      agentId: 'agent-1',
      paymentMethod: 'wire',
    });

    expect(result.compliant).toBe(true);
  });
});

describe('verify() screening event metering', () => {
  it('should count screening calls as events', async () => {
    kontext = createClient({
      providers: [mockProvider({ id: 'p', hit: false })],
    });

    const usage1 = kontext.getUsage();
    const initialEvents = usage1.eventCount;

    await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'agent-1',
    });

    const usage2 = kontext.getUsage();
    // verify() logs 1 transaction event + 2 screening events (from + to) = 3 events min
    expect(usage2.eventCount).toBeGreaterThan(initialEvents);
  });
});
