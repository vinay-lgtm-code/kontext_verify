// ============================================================================
// Chain Verification Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyChainExport, type ChainEntry } from '../src/chain-verify.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntry(index: number, recordHash: string, previousHash: string): ChainEntry {
  return { chain_index: index, record_hash: recordHash, previous_record_hash: previousHash };
}

function makeValidChain(length: number): ChainEntry[] {
  const entries: ChainEntry[] = [];
  for (let i = 0; i < length; i++) {
    const prevHash = i === 0 ? 'genesis' : `hash_${i - 1}`;
    entries.push(makeEntry(i, `hash_${i}`, prevHash));
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('verifyChainExport', () => {
  // Freeze time so attestation is deterministic within a single test
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Valid chains ---

  it('valid chain (3+ entries) returns valid: true with no breaks', () => {
    const entries = makeValidChain(5);
    const result = verifyChainExport(entries);

    expect(result.valid).toBe(true);
    expect(result.chain_length).toBe(5);
    expect(result.breaks).toEqual([]);
    expect(result.attestation).toMatch(/^[a-f0-9]{64}$/);
    expect(result.verified_at).toBe('2026-01-15T12:00:00.000Z');
  });

  it('empty entries array returns valid: true with chain_length 0', () => {
    const result = verifyChainExport([]);

    expect(result.valid).toBe(true);
    expect(result.chain_length).toBe(0);
    expect(result.breaks).toEqual([]);
  });

  it('single entry returns valid: true with chain_length 1', () => {
    const entries = [makeEntry(0, 'hash_0', 'genesis')];
    const result = verifyChainExport(entries);

    expect(result.valid).toBe(true);
    expect(result.chain_length).toBe(1);
    expect(result.breaks).toEqual([]);
  });

  // --- Break detection ---

  it('single break (tampered record_hash) returns valid: false with correct break index', () => {
    const entries = makeValidChain(4);
    // Tamper entry at index 2: its previous_record_hash no longer matches entry 1's record_hash
    entries[2]!.previous_record_hash = 'TAMPERED';

    const result = verifyChainExport(entries);

    expect(result.valid).toBe(false);
    expect(result.breaks).toEqual([2]);
  });

  it('multiple breaks reports all break indices', () => {
    const entries = makeValidChain(5);
    entries[1]!.previous_record_hash = 'TAMPERED_1';
    entries[3]!.previous_record_hash = 'TAMPERED_3';

    const result = verifyChainExport(entries);

    expect(result.valid).toBe(false);
    expect(result.breaks).toHaveLength(2);
    expect(result.breaks).toContain(1);
    expect(result.breaks).toContain(3);
  });

  it('break at last entry only flags that index', () => {
    const entries = makeValidChain(3);
    entries[2]!.previous_record_hash = 'BAD';

    const result = verifyChainExport(entries);

    expect(result.valid).toBe(false);
    expect(result.breaks).toEqual([2]);
  });

  // --- Sorting ---

  it('out-of-order chain_index values are sorted and still verified', () => {
    const entries = makeValidChain(4);
    // Shuffle the entries
    const shuffled = [entries[3]!, entries[0]!, entries[2]!, entries[1]!];

    const result = verifyChainExport(shuffled);

    expect(result.valid).toBe(true);
    expect(result.chain_length).toBe(4);
    expect(result.breaks).toEqual([]);
  });

  it('out-of-order with a break still detects the break after sorting', () => {
    const entries = makeValidChain(4);
    entries[2]!.previous_record_hash = 'WRONG';
    // Shuffle
    const shuffled = [entries[2]!, entries[0]!, entries[3]!, entries[1]!];

    const result = verifyChainExport(shuffled);

    expect(result.valid).toBe(false);
    expect(result.breaks).toContain(2);
  });

  // --- Attestation determinism ---

  it('attestation hash is deterministic (same input produces same attestation)', () => {
    const entries = makeValidChain(3);
    const result1 = verifyChainExport(entries);
    const result2 = verifyChainExport(entries);

    expect(result1.attestation).toBe(result2.attestation);
  });

  it('attestation changes when chain result changes (valid vs broken)', () => {
    const validEntries = makeValidChain(3);
    const brokenEntries = makeValidChain(3);
    brokenEntries[1]!.previous_record_hash = 'BROKEN';

    const validResult = verifyChainExport(validEntries);
    const brokenResult = verifyChainExport(brokenEntries);

    expect(validResult.attestation).not.toBe(brokenResult.attestation);
  });

  it('attestation changes when chain_length differs', () => {
    const short = makeValidChain(2);
    const long = makeValidChain(3);

    const r1 = verifyChainExport(short);
    const r2 = verifyChainExport(long);

    expect(r1.attestation).not.toBe(r2.attestation);
  });

  // --- Does not mutate input ---

  it('does not mutate the original entries array', () => {
    const entries = [
      makeEntry(2, 'hash_2', 'hash_1'),
      makeEntry(0, 'hash_0', 'genesis'),
      makeEntry(1, 'hash_1', 'hash_0'),
    ];
    const originalOrder = entries.map((e) => e.chain_index);

    verifyChainExport(entries);

    expect(entries.map((e) => e.chain_index)).toEqual(originalOrder);
  });
});
