// ============================================================================
// Kontext SDK - Circle Programmable Wallets Manager
// ============================================================================
// Enterprise plan-gated. Uses native fetch() — zero runtime dependencies.

import type {
  CircleWalletConfig,
  CreateWalletSetInput,
  CircleWalletSet,
  CreateWalletInput,
  CircleWallet,
  CircleTransferInput,
  CircleTransferResult,
} from '../types.js';
import { KontextError, KontextErrorCode } from '../types.js';
import { generateId } from '../utils.js';

const DEFAULT_BASE_URL = 'https://api.circle.com';
const REQUEST_TIMEOUT_MS = 10_000;

interface CircleApiResponse<T> {
  data: T;
}

/**
 * CircleWalletManager wraps Circle Programmable Wallets (developer-controlled)
 * with automatic compliance logging via Kontext.
 *
 * Enterprise plan-gated — plan checks enforced at the Kontext client level.
 */
export class CircleWalletManager {
  private readonly apiKey: string;
  private readonly entitySecret: string;
  private readonly baseUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kontext: any = null;

  constructor(config: CircleWalletConfig) {
    if (!config.apiKey) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'Circle API key is required',
      );
    }
    if (!config.entitySecret) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'Circle entity secret is required',
      );
    }
    this.apiKey = config.apiKey;
    this.entitySecret = config.entitySecret;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  /** Link to Kontext instance for auto-compliance logging */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setKontext(kontext: any): void {
    this.kontext = kontext;
  }

  /** Validate credentials by calling Circle's configuration endpoint */
  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/w3s/config/entity`, {
        method: 'GET',
        headers: this.headers(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Create a wallet set (container for wallets) */
  async createWalletSet(input: CreateWalletSetInput): Promise<CircleWalletSet> {
    const body = {
      name: input.name,
      idempotencyKey: input.idempotencyKey ?? generateId(),
      entitySecretCiphertext: this.entitySecret,
    };
    const res = await this.request<CircleApiResponse<{ walletSet: CircleWalletSet }>>(
      'POST',
      '/v1/w3s/developer/walletSets',
      body,
    );
    return res.data.walletSet;
  }

  /** Create wallet(s) in a wallet set */
  async createWallet(input: CreateWalletInput): Promise<CircleWallet[]> {
    const body = {
      walletSetId: input.walletSetId,
      blockchains: input.blockchains.map((c) => this.mapChain(c)),
      count: input.count ?? 1,
      accountType: input.accountType ?? 'EOA',
      idempotencyKey: input.idempotencyKey ?? generateId(),
      entitySecretCiphertext: this.entitySecret,
    };
    const res = await this.request<CircleApiResponse<{ wallets: CircleWallet[] }>>(
      'POST',
      '/v1/w3s/developer/wallets',
      body,
    );
    return res.data.wallets;
  }

  /** List wallets, optionally filtered by wallet set */
  async listWallets(walletSetId?: string): Promise<CircleWallet[]> {
    const qs = walletSetId ? `?walletSetId=${walletSetId}` : '';
    const res = await this.request<CircleApiResponse<{ wallets: CircleWallet[] }>>(
      'GET',
      `/v1/w3s/wallets${qs}`,
    );
    return res.data.wallets;
  }

  /** Get wallet token balances */
  async getBalance(walletId: string): Promise<{ token: string; amount: string }[]> {
    const res = await this.request<CircleApiResponse<{ tokenBalances: { token: { symbol: string }; amount: string }[] }>>(
      'GET',
      `/v1/w3s/wallets/${walletId}/balances`,
    );
    return res.data.tokenBalances.map((b) => ({
      token: b.token.symbol,
      amount: b.amount,
    }));
  }

  /** Transfer with auto-compliance: runs verify() before/after transfer */
  async transferWithCompliance(input: CircleTransferInput): Promise<CircleTransferResult> {
    // Run pre-transfer compliance check if kontext is linked
    let complianceResult;
    if (this.kontext) {
      complianceResult = await this.kontext.verify({
        txHash: `circle-pending-${generateId()}`,
        chain: input.blockchain,
        amount: input.amount,
        token: 'USDC',
        from: input.walletId,
        to: input.destinationAddress,
        agentId: input.agentId ?? 'circle-wallet-manager',
      });

      if (!complianceResult.compliant) {
        return {
          id: '',
          state: 'BLOCKED',
          complianceResult,
        };
      }
    }

    // Execute transfer
    const body = {
      walletId: input.walletId,
      tokenAddress: input.tokenAddress,
      destinationAddress: input.destinationAddress,
      amounts: [input.amount],
      blockchain: this.mapChain(input.blockchain),
      idempotencyKey: input.idempotencyKey ?? generateId(),
      entitySecretCiphertext: this.entitySecret,
      feeLevel: 'MEDIUM',
    };

    const res = await this.request<CircleApiResponse<{ id: string; state: string; txHash?: string }>>(
      'POST',
      '/v1/w3s/developer/transactions/transfer',
      body,
    );

    // Log reasoning if kontext is linked
    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: input.agentId ?? 'circle-wallet-manager',
        action: 'circle-transfer',
        reasoning: `Circle transfer ${res.data.id}: ${input.amount} to ${input.destinationAddress} on ${input.blockchain}`,
        confidence: 1.0,
        context: { transferId: res.data.id, state: res.data.state },
      });
    }

    return {
      id: res.data.id,
      state: res.data.state,
      txHash: res.data.txHash,
      complianceResult,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Entity-Secret': this.entitySecret,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new KontextError(
        KontextErrorCode.API_ERROR,
        `Circle API error ${res.status}: ${text}`,
      );
    }

    return res.json() as Promise<T>;
  }

  private mapChain(chain: string): string {
    const map: Record<string, string> = {
      ethereum: 'ETH',
      base: 'BASE',
      polygon: 'MATIC',
      arbitrum: 'ARB',
      optimism: 'OP',
      avalanche: 'AVAX',
      solana: 'SOL',
    };
    return map[chain] ?? chain.toUpperCase();
  }
}
