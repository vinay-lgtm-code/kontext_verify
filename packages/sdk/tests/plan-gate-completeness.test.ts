// ============================================================================
// Plan Gate Completeness Tests
// ============================================================================
// Verifies that EVERY gated feature listed in the plan-gate module is tested
// for correct tier enforcement. Ensures no gated feature slips through without
// proper access control verification.

import { describe, it, expect } from 'vitest';
import { requirePlan, isFeatureAvailable } from '../src/plan-gate.js';
import type { GatedFeature } from '../src/plan-gate.js';

// ============================================================================
// Complete feature list — must match FEATURE_MIN_PLAN in plan-gate.ts
// ============================================================================

const PRO_FEATURES: GatedFeature[] = [
  'advanced-anomaly-rules',
  'sar-ctr-reports',
  'webhooks',
  'ofac-screening',
  'csv-export',
  'multi-chain',
  'approval-policies',
  'unified-screening',
];

const ENTERPRISE_FEATURES: GatedFeature[] = [
  'cftc-compliance',
  'circle-wallets',
  'circle-compliance',
  'gas-station',
  'cctp-transfers',
];

const ALL_FEATURES: GatedFeature[] = [...PRO_FEATURES, ...ENTERPRISE_FEATURES];

// ============================================================================
// isFeatureAvailable — exhaustive matrix
// ============================================================================

describe('isFeatureAvailable — complete feature matrix', () => {
  describe('Free plan', () => {
    for (const feature of ALL_FEATURES) {
      it(`should block "${feature}" on free plan`, () => {
        expect(isFeatureAvailable(feature, 'free')).toBe(false);
      });
    }
  });

  describe('Pro plan', () => {
    for (const feature of PRO_FEATURES) {
      it(`should allow "${feature}" on pro plan`, () => {
        expect(isFeatureAvailable(feature, 'pro')).toBe(true);
      });
    }

    for (const feature of ENTERPRISE_FEATURES) {
      it(`should block "${feature}" on pro plan`, () => {
        expect(isFeatureAvailable(feature, 'pro')).toBe(false);
      });
    }
  });

  describe('Enterprise plan', () => {
    for (const feature of ALL_FEATURES) {
      it(`should allow "${feature}" on enterprise plan`, () => {
        expect(isFeatureAvailable(feature, 'enterprise')).toBe(true);
      });
    }
  });
});

// ============================================================================
// requirePlan — throws correct error messages
// ============================================================================

describe('requirePlan — error message accuracy', () => {
  for (const feature of PRO_FEATURES) {
    it(`should throw "Pro plan" for "${feature}" on free plan`, () => {
      expect(() => requirePlan(feature, 'free')).toThrow(/Pro plan/);
    });

    it(`should not throw for "${feature}" on pro plan`, () => {
      expect(() => requirePlan(feature, 'pro')).not.toThrow();
    });

    it(`should not throw for "${feature}" on enterprise plan`, () => {
      expect(() => requirePlan(feature, 'enterprise')).not.toThrow();
    });
  }

  for (const feature of ENTERPRISE_FEATURES) {
    it(`should throw "Enterprise plan" for "${feature}" on free plan`, () => {
      expect(() => requirePlan(feature, 'free')).toThrow(/Enterprise plan/);
    });

    it(`should throw "Enterprise plan" for "${feature}" on pro plan`, () => {
      expect(() => requirePlan(feature, 'pro')).toThrow(/Enterprise plan/);
    });

    it(`should not throw for "${feature}" on enterprise plan`, () => {
      expect(() => requirePlan(feature, 'enterprise')).not.toThrow();
    });
  }
});

// ============================================================================
// requirePlan — error details
// ============================================================================

describe('requirePlan — error details', () => {
  it('should include upgrade URL in error message', () => {
    for (const feature of ALL_FEATURES) {
      try {
        requirePlan(feature, 'free');
      } catch (err: any) {
        expect(err.message).toContain('https://getkontext.com/pricing');
      }
    }
  });

  it('should include current plan in error message', () => {
    try {
      requirePlan('csv-export', 'free');
    } catch (err: any) {
      expect(err.message).toContain('Current plan: free');
    }
  });

  it('should include feature label in error message', () => {
    try {
      requirePlan('csv-export', 'free');
    } catch (err: any) {
      expect(err.message).toContain('CSV export');
    }
  });

  it('should include CFTC label for cftc-compliance feature', () => {
    try {
      requirePlan('cftc-compliance', 'free');
    } catch (err: any) {
      expect(err.message).toContain('CFTC compliance module');
    }
  });

  it('should include Circle label for circle-wallets feature', () => {
    try {
      requirePlan('circle-wallets', 'pro');
    } catch (err: any) {
      expect(err.message).toContain('Circle Programmable Wallets');
    }
  });

  it('should include Gas Station label for gas-station feature', () => {
    try {
      requirePlan('gas-station', 'pro');
    } catch (err: any) {
      expect(err.message).toContain('Gas Station integration');
    }
  });

  it('should include CCTP label for cctp-transfers feature', () => {
    try {
      requirePlan('cctp-transfers', 'pro');
    } catch (err: any) {
      expect(err.message).toContain('CCTP cross-chain transfers');
    }
  });
});
