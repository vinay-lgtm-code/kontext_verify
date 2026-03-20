import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';

function createClient() {
  return Kontext.init({
    projectId: 'test-case-packet',
    environment: 'development',
    plan: 'enterprise',
  });
}

describe('Case Packet Export', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should export a case packet for a transaction', async () => {
    kontext = createClient();

    const result = await kontext.verify({
      txHash: '0xcase1',
      chain: 'base',
      amount: '28000',
      token: 'USDC',
      from: '0xSender',
      to: '0xRecipient',
      agentId: 'treasury-agent',
    });

    const packet = await kontext.exportCasePacket(result.transaction.id);

    expect(packet.id).toBeDefined();
    expect(packet.exportedAt).toBeDefined();
    expect(packet.transaction.id).toBe(result.transaction.id);
    expect(packet.transaction.amount).toBe('28000');
    expect(packet.trustScore.agentId).toBe('treasury-agent');
    expect(packet.digestProof.valid).toBe(true);
    expect(packet.digestProof.terminalDigest).toBeTruthy();
  });

  it('should throw for non-existent transaction', async () => {
    kontext = createClient();

    await expect(
      kontext.exportCasePacket('nonexistent-id'),
    ).rejects.toThrow(/Transaction not found/);
  });

  it('should include reasoning entries for the agent', async () => {
    kontext = createClient();

    await kontext.logReasoning({
      agentId: 'treasury-agent',
      action: 'evaluate-transfer',
      reasoning: 'Checking vendor payment against daily limits',
      confidence: 0.95,
    });

    const result = await kontext.verify({
      txHash: '0xcase2',
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'treasury-agent',
    });

    const packet = await kontext.exportCasePacket(result.transaction.id);

    expect(packet.reasoningEntries.length).toBeGreaterThanOrEqual(1);
    expect(packet.reasoningEntries[0]!.action).toBe('evaluate-transfer');
  });
});
