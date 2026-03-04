// ============================================================================
// Kontext Server - x402 USDC Payment Middleware
// ============================================================================
// Enables per-API-call USDC payments on Base via the x402 protocol.
// Agents pay $0.002/event above the 20K free tier. Payments settle to
// Circle Programmable Wallet on Base in real-time.
//
// Architecture:
//   Request → Auth → x402 middleware → Route handler
//                       ↓
//             Free tier? → pass through
//             Pro (Stripe)? → pass through
//             Above limit + no payment header? → 402 with pricing
//             Has payment header? → verify via facilitator → credit → proceed

import type { Context, Next } from 'hono';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** USDC price per event in dollars */
export const X402_PRICE_PER_EVENT = '0.002';

/** USDC contract on Base */
export const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/** Base network identifier for x402 */
export const BASE_NETWORK = 'base';

/** Default facilitator URL (Coinbase) */
export const DEFAULT_FACILITATOR_URL = 'https://x402.org/facilitator';

/** Payee address — Circle Programmable Wallet on Base */
function getPayeeAddress(): string {
  return process.env['KONTEXT_PAYEE_ADDRESS'] ?? '0x18F596CCE5d414C1C0c71e68257f22c24d965434';
}

function getFacilitatorUrl(): string {
  return process.env['X402_FACILITATOR_URL'] ?? DEFAULT_FACILITATOR_URL;
}

function isX402Enabled(): boolean {
  return process.env['X402_ENABLED'] === 'true';
}

function getPricePerEvent(): string {
  return process.env['X402_PRICE_PER_EVENT'] ?? X402_PRICE_PER_EVENT;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface X402PaymentInfo {
  verified: boolean;
  payer?: string;
  txHash?: string;
  amountUsdc?: string;
  network?: string;
}

interface ApiKeyUsage {
  plan: string;
  eventCount: number;
  x402EventCount: number;
  x402TotalUsdcReceived: string;
  x402LastPaymentAt?: string;
}

// ---------------------------------------------------------------------------
// Payment Required Response (HTTP 402)
// ---------------------------------------------------------------------------

/**
 * Build the 402 Payment Required response body and headers.
 * Follows x402 V2 spec with backwards-compatible V1 fields.
 */
function buildPaymentRequired(resource: string): {
  body: Record<string, unknown>;
  headers: Record<string, string>;
} {
  const paymentRequirements = {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: BASE_NETWORK,
        maxAmountRequired: getPricePerEvent(),
        resource,
        description: `Kontext API event — ${getPricePerEvent()} USDC per event above 20K free tier`,
        mimeType: 'application/json',
        outputSchema: {},
        payTo: getPayeeAddress(),
        maxTimeoutSeconds: 60,
        asset: USDC_BASE_CONTRACT,
        extra: {},
      },
    ],
  };

  return {
    body: {
      error: 'Payment required',
      message: `Free tier limit (20,000 events/month) exceeded. Pay ${getPricePerEvent()} USDC per event via x402 or upgrade to Pro at https://getkontext.com/pricing`,
      ...paymentRequirements,
    },
    headers: {
      'Payment-Required': JSON.stringify(paymentRequirements),
    },
  };
}

// ---------------------------------------------------------------------------
// Payment Verification
// ---------------------------------------------------------------------------

/**
 * Verify an x402 payment via the facilitator.
 * Returns payment info if verification succeeds, null if it fails.
 */
async function verifyPayment(
  paymentHeader: string,
  resource: string,
): Promise<X402PaymentInfo | null> {
  try {
    const facilitatorUrl = getFacilitatorUrl();

    const paymentRequirements = {
      scheme: 'exact',
      network: BASE_NETWORK,
      maxAmountRequired: getPricePerEvent(),
      resource,
      description: 'Kontext API event',
      mimeType: 'application/json',
      outputSchema: {},
      payTo: getPayeeAddress(),
      maxTimeoutSeconds: 60,
      asset: USDC_BASE_CONTRACT,
      extra: {},
    };

    // Parse the payment payload from the header
    let paymentPayload: Record<string, unknown>;
    try {
      paymentPayload = JSON.parse(paymentHeader);
    } catch {
      console.warn('[x402] Invalid payment header — not valid JSON');
      return null;
    }

    // Verify with facilitator
    const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!verifyResponse.ok) {
      console.warn(`[x402] Facilitator verify returned ${verifyResponse.status}`);
      return null;
    }

    const verifyResult = await verifyResponse.json() as { valid?: boolean; payer?: string };

    if (!verifyResult.valid) {
      console.warn('[x402] Payment verification failed');
      return null;
    }

    // Settle the payment
    const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!settleResponse.ok) {
      console.warn(`[x402] Facilitator settle returned ${settleResponse.status}`);
      // Payment verified but settlement failed — still credit the event
      return {
        verified: true,
        payer: verifyResult.payer,
        amountUsdc: getPricePerEvent(),
        network: BASE_NETWORK,
      };
    }

    const settleResult = await settleResponse.json() as {
      success?: boolean;
      transaction?: string;
      payer?: string;
      network?: string;
    };

    return {
      verified: true,
      payer: settleResult.payer ?? verifyResult.payer,
      txHash: settleResult.transaction,
      amountUsdc: getPricePerEvent(),
      network: settleResult.network ?? BASE_NETWORK,
    };
  } catch (err) {
    console.warn('[x402] Payment verification error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hono Middleware
// ---------------------------------------------------------------------------

/**
 * x402 payment middleware for Hono.
 *
 * Checks if the request needs x402 payment:
 * 1. If x402 is disabled via feature flag → pass through
 * 2. If user has a Pro/Enterprise plan (Stripe) → pass through
 * 3. If event count is under free tier (20K) → pass through
 * 4. If Payment-Signature or X-Payment header present → verify and credit
 * 5. Otherwise → return 402 with payment requirements
 *
 * @param getUsage - Function to get current usage for the API key
 * @param creditEvent - Function to credit an x402-paid event
 */
export function createX402Middleware(
  getUsage: (apiKey: string) => ApiKeyUsage,
  creditEvent: (apiKey: string, payment: X402PaymentInfo) => void,
) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    // Feature flag check
    if (!isX402Enabled()) {
      return next();
    }

    const apiKey = c.req.header('Authorization')?.slice(7) ?? '';
    const usage = getUsage(apiKey);

    // Pro/Enterprise plans pass through — they're billed via Stripe
    if (usage.plan === 'pro' || usage.plan === 'enterprise') {
      return next();
    }

    // Under free tier limit — pass through
    if (usage.eventCount <= 20_000) {
      return next();
    }

    // Check for x402 payment headers (V2: Payment-Signature, V1 compat: X-Payment)
    const paymentHeader = c.req.header('Payment-Signature') ?? c.req.header('X-Payment');

    if (!paymentHeader) {
      // No payment — return 402
      const resource = c.req.url;
      const { body, headers } = buildPaymentRequired(resource);

      return c.json(body, {
        status: 402,
        headers,
      });
    }

    // Verify the payment
    const resource = c.req.url;
    const payment = await verifyPayment(paymentHeader, resource);

    if (!payment || !payment.verified) {
      return c.json({
        error: 'Payment verification failed',
        message: 'The x402 payment could not be verified. Ensure the payment signature is valid.',
      }, { status: 402 });
    }

    // Credit the event
    creditEvent(apiKey, payment);

    // Set payment response header
    c.header('Payment-Response', JSON.stringify({
      success: true,
      txHash: payment.txHash,
      payer: payment.payer,
      amount: payment.amountUsdc,
      network: payment.network,
    }));

    return next();
  };
}

// ---------------------------------------------------------------------------
// Self-Dogfooding: Compliance logging for incoming x402 payments
// ---------------------------------------------------------------------------

/**
 * Log an x402 payment through Kontext's own compliance check.
 * Non-blocking — failures are logged but don't block the API call.
 */
export async function logX402PaymentCompliance(payment: X402PaymentInfo): Promise<void> {
  try {
    // Lazy-import to avoid circular deps and keep it optional
    const { Kontext } = await import('kontext-sdk');

    const ctx = Kontext.init({
      projectId: 'kontext-server',
      environment: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',
    });

    await ctx.verify({
      txHash: payment.txHash ?? `x402-${Date.now()}`,
      chain: 'base',
      amount: payment.amountUsdc ?? X402_PRICE_PER_EVENT,
      token: 'USDC',
      from: payment.payer ?? 'unknown',
      to: getPayeeAddress(),
      agentId: 'kontext-x402-receiver',
      reasoning: 'Incoming x402 API payment — self-dogfooding compliance check',
    });

    await ctx.destroy();
  } catch (err) {
    // Non-blocking — log and continue
    console.warn('[x402] Self-dogfooding compliance log failed:', err instanceof Error ? err.message : String(err));
  }
}
