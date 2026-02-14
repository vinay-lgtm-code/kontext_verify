// ============================================================================
// Kontext SDK - KYA Cross-Session Agent Linker
// ============================================================================

import type {
  AgentLink,
  LinkSignal,
  LinkStatus,
  CrossSessionLinkerConfig,
} from './types.js';
import type { KontextStore } from '../store.js';
import type { AgentIdentityRegistry } from './identity-registry.js';
import type { WalletClusterer } from './wallet-clustering.js';
import type { BehavioralFingerprinter } from './behavioral-fingerprint.js';
import { generateId, now } from '../utils.js';

/** Default signal weights */
const WALLET_OVERLAP_WEIGHT = 0.4;
const BEHAVIORAL_SIMILARITY_WEIGHT = 0.35;
const DECLARED_IDENTITY_WEIGHT = 0.25;

/**
 * Links agents across sessions by analyzing wallet graph overlap,
 * behavioral similarity, and declared identity signals.
 */
export class CrossSessionLinker {
  private readonly config: Required<CrossSessionLinkerConfig>;
  private readonly links = new Map<string, AgentLink>();

  constructor(config: CrossSessionLinkerConfig = {}) {
    this.config = {
      minBehavioralSimilarity: config.minBehavioralSimilarity ?? 0.85,
      minLinkConfidence: config.minLinkConfidence ?? 0.6,
    };
  }

  /**
   * Analyze all agents and create links between those with sufficient signals.
   */
  analyzeAndLink(
    store: KontextStore,
    registry: AgentIdentityRegistry,
    clusterer: WalletClusterer,
    fingerprinter: BehavioralFingerprinter,
  ): AgentLink[] {
    const newLinks: AgentLink[] = [];

    // Collect all unique agent IDs from the store
    const agentIds = new Set<string>();
    for (const tx of store.getTransactions()) {
      agentIds.add(tx.agentId);
    }
    for (const action of store.getActions()) {
      agentIds.add(action.agentId);
    }

    const agents = Array.from(agentIds);
    const clusters = clusterer.getClusters();

    // For each unique pair, compute signals
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const agentA = agents[i]!;
        const agentB = agents[j]!;

        // Skip if already linked
        const existingKey = this.getLinkKey(agentA, agentB);
        if (this.links.has(existingKey)) continue;

        const signals: LinkSignal[] = [];

        // Signal 1: Wallet overlap
        const walletOverlap = this.computeWalletOverlap(
          agentA,
          agentB,
          clusters,
        );
        if (walletOverlap > 0) {
          signals.push({
            type: 'wallet-overlap',
            strength: walletOverlap,
            weight: WALLET_OVERLAP_WEIGHT,
          });
        }

        // Signal 2: Behavioral similarity
        const embeddingA = fingerprinter.computeEmbedding(agentA, store);
        const embeddingB = fingerprinter.computeEmbedding(agentB, store);

        if (embeddingA && embeddingB) {
          const similarity = fingerprinter.cosineSimilarity(embeddingA, embeddingB);
          if (similarity >= this.config.minBehavioralSimilarity) {
            signals.push({
              type: 'behavioral-similarity',
              strength: similarity,
              weight: BEHAVIORAL_SIMILARITY_WEIGHT,
            });
          }
        }

        // Signal 3: Declared identity
        const declaredStrength = this.computeDeclaredIdentitySignal(
          agentA,
          agentB,
          registry,
        );
        if (declaredStrength > 0) {
          signals.push({
            type: 'declared-identity',
            strength: declaredStrength,
            weight: DECLARED_IDENTITY_WEIGHT,
          });
        }

        // Compute overall confidence
        if (signals.length === 0) continue;

        const confidence =
          signals.reduce((sum, s) => sum + s.strength * s.weight, 0) /
          signals.reduce((sum, s) => sum + s.weight, 0);

        if (confidence >= this.config.minLinkConfidence) {
          const link: AgentLink = {
            id: generateId(),
            agentIdA: agentA,
            agentIdB: agentB,
            confidence,
            signals,
            status: 'inferred',
            createdAt: now(),
          };

          this.links.set(existingKey, link);
          newLinks.push(link);
        }
      }
    }

    return newLinks;
  }

  /**
   * Manually link two agents.
   */
  manualLink(agentIdA: string, agentIdB: string, reviewedBy: string): AgentLink {
    const key = this.getLinkKey(agentIdA, agentIdB);
    const existing = this.links.get(key);

    if (existing) {
      existing.status = 'confirmed';
      existing.reviewedBy = reviewedBy;
      existing.reviewedAt = now();
      return { ...existing };
    }

    const link: AgentLink = {
      id: generateId(),
      agentIdA,
      agentIdB,
      confidence: 1.0,
      signals: [
        {
          type: 'declared-identity',
          strength: 1.0,
          weight: 1.0,
          detail: `Manually linked by ${reviewedBy}`,
        },
      ],
      status: 'confirmed',
      createdAt: now(),
      reviewedBy,
      reviewedAt: now(),
    };

    this.links.set(key, link);
    return { ...link };
  }

  /**
   * Review a link (confirm or reject).
   */
  reviewLink(
    linkId: string,
    decision: 'confirmed' | 'rejected',
    reviewedBy: string,
  ): AgentLink | undefined {
    for (const link of this.links.values()) {
      if (link.id === linkId) {
        link.status = decision;
        link.reviewedBy = reviewedBy;
        link.reviewedAt = now();
        return { ...link };
      }
    }
    return undefined;
  }

  /**
   * Get all agents linked to the given agent.
   */
  getLinkedAgents(agentId: string): string[] {
    const linked = new Set<string>();
    for (const link of this.links.values()) {
      if (link.status === 'rejected') continue;
      if (link.agentIdA === agentId) linked.add(link.agentIdB);
      if (link.agentIdB === agentId) linked.add(link.agentIdA);
    }
    return Array.from(linked);
  }

  /**
   * Get all links for a specific agent.
   */
  getLinksForAgent(agentId: string): AgentLink[] {
    const result: AgentLink[] = [];
    for (const link of this.links.values()) {
      if (link.agentIdA === agentId || link.agentIdB === agentId) {
        result.push({ ...link });
      }
    }
    return result;
  }

  /**
   * Get all links.
   */
  getAllLinks(): AgentLink[] {
    return Array.from(this.links.values()).map((l) => ({ ...l }));
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private getLinkKey(a: string, b: string): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  private computeWalletOverlap(
    agentA: string,
    agentB: string,
    clusters: Array<{ agentIds: string[]; addresses: string[] }>,
  ): number {
    const clustersA = new Set<string>();
    const clustersB = new Set<string>();

    for (const cluster of clusters) {
      if (cluster.agentIds.includes(agentA)) {
        for (const addr of cluster.addresses) clustersA.add(addr);
      }
      if (cluster.agentIds.includes(agentB)) {
        for (const addr of cluster.addresses) clustersB.add(addr);
      }
    }

    if (clustersA.size === 0 || clustersB.size === 0) return 0;

    const intersection = new Set([...clustersA].filter((a) => clustersB.has(a)));
    const union = new Set([...clustersA, ...clustersB]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private computeDeclaredIdentitySignal(
    agentA: string,
    agentB: string,
    registry: AgentIdentityRegistry,
  ): number {
    const identityA = registry.get(agentA);
    const identityB = registry.get(agentB);

    if (!identityA || !identityB) return 0;

    // Check shared declared wallets
    const walletsA = new Set(identityA.wallets.map((w) => w.address));
    const walletsB = new Set(identityB.wallets.map((w) => w.address));
    const sharedWallets = [...walletsA].filter((w) => walletsB.has(w));

    if (sharedWallets.length > 0) return 1.0;

    // Check shared KYC references
    const kycRefsA = new Set(
      identityA.kycReferences.map((r) => `${r.provider}:${r.referenceId}`),
    );
    const kycRefsB = new Set(
      identityB.kycReferences.map((r) => `${r.provider}:${r.referenceId}`),
    );
    const sharedKyc = [...kycRefsA].filter((r) => kycRefsB.has(r));

    if (sharedKyc.length > 0) return 1.0;

    return 0;
  }
}
