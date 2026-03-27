// ============================================================================
// Kontext Server - PII Vault (AES-256-GCM encrypted field storage)
// ============================================================================
//
// Stores personally identifiable information (PII) in an encrypted vault.
// Each PII record is encrypted with AES-256-GCM before storage.
// A pseudonym token (pii_ prefix) is returned for future resolution.
//
// Schema: pii_vault table
//   pseudonym_token TEXT PRIMARY KEY,
//   pii_fields      BYTEA NOT NULL,
//   iv              BYTEA NOT NULL,
//   auth_tag        BYTEA NOT NULL,
//   created_at      TIMESTAMPTZ DEFAULT now(),
//   erased_at       TIMESTAMPTZ
//

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { Pool } from 'pg';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface PIIFields {
  [key: string]: unknown;
}

export interface StoreResult {
  pseudonymToken: string;
}

export interface ResolveResult {
  pseudonymToken: string;
  piiFields: PIIFields;
}

/** Encrypt plaintext with AES-256-GCM */
export function encrypt(
  plaintext: string,
  keyHex: string,
): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex chars)');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return { ciphertext: encrypted, iv, authTag };
}

/** Decrypt ciphertext with AES-256-GCM */
export function decrypt(
  ciphertext: Buffer,
  iv: Buffer,
  authTag: Buffer,
  keyHex: string,
): string {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex chars)');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/** Generate a pseudonym token */
function generatePseudonymToken(): string {
  return `pii_${randomBytes(16).toString('hex')}`;
}

export class PIIVault {
  constructor(
    private readonly pool: Pool,
    private readonly encryptionKeyHex: string,
  ) {
    const keyBuf = Buffer.from(encryptionKeyHex, 'hex');
    if (keyBuf.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex chars)');
    }
  }

  /** Store PII fields encrypted, returning a pseudonym token */
  async store(piiFields: PIIFields): Promise<StoreResult> {
    const token = generatePseudonymToken();
    const plaintext = JSON.stringify(piiFields);
    const { ciphertext, iv, authTag } = encrypt(plaintext, this.encryptionKeyHex);

    await this.pool.query(
      `INSERT INTO pii_vault (pseudonym_token, pii_fields, iv, auth_tag)
       VALUES ($1, $2, $3, $4)`,
      [token, ciphertext, iv, authTag],
    );

    return { pseudonymToken: token };
  }

  /** Resolve a pseudonym token back to decrypted PII fields */
  async resolve(pseudonymToken: string): Promise<ResolveResult | null> {
    const result = await this.pool.query<{
      pii_fields: Buffer;
      iv: Buffer;
      auth_tag: Buffer;
      erased_at: string | null;
    }>(
      `SELECT pii_fields, iv, auth_tag, erased_at
       FROM pii_vault
       WHERE pseudonym_token = $1`,
      [pseudonymToken],
    );

    const row = result.rows[0];
    if (!row) return null;

    if (row.erased_at) return null;

    const plaintext = decrypt(
      row.pii_fields,
      row.iv,
      row.auth_tag,
      this.encryptionKeyHex,
    );

    return {
      pseudonymToken,
      piiFields: JSON.parse(plaintext) as PIIFields,
    };
  }

  /** GDPR erase -- nullify PII fields and mark erased */
  async erase(pseudonymToken: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE pii_vault
       SET pii_fields = NULL, iv = NULL, auth_tag = NULL, erased_at = now()
       WHERE pseudonym_token = $1 AND erased_at IS NULL`,
      [pseudonymToken],
    );

    return (result.rowCount ?? 0) > 0;
  }
}
