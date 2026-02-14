// ============================================================================
// Kontext SDK - KYA Wallet Clustering
// ============================================================================

import type {
  WalletCluster,
  ClusteringEvidence,
  ClusteringHeuristic,
  WalletClusteringConfig,
} from './types.js';
import type { KontextStore } from '../store.js';
import type { AgentIdentityRegistry } from './identity-registry.js';
import { generateId, now } from '../utils.js';

// --------------------------------------------------------------------------
// Union-Find (Disjoint Set) with Path Compression + Union-by-Rank
// --------------------------------------------------------------------------

/**
 * Union-Find data structure for efficient set operations.
 * Exported for direct testing.
 */
export class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  /**
   * Find the representative of the set containing x.
   * Uses path compression for amortized near-constant time.
   */
  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }

    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }

    // Path compression
    let current = x;
    while (current !== root) {
      const next = this.parent.get(current)!;
      this.parent.set(current, root);
      current = next;
    }

    return root;
  }

  /**
   * Union the sets containing x and y.
   * Uses union-by-rank for balanced trees.
   */
  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    const rankX = this.rank.get(rootX)!;
    const rankY = this.rank.get(rootY)!;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }

  /**
   * Check if x and y are in the same set.
   */
  connected(x: string, y: string): boolean {
    return this.find(x) === this.find(y);
  }

  /**
   * Get all components as arrays of elements.
   */
  getComponents(): string[][] {
    const components = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)!.push(key);
    }
    return Array.from(components.values());
  }

  /**
   * Get the component containing x.
   */
  getComponentOf(x: string): string[] {
    const root = this.find(x);
    const component: string[] = [];
    for (const key of this.parent.keys()) {
      if (this.find(key) === root) {
        component.push(key);
      }
    }
    return component;
  }
}

// --------------------------------------------------------------------------
// Wallet Clusterer
// --------------------------------------------------------------------------

/**
 * Clusters wallet addresses using multiple heuristics.
 * Builds on UnionFind for efficient merging.
 */
export class WalletClusterer {
  private readonly config: Required<WalletClusteringConfig>;
  private cachedClusters: WalletCluster[] | null = null;

  constructor(config: WalletClusteringConfig = {}) {
    this.config = {
      temporalWindowSeconds: config.temporalWindowSeconds ?? 60,
      minDestinationOverlap: config.minDestinationOverlap ?? 0.3,
      minGasSponsoredWallets: config.minGasSponsoredWallets ?? 3,
    };
  }

  /**
   * Analyze transactions from the store and registry to produce wallet clusters.
   */
  analyzeFromStore(store: KontextStore, registry?: AgentIdentityRegistry): WalletCluster[] {
    const uf = new UnionFind();
    const evidence: ClusteringEvidence[] = [];
    const transactions = store.getTransactions();
    const timestamp = now();

    // Collect all addresses from transactions
    for (const tx of transactions) {
      uf.find(tx.from.toLowerCase());
      uf.find(tx.to.toLowerCase());
    }

    // Heuristic 1: Common Agent
    this.applyCommonAgent(store, uf, evidence, timestamp);

    // Heuristic 2: Funding Chain
    this.applyFundingChain(store, uf, evidence, timestamp);

    // Heuristic 3: Gas Sponsorship
    this.applyGasSponsorship(store, uf, evidence, timestamp);

    // Heuristic 4: Temporal Co-Spending
    this.applyTemporalCoSpending(store, uf, evidence, timestamp);

    // Heuristic 5: Declared Wallets
    if (registry) {
      this.applyDeclaredWallets(registry, uf, evidence, timestamp);
    }

    // Build clusters from union-find components
    const clusters = this.buildClusters(uf, evidence, store, registry, timestamp);
    this.cachedClusters = clusters;
    return clusters;
  }

  /**
   * Get cached clusters (or empty if not analyzed yet).
   */
  getClusters(): WalletCluster[] {
    return this.cachedClusters ?? [];
  }

  /**
   * Invalidate the cached clusters.
   */
  invalidateCache(): void {
    this.cachedClusters = null;
  }

  // --------------------------------------------------------------------------
  // Heuristics
  // --------------------------------------------------------------------------

  /**
   * Heuristic 1: Common Agent (confidence 0.9)
   * Same agentId used multiple addresses -> union all from/to per agent.
   */
  private applyCommonAgent(
    store: KontextStore,
    uf: UnionFind,
    evidence: ClusteringEvidence[],
    timestamp: string,
  ): void {
    const transactions = store.getTransactions();
    const agentAddresses = new Map<string, Set<string>>();

    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const agentId = tx.agentId;
      if (!agentAddresses.has(agentId)) {
        agentAddresses.set(agentId, new Set());
      }
      agentAddresses.get(agentId)!.add(from);
    }

    for (const [, addresses] of agentAddresses) {
      const addrs = Array.from(addresses);
      for (let i = 1; i < addrs.length; i++) {
        if (!uf.connected(addrs[0]!, addrs[i]!)) {
          uf.union(addrs[0]!, addrs[i]!);
          evidence.push({
            heuristic: 'common-agent',
            confidence: 0.9,
            addresses: [addrs[0]!, addrs[i]!],
            detectedAt: timestamp,
          });
        }
      }
    }
  }

  /**
   * Heuristic 2: Funding Chain (confidence 0.7)
   * If A sends to B, and A is agent-associated -> union A and B.
   */
  private applyFundingChain(
    store: KontextStore,
    uf: UnionFind,
    evidence: ClusteringEvidence[],
    timestamp: string,
  ): void {
    const transactions = store.getTransactions();
    const agentAssociated = new Set<string>();

    for (const tx of transactions) {
      agentAssociated.add(tx.from.toLowerCase());
    }

    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      if (agentAssociated.has(from) && !uf.connected(from, to)) {
        uf.union(from, to);
        evidence.push({
          heuristic: 'funding-chain',
          confidence: 0.7,
          addresses: [from, to],
          detectedAt: timestamp,
        });
      }
    }
  }

  /**
   * Heuristic 3: Gas Sponsorship (confidence 0.75)
   * If G is from in transfers to 3+ distinct agent wallets -> union G with all.
   */
  private applyGasSponsorship(
    store: KontextStore,
    uf: UnionFind,
    evidence: ClusteringEvidence[],
    timestamp: string,
  ): void {
    const transactions = store.getTransactions();
    const agentFromAddresses = new Set<string>();
    for (const tx of transactions) {
      agentFromAddresses.add(tx.from.toLowerCase());
    }

    // Find addresses that send to multiple agent wallets
    const senderToRecipients = new Map<string, Set<string>>();
    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      if (!senderToRecipients.has(from)) {
        senderToRecipients.set(from, new Set());
      }
      senderToRecipients.get(from)!.add(to);
    }

    for (const [sender, recipients] of senderToRecipients) {
      const agentRecipients = Array.from(recipients).filter((r) =>
        agentFromAddresses.has(r),
      );
      if (agentRecipients.length >= this.config.minGasSponsoredWallets) {
        for (const recipient of agentRecipients) {
          if (!uf.connected(sender, recipient)) {
            uf.union(sender, recipient);
            evidence.push({
              heuristic: 'gas-sponsorship',
              confidence: 0.75,
              addresses: [sender, recipient],
              detectedAt: timestamp,
              detail: `Sender ${sender} sponsors ${agentRecipients.length} agent wallets`,
            });
          }
        }
      }
    }
  }

  /**
   * Heuristic 4: Temporal Co-Spending (confidence 0.6)
   * Addresses transacting within a window with destination overlap.
   */
  private applyTemporalCoSpending(
    store: KontextStore,
    uf: UnionFind,
    evidence: ClusteringEvidence[],
    timestamp: string,
  ): void {
    const transactions = store.getTransactions();
    if (transactions.length < 2) return;

    // Group transactions by from address
    const txByFrom = new Map<string, Array<{ to: string; time: number }>>();
    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      if (!txByFrom.has(from)) {
        txByFrom.set(from, []);
      }
      txByFrom.get(from)!.push({
        to,
        time: new Date(tx.timestamp).getTime() / 1000,
      });
    }

    const fromAddresses = Array.from(txByFrom.keys());

    for (let i = 0; i < fromAddresses.length; i++) {
      for (let j = i + 1; j < fromAddresses.length; j++) {
        const addrA = fromAddresses[i]!;
        const addrB = fromAddresses[j]!;
        const txsA = txByFrom.get(addrA)!;
        const txsB = txByFrom.get(addrB)!;

        // Check temporal proximity
        let hasTemporalOverlap = false;
        for (const a of txsA) {
          for (const b of txsB) {
            if (Math.abs(a.time - b.time) <= this.config.temporalWindowSeconds) {
              hasTemporalOverlap = true;
              break;
            }
          }
          if (hasTemporalOverlap) break;
        }

        if (!hasTemporalOverlap) continue;

        // Check destination overlap
        const destsA = new Set(txsA.map((t) => t.to));
        const destsB = new Set(txsB.map((t) => t.to));
        const intersection = new Set([...destsA].filter((d) => destsB.has(d)));
        const union = new Set([...destsA, ...destsB]);

        const overlapRatio = union.size > 0 ? intersection.size / union.size : 0;

        if (overlapRatio >= this.config.minDestinationOverlap) {
          if (!uf.connected(addrA, addrB)) {
            uf.union(addrA, addrB);
            evidence.push({
              heuristic: 'temporal-co-spending',
              confidence: 0.6,
              addresses: [addrA, addrB],
              detectedAt: timestamp,
              detail: `Overlap ratio: ${overlapRatio.toFixed(2)}`,
            });
          }
        }
      }
    }
  }

  /**
   * Heuristic 5: Declared Wallets (confidence 1.0)
   * All wallets declared by the same identity are unioned.
   */
  private applyDeclaredWallets(
    registry: AgentIdentityRegistry,
    uf: UnionFind,
    evidence: ClusteringEvidence[],
    timestamp: string,
  ): void {
    const identities = registry.getAll();

    for (const identity of identities) {
      const addrs = identity.wallets.map((w) => w.address);
      for (let i = 1; i < addrs.length; i++) {
        if (!uf.connected(addrs[0]!, addrs[i]!)) {
          uf.union(addrs[0]!, addrs[i]!);
          evidence.push({
            heuristic: 'declared-wallets',
            confidence: 1.0,
            addresses: [addrs[0]!, addrs[i]!],
            detectedAt: timestamp,
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Cluster Building
  // --------------------------------------------------------------------------

  private buildClusters(
    uf: UnionFind,
    evidence: ClusteringEvidence[],
    store: KontextStore,
    registry: AgentIdentityRegistry | undefined,
    timestamp: string,
  ): WalletCluster[] {
    const components = uf.getComponents();
    const clusters: WalletCluster[] = [];

    // Build a map of address -> evidence
    const evidenceByAddress = new Map<string, ClusteringEvidence[]>();
    for (const e of evidence) {
      for (const addr of e.addresses) {
        if (!evidenceByAddress.has(addr)) {
          evidenceByAddress.set(addr, []);
        }
        evidenceByAddress.get(addr)!.push(e);
      }
    }

    // Build agent lookup from transactions
    const addressToAgents = new Map<string, Set<string>>();
    for (const tx of store.getTransactions()) {
      const from = tx.from.toLowerCase();
      if (!addressToAgents.has(from)) {
        addressToAgents.set(from, new Set());
      }
      addressToAgents.get(from)!.add(tx.agentId);
    }

    // Add declared wallet -> agent mappings
    if (registry) {
      for (const identity of registry.getAll()) {
        for (const wallet of identity.wallets) {
          if (!addressToAgents.has(wallet.address)) {
            addressToAgents.set(wallet.address, new Set());
          }
          addressToAgents.get(wallet.address)!.add(identity.agentId);
        }
      }
    }

    for (const component of components) {
      if (component.length < 2) continue; // skip singletons

      // Collect evidence for this cluster
      const clusterEvidence: ClusteringEvidence[] = [];
      const seen = new Set<string>();
      for (const addr of component) {
        const addrEvidence = evidenceByAddress.get(addr) ?? [];
        for (const e of addrEvidence) {
          const key = `${e.heuristic}:${e.addresses[0]}:${e.addresses[1]}`;
          if (!seen.has(key)) {
            seen.add(key);
            clusterEvidence.push(e);
          }
        }
      }

      // Collect agent IDs
      const agentIds = new Set<string>();
      for (const addr of component) {
        const agents = addressToAgents.get(addr);
        if (agents) {
          for (const a of agents) agentIds.add(a);
        }
      }

      const maxConfidence = clusterEvidence.length > 0
        ? Math.max(...clusterEvidence.map((e) => e.confidence))
        : 0;

      clusters.push({
        id: generateId(),
        addresses: component.sort(),
        agentIds: Array.from(agentIds).sort(),
        evidence: clusterEvidence,
        confidence: maxConfidence,
        createdAt: timestamp,
      });
    }

    return clusters;
  }
}
