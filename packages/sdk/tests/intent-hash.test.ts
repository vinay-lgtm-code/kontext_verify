import { describe, it, expect, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { Kontext } from '../src/index.js';

function createClient() {
  return Kontext.init({
    projectId: 'test-intent',
    environment: 'development',
    plan: 'enterprise',
  });
}

describe('Intent Hashing', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should return intentHash when intent is provided', async () => {
    kontext = createClient();
    const intent = {
      purpose: 'invoice-payment',
      scope: 'Q1 vendor payments',
      limits: { dailyMax: '50000', perTransaction: '28000' },
    };

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '28000',
      token: 'USDC',
      from: '0xSender',
      to: '0xRecipient',
      agentId: 'treasury-agent',
      intent,
    });

    const expectedHash = createHash('sha256')
      .update(JSON.stringify(intent))
      .digest('hex');

    expect(result.intentHash).toBe(expectedHash);
    expect(result.intentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should not include intentHash when intent is not provided', async () => {
    kontext = createClient();

    const result = await kontext.verify({
      txHash: '0xdef',
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'agent-1',
    });

    expect(result.intentHash).toBeUndefined();
  });

  it('should produce deterministic hashes for same intent', async () => {
    kontext = createClient();
    const intent = { purpose: 'payroll' };

    const result1 = await kontext.verify({
      txHash: '0x111',
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'agent-1',
      intent,
    });

    const result2 = await kontext.verify({
      txHash: '0x222',
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'agent-1',
      intent,
    });

    expect(result1.intentHash).toBe(result2.intentHash);
  });

  it('should produce different hashes for different intents', async () => {
    kontext = createClient();

    const result1 = await kontext.verify({
      txHash: '0x333',
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'agent-1',
      intent: { purpose: 'payroll' },
    });

    const result2 = await kontext.verify({
      txHash: '0x444',
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'agent-1',
      intent: { purpose: 'vendor-settlement' },
    });

    expect(result1.intentHash).not.toBe(result2.intentHash);
  });
});
