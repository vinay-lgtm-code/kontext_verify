// ============================================================================
// Kontext Server — Approval Chain Routes (/v1/approvals/*)
// ============================================================================
// POST   /v1/approvals/:eventId                Create approval chain for event
// POST   /v1/approvals/:approvalId/decide      Submit approval/rejection decision
// GET    /v1/approvals/pending                  List pending approvals for org
// GET    /v1/verification-events/:eventId/approvals  Get approval chain for event

import { Hono } from 'hono';
import type { Pool } from 'pg';
import { requirePermission, type Role } from '../auth/rbac.js';
import { ApprovalService, type ApprovalStep } from '../approval.js';
import { notifyApprovers } from '../notifications/approval-notify.js';

export function createApprovalRoutes(getPool: () => Pool | null) {
  const router = new Hono();

  function requirePool(): Pool {
    const pool = getPool();
    if (!pool) throw Object.assign(new Error('Database not configured'), { status: 503 });
    return pool;
  }

  // --------------------------------------------------------------------------
  // POST /v1/approvals/:eventId — Create approval chain for a verification event
  // --------------------------------------------------------------------------
  router.post('/approvals/:eventId', async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const orgId = c.get('orgId' as never) as string;
    const eventId = c.req.param('eventId');

    let body: { steps?: ApprovalStep[] };
    try { body = await c.req.json(); } catch { body = {}; }

    const steps = body.steps && body.steps.length > 0
      ? body.steps
      : [{ approver_role: 'any' }];

    try {
      const approvals = await ApprovalService.createChain(pool, eventId, orgId, steps);

      // Fetch event summary for notification
      const { rows: eventRows } = await pool.query<{
        payment_amount: string | null;
        payment_token: string | null;
        payment_chain: string | null;
        trust_score: number | null;
      }>(
        `SELECT payment_amount, payment_token, payment_chain, trust_score
         FROM verification_events WHERE event_id = $1 AND org_id = $2`,
        [eventId, orgId],
      );

      const eventSummary = eventRows[0];

      // Send notifications to approvers (non-blocking)
      if (eventSummary) {
        notifyApprovers(pool, orgId, eventId, {
          amount: eventSummary.payment_amount ?? '0',
          token: eventSummary.payment_token ?? 'USDC',
          chain: eventSummary.payment_chain ?? 'base',
          riskLevel: (eventSummary.trust_score ?? 50) < 50 ? 'high' : 'low',
        }).catch((err) => {
          console.warn('[Kontext Approvals] Notification failed:', (err as Error).message);
        });
      }

      return c.json({ approvals, count: approvals.length }, 201);
    } catch (err) {
      const e = err as Error & { status?: number };
      return c.json({ error: e.message }, (e.status ?? 500) as 500);
    }
  });

  // --------------------------------------------------------------------------
  // POST /v1/approvals/:approvalId/decide — Submit approval/rejection decision
  // --------------------------------------------------------------------------
  router.post('/approvals/:approvalId/decide', requirePermission('approve:tasks'), async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const approvalId = c.req.param('approvalId');
    const userId = c.get('userId' as never) as string;
    const role = c.get('role' as never) as Role;

    let body: { decision?: string; reason?: string };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

    if (!body.decision || (body.decision !== 'approved' && body.decision !== 'rejected')) {
      return c.json({ error: 'decision must be "approved" or "rejected"' }, 400);
    }

    try {
      const approval = await ApprovalService.submitDecision(
        pool,
        approvalId,
        userId,
        role,
        body.decision as 'approved' | 'rejected',
        body.reason,
      );

      return c.json({ approval });
    } catch (err) {
      const e = err as Error & { status?: number };
      return c.json({ error: e.message }, (e.status ?? 500) as 500);
    }
  });

  // --------------------------------------------------------------------------
  // GET /v1/approvals/pending — List all pending approvals for the org
  // --------------------------------------------------------------------------
  router.get('/approvals/pending', async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const orgId = c.get('orgId' as never) as string;

    const approvals = await ApprovalService.getPending(pool, orgId);
    return c.json({ approvals, count: approvals.length });
  });

  // --------------------------------------------------------------------------
  // GET /v1/verification-events/:eventId/approvals — Get approval chain for event
  // --------------------------------------------------------------------------
  router.get('/verification-events/:eventId/approvals', async (c) => {
    let pool: Pool;
    try { pool = requirePool(); } catch { return c.json({ error: 'Database not configured' }, 503); }

    const eventId = c.req.param('eventId');

    const approvals = await ApprovalService.getEventApprovals(pool, eventId);
    return c.json({ approvals, count: approvals.length });
  });

  return router;
}
