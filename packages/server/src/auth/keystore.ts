// ============================================================================
// Kontext Server — API Key Lookup (Redis cache → PostgreSQL fallback)
// ============================================================================
// Lookup flow: SHA-256 incoming key → Redis (60s TTL) → PostgreSQL → null
// Revoked keys (revoked_at IS NOT NULL) return null immediately.
// staff-risk role cannot be assigned to an API key.

import { createHash, randomBytes } from 'crypto';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Role } from './rbac.js';

export interface KeyRecord {
  keyId: string;         // api_keys.api_key (PK — display/management only)
  orgId: string;
  userId: string | null; // created_by user_id (null for legacy keys)
  role: Role;
  permissions: string[];
  paymentRails: string[];
  agentId?: string;
  agentName?: string;
  keyPrefix: string;
}

export interface CreateKeyInput {
  orgId: string;
  createdBy: string;     // user_id of creator
  role: Role;
  label?: string;
  agentId?: string;
  agentName?: string;
  paymentRails?: string[];
}

const CACHE_TTL = 60; // seconds
const CACHE_PREFIX = 'kontext:key:';

export function sha256hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function cacheKey(keyHash: string): string {
  return `${CACHE_PREFIX}${keyHash}`;
}

/**
 * Look up an API key. Returns null if not found, revoked, or key belongs to staff-risk.
 * Lookup order: Redis (60s TTL) → PostgreSQL.
 */
export async function lookupApiKey(
  rawKey: string,
  pool: Pool,
  redis: Redis | null,
): Promise<KeyRecord | null> {
  const hash = sha256hex(rawKey);

  // 1. Redis cache
  if (redis) {
    try {
      const cached = await redis.get(cacheKey(hash));
      if (cached === 'revoked') return null;
      if (cached) {
        const record = JSON.parse(cached) as KeyRecord;
        return record;
      }
    } catch {
      // Cache miss — continue to DB
    }
  }

  // 2. PostgreSQL lookup by key_hash (for new keys) or raw key (for legacy backfilled keys)
  const { rows } = await pool.query<{
    api_key: string;
    org_id: string;
    role: string;
    permissions: string[];
    payment_rails: string[];
    agent_id: string | null;
    agent_name: string | null;
    created_by: string | null;
    key_prefix: string | null;
    revoked_at: string | null;
    active: boolean;
  }>(
    `SELECT api_key, org_id, role, permissions, payment_rails,
            agent_id, agent_name, created_by, key_prefix, revoked_at, active
     FROM api_keys
     WHERE (key_hash = $1 OR api_key = $2)
       AND active = true
     LIMIT 1`,
    [hash, rawKey],
  );

  const row = rows[0];
  if (!row || row.revoked_at !== null || !row.active) {
    // Cache negative result briefly (10s) to reduce DB load
    if (redis) {
      try { await redis.set(cacheKey(hash), 'revoked', 'EX', 10); } catch { /* ignore */ }
    }
    return null;
  }

  const record: KeyRecord = {
    keyId: row.api_key,
    orgId: row.org_id,
    userId: row.created_by,
    role: (row.role as Role) ?? 'staff-dev',
    permissions: row.permissions ?? [],
    paymentRails: row.payment_rails ?? [],
    agentId: row.agent_id ?? undefined,
    agentName: row.agent_name ?? undefined,
    keyPrefix: row.key_prefix ?? rawKey.slice(0, 12),
  };

  // Cache positive result
  if (redis) {
    try {
      await redis.set(cacheKey(hash), JSON.stringify(record), 'EX', CACHE_TTL);
    } catch { /* ignore */ }
  }

  return record;
}

/**
 * Create a new API key. staff-risk role is rejected (they have no API key access).
 * Returns the new raw key (shown once to user) plus the stored KeyRecord.
 */
export async function createApiKey(
  input: CreateKeyInput,
  pool: Pool,
): Promise<{ rawKey: string; record: KeyRecord }> {
  if (input.role === 'staff-risk') {
    throw Object.assign(
      new Error('staff-risk members cannot have API keys'),
      { status: 400 },
    );
  }

  const rawKey = `sk_live_${randomBytes(24).toString('base64url')}`;
  const hash = sha256hex(rawKey);
  const prefix = rawKey.slice(0, 12);
  const keyId = `key_${Date.now().toString(36).toUpperCase()}_${randomBytes(6).toString('base64url')}`;

  await pool.query(
    `INSERT INTO api_keys
       (api_key, org_id, label, plan, active, key_hash, key_prefix,
        role, permissions, payment_rails, agent_id, agent_name, created_by)
     VALUES ($1, $2, $3, 'startup', true, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      keyId,
      input.orgId,
      input.label ?? null,
      hash,
      prefix,
      input.role,
      [],
      input.paymentRails ?? [],
      input.agentId ?? null,
      input.agentName ?? null,
      input.createdBy,
    ],
  );

  const record: KeyRecord = {
    keyId,
    orgId: input.orgId,
    userId: input.createdBy,
    role: input.role,
    permissions: [],
    paymentRails: input.paymentRails ?? [],
    agentId: input.agentId,
    agentName: input.agentName,
    keyPrefix: prefix,
  };

  return { rawKey, record };
}

/**
 * Revoke an API key. Sets revoked_at and busts Redis cache.
 */
export async function revokeApiKey(
  keyId: string,
  orgId: string,
  pool: Pool,
  redis: Redis | null,
): Promise<void> {
  const { rows } = await pool.query<{ key_hash: string | null }>(
    `UPDATE api_keys
     SET revoked_at = now(), active = false
     WHERE api_key = $1 AND org_id = $2 AND revoked_at IS NULL
     RETURNING key_hash`,
    [keyId, orgId],
  );

  // Bust cache
  if (redis && rows[0]?.key_hash) {
    try {
      await redis.set(cacheKey(rows[0].key_hash), 'revoked', 'EX', CACHE_TTL);
    } catch { /* ignore */ }
  }
}
