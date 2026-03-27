// ============================================================================
// Kontext Server — GDPR Routes (/v1/gdpr/*)
// ============================================================================
// DELETE /v1/gdpr/erasure/:subjectId   [admin] Right to erasure
// GET    /v1/gdpr/sar/:subjectId       [admin] Subject Access Request

import { Hono } from 'hono';
import type { Pool } from 'pg';
import { requireRole } from '../auth/rbac.js';
import type { PIIVault } from '../pii/vault.js';

export function createGdprRoutes(
  getPool: () => Pool | null,
  getVault: () => PIIVault | null,
) {
  const router = new Hono();

  function requirePool(): Pool {
    const pool = getPool();
    if (!pool) throw Object.assign(new Error('Database not configured'), { status: 503 });
    return pool;
  }

  function requireVault(): PIIVault {
    const vault = getVault();
    if (!vault) throw Object.assign(new Error('PII vault not configured — set PII_ENCRYPTION_KEY'), { status: 503 });
    return vault;
  }

  // --------------------------------------------------------------------------
  // DELETE /v1/gdpr/erasure/:subjectId — [admin] Right to erasure (GDPR Art. 17)
  // --------------------------------------------------------------------------
  router.delete('/erasure/:subjectId', requireRole('admin'), async (c) => {
    let pool: Pool;
    let vault: PIIVault;
    try {
      pool = requirePool();
      vault = requireVault();
    } catch (err) {
      const e = err as Error & { status?: number };
      return c.json({ error: e.message }, (e.status as 503) ?? 500);
    }

    const orgId = c.get('orgId' as never) as string;
    const userId = c.get('userId' as never) as string;
    const subjectId = c.req.param('subjectId') ?? '';

    if (!orgId) {
      return c.json({ error: 'Organization context required' }, 400);
    }

    try {
      const result = await vault.erase(pool, orgId, subjectId, userId);

      // Log the erasure event itself into the digest chain (proves THAT erasure
      // happened without revealing WHAT was erased)
      try {
        await pool.query(
          `INSERT INTO erasure_requests (request_id, org_id, subject_id, requested_by, status, affected_events, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (request_id) DO NOTHING`,
          [
            result.request_id,
            orgId,
            subjectId,
            userId,
            result.status,
            result.affected_events,
            result.completed_at,
          ],
        );
      } catch {
        // Erasure request was already inserted by vault.erase() — ignore duplicate
      }

      return c.json({
        request_id: result.request_id,
        status: result.status,
        affected_events: result.affected_events,
        completed_at: result.completed_at,
        error: result.error,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Erasure failed: ${message}` }, 500);
    }
  });

  // --------------------------------------------------------------------------
  // GET /v1/gdpr/sar/:subjectId — [admin] Subject Access Request (GDPR Art. 15)
  // --------------------------------------------------------------------------
  router.get('/sar/:subjectId', requireRole('admin'), async (c) => {
    let pool: Pool;
    let vault: PIIVault;
    try {
      pool = requirePool();
      vault = requireVault();
    } catch (err) {
      const e = err as Error & { status?: number };
      return c.json({ error: e.message }, (e.status as 503) ?? 500);
    }

    const orgId = c.get('orgId' as never) as string;
    const subjectId = c.req.param('subjectId') ?? '';

    if (!orgId) {
      return c.json({ error: 'Organization context required' }, 400);
    }

    // Look up the vault entry for this subject
    const vaultResult = await pool.query<{
      pseudonym_token: string;
      subject_type: string;
      pii_fields: string;
      erased_at: string | null;
      created_at: string;
    }>(
      `SELECT pseudonym_token, subject_type, pii_fields, erased_at, created_at
       FROM pii_vault
       WHERE org_id = $1 AND subject_id = $2`,
      [orgId, subjectId],
    );

    const vaultRow = vaultResult.rows[0];
    if (!vaultRow) {
      return c.json({ error: 'Subject not found in PII vault' }, 404);
    }

    // Decrypt PII if not erased
    let piiData: Record<string, unknown> | null = null;
    if (!vaultRow.erased_at) {
      piiData = await vault.resolve(pool, vaultRow.pseudonym_token);
    }

    // Find all verification events related to this subject (via pseudonym token)
    const eventsResult = await pool.query<{
      event_id: string;
      workflow: string;
      agent_id: string;
      payment_chain: string;
      payment_amount: number;
      payment_token: string;
      payment_from_address: string;
      payment_to_address: string;
      status: string;
      created_at: string;
    }>(
      `SELECT event_id, workflow, agent_id, payment_chain, payment_amount,
              payment_token, payment_from_address, payment_to_address,
              status, created_at
       FROM verification_events
       WHERE org_id = $1
         AND (payment_from_address = $2 OR payment_to_address = $2)
       ORDER BY created_at DESC`,
      [orgId, vaultRow.pseudonym_token],
    );

    // Find erasure requests for this subject
    const erasureResult = await pool.query<{
      request_id: string;
      requested_by: string;
      requested_at: string;
      completed_at: string | null;
      status: string;
      affected_events: number | null;
    }>(
      `SELECT request_id, requested_by, requested_at, completed_at, status, affected_events
       FROM erasure_requests
       WHERE org_id = $1 AND subject_id = $2
       ORDER BY requested_at DESC`,
      [orgId, subjectId],
    );

    return c.json({
      subject_id: subjectId,
      subject_type: vaultRow.subject_type,
      pseudonym_token: vaultRow.pseudonym_token,
      pii_data: piiData,
      erased: !!vaultRow.erased_at,
      erased_at: vaultRow.erased_at,
      vault_created_at: vaultRow.created_at,
      related_events: eventsResult.rows,
      erasure_requests: erasureResult.rows,
      exported_at: new Date().toISOString(),
    });
  });

  return router;
}
