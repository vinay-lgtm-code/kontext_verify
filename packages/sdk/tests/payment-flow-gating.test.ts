// ============================================================================
// Payment Flow Plan Gating Integration Tests
// ============================================================================
// Verifies that payment-related client methods correctly enforce plan tier
// requirements. These tests exercise the actual client methods (not just
// the plan-gate utility) to confirm gating is wired up end-to-end.

import { describe, it, expect, afterEach } from 'vitest';
import { Kontext, KontextError, KontextErrorCode } from '../src/index.js';

// ============================================================================
// Helpers
// ============================================================================

function createClient(plan: 'free' | 'pro' | 'enterprise' = 'free') {
  return Kontext.init({
    projectId: 'plan-gate-test',
    environment: 'development',
    plan,
  });
}

// ============================================================================
// logTransaction — multi-chain plan gating
// ============================================================================

describe('logTransaction plan gating', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should allow base chain transactions on free plan', async () => {
    kontext = createClient('free');

    const tx = await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(tx.chain).toBe('base');
    expect(tx.amount).toBe('100');
  });

  it('should block ethereum chain transactions on free plan', async () => {
    kontext = createClient('free');

    try {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(64),
        chain: 'ethereum',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'agent-1',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(KontextError);
      expect((err as KontextError).code).toBe(KontextErrorCode.PLAN_REQUIRED);
    }
  });

  it('should block polygon chain transactions on free plan', async () => {
    kontext = createClient('free');

    await expect(
      kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(64),
        chain: 'polygon',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'agent-1',
      }),
    ).rejects.toThrow(/Pro plan/);
  });

  it('should allow non-base chain transactions on pro plan', async () => {
    kontext = createClient('pro');

    const tx = await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'ethereum',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(tx.chain).toBe('ethereum');
  });

  it('should allow all chains on enterprise plan', async () => {
    kontext = createClient('enterprise');

    const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism'] as const;
    for (const chain of chains) {
      const tx = await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(64),
        chain,
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'agent-1',
      });
      expect(tx.chain).toBe(chain);
    }
  });
});

// ============================================================================
// SAR/CTR report generation — plan gating
// ============================================================================

describe('SAR/CTR report plan gating', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should block SAR report on free plan', async () => {
    kontext = createClient('free');

    await expect(
      kontext.generateSARReport({
        type: 'sar',
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
      }),
    ).rejects.toThrow(/Pro plan/);
  });

  it('should block CTR report on free plan', async () => {
    kontext = createClient('free');

    await expect(
      kontext.generateCTRReport({
        type: 'ctr',
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
      }),
    ).rejects.toThrow(/Pro plan/);
  });

  it('should allow SAR report on pro plan', async () => {
    kontext = createClient('pro');

    const sar = await kontext.generateSARReport({
      type: 'sar',
      period: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
    });

    expect(sar).toBeDefined();
    expect(sar.type).toBe('sar');
  });

  it('should allow CTR report on pro plan', async () => {
    kontext = createClient('pro');

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
    });

    expect(ctr).toBeDefined();
    expect(ctr.type).toBe('ctr');
  });
});

// ============================================================================
// CSV export — plan gating
// ============================================================================

describe('CSV export plan gating', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should block CSV export on free plan', async () => {
    kontext = createClient('free');

    await expect(
      kontext.export({ format: 'csv' }),
    ).rejects.toThrow(/Pro plan/);
  });

  it('should allow JSON export on free plan', async () => {
    kontext = createClient('free');

    const result = await kontext.export({ format: 'json' });
    expect(result).toBeDefined();
  });

  it('should allow CSV export on pro plan', async () => {
    kontext = createClient('pro');

    const result = await kontext.export({ format: 'csv' });
    expect(result).toBeDefined();
  });
});

// ============================================================================
// Advanced anomaly detection — plan gating
// ============================================================================

describe('Advanced anomaly detection plan gating', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should allow basic anomaly rules on free plan', () => {
    kontext = createClient('free');

    expect(() => {
      kontext.enableAnomalyDetection({
        rules: ['unusualAmount', 'frequencySpike'],
        thresholds: { maxAmount: 10000, maxFrequency: 100 },
      });
    }).not.toThrow();
  });

  it('should block advanced anomaly rules on free plan', () => {
    kontext = createClient('free');

    expect(() => {
      kontext.enableAnomalyDetection({
        rules: ['newDestination'],
        thresholds: { maxAmount: 10000 },
      });
    }).toThrow(/Pro plan/);
  });

  it('should block offHoursActivity rule on free plan', () => {
    kontext = createClient('free');

    expect(() => {
      kontext.enableAnomalyDetection({
        rules: ['offHoursActivity'],
        thresholds: { maxAmount: 10000 },
      });
    }).toThrow(/Pro plan/);
  });

  it('should block rapidSuccession rule on free plan', () => {
    kontext = createClient('free');

    expect(() => {
      kontext.enableAnomalyDetection({
        rules: ['rapidSuccession'],
        thresholds: { maxAmount: 10000 },
      });
    }).toThrow(/Pro plan/);
  });

  it('should block roundAmount rule on free plan', () => {
    kontext = createClient('free');

    expect(() => {
      kontext.enableAnomalyDetection({
        rules: ['roundAmount'],
        thresholds: { maxAmount: 10000 },
      });
    }).toThrow(/Pro plan/);
  });

  it('should allow all anomaly rules on pro plan', () => {
    kontext = createClient('pro');

    expect(() => {
      kontext.enableAnomalyDetection({
        rules: ['unusualAmount', 'frequencySpike', 'newDestination', 'offHoursActivity', 'rapidSuccession', 'roundAmount'],
        thresholds: { maxAmount: 10000, maxFrequency: 100, minIntervalSeconds: 5 },
      });
    }).not.toThrow();
  });
});

// ============================================================================
// Approval policies — plan gating
// ============================================================================

describe('Approval policies plan gating', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should block setApprovalPolicies on free plan', () => {
    kontext = createClient('free');

    expect(() => {
      kontext.setApprovalPolicies([
        { type: 'amount-threshold', enabled: true, params: { threshold: '10000' } },
      ]);
    }).toThrow(/Pro plan/);
  });

  it('should allow setApprovalPolicies on pro plan', () => {
    kontext = createClient('pro');

    expect(() => {
      kontext.setApprovalPolicies([
        { type: 'amount-threshold', enabled: true, params: { threshold: '10000' } },
      ]);
    }).not.toThrow();
  });

  it('should throw if evaluateApproval called without policies configured', () => {
    kontext = createClient('enterprise');

    expect(() => {
      kontext.evaluateApproval({
        actionId: 'action-1',
        agentId: 'agent-1',
        amount: '50000',
      });
    }).toThrow(/Approval policies are not configured/);
  });

  it('should allow evaluateApproval after setting policies on pro plan', () => {
    kontext = createClient('pro');

    kontext.setApprovalPolicies([
      { type: 'amount-threshold', enabled: true, params: { threshold: '10000' } },
    ]);

    const result = kontext.evaluateApproval({
      actionId: 'action-1',
      agentId: 'agent-1',
      amount: '50000',
    });

    expect(result.required).toBe(true);
  });
});

// ============================================================================
// USDC compliance — available on all plans (no gating)
// ============================================================================

describe('USDC compliance availability', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should allow checkUsdcCompliance on free plan', () => {
    kontext = createClient('free');

    const result = kontext.checkUsdcCompliance({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(result.compliant).toBe(true);
  });

  it('should allow evaluateTransaction on free plan', async () => {
    kontext = createClient('free');

    const result = await kontext.evaluateTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(result.riskScore).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });
});
