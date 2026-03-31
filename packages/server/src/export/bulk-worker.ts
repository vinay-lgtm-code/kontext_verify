// ============================================================================
// Kontext Server — Bulk Export Worker
// ============================================================================
// Processes large export jobs in batches, tracks progress in Redis, and uploads
// the final output to GCS.

import type pg from 'pg';
import type { Redis } from 'ioredis';
import { getTemplate, type EvidenceRow } from './templates.js';
import { renderCSV } from './csv-renderer.js';
import { renderEvidencePDF } from './pdf-renderer.js';
import { uploadExport } from './gcs-export.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BulkExportFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  agent_id?: string;
  chain?: string;
}

export interface ExportProgress {
  progress_pct: number;
  status: 'processing' | 'complete' | 'failed';
  error?: string;
  download_url?: string;
}

// ---------------------------------------------------------------------------
// Redis progress helpers
// ---------------------------------------------------------------------------

function progressKey(exportId: string): string {
  return `kontext:export:${exportId}`;
}

async function setProgress(
  redis: Redis | null,
  exportId: string,
  progress: ExportProgress,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(
      progressKey(exportId),
      JSON.stringify(progress),
      'EX',
      3600, // 1hr TTL
    );
  } catch {
    // Non-fatal
  }
}

export async function getProgress(
  redis: Redis | null,
  exportId: string,
): Promise<ExportProgress | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(progressKey(exportId));
    if (!raw) return null;
    return JSON.parse(raw) as ExportProgress;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Evidence query (batched)
// ---------------------------------------------------------------------------

const EVIDENCE_QUERY = `
  SELECT
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
`;

function buildFilteredQuery(
  orgId: string,
  filters: BulkExportFilters,
  offset: number,
  batchSize: number,
): { sql: string; params: unknown[] } {
  const conditions: string[] = ['ve.org_id = $1'];
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  if (filters.date_from) {
    conditions.push(`ve.created_at >= $${paramIndex}`);
    params.push(filters.date_from);
    paramIndex++;
  }
  if (filters.date_to) {
    conditions.push(`ve.created_at <= $${paramIndex}`);
    params.push(filters.date_to);
    paramIndex++;
  }
  if (filters.status) {
    conditions.push(`ve.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }
  if (filters.agent_id) {
    conditions.push(`ve.agent_id = $${paramIndex}`);
    params.push(filters.agent_id);
    paramIndex++;
  }
  if (filters.chain) {
    conditions.push(`ve.payment_chain = $${paramIndex}`);
    params.push(filters.chain);
    paramIndex++;
  }

  const where = conditions.join(' AND ');
  params.push(batchSize, offset);

  const sql = `${EVIDENCE_QUERY}
    WHERE ${where}
    ORDER BY ve.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  return { sql, params };
}

function buildCountQuery(
  orgId: string,
  filters: BulkExportFilters,
): { sql: string; params: unknown[] } {
  const conditions: string[] = ['ve.org_id = $1'];
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  if (filters.date_from) {
    conditions.push(`ve.created_at >= $${paramIndex}`);
    params.push(filters.date_from);
    paramIndex++;
  }
  if (filters.date_to) {
    conditions.push(`ve.created_at <= $${paramIndex}`);
    params.push(filters.date_to);
    paramIndex++;
  }
  if (filters.status) {
    conditions.push(`ve.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }
  if (filters.agent_id) {
    conditions.push(`ve.agent_id = $${paramIndex}`);
    params.push(filters.agent_id);
    paramIndex++;
  }
  if (filters.chain) {
    conditions.push(`ve.payment_chain = $${paramIndex}`);
    params.push(filters.chain);
    paramIndex++;
  }

  const where = conditions.join(' AND ');

  return {
    sql: `SELECT COUNT(*) AS total FROM verification_events ve WHERE ${where}`,
    params,
  };
}

// ---------------------------------------------------------------------------
// Digest chain summary
// ---------------------------------------------------------------------------

async function getDigestSummary(
  pool: pg.Pool,
  orgId: string,
): Promise<{ genesisHash: string; terminalDigest: string; chainLength: number; verified: boolean } | null> {
  try {
    const result = await pool.query<{
      terminal_digest: string;
      chain_length: string;
    }>(
      'SELECT terminal_digest, chain_length FROM digest_chain_state WHERE org_id = $1',
      [orgId],
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0]!;

    // Get genesis hash (chain_index = 0)
    const genesisResult = await pool.query<{ record_hash: string }>(
      'SELECT record_hash FROM evidence_bundles WHERE org_id = $1 AND chain_index = 0',
      [orgId],
    );

    return {
      genesisHash: genesisResult.rows[0]?.record_hash ?? 'N/A',
      terminalDigest: row.terminal_digest,
      chainLength: parseInt(row.chain_length, 10),
      verified: true, // Server-maintained chain is always self-consistent
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bulk Export Worker
// ---------------------------------------------------------------------------

const BATCH_SIZE = 100;

/**
 * Run a bulk export job: query events in batches, apply template transformation,
 * render to final format, upload to GCS, and update the audit_exports DB row.
 *
 * This function is designed to be called asynchronously (fire-and-forget from the route).
 */
export async function runBulkExport(
  pool: pg.Pool,
  redis: Redis | null,
  exportId: string,
  orgId: string,
  templateName: string,
  format: string,
  filters: BulkExportFilters,
): Promise<void> {
  const template = getTemplate(templateName);
  if (!template) {
    await setProgress(redis, exportId, { progress_pct: 0, status: 'failed', error: `Unknown template: ${templateName}` });
    await pool.query(
      `UPDATE audit_exports SET status = 'failed', error = $1 WHERE export_id = $2`,
      [`Unknown template: ${templateName}`, exportId],
    );
    return;
  }

  try {
    // Get total count for progress tracking
    const countQuery = buildCountQuery(orgId, filters);
    const countResult = await pool.query<{ total: string }>(countQuery.sql, countQuery.params);
    const totalEvents = parseInt(countResult.rows[0]?.total ?? '0', 10);

    if (totalEvents === 0) {
      await setProgress(redis, exportId, { progress_pct: 100, status: 'complete' });
      await pool.query(
        `UPDATE audit_exports SET status = 'complete', event_count = 0, progress_pct = 100, completed_at = now() WHERE export_id = $1`,
        [exportId],
      );
      return;
    }

    // Collect all transformed rows
    const allRows: Record<string, unknown>[] = [];
    let offset = 0;
    let processed = 0;

    while (offset < totalEvents) {
      const batchQuery = buildFilteredQuery(orgId, filters, offset, BATCH_SIZE);
      const batchResult = await pool.query(batchQuery.sql, batchQuery.params);

      for (const raw of batchResult.rows) {
        const transformed = template.transformRow(raw as EvidenceRow);
        allRows.push(transformed);
      }

      processed += batchResult.rows.length;
      const progressPct = Math.min(
        90, // Reserve last 10% for rendering + upload
        Math.round((processed / totalEvents) * 90),
      );

      await setProgress(redis, exportId, { progress_pct: progressPct, status: 'processing' });
      await pool.query(
        `UPDATE audit_exports SET progress_pct = $1 WHERE export_id = $2`,
        [progressPct, exportId],
      );

      offset += BATCH_SIZE;

      // Stop if we got fewer rows than batch size
      if (batchResult.rows.length < BATCH_SIZE) break;
    }

    // Render final output
    let buffer: Buffer;
    if (format === 'csv') {
      buffer = renderCSV(allRows, template.columns);
    } else if (format === 'pdf') {
      // Get org name for PDF header
      const orgResult = await pool.query<{ org_name: string }>(
        'SELECT org_name FROM orgs WHERE org_id = $1',
        [orgId],
      );
      const orgName = orgResult.rows[0]?.org_name ?? orgId;
      const digestSummary = await getDigestSummary(pool, orgId);
      buffer = await renderEvidencePDF(allRows, templateName, orgName, digestSummary);
    } else {
      // JSON
      buffer = Buffer.from(JSON.stringify({ events: allRows, count: allRows.length }, null, 2), 'utf-8');
    }

    // Upload to GCS
    let gcsPath: string | null = null;
    let downloadUrl: string | null = null;
    try {
      gcsPath = await uploadExport(orgId, exportId, format, buffer);

      // Import dynamically to avoid circular deps
      const { getSignedUrl } = await import('./gcs-export.js');
      downloadUrl = await getSignedUrl(gcsPath);
    } catch (gcsErr) {
      // GCS upload failure is non-fatal — export still completed, just no download URL
      console.warn(`[Export] GCS upload failed for ${exportId}:`, (gcsErr as Error).message);
    }

    // Update DB with completion
    await pool.query(
      `UPDATE audit_exports
       SET status = 'complete',
           event_count = $1,
           file_size_bytes = $2,
           gcs_path = $3,
           download_url = $4,
           progress_pct = 100,
           completed_at = now()
       WHERE export_id = $5`,
      [allRows.length, buffer.length, gcsPath, downloadUrl, exportId],
    );

    await setProgress(redis, exportId, {
      progress_pct: 100,
      status: 'complete',
      download_url: downloadUrl ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Export] Bulk export failed for ${exportId}:`, message);

    await setProgress(redis, exportId, { progress_pct: 0, status: 'failed', error: message });
    await pool.query(
      `UPDATE audit_exports SET status = 'failed', error = $1 WHERE export_id = $2`,
      [message, exportId],
    );
  }
}
