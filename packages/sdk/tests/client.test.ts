import { describe, it, expect, afterEach } from 'vitest';
import { Kontext, KontextError, KontextErrorCode } from '../src/index.js';

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
  });
}

describe('Kontext.init', () => {
  it('should initialize in local mode without an API key', () => {
    const kontext = createClient();
    expect(kontext.getMode()).toBe('local');
  });

  it('should initialize in cloud mode with an API key', () => {
    const kontext = Kontext.init({
      apiKey: 'sk_test_abc123',
      projectId: 'test-project',
      environment: 'production',
    });
    expect(kontext.getMode()).toBe('cloud');
  });

  it('should throw on missing projectId', () => {
    expect(() =>
      Kontext.init({ projectId: '', environment: 'development' }),
    ).toThrow(KontextError);
  });

  it('should throw on invalid environment', () => {
    expect(() =>
      Kontext.init({
        projectId: 'test',
        environment: 'invalid' as 'development',
      }),
    ).toThrow(KontextError);
  });

  it('should mask API key in getConfig', () => {
    const kontext = Kontext.init({
      apiKey: 'sk_test_abcdefghijklmnop',
      projectId: 'test-project',
      environment: 'development',
    });
    const config = kontext.getConfig();
    expect(config.apiKey).toBe('sk_test_...');
  });
});

describe('Action Logging', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should log a generic action', async () => {
    kontext = createClient();
    const action = await kontext.log({
      type: 'approval',
      description: 'Agent approved USDC spending',
      agentId: 'agent-1',
    });

    expect(action.id).toBeDefined();
    expect(action.type).toBe('approval');
    expect(action.agentId).toBe('agent-1');
    expect(action.projectId).toBe('test-project');
    expect(action.timestamp).toBeDefined();
    expect(action.correlationId).toBeDefined();
  });

  it('should log a transaction', async () => {
    kontext = createClient();
    const tx = await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100.50',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(tx.type).toBe('transaction');
    expect(tx.txHash).toBe('0x' + 'a'.repeat(64));
    expect(tx.chain).toBe('base');
    expect(tx.amount).toBe('100.50');
    expect(tx.token).toBe('USDC');
  });

  it('should reject invalid transaction amount', async () => {
    kontext = createClient();
    await expect(
      kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(64),
        chain: 'base',
        amount: '-50',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'agent-1',
      }),
    ).rejects.toThrow(KontextError);
  });

  it('should reject missing txHash', async () => {
    kontext = createClient();
    await expect(
      kontext.logTransaction({
        txHash: '',
        chain: 'base',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'agent-1',
      }),
    ).rejects.toThrow(KontextError);
  });
});

describe('Task Confirmation', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should create and confirm a task', async () => {
    kontext = createClient();

    const task = await kontext.createTask({
      description: 'Transfer 100 USDC to vendor',
      agentId: 'agent-1',
      requiredEvidence: ['txHash', 'receipt'],
    });

    expect(task.status).toBe('pending');
    expect(task.requiredEvidence).toEqual(['txHash', 'receipt']);

    const confirmed = await kontext.confirmTask({
      taskId: task.id,
      evidence: {
        txHash: '0x' + 'a'.repeat(64),
        receipt: { status: 'confirmed', blockNumber: 12345 },
      },
    });

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.confirmedAt).toBeDefined();
    expect(confirmed.providedEvidence).toBeDefined();
  });

  it('should reject confirmation with missing evidence', async () => {
    kontext = createClient();

    const task = await kontext.createTask({
      description: 'Transfer USDC',
      agentId: 'agent-1',
      requiredEvidence: ['txHash', 'receipt'],
    });

    await expect(
      kontext.confirmTask({
        taskId: task.id,
        evidence: { txHash: '0x123' },
      }),
    ).rejects.toThrow('Missing required evidence');
  });

  it('should reject double confirmation', async () => {
    kontext = createClient();

    const task = await kontext.createTask({
      description: 'Test task',
      agentId: 'agent-1',
      requiredEvidence: ['txHash'],
    });

    await kontext.confirmTask({
      taskId: task.id,
      evidence: { txHash: '0x123' },
    });

    await expect(
      kontext.confirmTask({
        taskId: task.id,
        evidence: { txHash: '0x456' },
      }),
    ).rejects.toThrow('already confirmed');
  });

  it('should get task status', async () => {
    kontext = createClient();

    const task = await kontext.createTask({
      description: 'Test',
      agentId: 'agent-1',
      requiredEvidence: ['proof'],
    });

    const status = await kontext.getTaskStatus(task.id);
    expect(status?.status).toBe('pending');
  });

  it('should throw on non-existent task', async () => {
    kontext = createClient();

    await expect(
      kontext.confirmTask({
        taskId: 'nonexistent',
        evidence: { txHash: '0x123' },
      }),
    ).rejects.toThrow(KontextError);
  });
});

describe('Audit Export', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should export data as JSON', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'test',
      description: 'Test action',
      agentId: 'agent-1',
    });

    const result = await kontext.export({ format: 'json' });
    expect(result.format).toBe('json');
    expect(result.recordCount).toBeGreaterThan(0);
    const parsed = JSON.parse(result.data);
    expect(parsed.actions.length).toBeGreaterThan(0);
  });

  it('should export data as CSV', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'ethereum',
      amount: '500',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const result = await kontext.export({ format: 'csv' });
    expect(result.format).toBe('csv');
    expect(result.data).toContain('section');
    expect(result.data).toContain('transaction');
  });

  it('should generate a compliance report', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'test',
      description: 'Test action',
      agentId: 'agent-1',
    });

    const report = await kontext.generateReport({
      type: 'compliance',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(report.type).toBe('compliance');
    expect(report.summary.totalActions).toBeGreaterThan(0);
  });
});

describe('Trust Scoring', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should compute a trust score for an agent', async () => {
    kontext = createClient();

    // Create some history
    for (let i = 0; i < 5; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(63) + i.toString(),
        chain: 'base',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'agent-1',
      });
    }

    const score = await kontext.getTrustScore('agent-1');
    expect(score.agentId).toBe('agent-1');
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.factors.length).toBeGreaterThan(0);
    expect(score.level).toBeDefined();
  });

  it('should evaluate transaction risk', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'c'.repeat(64),
      chain: 'base',
      amount: '50000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(evaluation.txHash).toBe('0x' + 'c'.repeat(64));
    expect(evaluation.riskScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.riskScore).toBeLessThanOrEqual(100);
    expect(['approve', 'review', 'block']).toContain(evaluation.recommendation);
  });
});

describe('Anomaly Detection', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should detect unusual amounts', async () => {
    kontext = createClient();
    const anomalies: import('../src/types.js').AnomalyEvent[] = [];

    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '1000' },
    });

    kontext.onAnomaly((a) => anomalies.push(a));

    await kontext.logTransaction({
      txHash: '0x' + 'f'.repeat(64),
      chain: 'base',
      amount: '50000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0]?.type).toBe('unusualAmount');
  });

  it('should allow unsubscribing from anomaly events', async () => {
    kontext = createClient();
    const anomalies: import('../src/types.js').AnomalyEvent[] = [];

    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '100' },
    });

    const unsub = kontext.onAnomaly((a) => anomalies.push(a));
    unsub();

    await kontext.logTransaction({
      txHash: '0x' + 'f'.repeat(64),
      chain: 'base',
      amount: '50000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(anomalies.length).toBe(0);
  });
});
