// ============================================================================
// Kontext SDK — On-Chain Digest Anchoring
// ============================================================================
// Anchors terminal digest hashes onto Base chain as immutable proof that
// compliance checks ran. Read operations (verifyAnchor, getAnchor) use raw
// fetch() + JSON-RPC with pre-computed selectors. Write operations (anchorDigest)
// require viem as an optional peer dependency.

import type { ActionLog, OnChainAnchorConfig, AnchorResult, AnchorVerification } from './types.js';
import type { EventExporter, ExporterResult } from './exporters.js';

// ============================================================================
// Pre-computed function selectors (first 4 bytes of keccak256 of signature)
// ============================================================================
// anchor(bytes32,bytes32)   → 0xa21f3c6a
// verify(bytes32)           → 0x75e36616
// getAnchor(bytes32)        → 0x7feb51d9
const SEL_ANCHOR = '0xa21f3c6a';
const SEL_VERIFY = '0x75e36616';
const SEL_GET_ANCHOR = '0x7feb51d9';

// ============================================================================
// JSON-RPC helpers (zero dependencies)
// ============================================================================

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

/** Encode a bytes32 value as 64-char hex (no 0x prefix, zero-padded) */
function encodeBytes32(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return clean.padStart(64, '0');
}

/** Decode a uint256 from ABI-encoded hex */
function decodeUint256(hex: string): number {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return parseInt(clean, 16);
}

/** Decode an address from ABI-encoded hex (last 40 chars of 64-char word) */
function decodeAddress(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return '0x' + clean.slice(24);
}

// ============================================================================
// Read-only functions (zero dependencies, raw fetch + JSON-RPC)
// ============================================================================

/**
 * Verify whether a digest has been anchored on-chain.
 * Uses eth_call — no signing required, no dependencies.
 */
export async function verifyAnchor(
  rpcUrl: string,
  contractAddress: string,
  digest: string,
): Promise<AnchorVerification> {
  const calldata = SEL_VERIFY + encodeBytes32(digest);
  const result = (await rpcCall(rpcUrl, 'eth_call', [
    { to: contractAddress, data: calldata },
    'latest',
  ])) as string;

  const anchored = decodeUint256(result) !== 0;

  return { anchored, digest };
}

/**
 * Get full anchor details for a digest.
 * Returns null if the digest is not anchored.
 */
export async function getAnchor(
  rpcUrl: string,
  contractAddress: string,
  digest: string,
): Promise<{ anchorer: string; projectHash: string; timestamp: number } | null> {
  const calldata = SEL_GET_ANCHOR + encodeBytes32(digest);
  try {
    const result = (await rpcCall(rpcUrl, 'eth_call', [
      { to: contractAddress, data: calldata },
      'latest',
    ])) as string;

    const clean = result.startsWith('0x') ? result.slice(2) : result;
    if (clean.length < 192) return null;

    const anchorer = decodeAddress(clean.slice(0, 64));
    const projectHash = '0x' + clean.slice(64, 128);
    const timestamp = decodeUint256('0x' + clean.slice(128, 192));

    return { anchorer, projectHash, timestamp };
  } catch {
    return null;
  }
}

// ============================================================================
// Write function (requires viem as optional peer dependency)
// ============================================================================

/**
 * Anchor a digest hash on-chain via the KontextAnchor contract.
 * Requires viem: `npm install viem`
 */
export async function anchorDigest(
  config: OnChainAnchorConfig,
  digest: string,
  projectId: string,
): Promise<AnchorResult> {
  // Dynamic import of viem — fails gracefully with clear error
  let viem: typeof import('viem');
  let viemChains: typeof import('viem/chains');
  let viemAccounts: typeof import('viem/accounts');
  try {
    viem = await import('viem');
    viemChains = await import('viem/chains');
    viemAccounts = await import('viem/accounts');
  } catch {
    throw new Error(
      'On-chain anchoring requires viem. Install it: npm install viem',
    );
  }

  if (!config.privateKey) {
    throw new Error('privateKey is required for on-chain anchoring');
  }

  const account = viemAccounts.privateKeyToAccount(config.privateKey as `0x${string}`);

  // Determine chain from rpcUrl
  const chain = config.rpcUrl.includes('sepolia')
    ? viemChains.baseSepolia
    : viemChains.base;

  const client = viem.createWalletClient({
    account,
    chain,
    transport: viem.http(config.rpcUrl),
  });

  const publicClient = viem.createPublicClient({
    chain,
    transport: viem.http(config.rpcUrl),
  });

  // Compute projectHash as keccak256 of projectId
  const projectHash = viem.keccak256(viem.toBytes(projectId));

  // Ensure digest is bytes32 format
  const digestBytes32 = digest.startsWith('0x')
    ? (digest as `0x${string}`)
    : (`0x${digest}` as `0x${string}`);

  // ABI for the anchor function
  const abi = [
    {
      name: 'anchor',
      type: 'function' as const,
      stateMutability: 'nonpayable' as const,
      inputs: [
        { name: 'digest', type: 'bytes32' },
        { name: 'projectHash', type: 'bytes32' },
      ],
      outputs: [],
    },
  ] as const;

  const txHash = await client.writeContract({
    address: config.contractAddress as `0x${string}`,
    abi,
    functionName: 'anchor',
    args: [digestBytes32, projectHash as `0x${string}`],
  });

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    digest,
    txHash,
    blockNumber: Number(receipt.blockNumber),
    timestamp: Math.floor(Date.now() / 1000),
    contractAddress: config.contractAddress,
    chain: chain.name.toLowerCase(),
  };
}

// ============================================================================
// OnChainExporter — EventExporter implementation
// ============================================================================

/**
 * Exporter that anchors terminal digest hashes on Base chain.
 * Buffers events and anchors when batchSize is reached.
 */
export class OnChainExporter implements EventExporter {
  private readonly config: OnChainAnchorConfig;
  private readonly projectId: string;
  private readonly batchSize: number;
  private readonly getTerminalDigest: () => string;
  private eventCount: number = 0;

  constructor(
    config: OnChainAnchorConfig,
    projectId: string,
    getTerminalDigest: () => string,
  ) {
    this.config = config;
    this.projectId = projectId;
    this.batchSize = 10;
    this.getTerminalDigest = getTerminalDigest;
  }

  async export(events: ActionLog[]): Promise<ExporterResult> {
    this.eventCount += events.length;
    if (this.eventCount >= this.batchSize) {
      const digest = this.getTerminalDigest();
      await anchorDigest(this.config, digest, this.projectId);
      this.eventCount = 0;
    }
    return { success: true, exportedCount: events.length };
  }

  async flush(): Promise<void> {
    if (this.eventCount > 0) {
      const digest = this.getTerminalDigest();
      await anchorDigest(this.config, digest, this.projectId);
      this.eventCount = 0;
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }
}
