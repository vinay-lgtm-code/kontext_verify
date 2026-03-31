import { describe, it, expect, afterEach, vi } from 'vitest';
import { Kontext } from '../src/index.js';

const COMPLIANT_TX = {
  txHash: '0x' + 'a'.repeat(64),
  chain: 'base' as const,
  amount: '500',
  token: 'USDC' as const,
  from: '0x' + '1'.repeat(40),
  to: '0x' + '2'.repeat(40),
  agentId: 'agent-v1',
};

// Use a known sanctioned address to trigger non-compliant result
const NON_COMPLIANT_TX = {
  txHash: '0x' + 'b'.repeat(64),
  chain: 'base' as const,
  amount: '500',
  token: 'USDC' as const,
  from: '0x8589427373d6d84e98730d7795d8f6f8731fda16', // Tornado Cash (OFAC sanctioned)
  to: '0x' + '2'.repeat(40),
  agentId: 'agent-v1',
};

describe('enforcement mode', () => {
  let ctx: Kontext;

  afterEach(async () => {
    if (ctx) await ctx.destroy();
  });

  // -------------------------------------------------------------------------
  // Advisory mode (default)
  // -------------------------------------------------------------------------

  it('advisory: verify() returns result without throwing even if non-compliant', async () => {
    ctx = Kontext.init({
      projectId: 'test-enforcement',
      environment: 'development',
      // enforcement defaults to 'advisory'
    });

    const result = await ctx.verify(NON_COMPLIANT_TX);

    expect(result.compliant).toBe(false);
    expect(typeof result.riskLevel).toBe('string');
    // Advisory mode: no status override, no throw
    expect(result.status).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Blocking mode
  // -------------------------------------------------------------------------

  it('blocking + non-compliant: verify() throws', async () => {
    ctx = Kontext.init({
      projectId: 'test-enforcement',
      environment: 'development',
      enforcement: 'blocking',
    });

    await expect(ctx.verify(NON_COMPLIANT_TX)).rejects.toThrow(
      /Transaction blocked by enforcement policy/,
    );
  });

  it('blocking + compliant: verify() returns normally', async () => {
    ctx = Kontext.init({
      projectId: 'test-enforcement',
      environment: 'development',
      enforcement: 'blocking',
    });

    const result = await ctx.verify(COMPLIANT_TX);

    expect(result.compliant).toBe(true);
    expect(result.transaction.txHash).toBe(COMPLIANT_TX.txHash);
  });

  it('blocking: onBlock callback is called before throwing', async () => {
    const onBlock = vi.fn();

    ctx = Kontext.init({
      projectId: 'test-enforcement',
      environment: 'development',
      enforcement: 'blocking',
      onBlock,
    });

    await expect(ctx.verify(NON_COMPLIANT_TX)).rejects.toThrow(
      /Transaction blocked by enforcement policy/,
    );

    expect(onBlock).toHaveBeenCalledTimes(1);
    const blockedResult = onBlock.mock.calls[0]![0];
    expect(blockedResult.compliant).toBe(false);
    expect(blockedResult.transaction).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Human review mode
  // -------------------------------------------------------------------------

  it('human_review + non-compliant: verify() creates task, returns pending_review', async () => {
    ctx = Kontext.init({
      projectId: 'test-enforcement',
      environment: 'development',
      enforcement: 'human_review',
    });

    const result = await ctx.verify(NON_COMPLIANT_TX);

    // Should NOT throw
    expect(result.compliant).toBe(false);
    expect(result.status).toBe('pending_review');
    expect(result.requiresApproval).toBe(true);
    expect(result.task).toBeDefined();
    expect(result.task!.status).toBe('pending');
    expect(result.task!.description).toContain('[Human Review]');
  });

  it('human_review + compliant: verify() returns normally without pending_review', async () => {
    ctx = Kontext.init({
      projectId: 'test-enforcement',
      environment: 'development',
      enforcement: 'human_review',
    });

    const result = await ctx.verify(COMPLIANT_TX);

    expect(result.compliant).toBe(true);
    expect(result.status).toBeUndefined();
  });
});
