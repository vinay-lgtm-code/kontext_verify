// ============================================================================
// Kontext SDK - KYA Confidence Scorer
// ============================================================================

import type {
  KYAConfidenceScore,
  KYAScoreComponent,
  KYAConfidenceLevel,
  KYAConfidenceScorerConfig,
} from './types.js';
import type { AgentIdentityRegistry } from './identity-registry.js';
import type { WalletClusterer } from './wallet-clustering.js';
import type { BehavioralFingerprinter } from './behavioral-fingerprint.js';
import type { CrossSessionLinker } from './cross-session-linker.js';
import type { KontextStore } from '../store.js';
import { now } from '../utils.js';

/**
 * Computes a composite KYA confidence score from 5 signal components.
 */
export class KYAConfidenceScorer {
  private readonly weights: {
    declaredIdentity: number;
    kycVerification: number;
    walletGraph: number;
    behavioralConsistency: number;
    externalEnrichment: number;
  };

  constructor(config: KYAConfidenceScorerConfig = {}) {
    this.weights = {
      declaredIdentity: config.declaredIdentityWeight ?? 0.20,
      kycVerification: config.kycVerificationWeight ?? 0.30,
      walletGraph: config.walletGraphWeight ?? 0.20,
      behavioralConsistency: config.behavioralConsistencyWeight ?? 0.20,
      externalEnrichment: config.externalEnrichmentWeight ?? 0.10,
    };
  }

  /**
   * Compute a composite confidence score for an agent.
   */
  computeScore(
    agentId: string,
    registry: AgentIdentityRegistry,
    clusterer: WalletClusterer,
    fingerprinter: BehavioralFingerprinter,
    linker: CrossSessionLinker,
    store: KontextStore,
  ): KYAConfidenceScore {
    const components: KYAScoreComponent[] = [];

    // Component 1: Declared Identity
    const declaredScore = this.scoreDeclaredIdentity(agentId, registry);
    components.push({
      name: 'Declared Identity',
      score: declaredScore.score,
      weight: this.weights.declaredIdentity,
      weightedScore: declaredScore.score * this.weights.declaredIdentity,
      detail: declaredScore.detail,
    });

    // Component 2: KYC Verification
    const kycScore = this.scoreKycVerification(agentId, registry);
    components.push({
      name: 'KYC Verification',
      score: kycScore.score,
      weight: this.weights.kycVerification,
      weightedScore: kycScore.score * this.weights.kycVerification,
      detail: kycScore.detail,
    });

    // Component 3: Wallet Graph
    const walletScore = this.scoreWalletGraph(agentId, clusterer);
    components.push({
      name: 'Wallet Graph',
      score: walletScore.score,
      weight: this.weights.walletGraph,
      weightedScore: walletScore.score * this.weights.walletGraph,
      detail: walletScore.detail,
    });

    // Component 4: Behavioral Consistency
    const behavioralScore = this.scoreBehavioralConsistency(
      agentId,
      fingerprinter,
      linker,
      store,
    );
    components.push({
      name: 'Behavioral Consistency',
      score: behavioralScore.score,
      weight: this.weights.behavioralConsistency,
      weightedScore: behavioralScore.score * this.weights.behavioralConsistency,
      detail: behavioralScore.detail,
    });

    // Component 5: External Enrichment
    const externalScore = this.scoreExternalEnrichment(agentId, registry);
    components.push({
      name: 'External Enrichment',
      score: externalScore.score,
      weight: this.weights.externalEnrichment,
      weightedScore: externalScore.score * this.weights.externalEnrichment,
      detail: externalScore.detail,
    });

    // Compute overall score (weighted average)
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const overallScore = totalWeight > 0
      ? Math.round(components.reduce((sum, c) => sum + c.weightedScore, 0) / totalWeight)
      : 0;

    return {
      agentId,
      score: overallScore,
      level: this.scoreToLevel(overallScore),
      components,
      computedAt: now(),
    };
  }

  // --------------------------------------------------------------------------
  // Component Scorers
  // --------------------------------------------------------------------------

  private scoreDeclaredIdentity(
    agentId: string,
    registry: AgentIdentityRegistry,
  ): { score: number; detail: string } {
    const identity = registry.get(agentId);
    if (!identity) return { score: 0, detail: 'No declared identity' };

    let score = 30; // Base: has identity
    const parts: string[] = ['identity registered'];

    if (identity.displayName) {
      score += 10;
      parts.push('displayName set');
    }

    if (identity.entityType !== 'unknown') {
      score += 10;
      parts.push(`entityType: ${identity.entityType}`);
    }

    if (identity.wallets.length > 0) {
      score += 20;
      parts.push(`${identity.wallets.length} wallet(s)`);
    }

    if (identity.contactUri) {
      score += 10;
      parts.push('contactUri set');
    }

    if (Object.keys(identity.metadata).length > 0) {
      score += 20;
      parts.push('metadata provided');
    }

    return { score: Math.min(100, score), detail: parts.join(', ') };
  }

  private scoreKycVerification(
    agentId: string,
    registry: AgentIdentityRegistry,
  ): { score: number; detail: string } {
    const identity = registry.get(agentId);
    if (!identity || identity.kycReferences.length === 0) {
      return { score: 0, detail: 'No KYC verification' };
    }

    const refs = identity.kycReferences;
    const hasRejected = refs.some((r) => r.status === 'rejected');
    const verifiedRefs = refs.filter((r) => r.status === 'verified');
    const pendingRefs = refs.filter((r) => r.status === 'pending');
    const currentTime = new Date().toISOString();
    const activeVerified = verifiedRefs.filter(
      (r) => r.expiresAt === null || r.expiresAt > currentTime,
    );

    if (hasRejected && verifiedRefs.length === 0) {
      return { score: 10, detail: 'KYC rejected, capped at 10' };
    }

    if (pendingRefs.length > 0 && verifiedRefs.length === 0) {
      return { score: 20, detail: 'KYC pending' };
    }

    if (verifiedRefs.length > 0) {
      let score = 90;
      const parts: string[] = [`${verifiedRefs.length} verified`];

      if (activeVerified.length > 0) {
        score = 100;
        parts.push('non-expired');
      }

      if (verifiedRefs.length > 1) {
        score = Math.min(100, score + 10);
        parts.push('multiple providers');
      }

      return { score, detail: parts.join(', ') };
    }

    return { score: 0, detail: 'No KYC verification' };
  }

  private scoreWalletGraph(
    agentId: string,
    clusterer: WalletClusterer,
  ): { score: number; detail: string } {
    const clusters = clusterer.getClusters();
    const agentClusters = clusters.filter((c) => c.agentIds.includes(agentId));

    if (agentClusters.length === 0) {
      return { score: 20, detail: 'No wallet cluster' };
    }

    const totalAddresses = new Set(
      agentClusters.flatMap((c) => c.addresses),
    ).size;

    if (totalAddresses === 1) {
      return { score: 40, detail: '1 address in cluster' };
    }

    // Check evidence diversity
    const heuristics = new Set(
      agentClusters.flatMap((c) => c.evidence.map((e) => e.heuristic)),
    );

    const hasDeclared = heuristics.has('declared-wallets');
    const hasAuto = heuristics.size > (hasDeclared ? 1 : 0);

    if (hasDeclared && hasAuto) {
      return {
        score: 85,
        detail: `${totalAddresses} addresses, declared + auto heuristics`,
      };
    }

    if (heuristics.size > 1) {
      return {
        score: 70,
        detail: `${totalAddresses} addresses, ${heuristics.size} heuristic types`,
      };
    }

    return {
      score: 50,
      detail: `${totalAddresses} addresses, single heuristic`,
    };
  }

  private scoreBehavioralConsistency(
    agentId: string,
    fingerprinter: BehavioralFingerprinter,
    linker: CrossSessionLinker,
    store: KontextStore,
  ): { score: number; detail: string } {
    const embedding = fingerprinter.computeEmbedding(agentId, store);
    if (!embedding) {
      return { score: 30, detail: 'Insufficient data for embedding' };
    }

    const links = linker.getLinksForAgent(agentId);
    const confirmedLinks = links.filter((l) => l.status === 'confirmed');

    if (confirmedLinks.length === 0 && links.length === 0) {
      return { score: 50, detail: 'Embedding computed, no links' };
    }

    // Find max behavioral similarity from confirmed links
    let maxSimilarity = 0;
    for (const link of confirmedLinks) {
      const behavioralSignal = link.signals.find(
        (s) => s.type === 'behavioral-similarity',
      );
      if (behavioralSignal && behavioralSignal.strength > maxSimilarity) {
        maxSimilarity = behavioralSignal.strength;
      }
    }

    if (maxSimilarity > 0.9) {
      return { score: 95, detail: `Confirmed link similarity: ${maxSimilarity.toFixed(2)}` };
    }

    if (maxSimilarity > 0.8) {
      return { score: 85, detail: `Confirmed link similarity: ${maxSimilarity.toFixed(2)}` };
    }

    if (confirmedLinks.length > 0) {
      return { score: 70, detail: `${confirmedLinks.length} confirmed link(s)` };
    }

    return { score: 50, detail: 'Embedding computed, no confirmed links' };
  }

  private scoreExternalEnrichment(
    agentId: string,
    registry: AgentIdentityRegistry,
  ): { score: number; detail: string } {
    const identity = registry.get(agentId);
    if (!identity) {
      return { score: 50, detail: 'Default (neutral), no identity' };
    }

    // Check KYC risk levels from provider references
    const riskLevels = identity.kycReferences
      .filter((r) => r.riskLevel)
      .map((r) => r.riskLevel!);

    if (riskLevels.length === 0) {
      return { score: 50, detail: 'Default (neutral), no risk data' };
    }

    if (riskLevels.includes('high')) {
      return { score: 20, detail: 'High risk from external provider' };
    }

    if (riskLevels.includes('low')) {
      return { score: 80, detail: 'Low risk from external provider' };
    }

    return { score: 50, detail: 'Medium risk from external provider' };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private scoreToLevel(score: number): KYAConfidenceLevel {
    if (score >= 85) return 'verified';
    if (score >= 65) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'unknown';
  }
}
