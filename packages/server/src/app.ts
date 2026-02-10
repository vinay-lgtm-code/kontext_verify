// ============================================================================
// Kontext Server - Hono App (framework-agnostic, no Node.js deps)
// ============================================================================
// This file defines the Hono app with all routes. It can be imported by:
// - api/index.ts for Vercel Edge runtime
// - src/index.ts for standalone Node.js server

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
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
// Plan Metering - Server-Side Event Tracking
// ============================================================================

/** Plan tier definitions and their limits */
type PlanTier = 'free' | 'pro' | 'enterprise';

const PLAN_LIMITS: Record<PlanTier, number> = {
  free: 20_000,
  pro: 100_000,
  enterprise: Infinity,
};

/** Per-API-key usage tracking */
interface ApiKeyUsage {
  plan: PlanTier;
  seats: number;
  eventCount: number;
  billingPeriodStart: string;
}

/** In-memory map of API key -> usage */
const apiKeyUsage = new Map<string, ApiKeyUsage>();

/** API key -> plan tier + seats mapping (configurable via env or registration) */
const apiKeyPlans = new Map<string, { plan: PlanTier; seats: number }>();

// Load plan configuration from environment (format: KONTEXT_API_KEY_PLANS="sk_live_abc:pro:3,sk_live_def:enterprise")
const planConfig = process.env['KONTEXT_API_KEY_PLANS'];
if (planConfig) {
  for (const entry of planConfig.split(',').map((e) => e.trim())) {
    const parts = entry.split(':');
    const key = parts[0];
    const plan = parts[1];
    const seats = parts[2] ? parseInt(parts[2], 10) : 1;
    if (key && plan && (plan === 'free' || plan === 'pro' || plan === 'enterprise')) {
      apiKeyPlans.set(key, { plan: plan as PlanTier, seats: Math.max(1, seats || 1) });
    }
  }
}

/**
 * Get or initialize usage tracking for an API key.
 */
function getApiKeyUsage(apiKey: string): ApiKeyUsage {
  let usage = apiKeyUsage.get(apiKey);
  if (!usage) {
    const now = new Date();
    const planInfo = apiKeyPlans.get(apiKey);
    usage = {
      plan: planInfo?.plan ?? 'free',
      seats: planInfo?.seats ?? 1,
      eventCount: 0,
      billingPeriodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    };
    apiKeyUsage.set(apiKey, usage);
  }

  // Check billing period reset
  const periodStart = new Date(usage.billingPeriodStart);
  const nextPeriod = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
  if (new Date() >= nextPeriod) {
    const now = new Date();
    usage.eventCount = 0;
    usage.billingPeriodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }

  return usage;
}

/**
 * Track events for an API key and return whether the limit is exceeded.
 */
function getEffectiveLimit(usage: ApiKeyUsage): number {
  const base = PLAN_LIMITS[usage.plan];
  if (base === Infinity) return Infinity;
  // Pro plan: 100K events per user/seat
  if (usage.plan === 'pro') return base * usage.seats;
  return base;
}

function trackEvents(apiKey: string, count: number): { limitExceeded: boolean; usage: ApiKeyUsage } {
  const usage = getApiKeyUsage(apiKey);
  usage.eventCount += count;
  const limit = getEffectiveLimit(usage);
  const limitExceeded = limit !== Infinity && usage.eventCount > limit;
  return { limitExceeded, usage };
}

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
  const apiKey = c.req.header('Authorization')?.slice(7) ?? '';

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

  // Track events for plan metering
  const { limitExceeded, usage } = trackEvents(apiKey, actions.length);
  const limit = getEffectiveLimit(usage);

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

  // Set usage headers
  const headers: Record<string, string> = {
    'X-Kontext-Usage': String(usage.eventCount),
    'X-Kontext-Limit': limit === Infinity ? 'unlimited' : String(limit),
  };

  // Soft limit: still process the event but return 429 with upgrade instructions
  if (limitExceeded) {
    const effectiveLimit = getEffectiveLimit(usage);
    const upgradeMessage = usage.plan === 'free'
      ? "You've reached the 20,000 event limit on the Free plan. Upgrade to Pro for 100K events/user/mo → https://kontext.so/upgrade"
      : `You've reached the ${effectiveLimit.toLocaleString()} event limit on Pro (${usage.seats} seat${usage.seats !== 1 ? 's' : ''}). Add seats or contact us for Enterprise pricing → https://cal.com/vinnaray`;

    return c.json({
      success: true,
      received: actions.length,
      timestamp: new Date().toISOString(),
      limitExceeded: true,
      message: upgradeMessage,
      usage: {
        plan: usage.plan,
        eventCount: usage.eventCount,
        limit: limit === Infinity ? 'unlimited' : limit,
      },
    }, { status: 429, headers });
  }

  return c.json({
    success: true,
    received: actions.length,
    timestamp: new Date().toISOString(),
  }, { status: 200, headers });
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

// GET /v1/usage - Get current usage stats for the API key
app.get('/v1/usage', authMiddleware, (c) => {
  const apiKey = c.req.header('Authorization')?.slice(7) ?? '';
  const usage = getApiKeyUsage(apiKey);
  const limit = getEffectiveLimit(usage);
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - usage.eventCount);
  const usagePercentage = limit === Infinity ? 0 : Math.min(100, (usage.eventCount / limit) * 100);

  return c.json({
    plan: usage.plan,
    seats: usage.seats,
    eventCount: usage.eventCount,
    limit: limit === Infinity ? 'unlimited' : limit,
    remainingEvents: limit === Infinity ? 'unlimited' : remaining,
    usagePercentage: Math.round(usagePercentage * 100) / 100,
    limitExceeded: limit !== Infinity && usage.eventCount > limit,
    billingPeriodStart: usage.billingPeriodStart,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'X-Kontext-Usage': String(usage.eventCount),
      'X-Kontext-Limit': limit === Infinity ? 'unlimited' : String(limit),
    },
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
// Stripe Checkout + Billing Routes (no auth required — public checkout flow)
// ============================================================================

const KONTEXT_APP_URL = process.env['KONTEXT_APP_URL'] ?? 'http://localhost:3000';

// POST /v1/checkout — Create a Stripe Checkout Session for Pro plan
app.post('/v1/checkout', async (c) => {
  let body: { email?: string; seats?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const email = body.email?.trim();
  if (!email || !email.includes('@')) {
    return c.json({ error: 'A valid email address is required' }, 400);
  }

  const seats = body.seats ?? 1;
  if (seats < 1 || !Number.isInteger(seats)) {
    return c.json({ error: 'Seats must be a positive integer' }, 400);
  }

  try {
    const { createCheckoutSession } = await import('./stripe.js');
    const result = await createCheckoutSession({
      customerEmail: email,
      seats,
      successUrl: `${KONTEXT_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${KONTEXT_APP_URL}/checkout/cancel`,
    });

    return c.json({ url: result.url, sessionId: result.sessionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    return c.json({ error: message }, 500);
  }
});

// POST /v1/webhook/stripe — Stripe webhook handler
app.post('/v1/webhook/stripe', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  try {
    // Read raw body for signature verification
    const rawBody = await c.req.text();
    const { handleWebhookEvent } = await import('./stripe.js');
    const result = await handleWebhookEvent(rawBody, signature);

    // Log the event for debugging
    console.log(`[Stripe Webhook] ${result.type} — handled: ${result.handled}`, result.data ?? '');

    return c.json({ received: true, type: result.type, handled: result.handled });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error('[Stripe Webhook] Error:', message);
    return c.json({ error: message }, 400);
  }
});

// POST /v1/portal — Create a Customer Portal session
app.post('/v1/portal', async (c) => {
  let body: { customerId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.customerId) {
    return c.json({ error: 'Customer ID is required' }, 400);
  }

  try {
    const { createPortalSession } = await import('./stripe.js');
    const result = await createPortalSession({
      customerId: body.customerId,
      returnUrl: `${KONTEXT_APP_URL}/pricing`,
    });

    return c.json({ url: result.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session';
    return c.json({ error: message }, 500);
  }
});

// GET /v1/checkout/success — Verify checkout session status
app.get('/v1/checkout/success', async (c) => {
  const sessionId = c.req.query('session_id');
  if (!sessionId) {
    return c.json({ error: 'session_id query parameter is required' }, 400);
  }

  try {
    const { getCheckoutSession } = await import('./stripe.js');
    const session = await getCheckoutSession(sessionId);
    return c.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve session';
    return c.json({ error: message }, 500);
  }
});

export default app;
