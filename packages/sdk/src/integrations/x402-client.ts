// ============================================================================
// x402 Client Helper — Optional SDK-side payment handler
// ============================================================================
// Provides a fetch wrapper that automatically handles HTTP 402 responses
// from the Kontext API by signing USDC payments on Base via x402.
//
// ZERO new runtime dependencies — uses optional peer dependencies:
//   @x402/fetch  — x402-aware fetch wrapper
//   @x402/evm    — EVM payment signing
//
// Usage:
//   import { createX402Fetch } from 'kontext-sdk';
//   const x402Fetch = createX402Fetch({ walletClient });
//   const ctx = Kontext.init({ ..., x402: { fetchHandler: x402Fetch } });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface X402ClientConfig {
  /**
   * viem WalletClient on Base for signing USDC payments.
   * Must be connected to Base network (chainId: 8453).
   */
  walletClient: unknown;
  /**
   * Maximum USDC price per event the client will accept.
   * Rejects 402 responses above this cap.
   * @default '0.01'
   */
  maxPricePerEvent?: string;
}

export interface X402FetchHandler {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an x402-aware fetch function that automatically handles
 * HTTP 402 Payment Required responses from the Kontext API.
 *
 * Requires optional peer dependencies `@x402/fetch` and `@x402/evm`.
 * If they are not installed, this function throws with a helpful message.
 *
 * @example
 * ```typescript
 * import { createWalletClient, http } from 'viem';
 * import { base } from 'viem/chains';
 * import { createX402Fetch } from 'kontext-sdk';
 *
 * const walletClient = createWalletClient({
 *   chain: base,
 *   transport: http(),
 *   account: privateKeyToAccount('0x...'),
 * });
 *
 * const x402Fetch = createX402Fetch({ walletClient });
 *
 * const ctx = Kontext.init({
 *   projectId: 'my-agent',
 *   environment: 'production',
 *   x402: { fetchHandler: x402Fetch },
 * });
 * ```
 */
export async function createX402Fetch(
  config: X402ClientConfig,
): Promise<X402FetchHandler> {
  const { walletClient, maxPricePerEvent = '0.01' } = config;

  if (!walletClient) {
    throw new Error(
      'x402: walletClient is required. Pass a viem WalletClient connected to Base.',
    );
  }

  // Dynamically import optional peer dependencies (no compile-time type deps)
  let wrapFetchWithX402: (fetch: typeof globalThis.fetch, walletClient: unknown) => typeof globalThis.fetch;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const x402Fetch: Record<string, unknown> = await (Function('return import("@x402/fetch")')() as Promise<Record<string, unknown>>);
    const fn = (x402Fetch['wrapFetchWithX402'] ??
      (x402Fetch['default'] as Record<string, unknown> | undefined)?.['wrapFetchWithX402']) as typeof wrapFetchWithX402 | undefined;
    if (!fn) throw new Error('missing export');
    wrapFetchWithX402 = fn;
  } catch {
    throw new Error(
      'x402: Missing peer dependency @x402/fetch. Install with: npm install @x402/fetch @x402/evm',
    );
  }

  // Create the wrapped fetch
  const x402WrappedFetch = wrapFetchWithX402(globalThis.fetch, walletClient);

  // Add price safety cap
  const safeFetch: X402FetchHandler = async (input, init) => {
    const response = await x402WrappedFetch(input as string, init);

    // If the x402 library couldn't handle the 402 (e.g., price too high),
    // check the cap ourselves
    if (response.status === 402) {
      const paymentRequired = response.headers.get('Payment-Required');
      if (paymentRequired) {
        try {
          const requirements = JSON.parse(paymentRequired);
          const accepts = requirements.accepts ?? [];
          for (const accept of accepts) {
            const price = parseFloat(accept.maxAmountRequired ?? '0');
            const cap = parseFloat(maxPricePerEvent);
            if (price > cap) {
              throw new Error(
                `x402: Price per event ($${price} USDC) exceeds safety cap ($${cap} USDC). ` +
                `Increase maxPricePerEvent or check the server pricing.`,
              );
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('x402:')) throw e;
          // Couldn't parse — let the 402 propagate
        }
      }
    }

    return response;
  };

  return safeFetch;
}
