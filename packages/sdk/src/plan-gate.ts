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
  | 'approval-policies';

const FEATURE_MIN_PLAN: Record<GatedFeature, PlanTier> = {
  'advanced-anomaly-rules': 'pro',
  'sar-ctr-reports': 'pro',
  'webhooks': 'pro',
  'ofac-screening': 'pro',
  'csv-export': 'pro',
  'multi-chain': 'pro',
  'cftc-compliance': 'enterprise',
  'circle-wallets': 'enterprise',
  'circle-compliance': 'enterprise',
  'gas-station': 'enterprise',
  'cctp-transfers': 'enterprise',
  'approval-policies': 'pro',
};

const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, enterprise: 2 };

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
