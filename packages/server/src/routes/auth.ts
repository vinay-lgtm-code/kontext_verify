// ============================================================================
// Kontext Server — Auth Routes (/v1/auth/*)
// ============================================================================
// POST /v1/auth/token           — raw API key → { accessToken, refreshToken }
// POST /v1/auth/refresh         — refresh token → new access token
// POST /v1/auth/invite          — [admin] create invite → { inviteUrl }
// GET  /v1/auth/invite/:token   — redeem invite → { accessToken, refreshToken, role }
// POST /v1/auth/revoke          — revoke current session

import { Hono } from 'hono';
import { randomBytes } from 'crypto';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { lookupApiKey } from '../auth/keystore.js';
import { signTokens, verifyToken, REFRESH_TTL_SECONDS } from '../auth/jwt.js';
import { requireRole } from '../auth/rbac.js';

function generateId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const rand = randomBytes(8).toString('base64url').toUpperCase().slice(0, 12);
  return `${prefix}_${ts}${rand}`;
}

export function createAuthRoutes(getPool: () => Pool | null, getRedis: () => Redis | null) {
  const router = new Hono();

  function requirePool(): Pool {
    const pool = getPool();
    if (!pool) throw Object.assign(new Error('Database not configured'), { status: 503 });
    return pool;
  }

  // --------------------------------------------------------------------------
  // POST /v1/auth/token — exchange raw API key for JWT pair
  // --------------------------------------------------------------------------
  router.post('/token', async (c) => {
    let body: { apiKey?: string };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    if (!body.apiKey || typeof body.apiKey !== 'string') {
      return c.json({ error: 'apiKey is required' }, 400);
    }

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const record = await lookupApiKey(body.apiKey, pool, getRedis());
    if (!record) return c.json({ error: 'Invalid or revoked API key' }, 401);

    // Resolve user_id: use created_by if set, otherwise use keyId as fallback userId
    const userId = record.userId ?? record.keyId;

    const tokens = await signTokens({ sub: userId, orgId: record.orgId, role: record.role });

    // Record session for revocation tracking
    try {
      const { payload } = await import('jose').then(({ decodeJwt }) => ({
        payload: decodeJwt(tokens.accessToken),
      }));
      await pool.query(
        `INSERT INTO sessions (jti, user_id, org_id, expires_at)
         VALUES ($1, $2, $3, now() + interval '${REFRESH_TTL_SECONDS} seconds')
         ON CONFLICT (jti) DO NOTHING`,
        [payload['jti'], userId, record.orgId],
      );
    } catch { /* session recording is non-critical */ }

    return c.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      role: record.role,
      orgId: record.orgId,
    });
  });

  // --------------------------------------------------------------------------
  // POST /v1/auth/refresh — exchange refresh token for new access token
  // --------------------------------------------------------------------------
  router.post('/refresh', async (c) => {
    let body: { refreshToken?: string };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    if (!body.refreshToken) return c.json({ error: 'refreshToken is required' }, 400);

    const payload = await verifyToken(body.refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return c.json({ error: 'Invalid or expired refresh token' }, 401);
    }

    // Check session not revoked
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const { rows } = await pool.query<{ revoked_at: string | null }>(
      `SELECT revoked_at FROM sessions WHERE jti = $1`,
      [payload.jti],
    );
    if (rows[0]?.revoked_at) return c.json({ error: 'Session has been revoked' }, 401);

    const tokens = await signTokens({ sub: payload.sub, orgId: payload.orgId, role: payload.role });
    return c.json({ accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
  });

  // --------------------------------------------------------------------------
  // POST /v1/auth/invite — [admin] create an invite link
  // --------------------------------------------------------------------------
  router.post('/invite', requireRole('admin'), async (c) => {
    let body: { email?: string; role?: string };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    const { email, role } = body;
    if (!email || !role) return c.json({ error: 'email and role are required' }, 400);
    if (!['admin', 'staff-dev', 'staff-risk'].includes(role)) {
      return c.json({ error: 'role must be admin, staff-dev, or staff-risk' }, 400);
    }

    const orgId = c.get('orgId' as never) as string;
    const invitedBy = c.get('userId' as never) as string;
    if (!orgId || !invitedBy) return c.json({ error: 'Not authenticated' }, 401);

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const inviteId = generateId('inv');
    const token = randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO invites (invite_id, org_id, email, role, token, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [inviteId, orgId, email.toLowerCase(), role, token, invitedBy],
    );

    const appUrl = process.env['KONTEXT_APP_URL'] ?? 'https://getkontext.com';
    const inviteUrl = `${appUrl}/join?token=${token}`;

    return c.json({ inviteId, inviteUrl, email, role, expiresIn: '72 hours' }, 201);
  });

  // --------------------------------------------------------------------------
  // GET /v1/auth/invite/:token — redeem invite, activate user, issue tokens
  // --------------------------------------------------------------------------
  router.get('/invite/:token', async (c) => {
    const token = c.req.param('token');
    if (!token) return c.json({ error: 'Token is required' }, 400);

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const { rows: inviteRows } = await pool.query<{
      invite_id: string;
      org_id: string;
      email: string;
      role: string;
      invited_by: string;
      status: string;
      expires_at: string;
    }>(
      `SELECT invite_id, org_id, email, role, invited_by, status, expires_at
       FROM invites WHERE token = $1`,
      [token],
    );

    const invite = inviteRows[0];
    if (!invite) return c.json({ error: 'Invalid invite token' }, 404);
    if (invite.status !== 'pending') return c.json({ error: 'Invite already used or expired' }, 410);
    if (new Date(invite.expires_at) < new Date()) {
      await pool.query(`UPDATE invites SET status = 'expired' WHERE invite_id = $1`, [invite.invite_id]);
      return c.json({ error: 'Invite has expired' }, 410);
    }

    // Upsert org_users row
    const userId = generateId('usr');
    await pool.query(
      `INSERT INTO org_users (user_id, org_id, email, role, permissions, status, invited_by, invited_at, joined_at)
       VALUES ($1, $2, $3, $4, '{}', 'active', $5, now(), now())
       ON CONFLICT (org_id, email) DO UPDATE
         SET role = EXCLUDED.role, status = 'active', joined_at = now()`,
      [userId, invite.org_id, invite.email, invite.role, invite.invited_by],
    );

    // Resolve actual user_id (may differ if row existed)
    const { rows: userRows } = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM org_users WHERE org_id = $1 AND email = $2`,
      [invite.org_id, invite.email],
    );
    const resolvedUserId = userRows[0]?.user_id ?? userId;

    // Mark invite accepted
    await pool.query(
      `UPDATE invites SET status = 'accepted', accepted_at = now() WHERE invite_id = $1`,
      [invite.invite_id],
    );

    const tokens = await signTokens({
      sub: resolvedUserId,
      orgId: invite.org_id,
      role: invite.role as import('../auth/rbac.js').Role,
    });

    return c.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      role: invite.role,
      orgId: invite.org_id,
      email: invite.email,
    });
  });

  // --------------------------------------------------------------------------
  // POST /v1/auth/revoke — revoke current session
  // --------------------------------------------------------------------------
  router.post('/revoke', async (c) => {
    const jti = c.get('jti' as never) as string | undefined;
    if (!jti) return c.json({ error: 'No session to revoke' }, 400);

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    await pool.query(
      `UPDATE sessions SET revoked_at = now() WHERE jti = $1`,
      [jti],
    );

    return c.json({ revoked: true });
  });

  return router;
}
