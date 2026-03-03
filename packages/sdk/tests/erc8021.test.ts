import { describe, it, expect } from 'vitest';
import { encodeERC8021Suffix, parseERC8021Suffix, KONTEXT_BUILDER_CODE } from '../src/index.js';

const ERC_8021_MARKER = '80210000000000000000000000008021';

describe('ERC-8021 Transaction Attribution', () => {
  describe('encodeERC8021Suffix', () => {
    it('encodes a single builder code', () => {
      const suffix = encodeERC8021Suffix(['kontext']);
      // 'kontext' = 6b6f6e74657874 (7 bytes)
      // codesLength = 07, schemaId = 00, marker = 80210000...8021
      expect(suffix).toBe('6b6f6e7465787407' + '00' + ERC_8021_MARKER);
    });

    it('encodes multiple comma-delimited codes', () => {
      const suffix = encodeERC8021Suffix(['kontext', 'myapp']);
      // 'kontext,myapp' = 13 chars
      const codesHex = Buffer.from('kontext,myapp').toString('hex');
      expect(suffix).toBe(codesHex + '0d' + '00' + ERC_8021_MARKER);
    });

    it('throws on empty codes array', () => {
      expect(() => encodeERC8021Suffix([])).toThrow('at least one builder code');
    });

    it('throws on codes exceeding 255 bytes', () => {
      const longCode = 'a'.repeat(256);
      expect(() => encodeERC8021Suffix([longCode])).toThrow('exceeds 255 bytes');
    });

    it('exports KONTEXT_BUILDER_CODE constant', () => {
      expect(KONTEXT_BUILDER_CODE).toBe('kontext');
    });
  });

  describe('parseERC8021Suffix', () => {
    it('round-trips a single code', () => {
      const original = '0xdeadbeef'; // some calldata
      const suffix = encodeERC8021Suffix(['kontext']);
      const combined = original + suffix;

      const result = parseERC8021Suffix(combined);
      expect(result).not.toBeNull();
      expect(result!.codes).toEqual(['kontext']);
      expect(result!.schemaId).toBe(0);
      expect(result!.rawSuffix).toMatch(/^0x/);
    });

    it('round-trips multiple codes', () => {
      const calldata = '0xa21f3c6a' + '00'.repeat(64); // fake anchor calldata
      const suffix = encodeERC8021Suffix(['kontext', 'uniswap']);
      const combined = calldata + suffix;

      const result = parseERC8021Suffix(combined);
      expect(result).not.toBeNull();
      expect(result!.codes).toEqual(['kontext', 'uniswap']);
      expect(result!.schemaId).toBe(0);
    });

    it('returns null for calldata without ERC-8021 suffix', () => {
      const calldata = '0xdeadbeef1234567890abcdef';
      expect(parseERC8021Suffix(calldata)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseERC8021Suffix('')).toBeNull();
    });

    it('returns null for calldata too short', () => {
      expect(parseERC8021Suffix('0x1234')).toBeNull();
    });

    it('returns null for invalid marker', () => {
      // Valid structure but wrong marker
      const fakeMarker = 'ff'.repeat(16);
      const suffix = '6b6f6e7465787407' + '00' + fakeMarker;
      expect(parseERC8021Suffix('0xdeadbeef' + suffix)).toBeNull();
    });

    it('handles calldata with 0x prefix', () => {
      const suffix = encodeERC8021Suffix(['test']);
      const result = parseERC8021Suffix('0x' + suffix);
      expect(result).not.toBeNull();
      expect(result!.codes).toEqual(['test']);
    });

    it('handles calldata without 0x prefix', () => {
      const suffix = encodeERC8021Suffix(['test']);
      const result = parseERC8021Suffix(suffix);
      expect(result).not.toBeNull();
      expect(result!.codes).toEqual(['test']);
    });
  });
});
