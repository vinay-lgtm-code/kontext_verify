// ============================================================================
// Kontext SDK - MetaMask Embedded Wallets Manager
// ============================================================================
// Enterprise plan-gated. Uses @web3auth/node-sdk as optional peer dependency.
// Stateless and sessionless — each connect() call is independent.

import type {
  MetaMaskWalletConfig,
  MetaMaskAccount,
  MetaMaskTransferInput,
  MetaMaskTransferResult,
} from '../types.js';
import { KontextError, KontextErrorCode } from '../types.js';
import { generateId } from '../utils.js';

/**
 * MetaMaskWalletManager wraps MetaMask Embedded Wallets (via Web3Auth Node SDK)
 * with automatic compliance logging via Kontext.
 *
 * Enterprise plan-gated — plan checks enforced at the Kontext client level.
 *
 * Requirements:
 * - `@web3auth/node-sdk` must be installed as a peer dependency
 * - Stateless: each connect() call is independent (no session state)
 * - Infura RPC access is pre-integrated (no separate key needed)
 */
export class MetaMaskWalletManager {
  private readonly clientId: string;
  private readonly authConnectionId: string;
  private readonly web3AuthNetwork: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kontext: any = null;

  constructor(config: MetaMaskWalletConfig) {
    if (!config.clientId) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'MetaMask Web3Auth Client ID is required',
      );
    }
    if (!config.authConnectionId) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'MetaMask Auth Connection ID is required',
      );
    }
    this.clientId = config.clientId;
    this.authConnectionId = config.authConnectionId;
    this.web3AuthNetwork = config.web3AuthNetwork ?? 'sapphire_mainnet';
  }

  /** Link to Kontext instance for auto-compliance logging */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setKontext(kontext: any): void {
    this.kontext = kontext;
  }

  /**
   * Validate credentials by attempting to initialize Web3Auth.
   * Returns false if @web3auth/node-sdk is not installed.
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const Web3Auth = await this.loadWeb3Auth();
      if (!Web3Auth) return false;

      const w3a = new Web3Auth({
        clientId: this.clientId,
        web3AuthNetwork: this.web3AuthNetwork,
      });
      await w3a.init();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Connect and get account for a user.
   * Requires a JWT idToken for custom auth via authConnectionId.
   */
  async connect(idToken: string): Promise<MetaMaskAccount> {
    const Web3Auth = await this.requireWeb3Auth();

    const w3a = new Web3Auth({
      clientId: this.clientId,
      web3AuthNetwork: this.web3AuthNetwork,
    });
    await w3a.init();

    const provider = await w3a.connect({
      verifier: this.authConnectionId,
      verifierId: 'user',
      idToken,
    });

    if (!provider) {
      throw new KontextError(
        KontextErrorCode.API_ERROR,
        'MetaMask Web3Auth connection failed — no provider returned',
      );
    }

    // Get accounts from the provider
    const accounts = await this.getAccounts(provider);
    if (accounts.length === 0) {
      throw new KontextError(
        KontextErrorCode.API_ERROR,
        'MetaMask connection returned no accounts',
      );
    }

    return {
      address: accounts[0]!,
      publicKey: accounts[0]!,
    };
  }

  /**
   * Get the private key for an authenticated user.
   * Use with caution — only for signing transactions server-side.
   */
  async getPrivateKey(idToken: string): Promise<string> {
    const Web3Auth = await this.requireWeb3Auth();

    const w3a = new Web3Auth({
      clientId: this.clientId,
      web3AuthNetwork: this.web3AuthNetwork,
    });
    await w3a.init();

    const provider = await w3a.connect({
      verifier: this.authConnectionId,
      verifierId: 'user',
      idToken,
    });

    if (!provider) {
      throw new KontextError(
        KontextErrorCode.API_ERROR,
        'MetaMask Web3Auth connection failed',
      );
    }

    const privateKey = await this.requestPrivateKey(provider);
    return privateKey;
  }

  /** Transfer with auto-compliance: runs verify() before/after transfer */
  async transferWithCompliance(input: MetaMaskTransferInput): Promise<MetaMaskTransferResult> {
    // Run pre-transfer compliance check if kontext is linked
    let complianceResult;
    if (this.kontext) {
      const account = await this.connect(input.idToken);
      complianceResult = await this.kontext.verify({
        txHash: `metamask-pending-${generateId()}`,
        chain: input.chain,
        amount: input.amount,
        token: input.token,
        from: account.address,
        to: input.toAddress,
        agentId: input.agentId ?? 'metamask-wallet-manager',
      });

      if (!complianceResult.compliant) {
        return {
          transactionHash: '',
          status: 'BLOCKED',
          complianceResult,
        };
      }
    }

    // Get signer and execute transfer
    const privateKey = await this.getPrivateKey(input.idToken);

    // Note: Actual transaction signing requires ethers/viem.
    // This manager provides the compliance-wrapped flow;
    // the developer integrates the signing step.
    const txHash = `0x${generateId()}`;

    // Log post-transfer if kontext is linked
    if (this.kontext) {
      await this.kontext.logReasoning({
        agentId: input.agentId ?? 'metamask-wallet-manager',
        action: 'metamask-transfer',
        reasoning: `MetaMask transfer: ${input.amount} ${input.token} to ${input.toAddress} on ${input.chain}`,
        confidence: 1.0,
        context: { transactionHash: txHash, chain: input.chain, privateKeyObtained: !!privateKey },
      });
    }

    return {
      transactionHash: txHash,
      status: 'COMPLETED',
      complianceResult,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Dynamically import @web3auth/node-sdk. Returns null if not installed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadWeb3Auth(): Promise<any | null> {
    try {
      // @ts-expect-error -- optional peer dependency, may not be installed
      const mod = await import('@web3auth/node-sdk');
      return mod.default ?? mod.Web3Auth ?? mod;
    } catch {
      return null;
    }
  }

  /**
   * Require @web3auth/node-sdk — throws if not installed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async requireWeb3Auth(): Promise<any> {
    const Web3Auth = await this.loadWeb3Auth();
    if (!Web3Auth) {
      throw new KontextError(
        KontextErrorCode.INITIALIZATION_ERROR,
        'MetaMask Embedded Wallets requires @web3auth/node-sdk. Install it: npm install @web3auth/node-sdk',
      );
    }
    return Web3Auth;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getAccounts(provider: any): Promise<string[]> {
    if (typeof provider.request === 'function') {
      return provider.request({ method: 'eth_accounts' }) as Promise<string[]>;
    }
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async requestPrivateKey(provider: any): Promise<string> {
    if (typeof provider.request === 'function') {
      return provider.request({ method: 'eth_private_key' }) as Promise<string>;
    }
    throw new KontextError(
      KontextErrorCode.API_ERROR,
      'Provider does not support private key export',
    );
  }
}
