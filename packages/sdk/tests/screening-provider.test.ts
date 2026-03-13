import { describe, it, expect } from 'vitest';
import {
  isBlockchainAddress,
  providerSupportsQuery,
  getRequiredLists,
  TOKEN_REQUIRED_LISTS,
  CURRENCY_REQUIRED_LISTS,
} from '../src/integrations/screening-provider.js';
import type {
  ScreeningProvider,
  ScreeningResult,
  ScreeningContext,
} from '../src/integrations/screening-provider.js';

// ---------------------------------------------------------------------------
// Helper: minimal mock provider
// ---------------------------------------------------------------------------
function mockProvider(
  queryTypes: readonly ('address' | 'entity_name' | 'both')[],
): ScreeningProvider {
  return {
    id: 'mock',
    name: 'Mock Provider',
    lists: ['CUSTOM'],
    requiresApiKey: false,
    browserCompatible: true,
    queryTypes,
    async screen(): Promise<ScreeningResult> {
      return {
        providerId: 'mock',
        hit: false,
        matches: [],
        listsChecked: ['CUSTOM'],
        entriesSearched: 0,
        durationMs: 0,
      };
    },
    isAvailable: () => true,
  };
}

// ---------------------------------------------------------------------------
// isBlockchainAddress
// ---------------------------------------------------------------------------
describe('isBlockchainAddress()', () => {
  it('should detect valid Ethereum addresses', () => {
    expect(isBlockchainAddress('0x098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(true);
    expect(isBlockchainAddress('0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B')).toBe(true);
    expect(isBlockchainAddress('0x0000000000000000000000000000000000000000')).toBe(true);
  });

  it('should reject entity names', () => {
    expect(isBlockchainAddress('Lazarus Group')).toBe(false);
    expect(isBlockchainAddress('Acme Corporation')).toBe(false);
    expect(isBlockchainAddress('')).toBe(false);
  });

  it('should reject invalid addresses', () => {
    expect(isBlockchainAddress('0x123')).toBe(false);
    expect(isBlockchainAddress('098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(false);
    expect(isBlockchainAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false);
  });

  it('should reject Solana addresses (base58)', () => {
    expect(isBlockchainAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// providerSupportsQuery
// ---------------------------------------------------------------------------
describe('providerSupportsQuery()', () => {
  it('should match address provider with address query', () => {
    const p = mockProvider(['address']);
    expect(providerSupportsQuery(p, '0x098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(true);
  });

  it('should not match address provider with entity name query', () => {
    const p = mockProvider(['address']);
    expect(providerSupportsQuery(p, 'Lazarus Group')).toBe(false);
  });

  it('should match entity_name provider with entity name query', () => {
    const p = mockProvider(['entity_name']);
    expect(providerSupportsQuery(p, 'Lazarus Group')).toBe(true);
  });

  it('should not match entity_name provider with address query', () => {
    const p = mockProvider(['entity_name']);
    expect(providerSupportsQuery(p, '0x098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(false);
  });

  it('should match "both" provider with any query type', () => {
    const p = mockProvider(['both']);
    expect(providerSupportsQuery(p, '0x098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(true);
    expect(providerSupportsQuery(p, 'Lazarus Group')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRequiredLists
// ---------------------------------------------------------------------------
describe('getRequiredLists()', () => {
  it('should return OFAC_SDN for USDC token', () => {
    const lists = getRequiredLists({ token: 'USDC' });
    expect(lists).toContain('OFAC_SDN');
  });

  it('should return EU_CONSOLIDATED for EURC token', () => {
    const lists = getRequiredLists({ token: 'EURC' });
    expect(lists).toContain('EU_CONSOLIDATED');
  });

  it('should return OFAC_SDN for USD currency', () => {
    const lists = getRequiredLists({ currency: 'USD' });
    expect(lists).toContain('OFAC_SDN');
  });

  it('should return UK_OFSI for GBP currency', () => {
    const lists = getRequiredLists({ currency: 'GBP' });
    expect(lists).toContain('UK_OFSI');
  });

  it('should return UAE_LOCAL + UNSCR for AED currency', () => {
    const lists = getRequiredLists({ currency: 'AED' });
    expect(lists).toContain('UAE_LOCAL');
    expect(lists).toContain('UN_SECURITY_COUNCIL');
  });

  it('should return MAS_TFS + UNSCR for SGD currency', () => {
    const lists = getRequiredLists({ currency: 'SGD' });
    expect(lists).toContain('MAS_TFS');
    expect(lists).toContain('UN_SECURITY_COUNCIL');
  });

  it('should return defaults for unknown context', () => {
    const lists = getRequiredLists();
    expect(lists).toContain('OFAC_SDN');
    expect(lists).toContain('EU_CONSOLIDATED');
    expect(lists).toContain('UN_SECURITY_COUNCIL');
  });

  it('should prefer token over currency when both provided', () => {
    const lists = getRequiredLists({ token: 'USDC', currency: 'EUR' });
    // Token takes precedence
    expect(lists).toContain('OFAC_SDN');
    expect(lists).not.toContain('EU_CONSOLIDATED');
  });

  it('should have entries for all supported tokens', () => {
    for (const token of ['USDC', 'EURC', 'USDT', 'DAI', 'USDP', 'USDG']) {
      expect(TOKEN_REQUIRED_LISTS[token]).toBeDefined();
      expect(TOKEN_REQUIRED_LISTS[token]!.length).toBeGreaterThan(0);
    }
  });

  it('should have entries for all APAC currencies', () => {
    for (const currency of ['AED', 'INR', 'SGD', 'CNY', 'HKD', 'NZD', 'KRW', 'MYR', 'THB']) {
      expect(CURRENCY_REQUIRED_LISTS[currency]).toBeDefined();
      expect(CURRENCY_REQUIRED_LISTS[currency]!.length).toBeGreaterThan(0);
    }
  });
});
