// ============================================================================
// Transaction Risk Evaluation - Edge Cases & Comprehensive Coverage
// ============================================================================
// Verifies that TrustScorer.evaluateTransaction() correctly computes risk
// scores, risk levels, flagged status, and recommendations across edge cases.

import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';

// ============================================================================
// Helpers
// ============================================================================

function createClient() {
  return Kontext.init({
    projectId: 'risk-eval-test',
    environment: 'development',
    plan: 'enterprise',
  });
}

// ============================================================================
// Risk score tiers based on amount
// ============================================================================

describe('Transaction evaluation - amount risk tiers', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should assign very low risk for micro-transactions (<$100)', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '50',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(evaluation.riskScore).toBeLessThan(50);
    expect(evaluation.recommendation).toBe('approve');
    expect(evaluation.flagged).toBe(false);
  });

  it('should assign low risk for small transactions ($100-$999)', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '500',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(evaluation.riskScore).toBeLessThanOrEqual(50);
    expect(evaluation.riskLevel).toBe('low');
  });

  it('should assign elevated risk for large transactions ($50K+)', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '75000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(evaluation.riskScore).toBeGreaterThan(30);
  });

  it('should assign very high risk for institutional-scale transfers ($100K+)', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '500000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    // Risk score is averaged across all factors. The amount_risk factor alone
    // should be very high (95), but averaged with other factors brings overall
    // score to the 30-40 range for a new agent with no history.
    expect(evaluation.riskScore).toBeGreaterThan(30);

    // The amount_risk factor itself should reflect institutional scale
    const amountFactor = evaluation.factors.find((f) => f.name === 'amount_risk');
    expect(amountFactor).toBeDefined();
    expect(amountFactor!.score).toBeGreaterThanOrEqual(90);
  });
});

// ============================================================================
// Return type completeness
// ============================================================================

describe('Transaction evaluation - return type fields', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should include all TransactionEvaluation fields', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'base',
      amount: '1000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    // Verify all documented fields exist
    expect(evaluation.txHash).toBe('0x' + 'b'.repeat(64));
    expect(typeof evaluation.riskScore).toBe('number');
    expect(evaluation.riskScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.riskScore).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high', 'critical']).toContain(evaluation.riskLevel);
    expect(Array.isArray(evaluation.factors)).toBe(true);
    expect(typeof evaluation.flagged).toBe('boolean');
    expect(['approve', 'review', 'block']).toContain(evaluation.recommendation);
    expect(typeof evaluation.evaluatedAt).toBe('string');
    expect(evaluation.evaluatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
  });

  it('should include risk factors with name, score, and description', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'c'.repeat(64),
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(evaluation.factors.length).toBeGreaterThan(0);
    for (const factor of evaluation.factors) {
      expect(typeof factor.name).toBe('string');
      expect(typeof factor.score).toBe('number');
      expect(typeof factor.description).toBe('string');
      expect(factor.score).toBeGreaterThanOrEqual(0);
      expect(factor.score).toBeLessThanOrEqual(100);
    }
  });
});

// ============================================================================
// Risk factors - new destination
// ============================================================================

describe('Transaction evaluation - new destination risk', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should flag new agent with no history as moderate risk', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'brand-new-agent',
    });

    const destFactor = evaluation.factors.find((f) => f.name === 'new_destination');
    expect(destFactor).toBeDefined();
    // New agent should have moderate destination risk
    expect(destFactor!.score).toBeGreaterThan(0);
  });

  it('should reduce destination risk for known recipients', async () => {
    kontext = createClient();
    const dest = '0x' + '2'.repeat(40);

    // Build history with same destination
    for (let i = 0; i < 3; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(63) + i.toString(),
        chain: 'base',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: dest,
        agentId: 'repeat-agent',
      });
    }

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: dest,
      agentId: 'repeat-agent',
    });

    const destFactor = evaluation.factors.find((f) => f.name === 'new_destination');
    expect(destFactor).toBeDefined();
    // Known destination should have low risk
    expect(destFactor!.score).toBeLessThan(30);
  });
});

// ============================================================================
// Risk factors - round amount structuring
// ============================================================================

describe('Transaction evaluation - round amount structuring', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should flag round amounts as potential structuring', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const roundFactor = evaluation.factors.find((f) => f.name === 'round_amount');
    expect(roundFactor).toBeDefined();
    expect(roundFactor!.score).toBeGreaterThan(5); // Higher than non-round baseline
  });

  it('should flag amounts near $10K threshold as structuring indicator', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '9500',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const roundFactor = evaluation.factors.find((f) => f.name === 'round_amount');
    expect(roundFactor).toBeDefined();
    // Just-under-threshold should have elevated score
    expect(roundFactor!.score).toBeGreaterThan(15);
  });

  it('should assign low round-amount risk for non-round amounts', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '1234.56',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const roundFactor = evaluation.factors.find((f) => f.name === 'round_amount');
    expect(roundFactor).toBeDefined();
    expect(roundFactor!.score).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// Risk factors - frequency
// ============================================================================

describe('Transaction evaluation - frequency risk', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should assign low frequency risk for first transaction', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'freq-agent',
    });

    const freqFactor = evaluation.factors.find((f) => f.name === 'frequency_risk');
    expect(freqFactor).toBeDefined();
    expect(freqFactor!.score).toBeLessThan(20);
  });

  it('should increase frequency risk for many recent transactions', async () => {
    kontext = createClient();

    // Log many transactions in a short period
    for (let i = 0; i < 15; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(62) + i.toString().padStart(2, '0'),
        chain: 'base',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'high-freq-agent',
      });
    }

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'high-freq-agent',
    });

    const freqFactor = evaluation.factors.find((f) => f.name === 'frequency_risk');
    expect(freqFactor).toBeDefined();
    // High frequency should have elevated risk
    expect(freqFactor!.score).toBeGreaterThan(20);
  });
});

// ============================================================================
// Risk levels and recommendations
// ============================================================================

describe('Transaction evaluation - risk levels and recommendations', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should return "approve" recommendation for low-risk transactions', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '10',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(evaluation.recommendation).toBe('approve');
    expect(evaluation.flagged).toBe(false);
    expect(evaluation.riskLevel).toBe('low');
  });

  it('should set flagged=true when risk score >= 60', async () => {
    kontext = createClient();

    // Log many rapid transactions to drive up frequency risk
    for (let i = 0; i < 30; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(62) + i.toString().padStart(2, '0'),
        chain: 'base',
        amount: '100000',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + (i + 3).toString(16).padStart(40, '0'),
        agentId: 'risky-agent',
      });
    }

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'base',
      amount: '200000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + 'f'.repeat(40),
      agentId: 'risky-agent',
    });

    // With high amount, many recent txs, and new destination, risk should be elevated
    if (evaluation.riskScore >= 60) {
      expect(evaluation.flagged).toBe(true);
    }
    // Regardless, flagged field should be boolean and match threshold logic
    expect(evaluation.flagged).toBe(evaluation.riskScore >= 60);
  });

  it('should preserve txHash in evaluation result', async () => {
    kontext = createClient();
    const hash = '0x' + 'dead'.repeat(16);

    const evaluation = await kontext.evaluateTransaction({
      txHash: hash,
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(evaluation.txHash).toBe(hash);
  });
});

// ============================================================================
// Agent reputation factor
// ============================================================================

describe('Transaction evaluation - agent reputation', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should include agent_reputation factor', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const reputationFactor = evaluation.factors.find((f) => f.name === 'agent_reputation');
    expect(reputationFactor).toBeDefined();
    expect(reputationFactor!.score).toBeGreaterThanOrEqual(0);
  });
});
