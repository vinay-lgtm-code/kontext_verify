import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';

const TX_INPUT = {
  txHash: '0x' + 'a'.repeat(64),
  chain: 'base' as const,
  amount: '5000',
  token: 'USDC' as const,
  from: '0x' + '1'.repeat(40),
  to: '0x' + '2'.repeat(40),
  agentId: 'agent-v1',
};

describe('verify() — unified API', () => {
  let ctx: Kontext;

  afterEach(async () => {
    await ctx.destroy();
  });

  it('should return compliance, trust, anomalies, and digest proof in one call', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });

    const result = await ctx.verify(TX_INPUT);

    // Compliance fields
    expect(typeof result.compliant).toBe('boolean');
    expect(Array.isArray(result.checks)).toBe(true);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    expect(Array.isArray(result.recommendations)).toBe(true);

    // Transaction record
    expect(result.transaction.txHash).toBe(TX_INPUT.txHash);
    expect(result.transaction.chain).toBe('base');

    // Trust score
    expect(result.trustScore.agentId).toBe('agent-v1');
    expect(typeof result.trustScore.score).toBe('number');
    expect(result.trustScore.score).toBeGreaterThanOrEqual(0);
    expect(result.trustScore.score).toBeLessThanOrEqual(100);
    expect(['untrusted', 'low', 'medium', 'high', 'verified']).toContain(result.trustScore.level);

    // Anomalies (empty when no rules configured)
    expect(Array.isArray(result.anomalies)).toBe(true);

    // Digest proof
    expect(typeof result.digestProof.terminalDigest).toBe('string');
    expect(result.digestProof.terminalDigest.length).toBeGreaterThan(0);
    expect(result.digestProof.chainLength).toBeGreaterThan(0);
    expect(result.digestProof.valid).toBe(true);

    // No reasoning provided → no reasoningId
    expect(result.reasoningId).toBeUndefined();
  });

  it('should log reasoning when reasoning field is provided', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });

    const result = await ctx.verify({
      ...TX_INPUT,
      reasoning: 'Transfer within daily limit. Recipient in allowlist.',
      confidence: 0.95,
    });

    expect(result.reasoningId).toBeDefined();
    expect(typeof result.reasoningId).toBe('string');

    // Verify reasoning was stored in the audit trail
    const entries = ctx.getReasoningEntries('agent-v1');
    expect(entries.length).toBe(1);
    expect(entries[0]!.reasoning).toBe('Transfer within daily limit. Recipient in allowlist.');
    expect(entries[0]!.confidence).toBe(0.95);
    expect(entries[0]!.action).toBe('verify');
  });

  it('should auto-detect anomalies when anomalyRules set in config', async () => {
    ctx = Kontext.init({
      projectId: 'test',
      environment: 'development',
      anomalyRules: ['unusualAmount'],
      anomalyThresholds: { maxAmount: '1000' },
    });

    // $5000 exceeds the $1000 threshold
    const result = await ctx.verify(TX_INPUT);

    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.anomalies[0]!.type).toBe('unusualAmount');
  });

  it('should return empty anomalies when no rules configured', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });

    const result = await ctx.verify(TX_INPUT);
    expect(result.anomalies).toEqual([]);
  });

  it('should return empty anomalies when transaction is within thresholds', async () => {
    ctx = Kontext.init({
      projectId: 'test',
      environment: 'development',
      anomalyRules: ['unusualAmount'],
      anomalyThresholds: { maxAmount: '50000' },
    });

    const result = await ctx.verify(TX_INPUT);
    expect(result.anomalies).toEqual([]);
  });

  it('should pass sessionId through to reasoning entry', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const sessionId = Kontext.generateSessionId();

    const result = await ctx.verify({
      ...TX_INPUT,
      sessionId,
      reasoning: 'Test with session',
      confidence: 0.9,
    });

    expect(result.reasoningId).toBeDefined();
    const entries = ctx.getReasoningEntries('agent-v1', sessionId);
    expect(entries.length).toBe(1);
    expect(entries[0]!.sessionId).toBe(sessionId);
  });

  it('should include context in reasoning when provided', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });

    await ctx.verify({
      ...TX_INPUT,
      reasoning: 'Approved based on allowlist',
      confidence: 0.99,
      context: { allowlisted: true, dailyTotal: '15000' },
    });

    const entries = ctx.getReasoningEntries('agent-v1');
    expect(entries[0]!.context).toEqual({ allowlisted: true, dailyTotal: '15000' });
  });

  it('should maintain valid digest chain across multiple verify calls', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });

    const r1 = await ctx.verify({ ...TX_INPUT, txHash: '0x' + 'a'.repeat(64) });
    const r2 = await ctx.verify({ ...TX_INPUT, txHash: '0x' + 'b'.repeat(64) });

    expect(r2.digestProof.chainLength).toBeGreaterThan(r1.digestProof.chainLength);
    expect(r2.digestProof.terminalDigest).not.toBe(r1.digestProof.terminalDigest);
    expect(r2.digestProof.valid).toBe(true);
  });

  it('should improve trust score with more verified transactions', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });

    const first = await ctx.verify({ ...TX_INPUT, txHash: '0x' + 'a'.repeat(64) });

    // Log several more transactions to build history
    for (let i = 0; i < 5; i++) {
      await ctx.verify({
        ...TX_INPUT,
        txHash: '0x' + String(i).repeat(64),
        reasoning: `Transaction ${i}`,
        confidence: 0.9,
      });
    }

    const last = await ctx.verify({
      ...TX_INPUT,
      txHash: '0x' + 'f'.repeat(64),
    });

    // Trust should be same or higher with more history
    expect(last.trustScore.score).toBeGreaterThanOrEqual(first.trustScore.score);
  });

  it('should gate advanced anomaly rules to pro plan', () => {
    expect(() =>
      Kontext.init({
        projectId: 'test',
        environment: 'development',
        plan: 'free',
        anomalyRules: ['newDestination'],
      }),
    ).toThrow(/requires.*plan/i);
  });

  it('should allow advanced anomaly rules on pro plan', async () => {
    ctx = Kontext.init({
      projectId: 'test',
      environment: 'development',
      plan: 'pro',
      anomalyRules: ['unusualAmount', 'newDestination'],
      anomalyThresholds: { maxAmount: '1000' },
    });

    const result = await ctx.verify(TX_INPUT);
    // Should have unusualAmount anomaly (5000 > 1000)
    expect(result.anomalies.some((a) => a.type === 'unusualAmount')).toBe(true);
  });
});
