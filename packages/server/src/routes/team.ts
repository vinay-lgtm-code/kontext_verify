// ============================================================================
// Kontext Server — Team Routes (/v1/team/* and /v1/events/:id/assign)
// ============================================================================
// GET    /v1/team/members                  [admin] list org members
// DELETE /v1/team/members/:userId          [admin] revoke member + their keys
// POST   /v1/team/api-keys                 [admin | staff-dev own] create key
// DELETE /v1/team/api-keys/:keyId          [admin | creator] revoke key
// GET    /v1/team/api-keys                 [admin: all | staff-dev: own only]
// POST   /v1/events/:eventId/assign        [admin] assign event to a user

import { Hono } from 'hono';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { requirePermission, requireRole, type Role } from '../auth/rbac.js';
import { createApiKey, revokeApiKey } from '../auth/keystore.js';

export function createTeamRoutes(getPool: () => Pool | null, getRedis: () => Redis | null) {
  const router = new Hono();

  function requirePool(): Pool {
    const pool = getPool();
    if (!pool) throw Object.assign(new Error('Database not configured'), { status: 503 });
    return pool;
  }

  // --------------------------------------------------------------------------
  // GET /v1/team/members — [admin] list org members with status
  // --------------------------------------------------------------------------
  router.get('/members', requireRole('admin'), async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const orgId = c.get('orgId' as never) as string;

    const { rows } = await pool.query<{
      user_id: string;
      email: string;
      role: string;
      status: string;
      created_at: string;
      joined_at: string | null;
    }>(
      `SELECT user_id, email, role, status, created_at, joined_at
       FROM org_users
       WHERE org_id = $1
       ORDER BY created_at DESC`,
      [orgId],
    );

    return c.json({ members: rows });
  });

  // --------------------------------------------------------------------------
  // DELETE /v1/team/members/:userId — [admin] revoke member + all their keys
  // --------------------------------------------------------------------------
  router.delete('/members/:userId', requireRole('admin'), async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const orgId = c.get('orgId' as never) as string;
    const targetUserId = c.req.param('userId');
    const requesterId = c.get('userId' as never) as string;

    if (targetUserId === requesterId) {
      return c.json({ error: 'Cannot revoke your own access' }, 400);
    }

    await pool.query(
      `UPDATE org_users SET status = 'revoked' WHERE user_id = $1 AND org_id = $2`,
      [targetUserId, orgId],
    );

    // Revoke all their API keys
    const { rows: keyRows } = await pool.query<{ api_key: string; key_hash: string | null }>(
      `UPDATE api_keys SET revoked_at = now(), active = false
       WHERE created_by = $1 AND org_id = $2 AND revoked_at IS NULL
       RETURNING api_key, key_hash`,
      [targetUserId, orgId],
    );

    // Bust Redis cache for each revoked key
    const redis = getRedis();
    if (redis) {
      for (const row of keyRows) {
        if (row.key_hash) {
          try {
            await redis.set(`kontext:key:${row.key_hash}`, 'revoked', 'EX', 60);
          } catch { /* ignore */ }
        }
      }
    }

    return c.json({ revoked: true, keysRevoked: keyRows.length });
  });

  // --------------------------------------------------------------------------
  // GET /v1/team/api-keys — list keys (admin: all; staff-dev: own only)
  // --------------------------------------------------------------------------
  router.get('/api-keys', requirePermission('manage:api-keys'), async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const orgId = c.get('orgId' as never) as string;
    const role = c.get('role' as never) as Role;
    const userId = c.get('userId' as never) as string;

    const isAdmin = role === 'admin';

    const { rows } = await pool.query<{
      api_key: string;
      label: string | null;
      role: string;
      key_prefix: string | null;
      agent_id: string | null;
      agent_name: string | null;
      created_by: string | null;
      created_at: string;
      last_used_at: string | null;
      revoked_at: string | null;
      active: boolean;
    }>(
      `SELECT api_key, label, role, key_prefix, agent_id, agent_name,
              created_by, created_at, last_used_at, revoked_at, active
       FROM api_keys
       WHERE org_id = $1
         ${isAdmin ? '' : 'AND created_by = $2'}
       ORDER BY created_at DESC`,
      isAdmin ? [orgId] : [orgId, userId],
    );

    // Never expose raw api_key column — return display info only
    const keys = rows.map((r) => ({
      keyId: r.api_key,
      label: r.label,
      role: r.role,
      keyPrefix: r.key_prefix ?? '••••',
      agentId: r.agent_id,
      agentName: r.agent_name,
      createdBy: r.created_by,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
      active: r.active,
      revokedAt: r.revoked_at,
    }));

    return c.json({ keys });
  });

  // --------------------------------------------------------------------------
  // POST /v1/team/api-keys — create a new API key
  // --------------------------------------------------------------------------
  router.post('/api-keys', requirePermission('manage:api-keys'), async (c) => {
    let body: {
      role?: string;
      label?: string;
      agentId?: string;
      agentName?: string;
      paymentRails?: string[];
    };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    const orgId = c.get('orgId' as never) as string;
    const requesterRole = c.get('role' as never) as Role;
    const userId = c.get('userId' as never) as string;

    const targetRole = (body.role as Role) ?? 'staff-dev';

    // staff-dev can only create keys for themselves (same role, no admin keys)
    if (requesterRole === 'staff-dev' && targetRole !== 'staff-dev') {
      return c.json({ error: 'staff-dev can only create staff-dev keys' }, 403);
    }
    if (targetRole === 'staff-risk') {
      return c.json({ error: 'staff-risk members cannot have API keys' }, 400);
    }

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const { rawKey, record } = await createApiKey(
      {
        orgId,
        createdBy: userId,
        role: targetRole,
        label: body.label,
        agentId: body.agentId,
        agentName: body.agentName,
        paymentRails: body.paymentRails,
      },
      pool,
    );

    return c.json(
      {
        // rawKey shown ONCE — store it now, never retrievable again
        apiKey: rawKey,
        keyId: record.keyId,
        keyPrefix: record.keyPrefix,
        role: record.role,
        agentId: record.agentId,
        agentName: record.agentName,
      },
      201,
    );
  });

  // --------------------------------------------------------------------------
  // DELETE /v1/team/api-keys/:keyId — revoke a key (admin or creator)
  // --------------------------------------------------------------------------
  router.delete('/api-keys/:keyId', requirePermission('manage:api-keys'), async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const orgId = c.get('orgId' as never) as string;
    const role = c.get('role' as never) as Role;
    const userId = c.get('userId' as never) as string;
    const keyId = c.req.param('keyId');

    // Verify ownership for non-admin
    if (role !== 'admin') {
      const { rows } = await pool.query<{ created_by: string | null }>(
        `SELECT created_by FROM api_keys WHERE api_key = $1 AND org_id = $2`,
        [keyId, orgId],
      );
      if (!rows[0] || rows[0].created_by !== userId) {
        return c.json({ error: 'You can only revoke your own API keys' }, 403);
      }
    }

    await revokeApiKey(keyId, orgId, pool, getRedis());
    return c.json({ revoked: true, keyId });
  });

  // --------------------------------------------------------------------------
  // POST /v1/events/:eventId/assign — [admin] assign event to a staff member
  // --------------------------------------------------------------------------
  router.post('/../events/:eventId/assign', requireRole('admin'), async (c) => {
    let body: { userId?: string };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    if (!body.userId) return c.json({ error: 'userId is required' }, 400);

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const orgId = c.get('orgId' as never) as string;
    const eventId = c.req.param('eventId');

    // Verify target user is in the same org
    const { rows: userRows } = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM org_users WHERE user_id = $1 AND org_id = $2 AND status = 'active'`,
      [body.userId, orgId],
    );
    if (!userRows[0]) return c.json({ error: 'User not found in organization' }, 404);

    const { rowCount } = await pool.query(
      `UPDATE verification_events
       SET assigned_to = $1
       WHERE event_id = $2 AND org_id = $3`,
      [body.userId, eventId, orgId],
    );

    if (!rowCount) return c.json({ error: 'Event not found' }, 404);
    return c.json({ assigned: true, eventId, assignedTo: body.userId });
  });

  return router;
}
