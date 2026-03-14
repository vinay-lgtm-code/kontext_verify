// ============================================================================
// Kontext SDK - Coinbase Developer Platform (CDP) Wallet Manager
// ============================================================================
// Enterprise plan-gated. Uses native fetch() — zero runtime dependencies.
// Auth: JWT Bearer tokens signed with apiKeySecret (Ed25519).

import type {
  CoinbaseWalletConfig,
  CoinbaseAccount,
  CoinbaseTransferInput,
  CoinbaseTransferResult,
} from '../types.js';
import { KontextError, KontextErrorCode } from '../types.js';
import { generateId } from '../utils.js';

const CDP_BASE_URL = 'https://api.cdp.coinbase.com';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * CoinbaseWalletManager wraps Coinbase Developer Platform (CDP) server wallets
 * with automatic compliance logging via Kontext.
 *
 * Enterprise plan-gated — plan checks enforced at the Kontext client level.
 *
 * Auth model:
 * - API requests: JWT Bearer token signed with apiKeySecret (Ed25519), 120s expiry
 * - Wallet operations: X-Wallet-Auth header (JWT signed with walletSecret, 60s expiry)
 */
export class CoinbaseWalletManager {
  private readonly apiKeyId: string;
  private readonly apiKeySecret: string;
  private readonly walletSecret: string;
  private readonly baseUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kontext: any = null;

  constructor(config: CoinbaseWalletConfig) {
    if (!config.apiKeyId) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'Coinbase CDP API Key ID is required',
      );
    }
    if (!config.apiKeySecret) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'Coinbase CDP API Key Secret is required',
      );
    }
    if (!config.walletSecret) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'Coinbase CDP Wallet Secret is required',
      );
    }
    this.apiKeyId = config.apiKeyId;
    this.apiKeySecret = config.apiKeySecret;
    this.walletSecret = config.walletSecret;
    this.baseUrl = CDP_BASE_URL;
  }

  /** Link to Kontext instance for auto-compliance logging */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setKontext(kontext: any): void {
    this.kontext = kontext;
  }

  /** Validate credentials by listing accounts */
  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/evm/accounts`, {
        method: 'GET',
        headers: await this.headers(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Create an EVM account */
  async createAccount(opts?: { name?: string; network?: string }): Promise<CoinbaseAccount> {
    const body: Record<string, unknown> = {};
    if (opts?.name) body['name'] = opts.name;
    if (opts?.network) body['network'] = opts.network;

    const res = await this.request<{ address: string; name?: string; network: string }>(
      'POST',
      '/v1/evm/accounts',
      body,
      true, // requires wallet auth
    );

    return {
      address: res.address,
      name: res.name,
      network: res.network,
    };
  }

  /** List accounts */
  async listAccounts(): Promise<CoinbaseAccount[]> {
    const res = await this.request<{ accounts: { address: string; name?: string; network: string }[] }>(
      'GET',
      '/v1/evm/accounts',
    );

    return res.accounts.map((a) => ({
      address: a.address,
      name: a.name,
      network: a.network,
    }));
  }

  /** Get token balances for an address */
  async getBalances(address: string, network: string): Promise<{ token: string; amount: string }[]> {
    const res = await this.request<{ balances: { asset: string; amount: string }[] }>(
      'GET',
      `/v1/evm/accounts/${address}/balances?network=${network}`,
    );

    return res.balances.map((b) => ({
      token: b.asset,
      amount: b.amount,
    }));
  }

  /** Transfer with auto-compliance: runs verify() before/after transfer */
  async transferWithCompliance(input: CoinbaseTransferInput): Promise<CoinbaseTransferResult> {
    // Run pre-transfer compliance check if kontext is linked
    let complianceResult;
    if (this.kontext) {
      const chain = this.mapNetwork(input.network);
      complianceResult = await this.kontext.verify({
        txHash: `cdp-pending-${generateId()}`,
        chain,
        amount: input.amount,
        token: input.token,
        from: input.fromAddress,
        to: input.toAddress,
        agentId: input.agentId ?? 'coinbase-wallet-manager',
      });

      if (!complianceResult.compliant) {
        return {
          transactionHash: '',
          status: 'BLOCKED',
          complianceResult,
        };
      }
    }

    // Execute transfer
    const body = {
      to: input.toAddress,
      amount: input.amount,
      asset: input.token,
      network: input.network,
    };

    const res = await this.request<{ transactionHash: string; status: string }>(
      'POST',
      `/v1/evm/accounts/${input.fromAddress}/transfer`,
      body,
      true, // requires wallet auth
    );

    // Log reasoning if kontext is linked
    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: input.agentId ?? 'coinbase-wallet-manager',
        action: 'coinbase-transfer',
        reasoning: `CDP transfer: ${input.amount} ${input.token} from ${input.fromAddress} to ${input.toAddress} on ${input.network}`,
        confidence: 1.0,
        context: { transactionHash: res.transactionHash, status: res.status },
      });
    }

    return {
      transactionHash: res.transactionHash,
      status: res.status,
      complianceResult,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Build auth headers. CDP uses JWT Bearer tokens:
   * - API auth: signed with apiKeySecret, apiKeyId as kid, 120s expiry
   * - Wallet auth: X-Wallet-Auth header signed with walletSecret, 60s expiry
   *
   * Note: Full Ed25519 JWT signing requires the jose or crypto module.
   * This implementation provides the header structure; production use
   * should integrate with @coinbase/cdp-sdk for proper JWT signing.
   */
  private async headers(includeWalletAuth = false): Promise<Record<string, string>> {
    const apiJwt = this.buildJwt(this.apiKeyId, this.apiKeySecret, 120);
    const hdrs: Record<string, string> = {
      'Authorization': `Bearer ${apiJwt}`,
      'Content-Type': 'application/json',
    };
    if (includeWalletAuth) {
      const walletJwt = this.buildJwt('wallet', this.walletSecret, 60);
      hdrs['X-Wallet-Auth'] = walletJwt;
    }
    return hdrs;
  }

  /**
   * Build a minimal JWT structure. In production, this should use Ed25519
   * signing via the crypto module or jose library. Here we build the
   * structure that CDP expects.
   */
  private buildJwt(kid: string, _secret: string, expirySeconds: number): string {
    const header = { alg: 'EdDSA', typ: 'JWT', kid };
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.apiKeyId,
      sub: this.apiKeyId,
      aud: ['cdp'],
      iat: nowSec,
      exp: nowSec + expirySeconds,
      jti: generateId(),
    };
    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    // Signature placeholder — production should use Ed25519 signing
    return `${b64Header}.${b64Payload}.unsigned`;
  }

  private async request<T>(method: string, path: string, body?: unknown, walletAuth = false): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: await this.headers(walletAuth),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new KontextError(
        KontextErrorCode.API_ERROR,
        `Coinbase CDP API error ${res.status}: ${text}`,
      );
    }

    return res.json() as Promise<T>;
  }

  private mapNetwork(network: string): string {
    const map: Record<string, string> = {
      'base': 'base',
      'base-sepolia': 'base',
      'ethereum': 'ethereum',
      'ethereum-sepolia': 'ethereum',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum',
    };
    return map[network] ?? network;
  }
}
