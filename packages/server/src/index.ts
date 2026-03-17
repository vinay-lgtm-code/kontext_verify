// ============================================================================
// Kontext Server - Standalone Node.js Entrypoint
// ============================================================================
// For local development and GCP Cloud Run. Vercel uses api/index.ts instead.

import { serve } from '@hono/node-server';
import app from './app.js';
import { SERVER_VERSION } from './version.js';
import { runMigrations } from './migrate.js';
import { getPool } from './db.js';

const port = parseInt(process.env['PORT'] ?? '8080', 10);
const storageMode = getPool() ? 'PostgreSQL' : 'In-memory';

async function start() {
  // Run migrations if database is configured
  if (getPool()) {
    try {
      await runMigrations();
    } catch (err) {
      console.error('[startup] Migration failed:', err);
      // Continue startup — server can still serve in-memory routes
    }
  }

  console.log(`
  ╔══════════════════════════════════════════╗
  ║     Kontext API Server v${SERVER_VERSION.padEnd(16)}║
  ║──────────────────────────────────────────║
  ║  Status:  Running                        ║
  ║  Port:    ${String(port).padEnd(33)}║
  ║  Storage: ${storageMode.padEnd(33)}║
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
