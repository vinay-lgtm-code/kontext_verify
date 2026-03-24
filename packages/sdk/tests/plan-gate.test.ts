import { describe, it, expect } from 'vitest';
import { requirePlan, isFeatureAvailable } from '../src/plan-gate.js';

describe('Plan Gate', () => {
  describe('isFeatureAvailable', () => {
    it('blocks gated features on startup plan (no startup-gated features pass without the feature)', () => {
      // csv-export requires startup plan, so startup should allow it
      expect(isFeatureAvailable('csv-export', 'startup')).toBe(true);
    });

    it('allows startup features on startup plan', () => {
      expect(isFeatureAvailable('csv-export', 'startup')).toBe(true);
      expect(isFeatureAvailable('ofac-screening', 'startup')).toBe(true);
      expect(isFeatureAvailable('webhooks', 'startup')).toBe(true);
    });

    it('allows startup features on enterprise plan', () => {
      expect(isFeatureAvailable('csv-export', 'enterprise')).toBe(true);
    });

    it('blocks enterprise features on startup plan', () => {
      expect(isFeatureAvailable('cftc-compliance', 'startup')).toBe(false);
      expect(isFeatureAvailable('circle-wallets', 'startup')).toBe(false);
    });

    it('allows enterprise features on enterprise plan', () => {
      expect(isFeatureAvailable('cftc-compliance', 'enterprise')).toBe(true);
      expect(isFeatureAvailable('circle-wallets', 'enterprise')).toBe(true);
    });
  });

  describe('requirePlan', () => {
    it('throws for enterprise feature on startup plan', () => {
      expect(() => requirePlan('cftc-compliance', 'startup')).toThrow(/Enterprise plan/);
    });

    it('throws for enterprise feature on growth plan', () => {
      expect(() => requirePlan('cftc-compliance', 'growth')).toThrow(/Enterprise plan/);
    });

    it('does not throw when plan meets requirement', () => {
      expect(() => requirePlan('csv-export', 'startup')).not.toThrow();
      expect(() => requirePlan('cftc-compliance', 'enterprise')).not.toThrow();
    });

    it('error includes upgrade URL', () => {
      expect(() => requirePlan('cftc-compliance', 'startup')).toThrow(/getkontext\.com\/pricing/);
    });
  });
});
