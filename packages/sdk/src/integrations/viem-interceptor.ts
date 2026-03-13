// ============================================================================
// Kontext SDK - Viem Auto-Instrumentation
// ============================================================================
// Wraps a viem WalletClient to automatically intercept stablecoin transfers
// and run kontext.verify() for compliance logging, OFAC screening, and
// tamper-evident audit trails.

import type { Chain, Token, VerifyInput, VerifyResult } from '../types.js';
import {
  STABLECOIN_CONTRACTS,
  KNOWN_STABLECOIN_ADDRESSES,
  CHAIN_ID_MAP,
  TRANSFER_SELECTOR,
  TRANSFER_FROM_SELECTOR,
  type StablecoinContractInfo,
} from './data/stablecoin-contracts.js';
import type { WalletMonitor } from './wallet-monitor.js';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/** Minimal WalletClient shape — avoids hard type dependency on viem */
export interface WalletClientLike {
  sendTransaction: (args: any) => Promise<`0x${string}`>;
  writeContract?: (args: any) => Promise<`0x${string}`>;
  chain?: { id: number; name?: string };
  account?: { address: `0x${string}` };
  extend: <T>(fn: (client: any) => T) => any;
}

/** Minimal Kontext interface needed by the interceptor */
export interface KontextForInterceptor {
  verify(input: VerifyInput): Promise<VerifyResult>;
  getConfig(): { agentId?: string; interceptorMode?: string; policy?: { allowedTokens?: Token[] } };
  getWalletMonitor?(): WalletMonitor | null;
}

/** Options for the viem auto-instrumentation decorator */
export interface ViemInstrumentationOptions {
  /** Agent ID to attribute transactions to */
  agentId?: string;
  /** Session ID for grouping transactions */
  sessionId?: string;
  /** Tokens to instrument (default: all known) */
  tokens?: Token[];
  /** Chains to instrument (default: all known) */
  chains?: Chain[];
  /** Compliance mode (default: reads from config, falls back to 'post-send') */
  mode?: 'post-send' | 'pre-send' | 'both';
  /** Called after verify() succeeds */
  onVerify?: (result: VerifyResult, txHash: string) => void | Promise<void>;
  /** Called when verify() fails */
  onError?: (error: Error, txHash: string) => void | Promise<void>;
  /** Additional metadata for every verify() call */
  metadata?: Record<string, unknown>;
}

/**
 * Thrown in pre-send mode when compliance screening fails.
 */
export class ViemComplianceError extends Error {
  public readonly result: VerifyResult;
  public readonly from: string;
  public readonly to: string;
  public readonly amount: string;

  constructor(
    message: string,
    result: VerifyResult,
    details: { from: string; to: string; amount: string },
  ) {
    super(message);
    this.name = 'ViemComplianceError';
    this.result = result;
    this.from = details.from;
    this.to = details.to;
    this.amount = details.amount;
  }
}

// ---------------------------------------------------------------------------
// Decoded transfer shape
// ---------------------------------------------------------------------------

interface DecodedTransfer {
  to: string;
  amount: bigint;
  from?: string;
}

// ---------------------------------------------------------------------------
// Main Decorator
// ---------------------------------------------------------------------------

/**
 * Wraps a viem WalletClient with Kontext auto-instrumentation.
 * Every stablecoin transfer is automatically compliance-checked via verify().
 *
 * Reads defaults from kontext.getConfig() — options override config values.
 */
export function withKontextCompliance<TClient extends WalletClientLike>(
  client: TClient,
  kontext: KontextForInterceptor,
  options?: Partial<ViemInstrumentationOptions>,
): TClient {
  const config = kontext.getConfig();
  const agentId = options?.agentId ?? config.agentId ?? 'viem-agent';
  const mode = options?.mode ?? (config.interceptorMode as any) ?? 'post-send';
  const sessionId = options?.sessionId;
  const metadata = options?.metadata;
  const onVerify = options?.onVerify;
  const onError = options?.onError;

  // Build allowed contract set based on token/chain filters
  const allowedTokens = options?.tokens
    ? new Set(options.tokens)
    : config.policy?.allowedTokens
      ? new Set(config.policy.allowedTokens)
      : null;

  const allowedChains = options?.chains ? new Set(options.chains) : null;

  const allowedContracts = new Set<string>();
  for (const [address, info] of Object.entries(STABLECOIN_CONTRACTS)) {
    if (allowedTokens && !allowedTokens.has(info.token)) continue;
    if (allowedChains && !allowedChains.has(info.chain)) continue;
    allowedContracts.add(address);
  }

  // Get wallet monitor for dedup registration
  const monitor = kontext.getWalletMonitor?.() ?? null;

  return client.extend((baseClient: any) => ({
    async sendTransaction(params: any): Promise<`0x${string}`> {
      const target = params.to?.toLowerCase();
      if (!target || !allowedContracts.has(target)) {
        return baseClient.sendTransaction(params);
      }

      const decoded = params.data ? decodeTransferCalldata(params.data) : null;
      if (!decoded) {
        return baseClient.sendTransaction(params);
      }

      const contractInfo = STABLECOIN_CONTRACTS[target]!;
      const verifyInput = buildVerifyInput(
        decoded, contractInfo, params, baseClient, agentId, sessionId, metadata,
      );

      if (mode === 'pre-send' || mode === 'both') {
        await runPreSendScreen(kontext, verifyInput);
      }

      const txHash = await baseClient.sendTransaction(params);

      if (mode === 'post-send' || mode === 'both') {
        // Register with dedup set before firing verify
        monitor?.markVerified(txHash);
        runPostSendVerify(kontext, { ...verifyInput, txHash }, txHash, onVerify, onError);
      }

      return txHash;
    },

    async writeContract(params: any): Promise<`0x${string}`> {
      if (!baseClient.writeContract) {
        throw new Error('writeContract not available on this client');
      }

      const target = params.address?.toLowerCase();
      if (!target || !allowedContracts.has(target)) {
        return baseClient.writeContract(params);
      }

      const fn = params.functionName;
      if (fn !== 'transfer' && fn !== 'transferFrom') {
        return baseClient.writeContract(params);
      }

      const decoded = decodeWriteContractArgs(fn, params.args);
      if (!decoded) {
        return baseClient.writeContract(params);
      }

      const contractInfo = STABLECOIN_CONTRACTS[target]!;
      const verifyInput = buildVerifyInput(
        decoded, contractInfo, params, baseClient, agentId, sessionId, metadata,
      );

      if (mode === 'pre-send' || mode === 'both') {
        await runPreSendScreen(kontext, verifyInput);
      }

      const txHash = await baseClient.writeContract(params);

      if (mode === 'post-send' || mode === 'both') {
        monitor?.markVerified(txHash);
        runPostSendVerify(kontext, { ...verifyInput, txHash }, txHash, onVerify, onError);
      }

      return txHash;
    },
  })) as TClient;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function buildVerifyInput(
  decoded: DecodedTransfer,
  contractInfo: StablecoinContractInfo,
  params: any,
  client: any,
  agentId: string,
  sessionId?: string,
  metadata?: Record<string, unknown>,
): VerifyInput {
  const chain = client.chain?.id
    ? CHAIN_ID_MAP[client.chain.id as number] ?? contractInfo.chain
    : contractInfo.chain;

  const from = (
    decoded.from
    ?? params.account?.address
    ?? client.account?.address
    ?? params.from
    ?? ''
  ).toLowerCase();

  return {
    txHash: '',
    chain,
    amount: formatTokenAmount(decoded.amount, contractInfo.decimals),
    token: contractInfo.token,
    from,
    to: decoded.to.toLowerCase(),
    agentId,
    sessionId,
    metadata: {
      ...metadata,
      source: 'viem-auto-instrumentation',
      contractAddress: params.to ?? params.address,
    },
  };
}

function runPostSendVerify(
  kontext: KontextForInterceptor,
  input: VerifyInput,
  txHash: string,
  onVerify?: (result: VerifyResult, txHash: string) => void | Promise<void>,
  onError?: (error: Error, txHash: string) => void | Promise<void>,
): void {
  kontext.verify(input).then(
    (result) => {
      if (onVerify) {
        try {
          const p = onVerify(result, txHash);
          if (p && typeof (p as any).catch === 'function') {
            (p as Promise<void>).catch(() => {});
          }
        } catch {
          // Swallow callback errors
        }
      }
    },
    (error) => {
      if (onError) {
        try {
          const p = onError(error as Error, txHash);
          if (p && typeof (p as any).catch === 'function') {
            (p as Promise<void>).catch(() => {});
          }
        } catch {
          // Swallow callback errors
        }
      }
    },
  );
}

async function runPreSendScreen(
  kontext: KontextForInterceptor,
  input: VerifyInput,
): Promise<void> {
  const result = await kontext.verify({ ...input, txHash: 'pre-screening' });
  if (!result.compliant) {
    throw new ViemComplianceError(
      `Transaction blocked: ${result.recommendations?.[0] ?? 'compliance check failed'}`,
      result,
      { from: input.from, to: input.to, amount: input.amount },
    );
  }
}

/** Decode transfer(address,uint256) or transferFrom(address,address,uint256) calldata */
function decodeTransferCalldata(data: string): DecodedTransfer | null {
  if (!data || data.length < 10) return null;
  const selector = data.slice(0, 10).toLowerCase();

  if (selector === TRANSFER_SELECTOR && data.length >= 138) {
    const to = '0x' + data.slice(34, 74);
    const amount = BigInt('0x' + data.slice(74, 138));
    return { to, amount };
  }

  if (selector === TRANSFER_FROM_SELECTOR && data.length >= 202) {
    const from = '0x' + data.slice(34, 74);
    const to = '0x' + data.slice(98, 138);
    const amount = BigInt('0x' + data.slice(138, 202));
    return { from, to, amount };
  }

  return null;
}

/** Extract transfer args from writeContract params */
function decodeWriteContractArgs(
  functionName: string,
  args: any[],
): DecodedTransfer | null {
  if (!args || !Array.isArray(args)) return null;

  if (functionName === 'transfer' && args.length >= 2) {
    return { to: String(args[0]), amount: BigInt(args[1]) };
  }

  if (functionName === 'transferFrom' && args.length >= 3) {
    return { from: String(args[0]), to: String(args[1]), amount: BigInt(args[2]) };
  }

  return null;
}

/** Convert BigInt token amount to human-readable string */
function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  if (fraction === 0n) return whole.toString();
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}
