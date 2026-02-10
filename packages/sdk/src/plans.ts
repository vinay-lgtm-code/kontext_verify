// ============================================================================
// Kontext SDK - Plan/Tier System & Event Metering
// ============================================================================

/** Pricing tier identifiers */
export type PlanTier = 'free' | 'pro' | 'enterprise';

/** Configuration for a pricing plan */
export interface PlanConfig {
  /** Tier identifier */
  tier: PlanTier;
  /** Maximum events allowed per billing period */
  eventLimit: number;
  /** Warning threshold as a fraction (0-1), default 0.8 */
  warningThreshold: number;
}

/** Current usage statistics for a plan */
export interface PlanUsage {
  /** Current plan tier */
  plan: PlanTier;
  /** Number of seats (users) on the plan */
  seats: number;
  /** Number of events logged in the current billing period */
  eventCount: number;
  /** Maximum events allowed (Pro: seats x 100K) */
  limit: number;
  /** Remaining events before limit */
  remainingEvents: number;
  /** Usage as a percentage (0-100) */
  usagePercentage: number;
  /** Whether the event limit has been exceeded */
  limitExceeded: boolean;
}

/** Event emitted when a usage threshold is reached */
export interface LimitEvent {
  /** Type of limit event */
  type: 'warning' | 'limit_reached';
  /** Current plan tier */
  plan: PlanTier;
  /** Current event count */
  eventCount: number;
  /** Event limit for the plan */
  limit: number;
  /** Usage percentage */
  usagePercentage: number;
  /** ISO timestamp of the event */
  timestamp: string;
  /** Human-readable message */
  message: string;
}

/** Base plan definitions with their event limits (per seat for Pro) */
export const PLAN_LIMITS: Record<PlanTier, number> = {
  free: 20_000,
  pro: 100_000, // per user/seat
  enterprise: Infinity,
};

/** Default warning threshold (80%) */
const DEFAULT_WARNING_THRESHOLD = 0.8;

/** Number of events between throttled warning messages after limit exceeded */
const THROTTLE_INTERVAL = 100;

/**
 * PlanManager handles event metering and plan limit enforcement.
 *
 * Tracks event counts per billing period and emits warnings/limit events
 * when thresholds are reached. Does NOT hard-block events after the limit --
 * instead it sets a `limitExceeded` flag and emits throttled warnings.
 */
export class PlanManager {
  private tier: PlanTier;
  private seats: number;
  private eventCount: number;
  private billingPeriodStart: Date;
  private warningThreshold: number;

  private warningEmitted: boolean = false;
  private limitEmitted: boolean = false;
  private eventsSinceLimitWarning: number = 0;

  private usageWarningCallbacks: Array<(event: LimitEvent) => void> = [];
  private limitReachedCallbacks: Array<(event: LimitEvent) => void> = [];

  /** Custom upgrade URL, configurable via init */
  upgradeUrl: string = 'https://kontext.so/upgrade';
  /** Enterprise contact URL */
  enterpriseContactUrl: string = 'https://cal.com/vinnaray';

  constructor(tier: PlanTier = 'free', billingPeriodStart?: Date, seats: number = 1) {
    this.tier = tier;
    this.seats = Math.max(1, Math.floor(seats));
    this.eventCount = 0;
    this.warningThreshold = DEFAULT_WARNING_THRESHOLD;
    this.billingPeriodStart = billingPeriodStart ?? PlanManager.defaultBillingPeriodStart();
  }

  /**
   * Returns the 1st of the current month at midnight UTC.
   */
  static defaultBillingPeriodStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  // --------------------------------------------------------------------------
  // Plan Info
  // --------------------------------------------------------------------------

  /** Get limits for a specific tier */
  static getPlanLimits(tier: PlanTier): { tier: PlanTier; eventLimit: number } {
    return { tier, eventLimit: PLAN_LIMITS[tier] };
  }

  /** Get the current plan tier */
  getTier(): PlanTier {
    return this.tier;
  }

  /** Get the event limit for the current plan (Pro is multiplied by seats) */
  getLimit(): number {
    const base = PLAN_LIMITS[this.tier];
    if (base === Infinity) return Infinity;
    // Pro plan: 100K events per user/seat
    if (this.tier === 'pro') return base * this.seats;
    return base;
  }

  /** Get the current number of seats */
  getSeats(): number {
    return this.seats;
  }

  /** Update the number of seats (e.g., after Stripe subscription update) */
  setSeats(seats: number): void {
    this.seats = Math.max(1, Math.floor(seats));
    // Reset warning state since effective limits changed
    this.warningEmitted = false;
    this.limitEmitted = false;
    this.eventsSinceLimitWarning = 0;
  }

  /** Get the current event count */
  getEventCount(): number {
    return this.eventCount;
  }

  /** Get the number of remaining events before the limit */
  getRemainingEvents(): number {
    const limit = this.getLimit();
    if (limit === Infinity) return Infinity;
    return Math.max(0, limit - this.eventCount);
  }

  /** Get the current usage as a percentage (0-100) */
  getUsagePercentage(): number {
    const limit = this.getLimit();
    if (limit === Infinity) return 0;
    return Math.min(100, (this.eventCount / limit) * 100);
  }

  /** Whether the event limit has been exceeded */
  isLimitExceeded(): boolean {
    const limit = this.getLimit();
    if (limit === Infinity) return false;
    return this.eventCount >= limit;
  }

  /** Get full usage object */
  getUsage(): PlanUsage {
    return {
      plan: this.tier,
      seats: this.seats,
      eventCount: this.eventCount,
      limit: this.getLimit(),
      remainingEvents: this.getRemainingEvents(),
      usagePercentage: this.getUsagePercentage(),
      limitExceeded: this.isLimitExceeded(),
    };
  }

  /** Get the billing period start date */
  getBillingPeriodStart(): Date {
    return new Date(this.billingPeriodStart.getTime());
  }

  // --------------------------------------------------------------------------
  // Plan Management
  // --------------------------------------------------------------------------

  /**
   * Change the plan tier at runtime (e.g., after Stripe checkout succeeds).
   * This resets limit-related warning state since the new tier has different limits.
   */
  setPlan(tier: PlanTier): void {
    this.tier = tier;
    // Reset warning state since limits changed
    this.warningEmitted = false;
    this.limitEmitted = false;
    this.eventsSinceLimitWarning = 0;
  }

  /**
   * Reset the event count for a new billing period.
   * Updates the billing period start to the given date or 1st of current month.
   */
  resetBillingPeriod(newStart?: Date): void {
    this.eventCount = 0;
    this.billingPeriodStart = newStart ?? PlanManager.defaultBillingPeriodStart();
    this.warningEmitted = false;
    this.limitEmitted = false;
    this.eventsSinceLimitWarning = 0;
  }

  /**
   * Check if the billing period should be reset (i.e., current date is past
   * the start of the next billing period). If so, auto-reset.
   */
  checkBillingPeriodReset(): boolean {
    const now = new Date();
    const nextPeriodStart = new Date(
      Date.UTC(
        this.billingPeriodStart.getUTCFullYear(),
        this.billingPeriodStart.getUTCMonth() + 1,
        1,
      ),
    );

    if (now >= nextPeriodStart) {
      this.resetBillingPeriod(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      );
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Event Tracking
  // --------------------------------------------------------------------------

  /**
   * Record an event and check thresholds.
   * Returns true if the event limit has been exceeded (soft limit).
   */
  recordEvent(): boolean {
    // Check if billing period needs reset
    this.checkBillingPeriodReset();

    this.eventCount++;

    const limit = this.getLimit();

    // Enterprise has no limits
    if (limit === Infinity) return false;

    const usagePercentage = this.getUsagePercentage();

    // Check 80% warning threshold
    if (
      !this.warningEmitted &&
      usagePercentage >= this.warningThreshold * 100
    ) {
      this.warningEmitted = true;
      const event = this.createLimitEvent('warning');
      for (const cb of this.usageWarningCallbacks) {
        cb(event);
      }
    }

    // Check 100% limit threshold
    if (this.eventCount >= limit) {
      if (!this.limitEmitted) {
        this.limitEmitted = true;
        this.eventsSinceLimitWarning = 0;
        const event = this.createLimitEvent('limit_reached');
        for (const cb of this.limitReachedCallbacks) {
          cb(event);
        }
        this.logLimitMessage();
      } else {
        // Throttled warning: emit once per THROTTLE_INTERVAL events after limit
        this.eventsSinceLimitWarning++;
        if (this.eventsSinceLimitWarning >= THROTTLE_INTERVAL) {
          this.eventsSinceLimitWarning = 0;
          const event = this.createLimitEvent('limit_reached');
          for (const cb of this.limitReachedCallbacks) {
            cb(event);
          }
          this.logLimitMessage();
        }
      }

      return true;
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // Callbacks
  // --------------------------------------------------------------------------

  /**
   * Register a callback for the 80% usage warning.
   * @returns Unsubscribe function
   */
  onUsageWarning(callback: (event: LimitEvent) => void): () => void {
    this.usageWarningCallbacks.push(callback);
    return () => {
      const idx = this.usageWarningCallbacks.indexOf(callback);
      if (idx >= 0) this.usageWarningCallbacks.splice(idx, 1);
    };
  }

  /**
   * Register a callback for the limit reached event.
   * @returns Unsubscribe function
   */
  onLimitReached(callback: (event: LimitEvent) => void): () => void {
    this.limitReachedCallbacks.push(callback);
    return () => {
      const idx = this.limitReachedCallbacks.indexOf(callback);
      if (idx >= 0) this.limitReachedCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  /** Serialize state for storage */
  toJSON(): {
    tier: PlanTier;
    seats: number;
    eventCount: number;
    billingPeriodStart: string;
  } {
    return {
      tier: this.tier,
      seats: this.seats,
      eventCount: this.eventCount,
      billingPeriodStart: this.billingPeriodStart.toISOString(),
    };
  }

  /** Restore state from storage */
  static fromJSON(data: {
    tier: PlanTier;
    seats?: number;
    eventCount: number;
    billingPeriodStart: string;
  }): PlanManager {
    const manager = new PlanManager(data.tier, new Date(data.billingPeriodStart), data.seats ?? 1);
    manager.eventCount = data.eventCount;
    return manager;
  }

  /** Set the event count directly (for restoring from storage) */
  setEventCount(count: number): void {
    this.eventCount = count;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private createLimitEvent(type: 'warning' | 'limit_reached'): LimitEvent {
    const message =
      type === 'warning'
        ? `You've used ${this.getUsagePercentage().toFixed(0)}% of your ${this.tier} plan event limit (${this.eventCount}/${this.getLimit()}).`
        : `You've reached the ${this.getLimit().toLocaleString()} event limit on the ${this.tier === 'free' ? 'Free' : 'Pro'} plan.`;

    return {
      type,
      plan: this.tier,
      eventCount: this.eventCount,
      limit: this.getLimit(),
      usagePercentage: this.getUsagePercentage(),
      timestamp: new Date().toISOString(),
      message,
    };
  }

  private logLimitMessage(): void {
    if (this.tier === 'free') {
      console.warn(
        `You've reached the 20,000 event limit on the Free plan. Upgrade to Pro for 100K events/user/mo and full compliance features → ${this.upgradeUrl}`,
      );
    } else if (this.tier === 'pro') {
      const effectiveLimit = (100_000 * this.seats).toLocaleString();
      console.warn(
        `You've reached the ${effectiveLimit} event limit on Pro (${this.seats} seat${this.seats !== 1 ? 's' : ''}). Add seats or contact us for Enterprise pricing → ${this.enterpriseContactUrl}`,
      );
    }
  }
}
