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

function createClient(plan: 'startup' | 'growth' | 'enterprise' = 'startup') {
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

  it('should allow base chain transactions on startup plan', async () => {
    kontext = createClient('startup');

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

  it('should allow ethereum chain transactions on startup plan', async () => {
    kontext = createClient('startup');

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

  it('should allow polygon chain transactions on startup plan', async () => {
    kontext = createClient('startup');

    const tx = await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'polygon',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(tx.chain).toBe('polygon');
  });

  it('should allow non-base chain transactions on growth plan', async () => {
    kontext = createClient('growth');

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
// CSV export — plan gating
// ============================================================================

describe('CSV export plan gating', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should allow CSV export on startup plan', async () => {
    kontext = createClient('startup');

    const result = await kontext.export({ format: 'csv' });
    expect(result).toBeDefined();
  });

  it('should allow JSON export on startup plan', async () => {
    kontext = createClient('startup');

    const result = await kontext.export({ format: 'json' });
    expect(result).toBeDefined();
  });

  it('should allow CSV export on growth plan', async () => {
    kontext = createClient('growth');

    const result = await kontext.export({ format: 'csv' });
    expect(result).toBeDefined();
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

  it('should allow checkUsdcCompliance on startup plan', () => {
    kontext = createClient('startup');

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

});
