// ============================================================================
// Screening Module Tests — fuzzy matching, index, sync pipeline
// ============================================================================

import { describe, it, expect } from 'vitest';

// Import from source files directly (server package)
import {
  extractTrigrams,
  normalize,
  trigramSimilarity,
  buildTrigramIndex,
  searchCandidates,
  DEFAULT_THRESHOLD,
} from '../src/screening/fuzzy.js';
import { buildIndex, lookupAddress, searchEntities } from '../src/screening/screening-index.js';
import type { SanctionsEntity } from '../src/screening/types.js';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeEntity(overrides: Partial<SanctionsEntity> & { id: string; name: string }): SanctionsEntity {
  return {
    aliases: [],
    type: 'entity',
    cryptoAddresses: [],
    lists: ['OFAC_SDN'],
    programs: [],
    status: 'active',
    sourceIds: {},
    ...overrides,
  };
}

const LAZARUS = makeEntity({
  id: 'ofac:1001',
  name: 'Lazarus Group',
  aliases: ['HIDDEN COBRA', 'Guardians of Peace'],
  type: 'entity',
  cryptoAddresses: ['0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b'],
  programs: ['CYBER2', 'DPRK'],
});

const GARANTEX = makeEntity({
  id: 'ofac:2002',
  name: 'Garantex International CIC',
  aliases: ['Garantex Europe OU'],
  type: 'entity',
  cryptoAddresses: ['0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107'],
  programs: ['RUSSIA-EO14024'],
});

const KIM_JONG_UN = makeEntity({
  id: 'ofac:3003',
  name: 'Kim Jong Un',
  aliases: ['Kim Jong-un', 'Kim Jeong-eun'],
  type: 'person',
  programs: ['DPRK'],
});

const TEST_ENTITIES = [LAZARUS, GARANTEX, KIM_JONG_UN];

// ---------------------------------------------------------------------------
// Fuzzy matching tests
// ---------------------------------------------------------------------------

describe('fuzzy matching', () => {
  describe('normalize', () => {
    it('lowercases and trims', () => {
      expect(normalize('  Hello World  ')).toBe('hello world');
    });

    it('collapses whitespace', () => {
      expect(normalize('a  b   c')).toBe('a b c');
    });
  });

  describe('extractTrigrams', () => {
    it('extracts correct trigrams from short string', () => {
      const trigrams = extractTrigrams('abcd');
      expect(trigrams).toEqual(new Set(['abc', 'bcd']));
    });

    it('returns empty set for strings shorter than 3 chars', () => {
      expect(extractTrigrams('ab').size).toBe(0);
      expect(extractTrigrams('a').size).toBe(0);
    });

    it('handles typical entity names', () => {
      const trigrams = extractTrigrams('Lazarus Group');
      expect(trigrams.size).toBeGreaterThan(5);
      expect(trigrams.has('laz')).toBe(true);
      expect(trigrams.has('rou')).toBe(true);
    });
  });

  describe('trigramSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(trigramSimilarity('Lazarus Group', 'Lazarus Group')).toBe(1.0);
    });

    it('returns 1.0 for case-insensitive match', () => {
      expect(trigramSimilarity('lazarus group', 'LAZARUS GROUP')).toBe(1.0);
    });

    it('returns high similarity for close matches', () => {
      const sim = trigramSimilarity('Lazarus Group', 'Lazarus Grp');
      expect(sim).toBeGreaterThan(0.7);
    });

    it('returns low similarity for unrelated strings', () => {
      const sim = trigramSimilarity('Lazarus Group', 'Goldman Sachs');
      expect(sim).toBeLessThan(0.3);
    });

    it('returns 0 for very short strings', () => {
      expect(trigramSimilarity('a', 'b')).toBe(0);
    });
  });

  describe('buildTrigramIndex', () => {
    it('indexes names and aliases', () => {
      const index = buildTrigramIndex(TEST_ENTITIES);
      expect(index.size).toBeGreaterThan(0);

      // "laz" trigram should map to Lazarus entity
      const lazSet = index.get('laz');
      expect(lazSet).toBeDefined();
      expect(lazSet!.has('ofac:1001')).toBe(true);
    });

    it('indexes alias trigrams', () => {
      const index = buildTrigramIndex(TEST_ENTITIES);
      // "hid" from "HIDDEN COBRA" alias
      const hidSet = index.get('hid');
      expect(hidSet).toBeDefined();
      expect(hidSet!.has('ofac:1001')).toBe(true);
    });
  });

  describe('searchCandidates', () => {
    it('returns candidate IDs for matching query', () => {
      const index = buildTrigramIndex(TEST_ENTITIES);
      const candidates = searchCandidates('Lazarus Group', index);
      expect(candidates).toContain('ofac:1001');
    });

    it('returns empty for no-match query', () => {
      const index = buildTrigramIndex(TEST_ENTITIES);
      const candidates = searchCandidates('xyz', index);
      expect(candidates.length).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Screening index tests
// ---------------------------------------------------------------------------

describe('screening index', () => {
  describe('buildIndex', () => {
    it('builds index with correct stats', () => {
      const index = buildIndex(TEST_ENTITIES);
      expect(index.stats.totalEntities).toBe(3);
      expect(index.stats.totalAddresses).toBe(2);
      expect(index.entityMap.size).toBe(3);
    });

    it('indexes all crypto addresses', () => {
      const index = buildIndex(TEST_ENTITIES);
      expect(index.addressMap.size).toBe(2);
    });

    it('has a version timestamp', () => {
      const index = buildIndex(TEST_ENTITIES);
      expect(index.version).toBeTruthy();
      expect(new Date(index.version).getTime()).not.toBeNaN();
    });
  });

  describe('lookupAddress', () => {
    it('finds known sanctioned address', () => {
      const index = buildIndex(TEST_ENTITIES);
      const entity = lookupAddress(index, '0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b');
      expect(entity).not.toBeNull();
      expect(entity!.name).toBe('Lazarus Group');
    });

    it('is case-insensitive', () => {
      const index = buildIndex(TEST_ENTITIES);
      const entity = lookupAddress(index, '0xA0E1C89EF1A489C9C7DE96311ED5CE5D32C20E4B');
      expect(entity).not.toBeNull();
    });

    it('returns null for unknown address', () => {
      const index = buildIndex(TEST_ENTITIES);
      const entity = lookupAddress(index, '0x0000000000000000000000000000000000000000');
      expect(entity).toBeNull();
    });
  });

  describe('searchEntities', () => {
    it('finds exact name match', () => {
      const index = buildIndex(TEST_ENTITIES);
      const matches = searchEntities(index, 'Lazarus Group');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]!.name).toBe('Lazarus Group');
      expect(matches[0]!.similarity).toBe(1.0);
    });

    it('finds fuzzy match', () => {
      const index = buildIndex(TEST_ENTITIES);
      const matches = searchEntities(index, 'Lazarus Grup', 0.7);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]!.name).toBe('Lazarus Group');
    });

    it('matches against aliases', () => {
      const index = buildIndex(TEST_ENTITIES);
      const matches = searchEntities(index, 'HIDDEN COBRA');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]!.name).toBe('Lazarus Group');
      expect(matches[0]!.matchedOn).toBe('HIDDEN COBRA');
    });

    it('returns empty for no match at high threshold', () => {
      const index = buildIndex(TEST_ENTITIES);
      const matches = searchEntities(index, 'Totally Random Company XYZ');
      expect(matches.length).toBe(0);
    });

    it('respects maxResults', () => {
      const index = buildIndex(TEST_ENTITIES);
      const matches = searchEntities(index, 'Kim', 0.3, 1);
      expect(matches.length).toBeLessThanOrEqual(1);
    });

    it('returns empty for very short query', () => {
      const index = buildIndex(TEST_ENTITIES);
      const matches = searchEntities(index, 'ab');
      expect(matches.length).toBe(0);
    });

    it('includes entity metadata in matches', () => {
      const index = buildIndex(TEST_ENTITIES);
      const matches = searchEntities(index, 'Garantex International');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]!.lists).toContain('OFAC_SDN');
      expect(matches[0]!.programs).toContain('RUSSIA-EO14024');
      expect(matches[0]!.status).toBe('active');
    });
  });
});
