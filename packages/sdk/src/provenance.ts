// ============================================================================
// Kontext SDK - Agent Provenance Manager
// ============================================================================
// Implements the 3-layer provenance model:
// Layer 1: Session delegation (human -> agent with scoped authority)
// Layer 2: Action binding (existing log/verify actions linked to sessions)
// Layer 3: Human attestation checkpoints (cryptographic review proof)

import { createHash } from 'crypto';
import type {
  AgentSession,
  CreateSessionInput,
  ProvenanceCheckpoint,
  CreateCheckpointInput,
  HumanAttestation,
  ProvenanceBundle,
  ProvenanceAction,
  ProvenanceBundleVerification,
  ActionLog,
} from './types.js';
import { KontextError, KontextErrorCode } from './types.js';
import type { KontextStore } from './store.js';
import type { ActionLogger } from './logger.js';
import { generateId, now, parseAmount } from './utils.js';

/**
 * Manages agent provenance across three layers:
 * - Layer 1: Session delegation (who authorized the agent)
 * - Layer 2: Action binding (actions linked to sessions via sessionId)
 * - Layer 3: Human attestation checkpoints (cryptographic review proof)
 */
export class ProvenanceManager {
  private readonly store: KontextStore;
  private readonly logger: ActionLogger;

  constructor(store: KontextStore, logger: ActionLogger) {
    this.store = store;
    this.logger = logger;
  }

  // --------------------------------------------------------------------------
  // Layer 1: Session Delegation
  // --------------------------------------------------------------------------

  /**
   * Create a delegated agent session. Records the delegation in the
   * tamper-evident digest chain as the session's genesis event.
   */
  async createSession(input: CreateSessionInput): Promise<AgentSession> {
    if (!input.agentId) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, 'agentId is required');
    }
    if (!input.delegatedBy) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, 'delegatedBy is required');
    }
    if (!input.scope || input.scope.length === 0) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, 'scope must contain at least one capability');
    }

    const sessionId = generateId();
    const createdAt = now();

    // Normalize allowedRecipients to lowercase
    const constraints = input.constraints
      ? {
          ...input.constraints,
          ...(input.constraints.allowedRecipients
            ? { allowedRecipients: input.constraints.allowedRecipients.map((a) => a.toLowerCase()) }
            : {}),
        }
      : undefined;

    const session: AgentSession = {
      sessionId,
      agentId: input.agentId,
      delegatedBy: input.delegatedBy,
      scope: [...input.scope],
      ...(constraints ? { constraints } : {}),
      status: 'active',
      createdAt,
      ...(input.expiresIn ? { expiresAt: new Date(Date.now() + input.expiresIn).toISOString() } : {}),
      metadata: input.metadata ? { ...input.metadata } : {},
    };

    // Log session-start into digest chain
    const action = await this.logger.log({
      type: 'session-start',
      description: `Session created: ${input.agentId} delegated by ${input.delegatedBy}`,
      agentId: input.agentId,
      sessionId,
      metadata: {
        delegatedBy: input.delegatedBy,
        scope: input.scope,
        ...(constraints ? { constraints } : {}),
      },
    });

    session.digest = action.digest;
    session.priorDigest = action.priorDigest;

    this.store.addSession(session);
    return { ...session, scope: [...session.scope] };
  }

  /**
   * Get an agent session by ID. Automatically marks expired sessions.
   */
  getSession(sessionId: string): AgentSession | undefined {
    const session = this.store.getSession(sessionId);
    if (!session) return undefined;

    // Auto-expire
    if (session.status === 'active' && session.expiresAt && new Date(session.expiresAt) < new Date()) {
      this.store.updateSession(sessionId, { status: 'expired' });
      return { ...session, status: 'expired', scope: [...session.scope] };
    }

    return { ...session, scope: [...session.scope] };
  }

  /**
   * Get all agent sessions.
   */
  getSessions(): AgentSession[] {
    return this.store.getSessions().map((s) => {
      // Auto-expire
      if (s.status === 'active' && s.expiresAt && new Date(s.expiresAt) < new Date()) {
        this.store.updateSession(s.sessionId, { status: 'expired' });
        return { ...s, status: 'expired' as const, scope: [...s.scope] };
      }
      return { ...s, scope: [...s.scope] };
    });
  }

  /**
   * End an active agent session. Records the termination in the digest chain.
   */
  async endSession(sessionId: string): Promise<AgentSession> {
    const session = this.store.getSession(sessionId);
    if (!session) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Session not found: ${sessionId}`);
    }
    if (session.status !== 'active') {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Session is already ${session.status}: ${sessionId}`);
    }

    const endedAt = now();

    // Log session-end into digest chain
    await this.logger.log({
      type: 'session-end',
      description: `Session ended: ${session.agentId}`,
      agentId: session.agentId,
      sessionId,
      metadata: { delegatedBy: session.delegatedBy },
    });

    const updated = this.store.updateSession(sessionId, { status: 'ended', endedAt });
    if (!updated) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Failed to update session: ${sessionId}`);
    }

    return { ...updated, scope: [...updated.scope] };
  }

  /**
   * Check whether an action is within a session's delegated scope.
   */
  validateScope(sessionId: string, action: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== 'active') return false;
    return session.scope.includes(action);
  }

  /**
   * Check whether a transaction meets session constraints.
   */
  validateConstraints(
    sessionId: string,
    input: { amount?: string; chain?: string; token?: string; to?: string },
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== 'active') return false;
    if (!session.constraints) return true;

    const c = session.constraints;

    if (c.maxAmount && input.amount) {
      if (parseAmount(input.amount) > parseAmount(c.maxAmount)) return false;
    }
    if (c.allowedChains && input.chain) {
      if (!c.allowedChains.includes(input.chain as any)) return false;
    }
    if (c.allowedTokens && input.token) {
      if (!c.allowedTokens.includes(input.token as any)) return false;
    }
    if (c.allowedRecipients && input.to) {
      if (!c.allowedRecipients.includes(input.to.toLowerCase())) return false;
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // Layer 3: Checkpoints & Human Attestation
  // --------------------------------------------------------------------------

  /**
   * Create a provenance checkpoint -- a review point where a human
   * can attest to a batch of agent actions.
   */
  async createCheckpoint(input: CreateCheckpointInput): Promise<ProvenanceCheckpoint> {
    const session = this.getSession(input.sessionId);
    if (!session) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Session not found: ${input.sessionId}`);
    }
    if (session.status !== 'active') {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Session is ${session.status}: ${input.sessionId}`);
    }
    if (!input.actionIds || input.actionIds.length === 0) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, 'actionIds must contain at least one action');
    }
    if (!input.summary) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, 'summary is required');
    }

    // Validate all action IDs exist and belong to this session
    const sessionActions = this.store.getActionsBySession(input.sessionId);
    const sessionActionIds = new Set(sessionActions.map((a) => a.id));

    for (const actionId of input.actionIds) {
      if (!sessionActionIds.has(actionId)) {
        throw new KontextError(
          KontextErrorCode.VALIDATION_ERROR,
          `Action ${actionId} not found in session ${input.sessionId}`,
        );
      }
    }

    // Compute actionsDigest: SHA-256 of sorted action digests concatenated
    const actionDigests = input.actionIds
      .map((id) => {
        const action = sessionActions.find((a) => a.id === id);
        return action?.digest ?? '';
      })
      .sort();

    const hash = createHash('sha256');
    hash.update(actionDigests.join(''));
    const actionsDigest = hash.digest('hex');

    const checkpointId = generateId();
    const createdAt = now();

    const checkpoint: ProvenanceCheckpoint = {
      id: checkpointId,
      sessionId: input.sessionId,
      actionIds: [...input.actionIds],
      summary: input.summary,
      actionsDigest,
      status: 'pending',
      createdAt,
      ...(input.expiresIn ? { expiresAt: new Date(Date.now() + input.expiresIn).toISOString() } : {}),
    };

    // Log checkpoint-created into digest chain
    await this.logger.log({
      type: 'checkpoint-created',
      description: `Checkpoint created: ${input.summary}`,
      agentId: session.agentId,
      sessionId: input.sessionId,
      metadata: {
        checkpointId,
        actionCount: input.actionIds.length,
        actionsDigest,
      },
    });

    this.store.addCheckpoint(checkpoint);
    return { ...checkpoint, actionIds: [...checkpoint.actionIds] };
  }

  /**
   * Attach an externally-produced human attestation to a checkpoint.
   * The attestation includes a cryptographic signature that the agent
   * never touches -- key separation is the critical security property.
   */
  async attachAttestation(checkpointId: string, attestation: HumanAttestation): Promise<ProvenanceCheckpoint> {
    const checkpoint = this.store.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Checkpoint not found: ${checkpointId}`);
    }

    // Auto-expire
    if (checkpoint.status === 'pending' && checkpoint.expiresAt && new Date(checkpoint.expiresAt) < new Date()) {
      this.store.updateCheckpoint(checkpointId, { status: 'expired' });
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Checkpoint expired: ${checkpointId}`);
    }

    if (checkpoint.status !== 'pending') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Checkpoint is already ${checkpoint.status}: ${checkpointId}`,
      );
    }
    if (attestation.checkpointId !== checkpointId) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Attestation checkpointId mismatch: expected ${checkpointId}, got ${attestation.checkpointId}`,
      );
    }

    const newStatus = attestation.decision === 'approved' ? 'attested' : 'rejected';

    const session = this.store.getSession(checkpoint.sessionId);
    const agentId = session?.agentId ?? 'unknown';

    // Log attestation into digest chain
    await this.logger.log({
      type: `checkpoint-${newStatus}`,
      description: `Checkpoint ${newStatus} by ${attestation.reviewerId}`,
      agentId,
      sessionId: checkpoint.sessionId,
      metadata: {
        checkpointId,
        reviewerId: attestation.reviewerId,
        decision: attestation.decision,
        attestationId: attestation.attestationId,
      },
    });

    const updated = this.store.updateCheckpoint(checkpointId, {
      status: newStatus as any,
      attestation,
    });

    if (!updated) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Failed to update checkpoint: ${checkpointId}`);
    }

    return { ...updated, actionIds: [...updated.actionIds] };
  }

  /**
   * Get a checkpoint by ID. Automatically marks expired checkpoints.
   */
  getCheckpoint(checkpointId: string): ProvenanceCheckpoint | undefined {
    const cp = this.store.getCheckpoint(checkpointId);
    if (!cp) return undefined;

    // Auto-expire
    if (cp.status === 'pending' && cp.expiresAt && new Date(cp.expiresAt) < new Date()) {
      this.store.updateCheckpoint(checkpointId, { status: 'expired' });
      return { ...cp, status: 'expired', actionIds: [...cp.actionIds] };
    }

    return { ...cp, actionIds: [...cp.actionIds] };
  }

  /**
   * Get all checkpoints, optionally filtered by session.
   */
  getCheckpoints(sessionId?: string): ProvenanceCheckpoint[] {
    const all = sessionId
      ? this.store.queryCheckpoints((cp) => cp.sessionId === sessionId)
      : this.store.getCheckpoints();

    return all.map((cp) => {
      // Auto-expire
      if (cp.status === 'pending' && cp.expiresAt && new Date(cp.expiresAt) < new Date()) {
        this.store.updateCheckpoint(cp.id, { status: 'expired' });
        return { ...cp, status: 'expired' as const, actionIds: [...cp.actionIds] };
      }
      return { ...cp, actionIds: [...cp.actionIds] };
    });
  }

  // --------------------------------------------------------------------------
  // Provenance Bundle Export
  // --------------------------------------------------------------------------

  /**
   * Export the full provenance bundle for a session.
   */
  getProvenanceBundle(sessionId: string): ProvenanceBundle {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new KontextError(KontextErrorCode.VALIDATION_ERROR, `Session not found: ${sessionId}`);
    }

    const sessionActions = this.store.getActionsBySession(sessionId);
    const checkpoints = this.getCheckpoints(sessionId);

    // Build provenance actions
    const actions: ProvenanceAction[] = sessionActions
      .filter((a) => a.digest && a.priorDigest)
      .map((a) => ({
        actionId: a.id,
        type: a.type,
        digest: a.digest!,
        priorDigest: a.priorDigest!,
        sessionId,
        timestamp: a.timestamp,
      }));

    // Compute attestation coverage
    const attestedCheckpoints = checkpoints.filter((cp) => cp.status === 'attested');
    const attestedActionIds = new Set<string>();
    for (const cp of attestedCheckpoints) {
      for (const actionId of cp.actionIds) {
        attestedActionIds.add(actionId);
      }
    }

    // Non-provenance-internal actions (exclude session-start, session-end, checkpoint-* events)
    const userActions = sessionActions.filter(
      (a) => !a.type.startsWith('session-') && !a.type.startsWith('checkpoint-'),
    );

    const verification: ProvenanceBundleVerification = {
      digestChainValid: this.logger.verifyChain(this.store.getActions()).valid,
      totalActions: userActions.length,
      humanAttested: userActions.filter((a) => attestedActionIds.has(a.id)).length,
      sessionScoped: userActions.length,
      unattested: userActions.filter((a) => !attestedActionIds.has(a.id)).length,
    };

    return {
      session,
      actions,
      checkpoints,
      verification,
      generatedAt: now(),
    };
  }
}
