import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
  });
}

describe('SAR Report Generation', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should generate a SAR report template', async () => {
    kontext = createClient();

    // Enable anomaly detection to create anomalies
    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '1000' },
    });

    // Log a suspicious transaction
    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '50000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const sar = await kontext.generateSARReport({
      type: 'sar',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(sar.type).toBe('sar');
    expect(sar.id).toBeDefined();
    expect(sar.generatedAt).toBeDefined();
    expect(sar.projectId).toBe('test-project');
    expect(sar.status).toBe('draft');
    expect(sar.narrative).toBeDefined();
    expect(sar.narrative.length).toBeGreaterThan(0);
    expect(sar.isContinuingActivity).toBe(false);
    expect(sar.priorReportId).toBeNull();
  });

  it('should include anomalies in SAR report', async () => {
    kontext = createClient();

    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '100' },
    });

    await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'ethereum',
      amount: '50000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const sar = await kontext.generateSARReport({
      type: 'sar',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(sar.anomalies.length).toBeGreaterThan(0);
    expect(sar.activityCategories.length).toBeGreaterThan(0);
  });

  it('should identify subjects from suspicious transactions', async () => {
    kontext = createClient();

    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '500' },
    });

    await kontext.logTransaction({
      txHash: '0x' + 'c'.repeat(64),
      chain: 'base',
      amount: '25000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'suspicious-agent',
    });

    const sar = await kontext.generateSARReport({
      type: 'sar',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(sar.subjects.length).toBeGreaterThan(0);
    expect(sar.subjects[0]!.agentId).toBe('suspicious-agent');
    expect(sar.subjects[0]!.addresses.length).toBeGreaterThan(0);
  });

  it('should generate SAR with empty data gracefully', async () => {
    kontext = createClient();

    const sar = await kontext.generateSARReport({
      type: 'sar',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(sar.type).toBe('sar');
    expect(sar.subjects.length).toBe(0);
    expect(sar.suspiciousTransactions.length).toBe(0);
    expect(sar.anomalies.length).toBe(0);
    expect(sar.totalAmount).toBe('0.00');
  });
});

describe('CTR Report Generation', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should generate a CTR report template', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'd'.repeat(64),
      chain: 'base',
      amount: '15000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(ctr.type).toBe('ctr');
    expect(ctr.id).toBeDefined();
    expect(ctr.generatedAt).toBeDefined();
    expect(ctr.projectId).toBe('test-project');
    expect(ctr.status).toBe('draft');
    expect(ctr.transactions.length).toBe(1);
  });

  it('should only include transactions at or above reporting threshold', async () => {
    kontext = createClient();

    // Below threshold
    await kontext.logTransaction({
      txHash: '0x' + 'e'.repeat(64),
      chain: 'base',
      amount: '500',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    // At threshold
    await kontext.logTransaction({
      txHash: '0x' + 'f'.repeat(64),
      chain: 'base',
      amount: '10000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    // Above threshold
    await kontext.logTransaction({
      txHash: '0x' + '1'.repeat(64),
      chain: 'ethereum',
      amount: '25000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    // Should include at-threshold and above-threshold transactions
    // Plus the below-threshold one since aggregate for the day exceeds threshold
    expect(ctr.transactions.length).toBe(3);
    expect(ctr.isAggregated).toBe(true);
  });

  it('should compute cash totals', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '15000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(parseFloat(ctr.totalCashIn)).toBe(15000);
    expect(parseFloat(ctr.totalCashOut)).toBe(15000);
  });

  it('should identify chains involved', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '12000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'ethereum',
      amount: '20000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(ctr.chainsInvolved).toContain('base');
    expect(ctr.chainsInvolved).toContain('ethereum');
  });

  it('should generate CTR with no qualifying transactions gracefully', async () => {
    kontext = createClient();

    // Small transaction below threshold
    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '50',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(ctr.transactions.length).toBe(0);
    expect(ctr.conductors.length).toBe(0);
    expect(parseFloat(ctr.totalCashIn)).toBe(0);
  });

  it('should build conductor subjects from reporting agents', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'c'.repeat(64),
      chain: 'base',
      amount: '20000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'payment-agent',
    });

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(ctr.conductors.length).toBe(1);
    expect(ctr.conductors[0]!.agentId).toBe('payment-agent');
    expect(ctr.conductors[0]!.addresses.length).toBeGreaterThan(0);
  });
});
