import { describe, it, expect, afterEach } from 'vitest';
import { Kontext, ProvenanceManager } from '../src/index.js';
import type { CreateSessionInput, HumanAttestation } from '../src/index.js';

function createClient(plan: 'free' | 'pro' | 'enterprise' = 'free') {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
    plan,
  });
}

function createAttestation(
  checkpointId: string,
  decision: 'approved' | 'rejected' = 'approved',
): HumanAttestation {
  return {
    attestationId: 'att-' + Math.random().toString(36).slice(2, 8),
    checkpointId,
    reviewerId: 'user:reviewer',
    decision,
    evidence: 'Reviewed and approved',
    signature: {
      signature: 'test-signature-base64',
      algorithm: 'ES256',
      keyId: 'test-key-1',
    },
    verificationKey: {
      publicKey: 'test-public-key',
      algorithm: 'ES256',
      keyId: 'test-key-1',
    },
    timestamp: new Date().toISOString(),
  };
}

const SESSION_INPUT: CreateSessionInput = {
  agentId: 'payment-agent-v1',
  delegatedBy: 'user:alice',
  scope: ['transfer', 'approve'],
};

// ---------------------------------------------------------------------------
// 1. Session Delegation (Layer 1)
// ---------------------------------------------------------------------------

describe('Session Delegation', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  it('creates session with correct fields', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);

    expect(session.sessionId).toBeDefined();
    expect(session.agentId).toBe('payment-agent-v1');
    expect(session.delegatedBy).toBe('user:alice');
    expect(session.scope).toEqual(['transfer', 'approve']);
    expect(session.status).toBe('active');
    expect(session.createdAt).toBeDefined();
    expect(session.digest).toBeDefined();
    expect(session.priorDigest).toBeDefined();
  });

  it('records session creation in digest chain', async () => {
    kontext = createClient();
    const chainBefore = kontext.exportDigestChain();
    await kontext.createAgentSession(SESSION_INPUT);
    const chainAfter = kontext.exportDigestChain();

    expect(chainAfter.links.length).toBeGreaterThan(chainBefore.links.length);
  });

  it('getAgentSession returns session by ID', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    const found = kontext.getAgentSession(session.sessionId);

    expect(found).toBeDefined();
    expect(found!.sessionId).toBe(session.sessionId);
  });

  it('getAgentSession returns undefined for nonexistent ID', () => {
    kontext = createClient();
    expect(kontext.getAgentSession('nonexistent')).toBeUndefined();
  });

  it('getAgentSessions returns all sessions', async () => {
    kontext = createClient();
    await kontext.createAgentSession(SESSION_INPUT);
    await kontext.createAgentSession({ ...SESSION_INPUT, agentId: 'agent-2' });

    const sessions = kontext.getAgentSessions();
    expect(sessions.length).toBe(2);
  });

  it('endAgentSession sets status=ended and endedAt', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    const ended = await kontext.endAgentSession(session.sessionId);

    expect(ended.status).toBe('ended');
    expect(ended.endedAt).toBeDefined();
  });

  it('endAgentSession throws for nonexistent session', async () => {
    kontext = createClient();
    await expect(kontext.endAgentSession('nonexistent')).rejects.toThrow(/not found/i);
  });

  it('endAgentSession throws for already-ended session', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    await kontext.endAgentSession(session.sessionId);

    await expect(kontext.endAgentSession(session.sessionId)).rejects.toThrow(/already/i);
  });

  it('validateSessionScope returns true for in-scope action', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    expect(kontext.validateSessionScope(session.sessionId, 'transfer')).toBe(true);
  });

  it('validateSessionScope returns false for out-of-scope action', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    expect(kontext.validateSessionScope(session.sessionId, 'delete')).toBe(false);
  });

  it('validateSessionScope returns false for ended session', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    await kontext.endAgentSession(session.sessionId);

    expect(kontext.validateSessionScope(session.sessionId, 'transfer')).toBe(false);
  });

  it('auto-expires session with past expiresAt', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession({
      ...SESSION_INPUT,
      expiresIn: 1, // 1ms TTL
    });
    // Wait for expiry
    await new Promise((r) => setTimeout(r, 10));

    const found = kontext.getAgentSession(session.sessionId);
    expect(found!.status).toBe('expired');
  });

  it('throws for empty agentId', async () => {
    kontext = createClient();
    await expect(
      kontext.createAgentSession({ ...SESSION_INPUT, agentId: '' }),
    ).rejects.toThrow(/agentId/i);
  });

  it('throws for empty delegatedBy', async () => {
    kontext = createClient();
    await expect(
      kontext.createAgentSession({ ...SESSION_INPUT, delegatedBy: '' }),
    ).rejects.toThrow(/delegatedBy/i);
  });

  it('throws for empty scope', async () => {
    kontext = createClient();
    await expect(
      kontext.createAgentSession({ ...SESSION_INPUT, scope: [] }),
    ).rejects.toThrow(/scope/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Session Constraints
// ---------------------------------------------------------------------------

describe('Session Constraints', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  it('stores constraints on the session', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession({
      ...SESSION_INPUT,
      constraints: {
        maxAmount: '10000',
        allowedChains: ['base'],
        allowedTokens: ['USDC'],
        allowedRecipients: ['0xABC'],
      },
    });

    expect(session.constraints).toBeDefined();
    expect(session.constraints!.maxAmount).toBe('10000');
    expect(session.constraints!.allowedChains).toEqual(['base']);
    // Recipients normalized to lowercase
    expect(session.constraints!.allowedRecipients).toEqual(['0xabc']);
  });

  it('validateConstraints passes when amount is under maxAmount', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession({
      ...SESSION_INPUT,
      constraints: { maxAmount: '5000' },
    });

    // Access ProvenanceManager through getProvenanceBundle indirection --
    // but we can test via the exported ProvenanceManager directly
    // or simply by observing behavior. Use the private manager via cast:
    const manager = (kontext as any).getProvenanceManager() as InstanceType<typeof ProvenanceManager>;
    expect(manager.validateConstraints(session.sessionId, { amount: '1000' })).toBe(true);
  });

  it('validateConstraints fails when amount exceeds maxAmount', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession({
      ...SESSION_INPUT,
      constraints: { maxAmount: '5000' },
    });

    const manager = (kontext as any).getProvenanceManager() as InstanceType<typeof ProvenanceManager>;
    expect(manager.validateConstraints(session.sessionId, { amount: '10000' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Action Binding (Layer 2)
// ---------------------------------------------------------------------------

describe('Action Binding', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  it('log() with sessionId binds action to session', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);

    await kontext.log({
      type: 'transfer',
      description: 'Send USDC',
      agentId: 'payment-agent-v1',
      sessionId: session.sessionId,
    });

    const actions = kontext.getSessionActions(session.sessionId);
    // session-start action + the logged action
    const userActions = actions.filter((a) => a.type === 'transfer');
    expect(userActions.length).toBe(1);
  });

  it('getSessionActions returns only actions for that session', async () => {
    kontext = createClient();
    const s1 = await kontext.createAgentSession(SESSION_INPUT);
    const s2 = await kontext.createAgentSession({ ...SESSION_INPUT, agentId: 'agent-2' });

    await kontext.log({ type: 'a', description: 'A', agentId: 'agent-1', sessionId: s1.sessionId });
    await kontext.log({ type: 'b', description: 'B', agentId: 'agent-2', sessionId: s2.sessionId });

    const s1Actions = kontext.getSessionActions(s1.sessionId);
    const s2Actions = kontext.getSessionActions(s2.sessionId);

    expect(s1Actions.every((a) => a.sessionId === s1.sessionId)).toBe(true);
    expect(s2Actions.every((a) => a.sessionId === s2.sessionId)).toBe(true);
  });

  it('getSessionActions returns empty array for unknown session', () => {
    kontext = createClient();
    expect(kontext.getSessionActions('unknown-session')).toEqual([]);
  });

  it('verify() with sessionId binds transaction to session', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);

    await kontext.verify({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '500',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'payment-agent-v1',
      sessionId: session.sessionId,
    });

    const actions = kontext.getSessionActions(session.sessionId);
    const txActions = actions.filter((a) => a.type === 'transaction');
    expect(txActions.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Checkpoints & Attestation (Layer 3)
// ---------------------------------------------------------------------------

describe('Checkpoints & Attestation', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  async function createSessionWithActions() {
    const session = await kontext.createAgentSession(SESSION_INPUT);
    const a1 = await kontext.log({
      type: 'transfer',
      description: 'Transfer 1',
      agentId: 'payment-agent-v1',
      sessionId: session.sessionId,
    });
    const a2 = await kontext.log({
      type: 'approve',
      description: 'Approve 1',
      agentId: 'payment-agent-v1',
      sessionId: session.sessionId,
    });
    return { session, actionIds: [a1.id, a2.id] };
  }

  it('createCheckpoint creates checkpoint with computed actionsDigest', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();

    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'Batch review',
    });

    expect(cp.id).toBeDefined();
    expect(cp.sessionId).toBe(session.sessionId);
    expect(cp.actionIds).toEqual(actionIds);
    expect(cp.summary).toBe('Batch review');
    expect(cp.actionsDigest).toBeDefined();
    expect(cp.status).toBe('pending');
    expect(cp.createdAt).toBeDefined();
  });

  it('createCheckpoint throws for nonexistent session', async () => {
    kontext = createClient();
    await expect(
      kontext.createCheckpoint({ sessionId: 'nonexistent', actionIds: ['a'], summary: 'x' }),
    ).rejects.toThrow(/not found/i);
  });

  it('createCheckpoint throws for ended session', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();
    await kontext.endAgentSession(session.sessionId);

    await expect(
      kontext.createCheckpoint({ sessionId: session.sessionId, actionIds, summary: 'x' }),
    ).rejects.toThrow(/ended/i);
  });

  it('createCheckpoint throws for action not in session', async () => {
    kontext = createClient();
    const { session } = await createSessionWithActions();

    await expect(
      kontext.createCheckpoint({
        sessionId: session.sessionId,
        actionIds: ['nonexistent-action'],
        summary: 'x',
      }),
    ).rejects.toThrow(/not found in session/i);
  });

  it('createCheckpoint throws for empty actionIds', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);

    await expect(
      kontext.createCheckpoint({ sessionId: session.sessionId, actionIds: [], summary: 'x' }),
    ).rejects.toThrow(/at least one action/i);
  });

  it('createCheckpoint throws for empty summary', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();

    await expect(
      kontext.createCheckpoint({ sessionId: session.sessionId, actionIds, summary: '' }),
    ).rejects.toThrow(/summary/i);
  });

  it('actionsDigest is deterministic for same actions', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();

    const cp1 = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'First',
    });
    const cp2 = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'Second',
    });

    expect(cp1.actionsDigest).toBe(cp2.actionsDigest);
  });

  it('attachAttestation with approved sets status=attested', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();
    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'Review batch',
    });

    const attested = await kontext.attachAttestation(cp.id, createAttestation(cp.id, 'approved'));
    expect(attested.status).toBe('attested');
    expect(attested.attestation).toBeDefined();
  });

  it('attachAttestation with rejected sets status=rejected', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();
    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'Review batch',
    });

    const rejected = await kontext.attachAttestation(cp.id, createAttestation(cp.id, 'rejected'));
    expect(rejected.status).toBe('rejected');
  });

  it('attachAttestation throws for nonexistent checkpoint', async () => {
    kontext = createClient();
    await expect(
      kontext.attachAttestation('nonexistent', createAttestation('nonexistent')),
    ).rejects.toThrow(/not found/i);
  });

  it('attachAttestation throws for already-attested checkpoint', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();
    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'Review',
    });
    await kontext.attachAttestation(cp.id, createAttestation(cp.id));

    await expect(
      kontext.attachAttestation(cp.id, createAttestation(cp.id)),
    ).rejects.toThrow(/already/i);
  });

  it('attachAttestation throws for mismatched checkpointId', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();
    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'Review',
    });

    await expect(
      kontext.attachAttestation(cp.id, createAttestation('wrong-id')),
    ).rejects.toThrow(/mismatch/i);
  });

  it('getCheckpoint returns checkpoint by ID', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();
    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'Review',
    });

    const found = kontext.getCheckpoint(cp.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(cp.id);
  });

  it('getCheckpoints filters by sessionId', async () => {
    kontext = createClient();
    const { session, actionIds } = await createSessionWithActions();
    await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds,
      summary: 'A',
    });

    const filtered = kontext.getCheckpoints(session.sessionId);
    expect(filtered.length).toBe(1);
    expect(filtered[0]!.sessionId).toBe(session.sessionId);

    const all = kontext.getCheckpoints();
    expect(all.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Bundle Export
// ---------------------------------------------------------------------------

describe('Provenance Bundle', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  it('getProvenanceBundle includes session, actions, checkpoints, verification', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    const action = await kontext.log({
      type: 'transfer',
      description: 'Send USDC',
      agentId: 'payment-agent-v1',
      sessionId: session.sessionId,
    });

    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds: [action.id],
      summary: 'Review transfers',
    });
    await kontext.attachAttestation(cp.id, createAttestation(cp.id));

    const bundle = kontext.getProvenanceBundle(session.sessionId);

    expect(bundle.session.sessionId).toBe(session.sessionId);
    expect(bundle.actions.length).toBeGreaterThan(0);
    expect(bundle.checkpoints.length).toBe(1);
    expect(bundle.verification).toBeDefined();
    expect(bundle.generatedAt).toBeDefined();
  });

  it('bundle verification counts humanAttested correctly', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    const a1 = await kontext.log({ type: 'x', description: 'X', agentId: 'a', sessionId: session.sessionId });
    const a2 = await kontext.log({ type: 'y', description: 'Y', agentId: 'a', sessionId: session.sessionId });

    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds: [a1.id, a2.id],
      summary: 'Batch',
    });
    await kontext.attachAttestation(cp.id, createAttestation(cp.id));

    const bundle = kontext.getProvenanceBundle(session.sessionId);
    expect(bundle.verification.humanAttested).toBe(2);
    expect(bundle.verification.unattested).toBe(0);
  });

  it('bundle verification counts unattested correctly', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    await kontext.log({ type: 'x', description: 'X', agentId: 'a', sessionId: session.sessionId });

    const bundle = kontext.getProvenanceBundle(session.sessionId);
    expect(bundle.verification.unattested).toBe(1);
    expect(bundle.verification.humanAttested).toBe(0);
  });

  it('getProvenanceBundle throws for nonexistent session', () => {
    kontext = createClient();
    expect(() => kontext.getProvenanceBundle('nonexistent')).toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// 6. Digest Chain Integration
// ---------------------------------------------------------------------------

describe('Digest Chain Integration', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  it('full lifecycle: session -> actions -> checkpoint -> attestation -> valid chain', async () => {
    kontext = createClient();

    // Create session
    const session = await kontext.createAgentSession(SESSION_INPUT);

    // Log actions
    const a1 = await kontext.log({
      type: 'transfer',
      description: 'Transfer A',
      agentId: 'payment-agent-v1',
      sessionId: session.sessionId,
    });

    // Create checkpoint
    const cp = await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds: [a1.id],
      summary: 'Lifecycle review',
    });

    // Attach attestation
    await kontext.attachAttestation(cp.id, createAttestation(cp.id));

    // End session
    await kontext.endAgentSession(session.sessionId);

    // Verify chain integrity
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
  });

  it('session-start, session-end, checkpoint events appear in digest chain', async () => {
    kontext = createClient();
    const session = await kontext.createAgentSession(SESSION_INPUT);
    const action = await kontext.log({
      type: 'transfer',
      description: 'X',
      agentId: 'payment-agent-v1',
      sessionId: session.sessionId,
    });

    await kontext.createCheckpoint({
      sessionId: session.sessionId,
      actionIds: [action.id],
      summary: 'Review',
    });
    await kontext.endAgentSession(session.sessionId);

    const actions = kontext.getActions();
    const types = actions.map((a) => a.type);

    expect(types).toContain('session-start');
    expect(types).toContain('session-end');
    expect(types).toContain('checkpoint-created');
  });
});
