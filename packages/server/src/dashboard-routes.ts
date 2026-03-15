// ============================================================================
// Kontext Server — Dashboard API Routes
// ============================================================================
// All routes require auth middleware + org_id resolution.
// Returns 503 if DATABASE_URL is not configured.

import { Hono } from 'hono';
import type { Pool } from 'pg';
import { randomBytes } from 'crypto';

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const random = randomBytes(10).toString('base64url').toUpperCase().slice(0, 16);
  return `${prefix}_${timestamp}${random}`;
}

export function createDashboardRoutes(getPool: () => Pool | null) {
  const router = new Hono();

  function requirePool(): Pool {
    const pool = getPool();
    if (!pool) {
      throw Object.assign(new Error('Database not configured'), { status: 503 });
    }
    return pool;
  }

  // ========================================================================
  // GET /kpis — KPI strip values
  // ========================================================================

  router.get('/kpis', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const env = c.req.query('environment') ?? 'production';

    const [verified, unverified, trustAvg, sanctions, violations, coverage] = await Promise.all([
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM verification_events
         WHERE org_id = $1 AND environment = $2
           AND created_at >= date_trunc('day', now())
           AND status = 'verified'`,
        [orgId, env],
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM verification_events
         WHERE org_id = $1 AND environment = $2
           AND created_at >= date_trunc('day', now())
           AND (coverage_status != 'full' OR status != 'verified')`,
        [orgId, env],
      ),
      pool.query<{ avg_trust: string | null }>(
        `SELECT ROUND(AVG(trust_score))::text AS avg_trust FROM verification_events
         WHERE org_id = $1 AND environment = $2
           AND created_at >= now() - interval '24 hours'`,
        [orgId, env],
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM verification_events
         WHERE org_id = $1 AND environment = $2
           AND created_at >= date_trunc('day', now())
           AND ofac_status != 'clear'`,
        [orgId, env],
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM verification_events
         WHERE org_id = $1 AND environment = $2
           AND created_at >= date_trunc('day', now())
           AND policy_decision != 'allow'`,
        [orgId, env],
      ),
      pool.query<{ coverage_pct: string | null }>(
        `SELECT ROUND(
           100.0 * SUM(CASE WHEN coverage_status = 'full' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)
         , 1)::text AS coverage_pct
         FROM verification_events
         WHERE org_id = $1 AND environment = $2
           AND created_at >= now() - interval '7 days'`,
        [orgId, env],
      ),
    ]);

    return c.json({
      org_id: orgId,
      environment: env,
      as_of: new Date().toISOString(),
      verified_payouts_today: parseInt(verified.rows[0]?.count ?? '0', 10),
      unverified_payouts_today: parseInt(unverified.rows[0]?.count ?? '0', 10),
      org_trust_score: trustAvg.rows[0]?.avg_trust ? parseInt(trustAvg.rows[0].avg_trust, 10) : null,
      sanctions_alerts_today: parseInt(sanctions.rows[0]?.count ?? '0', 10),
      policy_violations_today: parseInt(violations.rows[0]?.count ?? '0', 10),
      coverage_pct_7d: coverage.rows[0]?.coverage_pct ? parseFloat(coverage.rows[0].coverage_pct) : null,
    });
  });

  // ========================================================================
  // GET /verification-events — Paginated event list
  // ========================================================================

  router.get('/verification-events', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10) || 50, 100);
    const cursor = c.req.query('cursor');
    const status = c.req.query('status');
    const agentId = c.req.query('agent_id');
    const chain = c.req.query('chain');
    const country = c.req.query('destination_country');
    const policyDecision = c.req.query('policy_decision');
    const ofacStatus = c.req.query('ofac_status');
    const minAmount = c.req.query('min_amount_usd');
    const from = c.req.query('from');
    const to = c.req.query('to');
    const rail = c.req.query('rail');
    const instrumentType = c.req.query('instrument_type');
    const instrumentIssuer = c.req.query('instrument_issuer');

    const conditions: string[] = ['org_id = $1'];
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`(created_at, event_id) < (SELECT created_at, event_id FROM verification_events WHERE event_id = $${paramIndex})`);
      params.push(cursor);
      paramIndex++;
    }
    if (status) { conditions.push(`status = $${paramIndex}`); params.push(status); paramIndex++; }
    if (agentId) { conditions.push(`agent_id = $${paramIndex}`); params.push(agentId); paramIndex++; }
    if (chain) { conditions.push(`payment_chain = $${paramIndex}`); params.push(chain); paramIndex++; }
    if (country) { conditions.push(`payment_destination_country = $${paramIndex}`); params.push(country); paramIndex++; }
    if (policyDecision) { conditions.push(`policy_decision = $${paramIndex}`); params.push(policyDecision); paramIndex++; }
    if (ofacStatus) { conditions.push(`ofac_status = $${paramIndex}`); params.push(ofacStatus); paramIndex++; }
    if (minAmount) { conditions.push(`payment_usd_equivalent >= $${paramIndex}`); params.push(parseFloat(minAmount)); paramIndex++; }
    if (from) { conditions.push(`created_at >= $${paramIndex}`); params.push(from); paramIndex++; }
    if (to) { conditions.push(`created_at <= $${paramIndex}`); params.push(to); paramIndex++; }
    if (rail) { conditions.push(`payment_rail = $${paramIndex}`); params.push(rail); paramIndex++; }
    if (instrumentType) { conditions.push(`instrument_type = $${paramIndex}`); params.push(instrumentType); paramIndex++; }
    if (instrumentIssuer) { conditions.push(`instrument_issuer = $${paramIndex}`); params.push(instrumentIssuer); paramIndex++; }

    const where = conditions.join(' AND ');
    params.push(limit);

    const result = await pool.query(
      `SELECT * FROM verification_events
       WHERE ${where}
       ORDER BY created_at DESC, event_id DESC
       LIMIT $${paramIndex}`,
      params,
    );

    const nextCursor = result.rows.length === limit
      ? result.rows[result.rows.length - 1]?.event_id
      : null;

    return c.json({
      events: result.rows,
      next_cursor: nextCursor,
      count: result.rows.length,
    });
  });

  // ========================================================================
  // GET /verification-events/:event_id/evidence — Evidence bundle
  // ========================================================================

  router.get('/verification-events/:event_id/evidence', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const eventId = c.req.param('event_id');
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const result = await pool.query(
      'SELECT * FROM evidence_bundles WHERE event_id = $1 AND org_id = $2',
      [eventId, orgId],
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Evidence bundle not found' }, 404);
    }

    return c.json(result.rows[0]);
  });

  // ========================================================================
  // GET /agents — Per-agent aggregated stats
  // ========================================================================

  router.get('/agents', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const env = c.req.query('environment') ?? 'production';

    const result = await pool.query(
      `WITH agent_stats AS (
        SELECT
          agent_id,
          (array_agg(agent_type ORDER BY created_at DESC))[1] AS agent_type,
          (array_agg(actor_type ORDER BY created_at DESC))[1] AS actor_type,
          ROUND(AVG(trust_score) FILTER (WHERE created_at >= now() - interval '24 hours'))::int AS trust_score_avg,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS payout_count_24h,
          COALESCE(SUM(payment_usd_equivalent) FILTER (WHERE created_at >= now() - interval '24 hours'), 0) AS volume_24h_usd,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND (status = 'warning' OR status = 'blocked')) AS anomaly_count_24h,
          MAX(created_at) AS last_seen
        FROM verification_events
        WHERE org_id = $1 AND environment = $2
        GROUP BY agent_id
      ),
      recent_events AS (
        SELECT
          agent_id,
          json_agg(json_build_object(
            'event_id', event_id,
            'status', status,
            'amount', payment_amount::text,
            'token', payment_token,
            'created_at', created_at
          ) ORDER BY created_at DESC) AS events
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY created_at DESC) AS rn
          FROM verification_events
          WHERE org_id = $1 AND environment = $2
        ) ranked
        WHERE rn <= 3
        GROUP BY agent_id
      ),
      agent_scopes AS (
        SELECT
          agent_id,
          array_agg(DISTINCT payment_chain) AS chains,
          array_agg(DISTINCT payment_token) AS tokens
        FROM verification_events
        WHERE org_id = $1 AND environment = $2
        GROUP BY agent_id
      )
      SELECT
        s.*,
        COALESCE(r.events, '[]'::json) AS recent_events,
        COALESCE(sc.chains, '{}') AS authorized_chains,
        COALESCE(sc.tokens, '{}') AS authorized_tokens
      FROM agent_stats s
      LEFT JOIN recent_events r ON s.agent_id = r.agent_id
      LEFT JOIN agent_scopes sc ON s.agent_id = sc.agent_id
      ORDER BY s.last_seen DESC`,
      [orgId, env],
    );

    return c.json({
      agents: result.rows,
      count: result.rows.length,
    });
  });

  // ========================================================================
  // GET /policies — Policy definitions with live stats
  // ========================================================================

  // Static policy definitions (v1 — matches HTML mockup)
  const POLICY_DEFINITIONS = [
    {
      policy_id: 'pol_payout_limit_usd',
      name: 'Payout Limit',
      type: 'limit',
      description: 'Block payouts exceeding org limit',
      enabled: true,
    },
    {
      policy_id: 'pol_allowed_chains',
      name: 'Chain Allowlist',
      type: 'scope',
      description: 'Restrict to approved chains only',
      enabled: true,
    },
    {
      policy_id: 'pol_country_restrictions',
      name: 'Country Restrictions',
      type: 'geo',
      description: 'Block sanctioned or restricted countries',
      enabled: false,
    },
    {
      policy_id: 'pol_genius_act_threshold',
      name: 'GENIUS Act EDD',
      type: 'threshold',
      description: 'Flag payouts >= $3,000 for enhanced due diligence',
      enabled: true,
    },
    {
      policy_id: 'pol_ctr_threshold',
      name: 'CTR Threshold',
      type: 'threshold',
      description: 'Flag payouts >= $10,000 for CTR reporting',
      enabled: true,
    },
    {
      policy_id: 'pol_ofac_screening',
      name: 'OFAC Screening',
      type: 'screen',
      description: 'Screen all addresses against OFAC SDN list',
      enabled: true,
    },
    {
      policy_id: 'pol_card_merchant_country',
      name: 'Card Merchant Country',
      type: 'geo',
      description: 'Block card payments to OFAC-sanctioned countries',
      enabled: true,
    },
    {
      policy_id: 'pol_card_mcc_restriction',
      name: 'Card MCC Restriction',
      type: 'scope',
      description: 'Flag high-risk merchant category codes (gambling, crypto exchanges)',
      enabled: true,
    },
    {
      policy_id: 'pol_card_3ds_requirement',
      name: '3D Secure Requirement',
      type: 'threshold',
      description: 'Require 3DS authentication for card payments >= $3,000',
      enabled: true,
    },
    {
      policy_id: 'pol_instrument_scope_violation',
      name: 'Instrument Scope',
      type: 'scope',
      description: 'Validate payment against instrument spend limits and restrictions',
      enabled: true,
    },
  ];

  router.get('/policies', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const env = c.req.query('environment') ?? 'production';

    // Get violation counts per policy
    const violationResult = await pool.query<{ policy_id: string; violation_count: string }>(
      `SELECT unnest(applied_policy_ids) AS policy_id, COUNT(*) AS violation_count
       FROM verification_events
       WHERE org_id = $1 AND environment = $2
         AND created_at >= date_trunc('day', now())
         AND policy_decision != 'allow'
       GROUP BY policy_id`,
      [orgId, env],
    );

    const violationMap = new Map(
      violationResult.rows.map((r) => [r.policy_id, parseInt(r.violation_count, 10)]),
    );

    // Get total events today for impact calculation
    const totalResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM verification_events
       WHERE org_id = $1 AND environment = $2
         AND created_at >= date_trunc('day', now())`,
      [orgId, env],
    );
    const totalToday = parseInt(totalResult.rows[0]?.count ?? '0', 10);

    // Get per-policy evaluated count
    const impactResult = await pool.query<{ policy_id: string; eval_count: string }>(
      `SELECT unnest(applied_policy_ids) AS policy_id, COUNT(*) AS eval_count
       FROM verification_events
       WHERE org_id = $1 AND environment = $2
         AND created_at >= date_trunc('day', now())
       GROUP BY policy_id`,
      [orgId, env],
    );
    const impactMap = new Map(
      impactResult.rows.map((r) => [r.policy_id, parseInt(r.eval_count, 10)]),
    );

    const policies = POLICY_DEFINITIONS.map((p) => ({
      ...p,
      violations_today: violationMap.get(p.policy_id) ?? 0,
      impact_pct: totalToday > 0
        ? Math.round((100 * (impactMap.get(p.policy_id) ?? 0)) / totalToday * 10) / 10
        : 0,
    }));

    return c.json({ policies, total_events_today: totalToday });
  });

  // ========================================================================
  // GET /policies/violations — Recent policy violations
  // ========================================================================

  router.get('/policies/violations', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const env = c.req.query('environment') ?? 'production';
    const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10) || 20, 100);

    const result = await pool.query(
      `SELECT
         event_id, created_at, agent_id, workflow,
         payment_amount::text AS amount, payment_token AS token,
         policy_decision, policy_violations, policy_warnings,
         applied_policy_ids, status
       FROM verification_events
       WHERE org_id = $1 AND environment = $2
         AND policy_decision != 'allow'
       ORDER BY created_at DESC
       LIMIT $3`,
      [orgId, env, limit],
    );

    return c.json({
      violations: result.rows,
      count: result.rows.length,
    });
  });

  // ========================================================================
  // POST /audit-exports — Create audit export
  // ========================================================================

  router.post('/audit-exports', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    let body: { format?: string; date_range?: { from?: string; to?: string }; filters?: Record<string, string> };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const format = body.format ?? 'json';
    const dateFrom = body.date_range?.from ?? new Date(Date.now() - 30 * 86400000).toISOString();
    const dateTo = body.date_range?.to ?? new Date().toISOString();

    const exportId = generateId('exp');

    // MVP: synchronous JSON export
    const eventsResult = await pool.query(
      `SELECT ve.*, eb.intent_hash_value, eb.record_hash, eb.previous_record_hash, eb.chain_index
       FROM verification_events ve
       JOIN evidence_bundles eb ON ve.evidence_bundle_id = eb.evidence_bundle_id
       WHERE ve.org_id = $1 AND ve.created_at >= $2 AND ve.created_at <= $3
       ORDER BY ve.created_at DESC`,
      [orgId, dateFrom, dateTo],
    );

    // Insert export record
    await pool.query(
      `INSERT INTO audit_exports (export_id, org_id, requested_by, format, date_range_from, date_range_to, event_count, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'complete', now())`,
      [exportId, orgId, 'api', format, dateFrom, dateTo, eventsResult.rows.length],
    );

    return c.json({
      export_id: exportId,
      status: 'complete',
      format,
      event_count: eventsResult.rows.length,
      data: eventsResult.rows,
      created_at: new Date().toISOString(),
    }, 201);
  });

  // ========================================================================
  // GET /audit-exports/:export_id — Get export status
  // ========================================================================

  router.get('/audit-exports/:export_id', async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const exportId = c.req.param('export_id');
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const result = await pool.query(
      'SELECT * FROM audit_exports WHERE export_id = $1 AND org_id = $2',
      [exportId, orgId],
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Export not found' }, 404);
    }

    return c.json(result.rows[0]);
  });

  return router;
}
