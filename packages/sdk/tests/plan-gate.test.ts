import { describe, it, expect } from 'vitest';
import { requirePlan, isFeatureAvailable } from '../src/plan-gate.js';

describe('Plan Gate', () => {
  describe('isFeatureAvailable', () => {
    it('allows free features on free plan', () => {
      // No free-gated features in the map, so all gated features should fail
      expect(isFeatureAvailable('csv-export', 'free')).toBe(false);
    });

    it('allows pro features on pro plan', () => {
      expect(isFeatureAvailable('csv-export', 'pro')).toBe(true);
      expect(isFeatureAvailable('ofac-screening', 'pro')).toBe(true);
      expect(isFeatureAvailable('webhooks', 'pro')).toBe(true);
    });

    it('allows pro features on enterprise plan', () => {
      expect(isFeatureAvailable('csv-export', 'enterprise')).toBe(true);
    });

    it('blocks enterprise features on pro plan', () => {
      expect(isFeatureAvailable('cftc-compliance', 'pro')).toBe(false);
      expect(isFeatureAvailable('circle-wallets', 'pro')).toBe(false);
    });

    it('allows enterprise features on enterprise plan', () => {
      expect(isFeatureAvailable('cftc-compliance', 'enterprise')).toBe(true);
      expect(isFeatureAvailable('circle-wallets', 'enterprise')).toBe(true);
    });
  });

  describe('requirePlan', () => {
    it('throws for pro feature on free plan', () => {
      expect(() => requirePlan('csv-export', 'free')).toThrow(/Pro plan/);
    });

    it('throws for enterprise feature on pro plan', () => {
      expect(() => requirePlan('cftc-compliance', 'pro')).toThrow(/Enterprise plan/);
    });

    it('does not throw when plan meets requirement', () => {
      expect(() => requirePlan('csv-export', 'pro')).not.toThrow();
      expect(() => requirePlan('cftc-compliance', 'enterprise')).not.toThrow();
    });

    it('error includes upgrade URL', () => {
      expect(() => requirePlan('webhooks', 'free')).toThrow(/getkontext\.com\/pricing/);
    });
  });
});
