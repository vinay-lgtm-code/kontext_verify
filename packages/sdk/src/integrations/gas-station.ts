// ============================================================================
// Kontext SDK - Circle Gas Station Integration
// ============================================================================
//
// Integrates Circle's Gas Station (sponsored gas) feature with Kontext's
// audit and compliance infrastructure. Gas Station allows applications to
// sponsor gas fees for their users on supported chains.
//
// Supports two operating modes:
// - **Simulation mode** (default): Simulates gas sponsorship eligibility
//   and estimation without real API calls.
// - **Live mode**: When a Circle API key is provided, queries Circle's
//   Gas Station API for real eligibility and estimates.
// ============================================================================

import type {
  Chain,
  ActionLog,
} from '../types.js';
import { generateId, now, parseAmount } from '../utils.js';

// ============================================================================
// Types
// ============================================================================

/** Gas sponsorship eligibility result */
export interface GasEligibility {
  /** Whether the wallet is eligible for sponsored gas */
  eligible: boolean;
  /** Maximum sponsored amount in native token */
  maxSponsoredAmount: string;
  /** Supported operations */
  supportedOperations: string[];
  /** Remaining daily quota */
  remainingDailyQuota: string;
  /** Reason if not eligible */
  reason?: string;
}

/** Input for gas estimation */
export interface GasEstimateInput {
  /** Source wallet ID */
  walletId: string;
  /** Destination address */
  destinationAddress: string;
  /** Transfer amount */
  amount: string;
  /** Blockchain network */
  chain: Chain;
  /** Token being transferred */
  token?: string;
}

/** Gas estimate result */
export interface GasEstimate {
  /** Estimated gas cost in native token */
  estimatedGas: string;
  /** Whether this gas would be sponsored */
  sponsored: boolean;
  /** Amount the user would pay (zero if fully sponsored) */
  userCost: string;
  /** Amount Circle would sponsor */
  sponsoredAmount: string;
  /** Chain the estimate is for */
  chain: Chain;
  /** Native token used for gas */
  nativeToken: string;
}

/** Input for logging a gas sponsorship event */
export interface GasSponsorshipLog {
  /** Wallet ID that received sponsorship */
  walletId: string;
  /** Transaction hash of the sponsored transaction */
  transactionHash: string;
  /** Amount of gas sponsored */
  sponsoredGasAmount: string;
  /** Chain the sponsorship occurred on */
  chain: Chain;
  /** Agent that initiated the transaction */
  agent?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Native gas tokens by chain */
const NATIVE_TOKENS: Record<string, string> = {
  ethereum: 'ETH',
  base: 'ETH',
  polygon: 'MATIC',
  arbitrum: 'ETH',
  optimism: 'ETH',
  arc: 'ARC',
};

/** Simulated gas prices in native token (very rough approximations) */
const SIMULATED_GAS_PRICES: Record<string, string> = {
  ethereum: '0.005',
  base: '0.0001',
  polygon: '0.01',
  arbitrum: '0.0003',
  optimism: '0.0002',
  arc: '0.0001',
};

/** Chains eligible for gas sponsorship */
const SPONSORSHIP_ELIGIBLE_CHAINS: Chain[] = [
  'base',
  'polygon',
  'arbitrum',
  'optimism',
  'arc',
];

/**
 * Adapter interface for Circle Gas Station API.
 */
export interface GasStationAdapter {
  checkEligibility(walletId: string, chain: Chain): Promise<GasEligibility>;
  estimateGas(input: GasEstimateInput): Promise<GasEstimate>;
}

// ============================================================================
// Simulation Adapter
// ============================================================================

/**
 * Simulated Gas Station adapter for development and testing.
 */
class SimulatedGasStationAdapter implements GasStationAdapter {
  async checkEligibility(walletId: string, chain: Chain): Promise<GasEligibility> {
    const eligible = SPONSORSHIP_ELIGIBLE_CHAINS.includes(chain);

    return {
      eligible,
      maxSponsoredAmount: eligible ? '0.01' : '0',
      supportedOperations: eligible
        ? ['transfer', 'approve', 'swap']
        : [],
      remainingDailyQuota: eligible ? '0.5' : '0',
      reason: eligible ? undefined : `Chain ${chain} is not eligible for gas sponsorship`,
    };
  }

  async estimateGas(input: GasEstimateInput): Promise<GasEstimate> {
    const gasPrice = SIMULATED_GAS_PRICES[input.chain] ?? '0.001';
    const nativeToken = NATIVE_TOKENS[input.chain] ?? 'ETH';
    const sponsored = SPONSORSHIP_ELIGIBLE_CHAINS.includes(input.chain);

    return {
      estimatedGas: gasPrice,
      sponsored,
      userCost: sponsored ? '0' : gasPrice,
      sponsoredAmount: sponsored ? gasPrice : '0',
      chain: input.chain,
      nativeToken,
    };
  }
}

// ============================================================================
// Live Adapter
// ============================================================================

/**
 * Live Gas Station adapter that calls Circle's API.
 */
class LiveGasStationAdapter implements GasStationAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.circle.com/v1/w3s';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Circle Gas Station API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  }

  async checkEligibility(walletId: string, chain: Chain): Promise<GasEligibility> {
    try {
      const result = await this.request<{
        data: {
          eligible: boolean;
          maxSponsoredAmount: string;
          supportedOperations: string[];
          remainingDailyQuota: string;
        }
      }>('GET', `/gas-station/eligibility?walletId=${walletId}&chain=${chain}`);
      return result.data;
    } catch {
      // Fallback to simulation
      const sim = new SimulatedGasStationAdapter();
      return sim.checkEligibility(walletId, chain);
    }
  }

  async estimateGas(input: GasEstimateInput): Promise<GasEstimate> {
    try {
      const result = await this.request<{ data: GasEstimate }>('POST', '/gas-station/estimate', input);
      return result.data;
    } catch {
      // Fallback to simulation
      const sim = new SimulatedGasStationAdapter();
      return sim.estimateGas(input);
    }
  }
}

// ============================================================================
// Kontext Client Interface (subset needed by this module)
// ============================================================================

/** Minimal interface for the Kontext client used by GasStationManager */
interface KontextLike {
  log(input: { type: string; description: string; agentId: string; metadata?: Record<string, unknown> }): Promise<ActionLog>;
}

// ============================================================================
// GasStationManager
// ============================================================================

/**
 * Manages Circle Gas Station (sponsored gas) with integrated Kontext audit
 * logging for compliance tracking.
 *
 * Gas sponsorship events are logged through Kontext's tamper-evident audit
 * system to maintain a clear record of subsidized transactions.
 *
 * @example
 * ```typescript
 * const kontext = Kontext.init({ projectId: 'my-project', environment: 'production' });
 * const gasStation = new GasStationManager(kontext);
 *
 * const eligibility = await gasStation.checkEligibility('wallet-123', 'base');
 * if (eligibility.eligible) {
 *   const estimate = await gasStation.estimateGas({
 *     walletId: 'wallet-123',
 *     destinationAddress: '0x...',
 *     amount: '100',
 *     chain: 'base',
 *   });
 *   console.log(`Gas sponsored: ${estimate.sponsored}`);
 * }
 * ```
 */
export class GasStationManager {
  private readonly kontext: KontextLike;
  private readonly adapter: GasStationAdapter;
  private readonly isLiveMode: boolean;

  /**
   * Create a new GasStationManager.
   *
   * @param kontextClient - Initialized Kontext SDK client
   * @param circleApiKey - Circle API key (optional; omit for simulation mode)
   */
  constructor(kontextClient: KontextLike, circleApiKey?: string) {
    this.kontext = kontextClient;
    this.isLiveMode = !!circleApiKey;
    this.adapter = circleApiKey
      ? new LiveGasStationAdapter(circleApiKey)
      : new SimulatedGasStationAdapter();
  }

  /**
   * Check if a wallet is eligible for gas sponsorship on a given chain.
   *
   * @param walletId - Wallet identifier
   * @param chain - Blockchain network
   * @returns GasEligibility with details
   */
  async checkEligibility(walletId: string, chain: Chain): Promise<GasEligibility> {
    const eligibility = await this.adapter.checkEligibility(walletId, chain);

    // Log the eligibility check
    await this.kontext.log({
      type: 'gas_eligibility_check',
      description: `Gas eligibility check for wallet ${walletId} on ${chain}: ${eligibility.eligible ? 'eligible' : 'not eligible'}`,
      agentId: 'gas-station-manager',
      metadata: {
        walletId,
        chain,
        eligible: eligibility.eligible,
        maxSponsoredAmount: eligibility.maxSponsoredAmount,
        remainingDailyQuota: eligibility.remainingDailyQuota,
        reason: eligibility.reason,
      },
    });

    return eligibility;
  }

  /**
   * Estimate gas cost for a transfer and determine sponsorship.
   *
   * @param input - Transfer details for estimation
   * @returns GasEstimate with sponsorship information
   */
  async estimateGas(input: GasEstimateInput): Promise<GasEstimate> {
    const estimate = await this.adapter.estimateGas(input);

    // Log the estimate
    await this.kontext.log({
      type: 'gas_estimate',
      description: `Gas estimate for ${input.amount} ${input.token ?? 'USDC'} transfer on ${input.chain}: ${estimate.estimatedGas} ${estimate.nativeToken}${estimate.sponsored ? ' (sponsored)' : ''}`,
      agentId: 'gas-station-manager',
      metadata: {
        walletId: input.walletId,
        destinationAddress: input.destinationAddress,
        amount: input.amount,
        chain: input.chain,
        token: input.token,
        estimatedGas: estimate.estimatedGas,
        sponsored: estimate.sponsored,
        userCost: estimate.userCost,
        sponsoredAmount: estimate.sponsoredAmount,
      },
    });

    return estimate;
  }

  /**
   * Log a gas sponsorship event for audit purposes.
   *
   * Call this after a sponsored transaction has been confirmed on-chain
   * to record the sponsorship in Kontext's audit trail.
   *
   * @param input - Sponsorship event details
   * @returns The created ActionLog entry
   */
  async logGasSponsorship(input: GasSponsorshipLog): Promise<ActionLog> {
    const nativeToken = NATIVE_TOKENS[input.chain] ?? 'ETH';

    const action = await this.kontext.log({
      type: 'gas_sponsorship',
      description: `Gas sponsorship: ${input.sponsoredGasAmount} ${nativeToken} for wallet ${input.walletId} on ${input.chain} (tx: ${input.transactionHash})`,
      agentId: input.agent ?? 'gas-station-manager',
      metadata: {
        walletId: input.walletId,
        transactionHash: input.transactionHash,
        sponsoredGasAmount: input.sponsoredGasAmount,
        chain: input.chain,
        nativeToken,
        ...input.metadata,
      },
    });

    return action;
  }

  /**
   * Get the list of chains eligible for gas sponsorship.
   *
   * @returns Array of supported chains
   */
  static getEligibleChains(): Chain[] {
    return [...SPONSORSHIP_ELIGIBLE_CHAINS];
  }

  /**
   * Get the native gas token for a chain.
   *
   * @param chain - Blockchain network
   * @returns Native token symbol
   */
  static getNativeToken(chain: Chain): string {
    return NATIVE_TOKENS[chain] ?? 'ETH';
  }
}
