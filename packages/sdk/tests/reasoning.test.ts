import { describe, it, expect, afterEach } from 'vitest';
import { Kontext, KontextError } from '../src/index.js';
import type { LogReasoningInput } from '../src/index.js';

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
  });
}

describe('Agent Reasoning', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should log a reasoning entry', async () => {
    kontext = createClient();

    const entry = await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Recipient is a verified vendor with 50+ prior transactions',
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.agentId).toBe('agent-1');
    expect(entry.action).toBe('approve_transfer');
    expect(entry.reasoning).toBe('Recipient is a verified vendor with 50+ prior transactions');
    expect(entry.confidence).toBe(1.0); // default
    expect(entry.context).toEqual({});
  });

  it('should log reasoning with confidence and context', async () => {
    kontext = createClient();

    const entry = await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'flag_transaction',
      reasoning: 'Unusual amount detected for this recipient',
      confidence: 0.75,
      context: { recipientId: 'vendor-42', amount: '50000' },
    });

    expect(entry.confidence).toBe(0.75);
    expect(entry.context).toEqual({ recipientId: 'vendor-42', amount: '50000' });
  });

  it('should include reasoning in the digest chain', async () => {
    kontext = createClient();

    const digestBefore = kontext.getTerminalDigest();

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Known recipient',
    });

    const digestAfter = kontext.getTerminalDigest();
    expect(digestAfter).not.toBe(digestBefore);

    // Verify the chain is valid
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
  });

  it('should store reasoning as action log entries with type "reasoning"', async () => {
    kontext = createClient();

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Known vendor',
    });

    const actions = kontext.getActions();
    const reasoningActions = actions.filter((a) => a.type === 'reasoning');
    expect(reasoningActions.length).toBe(1);
    expect(reasoningActions[0]!.metadata.action).toBe('approve_transfer');
    expect(reasoningActions[0]!.metadata.reasoning).toBe('Known vendor');
  });

  it('should retrieve reasoning entries for an agent', async () => {
    kontext = createClient();

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Known vendor',
      confidence: 0.9,
    });

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'block_transfer',
      reasoning: 'Suspicious destination',
      confidence: 0.6,
    });

    await kontext.logReasoning({
      agentId: 'agent-2',
      action: 'approve_transfer',
      reasoning: 'Standard payroll',
    });

    const agent1Entries = kontext.getReasoningEntries('agent-1');
    expect(agent1Entries.length).toBe(2);
    expect(agent1Entries[0]!.action).toBe('approve_transfer');
    expect(agent1Entries[1]!.action).toBe('block_transfer');

    const agent2Entries = kontext.getReasoningEntries('agent-2');
    expect(agent2Entries.length).toBe(1);
  });

  it('should return empty array for agent with no reasoning', async () => {
    kontext = createClient();

    const entries = kontext.getReasoningEntries('nonexistent-agent');
    expect(entries).toEqual([]);
  });

  it('should reject missing agentId', async () => {
    kontext = createClient();

    await expect(
      kontext.logReasoning({
        agentId: '',
        action: 'approve_transfer',
        reasoning: 'Known vendor',
      }),
    ).rejects.toThrow(KontextError);
  });

  it('should reject missing action', async () => {
    kontext = createClient();

    await expect(
      kontext.logReasoning({
        agentId: 'agent-1',
        action: '',
        reasoning: 'Known vendor',
      }),
    ).rejects.toThrow(KontextError);
  });

  it('should reject missing reasoning', async () => {
    kontext = createClient();

    await expect(
      kontext.logReasoning({
        agentId: 'agent-1',
        action: 'approve_transfer',
        reasoning: '',
      }),
    ).rejects.toThrow(KontextError);
  });

  it('should reject confidence out of range', async () => {
    kontext = createClient();

    await expect(
      kontext.logReasoning({
        agentId: 'agent-1',
        action: 'approve_transfer',
        reasoning: 'Known vendor',
        confidence: 1.5,
      }),
    ).rejects.toThrow(KontextError);

    await expect(
      kontext.logReasoning({
        agentId: 'agent-1',
        action: 'approve_transfer',
        reasoning: 'Known vendor',
        confidence: -0.1,
      }),
    ).rejects.toThrow(KontextError);
  });

  it('should allow confidence of exactly 0 and 1', async () => {
    kontext = createClient();

    const entry0 = await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'guess',
      reasoning: 'No idea',
      confidence: 0,
    });
    expect(entry0.confidence).toBe(0);

    const entry1 = await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve',
      reasoning: 'Certain',
      confidence: 1,
    });
    expect(entry1.confidence).toBe(1);
  });

  it('should preserve reasoning entries through digest chain verification', async () => {
    kontext = createClient();

    // Log some mixed actions
    await kontext.log({
      type: 'transfer',
      description: 'Transfer initiated',
      agentId: 'agent-1',
    });

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Verified vendor',
      confidence: 0.95,
    });

    await kontext.log({
      type: 'confirmation',
      description: 'Transfer confirmed',
      agentId: 'agent-1',
    });

    // Verify chain integrity with mixed action types
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
    expect(verification.linksVerified).toBe(3);
  });
});

describe('Session ID tracing', () => {
  let kontext: Kontext;

  afterEach(async () => {
    if (kontext) await kontext.destroy();
  });

  it('generateSessionId() returns unique IDs', () => {
    const a = Kontext.generateSessionId();
    const b = Kontext.generateSessionId();
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });

  it('sessionId is stored on reasoning action log entries', async () => {
    kontext = createClient();
    const sessionId = Kontext.generateSessionId();

    await kontext.logReasoning({
      agentId: 'agent-1',
      sessionId,
      action: 'decide',
      reasoning: 'Decided to proceed.',
    });

    const actions = kontext.getActions();
    const reasoning = actions.find((a) => a.type === 'reasoning');
    expect(reasoning?.sessionId).toBe(sessionId);
  });

  it('getReasoningEntries() filters by sessionId', async () => {
    kontext = createClient();
    const sessionA = Kontext.generateSessionId();
    const sessionB = Kontext.generateSessionId();

    await kontext.logReasoning({ agentId: 'agent-1', sessionId: sessionA, action: 'a', reasoning: 'r' });
    await kontext.logReasoning({ agentId: 'agent-1', sessionId: sessionB, action: 'b', reasoning: 'r' });
    await kontext.logReasoning({ agentId: 'agent-1', action: 'c', reasoning: 'r' });

    const sessionAOnly = kontext.getReasoningEntries('agent-1', sessionA);
    expect(sessionAOnly).toHaveLength(1);
    expect(sessionAOnly[0]?.action).toBe('a');

    const all = kontext.getReasoningEntries('agent-1');
    expect(all).toHaveLength(3);
  });

  it('step + parentStep link reasoning entries in a trace', async () => {
    kontext = createClient();
    const sessionId = Kontext.generateSessionId();

    await kontext.logReasoning({ agentId: 'agent-1', sessionId, step: 1, action: 'plan', reasoning: 'r' });
    await kontext.logReasoning({ agentId: 'agent-1', sessionId, step: 2, parentStep: 1, action: 'execute', reasoning: 'r' });
    await kontext.logReasoning({ agentId: 'agent-1', sessionId, step: 3, parentStep: 2, action: 'confirm', reasoning: 'r' });

    const entries = kontext.getReasoningEntries('agent-1', sessionId);
    expect(entries).toHaveLength(3);
    expect(entries[0]?.step).toBe(1);
    expect(entries[1]?.parentStep).toBe(1);
    expect(entries[2]?.parentStep).toBe(2);
  });

  it('full agent trace: logReasoning + verify() share a sessionId in the digest chain', async () => {
    kontext = createClient();
    const sessionId = Kontext.generateSessionId();

    // Step 1: agent reasons before verify()
    await kontext.logReasoning({
      agentId: 'payment-agent',
      sessionId,
      step: 1,
      action: 'evaluate-transfer',
      reasoning: 'Checking compliance before sending $5K USDC.',
      toolCall: 'verify',
    });

    // Step 2: run compliance
    const result = await kontext.verify({
      txHash: '0xfeed',
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0xSender',
      to: '0xRecipient',
      agentId: 'payment-agent',
      sessionId,
    });

    // Step 3: record outcome
    await kontext.logReasoning({
      agentId: 'payment-agent',
      sessionId,
      step: 2,
      parentStep: 1,
      action: 'compliance-result',
      reasoning: `verify() returned compliant=${result.compliant}.`,
      toolResult: { compliant: result.compliant, riskLevel: result.riskLevel },
    });

    // All session actions share sessionId
    const sessionActions = kontext.getActions().filter((a) => a.sessionId === sessionId);
    expect(sessionActions.length).toBeGreaterThanOrEqual(3);

    // Digest chain is intact
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);

    // Reasoning trace is reconstructible
    const trace = kontext.getReasoningEntries('payment-agent', sessionId);
    expect(trace).toHaveLength(2);
    expect(trace[0]?.toolCall).toBe('verify');
    expect((trace[1]?.toolResult as Record<string, unknown>)?.compliant).toBe(result.compliant);
  });
});
