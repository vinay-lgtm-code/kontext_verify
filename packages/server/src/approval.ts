// ============================================================================
// Kontext Server - Approval Chain
// ============================================================================
//
// Multi-step approval workflow for verification events.
// Each event can have N approval steps, processed sequentially.
//
// Schema: approval_steps table
//   approval_id    TEXT PRIMARY KEY,
//   event_id       TEXT NOT NULL REFERENCES verification_events(event_id),
//   org_id         TEXT NOT NULL,
//   step_index     INTEGER NOT NULL,
//   role           TEXT NOT NULL,
//   status         TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
//   decision       TEXT,       -- approve | reject
//   approver_id    TEXT,
//   decided_at     TIMESTAMPTZ,
//   created_at     TIMESTAMPTZ DEFAULT now()
//

import { randomBytes } from 'crypto';
import type { Pool } from 'pg';

export interface ApprovalStep {
  role: string;
}

export interface ApprovalRecord {
  approval_id: string;
  event_id: string;
  org_id: string;
  step_index: number;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  decision: string | null;
  approver_id: string | null;
  decided_at: string | null;
  created_at: string;
}

function generateApprovalId(): string {
  return `apr_${randomBytes(12).toString('hex')}`;
}

export class ApprovalService {
  constructor(private readonly pool: Pool) {}

  /** Create an approval chain for an event with N steps */
  async createChain(
    eventId: string,
    orgId: string,
    steps?: ApprovalStep[],
  ): Promise<ApprovalRecord[]> {
    const resolvedSteps = steps && steps.length > 0
      ? steps
      : [{ role: 'default' }];

    const records: ApprovalRecord[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < resolvedSteps.length; i++) {
      const step = resolvedSteps[i]!;
      const approvalId = generateApprovalId();

      await this.pool.query(
        `INSERT INTO approval_steps (approval_id, event_id, org_id, step_index, role, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [approvalId, eventId, orgId, i, step.role, now],
      );

      records.push({
        approval_id: approvalId,
        event_id: eventId,
        org_id: orgId,
        step_index: i,
        role: step.role,
        status: 'pending',
        decision: null,
        approver_id: null,
        decided_at: null,
        created_at: now,
      });
    }

    return records;
  }

  /** Submit a decision for a specific approval step */
  async submitDecision(
    approvalId: string,
    decision: 'approved' | 'rejected',
    approverId: string,
  ): Promise<ApprovalRecord> {
    // Load the approval step
    const stepResult = await this.pool.query<ApprovalRecord>(
      `SELECT * FROM approval_steps WHERE approval_id = $1`,
      [approvalId],
    );

    const step = stepResult.rows[0];
    if (!step) {
      throw new Error(`Approval step ${approvalId} not found`);
    }

    // Sequential lock: all prior steps must be approved
    if (step.step_index > 0) {
      const priorResult = await this.pool.query<{ status: string }>(
        `SELECT status FROM approval_steps
         WHERE event_id = $1 AND step_index < $2
         ORDER BY step_index`,
        [step.event_id, step.step_index],
      );

      const allPriorApproved = priorResult.rows.every((r) => r.status === 'approved');
      if (!allPriorApproved) {
        throw new Error('Cannot decide on this step: prior steps are still pending');
      }
    }

    // Update this step
    const now = new Date().toISOString();
    await this.pool.query(
      `UPDATE approval_steps
       SET status = $1, decision = $1, approver_id = $2, decided_at = $3
       WHERE approval_id = $4`,
      [decision, approverId, now, approvalId],
    );

    // Check if this was the final step
    const totalStepsResult = await this.pool.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM approval_steps WHERE event_id = $1`,
      [step.event_id],
    );
    const totalSteps = parseInt(totalStepsResult.rows[0]?.cnt ?? '0', 10);

    // Update event status based on decision
    if (decision === 'rejected') {
      await this.pool.query(
        `UPDATE verification_events SET status = 'rejected' WHERE event_id = $1`,
        [step.event_id],
      );
    } else if (decision === 'approved' && step.step_index === totalSteps - 1) {
      // Final step approved -- mark event verified
      await this.pool.query(
        `UPDATE verification_events SET status = 'verified' WHERE event_id = $1`,
        [step.event_id],
      );
    }

    return {
      ...step,
      status: decision,
      decision,
      approver_id: approverId,
      decided_at: now,
    };
  }

  /** Get all pending approvals for an org */
  async getPending(orgId: string): Promise<ApprovalRecord[]> {
    const result = await this.pool.query<ApprovalRecord>(
      `SELECT * FROM approval_steps WHERE org_id = $1 AND status = 'pending' ORDER BY created_at`,
      [orgId],
    );
    return result.rows;
  }

  /** Get all approval steps for an event, ordered by step_index */
  async getEventApprovals(eventId: string): Promise<ApprovalRecord[]> {
    const result = await this.pool.query<ApprovalRecord>(
      `SELECT * FROM approval_steps WHERE event_id = $1 ORDER BY step_index`,
      [eventId],
    );
    return result.rows;
  }
}
