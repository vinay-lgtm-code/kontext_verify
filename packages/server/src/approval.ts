// ============================================================================
// Kontext Server — Approval Chain Service
// ============================================================================
// Multi-step approval workflow for verification events.
// Each event can have N sequential approval steps that must be completed in order.

import type { Pool } from 'pg';
import { randomBytes } from 'crypto';

function generateApprovalId(): string {
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const random = randomBytes(10).toString('base64url').toUpperCase().slice(0, 16);
  return `apr_${timestamp}${random}`;
}

export interface ApprovalStep {
  approver_role: string;
}

export interface ApprovalRow {
  approval_id: string;
  event_id: string;
  org_id: string;
  step_index: number;
  total_steps: number;
  approver_id: string | null;
  approver_role: string | null;
  decision: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface PendingApproval extends ApprovalRow {
  payment_amount: string | null;
  payment_token: string | null;
  payment_chain: string | null;
  agent_id: string | null;
  trust_score: number | null;
  event_status: string | null;
}

export class ApprovalService {
  /**
   * Create an approval chain for a verification event.
   * Inserts one row per step, all starting with decision='pending'.
   */
  static async createChain(
    pool: Pool,
    eventId: string,
    orgId: string,
    steps: ApprovalStep[] = [{ approver_role: 'any' }],
  ): Promise<ApprovalRow[]> {
    const totalSteps = steps.length;
    const rows: ApprovalRow[] = [];

    for (let i = 0; i < totalSteps; i++) {
      const step = steps[i]!;
      const approvalId = generateApprovalId();

      const { rows: inserted } = await pool.query<ApprovalRow>(
        `INSERT INTO approvals (approval_id, event_id, org_id, step_index, total_steps, approver_role, decision)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [approvalId, eventId, orgId, i, totalSteps, step.approver_role],
      );

      if (inserted[0]) {
        rows.push(inserted[0]);
      }
    }

    // Mark the event as pending approval
    await pool.query(
      `UPDATE verification_events SET approval_status = 'pending' WHERE event_id = $1 AND org_id = $2`,
      [eventId, orgId],
    );

    return rows;
  }

  /**
   * Submit a decision (approved/rejected) for an approval step.
   * Validates sequential ordering: previous steps must be approved before this one can be decided.
   * On final approval -> updates event to verified + approval_status='approved'.
   * On rejection -> updates event to rejected + approval_status='rejected'.
   * Also updates the evidence bundle with the full approval chain as JSONB.
   */
  static async submitDecision(
    pool: Pool,
    approvalId: string,
    userId: string,
    role: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<ApprovalRow> {
    // Fetch the approval step
    const { rows: approvalRows } = await pool.query<ApprovalRow>(
      `SELECT * FROM approvals WHERE approval_id = $1`,
      [approvalId],
    );

    const approval = approvalRows[0];
    if (!approval) {
      throw Object.assign(new Error('Approval not found'), { status: 404 });
    }

    if (approval.decision !== 'pending') {
      throw Object.assign(new Error('Approval already decided'), { status: 409 });
    }

    // Check sequential ordering: all previous steps must be approved
    if (approval.step_index > 0) {
      const { rows: previousSteps } = await pool.query<ApprovalRow>(
        `SELECT * FROM approvals
         WHERE event_id = $1 AND step_index < $2
         ORDER BY step_index ASC`,
        [approval.event_id, approval.step_index],
      );

      for (const prev of previousSteps) {
        if (prev.decision !== 'approved') {
          throw Object.assign(
            new Error(`Step ${prev.step_index} must be approved before step ${approval.step_index}`),
            { status: 400 },
          );
        }
      }
    }

    // Update the approval step
    const { rows: updatedRows } = await pool.query<ApprovalRow>(
      `UPDATE approvals
       SET decision = $1, approver_id = $2, approver_role = $3, reason = $4, decided_at = now()
       WHERE approval_id = $5
       RETURNING *`,
      [decision, userId, role, reason ?? null, approvalId],
    );

    const updated = updatedRows[0]!;

    if (decision === 'rejected') {
      // Rejection at any step -> reject the event
      await pool.query(
        `UPDATE verification_events SET status = 'rejected', approval_status = 'rejected'
         WHERE event_id = $1`,
        [approval.event_id],
      );
    } else if (decision === 'approved' && approval.step_index === approval.total_steps - 1) {
      // Final step approved -> verify the event
      await pool.query(
        `UPDATE verification_events SET status = 'verified', approval_status = 'approved'
         WHERE event_id = $1`,
        [approval.event_id],
      );
    }

    // Update evidence bundle with the full approval chain
    await ApprovalService.syncEvidenceBundle(pool, approval.event_id);

    return updated;
  }

  /**
   * Get all pending approvals for an organization, joined with event summary data.
   */
  static async getPending(pool: Pool, orgId: string): Promise<PendingApproval[]> {
    const { rows } = await pool.query<PendingApproval>(
      `SELECT a.*,
              ve.payment_amount,
              ve.payment_token,
              ve.payment_chain,
              ve.agent_id,
              ve.trust_score,
              ve.status AS event_status
       FROM approvals a
       LEFT JOIN verification_events ve ON ve.event_id = a.event_id
       WHERE a.org_id = $1 AND a.decision = 'pending'
       ORDER BY a.created_at ASC`,
      [orgId],
    );

    return rows;
  }

  /**
   * Get all approval steps for a single event, ordered by step_index.
   */
  static async getEventApprovals(pool: Pool, eventId: string): Promise<ApprovalRow[]> {
    const { rows } = await pool.query<ApprovalRow>(
      `SELECT * FROM approvals WHERE event_id = $1 ORDER BY step_index ASC`,
      [eventId],
    );

    return rows;
  }

  /**
   * Sync the approval chain into the evidence bundle as JSONB.
   */
  private static async syncEvidenceBundle(pool: Pool, eventId: string): Promise<void> {
    const { rows } = await pool.query<ApprovalRow>(
      `SELECT * FROM approvals WHERE event_id = $1 ORDER BY step_index ASC`,
      [eventId],
    );

    const chain = rows.map((r) => ({
      approval_id: r.approval_id,
      step_index: r.step_index,
      total_steps: r.total_steps,
      approver_id: r.approver_id,
      approver_role: r.approver_role,
      decision: r.decision,
      reason: r.reason,
      decided_at: r.decided_at,
    }));

    await pool.query(
      `UPDATE evidence_bundles SET approval_chain = $1::jsonb WHERE event_id = $2`,
      [JSON.stringify(chain), eventId],
    );
  }
}
