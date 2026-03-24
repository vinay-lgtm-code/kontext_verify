// ============================================================================
// Kontext SDK - Plan Gating Utility
// ============================================================================

import { KontextError, KontextErrorCode } from './types.js';
import type { PlanTier } from './plans.js';

/** Features gated by plan tier */
export type GatedFeature =
  | 'advanced-anomaly-rules'
  | 'sar-ctr-reports'
  | 'webhooks'
  | 'ofac-screening'
  | 'csv-export'
  | 'multi-chain'
  | 'cftc-compliance'
  | 'circle-wallets'
  | 'circle-compliance'
  | 'gas-station'
  | 'cctp-transfers'
  | 'approval-policies'
  | 'unified-screening'
  | 'blocklist-manager'
  | 'kya-identity'
  | 'kya-behavioral'
  | 'coinbase-wallets'
  | 'metamask-wallets'
  | 'x402-payments';

const FEATURE_MIN_PLAN: Record<GatedFeature, PlanTier> = {
  'advanced-anomaly-rules': 'startup',
  'sar-ctr-reports': 'startup',
  'webhooks': 'startup',
  'ofac-screening': 'startup',
  'csv-export': 'startup',
  'multi-chain': 'startup',
  'cftc-compliance': 'enterprise',
  'circle-wallets': 'enterprise',
  'circle-compliance': 'enterprise',
  'gas-station': 'enterprise',
  'cctp-transfers': 'enterprise',
  'approval-policies': 'startup',
  'unified-screening': 'startup',
  'blocklist-manager': 'startup',
  'kya-identity': 'startup',
  'kya-behavioral': 'enterprise',
  'coinbase-wallets': 'enterprise',
  'metamask-wallets': 'enterprise',
  'x402-payments': 'startup',
};

const PLAN_RANK: Record<PlanTier, number> = { startup: 0, growth: 1, enterprise: 2 };

const FEATURE_LABELS: Record<GatedFeature, string> = {
  'advanced-anomaly-rules': 'Advanced anomaly detection rules',
  'sar-ctr-reports': 'SAR/CTR report generation',
  'webhooks': 'Webhook alerts',
  'ofac-screening': 'OFAC sanctions screening',
  'csv-export': 'CSV export',
  'multi-chain': 'Multi-chain support',
  'cftc-compliance': 'CFTC compliance module',
  'circle-wallets': 'Circle Programmable Wallets',
  'circle-compliance': 'Circle Compliance Engine',
  'gas-station': 'Gas Station integration',
  'cctp-transfers': 'CCTP cross-chain transfers',
  'approval-policies': 'Approval policies',
  'unified-screening': 'Unified screening (OFAC, Chainalysis, OpenSanctions)',
  'blocklist-manager': 'Custom blocklist/allowlist manager',
  'kya-identity': 'KYA identity resolution (declared identity, wallet clustering)',
  'kya-behavioral': 'KYA behavioral fingerprinting (cross-session linking, confidence scoring)',
  'coinbase-wallets': 'Coinbase Developer Platform Wallets',
  'metamask-wallets': 'MetaMask Embedded Wallets',
  'x402-payments': 'x402 payment protocol',
};

/**
 * Check if a feature is available on the given plan.
 * Returns true if allowed, false if not.
 */
export function isFeatureAvailable(feature: GatedFeature, currentPlan: PlanTier): boolean {
  const requiredPlan = FEATURE_MIN_PLAN[feature];
  return PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan];
}

/**
 * Require a minimum plan for a feature. Throws KontextError if not met.
 */
export function requirePlan(feature: GatedFeature, currentPlan: PlanTier): void {
  if (!isFeatureAvailable(feature, currentPlan)) {
    const requiredPlan = FEATURE_MIN_PLAN[feature];
    const label = FEATURE_LABELS[feature];
    throw new KontextError(
      KontextErrorCode.PLAN_REQUIRED,
      `${label} requires the ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan. Current plan: ${currentPlan}. Upgrade at https://getkontext.com/pricing`,
    );
  }
}
