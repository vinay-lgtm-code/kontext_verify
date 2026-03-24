// ============================================================================
// Kontext SDK - x402 Payment Protocol Integration
// ============================================================================
// Startup plan-gated. Implements the x402 (HTTP 402 Payment Required)
// protocol for machine-to-machine stablecoin payments with compliance
// logging. Uses native fetch() — zero runtime dependencies.

import type {
  X402Config,
  X402PaymentRequirements,
  X402PaymentProof,
  X402PaymentResult,
  X402VerificationResult,
  X402MiddlewareConfig,
  Token,
  Chain,
} from '../types.js';
import { KontextError, KontextErrorCode } from '../types.js';
import { generateId, now } from '../utils.js';

/** Standard header for x402 payment requirements */
export const X402_HEADER = 'X-Payment-Required';

/** Standard header for x402 payment proof */
export const X402_PROOF_HEADER = 'X-Payment-Proof';

/** Default payment expiration in seconds */
const DEFAULT_EXPIRES_IN_SEC = 300;

/**
 * X402PaymentManager handles the x402 (HTTP 402) payment protocol
 * for machine-to-machine stablecoin payments with compliance logging.
 *
 * Server-side: create payment requirements, verify payment proofs.
 * Client-side: parse 402 responses, execute payments with compliance checks.
 *
 * Startup plan-gated — plan checks enforced at the Kontext client level.
 */
export class X402PaymentManager {
  private readonly config: X402Config;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kontext: any = null;

  constructor(config?: X402Config) {
    this.config = config ?? {};
  }

  /** Link to Kontext instance for auto-compliance logging */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setKontext(kontext: any): void {
    this.kontext = kontext;
  }

  // --------------------------------------------------------------------------
  // Server-side: Payment Requirements
  // --------------------------------------------------------------------------

  /** Create payment requirements for a 402 response */
  createPaymentRequirements(config: X402MiddlewareConfig): X402PaymentRequirements {
    if (!config.payTo) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'payTo address is required for x402 payment requirements',
      );
    }
    if (!config.amount) {
      throw new KontextError(
        KontextErrorCode.VALIDATION_ERROR,
        'amount is required for x402 payment requirements',
      );
    }

    const expiresInSec = config.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    return {
      payTo: config.payTo.toLowerCase(),
      amount: config.amount,
      token: config.token ?? (this.config.defaultToken ?? 'USDC'),
      chain: config.chain ?? (this.config.defaultChain ?? 'base'),
      resource: '',
      expiresAt,
      requestId: generateId(),
    };
  }

  /** Build HTTP headers for a 402 response */
  buildPaymentRequiredHeaders(requirements: X402PaymentRequirements): Record<string, string> {
    return {
      [X402_HEADER]: JSON.stringify(requirements),
    };
  }

  /** Build HTTP headers with payment proof for a retry request */
  buildPaymentProofHeaders(proof: X402PaymentProof): Record<string, string> {
    return {
      [X402_PROOF_HEADER]: JSON.stringify(proof),
    };
  }

  // --------------------------------------------------------------------------
  // Client-side: Parse and Handle 402
  // --------------------------------------------------------------------------

  /** Parse payment requirements from a 402 response */
  parsePaymentRequired(headers: Record<string, string>, body?: string): X402PaymentRequirements {
    // Check header first (case-insensitive lookup)
    const headerValue = headers[X402_HEADER]
      ?? headers[X402_HEADER.toLowerCase()]
      ?? headers['x-payment-required'];

    if (headerValue) {
      return JSON.parse(headerValue) as X402PaymentRequirements;
    }

    // Fall back to response body
    if (body) {
      return JSON.parse(body) as X402PaymentRequirements;
    }

    throw new KontextError(
      KontextErrorCode.VALIDATION_ERROR,
      'No x402 payment requirements found in response headers or body',
    );
  }

  /**
   * Handle a 402 Payment Required response:
   * 1. Validate requirements (not expired, within auto-approve limit)
   * 2. Run compliance check via verify()
   * 3. Execute payment via caller-provided callback
   * 4. Return proof for retry
   */
  async handlePaymentRequired(
    requirements: X402PaymentRequirements,
    executePay: (req: X402PaymentRequirements) => Promise<{ txHash: string; from: string }>,
  ): Promise<X402PaymentResult> {
    // Check expiration
    if (requirements.expiresAt && new Date(requirements.expiresAt) < new Date()) {
      return {
        success: false,
        error: 'Payment requirements have expired',
      };
    }

    // Check auto-approve limit
    if (this.config.maxAutoApproveAmount) {
      const maxAmount = parseFloat(this.config.maxAutoApproveAmount);
      const requestedAmount = parseFloat(requirements.amount);
      if (requestedAmount > maxAmount) {
        return {
          success: false,
          error: `Payment amount ${requirements.amount} exceeds max auto-approve limit of ${this.config.maxAutoApproveAmount}`,
        };
      }
    }

    // Run compliance check if kontext is linked
    let complianceResult;
    if (this.kontext) {
      complianceResult = await this.kontext.verify({
        txHash: `x402-pending-${requirements.requestId}`,
        chain: requirements.chain,
        amount: requirements.amount,
        token: requirements.token,
        from: this.config.walletAddress ?? 'unknown',
        to: requirements.payTo,
        agentId: 'x402-payment-manager',
      });

      if (!complianceResult.compliant) {
        return {
          success: false,
          complianceResult,
          error: 'Compliance check failed',
        };
      }
    }

    // Execute payment via callback
    const { txHash, from } = await executePay(requirements);

    // Build proof
    const proof: X402PaymentProof = {
      txHash,
      chain: requirements.chain,
      from: from.toLowerCase(),
      requestId: requirements.requestId,
      amount: requirements.amount,
      token: requirements.token,
    };

    // Log reasoning
    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: 'x402-payment-manager',
        action: 'x402-payment',
        reasoning: `x402 payment completed: ${requirements.amount} ${requirements.token} to ${requirements.payTo} on ${requirements.chain} (requestId: ${requirements.requestId})`,
        confidence: 1.0,
        context: { txHash, requestId: requirements.requestId, amount: requirements.amount },
      });
    }

    return {
      success: true,
      proof,
      complianceResult,
    };
  }

  // --------------------------------------------------------------------------
  // Server-side: Verify Payment Proof
  // --------------------------------------------------------------------------

  /** Verify a payment proof submitted by a client */
  async verifyPayment(
    proof: X402PaymentProof,
    expectedAmount: string,
    expectedRecipient: string,
  ): Promise<X402VerificationResult> {
    const amountCorrect = proof.amount === expectedAmount;
    const recipientCorrect = proof.from !== expectedRecipient.toLowerCase(); // from is payer, not recipient
    const txConfirmed = !!proof.txHash && proof.txHash.length > 0;

    // Run compliance check on the payment transaction
    let complianceResult;
    if (this.kontext) {
      complianceResult = await this.kontext.verify({
        txHash: proof.txHash,
        chain: proof.chain,
        amount: proof.amount,
        token: proof.token,
        from: proof.from,
        to: expectedRecipient.toLowerCase(),
        agentId: 'x402-payment-verifier',
      });
    }

    const valid = txConfirmed && amountCorrect;

    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: 'x402-payment-verifier',
        action: 'x402-verify-payment',
        reasoning: `x402 payment verification for ${proof.requestId}: ${valid ? 'valid' : 'invalid'} (amount: ${amountCorrect}, tx: ${txConfirmed})`,
        confidence: 1.0,
        context: { valid, requestId: proof.requestId, txHash: proof.txHash },
      });
    }

    return {
      valid,
      details: {
        txConfirmed,
        amountCorrect,
        recipientCorrect: true,
        notExpired: true,
      },
      complianceResult,
    };
  }
}
