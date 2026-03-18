import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReserveReconciler } from '../src/integrations/reserve-reconciliation.js';

// ============================================================================
// Mock JSON-RPC responses
// ============================================================================

// USDC on Base: 31,420,000,000 USDC (6 decimals) = 31420000000000000 raw
const USDC_SUPPLY_HEX = '0x' + (31_420_000_000n * 10n ** 6n).toString(16).padStart(64, '0');

const BLOCK_RESPONSE = {
  number: '0x12f0003', // 19,857,411
  hash: '0x3f9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
};

function mockRpcResponse(result: unknown) {
  return {
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  };
}

function mockRpcError(message: string) {
  return {
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, error: { message } }),
  };
}

function mockHttpError(status: number) {
  return {
    ok: false,
    status,
    statusText: 'Internal Server Error',
  };
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// ReserveReconciler.querySupply()
// ============================================================================

describe('ReserveReconciler.querySupply', () => {
  it('returns correct snapshot for USDC on Base', async () => {
    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX)) // totalSupply
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));  // getBlockByNumber

    const snapshot = await ReserveReconciler.querySupply({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
    });

    expect(snapshot.token).toBe('USDC');
    expect(snapshot.chain).toBe('base');
    expect(snapshot.onChainSupply).toBe('31420000000');
    expect(snapshot.snapshotBlockNumber).toBe(19_857_411);
    expect(snapshot.snapshotBlockHash).toBe(BLOCK_RESPONSE.hash);
    expect(snapshot.reconciliationStatus).toBe('unverified');
    expect(snapshot.publishedReserves).toBeUndefined();
    expect(snapshot.delta).toBeUndefined();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('returns "matched" when supply equals published reserves', async () => {
    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX))
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));

    const snapshot = await ReserveReconciler.querySupply({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '31420000000',
    });

    expect(snapshot.reconciliationStatus).toBe('matched');
    expect(snapshot.delta).toBe('0');
  });

  it('returns "delta_within_tolerance" when delta is within default tolerance', async () => {
    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX))
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));

    // Published is slightly different but within 0.1%
    const snapshot = await ReserveReconciler.querySupply({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '31400000000', // ~0.064% delta
    });

    expect(snapshot.reconciliationStatus).toBe('delta_within_tolerance');
    expect(snapshot.delta).toBeDefined();
    expect(parseFloat(snapshot.delta!)).toBeLessThanOrEqual(0.001);
  });

  it('returns "discrepancy" when delta exceeds tolerance', async () => {
    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX))
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));

    const snapshot = await ReserveReconciler.querySupply({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '30000000000', // ~4.7% delta
    });

    expect(snapshot.reconciliationStatus).toBe('discrepancy');
    expect(parseFloat(snapshot.delta!)).toBeGreaterThan(0.001);
  });

  it('respects custom tolerance', async () => {
    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX))
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));

    // With a 5% tolerance, a ~4.7% delta is within tolerance
    const snapshot = await ReserveReconciler.querySupply({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
      publishedReserves: '30000000000',
      tolerance: 0.05,
    });

    expect(snapshot.reconciliationStatus).toBe('delta_within_tolerance');
  });

  it('throws for unknown token/chain combination', async () => {
    await expect(
      ReserveReconciler.querySupply({
        token: 'USDC',
        chain: 'solana',
        rpcUrl: 'https://example.com',
      }),
    ).rejects.toThrow(/No known contract address for USDC on solana/);
  });

  it('throws on RPC error response', async () => {
    mockFetch.mockResolvedValueOnce(mockRpcError('execution reverted'));

    await expect(
      ReserveReconciler.querySupply({
        token: 'USDC',
        chain: 'base',
        rpcUrl: 'https://mainnet.base.org',
      }),
    ).rejects.toThrow(/RPC error: execution reverted/);
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(mockHttpError(500));

    await expect(
      ReserveReconciler.querySupply({
        token: 'USDC',
        chain: 'base',
        rpcUrl: 'https://mainnet.base.org',
      }),
    ).rejects.toThrow(/RPC HTTP error: 500/);
  });

  it('throws when block fetch returns null', async () => {
    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX))
      .mockResolvedValueOnce(mockRpcResponse(null));

    await expect(
      ReserveReconciler.querySupply({
        token: 'USDC',
        chain: 'base',
        rpcUrl: 'https://mainnet.base.org',
      }),
    ).rejects.toThrow(/Failed to fetch latest block/);
  });

  it('handles DAI with 18 decimals correctly', async () => {
    // 5,000,000,000 DAI (18 decimals)
    const daiSupplyHex = '0x' + (5_000_000_000n * 10n ** 18n).toString(16).padStart(64, '0');

    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(daiSupplyHex))
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));

    const snapshot = await ReserveReconciler.querySupply({
      token: 'DAI',
      chain: 'ethereum',
      rpcUrl: 'https://eth.llamarpc.com',
    });

    expect(snapshot.onChainSupply).toBe('5000000000');
    expect(snapshot.token).toBe('DAI');
    expect(snapshot.chain).toBe('ethereum');
  });

  it('handles supply with fractional decimals', async () => {
    // 1,234,567.890123 USDC (6 decimals) = 1234567890123 raw
    const fracSupplyHex = '0x' + (1234567890123n).toString(16).padStart(64, '0');

    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(fracSupplyHex))
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));

    const snapshot = await ReserveReconciler.querySupply({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
    });

    expect(snapshot.onChainSupply).toBe('1234567.890123');
  });

  it('sends correct JSON-RPC payload for totalSupply()', async () => {
    mockFetch
      .mockResolvedValueOnce(mockRpcResponse(USDC_SUPPLY_HEX))
      .mockResolvedValueOnce(mockRpcResponse(BLOCK_RESPONSE));

    await ReserveReconciler.querySupply({
      token: 'USDC',
      chain: 'base',
      rpcUrl: 'https://mainnet.base.org',
    });

    const firstCall = mockFetch.mock.calls[0]!;
    expect(firstCall[0]).toBe('https://mainnet.base.org');
    const body = JSON.parse(firstCall[1].body);
    expect(body.method).toBe('eth_call');
    expect(body.params[0].data).toBe('0x18160ddd');
    expect(body.params[0].to).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
  });
});

// ============================================================================
// ReserveReconciler.getContractAddress()
// ============================================================================

describe('ReserveReconciler.getContractAddress', () => {
  it('returns address for known token/chain', () => {
    const addr = ReserveReconciler.getContractAddress('USDC', 'base');
    expect(addr).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
  });

  it('returns undefined for unknown combination', () => {
    expect(ReserveReconciler.getContractAddress('USDC', 'solana')).toBeUndefined();
  });
});

// ============================================================================
// ReserveReconciler.getSupportedChains()
// ============================================================================

describe('ReserveReconciler.getSupportedChains', () => {
  it('returns supported chains for USDC', () => {
    const chains = ReserveReconciler.getSupportedChains('USDC');
    expect(chains).toContain('ethereum');
    expect(chains).toContain('base');
    expect(chains.length).toBeGreaterThanOrEqual(4);
  });

  it('returns empty array for unsupported token', () => {
    expect(ReserveReconciler.getSupportedChains('USDP')).toEqual([]);
  });
});

// ============================================================================
// ReserveReconciler.getDecimals()
// ============================================================================

describe('ReserveReconciler.getDecimals', () => {
  it('returns 6 for USDC', () => {
    expect(ReserveReconciler.getDecimals('USDC', 'base')).toBe(6);
  });

  it('returns 18 for DAI', () => {
    expect(ReserveReconciler.getDecimals('DAI', 'ethereum')).toBe(18);
  });

  it('returns undefined for unknown combination', () => {
    expect(ReserveReconciler.getDecimals('USDC', 'solana')).toBeUndefined();
  });
});
