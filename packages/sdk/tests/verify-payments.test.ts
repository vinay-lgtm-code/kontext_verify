import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';

// Name-based OFAC screening requires the optional ofac-sanctions module.
let hasNameScreening = false;
try {
  require('../src/integrations/ofac-sanctions.js');
  hasNameScreening = true;
} catch {
  // module not available
}

const PAYMENT_INPUT = {
  amount: '15000',
  currency: 'USD',
  from: 'Acme Corporation',
  to: 'Global Payments Inc',
  agentId: 'treasury-agent-v1',
  paymentMethod: 'wire',
  paymentReference: 'INV-2026-001',
};

describe('verify() — general payments', () => {
  let ctx: Kontext;

  afterEach(async () => {
    await ctx.destroy();
  });

  it('should accept payment without crypto fields', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify(PAYMENT_INPUT);

    expect(typeof result.compliant).toBe('boolean');
    expect(result.transaction.amount).toBe('15000');
    expect(result.transaction.from).toBe('Acme Corporation');
    expect(result.transaction.to).toBe('Global Payments Inc');
    expect(result.transaction.txHash).toBeUndefined();
    expect(result.transaction.chain).toBeUndefined();
    expect(result.transaction.token).toBeUndefined();
    expect(result.transaction.currency).toBe('USD');
    expect(result.transaction.paymentMethod).toBe('wire');
    expect(result.transaction.paymentReference).toBe('INV-2026-001');
  });

  it('should generate correct description for general payment', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify(PAYMENT_INPUT);

    expect(result.transaction.description).toContain('USD');
    expect(result.transaction.description).toContain('15000');
    expect(result.transaction.description).toContain('wire');
  });

  it('should run entity name screening instead of address screening', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify(PAYMENT_INPUT);

    const screeningChecks = result.checks.filter((c) => c.name.includes('entity_screening'));
    expect(screeningChecks.length).toBe(2); // sender + recipient
    expect(screeningChecks.every((c) => c.passed)).toBe(true);
  });

  it.skipIf(!hasNameScreening)('should flag sanctioned entity name', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify({
      ...PAYMENT_INPUT,
      to: 'Lazarus Group',
    });

    expect(result.compliant).toBe(false);
    expect(result.riskLevel).toBe('critical');
    const screening = result.checks.find((c) => c.name === 'entity_screening_recipient');
    expect(screening).toBeDefined();
    expect(screening!.passed).toBe(false);
  });

  it('should compute trust score for payment agent', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify(PAYMENT_INPUT);

    expect(result.trustScore.agentId).toBe('treasury-agent-v1');
    expect(typeof result.trustScore.score).toBe('number');
    expect(result.trustScore.score).toBeGreaterThanOrEqual(0);
    expect(result.trustScore.score).toBeLessThanOrEqual(100);
  });

  it('should maintain digest chain for general payments', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify(PAYMENT_INPUT);

    expect(result.digestProof.valid).toBe(true);
    expect(result.digestProof.chainLength).toBeGreaterThan(0);
    expect(result.digestProof.terminalDigest.length).toBeGreaterThan(0);
  });

  it('should apply approvalThreshold to general payments', async () => {
    ctx = Kontext.init({
      projectId: 'test',
      environment: 'development',
      approvalThreshold: '10000',
    });

    const result = await ctx.verify(PAYMENT_INPUT); // $15000 > $10000
    expect(result.requiresApproval).toBe(true);
    expect(result.task).toBeDefined();
    expect(result.task!.description).toContain('USD');
    expect(result.task!.description).toContain('15000');
  });

  it('should not require approval when under threshold', async () => {
    ctx = Kontext.init({
      projectId: 'test',
      environment: 'development',
      approvalThreshold: '20000',
    });

    const result = await ctx.verify(PAYMENT_INPUT); // $15000 < $20000
    expect(result.requiresApproval).toBeUndefined();
    expect(result.task).toBeUndefined();
  });

  it('should log reasoning for general payments', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify({
      ...PAYMENT_INPUT,
      reasoning: 'Approved wire transfer to verified vendor',
      confidence: 0.95,
    });

    expect(result.reasoningId).toBeDefined();
    const entries = ctx.getReasoningEntries('treasury-agent-v1');
    expect(entries.length).toBe(1);
    expect(entries[0]!.reasoning).toBe('Approved wire transfer to verified vendor');
  });

  it('should still work for crypto transactions (backward compat)', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-v1',
    });

    expect(result.transaction.txHash).toBe('0x' + 'a'.repeat(64));
    expect(result.transaction.chain).toBe('base');
    expect(result.transaction.token).toBe('USDC');
    expect(result.compliant).toBe(true);
  });

  it('should default currency to USD when not specified', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    const result = await ctx.verify({
      amount: '1000',
      from: 'Sender Inc',
      to: 'Receiver Corp',
      agentId: 'test-agent',
    });

    expect(result.transaction.description).toContain('USD');
  });

  it('should detect anomalies for general payments', async () => {
    ctx = Kontext.init({ projectId: 'test', environment: 'development' });
    ctx.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '10000' },
    });

    const result = await ctx.verify(PAYMENT_INPUT); // $15000 > $10000
    expect(result.anomalies.length).toBeGreaterThan(0);
  });
});
