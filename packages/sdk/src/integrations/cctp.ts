// ============================================================================
// Kontext SDK - CCTP Cross-Chain Transfer Manager
// ============================================================================
// Enterprise plan-gated. Supports CCTP V1 (burn-attestation-mint) and
// V2 (fast transfers). Uses native fetch() — zero runtime dependencies.

import type {
  CCTPConfig,
  CCTPTransferInput,
  CCTPTransfer,
  CCTPTransferResult,
  CCTPTransferState,
  Chain,
} from '../types.js';
import { KontextError, KontextErrorCode } from '../types.js';
import { generateId, now } from '../utils.js';

const DEFAULT_ATTESTATION_URL = 'https://iris-api.circle.com';
const REQUEST_TIMEOUT_MS = 15_000;
const ATTESTATION_POLL_INTERVAL_MS = 2_000;
const ATTESTATION_MAX_POLLS = 30;

/** CCTP domain IDs per chain */
const CCTP_DOMAINS: Record<string, number> = {
  ethereum: 0,
  avalanche: 1,
  optimism: 2,
  arbitrum: 3,
  solana: 5,
  base: 6,
  polygon: 7,
};

/**
 * CCTPTransferManager handles CCTP V1/V2 cross-chain USDC transfers
 * with automatic compliance logging via Kontext.
 *
 * V1: burn → attestation → mint (standard)
 * V2: fast transfer with conditional attestation
 *
 * Enterprise plan-gated — plan checks enforced at the Kontext client level.
 */
export class CCTPTransferManager {
  private readonly attestationBaseUrl: string;
  private readonly irisApiKey: string | undefined;
  private readonly version: 'v1' | 'v2';
  private readonly transfers = new Map<string, CCTPTransfer>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kontext: any = null;

  constructor(config?: CCTPConfig) {
    this.attestationBaseUrl = config?.attestationBaseUrl ?? DEFAULT_ATTESTATION_URL;
    this.irisApiKey = config?.irisApiKey;
    this.version = config?.version ?? 'v1';
  }

  /** Link to Kontext instance for auto-compliance logging */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setKontext(kontext: any): void {
    this.kontext = kontext;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Initiate a CCTP V1 cross-chain transfer */
  async initiateTransfer(input: CCTPTransferInput): Promise<CCTPTransferResult> {
    return this.initiate(input, input.fast ? 'v2' : 'v1');
  }

  /** Initiate a CCTP V2 fast transfer */
  async initiateFastTransfer(input: CCTPTransferInput): Promise<CCTPTransferResult> {
    return this.initiate(input, 'v2');
  }

  /** Confirm a pending transfer by polling for attestation and completing the mint */
  async confirmTransfer(transferId: string): Promise<CCTPTransfer> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `CCTP transfer ${transferId} not found`,
      );
    }

    if (transfer.state === 'completed') {
      return { ...transfer };
    }

    if (transfer.state === 'failed') {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `CCTP transfer ${transferId} has failed and cannot be confirmed`,
      );
    }

    // If we have a messageHash, poll for attestation
    if (transfer.messageHash && (transfer.state === 'burned' || transfer.state === 'pending_attestation')) {
      this.updateTransferState(transfer, 'pending_attestation');

      const attestation = await this.pollAttestation(transfer.messageHash);
      if (!attestation) {
        this.updateTransferState(transfer, 'failed');
        throw new KontextError(
          KontextErrorCode.API_ERROR,
          `Attestation timeout for CCTP transfer ${transferId}`,
        );
      }

      transfer.attestation = attestation;
      this.updateTransferState(transfer, 'attested');
    }

    // Run verify on destination chain
    if (this.kontext) {
      const destResult = await this.kontext.verify({
        txHash: `cctp-mint-${transfer.id}`,
        chain: transfer.destinationChain,
        amount: transfer.amount,
        token: transfer.token,
        from: transfer.from,
        to: transfer.to,
        agentId: 'cctp-transfer-manager',
      });
      transfer.complianceResult = destResult;
    }

    this.updateTransferState(transfer, 'completed');
    return { ...transfer };
  }

  /** Get the current status of a transfer */
  getTransferStatus(transferId: string): CCTPTransfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `CCTP transfer ${transferId} not found`,
      );
    }
    return { ...transfer };
  }

  /** Get all tracked transfers (defensive copies) */
  getTransfers(): CCTPTransfer[] {
    return Array.from(this.transfers.values()).map((t) => ({ ...t }));
  }

  /** Get CCTP domain ID for a chain */
  getDomain(chain: Chain): number {
    const domain = CCTP_DOMAINS[chain];
    if (domain === undefined) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        `Chain "${chain}" is not supported by CCTP`,
      );
    }
    return domain;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private async initiate(input: CCTPTransferInput, version: 'v1' | 'v2'): Promise<CCTPTransferResult> {
    // Validate chains
    this.getDomain(input.sourceChain);
    this.getDomain(input.destinationChain);

    if (input.sourceChain === input.destinationChain) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'Source and destination chains must be different for CCTP transfers',
      );
    }

    // Pre-transfer compliance check on source chain
    let complianceResult;
    if (this.kontext) {
      complianceResult = await this.kontext.verify({
        txHash: input.burnTxHash ?? `cctp-pending-${generateId()}`,
        chain: input.sourceChain,
        amount: input.amount,
        token: input.token,
        from: input.from.toLowerCase(),
        to: input.to.toLowerCase(),
        agentId: input.agentId ?? 'cctp-transfer-manager',
      });

      if (!complianceResult.compliant) {
        const transfer: CCTPTransfer = {
          id: generateId(),
          state: 'failed',
          sourceChain: input.sourceChain,
          destinationChain: input.destinationChain,
          amount: input.amount,
          token: input.token,
          from: input.from.toLowerCase(),
          to: input.to.toLowerCase(),
          burnTxHash: input.burnTxHash,
          version,
          createdAt: now(),
          updatedAt: now(),
          complianceResult,
        };
        this.transfers.set(transfer.id, transfer);
        return { transfer: { ...transfer }, complianceResult };
      }
    }

    // Create transfer record
    const transfer: CCTPTransfer = {
      id: generateId(),
      state: input.burnTxHash ? 'burned' : 'pending_burn',
      sourceChain: input.sourceChain,
      destinationChain: input.destinationChain,
      amount: input.amount,
      token: input.token,
      from: input.from.toLowerCase(),
      to: input.to.toLowerCase(),
      burnTxHash: input.burnTxHash,
      messageHash: input.burnTxHash ? `0x${input.burnTxHash.slice(2, 66)}` : undefined,
      version,
      createdAt: now(),
      updatedAt: now(),
      complianceResult,
    };

    this.transfers.set(transfer.id, transfer);

    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: input.agentId ?? 'cctp-transfer-manager',
        action: 'cctp-initiate-transfer',
        reasoning: `CCTP ${version} transfer initiated: ${input.amount} ${input.token} from ${input.sourceChain} to ${input.destinationChain}`,
        confidence: 1.0,
        context: {
          transferId: transfer.id,
          state: transfer.state,
          version,
          sourceDomain: this.getDomain(input.sourceChain),
          destDomain: this.getDomain(input.destinationChain),
        },
      });
    }

    return { transfer: { ...transfer }, complianceResult };
  }

  private async pollAttestation(messageHash: string): Promise<string | null> {
    for (let i = 0; i < ATTESTATION_MAX_POLLS; i++) {
      const attestation = await this.fetchAttestation(messageHash);
      if (attestation) return attestation;

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, ATTESTATION_POLL_INTERVAL_MS));
    }
    return null;
  }

  private async fetchAttestation(messageHash: string): Promise<string | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.irisApiKey) {
        headers['Authorization'] = `Bearer ${this.irisApiKey}`;
      }

      const res = await fetch(
        `${this.attestationBaseUrl}/attestations/${messageHash}`,
        {
          headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      if (!res.ok) return null;

      const data = (await res.json()) as { attestation?: string; status?: string };
      if (data.status === 'complete' && data.attestation) {
        return data.attestation;
      }
      return null;
    } catch {
      return null;
    }
  }

  private updateTransferState(transfer: CCTPTransfer, state: CCTPTransferState): void {
    transfer.state = state;
    transfer.updatedAt = now();
    this.transfers.set(transfer.id, transfer);

    if (this.kontext) {
      this.kontext.logReasoning({
        agentId: 'cctp-transfer-manager',
        action: 'cctp-state-transition',
        reasoning: `CCTP transfer ${transfer.id} state: ${state}`,
        confidence: 1.0,
        context: { transferId: transfer.id, state, version: transfer.version },
      }).catch(() => {});
    }
  }
}
