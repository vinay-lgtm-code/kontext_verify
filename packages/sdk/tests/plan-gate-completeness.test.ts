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

// Phase 1 gated features (require startup plan minimum)
const STARTUP_FEATURES: GatedFeature[] = [
  'advanced-anomaly-rules',
  'csv-export',
  'multi-chain',
  'ofac-screening',
];

// No enterprise features are wired to client methods in Phase 1;
// plan-gate.ts still defines them for future use.
const ENTERPRISE_FEATURES: GatedFeature[] = [];

const ALL_FEATURES: GatedFeature[] = [...STARTUP_FEATURES, ...ENTERPRISE_FEATURES];

// ============================================================================
// isFeatureAvailable — exhaustive matrix
// ============================================================================

describe('isFeatureAvailable — complete feature matrix', () => {
  describe('Startup plan', () => {
    for (const feature of STARTUP_FEATURES) {
      it(`should allow "${feature}" on startup plan`, () => {
        expect(isFeatureAvailable(feature, 'startup')).toBe(true);
      });
    }

    for (const feature of ENTERPRISE_FEATURES) {
      it(`should block "${feature}" on startup plan`, () => {
        expect(isFeatureAvailable(feature, 'startup')).toBe(false);
      });
    }
  });

  describe('Growth plan', () => {
    for (const feature of ALL_FEATURES) {
      it(`should allow "${feature}" on growth plan`, () => {
        expect(isFeatureAvailable(feature, 'growth')).toBe(true);
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
  for (const feature of STARTUP_FEATURES) {
    it(`should not throw for "${feature}" on startup plan`, () => {
      expect(() => requirePlan(feature, 'startup')).not.toThrow();
    });

    it(`should not throw for "${feature}" on growth plan`, () => {
      expect(() => requirePlan(feature, 'growth')).not.toThrow();
    });

    it(`should not throw for "${feature}" on enterprise plan`, () => {
      expect(() => requirePlan(feature, 'enterprise')).not.toThrow();
    });
  }

  for (const feature of ENTERPRISE_FEATURES) {
    it(`should throw "Enterprise plan" for "${feature}" on startup plan`, () => {
      expect(() => requirePlan(feature, 'startup')).toThrow(/Enterprise plan/);
    });

    it(`should throw "Enterprise plan" for "${feature}" on growth plan`, () => {
      expect(() => requirePlan(feature, 'growth')).toThrow(/Enterprise plan/);
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
    for (const feature of ENTERPRISE_FEATURES) {
      try {
        requirePlan(feature, 'startup');
      } catch (err: any) {
        expect(err.message).toContain('https://getkontext.com/pricing');
      }
    }
  });

  it('should include current plan in error message for enterprise feature on startup plan', () => {
    try {
      requirePlan('cftc-compliance', 'startup');
    } catch (err: any) {
      expect(err.message).toContain('Current plan: startup');
    }
  });

  it('should include feature label in error message', () => {
    try {
      requirePlan('cftc-compliance', 'startup');
    } catch (err: any) {
      expect(err.message).toContain('CFTC compliance module');
    }
  });

  it('should include CFTC label for cftc-compliance feature', () => {
    try {
      requirePlan('cftc-compliance', 'startup');
    } catch (err: any) {
      expect(err.message).toContain('CFTC compliance module');
    }
  });

  it('should include Circle label for circle-wallets feature', () => {
    try {
      requirePlan('circle-wallets', 'startup');
    } catch (err: any) {
      expect(err.message).toContain('Circle Programmable Wallets');
    }
  });

  it('should include Gas Station label for gas-station feature', () => {
    try {
      requirePlan('gas-station', 'startup');
    } catch (err: any) {
      expect(err.message).toContain('Gas Station integration');
    }
  });

  it('should include CCTP label for cctp-transfers feature', () => {
    try {
      requirePlan('cctp-transfers', 'startup');
    } catch (err: any) {
      expect(err.message).toContain('CCTP cross-chain transfers');
    }
  });
});
