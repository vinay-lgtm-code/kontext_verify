// ============================================================================
// PII Vault Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PIIVault, encrypt, decrypt } from '../src/pii/vault.js';
import type { Pool } from 'pg';
import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Test encryption key (32 bytes = 64 hex chars)
// ---------------------------------------------------------------------------

const TEST_KEY = 'a'.repeat(64); // 32 bytes of 0xaa

function makeMockPool() {
  return {
    query: vi.fn(),
  } as unknown as Pool;
}

// ---------------------------------------------------------------------------
// Pure crypto tests (no DB mocking needed)
// ---------------------------------------------------------------------------

describe('AES-256-GCM encryption', () => {
  it('encrypt then decrypt roundtrip succeeds', () => {
    const plaintext = JSON.stringify({ name: 'John Doe', ssn: '123-45-6789' });
    const { ciphertext, iv, authTag } = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(ciphertext, iv, authTag, TEST_KEY);

    expect(decrypted).toBe(plaintext);
  });

  it('different inputs produce different ciphertexts', () => {
    const { ciphertext: ct1 } = encrypt('input one', TEST_KEY);
    const { ciphertext: ct2 } = encrypt('input two', TEST_KEY);

    expect(ct1.equals(ct2)).toBe(false);
  });

  it('same input produces different ciphertexts (random IV)', () => {
    const { ciphertext: ct1 } = encrypt('same input', TEST_KEY);
    const { ciphertext: ct2 } = encrypt('same input', TEST_KEY);

    // With random IVs, ciphertexts should differ (extremely high probability)
    expect(ct1.equals(ct2)).toBe(false);
  });

  it('decryption with wrong key fails', () => {
    const { ciphertext, iv, authTag } = encrypt('secret data', TEST_KEY);
    const wrongKey = 'b'.repeat(64);

    expect(() => decrypt(ciphertext, iv, authTag, wrongKey)).toThrow();
  });

  it('tampered ciphertext fails authentication', () => {
    const { ciphertext, iv, authTag } = encrypt('secret data', TEST_KEY);
    // Flip a byte
    ciphertext[0] = (ciphertext[0]! ^ 0xff);

    expect(() => decrypt(ciphertext, iv, authTag, TEST_KEY)).toThrow();
  });

  it('invalid encryption key length throws', () => {
    expect(() => encrypt('data', 'tooshort')).toThrow(/32 bytes/);
  });

  it('invalid decryption key length throws', () => {
    const { ciphertext, iv, authTag } = encrypt('data', TEST_KEY);
    expect(() => decrypt(ciphertext, iv, authTag, 'tooshort')).toThrow(/32 bytes/);
  });

  it('handles empty string encryption', () => {
    const { ciphertext, iv, authTag } = encrypt('', TEST_KEY);
    const decrypted = decrypt(ciphertext, iv, authTag, TEST_KEY);
    expect(decrypted).toBe('');
  });

  it('handles unicode content', () => {
    const plaintext = JSON.stringify({ name: 'Muller' });
    const { ciphertext, iv, authTag } = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(ciphertext, iv, authTag, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });
});

// ---------------------------------------------------------------------------
// PIIVault class tests (DB mocking)
// ---------------------------------------------------------------------------

describe('PIIVault', () => {
  let pool: Pool;
  let vault: PIIVault;

  beforeEach(() => {
    pool = makeMockPool();
    vault = new PIIVault(pool, TEST_KEY);
  });

  describe('constructor', () => {
    it('throws with invalid key length', () => {
      expect(() => new PIIVault(pool, 'short')).toThrow(/32 bytes/);
    });

    it('creates successfully with valid 64-hex-char key', () => {
      expect(() => new PIIVault(pool, TEST_KEY)).not.toThrow();
    });
  });

  // ---- store ----

  describe('store', () => {
    it('calls pool.query with correct INSERT', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await vault.store({ name: 'Jane Doe', email: 'jane@example.com' });

      expect(result.pseudonymToken).toMatch(/^pii_[a-f0-9]{32}$/);
      expect(pool.query).toHaveBeenCalledTimes(1);

      const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(call[0]).toContain('INSERT INTO pii_vault');
      expect(call[1]).toHaveLength(4); // token, ciphertext, iv, auth_tag
      expect(call[1][0]).toMatch(/^pii_/); // pseudonym token
      expect(Buffer.isBuffer(call[1][1])).toBe(true); // encrypted pii_fields
      expect(Buffer.isBuffer(call[1][2])).toBe(true); // iv
      expect(Buffer.isBuffer(call[1][3])).toBe(true); // auth_tag
    });

    it('pseudonym token has pii_ prefix', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await vault.store({ name: 'Test' });
      expect(result.pseudonymToken.startsWith('pii_')).toBe(true);
    });

    it('encrypts empty PII fields object', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await vault.store({});
      expect(result.pseudonymToken).toMatch(/^pii_/);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  // ---- resolve ----

  describe('resolve', () => {
    it('calls pool.query with correct SELECT and decrypts', async () => {
      const piiData = { name: 'Alice', phone: '+1234567890' };
      const plaintext = JSON.stringify(piiData);
      const { ciphertext, iv, authTag } = encrypt(plaintext, TEST_KEY);

      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{
          pii_fields: ciphertext,
          iv,
          auth_tag: authTag,
          erased_at: null,
        }],
      });

      const result = await vault.resolve('pii_abc123');

      expect(pool.query).toHaveBeenCalledTimes(1);
      const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(call[0]).toContain('SELECT');
      expect(call[0]).toContain('pii_vault');
      expect(call[1]).toEqual(['pii_abc123']);

      expect(result).not.toBeNull();
      expect(result!.pseudonymToken).toBe('pii_abc123');
      expect(result!.piiFields).toEqual(piiData);
    });

    it('returns null for non-existent token', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await vault.resolve('pii_nonexistent');
      expect(result).toBeNull();
    });

    it('returns null for erased record', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{
          pii_fields: Buffer.from('ignored'),
          iv: Buffer.from('ignored'),
          auth_tag: Buffer.from('ignored'),
          erased_at: '2026-01-01T00:00:00Z',
        }],
      });

      const result = await vault.resolve('pii_erased');
      expect(result).toBeNull();
    });
  });

  // ---- erase ----

  describe('erase', () => {
    it('nullifies pii_fields and sets erased_at', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 1 });

      const result = await vault.erase('pii_todelete');

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledTimes(1);

      const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(call[0]).toContain('UPDATE pii_vault');
      expect(call[0]).toContain('pii_fields = NULL');
      expect(call[0]).toContain('iv = NULL');
      expect(call[0]).toContain('auth_tag = NULL');
      expect(call[0]).toContain('erased_at');
      expect(call[1]).toEqual(['pii_todelete']);
    });

    it('returns false when token not found or already erased', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 0 });

      const result = await vault.erase('pii_notfound');
      expect(result).toBe(false);
    });
  });

  // ---- resolve after erase ----

  describe('resolve after erase', () => {
    it('returns null when record has been erased', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{
          pii_fields: null,
          iv: null,
          auth_tag: null,
          erased_at: '2026-03-01T00:00:00Z',
        }],
      });

      const result = await vault.resolve('pii_erased_token');
      expect(result).toBeNull();
    });
  });
});
