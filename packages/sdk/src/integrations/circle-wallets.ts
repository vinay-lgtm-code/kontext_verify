// ============================================================================
// Kontext SDK - Circle Programmable Wallets Integration
// ============================================================================
//
// Integrates Circle's Programmable Wallets (wallet-as-a-service) with
// Kontext's compliance and audit infrastructure. Supports two operating modes:
//
// - **Simulation mode** (default): Validates flows, runs compliance checks,
//   and logs everything without making real Circle API calls.
// - **Live mode**: When a Circle API key is provided, proxies real API calls
//   to Circle's endpoints.
//
// All wallet operations are automatically logged through Kontext's rolling
// SHA-256 digest chain for tamper-evident audit trails.
// ============================================================================

import type {
  Chain,
  ActionLog,
  LogTransactionInput,
  ComplianceCheckResult,
  AnomalySeverity,
} from '../types.js';
import { generateId, now, parseAmount, isValidAddress } from '../utils.js';
import { UsdcCompliance } from './usdc.js';

// ============================================================================
// Types
// ============================================================================

/** Configuration options for the CircleWalletManager */
export interface CircleWalletOptions {
  /** Entity secret ciphertext for developer-controlled wallets */
  entitySecretCiphertext?: string;
  /** Default blockchain network for new wallets */
  defaultChain?: Chain;
  /** Automatically log all wallet operations through Kontext (default: true) */
  autoLog?: boolean;
  /** Require compliance check before transfers (default: true) */
  requireCompliance?: boolean;
}

/** A wallet set (group of wallets) */
export interface WalletSet {
  /** Unique wallet set identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Custody type */
  custodyType: 'DEVELOPER' | 'USER';
  /** Creation timestamp */
  createdAt: string;
}

/** A Circle programmable wallet */
export interface CircleWallet {
  /** Unique wallet identifier */
  id: string;
  /** Parent wallet set ID */
  walletSetId: string;
  /** On-chain address */
  address: string;
  /** Blockchain network */
  chain: Chain;
  /** Custody type */
  custodyType: 'DEVELOPER' | 'USER';
  /** Wallet state */
  state: 'LIVE' | 'FROZEN';
  /** Creation timestamp */
  createDate: string;
}

/** Options for creating a new wallet */
export interface CreateWalletOptions {
  /** Blockchain network for the wallet */
  chain: Chain;
  /** Custody type (default: 'DEVELOPER') */
  custodyType?: 'DEVELOPER' | 'USER';
  /** Additional metadata */
  metadata?: Record<string, string>;
}

/** Input for a compliant transfer */
export interface CompliantTransferInput {
  /** Source wallet ID */
  walletId: string;
  /** Destination on-chain address */
  destinationAddress: string;
  /** Transfer amount (string to preserve precision) */
  amount: string;
  /** Blockchain network (defaults to wallet's chain) */
  chain?: Chain;
  /** Token to transfer */
  token?: 'USDC' | 'EURC';
  /** Agent initiating the transfer */
  agent?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/** Result of a compliant transfer */
export interface CompliantTransferResult {
  /** Circle transfer identifier */
  transferId: string;
  /** Source wallet ID */
  walletId: string;
  /** Transfer status */
  status: 'COMPLETED' | 'BLOCKED' | 'PENDING_REVIEW';
  /** Compliance check details */
  complianceCheck: ComplianceCheckSummary;
  /** Kontext action log ID */
  kontextLogId: string;
  /** Trust score at time of transfer */
  trustScore: number;
  /** Transfer amount */
  amount: string;
  /** Blockchain network */
  chain: Chain;
  /** On-chain transaction hash (if completed) */
  transactionHash?: string;
  /** Reason the transfer was blocked (if blocked) */
  blockedReason?: string;
}

/** Summary of compliance check for a transfer */
export interface ComplianceCheckSummary {
  /** Whether the check passed */
  passed: boolean;
  /** Risk level */
  riskLevel: AnomalySeverity;
  /** Individual check results */
  checks: ComplianceCheckResult[];
  /** Recommendations */
  recommendations: string[];
}

/** Wallet balance information */
export interface WalletBalance {
  /** Wallet identifier */
  walletId: string;
  /** Blockchain network */
  chain: Chain;
  /** Token balances */
  balances: { token: string; amount: string }[];
}

/**
 * Adapter interface for Circle API calls.
 * Allows swapping between simulation and live implementations.
 */
export interface CircleApiAdapter {
  createWalletSet(name: string, custodyType: string): Promise<{ id: string }>;
  createWallet(walletSetId: string, chain: Chain, custodyType: string): Promise<{ id: string; address: string }>;
  getWallet(walletId: string): Promise<{ id: string; address: string; chain: Chain; state: string } | null>;
  listWallets(walletSetId: string): Promise<{ id: string; address: string; chain: Chain; state: string }[]>;
  transfer(params: { walletId: string; destinationAddress: string; amount: string; chain: Chain; token: string }): Promise<{ transferId: string; transactionHash: string }>;
  getBalance(walletId: string): Promise<{ balances: { token: string; amount: string }[] }>;
}

// ============================================================================
// Simulation Adapter
// ============================================================================

/**
 * Simulated Circle API adapter for testing and development.
 * Returns deterministic mock data without making real API calls.
 */
class SimulationAdapter implements CircleApiAdapter {
  private walletCounter = 0;
  private transferCounter = 0;

  async createWalletSet(name: string, custodyType: string): Promise<{ id: string }> {
    return { id: `ws_sim_${generateId().slice(0, 8)}` };
  }

  async createWallet(walletSetId: string, chain: Chain, custodyType: string): Promise<{ id: string; address: string }> {
    this.walletCounter++;
    const addressHex = this.walletCounter.toString(16).padStart(40, '0');
    return {
      id: `wallet_sim_${generateId().slice(0, 8)}`,
      address: `0x${addressHex}`,
    };
  }

  async getWallet(walletId: string): Promise<{ id: string; address: string; chain: Chain; state: string } | null> {
    return {
      id: walletId,
      address: '0x' + '0'.repeat(40),
      chain: 'ethereum',
      state: 'LIVE',
    };
  }

  async listWallets(walletSetId: string): Promise<{ id: string; address: string; chain: Chain; state: string }[]> {
    return [];
  }

  async transfer(params: { walletId: string; destinationAddress: string; amount: string; chain: Chain; token: string }): Promise<{ transferId: string; transactionHash: string }> {
    this.transferCounter++;
    return {
      transferId: `txn_sim_${generateId().slice(0, 8)}`,
      transactionHash: `0x${this.transferCounter.toString(16).padStart(64, '0')}`,
    };
  }

  async getBalance(walletId: string): Promise<{ balances: { token: string; amount: string }[] }> {
    return {
      balances: [
        { token: 'USDC', amount: '1000.00' },
      ],
    };
  }
}

// ============================================================================
// Live Adapter
// ============================================================================

/**
 * Live Circle API adapter that makes real HTTP calls to Circle's endpoints.
 */
class LiveCircleAdapter implements CircleApiAdapter {
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
      throw new Error(`Circle API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  }

  async createWalletSet(name: string, custodyType: string): Promise<{ id: string }> {
    const result = await this.request<{ data: { walletSet: { id: string } } }>('POST', '/developer/walletSets', {
      name,
      idempotencyKey: generateId(),
    });
    return { id: result.data.walletSet.id };
  }

  async createWallet(walletSetId: string, chain: Chain, custodyType: string): Promise<{ id: string; address: string }> {
    const chainMap: Record<string, string> = {
      ethereum: 'ETH',
      base: 'BASE',
      polygon: 'MATIC',
      arbitrum: 'ARB',
      optimism: 'OP',
      arc: 'ARC',
    };
    const result = await this.request<{ data: { wallets: { id: string; address: string }[] } }>('POST', '/developer/wallets', {
      walletSetId,
      blockchains: [chainMap[chain] ?? chain.toUpperCase()],
      count: 1,
      idempotencyKey: generateId(),
    });
    const wallet = result.data.wallets[0];
    return { id: wallet!.id, address: wallet!.address };
  }

  async getWallet(walletId: string): Promise<{ id: string; address: string; chain: Chain; state: string } | null> {
    try {
      const result = await this.request<{ data: { wallet: { id: string; address: string; blockchain: string; state: string } } }>('GET', `/wallets/${walletId}`);
      const w = result.data.wallet;
      return { id: w.id, address: w.address, chain: w.blockchain.toLowerCase() as Chain, state: w.state };
    } catch {
      return null;
    }
  }

  async listWallets(walletSetId: string): Promise<{ id: string; address: string; chain: Chain; state: string }[]> {
    const result = await this.request<{ data: { wallets: { id: string; address: string; blockchain: string; state: string }[] } }>('GET', `/wallets?walletSetId=${walletSetId}`);
    return result.data.wallets.map((w) => ({
      id: w.id,
      address: w.address,
      chain: w.blockchain.toLowerCase() as Chain,
      state: w.state,
    }));
  }

  async transfer(params: { walletId: string; destinationAddress: string; amount: string; chain: Chain; token: string }): Promise<{ transferId: string; transactionHash: string }> {
    const result = await this.request<{ data: { transfer: { id: string; transactionHash: string } } }>('POST', '/developer/transactions/transfer', {
      walletId: params.walletId,
      destinationAddress: params.destinationAddress,
      amounts: [params.amount],
      tokenId: params.token,
      idempotencyKey: generateId(),
    });
    return {
      transferId: result.data.transfer.id,
      transactionHash: result.data.transfer.transactionHash,
    };
  }

  async getBalance(walletId: string): Promise<{ balances: { token: string; amount: string }[] }> {
    const result = await this.request<{ data: { tokenBalances: { token: { symbol: string }; amount: string }[] } }>('GET', `/wallets/${walletId}/balances`);
    return {
      balances: result.data.tokenBalances.map((b) => ({
        token: b.token.symbol,
        amount: b.amount,
      })),
    };
  }
}

// ============================================================================
// Kontext Client Interface (subset needed by this module)
// ============================================================================

/** Minimal interface for the Kontext client used by CircleWalletManager */
interface KontextLike {
  log(input: { type: string; description: string; agentId: string; metadata?: Record<string, unknown> }): Promise<ActionLog>;
  logTransaction(input: LogTransactionInput): Promise<ActionLog>;
  getTrustScore(agentId: string): Promise<{ score: number }>;
  checkUsdcCompliance(tx: LogTransactionInput): { compliant: boolean; checks: ComplianceCheckResult[]; riskLevel: AnomalySeverity; recommendations: string[] };
}

// ============================================================================
// CircleWalletManager
// ============================================================================

/**
 * Manages Circle Programmable Wallets with integrated Kontext compliance
 * and audit logging.
 *
 * All wallet operations are automatically logged through Kontext's rolling
 * SHA-256 digest chain. Transfers are wrapped with compliance checks that
 * must pass before execution.
 *
 * @example
 * ```typescript
 * import { Kontext } from 'kontext-sdk';
 * import { CircleWalletManager } from 'kontext-sdk';
 *
 * const kontext = Kontext.init({ projectId: 'my-project', environment: 'production' });
 * const wallets = new CircleWalletManager(kontext, 'circle-api-key');
 *
 * const walletSet = await wallets.createWalletSet('Operations');
 * const wallet = await wallets.createWallet(walletSet.id, { chain: 'base' });
 *
 * const result = await wallets.transferWithCompliance({
 *   walletId: wallet.id,
 *   destinationAddress: '0x...',
 *   amount: '100',
 *   agent: 'payment-agent',
 * });
 * ```
 */
export class CircleWalletManager {
  private readonly kontext: KontextLike;
  private readonly adapter: CircleApiAdapter;
  private readonly options: Required<CircleWalletOptions>;
  private readonly isLiveMode: boolean;

  // In-memory state for wallet tracking
  private walletSets: Map<string, WalletSet> = new Map();
  private wallets: Map<string, CircleWallet> = new Map();
  private walletSetWallets: Map<string, string[]> = new Map();
  private auditTrail: Map<string, ActionLog[]> = new Map();

  /**
   * Create a new CircleWalletManager.
   *
   * @param kontextClient - Initialized Kontext SDK client
   * @param circleApiKey - Circle API key (optional; omit for simulation mode)
   * @param options - Configuration options
   */
  constructor(
    kontextClient: KontextLike,
    circleApiKey?: string,
    options?: CircleWalletOptions,
  ) {
    this.kontext = kontextClient;
    this.isLiveMode = !!circleApiKey;
    this.adapter = circleApiKey
      ? new LiveCircleAdapter(circleApiKey)
      : new SimulationAdapter();

    this.options = {
      entitySecretCiphertext: options?.entitySecretCiphertext ?? '',
      defaultChain: options?.defaultChain ?? 'ethereum',
      autoLog: options?.autoLog ?? true,
      requireCompliance: options?.requireCompliance ?? true,
    };
  }

  // --------------------------------------------------------------------------
  // Wallet Set Management
  // --------------------------------------------------------------------------

  /**
   * Create a new wallet set (a logical group of wallets).
   *
   * @param name - Human-readable name for the wallet set
   * @param metadata - Optional metadata key-value pairs
   * @returns The created WalletSet
   */
  async createWalletSet(name: string, metadata?: Record<string, string>): Promise<WalletSet> {
    const custodyType = this.options.entitySecretCiphertext ? 'DEVELOPER' : 'USER';
    const result = await this.adapter.createWalletSet(name, custodyType);

    const walletSet: WalletSet = {
      id: result.id,
      name,
      custodyType,
      createdAt: now(),
    };

    this.walletSets.set(walletSet.id, walletSet);
    this.walletSetWallets.set(walletSet.id, []);

    if (this.options.autoLog) {
      await this.logOperation('wallet_set_created', `Created wallet set "${name}"`, {
        walletSetId: walletSet.id,
        custodyType,
        ...metadata,
      });
    }

    return walletSet;
  }

  // --------------------------------------------------------------------------
  // Wallet Management
  // --------------------------------------------------------------------------

  /**
   * Create a new wallet within a wallet set.
   *
   * @param walletSetId - Parent wallet set ID
   * @param options - Wallet creation options
   * @returns The created CircleWallet
   */
  async createWallet(walletSetId: string, options: CreateWalletOptions): Promise<CircleWallet> {
    const walletSet = this.walletSets.get(walletSetId);
    if (!walletSet) {
      throw new Error(`Wallet set not found: ${walletSetId}`);
    }

    const chain = options.chain ?? this.options.defaultChain;
    const custodyType = options.custodyType ?? walletSet.custodyType;

    const result = await this.adapter.createWallet(walletSetId, chain, custodyType);

    const wallet: CircleWallet = {
      id: result.id,
      walletSetId,
      address: result.address,
      chain,
      custodyType,
      state: 'LIVE',
      createDate: now(),
    };

    this.wallets.set(wallet.id, wallet);
    const setWallets = this.walletSetWallets.get(walletSetId) ?? [];
    setWallets.push(wallet.id);
    this.walletSetWallets.set(walletSetId, setWallets);

    if (this.options.autoLog) {
      await this.logOperation('wallet_created', `Created wallet on ${chain}`, {
        walletId: wallet.id,
        walletSetId,
        chain,
        address: wallet.address,
        custodyType,
        ...options.metadata,
      });
    }

    return wallet;
  }

  /**
   * Get a wallet by its ID.
   *
   * @param walletId - Wallet identifier
   * @returns The CircleWallet, or throws if not found
   */
  async getWallet(walletId: string): Promise<CircleWallet> {
    const cached = this.wallets.get(walletId);
    if (cached) return cached;

    if (this.isLiveMode) {
      const remote = await this.adapter.getWallet(walletId);
      if (remote) {
        const wallet: CircleWallet = {
          id: remote.id,
          walletSetId: 'unknown',
          address: remote.address,
          chain: remote.chain,
          custodyType: 'DEVELOPER',
          state: remote.state as 'LIVE' | 'FROZEN',
          createDate: now(),
        };
        this.wallets.set(walletId, wallet);
        return wallet;
      }
    }

    throw new Error(`Wallet not found: ${walletId}`);
  }

  /**
   * List all wallets in a wallet set.
   *
   * @param walletSetId - Wallet set identifier
   * @returns Array of CircleWallet records
   */
  async listWallets(walletSetId: string): Promise<CircleWallet[]> {
    const walletIds = this.walletSetWallets.get(walletSetId) ?? [];
    const wallets: CircleWallet[] = [];
    for (const id of walletIds) {
      const wallet = this.wallets.get(id);
      if (wallet) wallets.push(wallet);
    }
    return wallets;
  }

  // --------------------------------------------------------------------------
  // Compliant Transfers
  // --------------------------------------------------------------------------

  /**
   * Execute a USDC/EURC transfer with integrated compliance checks.
   *
   * The transfer flow:
   * 1. Validate the source wallet exists and is live
   * 2. Run Kontext compliance checks on the transaction
   * 3. Get the agent's trust score
   * 4. If compliance passes, execute the transfer via Circle
   * 5. Log the entire operation through Kontext's audit system
   *
   * @param input - Transfer details
   * @returns CompliantTransferResult with status and audit trail
   */
  async transferWithCompliance(input: CompliantTransferInput): Promise<CompliantTransferResult> {
    const wallet = this.wallets.get(input.walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${input.walletId}`);
    }

    if (wallet.state !== 'LIVE') {
      throw new Error(`Wallet ${input.walletId} is frozen and cannot execute transfers`);
    }

    const chain = input.chain ?? wallet.chain;
    const token = input.token ?? 'USDC';
    const agent = input.agent ?? 'system';

    // Step 1: Run compliance check
    const complianceCheck = this.runComplianceCheck(input, wallet, chain, token);

    // Step 2: Get trust score
    let trustScore = 50; // default
    try {
      const score = await this.kontext.getTrustScore(agent);
      trustScore = score.score;
    } catch {
      // Trust scoring may fail for new agents; use default
    }

    // Step 3: Determine transfer status based on compliance and trust
    let status: CompliantTransferResult['status'];
    let transactionHash: string | undefined;
    let transferId: string;
    let blockedReason: string | undefined;

    if (!complianceCheck.passed && this.options.requireCompliance) {
      status = 'BLOCKED';
      transferId = `blocked_${generateId().slice(0, 8)}`;
      blockedReason = complianceCheck.recommendations.join('; ');
    } else if (complianceCheck.riskLevel === 'high' || complianceCheck.riskLevel === 'critical' || trustScore < 30) {
      status = 'PENDING_REVIEW';
      transferId = `review_${generateId().slice(0, 8)}`;
    } else {
      // Step 4: Execute transfer
      const result = await this.adapter.transfer({
        walletId: input.walletId,
        destinationAddress: input.destinationAddress,
        amount: input.amount,
        chain,
        token,
      });
      status = 'COMPLETED';
      transferId = result.transferId;
      transactionHash = result.transactionHash;
    }

    // Step 5: Log the operation
    const logAction = await this.kontext.log({
      type: 'circle_wallet_transfer',
      description: `${token} transfer of ${input.amount} from wallet ${input.walletId} - ${status}`,
      agentId: agent,
      metadata: {
        walletId: input.walletId,
        destinationAddress: input.destinationAddress,
        amount: input.amount,
        chain,
        token,
        status,
        transferId,
        transactionHash,
        trustScore,
        compliancePassed: complianceCheck.passed,
        complianceRiskLevel: complianceCheck.riskLevel,
        blockedReason,
        ...input.metadata,
      },
    });

    // Track in audit trail
    const walletAudit = this.auditTrail.get(input.walletId) ?? [];
    walletAudit.push(logAction);
    this.auditTrail.set(input.walletId, walletAudit);

    return {
      transferId,
      walletId: input.walletId,
      status,
      complianceCheck,
      kontextLogId: logAction.id,
      trustScore,
      amount: input.amount,
      chain,
      transactionHash,
      blockedReason,
    };
  }

  // --------------------------------------------------------------------------
  // Balance and Monitoring
  // --------------------------------------------------------------------------

  /**
   * Get the token balances for a wallet.
   *
   * @param walletId - Wallet identifier
   * @param chain - Optional chain override
   * @returns WalletBalance with token amounts
   */
  async getBalance(walletId: string, chain?: Chain): Promise<WalletBalance> {
    const wallet = this.wallets.get(walletId);
    const walletChain = chain ?? wallet?.chain ?? this.options.defaultChain;

    const result = await this.adapter.getBalance(walletId);

    return {
      walletId,
      chain: walletChain,
      balances: result.balances,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Integration
  // --------------------------------------------------------------------------

  /**
   * Get the Kontext audit trail for a specific wallet.
   *
   * @param walletId - Wallet identifier
   * @returns Array of ActionLog entries related to this wallet
   */
  async getWalletAuditTrail(walletId: string): Promise<ActionLog[]> {
    return this.auditTrail.get(walletId) ?? [];
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Run Kontext compliance checks on a transfer.
   */
  private runComplianceCheck(
    input: CompliantTransferInput,
    wallet: CircleWallet,
    chain: Chain,
    token: string,
  ): ComplianceCheckSummary {
    // Build a LogTransactionInput for Kontext's compliance checker
    const txInput: LogTransactionInput = {
      txHash: '0x' + '0'.repeat(64), // placeholder for pre-check
      chain,
      amount: input.amount,
      token: token as 'USDC' | 'EURC',
      from: wallet.address,
      to: input.destinationAddress,
      agentId: input.agent ?? 'system',
    };

    const usdcCheck = this.kontext.checkUsdcCompliance(txInput);

    // Additional checks specific to Circle wallets
    const additionalChecks: ComplianceCheckResult[] = [];

    // Check destination address format
    const addrValid = isValidAddress(input.destinationAddress);
    additionalChecks.push({
      name: 'destination_address_format',
      passed: addrValid,
      description: addrValid
        ? 'Destination address format is valid'
        : `Invalid destination address: ${input.destinationAddress}`,
      severity: addrValid ? 'low' : 'high',
    });

    // Check amount is positive
    const amount = parseAmount(input.amount);
    const amountValid = !isNaN(amount) && amount > 0;
    additionalChecks.push({
      name: 'transfer_amount_positive',
      passed: amountValid,
      description: amountValid
        ? `Transfer amount ${input.amount} is valid`
        : `Transfer amount ${input.amount} is invalid`,
      severity: amountValid ? 'low' : 'critical',
    });

    // Check wallet is not frozen
    additionalChecks.push({
      name: 'wallet_state_check',
      passed: wallet.state === 'LIVE',
      description: wallet.state === 'LIVE'
        ? 'Wallet is in LIVE state'
        : 'Wallet is FROZEN -- transfers are blocked',
      severity: wallet.state === 'LIVE' ? 'low' : 'critical',
    });

    const allChecks = [...usdcCheck.checks, ...additionalChecks];
    const failedChecks = allChecks.filter((c) => !c.passed);
    const passed = failedChecks.length === 0 || failedChecks.every((c) => c.severity === 'low');

    // Determine highest risk level
    const severityOrder: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
    const riskLevel = allChecks.reduce<AnomalySeverity>((max, c) => {
      return severityOrder.indexOf(c.severity) > severityOrder.indexOf(max) ? c.severity : max;
    }, 'low');

    return {
      passed,
      riskLevel,
      checks: allChecks,
      recommendations: usdcCheck.recommendations,
    };
  }

  /**
   * Log an operation through the Kontext client.
   */
  private async logOperation(
    type: string,
    description: string,
    metadata: Record<string, unknown>,
  ): Promise<ActionLog> {
    const action = await this.kontext.log({
      type,
      description,
      agentId: 'circle-wallet-manager',
      metadata,
    });

    // Track in per-wallet audit trails if applicable
    const walletId = metadata['walletId'] as string | undefined;
    if (walletId) {
      const trail = this.auditTrail.get(walletId) ?? [];
      trail.push(action);
      this.auditTrail.set(walletId, trail);
    }

    return action;
  }
}
