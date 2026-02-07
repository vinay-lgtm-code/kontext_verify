// ============================================================================
// Kontext Server - Standalone Node.js Entrypoint
// ============================================================================
// For local development and GCP Cloud Run. Vercel uses api/index.ts instead.

import { serve } from '@hono/node-server';
import app from './app.js';

const port = parseInt(process.env['PORT'] ?? '8080', 10);

console.log(`
  ╔══════════════════════════════════════════╗
  ║         Kontext API Server v0.2.0        ║
  ║──────────────────────────────────────────║
  ║  Status:  Running                        ║
  ║  Port:    ${String(port).padEnd(33)}║
  ║  Storage: In-memory (MVP)                ║
  ║                                          ║
  ║  Endpoints:                              ║
  ║    POST /v1/actions                      ║
  ║    POST /v1/tasks                        ║
  ║    PUT  /v1/tasks/:id/confirm            ║
  ║    GET  /v1/tasks/:id                    ║
  ║    GET  /v1/audit/export                 ║
  ║    GET  /v1/trust/:agentId               ║
  ║    POST /v1/anomalies/evaluate           ║
  ╚══════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
