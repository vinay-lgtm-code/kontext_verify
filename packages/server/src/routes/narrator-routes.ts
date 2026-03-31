// ============================================================================
// Kontext Server — Narrator Routes (/v1/evidence/:eventId/narrative, /v1/narratives/*)
// ============================================================================
// AI evidence narrative generation, review, and export endpoints.
// All routes require dashboardAuthMiddleware (applied via app.use in app.ts).

import { Hono } from 'hono';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { NarratorService, type Narrative } from '../narrator/narrator-service.js';
import { type TemplateName, TEMPLATES } from '../narrator/template-builder.js';
import { scopeClause, type Role } from '../auth/rbac.js';

const VALID_TEMPLATES = new Set(Object.keys(TEMPLATES));

export function createNarratorRoutes(
  getPool: () => Pool | null,
  getRedis: () => Redis | null,
) {
  const router = new Hono();
  const service = new NarratorService();

  function requirePool(): Pool {
    const pool = getPool();
    if (!pool) throw Object.assign(new Error('Database not configured'), { status: 503 });
    return pool;
  }

  // --------------------------------------------------------------------------
  // POST /v1/evidence/:eventId/narrative — Generate narrative for a single event
  // --------------------------------------------------------------------------
  router.post('/evidence/:eventId/narrative', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const userId = c.get('userId' as never) as string;
    const role = c.get('role' as never) as Role;
    const eventId = c.req.param('eventId');

    let body: { template?: string; force?: boolean };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    const template = body.template;
    if (!template || !VALID_TEMPLATES.has(template)) {
      return c.json({
        error: `Invalid template. Must be one of: ${[...VALID_TEMPLATES].join(', ')}`,
      }, 400);
    }

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    // Verify event visibility via RBAC scoping
    const scope = scopeClause(role, userId, 3);
    const { rows: eventRows } = await pool.query(
      `SELECT event_id FROM verification_events WHERE event_id = $1 AND org_id = $2 ${scope.sql}`,
      [eventId, orgId, ...scope.params],
    );
    if (!eventRows[0]) {
      return c.json({ error: 'Event not found or not accessible' }, 404);
    }

    try {
      const narrative = await service.narrateSingle(
        pool, orgId, eventId, template as TemplateName, userId, body.force ?? false,
      );
      return c.json(narrative, 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 500);
    }
  });

  // --------------------------------------------------------------------------
  // POST /v1/narratives/bulk — Bulk generate narratives
  // --------------------------------------------------------------------------
  router.post('/narratives/bulk', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const userId = c.get('userId' as never) as string;

    let body: { template?: string; filters?: Record<string, unknown> };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    const template = body.template;
    if (!template || !VALID_TEMPLATES.has(template)) {
      return c.json({
        error: `Invalid template. Must be one of: ${[...VALID_TEMPLATES].join(', ')}`,
      }, 400);
    }

    if (!body.filters || typeof body.filters !== 'object') {
      return c.json({ error: 'filters object is required' }, 400);
    }

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    try {
      const job = await service.narrateBulk(
        pool, getRedis(), orgId, body.filters, template as TemplateName, userId,
      );
      return c.json(
        { bulk_id: job.bulk_id, status: job.status, total_events: job.total_events },
        202,
      );
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  // --------------------------------------------------------------------------
  // GET /v1/narratives/bulk/:bulkId/progress — Bulk job progress
  // --------------------------------------------------------------------------
  router.get('/narratives/bulk/:bulkId/progress', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const bulkId = c.req.param('bulkId');

    // Try Redis first for real-time progress
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get(`kontext:bulk:${bulkId}`);
        if (cached) {
          const progress = JSON.parse(cached) as { completed: number; failed: number; total: number };
          return c.json({ bulk_id: bulkId, ...progress, source: 'cache' });
        }
      } catch {
        // Redis failure — fall through to DB
      }
    }

    // Fall back to DB
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const { rows } = await pool.query(
      `SELECT * FROM narrative_bulk_jobs WHERE bulk_id = $1 AND org_id = $2`,
      [bulkId, orgId],
    );
    if (!rows[0]) return c.json({ error: 'Bulk job not found' }, 404);

    return c.json(rows[0]);
  });

  // --------------------------------------------------------------------------
  // GET /v1/narratives/:narrativeId — Fetch a narrative
  // --------------------------------------------------------------------------
  router.get('/narratives/:narrativeId', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const narrativeId = c.req.param('narrativeId');

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const { rows } = await pool.query<Narrative>(
      `SELECT * FROM narratives WHERE narrative_id = $1 AND org_id = $2`,
      [narrativeId, orgId],
    );
    if (!rows[0]) return c.json({ error: 'Narrative not found' }, 404);

    return c.json(rows[0]);
  });

  // --------------------------------------------------------------------------
  // PATCH /v1/narratives/:narrativeId — Update editable fields only
  // --------------------------------------------------------------------------
  router.patch('/narratives/:narrativeId', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const narrativeId = c.req.param('narrativeId');

    let body: Record<string, unknown>;
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    // Only allow editing sections and analyst_notes — all evidence fields are LOCKED
    const allowedKeys = new Set(['sections', 'analyst_notes']);
    const invalidKeys = Object.keys(body).filter((k) => !allowedKeys.has(k));
    if (invalidKeys.length > 0) {
      return c.json({
        error: `Cannot modify locked fields: ${invalidKeys.join(', ')}. Only sections and analyst_notes are editable.`,
      }, 403);
    }

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    // Build dynamic UPDATE
    const sets: string[] = [];
    const params: unknown[] = [narrativeId, orgId];
    let idx = 3;

    if (body['sections'] !== undefined) {
      sets.push(`sections = $${idx}`);
      params.push(JSON.stringify(body['sections']));
      idx++;
    }
    if (body['analyst_notes'] !== undefined) {
      sets.push(`analyst_notes = $${idx}`);
      params.push(body['analyst_notes']);
      idx++;
    }

    if (sets.length === 0) {
      return c.json({ error: 'No editable fields provided' }, 400);
    }

    const { rows } = await pool.query<Narrative>(
      `UPDATE narratives SET ${sets.join(', ')} WHERE narrative_id = $1 AND org_id = $2 RETURNING *`,
      params,
    );
    if (!rows[0]) return c.json({ error: 'Narrative not found' }, 404);

    return c.json(rows[0]);
  });

  // --------------------------------------------------------------------------
  // POST /v1/narratives/:narrativeId/review — Submit review decision
  // --------------------------------------------------------------------------
  router.post('/narratives/:narrativeId/review', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const userId = c.get('userId' as never) as string;
    const narrativeId = c.req.param('narrativeId');

    let body: { decision?: string; notes?: string };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    if (!body.decision || !['approved', 'changes_requested'].includes(body.decision)) {
      return c.json({ error: "decision must be 'approved' or 'changes_requested'" }, 400);
    }

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const newStatus = body.decision === 'approved' ? 'approved' : 'reviewed';

    const { rows } = await pool.query<Narrative>(
      `UPDATE narratives
       SET status = $3, reviewed_by = $4, reviewed_at = now(), review_decision = $5,
           analyst_notes = COALESCE($6, analyst_notes)
       WHERE narrative_id = $1 AND org_id = $2
       RETURNING *`,
      [narrativeId, orgId, newStatus, userId, body.decision, body.notes ?? null],
    );
    if (!rows[0]) return c.json({ error: 'Narrative not found' }, 404);

    return c.json(rows[0]);
  });

  // --------------------------------------------------------------------------
  // POST /v1/narratives/:narrativeId/export — Export approved narrative as PDF
  // --------------------------------------------------------------------------
  router.post('/narratives/:narrativeId/export', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const narrativeId = c.req.param('narrativeId');

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const { rows } = await pool.query<Narrative>(
      `SELECT * FROM narratives WHERE narrative_id = $1 AND org_id = $2`,
      [narrativeId, orgId],
    );
    if (!rows[0]) return c.json({ error: 'Narrative not found' }, 404);

    if (rows[0].status !== 'approved') {
      return c.json(
        { error: 'Only approved narratives can be exported. Current status: ' + rows[0].status },
        403,
      );
    }

    const narrative = rows[0];

    // Render a simple text/markdown export (PDF rendering would require a library like puppeteer)
    // Return markdown with evidence metadata as a downloadable file
    const exportContent = [
      `# Compliance Narrative — ${TEMPLATES[narrative.template as TemplateName]?.displayName ?? narrative.template}`,
      '',
      `**Narrative ID:** ${narrative.narrative_id}`,
      `**Event ID:** ${narrative.event_id}`,
      `**Evidence Bundle:** ${narrative.evidence_bundle_id}`,
      `**Generated By:** ${narrative.generated_by}`,
      `**Generated At:** ${narrative.created_at}`,
      `**Reviewed By:** ${narrative.reviewed_by}`,
      `**Reviewed At:** ${narrative.reviewed_at}`,
      `**Review Decision:** ${narrative.review_decision}`,
      `**Digest Reference:** ${narrative.digest_reference}`,
      `**Chain Index:** ${narrative.chain_index_reference}`,
      '',
      '---',
      '',
      narrative.markdown,
      '',
      narrative.analyst_notes ? `## Analyst Notes\n\n${narrative.analyst_notes}` : '',
    ].join('\n');

    return c.text(exportContent, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="narrative-${narrative.narrative_id}.md"`,
    });
  });

  return router;
}
