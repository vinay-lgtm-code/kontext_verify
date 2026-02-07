// ============================================================================
// Kontext Server - API Service
// ============================================================================
// Lightweight backend API built with Hono, ready for GCP Cloud Run deployment.
// Uses in-memory storage for MVP. See store.ts for notes on persistent storage.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { ServerStore } from './store.js';

const app = new Hono();
const store = new ServerStore();

// API keys loaded from environment variables
// Set KONTEXT_API_KEYS as a comma-separated list, or KONTEXT_API_KEY for a single key.
// Example: KONTEXT_API_KEYS="sk_live_abc123,sk_live_def456"
const VALID_API_KEYS = new Set(
  [
    process.env['KONTEXT_API_KEY'],
    ...(process.env['KONTEXT_API_KEYS']?.split(',').map((k) => k.trim()) ?? []),
  ].filter(Boolean),
);

// ============================================================================
// Middleware
// ============================================================================

app.use('*', cors({
  origin: [
    'https://getkontext.com',
    'https://www.getkontext.com',
    ...(process.env['KONTEXT_CORS_ORIGINS']?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
    ...(process.env['NODE_ENV'] === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Project-Id', 'X-Kontext-Signature'],
  maxAge: 86400,
}));
app.use('*', logger());

// ============================================================================
// Rate Limiting
// ============================================================================

/** Sliding-window rate limiter state keyed by IP */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** Rate limit configuration: 100 requests per 60-second window */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * In-memory sliding-window rate limiter middleware.
 * Applied to /v1/* routes only. Extracts client IP from x-forwarded-for
 * (first entry) or x-real-ip header, and enforces a per-IP request limit.
 * Returns 429 Too Many Requests with a Retry-After header when exceeded.
 */
app.use('/v1/*', async (c, next) => {
  const forwardedFor = c.req.header('x-forwarded-for');
  const ip = (forwardedFor ? forwardedFor.split(',')[0]?.trim() : c.req.header('x-real-ip')) ?? 'unknown';

  const currentTime = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || currentTime >= entry.resetAt) {
    // Start a new window
    rateLimitMap.set(ip, { count: 1, resetAt: currentTime + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - currentTime) / 1000);
    return c.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  entry.count++;
  return next();
});

/**
 * API key authentication middleware.
 * Extracts the API key from the Authorization header (Bearer token)
 * and validates it. Returns 401 for missing/invalid keys.
 */
function authMiddleware(c: Parameters<Parameters<typeof app.use>[1]>[0], next: () => Promise<void>): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return Promise.resolve(
      c.json({ error: 'Missing or invalid Authorization header. Expected: Bearer <api_key>' }, 401),
    );
  }

  const apiKey = authHeader.slice(7);

  if (!VALID_API_KEYS.has(apiKey)) {
    return Promise.resolve(c.json({ error: 'Invalid API key' }, 401));
  }

  // Store project ID from header for use in handlers
  const projectId = c.req.header('X-Project-Id');
  if (!projectId) {
    return Promise.resolve(c.json({ error: 'Missing X-Project-Id header' }, 400));
  }

  c.set('projectId' as never, projectId as never);
  return next();
}

// ============================================================================
// Health Check (no auth required)
// ============================================================================

app.get('/', (c) => {
  return c.json({
    service: 'kontext-api',
    version: '0.2.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// API Routes (auth required)
// ============================================================================

// POST /v1/actions - Receive logged actions
app.post('/v1/actions', authMiddleware, async (c) => {
  const projectId = c.get('projectId' as never) as string;

  let body: { actions?: unknown[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.actions || !Array.isArray(body.actions)) {
    return c.json({ error: 'Request body must contain an "actions" array' }, 400);
  }

  const actions = body.actions as Array<Record<string, unknown>>;

  // Validate basic structure of each action
  for (const action of actions) {
    if (!action['id'] || !action['type'] || !action['agentId']) {
      return c.json(
        { error: 'Each action must have id, type, and agentId fields' },
        400,
      );
    }
  }

  store.addActions(
    projectId,
    actions.map((a) => ({
      id: a['id'] as string,
      timestamp: (a['timestamp'] as string) ?? new Date().toISOString(),
      projectId,
      agentId: a['agentId'] as string,
      correlationId: (a['correlationId'] as string) ?? '',
      type: a['type'] as string,
      description: (a['description'] as string) ?? '',
      metadata: (a['metadata'] as Record<string, unknown>) ?? {},
      ...a,
    })),
  );

  return c.json({
    success: true,
    received: actions.length,
    timestamp: new Date().toISOString(),
  });
});

// POST /v1/tasks - Create a task
app.post('/v1/tasks', authMiddleware, async (c) => {
  const projectId = c.get('projectId' as never) as string;

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body['description'] || !body['agentId'] || !body['requiredEvidence']) {
    return c.json(
      { error: 'Task must have description, agentId, and requiredEvidence fields' },
      400,
    );
  }

  const taskId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const task = {
    id: taskId,
    projectId,
    description: body['description'] as string,
    agentId: body['agentId'] as string,
    status: 'pending',
    requiredEvidence: body['requiredEvidence'] as string[],
    providedEvidence: null,
    correlationId: (body['correlationId'] as string) ?? crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    confirmedAt: null,
    expiresAt: body['expiresInMs']
      ? new Date(Date.now() + (body['expiresInMs'] as number)).toISOString()
      : new Date(Date.now() + 86400000).toISOString(),
    metadata: (body['metadata'] as Record<string, unknown>) ?? {},
  };

  store.addTask(task);

  return c.json({ success: true, task }, 201);
});

// PUT /v1/tasks/:taskId/confirm - Confirm a task
app.put('/v1/tasks/:taskId/confirm', authMiddleware, async (c) => {
  const taskId = c.req.param('taskId');
  const task = store.getTask(taskId);

  if (!task) {
    return c.json({ error: `Task not found: ${taskId}` }, 404);
  }

  if (task.status === 'confirmed') {
    return c.json({ error: 'Task already confirmed' }, 409);
  }

  let body: { evidence?: Record<string, unknown> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.evidence) {
    return c.json({ error: 'Request body must contain "evidence" object' }, 400);
  }

  // Validate required evidence
  const missing = task.requiredEvidence.filter(
    (key) => body.evidence![key] === undefined || body.evidence![key] === null,
  );

  if (missing.length > 0) {
    return c.json(
      { error: `Missing required evidence: ${missing.join(', ')}` },
      400,
    );
  }

  const timestamp = new Date().toISOString();
  const updated = store.updateTask(taskId, {
    status: 'confirmed',
    providedEvidence: body.evidence,
    confirmedAt: timestamp,
    updatedAt: timestamp,
  });

  return c.json({ success: true, task: updated });
});

// GET /v1/tasks/:taskId - Get task status
app.get('/v1/tasks/:taskId', authMiddleware, (c) => {
  const taskId = c.req.param('taskId');
  const task = store.getTask(taskId);

  if (!task) {
    return c.json({ error: `Task not found: ${taskId}` }, 404);
  }

  return c.json({ task });
});

// GET /v1/audit/export - Export audit data
app.get('/v1/audit/export', authMiddleware, (c) => {
  const projectId = c.get('projectId' as never) as string;
  const format = c.req.query('format') ?? 'json';
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const agentId = c.req.query('agentId');

  const data = store.getExportData(projectId, {
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    agentId: agentId ?? undefined,
  });

  if (format === 'csv') {
    // Simple CSV conversion
    const csvLines: string[] = ['id,timestamp,type,agentId,description'];
    for (const action of data.actions) {
      csvLines.push(
        `${action.id},${action.timestamp},${action.type},${action.agentId},"${action.description}"`,
      );
    }

    return c.text(csvLines.join('\n'), 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="kontext-audit.csv"',
    });
  }

  return c.json({
    exportedAt: new Date().toISOString(),
    projectId,
    ...data,
  });
});

// GET /v1/trust/:agentId - Get trust score
app.get('/v1/trust/:agentId', authMiddleware, (c) => {
  const projectId = c.get('projectId' as never) as string;
  const agentId = c.req.param('agentId');

  const trustData = store.getTrustData(projectId, agentId);

  if (!trustData) {
    // Return a default score for unknown agents
    return c.json({
      agentId,
      score: 50,
      level: 'medium',
      factors: [
        {
          name: 'history_depth',
          score: 10,
          weight: 0.2,
          description: 'No recorded activity',
        },
      ],
      computedAt: new Date().toISOString(),
    });
  }

  // Simple rule-based scoring based on stored data
  const historyScore = Math.min(trustData.actionCount * 2, 100);
  const anomalyPenalty = trustData.anomalyCount * 10;
  const taskBonus =
    trustData.confirmedTasks > 0
      ? (trustData.confirmedTasks / (trustData.confirmedTasks + trustData.failedTasks)) * 30
      : 0;

  const score = Math.max(0, Math.min(100, Math.round(historyScore - anomalyPenalty + taskBonus)));

  let level: string;
  if (score >= 90) level = 'verified';
  else if (score >= 70) level = 'high';
  else if (score >= 50) level = 'medium';
  else if (score >= 30) level = 'low';
  else level = 'untrusted';

  return c.json({
    agentId,
    score,
    level,
    factors: [
      {
        name: 'history_depth',
        score: historyScore,
        weight: 0.3,
        description: `${trustData.actionCount} total actions`,
      },
      {
        name: 'anomaly_rate',
        score: Math.max(0, 100 - anomalyPenalty),
        weight: 0.3,
        description: `${trustData.anomalyCount} anomalies detected`,
      },
      {
        name: 'task_completion',
        score: taskBonus > 0 ? Math.round((taskBonus / 30) * 100) : 50,
        weight: 0.4,
        description: `${trustData.confirmedTasks} confirmed, ${trustData.failedTasks} failed tasks`,
      },
    ],
    computedAt: new Date().toISOString(),
  });
});

// POST /v1/anomalies/evaluate - Evaluate transaction for anomalies
app.post('/v1/anomalies/evaluate', authMiddleware, async (c) => {
  const projectId = c.get('projectId' as never) as string;

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const amount = parseFloat(String(body['amount'] ?? '0'));
  const agentId = String(body['agentId'] ?? '');
  const anomalies: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
  }> = [];

  // Simple rule-based anomaly detection for the server
  if (amount > 10000) {
    const anomaly = {
      id: crypto.randomUUID(),
      type: 'unusualAmount',
      severity: amount > 50000 ? 'critical' : amount > 25000 ? 'high' : 'medium',
      description: `Transaction amount ${amount} exceeds threshold`,
      agentId,
      actionId: String(body['txHash'] ?? ''),
      projectId,
      detectedAt: new Date().toISOString(),
      data: body,
      reviewed: false,
    };
    anomalies.push(anomaly);
    store.addAnomaly(projectId, anomaly);
  }

  // Check frequency
  const recentActions = store.getActions(projectId, { agentId });
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const recentCount = recentActions.filter((a) => a.timestamp >= oneHourAgo).length;

  if (recentCount > 30) {
    const anomaly = {
      id: crypto.randomUUID(),
      type: 'frequencySpike',
      severity: recentCount > 100 ? 'critical' : recentCount > 60 ? 'high' : 'medium',
      description: `Agent ${agentId} has ${recentCount} actions in the last hour`,
      agentId,
      actionId: String(body['txHash'] ?? ''),
      projectId,
      detectedAt: new Date().toISOString(),
      data: { count: recentCount, threshold: 30 },
      reviewed: false,
    };
    anomalies.push(anomaly);
    store.addAnomaly(projectId, anomaly);
  }

  return c.json({
    evaluated: true,
    anomalyCount: anomalies.length,
    anomalies,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Start Server
// ============================================================================

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
