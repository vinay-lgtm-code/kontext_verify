// ============================================================================
// Kontext SDK - Reserve Reconciliation Logging
// ============================================================================
// Queries on-chain totalSupply() for stablecoins and computes reconciliation
// status against caller-supplied published reserve figures. Read-only — never
// touches funds. Uses raw fetch() + JSON-RPC (zero dependencies).
//
// This is NOT "reserve attestation" — that term carries legal weight implying
// professional liability. This is reserve reconciliation logging: observability
// for operators building on top of stablecoins.

import type { Chain, Token } from '../types.js';
import { now } from '../utils.js';
import { STABLECOIN_CONTRACTS } from './data/stablecoin-contracts.js';
import type { StablecoinContractInfo } from './data/stablecoin-contracts.js';

// ============================================================================
// Types
// ============================================================================

export interface ReserveSnapshotInput {
  /** Stablecoin token to query */
  token: Token;
  /** Chain to query supply on */
  chain: Chain;
  /** JSON-RPC endpoint URL */
  rpcUrl: string;
  /** Published reserve figure from issuer's report (caller-supplied, never fetched) */
  publishedReserves?: string;
  /** Acceptable delta percentage (default: 0.001 = 0.1%) */
  tolerance?: number;
  /** Agent ID for logging */
  agentId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ReserveSnapshot {
  /** Stablecoin token */
  token: Token;
  /** Chain queried */
  chain: Chain;
  /** On-chain totalSupply() result as decimal string (human-readable units) */
  onChainSupply: string;
  /** Published reserves from caller (never fetched/scraped) */
  publishedReserves?: string;
  /** Percentage delta between supply and published reserves */
  delta?: string;
  /** Block number at time of snapshot */
  snapshotBlockNumber: number;
  /** Block hash for tamper-evident chain state proof */
  snapshotBlockHash: string;
  /** Reconciliation status */
  reconciliationStatus: 'matched' | 'delta_within_tolerance' | 'discrepancy' | 'unverified';
  /** ISO 8601 timestamp */
  timestamp: string;
}

// ============================================================================
// Pre-computed ERC-20 function selectors
// ============================================================================

/** totalSupply() — no arguments */
const SEL_TOTAL_SUPPLY = '0x18160ddd';

// ============================================================================
// JSON-RPC helpers (zero dependencies, same pattern as onchain.ts)
// ============================================================================

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`RPC HTTP error: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Build a reverse lookup: token+chain → { address, decimals }.
 * Built once at module load from the existing STABLECOIN_CONTRACTS registry.
 */
interface ContractLookup {
  address: string;
  decimals: number;
}

const CONTRACT_BY_TOKEN_CHAIN: Map<string, ContractLookup> = new Map();

for (const [address, info] of Object.entries(STABLECOIN_CONTRACTS)) {
  const key = `${info.token}:${info.chain}`;
  CONTRACT_BY_TOKEN_CHAIN.set(key, { address, decimals: info.decimals });
}

/**
 * Decode a uint256 hex string to a BigInt.
 */
function decodeBigUint(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length === 0) return 0n;
  return BigInt('0x' + clean);
}

/**
 * Convert a raw uint256 supply value to a human-readable decimal string
 * given the token's decimal places.
 */
function formatSupply(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;
  if (remainder === 0n) return whole.toString();
  const fracStr = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

/**
 * Compute the percentage delta between two numeric strings.
 * Returns the delta as a string (e.g., "0.064" for 0.064%).
 */
function computeDelta(supply: string, published: string): string {
  const s = parseFloat(supply);
  const p = parseFloat(published);
  if (p === 0) return '0';
  const delta = Math.abs(s - p) / p;
  return delta.toString();
}

// ============================================================================
// ReserveReconciler
// ============================================================================

/**
 * Static utility class for on-chain supply verification and reserve
 * reconciliation. All methods are read-only — no fund movement.
 *
 * Pattern: follows UsdcCompliance (all static methods, no instantiation).
 */
export class ReserveReconciler {
  /**
   * Query on-chain totalSupply() for a stablecoin and compute reconciliation
   * status against caller-supplied published reserves.
   *
   * @param input - Snapshot input with token, chain, RPC URL, and optional published reserves
   * @returns ReserveSnapshot with on-chain supply, delta, and reconciliation status
   */
  static async querySupply(input: ReserveSnapshotInput): Promise<ReserveSnapshot> {
    const { token, chain, rpcUrl, publishedReserves, tolerance = 0.001 } = input;

    // 1. Resolve contract address
    const contract = CONTRACT_BY_TOKEN_CHAIN.get(`${token}:${chain}`);
    if (!contract) {
      throw new Error(
        `No known contract address for ${token} on ${chain}. Supported: ${ReserveReconciler.getSupportedChains(token).join(', ') || 'none'}`,
      );
    }

    // 2. eth_call totalSupply()
    const supplyHex = (await rpcCall(rpcUrl, 'eth_call', [
      { to: contract.address, data: SEL_TOTAL_SUPPLY },
      'latest',
    ])) as string;

    const supplyRaw = decodeBigUint(supplyHex);
    const onChainSupply = formatSupply(supplyRaw, contract.decimals);

    // 3. Get latest block for tamper-evident proof
    const blockResult = (await rpcCall(rpcUrl, 'eth_getBlockByNumber', ['latest', false])) as {
      number: string;
      hash: string;
    } | null;

    if (!blockResult) {
      throw new Error('Failed to fetch latest block from RPC');
    }

    const snapshotBlockNumber = Number(BigInt(blockResult.number));
    const snapshotBlockHash = blockResult.hash;

    // 4. Compute reconciliation status
    let reconciliationStatus: ReserveSnapshot['reconciliationStatus'] = 'unverified';
    let delta: string | undefined;

    if (publishedReserves !== undefined) {
      delta = computeDelta(onChainSupply, publishedReserves);
      const deltaNum = parseFloat(delta);

      if (deltaNum === 0) {
        reconciliationStatus = 'matched';
      } else if (deltaNum <= tolerance) {
        reconciliationStatus = 'delta_within_tolerance';
      } else {
        reconciliationStatus = 'discrepancy';
      }
    }

    return {
      token,
      chain,
      onChainSupply,
      publishedReserves,
      delta,
      snapshotBlockNumber,
      snapshotBlockHash,
      reconciliationStatus,
      timestamp: now(),
    };
  }

  /**
   * Get the contract address for a stablecoin on a given chain.
   */
  static getContractAddress(token: Token, chain: Chain): string | undefined {
    return CONTRACT_BY_TOKEN_CHAIN.get(`${token}:${chain}`)?.address;
  }

  /**
   * Get all supported chains for a given stablecoin token.
   */
  static getSupportedChains(token: Token): Chain[] {
    const chains: Chain[] = [];
    for (const [key, lookup] of CONTRACT_BY_TOKEN_CHAIN) {
      if (key.startsWith(`${token}:`)) {
        chains.push(key.split(':')[1] as Chain);
      }
    }
    return chains;
  }

  /**
   * Get the number of decimals for a stablecoin on a given chain.
   */
  static getDecimals(token: Token, chain: Chain): number | undefined {
    return CONTRACT_BY_TOKEN_CHAIN.get(`${token}:${chain}`)?.decimals;
  }
}
