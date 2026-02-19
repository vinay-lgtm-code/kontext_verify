import { describe, it, expect, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { Kontext } from '../src/index.js';

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
    plan: 'enterprise',
  });
}

describe('Compliance Certificates', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should generate a basic compliance certificate', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'approval',
      description: 'Approved spending',
      agentId: 'agent-1',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    expect(cert.certificateId).toBeDefined();
    expect(cert.agentId).toBe('agent-1');
    expect(cert.issuedAt).toBeDefined();
    expect(cert.summary.actions).toBe(1);
    expect(cert.summary.transactions).toBe(0);
    expect(cert.summary.toolCalls).toBe(0);
    expect(cert.summary.reasoningEntries).toBe(0);
    expect(cert.digestChain.terminalDigest).toBeDefined();
    expect(cert.digestChain.chainLength).toBeGreaterThan(0);
    expect(cert.digestChain.verified).toBe(true);
    expect(cert.trustScore).toBeGreaterThanOrEqual(0);
    expect(cert.trustScore).toBeLessThanOrEqual(100);
    expect(['compliant', 'non-compliant', 'review-required']).toContain(cert.complianceStatus);
    expect(cert.actions.length).toBeGreaterThan(0);
    expect(cert.reasoning).toEqual([]);
    expect(cert.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should count transactions correctly', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'ethereum',
      amount: '200',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    expect(cert.summary.transactions).toBe(2);
    // Transactions are also actions
    expect(cert.summary.actions).toBe(2);
  });

  it('should include reasoning entries when requested', async () => {
    kontext = createClient();

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Known vendor',
      confidence: 0.9,
    });

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'flag_transaction',
      reasoning: 'Unusual pattern',
      confidence: 0.6,
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
      includeReasoning: true,
    });

    expect(cert.summary.reasoningEntries).toBe(2);
    expect(cert.reasoning.length).toBe(2);
    expect(cert.reasoning[0]!.action).toBe('approve_transfer');
    expect(cert.reasoning[1]!.action).toBe('flag_transaction');
  });

  it('should exclude reasoning entries when not requested', async () => {
    kontext = createClient();

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Known vendor',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
      includeReasoning: false,
    });

    expect(cert.summary.reasoningEntries).toBe(1); // count is always present
    expect(cert.reasoning).toEqual([]); // entries excluded
  });

  it('should handle an agent with no actions', async () => {
    kontext = createClient();

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'nonexistent-agent',
    });

    expect(cert.summary.actions).toBe(0);
    expect(cert.summary.transactions).toBe(0);
    expect(cert.summary.toolCalls).toBe(0);
    expect(cert.summary.reasoningEntries).toBe(0);
    expect(cert.actions).toEqual([]);
    expect(cert.reasoning).toEqual([]);
    expect(cert.digestChain.verified).toBe(true); // empty chain is valid
  });

  it('should filter actions by time range', async () => {
    kontext = createClient();

    // Log some actions
    await kontext.log({
      type: 'action-1',
      description: 'First action',
      agentId: 'agent-1',
    });

    // Small delay to ensure timestamp separation
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Capture midpoint AFTER delay so it's clearly after action-1
    const midpoint = new Date();

    await kontext.log({
      type: 'action-2',
      description: 'Second action',
      agentId: 'agent-1',
    });

    // Certificate for the second half of the time range
    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
      timeRange: {
        from: midpoint,
        to: new Date(Date.now() + 60000),
      },
    });

    expect(cert.summary.actions).toBe(1);
    expect(cert.actions[0]!.type).toBe('action-2');
  });

  it('should produce a valid SHA-256 content hash', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'test',
      description: 'Test action',
      agentId: 'agent-1',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    // Recompute the signature from the certificate content
    const contentForHash = {
      certificateId: cert.certificateId,
      agentId: cert.agentId,
      issuedAt: cert.issuedAt,
      summary: cert.summary,
      digestChain: cert.digestChain,
      trustScore: cert.trustScore,
      complianceStatus: cert.complianceStatus,
      actions: cert.actions,
      reasoning: cert.reasoning,
    };

    const hash = createHash('sha256');
    hash.update(JSON.stringify(contentForHash));
    const expectedHash = hash.digest('hex');

    expect(cert.contentHash).toBe(expectedHash);
  });

  it('should verify the digest chain', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'transfer',
      description: 'Transfer action',
      agentId: 'agent-1',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    expect(cert.digestChain.verified).toBe(true);
    expect(cert.digestChain.terminalDigest).not.toBe('0'.repeat(64));
    expect(cert.digestChain.chainLength).toBe(1);
  });

  it('should summarize action types and counts', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'approval',
      description: 'Approve 1',
      agentId: 'agent-1',
    });
    await kontext.log({
      type: 'approval',
      description: 'Approve 2',
      agentId: 'agent-1',
    });
    await kontext.log({
      type: 'query',
      description: 'Query',
      agentId: 'agent-1',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    const approvalEntry = cert.actions.find((a) => a.type === 'approval');
    const queryEntry = cert.actions.find((a) => a.type === 'query');

    expect(approvalEntry).toBeDefined();
    expect(approvalEntry!.count).toBe(2);
    expect(queryEntry).toBeDefined();
    expect(queryEntry!.count).toBe(1);
  });

  it('should only include actions for the specified agent', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'approval',
      description: 'Agent 1 action',
      agentId: 'agent-1',
    });

    await kontext.log({
      type: 'approval',
      description: 'Agent 2 action',
      agentId: 'agent-2',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    expect(cert.summary.actions).toBe(1);
  });

  it('should report compliant status for a clean agent', async () => {
    kontext = createClient();

    for (let i = 0; i < 5; i++) {
      await kontext.log({
        type: 'approval',
        description: `Action ${i}`,
        agentId: 'agent-1',
      });
    }

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    expect(cert.complianceStatus).toBe('compliant');
  });

  it('should report review-required when trust score is low', async () => {
    kontext = createClient();

    // Enable anomaly detection with low threshold to create anomalies
    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '10' },
    });

    // Log high-severity anomalies by creating transactions above threshold
    for (let i = 0; i < 10; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(63) + i.toString(16),
        chain: 'base',
        amount: '50000',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + (i + 3).toString().repeat(40).slice(0, 40),
        agentId: 'agent-flagged',
      });
    }

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-flagged',
    });

    // With many anomalies, should be non-compliant or review-required
    expect(['non-compliant', 'review-required']).toContain(cert.complianceStatus);
  });

  it('should count tool_call action types', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'tool_call',
      description: 'Called transfer tool',
      agentId: 'agent-1',
    });

    await kontext.log({
      type: 'tool_call',
      description: 'Called balance tool',
      agentId: 'agent-1',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    expect(cert.summary.toolCalls).toBe(2);
  });

  it('should generate unique certificate IDs', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'test',
      description: 'Test',
      agentId: 'agent-1',
    });

    const cert1 = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    const cert2 = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
    });

    expect(cert1.certificateId).not.toBe(cert2.certificateId);
  });

  it('should combine reasoning with other actions in the certificate', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Verified vendor',
      confidence: 0.95,
    });

    await kontext.log({
      type: 'tool_call',
      description: 'Called verification tool',
      agentId: 'agent-1',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
      includeReasoning: true,
    });

    expect(cert.summary.actions).toBe(3);
    expect(cert.summary.transactions).toBe(1);
    expect(cert.summary.toolCalls).toBe(1);
    expect(cert.summary.reasoningEntries).toBe(1);
    expect(cert.reasoning.length).toBe(1);
    expect(cert.digestChain.verified).toBe(true);
  });

  it('should handle time range that excludes all actions', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'test',
      description: 'Old action',
      agentId: 'agent-1',
    });

    // Time range in the far future
    const cert = await kontext.generateComplianceCertificate({
      agentId: 'agent-1',
      timeRange: {
        from: new Date(Date.now() + 86400000),
        to: new Date(Date.now() + 172800000),
      },
    });

    expect(cert.summary.actions).toBe(0);
    expect(cert.actions).toEqual([]);
  });
});
