// ============================================================================
// Approval Chain Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalService } from '../src/approval.js';
import type { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Mock pool helper
// ---------------------------------------------------------------------------

function makeMockPool() {
  return {
    query: vi.fn(),
  } as unknown as Pool;
}

function makeApprovalRow(overrides: Record<string, unknown> = {}) {
  return {
    approval_id: 'apr_000000000000000000000000',
    event_id: 'ver_EVT1',
    org_id: 'org_1',
    step_index: 0,
    role: 'compliance',
    status: 'pending',
    decision: null,
    approver_id: null,
    decided_at: null,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApprovalService', () => {
  let pool: Pool;
  let chain: ApprovalService;

  beforeEach(() => {
    pool = makeMockPool();
    chain = new ApprovalService(pool);
  });

  // ---- createChain ----

  describe('createChain', () => {
    it('inserts N approval rows for N steps', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const steps = [
        { role: 'compliance' },
        { role: 'treasury' },
        { role: 'cfo' },
      ];

      const result = await chain.createChain('ver_EVT1', 'org_1', steps);

      expect(result).toHaveLength(3);
      expect(pool.query).toHaveBeenCalledTimes(3);

      // Verify each step was inserted with correct step_index
      for (let i = 0; i < 3; i++) {
        const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[i]!;
        expect(call[0]).toContain('INSERT INTO approval_steps');
        expect(call[1][1]).toBe('ver_EVT1'); // event_id
        expect(call[1][2]).toBe('org_1');    // org_id
        expect(call[1][3]).toBe(i);          // step_index
        expect(call[1][4]).toBe(steps[i]!.role); // role
      }

      // Verify returned records
      expect(result[0]!.step_index).toBe(0);
      expect(result[0]!.role).toBe('compliance');
      expect(result[0]!.status).toBe('pending');
      expect(result[1]!.step_index).toBe(1);
      expect(result[1]!.role).toBe('treasury');
      expect(result[2]!.step_index).toBe(2);
      expect(result[2]!.role).toBe('cfo');
    });

    it('creates 1 default step when no steps provided', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await chain.createChain('ver_EVT2', 'org_1');

      expect(result).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(result[0]!.role).toBe('default');
      expect(result[0]!.step_index).toBe(0);
    });

    it('creates 1 default step when empty array provided', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await chain.createChain('ver_EVT3', 'org_1', []);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe('default');
    });

    it('each record has pending status and null decision fields', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await chain.createChain('ver_EVT4', 'org_1', [{ role: 'admin' }]);

      expect(result[0]!.status).toBe('pending');
      expect(result[0]!.decision).toBeNull();
      expect(result[0]!.approver_id).toBeNull();
      expect(result[0]!.decided_at).toBeNull();
    });

    it('each record has a unique apr_ prefixed approval_id', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await chain.createChain('ver_EVT5', 'org_1', [
        { role: 'a' },
        { role: 'b' },
      ]);

      expect(result[0]!.approval_id).toMatch(/^apr_/);
      expect(result[1]!.approval_id).toMatch(/^apr_/);
      expect(result[0]!.approval_id).not.toBe(result[1]!.approval_id);
    });
  });

  // ---- submitDecision ----

  describe('submitDecision', () => {
    it('updates decision and approver fields', async () => {
      const stepRow = makeApprovalRow({
        approval_id: 'apr_STEP0',
        step_index: 0,
        event_id: 'ver_EVT1',
      });

      (pool.query as ReturnType<typeof vi.fn>)
        // 1st call: SELECT step
        .mockResolvedValueOnce({ rows: [stepRow] })
        // 2nd call: UPDATE step
        .mockResolvedValueOnce({ rows: [] })
        // 3rd call: SELECT COUNT total steps
        .mockResolvedValueOnce({ rows: [{ cnt: '1' }] })
        // 4th call: UPDATE event status (final step approved)
        .mockResolvedValueOnce({ rows: [] });

      const result = await chain.submitDecision('apr_STEP0', 'approved', 'user_42');

      expect(result.decision).toBe('approved');
      expect(result.approver_id).toBe('user_42');
      expect(result.decided_at).toBeTruthy();

      // Verify UPDATE call
      const updateCall = (pool.query as ReturnType<typeof vi.fn>).mock.calls[1]!;
      expect(updateCall[0]).toContain('UPDATE approval_steps');
      expect(updateCall[1][0]).toBe('approved'); // status/decision
      expect(updateCall[1][1]).toBe('user_42');  // approver_id
    });

    it('step 0 is always allowed (no prior step check)', async () => {
      const stepRow = makeApprovalRow({ approval_id: 'apr_STEP0', step_index: 0 });

      (pool.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [stepRow] })     // SELECT step
        .mockResolvedValueOnce({ rows: [] })              // UPDATE step
        .mockResolvedValueOnce({ rows: [{ cnt: '2' }] }) // total steps
        // No event status update since not final step

      const result = await chain.submitDecision('apr_STEP0', 'approved', 'user_1');
      expect(result.decision).toBe('approved');

      // Should NOT have queried for prior steps
      const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls;
      const priorStepQueries = calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('step_index <'),
      );
      expect(priorStepQueries).toHaveLength(0);
    });

    it('step 1 fails if step 0 is still pending (sequential lock)', async () => {
      const step1Row = makeApprovalRow({
        approval_id: 'apr_STEP1',
        step_index: 1,
        event_id: 'ver_EVT1',
      });

      (pool.query as ReturnType<typeof vi.fn>)
        // SELECT step
        .mockResolvedValueOnce({ rows: [step1Row] })
        // SELECT prior steps — step 0 still pending
        .mockResolvedValueOnce({ rows: [{ status: 'pending' }] });

      await expect(
        chain.submitDecision('apr_STEP1', 'approved', 'user_1'),
      ).rejects.toThrow(/prior steps are still pending/);
    });

    it('step 1 succeeds if step 0 is approved', async () => {
      const step1Row = makeApprovalRow({
        approval_id: 'apr_STEP1',
        step_index: 1,
        event_id: 'ver_EVT1',
      });

      (pool.query as ReturnType<typeof vi.fn>)
        // SELECT step
        .mockResolvedValueOnce({ rows: [step1Row] })
        // SELECT prior steps — step 0 approved
        .mockResolvedValueOnce({ rows: [{ status: 'approved' }] })
        // UPDATE step
        .mockResolvedValueOnce({ rows: [] })
        // SELECT COUNT total steps
        .mockResolvedValueOnce({ rows: [{ cnt: '2' }] })
        // UPDATE event status (final step approved)
        .mockResolvedValueOnce({ rows: [] });

      const result = await chain.submitDecision('apr_STEP1', 'approved', 'user_2');
      expect(result.decision).toBe('approved');
    });

    it('approved on final step updates event status to verified', async () => {
      const stepRow = makeApprovalRow({
        approval_id: 'apr_FINAL',
        step_index: 2,
        event_id: 'ver_EVT1',
      });

      (pool.query as ReturnType<typeof vi.fn>)
        // SELECT step
        .mockResolvedValueOnce({ rows: [stepRow] })
        // SELECT prior steps (all approved)
        .mockResolvedValueOnce({ rows: [{ status: 'approved' }, { status: 'approved' }] })
        // UPDATE step
        .mockResolvedValueOnce({ rows: [] })
        // SELECT COUNT total steps = 3
        .mockResolvedValueOnce({ rows: [{ cnt: '3' }] })
        // UPDATE event status
        .mockResolvedValueOnce({ rows: [] });

      await chain.submitDecision('apr_FINAL', 'approved', 'user_cfo');

      // Verify event status update
      const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls;
      const eventUpdate = calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('UPDATE verification_events'),
      );
      expect(eventUpdate).toBeDefined();
      expect(eventUpdate![0]).toContain("status = 'verified'");
      expect(eventUpdate![1]).toEqual(['ver_EVT1']);
    });

    it('rejected decision updates event status to rejected', async () => {
      const stepRow = makeApprovalRow({
        approval_id: 'apr_REJECT',
        step_index: 0,
        event_id: 'ver_EVT1',
      });

      (pool.query as ReturnType<typeof vi.fn>)
        // SELECT step
        .mockResolvedValueOnce({ rows: [stepRow] })
        // UPDATE step
        .mockResolvedValueOnce({ rows: [] })
        // SELECT COUNT total steps
        .mockResolvedValueOnce({ rows: [{ cnt: '2' }] })
        // UPDATE event status to rejected
        .mockResolvedValueOnce({ rows: [] });

      await chain.submitDecision('apr_REJECT', 'rejected', 'user_1');

      const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls;
      const eventUpdate = calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('UPDATE verification_events'),
      );
      expect(eventUpdate).toBeDefined();
      expect(eventUpdate![0]).toContain("status = 'rejected'");
    });

    it('throws when approval step not found', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await expect(
        chain.submitDecision('apr_NOTFOUND', 'approved', 'user_1'),
      ).rejects.toThrow(/not found/);
    });
  });

  // ---- getPending ----

  describe('getPending', () => {
    it('returns only pending approvals', async () => {
      const pendingRows = [
        makeApprovalRow({ approval_id: 'apr_A', status: 'pending' }),
        makeApprovalRow({ approval_id: 'apr_B', status: 'pending' }),
      ];

      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: pendingRows });

      const result = await chain.getPending('org_1');

      expect(result).toHaveLength(2);
      expect(pool.query).toHaveBeenCalledTimes(1);

      const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(call[0]).toContain("status = 'pending'");
      expect(call[1]).toEqual(['org_1']);
    });

    it('returns empty array when no pending approvals', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await chain.getPending('org_1');
      expect(result).toEqual([]);
    });
  });

  // ---- getEventApprovals ----

  describe('getEventApprovals', () => {
    it('returns all steps ordered by step_index', async () => {
      const rows = [
        makeApprovalRow({ step_index: 0, role: 'compliance', status: 'approved' }),
        makeApprovalRow({ step_index: 1, role: 'treasury', status: 'pending' }),
        makeApprovalRow({ step_index: 2, role: 'cfo', status: 'pending' }),
      ];

      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows });

      const result = await chain.getEventApprovals('ver_EVT1');

      expect(result).toHaveLength(3);
      expect(pool.query).toHaveBeenCalledTimes(1);

      const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(call[0]).toContain('ORDER BY step_index');
      expect(call[1]).toEqual(['ver_EVT1']);
    });

    it('returns empty array for event with no approvals', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      const result = await chain.getEventApprovals('ver_NOAPPROVAL');
      expect(result).toEqual([]);
    });
  });
});
