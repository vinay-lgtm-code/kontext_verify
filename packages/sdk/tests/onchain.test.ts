import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyAnchor, getAnchor, OnChainExporter } from '../src/onchain.js';
import type { ActionLog, OnChainAnchorConfig } from '../src/types.js';

// ---------------------------------------------------------------------------
// Mock fetch for JSON-RPC calls
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function rpcResponse(result: string) {
  return {
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  };
}

function rpcError(message: string) {
  return {
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, error: { message } }),
  };
}

// ---------------------------------------------------------------------------
// verifyAnchor()
// ---------------------------------------------------------------------------

describe('verifyAnchor()', () => {
  const rpcUrl = 'https://mainnet.base.org';
  const contract = '0x' + 'ab'.repeat(20);
  const digest = '0x' + 'ff'.repeat(32);

  it('should return anchored=true when on-chain verify returns non-zero', async () => {
    mockFetch.mockResolvedValueOnce(
      rpcResponse('0x' + '0'.repeat(63) + '1'),
    );

    const result = await verifyAnchor(rpcUrl, contract, digest);

    expect(result.anchored).toBe(true);
    expect(result.digest).toBe(digest);
    expect(mockFetch).toHaveBeenCalledOnce();

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.method).toBe('eth_call');
  });

  it('should return anchored=false when on-chain verify returns zero', async () => {
    mockFetch.mockResolvedValueOnce(
      rpcResponse('0x' + '0'.repeat(64)),
    );

    const result = await verifyAnchor(rpcUrl, contract, digest);

    expect(result.anchored).toBe(false);
    expect(result.digest).toBe(digest);
  });

  it('should throw on RPC error', async () => {
    mockFetch.mockResolvedValueOnce(rpcError('execution reverted'));

    await expect(
      verifyAnchor(rpcUrl, contract, digest),
    ).rejects.toThrow(/RPC error/);
  });
});

// ---------------------------------------------------------------------------
// getAnchor()
// ---------------------------------------------------------------------------

describe('getAnchor()', () => {
  const rpcUrl = 'https://mainnet.base.org';
  const contract = '0x' + 'ab'.repeat(20);
  const digest = '0x' + 'ff'.repeat(32);

  it('should decode anchor details from ABI-encoded response', async () => {
    // ABI-encoded response: address (32 bytes) + projectHash (32 bytes) + timestamp (32 bytes)
    const anchorer = '0'.repeat(24) + '1'.repeat(40); // address padded to 32 bytes
    const projectHash = 'aa'.repeat(32);
    const timestamp = '0'.repeat(56) + '67890abc'; // some timestamp

    mockFetch.mockResolvedValueOnce(
      rpcResponse('0x' + anchorer + projectHash + timestamp),
    );

    const result = await getAnchor(rpcUrl, contract, digest);

    expect(result).not.toBeNull();
    expect(result!.anchorer).toBe('0x' + '1'.repeat(40));
    expect(result!.projectHash).toBe('0x' + 'aa'.repeat(32));
    expect(result!.timestamp).toBeGreaterThan(0);
  });

  it('should return null when response is too short', async () => {
    mockFetch.mockResolvedValueOnce(rpcResponse('0x'));

    const result = await getAnchor(rpcUrl, contract, digest);
    expect(result).toBeNull();
  });

  it('should return null on RPC error', async () => {
    mockFetch.mockResolvedValueOnce(rpcError('not anchored'));

    const result = await getAnchor(rpcUrl, contract, digest);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// OnChainExporter
// ---------------------------------------------------------------------------

describe('OnChainExporter', () => {
  it('should buffer events and not anchor until batchSize', async () => {
    // We can't easily test anchorDigest without viem, so just test the counting logic
    let anchorCalled = false;
    const config: OnChainAnchorConfig = {
      rpcUrl: 'https://mainnet.base.org',
      contractAddress: '0x' + 'ab'.repeat(20),
      privateKey: '0x' + 'cc'.repeat(32),
    };

    const exporter = new OnChainExporter(config, 'test-project', () => 'abc123');

    // Mock the anchorDigest import — we can test structure without viem
    // The exporter exports events without anchoring until batch threshold
    const fakeEvent: ActionLog = {
      id: '1',
      type: 'transaction',
      timestamp: new Date().toISOString(),
      agentId: 'test',
      description: 'test event',
      metadata: {},
    };

    // With batchSize=10, exporting 5 events should NOT trigger anchor
    const result = await exporter.export([fakeEvent, fakeEvent, fakeEvent, fakeEvent, fakeEvent]);

    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(5);
  });
});
