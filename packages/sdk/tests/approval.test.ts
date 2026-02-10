import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalManager } from '../src/approval.js';
import type {
  ApprovalPolicy,
  EvaluateApprovalInput,
} from '../src/types.js';
import { KontextErrorCode } from '../src/types.js';

// ============================================================================
// Helpers
// ============================================================================

function createPolicy(overrides: Partial<ApprovalPolicy> & { type: ApprovalPolicy['type'] }): ApprovalPolicy {
  return {
    enabled: true,
    params: {},
    ...overrides,
  };
}

function createInput(overrides: Partial<EvaluateApprovalInput> = {}): EvaluateApprovalInput {
  return {
    actionId: 'action-1',
    agentId: 'agent-1',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ApprovalManager', () => {
  // --------------------------------------------------------------------------
  // Policy evaluation — each of the 5 policy types individually
  // --------------------------------------------------------------------------

  describe('amount-threshold policy', () => {
    it('should trigger when amount exceeds threshold', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '10000' } }),
      ]);

      const result = manager.evaluate(createInput({ amount: '25000' }));

      expect(result.required).toBe(true);
      expect(result.triggeredPolicies).toContain('amount-threshold');
      expect(result.riskAssessment.factors).toContain('Amount exceeds threshold of 10000');
    });

    it('should not trigger when amount is below threshold', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '10000' } }),
      ]);

      const result = manager.evaluate(createInput({ amount: '5000' }));

      expect(result.required).toBe(false);
      expect(result.triggeredPolicies).toEqual([]);
    });

    it('should not trigger when amount equals threshold', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '10000' } }),
      ]);

      const result = manager.evaluate(createInput({ amount: '10000' }));

      expect(result.required).toBe(false);
    });

    it('should not trigger when amount is not provided', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '10000' } }),
      ]);

      const result = manager.evaluate(createInput());

      expect(result.required).toBe(false);
    });
  });

  describe('low-trust-score policy', () => {
    it('should trigger when trust score is below minimum', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'low-trust-score', params: { minScore: 50 } }),
      ]);

      const result = manager.evaluate(createInput({ trustScore: 30 }));

      expect(result.required).toBe(true);
      expect(result.triggeredPolicies).toContain('low-trust-score');
      expect(result.riskAssessment.factors).toContain('Trust score 30 below minimum 50');
    });

    it('should not trigger when trust score meets minimum', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'low-trust-score', params: { minScore: 50 } }),
      ]);

      const result = manager.evaluate(createInput({ trustScore: 75 }));

      expect(result.required).toBe(false);
    });

    it('should not trigger when trust score equals minimum', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'low-trust-score', params: { minScore: 50 } }),
      ]);

      const result = manager.evaluate(createInput({ trustScore: 50 }));

      expect(result.required).toBe(false);
    });

    it('should not trigger when trust score is not provided', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'low-trust-score', params: { minScore: 50 } }),
      ]);

      const result = manager.evaluate(createInput());

      expect(result.required).toBe(false);
    });
  });

  describe('anomaly-detected policy', () => {
    it('should trigger when anomalies with sufficient severity are present', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'anomaly-detected', params: { minSeverity: 'high' } }),
      ]);

      const result = manager.evaluate(
        createInput({
          anomalies: [{ type: 'unusualAmount', severity: 'critical' }],
        }),
      );

      expect(result.required).toBe(true);
      expect(result.triggeredPolicies).toContain('anomaly-detected');
      expect(result.riskAssessment.factors).toContain(
        'Anomaly detected: unusualAmount (critical)',
      );
    });

    it('should not trigger when anomaly severity is below minimum', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'anomaly-detected', params: { minSeverity: 'high' } }),
      ]);

      const result = manager.evaluate(
        createInput({
          anomalies: [{ type: 'frequencySpike', severity: 'low' }],
        }),
      );

      expect(result.required).toBe(false);
    });

    it('should trigger when anomaly severity equals minimum', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'anomaly-detected', params: { minSeverity: 'medium' } }),
      ]);

      const result = manager.evaluate(
        createInput({
          anomalies: [{ type: 'frequencySpike', severity: 'medium' }],
        }),
      );

      expect(result.required).toBe(true);
    });

    it('should not trigger when no anomalies are provided', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'anomaly-detected', params: { minSeverity: 'low' } }),
      ]);

      const result = manager.evaluate(createInput());

      expect(result.required).toBe(false);
    });

    it('should include factors for each matching anomaly', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'anomaly-detected', params: { minSeverity: 'medium' } }),
      ]);

      const result = manager.evaluate(
        createInput({
          anomalies: [
            { type: 'unusualAmount', severity: 'high' },
            { type: 'rapidSuccession', severity: 'critical' },
            { type: 'frequencySpike', severity: 'low' }, // below minimum, excluded
          ],
        }),
      );

      expect(result.required).toBe(true);
      expect(result.riskAssessment.factors).toHaveLength(2);
      expect(result.riskAssessment.factors).toContain('Anomaly detected: unusualAmount (high)');
      expect(result.riskAssessment.factors).toContain('Anomaly detected: rapidSuccession (critical)');
    });
  });

  describe('new-destination policy', () => {
    it('should trigger on first use of a destination', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'new-destination', params: {} }),
      ]);

      const result = manager.evaluate(createInput({ destination: '0xNewAddress' }));

      expect(result.required).toBe(true);
      expect(result.triggeredPolicies).toContain('new-destination');
      expect(result.riskAssessment.factors).toContain('New destination address: 0xNewAddress');
    });

    it('should not trigger on second use of the same destination', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'new-destination', params: {} }),
      ]);

      // First call — triggers
      manager.evaluate(createInput({ destination: '0xSameAddress' }));

      // Second call — should not trigger
      const result = manager.evaluate(createInput({ destination: '0xSameAddress' }));

      expect(result.required).toBe(false);
      expect(result.triggeredPolicies).toEqual([]);
    });

    it('should not trigger when destination is not provided', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'new-destination', params: {} }),
      ]);

      const result = manager.evaluate(createInput());

      expect(result.required).toBe(false);
    });
  });

  describe('manual policy', () => {
    it('should always trigger when enabled', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const result = manager.evaluate(createInput());

      expect(result.required).toBe(true);
      expect(result.triggeredPolicies).toContain('manual');
      expect(result.riskAssessment.factors).toContain('Manual approval required');
    });
  });

  // --------------------------------------------------------------------------
  // Multiple policies triggering on same action
  // --------------------------------------------------------------------------

  describe('multiple policies', () => {
    it('should trigger multiple policies on the same action', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '5000' } }),
        createPolicy({ type: 'low-trust-score', params: { minScore: 60 } }),
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const result = manager.evaluate(
        createInput({ amount: '10000', trustScore: 40 }),
      );

      expect(result.required).toBe(true);
      expect(result.triggeredPolicies).toHaveLength(3);
      expect(result.triggeredPolicies).toContain('amount-threshold');
      expect(result.triggeredPolicies).toContain('low-trust-score');
      expect(result.triggeredPolicies).toContain('manual');
    });
  });

  // --------------------------------------------------------------------------
  // No policies triggered returns required: false
  // --------------------------------------------------------------------------

  describe('no policies triggered', () => {
    it('should return required: false when no policies trigger', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '100000' } }),
        createPolicy({ type: 'low-trust-score', params: { minScore: 10 } }),
      ]);

      const result = manager.evaluate(
        createInput({ amount: '500', trustScore: 90 }),
      );

      expect(result.required).toBe(false);
      expect(result.requestId).toBeUndefined();
      expect(result.triggeredPolicies).toEqual([]);
      expect(result.riskAssessment.score).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Disabled policies are skipped
  // --------------------------------------------------------------------------

  describe('disabled policies', () => {
    it('should skip disabled policies', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {}, enabled: false }),
        createPolicy({ type: 'amount-threshold', params: { threshold: '100' }, enabled: false }),
      ]);

      const result = manager.evaluate(createInput({ amount: '50000' }));

      expect(result.required).toBe(false);
      expect(result.triggeredPolicies).toEqual([]);
    });

    it('should only evaluate enabled policies', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {}, enabled: false }),
        createPolicy({ type: 'amount-threshold', params: { threshold: '100' }, enabled: true }),
      ]);

      const result = manager.evaluate(createInput({ amount: '50000' }));

      expect(result.required).toBe(true);
      expect(result.triggeredPolicies).toEqual(['amount-threshold']);
    });
  });

  // --------------------------------------------------------------------------
  // Request lifecycle: pending -> approved
  // --------------------------------------------------------------------------

  describe('request lifecycle: pending -> approved', () => {
    it('should create a pending request and approve it', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const evaluation = manager.evaluate(createInput());
      expect(evaluation.required).toBe(true);
      expect(evaluation.requestId).toBeDefined();

      const request = manager.getRequest(evaluation.requestId!);
      expect(request).toBeDefined();
      expect(request!.status).toBe('pending');

      const decided = manager.submitDecision({
        requestId: evaluation.requestId!,
        decision: 'approve',
        decidedBy: 'admin@example.com',
        reason: 'Looks good',
      });

      expect(decided.status).toBe('approved');
      expect(decided.decision).toBeDefined();
      expect(decided.decision!.decision).toBe('approve');
      expect(decided.decision!.decidedBy).toBe('admin@example.com');
      expect(decided.decision!.reason).toBe('Looks good');
      expect(decided.decision!.decidedAt).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Request lifecycle: pending -> rejected
  // --------------------------------------------------------------------------

  describe('request lifecycle: pending -> rejected', () => {
    it('should create a pending request and reject it', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const evaluation = manager.evaluate(createInput());
      expect(evaluation.required).toBe(true);

      const decided = manager.submitDecision({
        requestId: evaluation.requestId!,
        decision: 'reject',
        decidedBy: 'admin@example.com',
        reason: 'Suspicious activity',
      });

      expect(decided.status).toBe('rejected');
      expect(decided.decision!.decision).toBe('reject');
      expect(decided.decision!.reason).toBe('Suspicious activity');
    });
  });

  // --------------------------------------------------------------------------
  // Request expiry
  // --------------------------------------------------------------------------

  describe('request expiry', () => {
    it('should reject decision on expired request', () => {
      // Use a very short TTL (1ms)
      const manager = new ApprovalManager(
        [createPolicy({ type: 'manual', params: {} })],
        1,
      );

      const evaluation = manager.evaluate(createInput());
      expect(evaluation.required).toBe(true);

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Spin-wait to ensure expiry
      }

      try {
        manager.submitDecision({
          requestId: evaluation.requestId!,
          decision: 'approve',
          decidedBy: 'admin@example.com',
          reason: 'Too late',
        });
        // Should not reach here
        expect.unreachable('Expected APPROVAL_EXPIRED error');
      } catch (err: any) {
        expect(err.code).toBe(KontextErrorCode.APPROVAL_EXPIRED);
      }

      // Verify request is marked as expired
      const request = manager.getRequest(evaluation.requestId!);
      expect(request!.status).toBe('expired');
    });
  });

  // --------------------------------------------------------------------------
  // Evidence validation
  // --------------------------------------------------------------------------

  describe('evidence validation', () => {
    it('should reject approval when required evidence is missing', () => {
      const manager = new ApprovalManager([
        createPolicy({
          type: 'manual',
          params: {},
          requiredEvidence: ['txHash', 'receipt'],
        }),
      ]);

      const evaluation = manager.evaluate(createInput());
      expect(evaluation.required).toBe(true);

      // Try to approve with only partial evidence
      try {
        manager.submitDecision({
          requestId: evaluation.requestId!,
          decision: 'approve',
          decidedBy: 'admin@example.com',
          reason: 'Approved',
          evidence: { txHash: '0xabc123' }, // Missing 'receipt'
        });
        expect.unreachable('Expected INSUFFICIENT_EVIDENCE error');
      } catch (err: any) {
        expect(err.code).toBe(KontextErrorCode.INSUFFICIENT_EVIDENCE);
        expect(err.details.missingEvidence).toContain('receipt');
      }
    });

    it('should accept approval when all required evidence is provided', () => {
      const manager = new ApprovalManager([
        createPolicy({
          type: 'manual',
          params: {},
          requiredEvidence: ['txHash', 'receipt'],
        }),
      ]);

      const evaluation = manager.evaluate(createInput());

      const decided = manager.submitDecision({
        requestId: evaluation.requestId!,
        decision: 'approve',
        decidedBy: 'admin@example.com',
        reason: 'All evidence present',
        evidence: { txHash: '0xabc123', receipt: { status: 'confirmed' } },
      });

      expect(decided.status).toBe('approved');
    });

    it('should not require evidence for rejection', () => {
      const manager = new ApprovalManager([
        createPolicy({
          type: 'manual',
          params: {},
          requiredEvidence: ['txHash'],
        }),
      ]);

      const evaluation = manager.evaluate(createInput());

      // Reject without evidence — should succeed
      const decided = manager.submitDecision({
        requestId: evaluation.requestId!,
        decision: 'reject',
        decidedBy: 'admin@example.com',
        reason: 'Rejected without evidence',
      });

      expect(decided.status).toBe('rejected');
    });
  });

  // --------------------------------------------------------------------------
  // New destination tracking — first call triggers, second doesn't
  // --------------------------------------------------------------------------

  describe('new destination tracking', () => {
    it('should track seen destinations across evaluations', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'new-destination', params: {} }),
      ]);

      // First evaluation with destination A — triggers
      const first = manager.evaluate(createInput({ destination: '0xAddrA' }));
      expect(first.required).toBe(true);
      expect(first.triggeredPolicies).toContain('new-destination');

      // Second evaluation with destination A — no trigger
      const second = manager.evaluate(createInput({ destination: '0xAddrA' }));
      expect(second.required).toBe(false);

      // Third evaluation with destination B — triggers
      const third = manager.evaluate(createInput({ destination: '0xAddrB' }));
      expect(third.required).toBe(true);

      // Fourth evaluation with destination B — no trigger
      const fourth = manager.evaluate(createInput({ destination: '0xAddrB' }));
      expect(fourth.required).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Risk score calculation
  // --------------------------------------------------------------------------

  describe('risk score calculation', () => {
    it('should calculate risk score based on triggered policies', () => {
      // Manual only: 1 * 25 = 25
      const manualOnly = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);
      const r1 = manualOnly.evaluate(createInput());
      expect(r1.riskAssessment.score).toBe(25);
    });

    it('should add bonus for amount-threshold', () => {
      // amount-threshold: 1 * 25 + 20 = 45
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '100' } }),
      ]);
      const result = manager.evaluate(createInput({ amount: '500' }));
      expect(result.riskAssessment.score).toBe(45);
    });

    it('should add bonus for low-trust-score', () => {
      // low-trust-score: 1 * 25 + 30 = 55
      const manager = new ApprovalManager([
        createPolicy({ type: 'low-trust-score', params: { minScore: 50 } }),
      ]);
      const result = manager.evaluate(createInput({ trustScore: 20 }));
      expect(result.riskAssessment.score).toBe(55);
    });

    it('should add bonus for anomaly-detected', () => {
      // anomaly-detected: 1 * 25 + 25 = 50
      const manager = new ApprovalManager([
        createPolicy({ type: 'anomaly-detected', params: { minSeverity: 'low' } }),
      ]);
      const result = manager.evaluate(
        createInput({ anomalies: [{ type: 'test', severity: 'high' }] }),
      );
      expect(result.riskAssessment.score).toBe(50);
    });

    it('should cap risk score at 100', () => {
      // 3 policies * 25 = 75 + 20 + 30 + 25 = 150 -> capped at 100
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '100' } }),
        createPolicy({ type: 'low-trust-score', params: { minScore: 80 } }),
        createPolicy({ type: 'anomaly-detected', params: { minSeverity: 'low' } }),
      ]);
      const result = manager.evaluate(
        createInput({
          amount: '500',
          trustScore: 10,
          anomalies: [{ type: 'test', severity: 'high' }],
        }),
      );
      expect(result.riskAssessment.score).toBe(100);
    });

    it('should return 0 when no policies trigger', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'amount-threshold', params: { threshold: '100000' } }),
      ]);
      const result = manager.evaluate(createInput({ amount: '50' }));
      expect(result.riskAssessment.score).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // getPendingRequests / getRequestsByAgent
  // --------------------------------------------------------------------------

  describe('getPendingRequests', () => {
    it('should return only pending requests', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      // Create 3 requests
      const eval1 = manager.evaluate(createInput({ actionId: 'a1' }));
      const eval2 = manager.evaluate(createInput({ actionId: 'a2' }));
      const eval3 = manager.evaluate(createInput({ actionId: 'a3' }));

      // Approve one
      manager.submitDecision({
        requestId: eval1.requestId!,
        decision: 'approve',
        decidedBy: 'admin',
        reason: 'ok',
      });

      // Reject one
      manager.submitDecision({
        requestId: eval2.requestId!,
        decision: 'reject',
        decidedBy: 'admin',
        reason: 'no',
      });

      const pending = manager.getPendingRequests();
      expect(pending).toHaveLength(1);
      expect(pending[0]!.id).toBe(eval3.requestId);
    });
  });

  describe('getRequestsByAgent', () => {
    it('should return requests filtered by agent', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      manager.evaluate(createInput({ agentId: 'agent-A', actionId: 'a1' }));
      manager.evaluate(createInput({ agentId: 'agent-A', actionId: 'a2' }));
      manager.evaluate(createInput({ agentId: 'agent-B', actionId: 'a3' }));

      const agentARequests = manager.getRequestsByAgent('agent-A');
      expect(agentARequests).toHaveLength(2);
      expect(agentARequests.every((r) => r.agentId === 'agent-A')).toBe(true);

      const agentBRequests = manager.getRequestsByAgent('agent-B');
      expect(agentBRequests).toHaveLength(1);
      expect(agentBRequests[0]!.agentId).toBe('agent-B');

      const agentCRequests = manager.getRequestsByAgent('agent-C');
      expect(agentCRequests).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // isApproved returns correct boolean
  // --------------------------------------------------------------------------

  describe('isApproved', () => {
    it('should return true for approved requests', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const evaluation = manager.evaluate(createInput());
      manager.submitDecision({
        requestId: evaluation.requestId!,
        decision: 'approve',
        decidedBy: 'admin',
        reason: 'ok',
      });

      expect(manager.isApproved(evaluation.requestId!)).toBe(true);
    });

    it('should return false for pending requests', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const evaluation = manager.evaluate(createInput());
      expect(manager.isApproved(evaluation.requestId!)).toBe(false);
    });

    it('should return false for rejected requests', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const evaluation = manager.evaluate(createInput());
      manager.submitDecision({
        requestId: evaluation.requestId!,
        decision: 'reject',
        decidedBy: 'admin',
        reason: 'no',
      });

      expect(manager.isApproved(evaluation.requestId!)).toBe(false);
    });

    it('should return false for nonexistent requests', () => {
      const manager = new ApprovalManager([]);
      expect(manager.isApproved('nonexistent')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Error handling
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('should throw APPROVAL_NOT_FOUND for unknown request ID', () => {
      const manager = new ApprovalManager([]);

      try {
        manager.submitDecision({
          requestId: 'nonexistent',
          decision: 'approve',
          decidedBy: 'admin',
          reason: 'test',
        });
        expect.unreachable('Expected APPROVAL_NOT_FOUND error');
      } catch (err: any) {
        expect(err.code).toBe(KontextErrorCode.APPROVAL_NOT_FOUND);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Request stores metadata
  // --------------------------------------------------------------------------

  describe('metadata', () => {
    it('should store metadata from input on the request', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const evaluation = manager.evaluate(
        createInput({ metadata: { source: 'test', priority: 'high' } }),
      );

      const request = manager.getRequest(evaluation.requestId!);
      expect(request!.metadata).toEqual({ source: 'test', priority: 'high' });
    });
  });

  // --------------------------------------------------------------------------
  // Conditions stored on decision
  // --------------------------------------------------------------------------

  describe('conditions', () => {
    it('should store conditions on the decision', () => {
      const manager = new ApprovalManager([
        createPolicy({ type: 'manual', params: {} }),
      ]);

      const evaluation = manager.evaluate(createInput());
      const decided = manager.submitDecision({
        requestId: evaluation.requestId!,
        decision: 'approve',
        decidedBy: 'admin',
        reason: 'Conditionally approved',
        conditions: ['Must complete KYC within 24h', 'Limit to $5000'],
      });

      expect(decided.decision!.conditions).toEqual([
        'Must complete KYC within 24h',
        'Limit to $5000',
      ]);
    });
  });
});
