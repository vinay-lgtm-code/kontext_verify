// ============================================================================
// Kontext Server - Standalone Node.js Entrypoint
// ============================================================================
// For local development and GCP Cloud Run. Vercel uses api/index.ts instead.

import { createHash } from 'crypto';
import { serve } from '@hono/node-server';
import app from './app.js';
import { SERVER_VERSION } from './version.js';
import { runMigrations } from './migrate.js';
import { getPool } from './db.js';
import { getRedis } from './cache.js';

const port = parseInt(process.env['PORT'] ?? '8080', 10);

/**
 * Backfill key_hash + key_prefix for existing api_keys rows that predate migration 005.
 * Idempotent — only updates rows where key_hash IS NULL.
 */
async function backfillApiKeyHashes(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    const { rows } = await pool.query<{ api_key: string }>(
      `SELECT api_key FROM api_keys WHERE key_hash IS NULL AND length(api_key) > 8`,
    );
    for (const row of rows) {
      const hash = createHash('sha256').update(row.api_key).digest('hex');
      const prefix = row.api_key.slice(0, 12);
      await pool.query(
        `UPDATE api_keys SET key_hash = $1, key_prefix = $2 WHERE api_key = $3 AND key_hash IS NULL`,
        [hash, prefix, row.api_key],
      );
    }
    if (rows.length > 0) {
      console.log(`[startup] Backfilled key_hash for ${rows.length} API key(s)`);
    }
  } catch (err) {
    console.warn('[startup] key_hash backfill failed (non-fatal):', err instanceof Error ? err.message : String(err));
  }
}

const storageMode = getPool() ? 'PostgreSQL' : 'In-memory';
const cacheMode = process.env['REDIS_URL'] ? 'Redis' : 'None';

async function start() {
  // Warm Redis connection
  getRedis();

  // Run migrations if database is configured
  if (getPool()) {
    try {
      await runMigrations();
    } catch (err) {
      console.error('[startup] Migration failed:', err);
      // Continue startup — server can still serve in-memory routes
    }

    // Backfill key hashes for pre-RBAC API keys (idempotent)
    await backfillApiKeyHashes();
  }

  console.log(`
  ╔══════════════════════════════════════════╗
  ║     Kontext API Server v${SERVER_VERSION.padEnd(16)}║
  ║──────────────────────────────────────────║
  ║  Status:  Running                        ║
  ║  Port:    ${String(port).padEnd(33)}║
  ║  Storage: ${storageMode.padEnd(33)}║
  ║  Cache:   ${cacheMode.padEnd(33)}║
  ║                                          ║
  ║  Endpoints:                              ║
  ║    POST /v1/actions                      ║
  ║    POST /v1/tasks                        ║
  ║    PUT  /v1/tasks/:id/confirm            ║
  ║    GET  /v1/tasks/:id                    ║
  ║    GET  /v1/audit/export                 ║
  ║    GET  /v1/trust/:agentId               ║
  ║    POST /v1/anomalies/evaluate           ║
  ║    POST /v1/verification-events          ║
  ║    GET  /v1/billing/status               ║
  ╚══════════════════════════════════════════╝
`);

  serve({
    fetch: app.fetch,
    port,
  });
}

start();

export default app;
