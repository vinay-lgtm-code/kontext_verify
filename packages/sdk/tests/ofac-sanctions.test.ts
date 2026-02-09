import { describe, it, expect } from 'vitest';
import {
  OFACSanctionsScreener,
  ofacScreener,
  UsdcCompliance,
} from '../src/index.js';
import type {
  TransactionForAnalysis,
  SanctionedAddressEntry,
  EntityNameEntry,
} from '../src/index.js';

// ============================================================================
// OFACSanctionsScreener - Core Address Screening
// ============================================================================

describe('OFACSanctionsScreener - Address Screening', () => {
  const screener = new OFACSanctionsScreener();

  describe('isActivelySanctioned()', () => {
    it('should detect Lazarus Group address as actively sanctioned', () => {
      expect(
        screener.isActivelySanctioned('0x098B716B8Aaf21512996dC57EB0615e2383E2f96'),
      ).toBe(true);
    });

    it('should detect Garantex address as actively sanctioned', () => {
      expect(
        screener.isActivelySanctioned('0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7'),
      ).toBe(true);
    });

    it('should detect Roman Semenov address as actively sanctioned', () => {
      expect(
        screener.isActivelySanctioned('0xdcbEfFBECcE100cCE9E4b153C4e15cB885643193'),
      ).toBe(true);
    });

    it('should detect Blender.io address as actively sanctioned', () => {
      expect(
        screener.isActivelySanctioned('0x23773E65ed146A459791799d01336DB287f25334'),
      ).toBe(true);
    });

    it('should NOT flag delisted Tornado Cash addresses as actively sanctioned', () => {
      // Tornado Cash Router was delisted March 21, 2025
      expect(
        screener.isActivelySanctioned('0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2'),
      ).toBe(false);
    });

    it('should NOT flag Tornado Cash pool addresses as actively sanctioned', () => {
      expect(
        screener.isActivelySanctioned('0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b'),
      ).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(
        screener.isActivelySanctioned('0x098b716b8aaf21512996dc57eb0615e2383e2f96'),
      ).toBe(true);
      expect(
        screener.isActivelySanctioned('0x098B716B8AAF21512996DC57EB0615E2383E2F96'),
      ).toBe(true);
    });

    it('should return false for clean address', () => {
      expect(
        screener.isActivelySanctioned('0x0000000000000000000000000000000000000001'),
      ).toBe(false);
    });
  });

  describe('hasAnySanctionsHistory()', () => {
    it('should return true for delisted Tornado Cash addresses', () => {
      expect(
        screener.hasAnySanctionsHistory('0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2'),
      ).toBe(true);
    });

    it('should return true for actively sanctioned addresses', () => {
      expect(
        screener.hasAnySanctionsHistory('0x098B716B8Aaf21512996dC57EB0615e2383E2f96'),
      ).toBe(true);
    });

    it('should return false for clean address', () => {
      expect(
        screener.hasAnySanctionsHistory('0x0000000000000000000000000000000000000001'),
      ).toBe(false);
    });
  });

  describe('getAddressEntry()', () => {
    it('should return full entry for known address', () => {
      const entry = screener.getAddressEntry('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
      expect(entry).toBeDefined();
      expect(entry!.entityName).toBe('Lazarus Group');
      expect(entry!.entityType).toBe('GROUP');
      expect(entry!.lists).toContain('SDN');
      expect(entry!.dateRemoved).toBeNull();
    });

    it('should return delisted entry for Tornado Cash', () => {
      const entry = screener.getAddressEntry('0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2');
      expect(entry).toBeDefined();
      expect(entry!.entityName).toBe('Tornado Cash');
      expect(entry!.lists).toContain('DELISTED');
      expect(entry!.dateRemoved).toBe('2025-03-21');
    });

    it('should return undefined for unknown address', () => {
      const entry = screener.getAddressEntry('0x0000000000000000000000000000000000000001');
      expect(entry).toBeUndefined();
    });
  });

  describe('screenAddress() - comprehensive', () => {
    it('should return BLOCKED for actively sanctioned address', () => {
      const result = screener.screenAddress('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
      expect(result.sanctioned).toBe(true);
      expect(result.riskLevel).toBe('BLOCKED');
      expect(result.riskScore).toBe(100);
      expect(result.directMatches.length).toBeGreaterThan(0);
      expect(result.directMatches[0].active).toBe(true);
      expect(result.directMatches[0].entityName).toBe('Lazarus Group');
      expect(result.recommendations[0]).toContain('BLOCK');
    });

    it('should return elevated risk for delisted Tornado Cash address', () => {
      const result = screener.screenAddress('0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2');
      expect(result.sanctioned).toBe(false);
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.riskScore).toBeLessThan(100);
      expect(result.directMatches.length).toBeGreaterThan(0);
      expect(result.directMatches[0].active).toBe(false);
      expect(result.recommendations[0]).toContain('CAUTION');
    });

    it('should return NONE risk for clean address', () => {
      const result = screener.screenAddress('0x0000000000000000000000000000000000000001');
      expect(result.sanctioned).toBe(false);
      expect(result.riskLevel).toBe('NONE');
      expect(result.riskScore).toBe(0);
      expect(result.directMatches.length).toBe(0);
    });

    it('should include lists checked in result', () => {
      const result = screener.screenAddress('0x0000000000000000000000000000000000000001');
      expect(result.listsChecked).toContain('SDN');
      expect(result.listsChecked).toContain('CONSOLIDATED');
      expect(result.listsChecked).toContain('DELISTED');
    });

    it('should include screening timestamp', () => {
      const result = screener.screenAddress('0x0000000000000000000000000000000000000001');
      expect(result.screenedAt).toBeDefined();
      const ts = new Date(result.screenedAt);
      expect(ts.getTime()).toBeGreaterThan(0);
    });

    it('should screen counterparty address when provided', () => {
      const result = screener.screenAddress('0x' + '1'.repeat(40), {
        counterpartyAddress: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
      });
      expect(result.sanctioned).toBe(true); // counterparty is sanctioned
      expect(result.riskLevel).toBe('BLOCKED');
      expect(result.directMatches.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Jurisdictional Screening
// ============================================================================

describe('OFACSanctionsScreener - Jurisdictional Screening', () => {
  const screener = new OFACSanctionsScreener();

  it('should flag comprehensively sanctioned jurisdictions', () => {
    const result = screener.screenAddress('0x' + '1'.repeat(40), {
      jurisdiction: 'KP',
    });
    expect(result.jurisdictionFlags.length).toBeGreaterThan(0);
    expect(result.jurisdictionFlags[0].jurisdiction).toBe('KP');
    expect(result.jurisdictionFlags[0].riskLevel).toBe('BLOCKED');
    expect(result.riskLevel).toBe('BLOCKED');
    expect(result.recommendations.some((r) => r.includes('BLOCK'))).toBe(true);
  });

  it('should flag Iran as comprehensively sanctioned', () => {
    const result = screener.screenAddress('0x' + '1'.repeat(40), {
      jurisdiction: 'IR',
    });
    expect(result.jurisdictionFlags[0].jurisdiction).toBe('IR');
    expect(result.riskLevel).toBe('BLOCKED');
  });

  it('should flag Cuba as comprehensively sanctioned', () => {
    const result = screener.screenAddress('0x' + '1'.repeat(40), {
      jurisdiction: 'CU',
    });
    expect(result.riskLevel).toBe('BLOCKED');
  });

  it('should flag Syria as comprehensively sanctioned', () => {
    const result = screener.screenAddress('0x' + '1'.repeat(40), {
      jurisdiction: 'SY',
    });
    expect(result.riskLevel).toBe('BLOCKED');
  });

  it('should flag Crimea as comprehensively sanctioned', () => {
    const result = screener.screenAddress('0x' + '1'.repeat(40), {
      jurisdiction: 'RU_CRIMEA',
    });
    expect(result.riskLevel).toBe('BLOCKED');
  });

  it('should flag partially sanctioned jurisdictions at HIGH level', () => {
    const result = screener.screenAddress('0x' + '1'.repeat(40), {
      jurisdiction: 'BY',
    });
    expect(result.jurisdictionFlags.length).toBeGreaterThan(0);
    expect(result.riskLevel).toBe('SEVERE');
    expect(result.recommendations.some((r) => r.includes('REVIEW'))).toBe(true);
  });

  it('should not flag unsanctioned jurisdictions', () => {
    const result = screener.screenAddress('0x' + '1'.repeat(40), {
      jurisdiction: 'US' as any,
    });
    expect(result.jurisdictionFlags.length).toBe(0);
  });

  it('should return all sanctioned jurisdictions', () => {
    const jurisdictions = screener.getSanctionedJurisdictions();
    expect(jurisdictions.length).toBeGreaterThanOrEqual(10);
    const codes = jurisdictions.map((j) => j.code);
    expect(codes).toContain('KP');
    expect(codes).toContain('IR');
    expect(codes).toContain('CU');
    expect(codes).toContain('SY');
    expect(codes).toContain('RU_CRIMEA');
  });

  it('should identify comprehensive sanctions correctly', () => {
    expect(screener.isComprehensiveSanctions('KP')).toBe(true);
    expect(screener.isComprehensiveSanctions('IR')).toBe(true);
    expect(screener.isComprehensiveSanctions('BY')).toBe(false);
    expect(screener.isComprehensiveSanctions('MM')).toBe(false);
  });

  it('screenJurisdiction should return flag for known jurisdiction', () => {
    const flag = screener.screenJurisdiction('KP');
    expect(flag).not.toBeNull();
    expect(flag!.jurisdiction).toBe('KP');
    expect(flag!.name).toContain('North Korea');
  });

  it('screenJurisdiction should return null for unknown jurisdiction', () => {
    const flag = screener.screenJurisdiction('XX');
    expect(flag).toBeNull();
  });
});

// ============================================================================
// Fuzzy Entity Name Matching
// ============================================================================

describe('OFACSanctionsScreener - Fuzzy Entity Name Matching', () => {
  const screener = new OFACSanctionsScreener();

  it('should find exact entity name match', () => {
    const results = screener.searchEntityName('Lazarus Group');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entity.name).toBe('Lazarus Group');
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.9);
  });

  it('should find entity by alias', () => {
    const results = screener.searchEntityName('HIDDEN COBRA');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entity.name).toBe('Lazarus Group');
  });

  it('should find entity by alias APT38', () => {
    const results = screener.searchEntityName('APT38');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entity.name).toBe('Lazarus Group');
  });

  it('should find Garantex by partial name', () => {
    const results = screener.searchEntityName('Garantex');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entity.name).toBe('Garantex');
  });

  it('should find entity by substring match', () => {
    const results = screener.searchEntityName('Blender');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entity.name).toBe('Blender.io');
  });

  it('should find Tornado Cash', () => {
    const results = screener.searchEntityName('Tornado');
    expect(results.length).toBeGreaterThan(0);
    const tcResult = results.find((r) => r.entity.name === 'Tornado Cash');
    expect(tcResult).toBeDefined();
  });

  it('should return empty for unrelated query', () => {
    const results = screener.searchEntityName('Microsoft Corporation');
    expect(results.length).toBe(0);
  });

  it('should support custom threshold', () => {
    // Very low threshold should match more
    const looseResults = screener.searchEntityName('Laz', 0.3);
    const strictResults = screener.searchEntityName('Laz', 0.9);
    expect(looseResults.length).toBeGreaterThanOrEqual(strictResults.length);
  });

  it('should include associated addresses in results', () => {
    const results = screener.searchEntityName('Lazarus Group');
    expect(results[0].entity.addresses.length).toBeGreaterThan(0);
    expect(results[0].entity.addresses[0]).toMatch(/^0x/);
  });
});

// ============================================================================
// 50% Rule Screening
// ============================================================================

describe('OFACSanctionsScreener - 50% Rule', () => {
  const screener = new OFACSanctionsScreener();

  it('should flag entity owned 50%+ by sanctioned party', () => {
    const flags = screener.checkFiftyPercentRule('Shell Corp LLC', [
      { ownerName: 'Lazarus Group', ownershipPercentage: 60 },
      { ownerName: 'Clean Corp', ownershipPercentage: 40 },
    ]);
    expect(flags.length).toBeGreaterThanOrEqual(2); // Individual + aggregate
    expect(flags.some((f) => f.sanctionedParent.includes('Lazarus Group'))).toBe(true);
    expect(flags.some((f) => f.ownershipPercentage >= 50)).toBe(true);
  });

  it('should flag aggregate ownership exceeding 50%', () => {
    const flags = screener.checkFiftyPercentRule('Holding Corp', [
      { ownerName: 'Lazarus Group', ownershipPercentage: 30 },
      { ownerName: 'Garantex Exchange', ownershipPercentage: 25 },
      { ownerName: 'Clean Corp', ownershipPercentage: 45 },
    ]);
    // Both Lazarus (30%) + Garantex (25%) = 55% sanctioned ownership
    expect(flags.length).toBeGreaterThanOrEqual(2);
    const aggregateFlag = flags.find((f) => f.ownershipPercentage >= 50);
    expect(aggregateFlag).toBeDefined();
  });

  it('should not flag entity with no sanctioned owners', () => {
    const flags = screener.checkFiftyPercentRule('Clean Corp', [
      { ownerName: 'John Smith', ownershipPercentage: 51 },
      { ownerName: 'Jane Doe', ownershipPercentage: 49 },
    ]);
    expect(flags.length).toBe(0);
  });

  it('should not flag entity with less than 50% sanctioned ownership', () => {
    const flags = screener.checkFiftyPercentRule('Mixed Corp', [
      { ownerName: 'Lazarus Group', ownershipPercentage: 30 },
      { ownerName: 'Clean Corp', ownershipPercentage: 70 },
    ]);
    // Should have 1 flag for the Lazarus match, but no aggregate flag (30% < 50%)
    const aggregateFlag = flags.find(
      (f) => f.source.includes('50% Rule'),
    );
    expect(aggregateFlag).toBeUndefined();
  });
});

// ============================================================================
// Transaction Pattern Analysis
// ============================================================================

describe('OFACSanctionsScreener - Transaction Pattern Analysis', () => {
  const screener = new OFACSanctionsScreener();

  describe('Mixing/Tumbling Detection', () => {
    it('should detect transactions involving known mixer addresses', () => {
      const txs: TransactionForAnalysis[] = [
        {
          txHash: '0x' + 'a'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x23773E65ed146A459791799d01336DB287f25334', // Blender.io
          amount: 1000,
          chain: 'ethereum',
          timestamp: '2024-01-01T10:00:00Z',
        },
      ];

      const flags = screener.analyzeTransactionPatterns(txs);
      const mixingFlag = flags.find((f) => f.pattern === 'MIXING');
      expect(mixingFlag).toBeDefined();
      expect(mixingFlag!.severity).toBe('HIGH');
      expect(mixingFlag!.evidence.length).toBeGreaterThan(0);
    });

    it('should not flag transactions with clean addresses', () => {
      const txs: TransactionForAnalysis[] = [
        {
          txHash: '0x' + 'a'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '2'.repeat(40),
          amount: 1000,
          chain: 'ethereum',
          timestamp: '2024-01-01T10:00:00Z',
        },
      ];

      const flags = screener.analyzeTransactionPatterns(txs);
      const mixingFlag = flags.find((f) => f.pattern === 'MIXING');
      expect(mixingFlag).toBeUndefined();
    });
  });

  describe('Chain-Hopping Detection', () => {
    it('should detect rapid cross-chain movements', () => {
      const txs: TransactionForAnalysis[] = [
        {
          txHash: '0x' + 'a'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '2'.repeat(40),
          amount: 5000,
          chain: 'ethereum',
          timestamp: '2024-01-01T10:00:00Z',
        },
        {
          txHash: '0x' + 'b'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '3'.repeat(40),
          amount: 4900,
          chain: 'base',
          timestamp: '2024-01-01T10:02:00Z', // 2 minutes later
        },
        {
          txHash: '0x' + 'c'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '4'.repeat(40),
          amount: 4800,
          chain: 'polygon',
          timestamp: '2024-01-01T10:04:00Z', // 2 minutes later
        },
      ];

      const flags = screener.analyzeTransactionPatterns(txs);
      const chainHopFlag = flags.find((f) => f.pattern === 'CHAIN_HOPPING');
      expect(chainHopFlag).toBeDefined();
      expect(chainHopFlag!.evidence.length).toBeGreaterThanOrEqual(2);
    });

    it('should not flag same-chain transactions', () => {
      const txs: TransactionForAnalysis[] = [
        {
          txHash: '0x' + 'a'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '2'.repeat(40),
          amount: 5000,
          chain: 'ethereum',
          timestamp: '2024-01-01T10:00:00Z',
        },
        {
          txHash: '0x' + 'b'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '3'.repeat(40),
          amount: 5000,
          chain: 'ethereum',
          timestamp: '2024-01-01T10:02:00Z',
        },
      ];

      const flags = screener.analyzeTransactionPatterns(txs);
      const chainHopFlag = flags.find((f) => f.pattern === 'CHAIN_HOPPING');
      expect(chainHopFlag).toBeUndefined();
    });
  });

  describe('Structuring Detection', () => {
    it('should detect amounts clustered below reporting threshold', () => {
      const txs: TransactionForAnalysis[] = [
        {
          txHash: '0x' + 'a'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '2'.repeat(40),
          amount: 9500,
          chain: 'ethereum',
          timestamp: '2024-01-01T10:00:00Z',
        },
        {
          txHash: '0x' + 'b'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '3'.repeat(40),
          amount: 9200,
          chain: 'ethereum',
          timestamp: '2024-01-01T11:00:00Z',
        },
        {
          txHash: '0x' + 'c'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '4'.repeat(40),
          amount: 8800,
          chain: 'ethereum',
          timestamp: '2024-01-01T12:00:00Z',
        },
      ];

      const flags = screener.analyzeTransactionPatterns(txs);
      const structuringFlag = flags.find((f) => f.pattern === 'STRUCTURING');
      expect(structuringFlag).toBeDefined();
      expect(structuringFlag!.severity).toBe('HIGH');
    });

    it('should not flag amounts well above threshold', () => {
      const txs: TransactionForAnalysis[] = [
        {
          txHash: '0x' + 'a'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '2'.repeat(40),
          amount: 50000,
          chain: 'ethereum',
          timestamp: '2024-01-01T10:00:00Z',
        },
        {
          txHash: '0x' + 'b'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '3'.repeat(40),
          amount: 50000,
          chain: 'ethereum',
          timestamp: '2024-01-01T11:00:00Z',
        },
        {
          txHash: '0x' + 'c'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '4'.repeat(40),
          amount: 50000,
          chain: 'ethereum',
          timestamp: '2024-01-01T12:00:00Z',
        },
      ];

      const flags = screener.analyzeTransactionPatterns(txs);
      const structuringFlag = flags.find((f) => f.pattern === 'STRUCTURING');
      expect(structuringFlag).toBeUndefined();
    });
  });

  describe('Rapid Movement Detection', () => {
    it('should detect rapid succession of transactions', () => {
      const base = new Date('2024-01-01T10:00:00Z').getTime();
      const txs: TransactionForAnalysis[] = [];
      for (let i = 0; i < 5; i++) {
        txs.push({
          txHash: '0x' + String(i).repeat(64).slice(0, 64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + String(i + 2).padStart(1, '0').repeat(40).slice(0, 40),
          amount: 1000 - i * 10,
          chain: 'ethereum',
          timestamp: new Date(base + i * 15000).toISOString(), // 15s apart
        });
      }

      const flags = screener.analyzeTransactionPatterns(txs);
      const rapidFlag = flags.find((f) => f.pattern === 'RAPID_MOVEMENT');
      expect(rapidFlag).toBeDefined();
    });
  });

  describe('Peeling Chain Detection', () => {
    it('should detect decreasing amount pattern', () => {
      const base = new Date('2024-01-01T10:00:00Z').getTime();
      const txs: TransactionForAnalysis[] = [
        {
          txHash: '0x' + 'a'.repeat(64),
          from: '0x' + '1'.repeat(40),
          to: '0x' + '2'.repeat(40),
          amount: 10000,
          chain: 'ethereum',
          timestamp: new Date(base).toISOString(),
        },
        {
          txHash: '0x' + 'b'.repeat(64),
          from: '0x' + '2'.repeat(40),
          to: '0x' + '3'.repeat(40),
          amount: 9500,
          chain: 'ethereum',
          timestamp: new Date(base + 60000).toISOString(),
        },
        {
          txHash: '0x' + 'c'.repeat(64),
          from: '0x' + '3'.repeat(40),
          to: '0x' + '4'.repeat(40),
          amount: 9100,
          chain: 'ethereum',
          timestamp: new Date(base + 120000).toISOString(),
        },
        {
          txHash: '0x' + 'd'.repeat(64),
          from: '0x' + '4'.repeat(40),
          to: '0x' + '5'.repeat(40),
          amount: 8800,
          chain: 'ethereum',
          timestamp: new Date(base + 180000).toISOString(),
        },
      ];

      const flags = screener.analyzeTransactionPatterns(txs);
      const peelingFlag = flags.find((f) => f.pattern === 'PEELING_CHAIN');
      expect(peelingFlag).toBeDefined();
      expect(peelingFlag!.severity).toBe('MEDIUM');
    });
  });

  it('should return empty flags for empty transaction list', () => {
    const flags = screener.analyzeTransactionPatterns([]);
    expect(flags.length).toBe(0);
  });
});

// ============================================================================
// Sanctions List Management
// ============================================================================

describe('OFACSanctionsScreener - List Management', () => {
  it('should return list metadata', () => {
    const screener = new OFACSanctionsScreener();
    const metadata = screener.getListMetadata();
    expect(metadata.addressCount).toBeGreaterThan(0);
    expect(metadata.entityCount).toBeGreaterThan(0);
    expect(metadata.sourceUrl).toContain('treasury.gov');
    expect(metadata.lastUpdated).toBeDefined();
  });

  it('should return active address count', () => {
    const screener = new OFACSanctionsScreener();
    const activeCount = screener.getActiveAddressCount();
    const totalCount = screener.getTotalAddressCount();
    expect(activeCount).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(activeCount); // Total includes delisted
  });

  it('should add new addresses at runtime', () => {
    const screener = new OFACSanctionsScreener();
    const before = screener.getTotalAddressCount();

    const added = screener.addAddresses([
      {
        address: '0x' + 'f'.repeat(40),
        lists: ['SDN'],
        entityName: 'Test Entity',
        entityType: 'UNKNOWN',
        dateAdded: '2025-01-01',
        dateRemoved: null,
        chains: ['ethereum'],
        notes: 'Test entry',
      },
    ]);

    expect(added).toBe(1);
    expect(screener.getTotalAddressCount()).toBe(before + 1);
    expect(screener.isActivelySanctioned('0x' + 'f'.repeat(40))).toBe(true);
  });

  it('should not add duplicate addresses', () => {
    const screener = new OFACSanctionsScreener();
    const added = screener.addAddresses([
      {
        address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
        lists: ['SDN'],
        entityName: 'Lazarus Group',
        entityType: 'GROUP',
        dateAdded: '2022-04-14',
        dateRemoved: null,
        chains: ['ethereum'],
        notes: 'duplicate',
      },
    ]);
    expect(added).toBe(0);
  });

  it('should add new entities for fuzzy matching', () => {
    const screener = new OFACSanctionsScreener();
    const added = screener.addEntities([
      {
        name: 'Test Sanctioned Entity',
        aliases: ['TSE', 'Test Entity'],
        addresses: ['0x' + 'e'.repeat(40)],
        list: 'SDN',
      },
    ]);
    expect(added).toBe(1);

    const results = screener.searchEntityName('Test Sanctioned Entity');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return all entities', () => {
    const screener = new OFACSanctionsScreener();
    const entities = screener.getEntities();
    expect(entities.length).toBeGreaterThan(0);
    expect(entities.some((e) => e.name === 'Lazarus Group')).toBe(true);
  });
});

// ============================================================================
// Singleton Export
// ============================================================================

describe('ofacScreener singleton', () => {
  it('should be an instance of OFACSanctionsScreener', () => {
    expect(ofacScreener).toBeInstanceOf(OFACSanctionsScreener);
  });

  it('should screen addresses', () => {
    const result = ofacScreener.screenAddress('0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
    expect(result.sanctioned).toBe(true);
  });
});

// ============================================================================
// Integration: UsdcCompliance.screenComprehensive()
// ============================================================================

describe('UsdcCompliance - Comprehensive Screening Integration', () => {
  it('should expose comprehensive screening through UsdcCompliance', () => {
    const result = UsdcCompliance.screenComprehensive(
      '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
    );
    expect(result.sanctioned).toBe(true);
    expect(result.riskLevel).toBe('BLOCKED');
  });

  it('should detect delisted addresses via comprehensive screening', () => {
    const result = UsdcCompliance.screenComprehensive(
      '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',
    );
    expect(result.sanctioned).toBe(false);
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it('should support jurisdiction context in comprehensive screening', () => {
    const result = UsdcCompliance.screenComprehensive(
      '0x' + '1'.repeat(40),
      { jurisdiction: 'KP' },
    );
    expect(result.jurisdictionFlags.length).toBeGreaterThan(0);
    expect(result.riskLevel).toBe('BLOCKED');
  });

  it('isActivelySanctioned should distinguish active from delisted', () => {
    // Lazarus Group - actively sanctioned
    expect(UsdcCompliance.isActivelySanctioned('0x098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(true);
    // Tornado Cash Router - delisted
    expect(UsdcCompliance.isActivelySanctioned('0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2')).toBe(false);
  });
});

// ============================================================================
// Backward Compatibility
// ============================================================================

describe('Backward Compatibility - UsdcCompliance.isSanctioned()', () => {
  it('should still detect Tornado Cash addresses for backward compat', () => {
    // These are retained in the SANCTIONED_ADDRESSES list for compat
    expect(
      UsdcCompliance.isSanctioned('0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2'),
    ).toBe(true);
  });

  it('should detect new actively sanctioned addresses', () => {
    // Roman Semenov - new addition
    expect(
      UsdcCompliance.isSanctioned('0xdcbEfFBECcE100cCE9E4b153C4e15cB885643193'),
    ).toBe(true);
  });

  it('should have more addresses than the original list (22+)', () => {
    const addresses = UsdcCompliance.getSanctionedAddresses();
    expect(addresses.length).toBeGreaterThan(22);
  });

  it('should still pass existing sanctions integration test patterns', () => {
    // Lazarus Group
    expect(UsdcCompliance.isSanctioned('0x098B716B8Aaf21512996dC57EB0615e2383E2f96')).toBe(true);
    // Garantex
    expect(UsdcCompliance.isSanctioned('0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7')).toBe(true);
    // Blender.io
    expect(UsdcCompliance.isSanctioned('0x23773E65ed146A459791799d01336DB287f25334')).toBe(true);
    // Clean address
    expect(UsdcCompliance.isSanctioned('0xdAC17F958D2ee523a2206206994597C13D831ec7')).toBe(false);
  });
});
