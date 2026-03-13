// ============================================================================
// Kontext SDK - Wallet Monitor (Chain Listener)
// ============================================================================
// Watches monitored wallet addresses on-chain for ERC-20 Transfer events.
// Catches ALL outgoing stablecoin transfers regardless of origin.

import type { Chain, Token, VerifyInput, VerifyResult, WalletMonitoringConfig } from '../types.js';
import {
  STABLECOIN_CONTRACTS,
  CHAIN_ID_MAP,
  TRANSFER_EVENT_ABI,
  type StablecoinContractInfo,
} from './data/stablecoin-contracts.js';

/** Minimal Kontext interface needed by the monitor */
export interface KontextForMonitor {
  verify(input: VerifyInput): Promise<VerifyResult>;
}

/** Unwatch function returned by viem's watchEvent */
type Unwatch = () => void;

/**
 * Watches monitored wallets on-chain for stablecoin Transfer events.
 * Uses viem's watchEvent with HTTP polling (works with any RPC endpoint).
 */
export class WalletMonitor {
  private readonly kontext: KontextForMonitor;
  private readonly config: WalletMonitoringConfig;
  private readonly agentId: string;
  private readonly tokens: Set<Token> | null;
  private readonly unwatchers: Unwatch[] = [];
  private running = false;

  /** Shared dedup set — tracks recently verified txHashes (populated by both layers) */
  readonly verifiedTxHashes = new Set<string>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly txTimestamps = new Map<string, number>();

  constructor(
    kontext: KontextForMonitor,
    config: WalletMonitoringConfig,
    options?: { agentId?: string; tokens?: Token[] },
  ) {
    this.kontext = kontext;
    this.config = config;
    this.agentId = options?.agentId ?? 'wallet-monitor';
    this.tokens = options?.tokens ? new Set(options.tokens) : null;
  }

  /**
   * Mark a txHash as already verified (called by the viem interceptor layer).
   * The monitor will skip this tx if it later sees it on-chain.
   */
  markVerified(txHash: string): void {
    const lower = txHash.toLowerCase();
    this.verifiedTxHashes.add(lower);
    this.txTimestamps.set(lower, Date.now());
  }

  /**
   * Start watching all configured chains for stablecoin transfers.
   * Dynamically imports viem — requires viem as a peer dependency.
   */
  async start(): Promise<void> {
    if (this.running) return;

    let viem: typeof import('viem');
    try {
      viem = await import('viem');
    } catch {
      throw new Error(
        'Wallet monitoring requires viem. Install it: npm install viem',
      );
    }

    const { createPublicClient, http } = viem;
    const wallets = this.config.wallets.map((w) => w.toLowerCase() as `0x${string}`);
    const pollingInterval = this.config.pollingIntervalMs ?? 12_000;

    // Group stablecoin contracts by chain
    const contractsByChain = new Map<Chain, Array<{ address: string; info: StablecoinContractInfo }>>();
    for (const [address, info] of Object.entries(STABLECOIN_CONTRACTS)) {
      if (this.tokens && !this.tokens.has(info.token)) continue;
      const existing = contractsByChain.get(info.chain) ?? [];
      existing.push({ address, info });
      contractsByChain.set(info.chain, existing);
    }

    // Start watchers for each chain with an RPC endpoint
    for (const [chain, contracts] of contractsByChain) {
      const rpcUrl = this.config.rpcEndpoints[chain];
      if (!rpcUrl) continue;

      const client = createPublicClient({
        transport: http(rpcUrl),
      });

      for (const { address, info } of contracts) {
        const unwatch = client.watchEvent({
          address: address as `0x${string}`,
          event: TRANSFER_EVENT_ABI as any,
          args: { from: wallets.length === 1 ? wallets[0] : wallets } as any,
          poll: true,
          pollingInterval,
          onLogs: (logs: any[]) => {
            for (const log of logs) {
              this.handleTransferLog(log, info);
            }
          },
        });

        this.unwatchers.push(unwatch);
      }
    }

    // Dedup cleanup: purge entries older than 5 minutes every 60 seconds
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - 5 * 60 * 1000;
      for (const [hash, ts] of this.txTimestamps) {
        if (ts < cutoff) {
          this.verifiedTxHashes.delete(hash);
          this.txTimestamps.delete(hash);
        }
      }
    }, 60_000);

    this.running = true;
  }

  /** Stop all watchers and cleanup */
  stop(): void {
    for (const unwatch of this.unwatchers) {
      try {
        unwatch();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.unwatchers.length = 0;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  private handleTransferLog(log: any, contractInfo: StablecoinContractInfo): void {
    const txHash = log.transactionHash as string;
    if (!txHash) return;

    // Dedup: skip if already verified by the code wrap layer
    const lowerHash = txHash.toLowerCase();
    if (this.verifiedTxHashes.has(lowerHash)) return;

    // Mark as verified to prevent double-processing
    this.markVerified(txHash);

    const from = (log.args?.from as string)?.toLowerCase() ?? '';
    const to = (log.args?.to as string)?.toLowerCase() ?? '';
    const value = log.args?.value as bigint | undefined;

    if (!from || !to || value === undefined) return;

    const amount = formatTokenAmount(value, contractInfo.decimals);

    const verifyInput: VerifyInput = {
      txHash,
      chain: contractInfo.chain,
      amount,
      token: contractInfo.token,
      from,
      to,
      agentId: this.agentId,
      metadata: {
        source: 'wallet-monitor',
        contractAddress: log.address,
      },
    };

    // Fire-and-forget
    this.kontext.verify(verifyInput).catch(() => {
      // Compliance logging failure must never propagate
    });
  }
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
