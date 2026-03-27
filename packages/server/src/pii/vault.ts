// ============================================================================
// Kontext Server — PII Vault (AES-256-GCM encrypted, pseudonymized)
// ============================================================================
// Stores PII fields encrypted at rest. Each unique subject gets a pseudonym
// token that replaces raw PII in evidence bundles and the digest chain.
// On GDPR erasure, the vault entry is nullified — digest chain stays intact.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubjectType = 'individual' | 'entity' | 'agent';

export interface VaultEntry {
  vault_id: string;
  org_id: string;
  subject_id: string;
  subject_type: SubjectType;
  pseudonym_token: string;
  encryption_key_id: string;
  created_at: string;
  erased_at: string | null;
}

export interface ErasureRequest {
  request_id: string;
  org_id: string;
  subject_id: string;
  requested_by: string;
  requested_at: string;
  completed_at: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  affected_events: number | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Encryption helpers (AES-256-GCM)
// ---------------------------------------------------------------------------

function deriveKey(encryptionKey: string): Buffer {
  // Key = first 32 bytes of SHA-256(PII_ENCRYPTION_KEY)
  return createHash('sha256').update(encryptionKey).digest();
}

function encrypt(plaintext: string, key: Buffer): string {
  // IV = random 12 bytes, stored with ciphertext
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + ciphertext + authTag)
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

function decrypt(encoded: string, key: Buffer): string {
  const data = Buffer.from(encoded, 'base64');
  // IV = first 12 bytes, authTag = last 16 bytes, ciphertext = middle
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(12, data.length - 16);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const random = randomBytes(10).toString('base64url').toUpperCase().slice(0, 16);
  return `${prefix}_${timestamp}${random}`;
}

// ---------------------------------------------------------------------------
// PIIVault class
// ---------------------------------------------------------------------------

export class PIIVault {
  private readonly key: Buffer;
  private readonly keyId: string;

  constructor(encryptionKey: string) {
    this.key = deriveKey(encryptionKey);
    // Key ID = first 8 chars of hex SHA-256 of the key (for audit/rotation tracking)
    this.keyId = createHash('sha256').update(this.key).digest('hex').slice(0, 8);
  }

  /**
   * Store PII fields encrypted in the vault. Returns the pseudonym token.
   * If the subject already exists for this org, returns the existing token.
   */
  async store(
    pool: Pool,
    orgId: string,
    subjectId: string,
    subjectType: SubjectType,
    piiFields: Record<string, unknown>,
  ): Promise<string> {
    // Check for existing entry (upsert pattern)
    const existing = await pool.query<{ pseudonym_token: string; erased_at: string | null }>(
      `SELECT pseudonym_token, erased_at FROM pii_vault WHERE org_id = $1 AND subject_id = $2`,
      [orgId, subjectId],
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (row.erased_at) {
        throw new Error(`Subject ${subjectId} has been erased and cannot be re-stored`);
      }
      return row.pseudonym_token;
    }

    const vaultId = generateId('vlt');
    const pseudonymToken = `pii_${randomBytes(16).toString('hex')}`;
    const encryptedFields = encrypt(JSON.stringify(piiFields), this.key);

    await pool.query(
      `INSERT INTO pii_vault (
        vault_id, org_id, subject_id, subject_type,
        pii_fields, pseudonym_token, encryption_key_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [vaultId, orgId, subjectId, subjectType, JSON.stringify(encryptedFields), pseudonymToken, this.keyId],
    );

    return pseudonymToken;
  }

  /**
   * Resolve a pseudonym token back to the original PII fields.
   * Returns null if the token is not found or has been erased.
   */
  async resolve(
    pool: Pool,
    pseudonymToken: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await pool.query<{ pii_fields: string; erased_at: string | null }>(
      `SELECT pii_fields, erased_at FROM pii_vault WHERE pseudonym_token = $1`,
      [pseudonymToken],
    );

    const row = result.rows[0];
    if (!row || row.erased_at) return null;

    // pii_fields is stored as a JSON string containing the base64-encoded encrypted blob
    const encryptedBlob = JSON.parse(row.pii_fields) as string;
    const decrypted = decrypt(encryptedBlob, this.key);
    return JSON.parse(decrypted) as Record<string, unknown>;
  }

  /**
   * GDPR erasure: destroy the PII mapping while preserving the digest chain.
   * Creates an erasure request, nullifies vault PII fields, counts affected events.
   */
  async erase(
    pool: Pool,
    orgId: string,
    subjectId: string,
    requestedBy: string,
  ): Promise<ErasureRequest> {
    const requestId = generateId('ers');
    const now = new Date().toISOString();

    // Create the erasure request
    await pool.query(
      `INSERT INTO erasure_requests (
        request_id, org_id, subject_id, requested_by, requested_at, status
      ) VALUES ($1, $2, $3, $4, $5, 'processing')`,
      [requestId, orgId, subjectId, requestedBy, now],
    );

    try {
      // Look up the vault entry
      const vaultResult = await pool.query<{ pseudonym_token: string; erased_at: string | null }>(
        `SELECT pseudonym_token, erased_at FROM pii_vault WHERE org_id = $1 AND subject_id = $2`,
        [orgId, subjectId],
      );

      const vaultRow = vaultResult.rows[0];
      if (!vaultRow) {
        // No vault entry found -- mark as completed with 0 affected events
        await pool.query(
          `UPDATE erasure_requests
           SET status = 'completed', completed_at = $1, affected_events = 0
           WHERE request_id = $2`,
          [now, requestId],
        );
        return {
          request_id: requestId,
          org_id: orgId,
          subject_id: subjectId,
          requested_by: requestedBy,
          requested_at: now,
          completed_at: now,
          status: 'completed',
          affected_events: 0,
          error: null,
        };
      }

      if (vaultRow.erased_at) {
        await pool.query(
          `UPDATE erasure_requests
           SET status = 'completed', completed_at = $1, affected_events = 0
           WHERE request_id = $2`,
          [now, requestId],
        );
        return {
          request_id: requestId,
          org_id: orgId,
          subject_id: subjectId,
          requested_by: requestedBy,
          requested_at: now,
          completed_at: now,
          status: 'completed',
          affected_events: 0,
          error: null,
        };
      }

      const pseudonymToken = vaultRow.pseudonym_token;

      // Count affected events (events where from_address or to_address match the pseudonym)
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM verification_events
         WHERE org_id = $1
           AND (payment_from_address = $2 OR payment_to_address = $2)`,
        [orgId, pseudonymToken],
      );
      const affectedEvents = parseInt(countResult.rows[0]?.count ?? '0', 10);

      // Nullify the PII fields and mark as erased
      await pool.query(
        `UPDATE pii_vault
         SET pii_fields = 'null'::jsonb, erased_at = $1
         WHERE org_id = $2 AND subject_id = $3`,
        [now, orgId, subjectId],
      );

      // Mark erasure request as completed
      await pool.query(
        `UPDATE erasure_requests
         SET status = 'completed', completed_at = $1, affected_events = $2
         WHERE request_id = $3`,
        [now, affectedEvents, requestId],
      );

      return {
        request_id: requestId,
        org_id: orgId,
        subject_id: subjectId,
        requested_by: requestedBy,
        requested_at: now,
        completed_at: now,
        status: 'completed',
        affected_events: affectedEvents,
        error: null,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await pool.query(
        `UPDATE erasure_requests
         SET status = 'failed', error = $1
         WHERE request_id = $2`,
        [errorMessage, requestId],
      );
      return {
        request_id: requestId,
        org_id: orgId,
        subject_id: subjectId,
        requested_by: requestedBy,
        requested_at: now,
        completed_at: null,
        status: 'failed',
        affected_events: null,
        error: errorMessage,
      };
    }
  }
}
