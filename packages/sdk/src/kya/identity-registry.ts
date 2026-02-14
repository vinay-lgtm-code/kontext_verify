// ============================================================================
// Kontext SDK - KYA Agent Identity Registry
// ============================================================================

import type {
  AgentIdentity,
  WalletMapping,
  KYCProviderReference,
  KYCStatus,
  RegisterIdentityInput,
  UpdateIdentityInput,
} from './types.js';
import { generateId, now } from '../utils.js';

/**
 * In-memory registry for agent identities.
 * Provides CRUD operations, wallet index lookups, and KYC reference management.
 */
export class AgentIdentityRegistry {
  /** agentId -> AgentIdentity */
  private readonly identities = new Map<string, AgentIdentity>();
  /** normalized address -> agentId (reverse index) */
  private readonly walletIndex = new Map<string, string>();

  /**
   * Register a new agent identity.
   */
  register(input: RegisterIdentityInput): AgentIdentity {
    if (this.identities.has(input.agentId)) {
      throw new Error(`Identity already registered for agent: ${input.agentId}`);
    }

    const timestamp = now();
    const wallets: WalletMapping[] = (input.wallets ?? []).map((w) => ({
      address: w.address.toLowerCase(),
      chain: w.chain,
      verified: false,
      addedAt: timestamp,
      label: w.label,
    }));

    const identity: AgentIdentity = {
      agentId: input.agentId,
      displayName: input.displayName,
      entityType: input.entityType ?? 'unknown',
      wallets,
      kycReferences: [],
      contactUri: input.contactUri,
      metadata: input.metadata ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.identities.set(input.agentId, identity);

    // Build reverse wallet index
    for (const wallet of wallets) {
      this.walletIndex.set(wallet.address, input.agentId);
    }

    return { ...identity, wallets: [...wallets] };
  }

  /**
   * Update an existing agent identity.
   */
  update(agentId: string, input: UpdateIdentityInput): AgentIdentity {
    const existing = this.identities.get(agentId);
    if (!existing) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const updated: AgentIdentity = {
      ...existing,
      updatedAt: now(),
    };

    if (input.displayName !== undefined) updated.displayName = input.displayName;
    if (input.entityType !== undefined) updated.entityType = input.entityType;
    if (input.contactUri !== undefined) updated.contactUri = input.contactUri;
    if (input.metadata !== undefined) {
      updated.metadata = { ...existing.metadata, ...input.metadata };
    }

    this.identities.set(agentId, updated);
    return { ...updated, wallets: [...updated.wallets] };
  }

  /**
   * Get an agent identity by agent ID.
   */
  get(agentId: string): AgentIdentity | undefined {
    const identity = this.identities.get(agentId);
    if (!identity) return undefined;
    return { ...identity, wallets: [...identity.wallets] };
  }

  /**
   * Remove an agent identity and all wallet index entries.
   */
  remove(agentId: string): boolean {
    const identity = this.identities.get(agentId);
    if (!identity) return false;

    // Remove wallet index entries
    for (const wallet of identity.wallets) {
      this.walletIndex.delete(wallet.address);
    }

    this.identities.delete(agentId);
    return true;
  }

  /**
   * Get all registered identities.
   */
  getAll(): AgentIdentity[] {
    return Array.from(this.identities.values()).map((id) => ({
      ...id,
      wallets: [...id.wallets],
    }));
  }

  // --------------------------------------------------------------------------
  // Wallet Operations
  // --------------------------------------------------------------------------

  /**
   * Add a wallet to an existing agent identity.
   */
  addWallet(
    agentId: string,
    wallet: { address: string; chain: string; label?: string },
  ): AgentIdentity {
    const identity = this.identities.get(agentId);
    if (!identity) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const normalized = wallet.address.toLowerCase();

    // Check if wallet is already registered to another agent
    const existingOwner = this.walletIndex.get(normalized);
    if (existingOwner && existingOwner !== agentId) {
      throw new Error(`Wallet ${normalized} is already registered to agent: ${existingOwner}`);
    }

    // Check if wallet is already on this agent
    if (identity.wallets.some((w) => w.address === normalized)) {
      return { ...identity, wallets: [...identity.wallets] };
    }

    const mapping: WalletMapping = {
      address: normalized,
      chain: wallet.chain,
      verified: false,
      addedAt: now(),
      label: wallet.label,
    };

    identity.wallets.push(mapping);
    identity.updatedAt = now();
    this.walletIndex.set(normalized, agentId);

    return { ...identity, wallets: [...identity.wallets] };
  }

  /**
   * Remove a wallet from an agent identity.
   */
  removeWallet(agentId: string, address: string): AgentIdentity {
    const identity = this.identities.get(agentId);
    if (!identity) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const normalized = address.toLowerCase();
    identity.wallets = identity.wallets.filter((w) => w.address !== normalized);
    identity.updatedAt = now();
    this.walletIndex.delete(normalized);

    return { ...identity, wallets: [...identity.wallets] };
  }

  /**
   * Look up an agent identity by wallet address.
   */
  lookupByWallet(address: string): AgentIdentity | undefined {
    const agentId = this.walletIndex.get(address.toLowerCase());
    if (!agentId) return undefined;
    return this.get(agentId);
  }

  // --------------------------------------------------------------------------
  // KYC Operations
  // --------------------------------------------------------------------------

  /**
   * Add a KYC provider reference to an agent identity.
   */
  addKycReference(agentId: string, reference: KYCProviderReference): AgentIdentity {
    const identity = this.identities.get(agentId);
    if (!identity) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    identity.kycReferences.push(reference);
    identity.updatedAt = now();

    return { ...identity, wallets: [...identity.wallets] };
  }

  /**
   * Get the overall KYC status for an agent.
   * Returns the best status from all references.
   */
  getKycStatus(agentId: string): KYCStatus {
    const identity = this.identities.get(agentId);
    if (!identity || identity.kycReferences.length === 0) return 'none';

    const statusPriority: Record<KYCStatus, number> = {
      verified: 4,
      pending: 3,
      expired: 2,
      rejected: 1,
      none: 0,
    };

    let best: KYCStatus = 'none';
    for (const ref of identity.kycReferences) {
      if (statusPriority[ref.status] > statusPriority[best]) {
        best = ref.status;
      }
    }
    return best;
  }

  /**
   * Check if an agent has at least one verified and non-expired KYC reference.
   */
  hasVerifiedKyc(agentId: string): boolean {
    const identity = this.identities.get(agentId);
    if (!identity) return false;

    const currentTime = new Date().toISOString();
    return identity.kycReferences.some(
      (ref) =>
        ref.status === 'verified' &&
        (ref.expiresAt === null || ref.expiresAt > currentTime),
    );
  }
}
