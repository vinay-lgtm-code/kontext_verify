// ============================================================================
// Kontext SDK - Approval Manager (Human-in-the-Loop)
// ============================================================================

import type {
  ApprovalPolicy,
  ApprovalPolicyType,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalEvaluation,
  EvaluateApprovalInput,
  SubmitDecisionInput,
} from './types.js';
import { KontextError, KontextErrorCode } from './types.js';
import { generateId, now } from './utils.js';

/** Default approval request expiration: 1 hour */
const DEFAULT_EXPIRATION_MS = 60 * 60 * 1000;

/** Severity ordering for anomaly severity comparison */
const SEVERITY_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * ApprovalManager evaluates proposed actions against configurable policies
 * and blocks execution until a human reviewer approves or rejects.
 *
 * Policies:
 * - **amount-threshold** — triggers when amount exceeds a configured threshold
 * - **low-trust-score** — triggers when the agent's trust score is below minimum
 * - **anomaly-detected** — triggers when anomalies of sufficient severity are present
 * - **new-destination** — triggers when the destination address has not been seen before
 * - **manual** — always triggers, requiring explicit human approval
 *
 * @example
 * ```typescript
 * const manager = new ApprovalManager([
 *   { type: 'amount-threshold', enabled: true, params: { threshold: '10000' } },
 *   { type: 'manual', enabled: false, params: {} },
 * ]);
 *
 * const evaluation = manager.evaluate({
 *   actionId: 'action-1',
 *   agentId: 'agent-1',
 *   amount: '25000',
 * });
 *
 * if (evaluation.required) {
 *   // Wait for human decision
 *   const request = manager.submitDecision({
 *     requestId: evaluation.requestId!,
 *     decision: 'approve',
 *     decidedBy: 'admin@example.com',
 *     reason: 'Verified recipient',
 *   });
 * }
 * ```
 */
export class ApprovalManager {
  private readonly policies: ApprovalPolicy[];
  private readonly expiresInMs: number;
  private readonly requests: Map<string, ApprovalRequest> = new Map();
  private readonly seenDestinations: Set<string> = new Set();

  constructor(policies: ApprovalPolicy[], expiresInMs?: number) {
    this.policies = policies;
    this.expiresInMs = expiresInMs ?? DEFAULT_EXPIRATION_MS;
  }

  /**
   * Evaluate an action against all enabled policies.
   * If any policy triggers, an ApprovalRequest is created and the evaluation
   * returns `required: true` with the request ID.
   *
   * @param input - Action details to evaluate
   * @returns Evaluation result indicating whether approval is required
   */
  evaluate(input: EvaluateApprovalInput): ApprovalEvaluation {
    const triggeredPolicies: ApprovalPolicyType[] = [];
    const riskFactors: string[] = [];

    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      const result = this.evaluatePolicy(policy, input);
      if (result.triggered) {
        triggeredPolicies.push(policy.type);
        riskFactors.push(...result.factors);
      }
    }

    // Track new destinations after evaluation (so first call triggers, second does not)
    if (input.destination) {
      this.seenDestinations.add(input.destination);
    }

    const riskScore = this.calculateRiskScore(triggeredPolicies);

    const riskAssessment = { score: riskScore, factors: riskFactors };

    if (triggeredPolicies.length === 0) {
      return {
        required: false,
        triggeredPolicies: [],
        riskAssessment,
      };
    }

    // Collect required evidence from all triggered policies
    const requiredEvidence = this.collectRequiredEvidence(triggeredPolicies);

    const request: ApprovalRequest = {
      id: generateId(),
      actionId: input.actionId,
      agentId: input.agentId,
      status: 'pending',
      triggeredPolicies,
      riskAssessment,
      requiredEvidence,
      decision: null,
      createdAt: now(),
      expiresAt: new Date(Date.now() + this.expiresInMs).toISOString(),
      metadata: input.metadata ?? {},
    };

    this.requests.set(request.id, request);

    return {
      required: true,
      requestId: request.id,
      triggeredPolicies,
      riskAssessment,
    };
  }

  /**
   * Submit a human decision on a pending approval request.
   *
   * @param input - Decision details
   * @returns The updated ApprovalRequest
   * @throws KontextError if request not found, expired, or missing required evidence
   */
  submitDecision(input: SubmitDecisionInput): ApprovalRequest {
    const request = this.requests.get(input.requestId);

    if (!request) {
      throw new KontextError(
        KontextErrorCode.APPROVAL_NOT_FOUND,
        `Approval request not found: ${input.requestId}`,
        { requestId: input.requestId },
      );
    }

    // Check if request has expired
    if (new Date(request.expiresAt) < new Date()) {
      request.status = 'expired';
      this.requests.set(request.id, request);
      throw new KontextError(
        KontextErrorCode.APPROVAL_EXPIRED,
        `Approval request has expired: ${input.requestId}`,
        { requestId: input.requestId, expiresAt: request.expiresAt },
      );
    }

    // Validate required evidence when approving
    if (input.decision === 'approve' && request.requiredEvidence.length > 0) {
      const missingEvidence = request.requiredEvidence.filter((key) => {
        if (!input.evidence) return true;
        const value = input.evidence[key];
        return value === undefined || value === null;
      });

      if (missingEvidence.length > 0) {
        throw new KontextError(
          KontextErrorCode.INSUFFICIENT_EVIDENCE,
          `Missing required evidence: ${missingEvidence.join(', ')}`,
          { requestId: input.requestId, missingEvidence },
        );
      }
    }

    const decision: ApprovalDecision = {
      decision: input.decision,
      decidedBy: input.decidedBy,
      reason: input.reason,
      evidence: input.evidence,
      conditions: input.conditions,
      decidedAt: now(),
    };

    request.status = input.decision === 'approve' ? 'approved' : 'rejected';
    request.decision = decision;
    this.requests.set(request.id, request);

    return request;
  }

  /**
   * Get an approval request by ID.
   *
   * @param requestId - The approval request identifier
   * @returns The approval request, or undefined if not found
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get all pending approval requests.
   *
   * @returns Array of pending approval requests
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.status === 'pending');
  }

  /**
   * Get all approval requests for a specific agent.
   *
   * @param agentId - The agent identifier
   * @returns Array of approval requests for the agent
   */
  getRequestsByAgent(agentId: string): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.agentId === agentId);
  }

  /**
   * Check if an approval request has been approved.
   *
   * @param requestId - The approval request identifier
   * @returns Whether the request is approved
   */
  isApproved(requestId: string): boolean {
    const request = this.requests.get(requestId);
    return request?.status === 'approved';
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private evaluatePolicy(
    policy: ApprovalPolicy,
    input: EvaluateApprovalInput,
  ): { triggered: boolean; factors: string[] } {
    switch (policy.type) {
      case 'amount-threshold':
        return this.evaluateAmountThreshold(policy, input);
      case 'low-trust-score':
        return this.evaluateLowTrustScore(policy, input);
      case 'anomaly-detected':
        return this.evaluateAnomalyDetected(policy, input);
      case 'new-destination':
        return this.evaluateNewDestination(policy, input);
      case 'manual':
        return { triggered: true, factors: ['Manual approval required'] };
      default:
        return { triggered: false, factors: [] };
    }
  }

  private evaluateAmountThreshold(
    policy: ApprovalPolicy,
    input: EvaluateApprovalInput,
  ): { triggered: boolean; factors: string[] } {
    if (input.amount === undefined) return { triggered: false, factors: [] };

    const threshold = parseFloat(policy.params.threshold as string);
    const amount = parseFloat(input.amount);

    if (amount > threshold) {
      return {
        triggered: true,
        factors: [`Amount exceeds threshold of ${threshold}`],
      };
    }

    return { triggered: false, factors: [] };
  }

  private evaluateLowTrustScore(
    policy: ApprovalPolicy,
    input: EvaluateApprovalInput,
  ): { triggered: boolean; factors: string[] } {
    if (input.trustScore === undefined) return { triggered: false, factors: [] };

    const minScore = policy.params.minScore as number;

    if (input.trustScore < minScore) {
      return {
        triggered: true,
        factors: [`Trust score ${input.trustScore} below minimum ${minScore}`],
      };
    }

    return { triggered: false, factors: [] };
  }

  private evaluateAnomalyDetected(
    policy: ApprovalPolicy,
    input: EvaluateApprovalInput,
  ): { triggered: boolean; factors: string[] } {
    if (!input.anomalies || input.anomalies.length === 0) {
      return { triggered: false, factors: [] };
    }

    const minSeverity = policy.params.minSeverity as string;
    const minSeverityOrder = SEVERITY_ORDER[minSeverity] ?? 0;

    const matchingAnomalies = input.anomalies.filter((a) => {
      const severityOrder = SEVERITY_ORDER[a.severity] ?? 0;
      return severityOrder >= minSeverityOrder;
    });

    if (matchingAnomalies.length > 0) {
      const factors = matchingAnomalies.map(
        (a) => `Anomaly detected: ${a.type} (${a.severity})`,
      );
      return { triggered: true, factors };
    }

    return { triggered: false, factors: [] };
  }

  private evaluateNewDestination(
    _policy: ApprovalPolicy,
    input: EvaluateApprovalInput,
  ): { triggered: boolean; factors: string[] } {
    if (!input.destination) return { triggered: false, factors: [] };

    if (!this.seenDestinations.has(input.destination)) {
      return {
        triggered: true,
        factors: [`New destination address: ${input.destination}`],
      };
    }

    return { triggered: false, factors: [] };
  }

  private calculateRiskScore(triggeredPolicies: ApprovalPolicyType[]): number {
    const baseScore = triggeredPolicies.length * 25;
    const hasAmountThreshold = triggeredPolicies.includes('amount-threshold');
    const hasLowTrust = triggeredPolicies.includes('low-trust-score');
    const hasAnomaly = triggeredPolicies.includes('anomaly-detected');

    return Math.min(
      100,
      baseScore +
        (hasAmountThreshold ? 20 : 0) +
        (hasLowTrust ? 30 : 0) +
        (hasAnomaly ? 25 : 0),
    );
  }

  private collectRequiredEvidence(triggeredPolicies: ApprovalPolicyType[]): string[] {
    const evidenceSet = new Set<string>();

    for (const policy of this.policies) {
      if (triggeredPolicies.includes(policy.type) && policy.requiredEvidence) {
        for (const evidence of policy.requiredEvidence) {
          evidenceSet.add(evidence);
        }
      }
    }

    return Array.from(evidenceSet);
  }
}
