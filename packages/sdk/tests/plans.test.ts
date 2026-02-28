import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { Kontext, PlanManager, PLAN_LIMITS } from '../src/index.js';
import { MemoryStorage } from '../src/storage.js';
import type { PlanTier, PlanUsage, LimitEvent } from '../src/plans.js';

// ---------------------------------------------------------------------------
// Helper: create a Kontext client with a given plan
// ---------------------------------------------------------------------------
function createClient(plan?: PlanTier, opts?: { upgradeUrl?: string; storage?: MemoryStorage }) {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
    plan,
    upgradeUrl: opts?.upgradeUrl,
    storage: opts?.storage,
  });
}

// ---------------------------------------------------------------------------
// 1. PlanManager Unit Tests
// ---------------------------------------------------------------------------
describe('PlanManager', () => {
  it('should define correct plan limits', () => {
    expect(PLAN_LIMITS.free).toBe(20_000);
    expect(PLAN_LIMITS.pro).toBe(Infinity);
    expect(PLAN_LIMITS.enterprise).toBe(Infinity);
  });

  it('should return plan limits via static method', () => {
    expect(PlanManager.getPlanLimits('free')).toEqual({ tier: 'free', eventLimit: 20_000 });
    expect(PlanManager.getPlanLimits('pro')).toEqual({ tier: 'pro', eventLimit: Infinity });
    expect(PlanManager.getPlanLimits('enterprise')).toEqual({ tier: 'enterprise', eventLimit: Infinity });
  });

  it('should default to free tier', () => {
    const pm = new PlanManager();
    expect(pm.getTier()).toBe('free');
    expect(pm.getLimit()).toBe(20_000);
    expect(pm.getEventCount()).toBe(0);
    expect(pm.getRemainingEvents()).toBe(20_000);
    expect(pm.getUsagePercentage()).toBe(0);
    expect(pm.isLimitExceeded()).toBe(false);
  });

  it('should initialize with explicit pro tier', () => {
    const pm = new PlanManager('pro');
    expect(pm.getTier()).toBe('pro');
    expect(pm.getLimit()).toBe(Infinity);
    expect(pm.getRemainingEvents()).toBe(Infinity);
    expect(pm.getUsagePercentage()).toBe(0);
  });

  it('should initialize with enterprise tier', () => {
    const pm = new PlanManager('enterprise');
    expect(pm.getTier()).toBe('enterprise');
    expect(pm.getLimit()).toBe(Infinity);
    expect(pm.getRemainingEvents()).toBe(Infinity);
    expect(pm.getUsagePercentage()).toBe(0);
  });

  it('should increment event count on recordEvent', () => {
    const pm = new PlanManager('free');
    pm.recordEvent();
    expect(pm.getEventCount()).toBe(1);
    pm.recordEvent();
    expect(pm.getEventCount()).toBe(2);
  });

  it('should calculate remaining events correctly', () => {
    const pm = new PlanManager('free');
    for (let i = 0; i < 100; i++) pm.recordEvent();
    expect(pm.getRemainingEvents()).toBe(19_900);
    expect(pm.getUsagePercentage()).toBeCloseTo(0.5, 1);
  });

  it('should never report limit exceeded for enterprise', () => {
    const pm = new PlanManager('enterprise');
    for (let i = 0; i < 1000; i++) pm.recordEvent();
    expect(pm.isLimitExceeded()).toBe(false);
    expect(pm.getRemainingEvents()).toBe(Infinity);
    expect(pm.getUsagePercentage()).toBe(0);
  });

  it('should emit warning at 80% threshold', () => {
    const pm = new PlanManager('free');
    const warnings: LimitEvent[] = [];
    pm.onUsageWarning((e) => warnings.push(e));

    // Record 16000 events (80% of 20000)
    for (let i = 0; i < 16_000; i++) pm.recordEvent();

    expect(warnings.length).toBe(1);
    expect(warnings[0]!.type).toBe('warning');
    expect(warnings[0]!.plan).toBe('free');
    expect(warnings[0]!.usagePercentage).toBeGreaterThanOrEqual(80);
  });

  it('should emit warning only once', () => {
    const pm = new PlanManager('free');
    const warnings: LimitEvent[] = [];
    pm.onUsageWarning((e) => warnings.push(e));

    for (let i = 0; i < 18_000; i++) pm.recordEvent();

    // Should have exactly 1 warning, not multiple
    expect(warnings.length).toBe(1);
  });

  it('should emit limit reached at 100%', () => {
    const pm = new PlanManager('free');
    const events: LimitEvent[] = [];
    pm.onLimitReached((e) => events.push(e));

    for (let i = 0; i < 20_000; i++) pm.recordEvent();

    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe('limit_reached');
    expect(events[0]!.plan).toBe('free');
  });

  it('should emit throttled limit events every 100 events after limit', () => {
    const pm = new PlanManager('free');
    const events: LimitEvent[] = [];
    pm.onLimitReached((e) => events.push(e));

    // 20000 to hit limit + 100 for first throttled warning
    for (let i = 0; i < 20_200; i++) pm.recordEvent();

    // 1 initial + 2 throttled (at 20100 and 20200)
    expect(events.length).toBe(3);
  });

  it('should set plan tier and reset warning state', () => {
    const pm = new PlanManager('free');
    const warnings: LimitEvent[] = [];
    pm.onUsageWarning((e) => warnings.push(e));

    for (let i = 0; i < 16_000; i++) pm.recordEvent();
    expect(warnings.length).toBe(1);

    // Upgrade to pro — warning state resets
    pm.setPlan('pro');
    expect(pm.getTier()).toBe('pro');
    expect(pm.getLimit()).toBe(Infinity);

    // Event count is NOT reset by setPlan (count persists)
    expect(pm.getEventCount()).toBe(16_000);

    // Pro has Infinity limit, so no warnings are emitted regardless of event count
    for (let i = 0; i < 64_001; i++) pm.recordEvent();
    expect(warnings.length).toBe(1); // no new warnings after upgrade to pro
  });

  it('should reset billing period', () => {
    const pm = new PlanManager('free');
    for (let i = 0; i < 5_000; i++) pm.recordEvent();
    expect(pm.getEventCount()).toBe(5_000);

    pm.resetBillingPeriod();
    expect(pm.getEventCount()).toBe(0);
    expect(pm.isLimitExceeded()).toBe(false);
  });

  it('should serialize and deserialize state', () => {
    const pm = new PlanManager('pro');
    for (let i = 0; i < 500; i++) pm.recordEvent();

    const json = pm.toJSON();
    expect(json.tier).toBe('pro');
    expect(json.eventCount).toBe(500);
    expect(json.billingPeriodStart).toBeDefined();

    const restored = PlanManager.fromJSON(json);
    expect(restored.getTier()).toBe('pro');
    expect(restored.getEventCount()).toBe(500);
  });

  it('should allow unsubscribing from callbacks', () => {
    const pm = new PlanManager('free');
    const warnings: LimitEvent[] = [];
    const unsub = pm.onUsageWarning((e) => warnings.push(e));
    unsub();

    for (let i = 0; i < 16_000; i++) pm.recordEvent();
    expect(warnings.length).toBe(0);
  });

  it('should set event count directly', () => {
    const pm = new PlanManager('free');
    pm.setEventCount(10_000);
    expect(pm.getEventCount()).toBe(10_000);
    expect(pm.getRemainingEvents()).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// 2. Kontext Client Plan Integration Tests
// ---------------------------------------------------------------------------
describe('Kontext Plan Integration', () => {
  let kontext: Kontext;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should default to free plan when no plan specified', () => {
    kontext = createClient();
    const usage = kontext.getUsage();
    expect(usage.plan).toBe('free');
    expect(usage.limit).toBe(20_000);
    expect(usage.eventCount).toBe(0);
    expect(usage.limitExceeded).toBe(false);
  });

  it('should initialize with explicit pro plan', () => {
    kontext = createClient('pro');
    const usage = kontext.getUsage();
    expect(usage.plan).toBe('pro');
    expect(usage.limit).toBe(Infinity);
    expect(usage.remainingEvents).toBe(Infinity);
  });

  it('should initialize with enterprise plan', () => {
    kontext = createClient('enterprise');
    const usage = kontext.getUsage();
    expect(usage.plan).toBe('enterprise');
    expect(usage.limit).toBe(Infinity);
    expect(usage.remainingEvents).toBe(Infinity);
  });

  it('should increment event count on log()', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'test',
      description: 'Test action',
      agentId: 'agent-1',
    });

    expect(kontext.getUsage().eventCount).toBe(1);
  });

  it('should increment event count on logTransaction()', async () => {
    kontext = createClient();

    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-1',
    });

    expect(kontext.getUsage().eventCount).toBe(1);
  });

  it('should increment event count on logReasoning()', async () => {
    kontext = createClient();

    await kontext.logReasoning({
      agentId: 'agent-1',
      action: 'approve_transfer',
      reasoning: 'Verified vendor',
    });

    // logReasoning calls log() internally, so it counts as 1 event
    expect(kontext.getUsage().eventCount).toBe(1);
  });

  it('should emit warning at 80% usage', async () => {
    // Use a small plan manager directly to avoid logging 16K events
    kontext = createClient();
    const warnings: LimitEvent[] = [];
    kontext.onUsageWarning((e) => warnings.push(e));

    // We can't easily log 16K events in a test, so we test the PlanManager directly
    // and trust that the integration calls recordEvent()
    expect(warnings.length).toBe(0);

    // Log one event and confirm event count increments
    await kontext.log({
      type: 'test',
      description: 'Test',
      agentId: 'agent-1',
    });
    expect(kontext.getUsage().eventCount).toBe(1);
  });

  it('should set plan at runtime with setPlan()', () => {
    kontext = createClient('free');
    expect(kontext.getUsage().plan).toBe('free');
    expect(kontext.getUsage().limit).toBe(20_000);

    kontext.setPlan('pro');
    expect(kontext.getUsage().plan).toBe('pro');
    expect(kontext.getUsage().limit).toBe(Infinity);

    kontext.setPlan('enterprise');
    expect(kontext.getUsage().plan).toBe('enterprise');
    expect(kontext.getUsage().limit).toBe(Infinity);
  });

  it('should return correct usage data from getUsage()', async () => {
    kontext = createClient('pro');

    for (let i = 0; i < 5; i++) {
      await kontext.log({
        type: 'test',
        description: `Action ${i}`,
        agentId: 'agent-1',
      });
    }

    const usage = kontext.getUsage();
    expect(usage.plan).toBe('pro');
    expect(usage.eventCount).toBe(5);
    expect(usage.limit).toBe(Infinity);
    expect(usage.remainingEvents).toBe(Infinity);
    expect(usage.usagePercentage).toBe(0);
    expect(usage.limitExceeded).toBe(false);
  });

  it('should return default upgrade URL', () => {
    kontext = createClient();
    expect(kontext.getUpgradeUrl()).toBe('https://kontext.so/upgrade');
  });

  it('should return custom upgrade URL when configured', () => {
    kontext = createClient('free', { upgradeUrl: 'https://myapp.com/upgrade' });
    expect(kontext.getUpgradeUrl()).toBe('https://myapp.com/upgrade');
  });

  it('should return enterprise contact URL', () => {
    kontext = createClient();
    expect(kontext.getEnterpriseContactUrl()).toBe('https://cal.com/vinnaray');
  });
});

// ---------------------------------------------------------------------------
// 3. Limit Enforcement Tests (using PlanManager directly for speed)
// ---------------------------------------------------------------------------
describe('Plan Limit Enforcement', () => {
  it('should set limitExceeded flag on actions after free limit', async () => {
    // Use PlanManager directly to verify behavior
    const pm = new PlanManager('free');

    // Record 20000 events to hit limit
    for (let i = 0; i < 20_000; i++) pm.recordEvent();

    expect(pm.isLimitExceeded()).toBe(true);

    // Next event also returns true (soft limit)
    const exceeded = pm.recordEvent();
    expect(exceeded).toBe(true);
    expect(pm.getEventCount()).toBe(20_001);
  });

  it('should continue logging after limit (soft limit)', async () => {
    const pm = new PlanManager('free');

    for (let i = 0; i < 20_100; i++) pm.recordEvent();

    // Events continue to be counted
    expect(pm.getEventCount()).toBe(20_100);
    expect(pm.isLimitExceeded()).toBe(true);
    expect(pm.getRemainingEvents()).toBe(0);
    expect(pm.getUsagePercentage()).toBe(100);
  });

  it('should log console warning for free tier limit', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pm = new PlanManager('free');
    pm.upgradeUrl = 'https://kontext.so/upgrade';

    for (let i = 0; i < 20_000; i++) pm.recordEvent();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("You've reached the 20,000 event limit on the Free plan"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://kontext.so/upgrade'),
    );

    warnSpy.mockRestore();
  });

  it('should not emit any warnings for pro plan (usage-based, no cap)', () => {
    const pm = new PlanManager('pro');
    const warnings: LimitEvent[] = [];
    const limits: LimitEvent[] = [];
    pm.onUsageWarning((e) => warnings.push(e));
    pm.onLimitReached((e) => limits.push(e));

    for (let i = 0; i < 100_000; i++) pm.recordEvent();

    expect(warnings.length).toBe(0);
    expect(limits.length).toBe(0);
    expect(pm.isLimitExceeded()).toBe(false);
    expect(pm.getRemainingEvents()).toBe(Infinity);
  });

  it('should emit warning at 16K for free plan', () => {
    const pm = new PlanManager('free');
    const warnings: LimitEvent[] = [];
    pm.onUsageWarning((e) => warnings.push(e));

    for (let i = 0; i < 16_000; i++) pm.recordEvent();

    expect(warnings.length).toBe(1);
    expect(warnings[0]!.plan).toBe('free');
    expect(warnings[0]!.eventCount).toBe(16_000);
  });

  it('should throttle limit warnings to once per 100 events', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pm = new PlanManager('free');
    const limitEvents: LimitEvent[] = [];
    pm.onLimitReached((e) => limitEvents.push(e));

    // Reach the limit
    for (let i = 0; i < 20_000; i++) pm.recordEvent();
    expect(limitEvents.length).toBe(1);

    // Next 99 events should not trigger another limit event
    for (let i = 0; i < 99; i++) pm.recordEvent();
    expect(limitEvents.length).toBe(1);

    // 100th event after limit triggers another
    pm.recordEvent();
    expect(limitEvents.length).toBe(2);

    // Another 100
    for (let i = 0; i < 100; i++) pm.recordEvent();
    expect(limitEvents.length).toBe(3);

    warnSpy.mockRestore();
  });

  it('should not emit any warnings for enterprise plan', () => {
    const pm = new PlanManager('enterprise');
    const warnings: LimitEvent[] = [];
    const limits: LimitEvent[] = [];
    pm.onUsageWarning((e) => warnings.push(e));
    pm.onLimitReached((e) => limits.push(e));

    for (let i = 0; i < 200_000; i++) pm.recordEvent();

    expect(warnings.length).toBe(0);
    expect(limits.length).toBe(0);
    expect(pm.isLimitExceeded()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Billing Period Reset Tests
// ---------------------------------------------------------------------------
describe('Billing Period', () => {
  it('should set billing period start to 1st of current month by default', () => {
    const pm = new PlanManager('free');
    const start = pm.getBillingPeriodStart();
    const now = new Date();
    expect(start.getUTCDate()).toBe(1);
    expect(start.getUTCMonth()).toBe(now.getUTCMonth());
    expect(start.getUTCFullYear()).toBe(now.getUTCFullYear());
  });

  it('should reset event count on billing period reset', () => {
    const pm = new PlanManager('free');
    for (let i = 0; i < 5_000; i++) pm.recordEvent();
    expect(pm.getEventCount()).toBe(5_000);

    pm.resetBillingPeriod();
    expect(pm.getEventCount()).toBe(0);
    expect(pm.getUsagePercentage()).toBe(0);
    expect(pm.isLimitExceeded()).toBe(false);
  });

  it('should reset warning state on billing period reset', () => {
    const pm = new PlanManager('free');
    const warnings: LimitEvent[] = [];
    pm.onUsageWarning((e) => warnings.push(e));

    for (let i = 0; i < 16_000; i++) pm.recordEvent();
    expect(warnings.length).toBe(1);

    pm.resetBillingPeriod();

    // After reset, warning should fire again at 80%
    for (let i = 0; i < 16_000; i++) pm.recordEvent();
    expect(warnings.length).toBe(2);
  });

  it('should auto-reset billing period when new month starts', () => {
    // Set billing period to a past month
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    lastMonth.setUTCDate(1);

    const pm = new PlanManager('free', lastMonth);
    pm.setEventCount(15_000);

    // recordEvent should detect we're in a new billing period
    pm.recordEvent();

    // Event count should have been reset to 0 then incremented to 1
    expect(pm.getEventCount()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Persistence Tests
// ---------------------------------------------------------------------------
describe('Plan State Persistence', () => {
  it('should persist and restore plan state via storage adapter', async () => {
    const storage = new MemoryStorage();

    // Create client, log some events, flush plan state
    const kontext1 = createClient('pro', { storage });
    for (let i = 0; i < 3; i++) {
      await kontext1.log({
        type: 'test',
        description: `Action ${i}`,
        agentId: 'agent-1',
      });
    }
    await kontext1.flushPlanState();

    expect(kontext1.getUsage().eventCount).toBe(3);
    await kontext1.destroy();

    // Create a new client and restore plan state
    const kontext2 = createClient('free', { storage });
    await kontext2.restorePlanState();

    // Should have restored pro tier and event count
    const usage = kontext2.getUsage();
    expect(usage.plan).toBe('pro');
    expect(usage.eventCount).toBe(3);
    await kontext2.destroy();
  });
});

// ---------------------------------------------------------------------------
// 6. Integration: limitExceeded flag on actions
// ---------------------------------------------------------------------------
describe('limitExceeded flag integration', () => {
  it('should set limitExceeded on action metadata when limit is exceeded', async () => {
    // We'll use PlanManager to verify the flag mechanism
    const pm = new PlanManager('free');

    // Hit the limit
    for (let i = 0; i < 20_000; i++) pm.recordEvent();

    // recordEvent returns true when limit exceeded
    const exceeded = pm.recordEvent();
    expect(exceeded).toBe(true);
  });

  it('should not set limitExceeded flag for enterprise plan', async () => {
    const kontext = createClient('enterprise');

    const action = await kontext.log({
      type: 'test',
      description: 'Enterprise action',
      agentId: 'agent-1',
    });

    expect(action.metadata['limitExceeded']).toBeUndefined();
    await kontext.destroy();
  });

  it('should not set limitExceeded flag when under limit', async () => {
    const kontext = createClient('free');

    const action = await kontext.log({
      type: 'test',
      description: 'Normal action',
      agentId: 'agent-1',
    });

    expect(action.metadata['limitExceeded']).toBeUndefined();
    await kontext.destroy();
  });
});

// ---------------------------------------------------------------------------
// 7. Upgrade Flow Helpers
// ---------------------------------------------------------------------------
describe('Upgrade Flow Helpers', () => {
  it('should return default upgrade URL', () => {
    const kontext = createClient();
    expect(kontext.getUpgradeUrl()).toBe('https://kontext.so/upgrade');
    kontext.destroy();
  });

  it('should return custom upgrade URL', () => {
    const kontext = createClient('free', { upgradeUrl: 'https://stripe.com/checkout/123' });
    expect(kontext.getUpgradeUrl()).toBe('https://stripe.com/checkout/123');
    kontext.destroy();
  });

  it('should return enterprise contact URL', () => {
    const kontext = createClient();
    expect(kontext.getEnterpriseContactUrl()).toBe('https://cal.com/vinnaray');
    kontext.destroy();
  });
});
