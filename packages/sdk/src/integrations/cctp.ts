// ============================================================================
// Kontext SDK - CCTP (Cross-Chain Transfer Protocol) Integration
// ============================================================================
// Supports both CCTP V1 and V2 features:
// - V1: Standard burn-and-mint with attestation (minutes)
// - V2: Fast transfers (sub-minute), hooks for post-transfer automation,
//        and expanded domain support

import type {
  Chain,
  Token,
  LogTransactionInput,
  AnomalySeverity,
} from '../types.js';
import { generateId, now, parseAmount } from '../utils.js';

// ============================================================================
// Types
// ============================================================================

/** Supported CCTP domain identifiers for each chain (V2 expanded) */
const CCTP_DOMAINS: Record<string, number> = {
  ethereum: 0,
  arbitrum: 3,
  optimism: 2,
  base: 6,
  polygon: 7,
  // Arc (Circle's stablecoin-native blockchain) -- placeholder domain ID, update when Arc mainnet launches
  arc: 10,
  // CCTP V2 expanded domains
  avalanche: 1,
  solana: 5,
};

/** CCTP V2 fast-transfer eligible routes */
const FAST_TRANSFER_ROUTES: Set<string> = new Set([
  'ethereum->base',
  'base->ethereum',
  'ethereum->arbitrum',
  'arbitrum->ethereum',
  'ethereum->optimism',
  'optimism->ethereum',
  'ethereum->polygon',
  'polygon->ethereum',
  'base->arbitrum',
  'arbitrum->base',
  'base->optimism',
  'optimism->base',
  'base->polygon',
  'polygon->base',
  'ethereum->avalanche',
  'avalanche->ethereum',
]);

/** CCTP protocol version */
export type CCTPVersion = 'v1' | 'v2';

/** CCTP message status */
export type CCTPMessageStatus =
  | 'pending'
  | 'attested'
  | 'confirmed'
  | 'failed';

/** CCTP V2 hook definition for post-transfer automation */
export interface CCTPHook {
  /** Target contract address on the destination chain */
  targetContract: string;
  /** Encoded function call data */
  callData: string;
  /** Maximum gas for hook execution */
  gasLimit: number;
  /** Human-readable description of the hook */
  description?: string;
}

/** Input for initiating a CCTP V2 fast transfer */
export interface InitiateFastTransferInput {
  /** Source chain */
  sourceChain: Chain;
  /** Destination chain */
  destinationChain: Chain;
  /** Transfer amount */
  amount: string;
  /** Token being transferred */
  token: Token;
  /** Sender address */
  sender: string;
  /** Recipient address */
  recipient: string;
  /** Source chain transaction hash */
  sourceTxHash: string;
  /** Agent initiating the transfer */
  agentId: string;
  /** Maximum finality time the sender will accept (seconds) */
  maxFinalitySeconds?: number;
  /** Optional hooks to execute after transfer completes */
  hooks?: CCTPHook[];
  /** Optional nonce */
  nonce?: number;
  /** Optional correlation ID */
  correlationId?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** A cross-chain transfer record */
export interface CrossChainTransfer {
  /** Unique transfer identifier */
  id: string;
  /** Source chain */
  sourceChain: Chain;
  /** Destination chain */
  destinationChain: Chain;
  /** CCTP domain ID for source */
  sourceDomain: number;
  /** CCTP domain ID for destination */
  destinationDomain: number;
  /** Transfer amount (string to preserve precision) */
  amount: string;
  /** Token being transferred */
  token: Token;
  /** Sender address on source chain */
  sender: string;
  /** Recipient address on destination chain */
  recipient: string;
  /** Source chain transaction hash */
  sourceTxHash: string;
  /** Destination chain transaction hash (set after confirmation) */
  destinationTxHash: string | null;
  /** CCTP message hash for attestation tracking */
  messageHash: string | null;
  /** Current status of the transfer */
  status: CCTPMessageStatus;
  /** Nonce from the CCTP MessageSent event */
  nonce: number | null;
  /** Timestamp when the transfer was initiated */
  initiatedAt: string;
  /** Timestamp when attestation was received */
  attestedAt: string | null;
  /** Timestamp when the transfer was confirmed on destination */
  confirmedAt: string | null;
  /** Correlation ID linking source and destination actions */
  correlationId: string;
  /** Agent that initiated the transfer */
  agentId: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** CCTP protocol version used */
  version?: CCTPVersion;
  /** Whether this is a fast transfer (V2) */
  isFastTransfer?: boolean;
  /** Post-transfer hooks (V2) */
  hooks?: CCTPHook[];
  /** Hook execution results (V2) */
  hookResults?: CCTPHookResult[];
}

/** Input for initiating a cross-chain transfer record */
export interface InitiateCCTPTransferInput {
  /** Source chain */
  sourceChain: Chain;
  /** Destination chain */
  destinationChain: Chain;
  /** Transfer amount */
  amount: string;
  /** Token being transferred */
  token: Token;
  /** Sender address */
  sender: string;
  /** Recipient address */
  recipient: string;
  /** Source chain transaction hash (from depositForBurn) */
  sourceTxHash: string;
  /** Agent initiating the transfer */
  agentId: string;
  /** Optional nonce from the MessageSent event */
  nonce?: number;
  /** Optional correlation ID */
  correlationId?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** Input for recording a CCTP attestation */
export interface CCTPAttestationInput {
  /** The cross-chain transfer ID */
  transferId: string;
  /** The message hash from the attestation service */
  messageHash: string;
  /** Optional attestation metadata */
  metadata?: Record<string, unknown>;
}

/** Input for confirming a cross-chain transfer on destination */
export interface ConfirmCCTPTransferInput {
  /** The cross-chain transfer ID */
  transferId: string;
  /** Destination chain transaction hash (from receiveMessage) */
  destinationTxHash: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** Validation result for a cross-chain transfer */
export interface CCTPValidationResult {
  /** Whether the transfer configuration is valid */
  valid: boolean;
  /** Validation checks performed */
  checks: CCTPValidationCheck[];
  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommendations */
  recommendations: string[];
}

/** Individual validation check */
export interface CCTPValidationCheck {
  /** Check name */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Description */
  description: string;
  /** Severity if failed */
  severity: AnomalySeverity;
}

/** Cross-chain audit trail entry */
export interface CrossChainAuditEntry {
  /** The transfer record */
  transfer: CrossChainTransfer;
  /** Source chain action log ID (from logTransaction) */
  sourceActionId: string | null;
  /** Destination chain action log ID (from logTransaction) */
  destinationActionId: string | null;
  /** Whether source and destination are linked */
  linked: boolean;
  /** Duration from initiation to confirmation in milliseconds */
  durationMs: number | null;
}

/** Result of a CCTP V2 hook execution */
export interface CCTPHookResult {
  /** Target contract address */
  targetContract: string;
  /** Whether the hook executed successfully */
  success: boolean;
  /** Transaction hash of the hook execution */
  transactionHash?: string;
  /** Error message if the hook failed */
  error?: string;
  /** Gas used by the hook */
  gasUsed?: number;
}

/** Validation result for a CCTP V2 fast transfer */
export interface FastTransferValidation {
  /** Whether the fast transfer route is supported */
  fastTransferAvailable: boolean;
  /** Estimated finality time in seconds */
  estimatedFinalitySeconds: number;
  /** Whether hooks are valid */
  hooksValid: boolean;
  /** Hook validation details */
  hookValidation: { index: number; valid: boolean; reason?: string }[];
  /** Standard validation result */
  standardValidation: CCTPValidationResult;
}

// ============================================================================
// CCTP Transfer Manager
// ============================================================================

/**
 * CCTPTransferManager handles cross-chain transfer tracking and validation
 * for Circle's Cross-Chain Transfer Protocol.
 *
 * Provides:
 * - Transfer validation (source chain to destination chain)
 * - CCTP message attestation logging
 * - Cross-chain audit trail linking
 * - Transfer lifecycle tracking (pending -> attested -> confirmed)
 */
export class CCTPTransferManager {
  private transfers: Map<string, CrossChainTransfer> = new Map();
  private actionLinks: Map<string, { sourceActionId?: string; destinationActionId?: string }> = new Map();

  /**
   * Validate a cross-chain transfer before execution.
   *
   * Checks include:
   * - Source and destination chain support
   * - Route validity (different chains)
   * - Token support on both chains
   * - Amount validation
   * - Address format validation
   *
   * @param input - Transfer details to validate
   * @returns Validation result with checks and recommendations
   */
  validateTransfer(input: InitiateCCTPTransferInput): CCTPValidationResult {
    const checks: CCTPValidationCheck[] = [];

    // Check source chain CCTP support
    checks.push(this.checkChainSupport(input.sourceChain, 'source'));

    // Check destination chain CCTP support
    checks.push(this.checkChainSupport(input.destinationChain, 'destination'));

    // Check route validity (source !== destination)
    checks.push(this.checkRouteValidity(input.sourceChain, input.destinationChain));

    // Check token support
    checks.push(this.checkTokenSupport(input.token));

    // Check amount validity
    checks.push(this.checkAmountValidity(input.amount));

    // Check address formats
    checks.push(this.checkAddressFormat(input.sender, 'sender'));
    checks.push(this.checkAddressFormat(input.recipient, 'recipient'));

    const failedChecks = checks.filter((c) => !c.passed);
    const valid = failedChecks.length === 0;

    const highestSeverity = failedChecks.reduce<AnomalySeverity>(
      (max, c) => {
        const order: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
        return order.indexOf(c.severity) > order.indexOf(max) ? c.severity : max;
      },
      'low',
    );

    const recommendations = this.generateRecommendations(checks, input);

    return {
      valid,
      checks,
      riskLevel: valid ? 'low' : highestSeverity,
      recommendations,
    };
  }

  /**
   * Record a new cross-chain transfer initiated via CCTP depositForBurn.
   *
   * @param input - Transfer initiation details
   * @returns The created CrossChainTransfer record
   */
  initiateTransfer(input: InitiateCCTPTransferInput): CrossChainTransfer {
    const id = generateId();
    const correlationId = input.correlationId ?? generateId();

    const transfer: CrossChainTransfer = {
      id,
      sourceChain: input.sourceChain,
      destinationChain: input.destinationChain,
      sourceDomain: CCTP_DOMAINS[input.sourceChain] ?? -1,
      destinationDomain: CCTP_DOMAINS[input.destinationChain] ?? -1,
      amount: input.amount,
      token: input.token,
      sender: input.sender,
      recipient: input.recipient,
      sourceTxHash: input.sourceTxHash,
      destinationTxHash: null,
      messageHash: null,
      status: 'pending',
      nonce: input.nonce ?? null,
      initiatedAt: now(),
      attestedAt: null,
      confirmedAt: null,
      correlationId,
      agentId: input.agentId,
      metadata: input.metadata ?? {},
    };

    this.transfers.set(id, transfer);
    this.actionLinks.set(id, {});

    return transfer;
  }

  /**
   * Record a CCTP attestation for a pending transfer.
   * Called after the attestation service has signed the burn message.
   *
   * @param input - Attestation details
   * @returns The updated CrossChainTransfer record
   * @throws Error if transfer not found or not in pending status
   */
  recordAttestation(input: CCTPAttestationInput): CrossChainTransfer {
    const transfer = this.transfers.get(input.transferId);

    if (!transfer) {
      throw new Error(`Cross-chain transfer not found: ${input.transferId}`);
    }

    if (transfer.status !== 'pending') {
      throw new Error(
        `Transfer ${input.transferId} is not in pending status (current: ${transfer.status})`,
      );
    }

    const updated: CrossChainTransfer = {
      ...transfer,
      messageHash: input.messageHash,
      status: 'attested',
      attestedAt: now(),
      metadata: {
        ...transfer.metadata,
        ...input.metadata,
      },
    };

    this.transfers.set(input.transferId, updated);

    return updated;
  }

  /**
   * Confirm a cross-chain transfer has been received on the destination chain.
   * Called after receiveMessage has been executed on the destination.
   *
   * @param input - Confirmation details
   * @returns The updated CrossChainTransfer record
   * @throws Error if transfer not found or not in attested status
   */
  confirmTransfer(input: ConfirmCCTPTransferInput): CrossChainTransfer {
    const transfer = this.transfers.get(input.transferId);

    if (!transfer) {
      throw new Error(`Cross-chain transfer not found: ${input.transferId}`);
    }

    if (transfer.status !== 'attested') {
      throw new Error(
        `Transfer ${input.transferId} is not in attested status (current: ${transfer.status})`,
      );
    }

    const updated: CrossChainTransfer = {
      ...transfer,
      destinationTxHash: input.destinationTxHash,
      status: 'confirmed',
      confirmedAt: now(),
      metadata: {
        ...transfer.metadata,
        ...input.metadata,
      },
    };

    this.transfers.set(input.transferId, updated);

    return updated;
  }

  /**
   * Mark a transfer as failed.
   *
   * @param transferId - The transfer to mark as failed
   * @param reason - Reason for failure
   * @returns The updated CrossChainTransfer record
   */
  failTransfer(transferId: string, reason: string): CrossChainTransfer {
    const transfer = this.transfers.get(transferId);

    if (!transfer) {
      throw new Error(`Cross-chain transfer not found: ${transferId}`);
    }

    const updated: CrossChainTransfer = {
      ...transfer,
      status: 'failed',
      metadata: {
        ...transfer.metadata,
        failureReason: reason,
        failedAt: now(),
      },
    };

    this.transfers.set(transferId, updated);

    return updated;
  }

  /**
   * Link a Kontext action log ID to a cross-chain transfer.
   * Used to correlate source and destination chain actions in the audit trail.
   *
   * @param transferId - The cross-chain transfer ID
   * @param actionId - The action log ID to link
   * @param side - Whether this is the source or destination action
   */
  linkAction(transferId: string, actionId: string, side: 'source' | 'destination'): void {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Cross-chain transfer not found: ${transferId}`);
    }

    const links = this.actionLinks.get(transferId) ?? {};
    if (side === 'source') {
      links.sourceActionId = actionId;
    } else {
      links.destinationActionId = actionId;
    }
    this.actionLinks.set(transferId, links);
  }

  /**
   * Get a cross-chain transfer by ID.
   */
  getTransfer(transferId: string): CrossChainTransfer | undefined {
    return this.transfers.get(transferId);
  }

  /**
   * Get all cross-chain transfers, optionally filtered by status.
   */
  getTransfers(status?: CCTPMessageStatus): CrossChainTransfer[] {
    const all = Array.from(this.transfers.values());
    if (status) {
      return all.filter((t) => t.status === status);
    }
    return all;
  }

  /**
   * Get transfers by correlation ID.
   * Useful for finding all transfers related to a single workflow.
   */
  getTransfersByCorrelation(correlationId: string): CrossChainTransfer[] {
    return Array.from(this.transfers.values()).filter(
      (t) => t.correlationId === correlationId,
    );
  }

  /**
   * Build a cross-chain audit trail for a given transfer.
   * Links source and destination chain actions together.
   *
   * @param transferId - The transfer to build an audit trail for
   * @returns CrossChainAuditEntry with linked action references
   */
  getAuditEntry(transferId: string): CrossChainAuditEntry | undefined {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return undefined;

    const links = this.actionLinks.get(transferId) ?? {};

    let durationMs: number | null = null;
    if (transfer.confirmedAt && transfer.initiatedAt) {
      durationMs =
        new Date(transfer.confirmedAt).getTime() -
        new Date(transfer.initiatedAt).getTime();
    }

    return {
      transfer,
      sourceActionId: links.sourceActionId ?? null,
      destinationActionId: links.destinationActionId ?? null,
      linked: !!(links.sourceActionId && links.destinationActionId),
      durationMs,
    };
  }

  /**
   * Build audit trail entries for all transfers, optionally filtered.
   *
   * @param agentId - Optional filter by agent
   * @returns Array of CrossChainAuditEntry records
   */
  getAuditTrail(agentId?: string): CrossChainAuditEntry[] {
    let transfers = Array.from(this.transfers.values());
    if (agentId) {
      transfers = transfers.filter((t) => t.agentId === agentId);
    }

    return transfers
      .map((t) => this.getAuditEntry(t.id))
      .filter((entry): entry is CrossChainAuditEntry => entry !== undefined);
  }

  // --------------------------------------------------------------------------
  // CCTP V2 Features
  // --------------------------------------------------------------------------

  /**
   * Validate a fast transfer request (CCTP V2).
   * Checks route eligibility, hook validity, and standard validation.
   *
   * @param input - Fast transfer details
   * @returns FastTransferValidation with availability and hook checks
   */
  validateFastTransfer(input: InitiateFastTransferInput): FastTransferValidation {
    const standardInput: InitiateCCTPTransferInput = {
      sourceChain: input.sourceChain,
      destinationChain: input.destinationChain,
      amount: input.amount,
      token: input.token,
      sender: input.sender,
      recipient: input.recipient,
      sourceTxHash: input.sourceTxHash,
      agentId: input.agentId,
      nonce: input.nonce,
      correlationId: input.correlationId,
      metadata: input.metadata,
    };

    const standardValidation = this.validateTransfer(standardInput);

    // Check if fast transfer route is available
    const routeKey = `${input.sourceChain}->${input.destinationChain}`;
    const fastTransferAvailable = FAST_TRANSFER_ROUTES.has(routeKey);

    // Estimate finality time
    const estimatedFinalitySeconds = fastTransferAvailable ? 30 : 900;

    // Validate hooks
    const hookValidation: { index: number; valid: boolean; reason?: string }[] = [];
    if (input.hooks) {
      for (let i = 0; i < input.hooks.length; i++) {
        const hook = input.hooks[i]!;
        const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(hook.targetContract);
        const hasCallData = hook.callData.length > 0;
        const validGas = hook.gasLimit > 0 && hook.gasLimit <= 10_000_000;

        if (!isValidAddr) {
          hookValidation.push({ index: i, valid: false, reason: 'Invalid target contract address' });
        } else if (!hasCallData) {
          hookValidation.push({ index: i, valid: false, reason: 'Call data is empty' });
        } else if (!validGas) {
          hookValidation.push({ index: i, valid: false, reason: 'Gas limit must be between 1 and 10,000,000' });
        } else {
          hookValidation.push({ index: i, valid: true });
        }
      }
    }

    const hooksValid = hookValidation.every((h) => h.valid);

    return {
      fastTransferAvailable,
      estimatedFinalitySeconds,
      hooksValid,
      hookValidation,
      standardValidation,
    };
  }

  /**
   * Initiate a CCTP V2 fast transfer with optional hooks.
   *
   * Fast transfers use CCTP V2's sub-minute finality on supported routes.
   * Hooks allow automated post-transfer actions on the destination chain.
   *
   * @param input - Fast transfer details including optional hooks
   * @returns The created CrossChainTransfer record with V2 metadata
   */
  initiateFastTransfer(input: InitiateFastTransferInput): CrossChainTransfer {
    const id = generateId();
    const correlationId = input.correlationId ?? generateId();
    const routeKey = `${input.sourceChain}->${input.destinationChain}`;
    const isFast = FAST_TRANSFER_ROUTES.has(routeKey);

    const transfer: CrossChainTransfer = {
      id,
      sourceChain: input.sourceChain,
      destinationChain: input.destinationChain,
      sourceDomain: CCTP_DOMAINS[input.sourceChain] ?? -1,
      destinationDomain: CCTP_DOMAINS[input.destinationChain] ?? -1,
      amount: input.amount,
      token: input.token,
      sender: input.sender,
      recipient: input.recipient,
      sourceTxHash: input.sourceTxHash,
      destinationTxHash: null,
      messageHash: null,
      status: 'pending',
      nonce: input.nonce ?? null,
      initiatedAt: now(),
      attestedAt: null,
      confirmedAt: null,
      correlationId,
      agentId: input.agentId,
      metadata: {
        ...input.metadata,
        maxFinalitySeconds: input.maxFinalitySeconds ?? (isFast ? 30 : 900),
      },
      version: 'v2',
      isFastTransfer: isFast,
      hooks: input.hooks,
    };

    this.transfers.set(id, transfer);
    this.actionLinks.set(id, {});

    return transfer;
  }

  /**
   * Record hook execution results for a V2 transfer.
   *
   * @param transferId - The transfer ID
   * @param results - Array of hook execution results
   * @returns The updated transfer
   */
  recordHookResults(transferId: string, results: CCTPHookResult[]): CrossChainTransfer {
    const transfer = this.transfers.get(transferId);

    if (!transfer) {
      throw new Error(`Cross-chain transfer not found: ${transferId}`);
    }

    if (transfer.version !== 'v2') {
      throw new Error(`Transfer ${transferId} is not a V2 transfer`);
    }

    const updated: CrossChainTransfer = {
      ...transfer,
      hookResults: results,
      metadata: {
        ...transfer.metadata,
        hooksExecutedAt: now(),
        hookSuccessCount: results.filter((r) => r.success).length,
        hookFailureCount: results.filter((r) => !r.success).length,
      },
    };

    this.transfers.set(transferId, updated);
    return updated;
  }

  /**
   * Check if a route supports CCTP V2 fast transfers.
   *
   * @param sourceChain - Source blockchain network
   * @param destinationChain - Destination blockchain network
   * @returns Whether fast transfer is available
   */
  static isFastTransferAvailable(sourceChain: Chain, destinationChain: Chain): boolean {
    return FAST_TRANSFER_ROUTES.has(`${sourceChain}->${destinationChain}`);
  }

  /**
   * Get the CCTP domain ID for a given chain.
   *
   * @param chain - The blockchain network
   * @returns The CCTP domain ID, or undefined for unsupported chains
   */
  static getDomainId(chain: Chain): number | undefined {
    return CCTP_DOMAINS[chain];
  }

  /**
   * Get the chains supported for CCTP transfers.
   */
  static getSupportedChains(): Chain[] {
    return Object.keys(CCTP_DOMAINS) as Chain[];
  }

  /**
   * Get the list of V2 fast-transfer eligible routes.
   *
   * @returns Array of route strings in "source->destination" format
   */
  static getFastTransferRoutes(): string[] {
    return Array.from(FAST_TRANSFER_ROUTES);
  }

  // --------------------------------------------------------------------------
  // Validation checks
  // --------------------------------------------------------------------------

  private checkChainSupport(chain: Chain, label: string): CCTPValidationCheck {
    const supported = chain in CCTP_DOMAINS;
    return {
      name: `cctp_${label}_chain`,
      passed: supported,
      description: supported
        ? `${label} chain ${chain} supports CCTP (domain ${CCTP_DOMAINS[chain]})`
        : `${label} chain ${chain} does not support CCTP`,
      severity: supported ? 'low' : 'high',
    };
  }

  private checkRouteValidity(source: Chain, destination: Chain): CCTPValidationCheck {
    const valid = source !== destination;
    return {
      name: 'cctp_route_validity',
      passed: valid,
      description: valid
        ? `Valid cross-chain route: ${source} -> ${destination}`
        : `Invalid route: source and destination chains are the same (${source})`,
      severity: valid ? 'low' : 'critical',
    };
  }

  private checkTokenSupport(token: Token): CCTPValidationCheck {
    // CCTP natively supports USDC; EURC is also supported on some routes
    const supported = token === 'USDC' || token === 'EURC';
    return {
      name: 'cctp_token_support',
      passed: supported,
      description: supported
        ? `Token ${token} is supported for CCTP transfers`
        : `Token ${token} is not natively supported by CCTP (only USDC and EURC)`,
      severity: supported ? 'low' : 'high',
    };
  }

  private checkAmountValidity(amount: string): CCTPValidationCheck {
    const parsed = parseAmount(amount);
    const valid = !isNaN(parsed) && parsed > 0;
    return {
      name: 'cctp_amount_validity',
      passed: valid,
      description: valid
        ? `Transfer amount ${amount} is valid`
        : `Transfer amount ${amount} is invalid`,
      severity: valid ? 'low' : 'critical',
    };
  }

  private checkAddressFormat(address: string, label: string): CCTPValidationCheck {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
    return {
      name: `cctp_address_${label}`,
      passed: isValid,
      description: isValid
        ? `${label} address format is valid`
        : `${label} address format is invalid: ${address}`,
      severity: isValid ? 'low' : 'high',
    };
  }

  // --------------------------------------------------------------------------
  // Recommendations
  // --------------------------------------------------------------------------

  private generateRecommendations(
    checks: CCTPValidationCheck[],
    input: InitiateCCTPTransferInput,
  ): string[] {
    const recommendations: string[] = [];
    const amount = parseAmount(input.amount);

    const failedChecks = checks.filter((c) => !c.passed);

    if (failedChecks.some((c) => c.severity === 'critical')) {
      recommendations.push(
        'Do not proceed with this transfer. Critical validation failures detected.',
      );
    }

    if (failedChecks.some((c) => c.name === 'cctp_token_support')) {
      recommendations.push(
        'Consider using USDC for native CCTP support. Other tokens require bridge protocols.',
      );
    }

    if (!isNaN(amount) && amount >= 50000) {
      recommendations.push(
        'Large cross-chain transfer detected. Verify recipient identity and document purpose.',
      );
    }

    if (!isNaN(amount) && amount >= 10000) {
      recommendations.push(
        'Cross-chain transfer meets reporting threshold. Ensure CTR filing if applicable.',
      );
    }

    if (failedChecks.length === 0) {
      recommendations.push(
        'Transfer validation passed. Monitor attestation status for completion.',
      );
    }

    return recommendations;
  }
}
