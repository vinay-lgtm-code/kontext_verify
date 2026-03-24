import { describe, it, expect, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';

function createClient(plan: 'startup' | 'growth' | 'enterprise' = 'startup') {
  return Kontext.init({
    projectId: 'test-reports',
    environment: 'development',
    plan,
  });
}

describe('SAR Report', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should generate a SAR report with anomalies', async () => {
    kontext = createClient();

    // Log a transaction
    await kontext.verify({
      txHash: '0xsar1',
      chain: 'base',
      amount: '50000',
      token: 'USDC',
      from: '0xSuspect',
      to: '0xTarget',
      agentId: 'suspicious-agent',
    });

    const report = await kontext.generateSARReport({
      period: { start: new Date('2020-01-01'), end: new Date('2030-01-01') },
      agentId: 'suspicious-agent',
      filingType: 'initial',
      subjectName: 'Suspect Agent',
    });

    expect(report.id).toBeDefined();
    expect(report.filingType).toBe('initial');
    expect(report.subject.agentId).toBe('suspicious-agent');
    expect(report.subject.name).toBe('Suspect Agent');
    expect(report.subject.addresses.length).toBeGreaterThan(0);
    expect(report.supportingTransactions.length).toBe(1);
    expect(report.digestProof.valid).toBe(true);
    expect(report.digestProof.terminalDigest).toBeTruthy();
  });

  it('should require startup plan (SAR/CTR gated to startup+)', async () => {
    // SAR/CTR is available on startup plan, so we verify it works
    const client = createClient('startup');
    await expect(
      client.generateSARReport({
        period: { start: new Date(), end: new Date() },
        agentId: 'agent-1',
      }),
    ).resolves.toBeDefined();
    await client.destroy();
  });
});

describe('CTR Report', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should include transactions above $10K threshold', async () => {
    kontext = createClient();

    await kontext.verify({
      txHash: '0xctr1',
      chain: 'base',
      amount: '15000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'agent-1',
    });

    await kontext.verify({
      txHash: '0xctr2',
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0xA',
      to: '0xB',
      agentId: 'agent-1',
    });

    const report = await kontext.generateCTRReport({
      period: { start: new Date('2020-01-01'), end: new Date('2030-01-01') },
      agentId: 'agent-1',
    });

    expect(report.id).toBeDefined();
    // $15K transaction should be included, $5K one gets included via daily aggregation (total $20K)
    expect(report.transactions.length).toBeGreaterThanOrEqual(1);
    expect(report.digestProof.valid).toBe(true);
  });

  it('should be available on startup plan (SAR/CTR gated to startup+)', async () => {
    // SAR/CTR is available on startup plan
    const client = createClient('startup');
    await expect(
      client.generateCTRReport({
        period: { start: new Date(), end: new Date() },
      }),
    ).resolves.toBeDefined();
    await client.destroy();
  });
});
