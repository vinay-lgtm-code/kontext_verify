import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Kontext } from '../src/index.js';

// ============================================================================
// Mock JSON-RPC responses (same pattern as reserve-reconciliation.test.ts)
// ============================================================================

const USDC_SUPPLY_HEX = '0x' + (31_420_000_000n * 10n ** 6n).toString(16).padStart(64, '0');

const BLOCK_RESPONSE = {
  number: '0x12f0003',
  hash: '0x3f9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
};

function mockRpcResponse(result: unknown) {
  return {
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  };
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createClient(plan: 'free' | 'pro' | 'enterprise' = 'free') {
  return Kontext.init({
    projectId: 'test-reserve',
    environment: 'development',
    plan,
  });
}

function stubSupplyAndBlock() {
  mockFetch
    .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX))
    .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));
}

// ============================================================================
// logReserveSnapshot()
// ============================================================================

describe('Kontext.logReserveSnapshot', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('returns correct snapshot structure', async () => {
    kontext = createClient();
    stubSupplyAndBlock();

    const snapshot = await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      agentId: 'test-agent',
    });

    expect(snapshot.token).toBe('USDC');
    expect(snapshot.chain).toBe('base');
    expect(snapshot.onChainSupply).toBe('31420000000');
    expect(snapshot.reconciliationStatus).toBe('unverified');
    expect(snapshot.snapshotBlockHash).toBe(BLOCK_RESPONSE.hash);
  });

  it('logs action into digest chain with type reserve_snapshot', async () => {
    kontext = createClient();
    stubSupplyAndBlock();

    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      agentId: 'test-agent',
    });

    const actions = kontext.getActions();
    const reserveActions = actions.filter((a) => a.type === 'reserve_snapshot');
    expect(reserveActions.length).toBe(1);
    expect(reserveActions[0]!.agentId).toBe('test-agent');
    expect(reserveActions[0]!.metadata['onChainSupply']).toBe('31420000000');
  });

  it('digest chain is valid after snapshot', async () => {
    kontext = createClient();
    stubSupplyAndBlock();

    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      agentId: 'test-agent',
    });

    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
  });

  it('all 8 chains unlocked from day one (no plan gate)', async () => {
    kontext = createClient('free');
    stubSupplyAndBlock();

    const snapshot = await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'ethereum',
      rpcUrl: 'https://eth.llamarpc.com',
      agentId: 'test-agent',
    });

    expect(snapshot.chain).toBe('ethereum');
  });

  it('records plan metering event', async () => {
    kontext = createClient();
    stubSupplyAndBlock();

    const usageBefore = kontext.getUsage();
    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      agentId: 'test-agent',
    });
    const usageAfter = kontext.getUsage();

    expect(usageAfter.eventCount).toBe(usageBefore.eventCount + 1);
  });

  it('fires anomaly on discrepancy when detection enabled', async () => {
    kontext = createClient();
    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '10000' },
    });

    const anomalies: unknown[] = [];
    kontext.onAnomaly((event) => anomalies.push(event));

    stubSupplyAndBlock();

    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '30000000000', // ~4.7% delta
      agentId: 'test-agent',
    });

    expect(anomalies.length).toBe(1);
    expect((anomalies[0] as { type: string }).type).toBe('reserveDiscrepancy');
  });

  it('does not fire anomaly when within tolerance', async () => {
    kontext = createClient();
    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '10000' },
    });

    const anomalies: unknown[] = [];
    kontext.onAnomaly((event) => anomalies.push(event));

    stubSupplyAndBlock();

    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '31400000000', // ~0.064% delta, within 0.1% tolerance
      agentId: 'test-agent',
    });

    expect(anomalies.length).toBe(0);
  });

  it('does not fire anomaly when detection disabled', async () => {
    kontext = createClient();
    // anomaly detection not enabled

    stubSupplyAndBlock();

    const snapshot = await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '30000000000', // discrepancy
      agentId: 'test-agent',
    });

    expect(snapshot.reconciliationStatus).toBe('discrepancy');
    // No crash — anomaly detector silently skips
  });

  it('uses "system" as default agentId', async () => {
    kontext = createClient();
    stubSupplyAndBlock();

    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
    });

    const actions = kontext.getActions();
    expect(actions[0]!.agentId).toBe('system');
  });
});

// ============================================================================
// verify() with reserveSnapshot
// ============================================================================

describe('verify() with reserveSnapshot', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('includes reserveSnapshot in result when config provided', async () => {
    kontext = createClient();
    // verify() calls logTransaction (no fetch), then reserveSnapshot (2 fetches)
    stubSupplyAndBlock();

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'test-agent',
      reserveSnapshot: {
        rpcUrl: 'https://mainnet.base.org',
      },
    });

    expect(result.reserveSnapshot).toBeDefined();
    expect(result.reserveSnapshot!.token).toBe('USDC');
    expect(result.reserveSnapshot!.onChainSupply).toBe('31420000000');
    expect(result.reserveSnapshot!.reconciliationStatus).toBe('unverified');
  });

  it('omits reserveSnapshot when not configured (backwards-compatible)', async () => {
    kontext = createClient();

    const result = await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'test-agent',
    });

    expect(result.reserveSnapshot).toBeUndefined();
  });

  it('reserve snapshot is logged into digest chain alongside transaction', async () => {
    kontext = createClient();
    stubSupplyAndBlock();

    await kontext.verify({
      txHash: '0xabc',
      chain: 'base',
      amount: '5000',
      token: 'USDC',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      agentId: 'test-agent',
      reserveSnapshot: { rpcUrl: 'https://mainnet.base.org' },
    });

    const actions = kontext.getActions();
    const types = actions.map((a) => a.type);
    expect(types).toContain('transaction');
    expect(types).toContain('reserve_snapshot');
  });
});

// ============================================================================
// generateComplianceCertificate() with reserve snapshots
// ============================================================================

describe('ComplianceCertificate with reserve reconciliation', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('includes reserveReconciliation when snapshots exist', async () => {
    kontext = createClient();
    stubSupplyAndBlock();

    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '31420000000',
      agentId: 'cert-agent',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'cert-agent',
    });

    expect(cert.reserveReconciliation).toBeDefined();
    expect(cert.reserveReconciliation!.snapshotCount).toBe(1);
    expect(cert.reserveReconciliation!.discrepancyCount).toBe(0);
    expect(cert.reserveReconciliation!.latestStatus).toBe('matched');
    expect(cert.reserveReconciliation!.snapshots[0]!.onChainSupply).toBe('31420000000');
  });

  it('omits reserveReconciliation when no snapshots exist', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'approval',
      description: 'Test action',
      agentId: 'cert-agent',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'cert-agent',
    });

    expect(cert.reserveReconciliation).toBeUndefined();
  });

  it('counts discrepancies accurately', async () => {
    kontext = createClient();

    // First snapshot: matched
    stubSupplyAndBlock();
    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '31420000000',
      agentId: 'cert-agent',
    });

    // Second snapshot: discrepancy
    stubSupplyAndBlock();
    await kontext.logReserveSnapshot({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '30000000000',
      agentId: 'cert-agent',
    });

    const cert = await kontext.generateComplianceCertificate({
      agentId: 'cert-agent',
    });

    expect(cert.reserveReconciliation!.snapshotCount).toBe(2);
    expect(cert.reserveReconciliation!.discrepancyCount).toBe(1);
    expect(cert.reserveReconciliation!.latestStatus).toBe('discrepancy');
  });
});
