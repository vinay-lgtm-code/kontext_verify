// ============================================================================
// Kontext Server — Export Routes: Examiner-Ready Evidence Export Engine
// ============================================================================
// 3 routes: single-event export, bulk export, progress tracking.
// All routes require dashboardAuthMiddleware (applied in app.ts).

import { Hono } from 'hono';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { getTemplate, TEMPLATE_NAMES, type EvidenceRow } from '../export/templates.js';
import { renderCSV } from '../export/csv-renderer.js';
import { renderEvidencePDF } from '../export/pdf-renderer.js';
import { runBulkExport, getProgress, type BulkExportFilters } from '../export/bulk-worker.js';

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const random = randomBytes(10).toString('base64url').toUpperCase().slice(0, 16);
  return `${prefix}_${timestamp}${random}`;
}

const VALID_FORMATS = ['json', 'csv', 'pdf'];

export function createExportRoutes(
  getPool: () => Pool | null,
  getRedis: () => Redis | null,
) {
  const router = new Hono();

  function requirePool(): Pool {
    const pool = getPool();
    if (!pool) {
      throw Object.assign(new Error('Database not configured'), { status: 503 });
    }
    return pool;
  }

  // ========================================================================
  // GET /verification-events/:id/export — Single event export
  // ========================================================================

  router.get('/verification-events/:id/export', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const eventId = c.req.param('id');
    const templateName = c.req.query('template') ?? 'examiner';
    const format = c.req.query('format') ?? 'json';

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    // Validate template
    const template = getTemplate(templateName);
    if (!template) {
      return c.json({
        error: `Unknown template: ${templateName}. Valid templates: ${TEMPLATE_NAMES.join(', ')}`,
      }, 400);
    }

    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      return c.json({
        error: `Unknown format: ${format}. Valid formats: ${VALID_FORMATS.join(', ')}`,
      }, 400);
    }

    // Query event + evidence bundle
    const result = await pool.query(
      `SELECT
        ve.*,
        eb.intent_hash_algorithm,
        eb.intent_hash_value,
        eb.intent_hash_canonical_fields,
        eb.authorization_type,
        eb.authorized,
        eb.authorizer,
        eb.authorization_scope,
        eb.evaluated_at,
        eb.policy_trace,
        eb.screening_provider AS eb_screening_provider,
        eb.screening_result,
        eb.screened_entity,
        eb.screening_screened_at,
        eb.exec_tx_hash,
        eb.exec_chain,
        eb.exec_observed_onchain,
        eb.exec_first_seen_at,
        eb.exec_confirmation_status,
        eb.record_hash,
        eb.previous_record_hash,
        eb.chain_index,
        eb.render_headline,
        eb.render_subheadline,
        eb.render_risk_label
      FROM verification_events ve
      JOIN evidence_bundles eb ON ve.evidence_bundle_id = eb.evidence_bundle_id
      WHERE ve.event_id = $1 AND ve.org_id = $2`,
      [eventId, orgId],
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const row = result.rows[0] as EvidenceRow;
    const transformed = template.transformRow(row);

    // Render by format
    if (format === 'csv') {
      const buffer = renderCSV([transformed], template.columns);
      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', `attachment; filename="kontext-${eventId}-${templateName}.csv"`);
      c.header('Content-Length', String(buffer.length));
      return c.body(buffer.toString('utf-8'));
    }

    if (format === 'pdf') {
      // Get org name for PDF header
      const orgResult = await pool.query<{ org_name: string }>(
        'SELECT org_name FROM orgs WHERE org_id = $1',
        [orgId],
      );
      const orgName = orgResult.rows[0]?.org_name ?? orgId;

      // Get digest chain summary
      let digestSummary = null;
      try {
        const chainResult = await pool.query<{ terminal_digest: string; chain_length: string }>(
          'SELECT terminal_digest, chain_length FROM digest_chain_state WHERE org_id = $1',
          [orgId],
        );
        if (chainResult.rows.length > 0) {
          const chainRow = chainResult.rows[0]!;
          const genesisResult = await pool.query<{ record_hash: string }>(
            'SELECT record_hash FROM evidence_bundles WHERE org_id = $1 AND chain_index = 0',
            [orgId],
          );
          digestSummary = {
            genesisHash: genesisResult.rows[0]?.record_hash ?? 'N/A',
            terminalDigest: chainRow.terminal_digest,
            chainLength: parseInt(chainRow.chain_length, 10),
            verified: true,
          };
        }
      } catch {
        // Non-fatal — skip digest summary
      }

      const buffer = await renderEvidencePDF([transformed], templateName, orgName, digestSummary);
      c.header('Content-Type', 'application/pdf');
      c.header('Content-Disposition', `attachment; filename="kontext-${eventId}-${templateName}.pdf"`);
      c.header('Content-Length', String(buffer.length));
      return c.body(buffer.toString('binary'));
    }

    // JSON (default)
    return c.json({
      event_id: eventId,
      template: templateName,
      format: 'json',
      data: transformed,
      exported_at: new Date().toISOString(),
    });
  });

  // ========================================================================
  // POST /exports/bulk — Kick off async bulk export
  // ========================================================================

  router.post('/exports/bulk', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const userId = (c.get('userId' as never) as string) ?? 'api';

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    let body: {
      template?: string;
      format?: string;
      filters?: BulkExportFilters;
    };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const templateName = body.template ?? 'examiner';
    const format = body.format ?? 'json';
    const filters: BulkExportFilters = body.filters ?? {};

    // Validate template
    if (!getTemplate(templateName)) {
      return c.json({
        error: `Unknown template: ${templateName}. Valid templates: ${TEMPLATE_NAMES.join(', ')}`,
      }, 400);
    }

    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      return c.json({
        error: `Unknown format: ${format}. Valid formats: ${VALID_FORMATS.join(', ')}`,
      }, 400);
    }

    // Estimate event count for the response
    const conditions: string[] = ['org_id = $1'];
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (filters.date_from) { conditions.push(`created_at >= $${paramIndex}`); params.push(filters.date_from); paramIndex++; }
    if (filters.date_to) { conditions.push(`created_at <= $${paramIndex}`); params.push(filters.date_to); paramIndex++; }
    if (filters.status) { conditions.push(`status = $${paramIndex}`); params.push(filters.status); paramIndex++; }
    if (filters.agent_id) { conditions.push(`agent_id = $${paramIndex}`); params.push(filters.agent_id); paramIndex++; }
    if (filters.chain) { conditions.push(`payment_chain = $${paramIndex}`); params.push(filters.chain); paramIndex++; }

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM verification_events WHERE ${conditions.join(' AND ')}`,
      params,
    );
    const estimatedEvents = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Create export record
    const exportId = generateId('exp');
    const dateFrom = filters.date_from ?? new Date(Date.now() - 30 * 86400000).toISOString();
    const dateTo = filters.date_to ?? new Date().toISOString();

    await pool.query(
      `INSERT INTO audit_exports
         (export_id, org_id, requested_by, format, template, date_range_from, date_range_to, event_count, status, progress_pct)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing', 0)`,
      [exportId, orgId, userId, format, templateName, dateFrom, dateTo, estimatedEvents],
    );

    // Kick off async worker (fire-and-forget)
    const redis = getRedis();
    runBulkExport(pool, redis, exportId, orgId, templateName, format, filters).catch((err) => {
      console.error(`[Export] Background worker crashed for ${exportId}:`, (err as Error).message);
    });

    return c.json({
      export_id: exportId,
      status: 'processing',
      estimated_events: estimatedEvents,
      template: templateName,
      format,
    }, 202);
  });

  // ========================================================================
  // GET /exports/:id/progress — Check export progress
  // ========================================================================

  router.get('/exports/:id/progress', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const exportId = c.req.param('id');

    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const redis = getRedis();

    // Try Redis first (fast path)
    const cachedProgress = await getProgress(redis, exportId);
    if (cachedProgress) {
      return c.json({
        export_id: exportId,
        status: cachedProgress.status,
        progress_pct: cachedProgress.progress_pct,
        download_url: cachedProgress.download_url ?? null,
        error: cachedProgress.error ?? null,
      });
    }

    // Fall back to DB
    const result = await pool.query(
      `SELECT export_id, status, progress_pct, download_url, error, gcs_path, file_size_bytes, event_count, completed_at
       FROM audit_exports
       WHERE export_id = $1 AND org_id = $2`,
      [exportId, orgId],
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Export not found' }, 404);
    }

    const row = result.rows[0] as Record<string, unknown>;
    return c.json({
      export_id: row['export_id'],
      status: row['status'],
      progress_pct: row['progress_pct'] ?? 0,
      download_url: row['download_url'] ?? null,
      error: row['error'] ?? null,
      file_size_bytes: row['file_size_bytes'] ?? null,
      event_count: row['event_count'] ?? null,
      completed_at: row['completed_at'] ?? null,
    });
  });

  return router;
}
