// ============================================================================
// Stripe Integration Tests — Metered Billing ($2/1K events above 20K free)
// ============================================================================
// All Stripe API calls are mocked — no real API calls are made.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Set env vars BEFORE any imports so lazy readers pick them up
// ---------------------------------------------------------------------------

process.env['STRIPE_SECRET_KEY'] = 'sk_test_MOCK_REDACTED_000';
process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_MOCK_REDACTED_000';
process.env['STRIPE_PRO_PRICE_ID'] = 'price_MOCK_REDACTED_000';

// ---------------------------------------------------------------------------
// Mock Stripe before importing the module under test
// ---------------------------------------------------------------------------

const mockCheckoutSessionsCreate = vi.fn();
const mockBillingPortalSessionsCreate = vi.fn();
const mockCheckoutSessionsRetrieve = vi.fn();
const mockWebhooksConstructEvent = vi.fn();
const mockSubscriptionItemsCreateUsageRecord = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock('stripe', () => {
  // Must use a real function (not arrow) so `new Stripe(...)` works
  function StripeMock() {
    return {
      checkout: {
        sessions: {
          create: mockCheckoutSessionsCreate,
          retrieve: mockCheckoutSessionsRetrieve,
        },
      },
      billingPortal: {
        sessions: {
          create: mockBillingPortalSessionsCreate,
        },
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
      subscriptionItems: {
        createUsageRecord: mockSubscriptionItemsCreateUsageRecord,
      },
      subscriptions: {
        retrieve: mockSubscriptionsRetrieve,
      },
    };
  }
  return { default: StripeMock, __esModule: true };
});

// Import after mocks and env are set
import {
  createCheckoutSession,
  createPortalSession,
  getCheckoutSession,
  handleWebhookEvent,
  constructWebhookEvent,
  reportUsage,
  getSubscriptionItemId,
  PRO_PLAN_CONFIG,
  FREE_TIER_EVENTS,
  PRICE_PER_1K_EVENTS_CENTS,
} from '../src/stripe.js';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Stripe Integration — Metered Billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // PRO_PLAN_CONFIG — Metered billing
  // =========================================================================

  describe('PRO_PLAN_CONFIG', () => {
    it('should define the correct product name', () => {
      expect(PRO_PLAN_CONFIG.product.name).toBe('Kontext Pro');
    });

    it('should set metered price to $2/1K events (200 cents)', () => {
      expect(PRO_PLAN_CONFIG.price.unitAmount).toBe(200);
      expect(PRO_PLAN_CONFIG.price.currency).toBe('usd');
    });

    it('should be a monthly metered price', () => {
      expect(PRO_PLAN_CONFIG.price.interval).toBe('month');
      expect(PRO_PLAN_CONFIG.price.usageType).toBe('metered');
    });

    it('should have correct metadata', () => {
      expect(PRO_PLAN_CONFIG.metadata.tier).toBe('pro');
      expect(PRO_PLAN_CONFIG.metadata.billing_model).toBe('metered');
      expect(PRO_PLAN_CONFIG.metadata.free_tier_events).toBe('20000');
      expect(PRO_PLAN_CONFIG.metadata.price_per_1k).toBe('$2.00');
    });
  });

  describe('Constants', () => {
    it('should define free tier at 20K events', () => {
      expect(FREE_TIER_EVENTS).toBe(20_000);
    });

    it('should define price at $2/1K (200 cents)', () => {
      expect(PRICE_PER_1K_EVENTS_CENTS).toBe(200);
    });
  });

  // =========================================================================
  // createCheckoutSession — Metered subscription (no quantity)
  // =========================================================================

  describe('createCheckoutSession', () => {
    it('should create a metered checkout session without quantity', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      const result = await createCheckoutSession({
        customerEmail: 'dev@company.com',
        successUrl: 'https://getkontext.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://getkontext.com/checkout/cancel',
      });

      expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(result.sessionId).toBe('cs_test_123');

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledOnce();
      const callArgs = mockCheckoutSessionsCreate.mock.calls[0]![0];
      expect(callArgs.mode).toBe('subscription');
      expect(callArgs.customer_email).toBe('dev@company.com');
      // Metered pricing: no quantity in line_items
      expect(callArgs.line_items).toEqual([
        { price: 'price_MOCK_REDACTED_000' },
      ]);
      expect(callArgs.allow_promotion_codes).toBe(true);
      expect(callArgs.billing_address_collection).toBe('required');
      expect(callArgs.metadata.tier).toBe('pro');
      expect(callArgs.metadata.billing_model).toBe('metered');
    });

    it('should throw on invalid email', async () => {
      await expect(
        createCheckoutSession({
          customerEmail: 'not-an-email',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('A valid email address is required');
    });

    it('should throw on empty email', async () => {
      await expect(
        createCheckoutSession({
          customerEmail: '',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('A valid email address is required');
    });

    it('should throw when Stripe returns no URL', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_no_url',
        url: null,
      });

      await expect(
        createCheckoutSession({
          customerEmail: 'valid@email.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('Failed to create checkout session URL');
    });

    it('should include subscription_data metadata', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_789',
        url: 'https://checkout.stripe.com/pay/cs_test_789',
      });

      await createCheckoutSession({
        customerEmail: 'test@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const callArgs = mockCheckoutSessionsCreate.mock.calls[0]![0];
      expect(callArgs.subscription_data.metadata.tier).toBe('pro');
      expect(callArgs.subscription_data.metadata.billing_model).toBe('metered');
    });
  });

  // =========================================================================
  // reportUsage — Metered billing
  // =========================================================================

  describe('reportUsage', () => {
    it('should not report usage when under free tier', async () => {
      const result = await reportUsage('si_test_123', 15_000);

      expect(result.billableUnits).toBe(0);
      expect(result.reported).toBe(false);
      expect(mockSubscriptionItemsCreateUsageRecord).not.toHaveBeenCalled();
    });

    it('should not report usage at exactly 20K (free tier boundary)', async () => {
      const result = await reportUsage('si_test_123', 20_000);

      expect(result.billableUnits).toBe(0);
      expect(result.reported).toBe(false);
    });

    it('should report usage above free tier', async () => {
      mockSubscriptionItemsCreateUsageRecord.mockResolvedValue({});

      const result = await reportUsage('si_test_123', 25_000);

      expect(result.billableUnits).toBe(5); // 5K events above 20K = 5 units
      expect(result.reported).toBe(true);
      expect(mockSubscriptionItemsCreateUsageRecord).toHaveBeenCalledWith('si_test_123', {
        quantity: 5,
        timestamp: 'now',
        action: 'set',
      });
    });

    it('should round up partial thousands', async () => {
      mockSubscriptionItemsCreateUsageRecord.mockResolvedValue({});

      const result = await reportUsage('si_test_123', 20_500);

      expect(result.billableUnits).toBe(1); // 500 events rounds up to 1 unit ($2)
      expect(result.reported).toBe(true);
    });

    it('should handle large usage correctly', async () => {
      mockSubscriptionItemsCreateUsageRecord.mockResolvedValue({});

      const result = await reportUsage('si_test_123', 120_000);

      expect(result.billableUnits).toBe(100); // 100K above 20K = 100 units ($200)
      expect(result.reported).toBe(true);
    });
  });

  // =========================================================================
  // getSubscriptionItemId
  // =========================================================================

  describe('getSubscriptionItemId', () => {
    it('should return the first subscription item ID', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        items: { data: [{ id: 'si_abc123' }] },
      });

      const result = await getSubscriptionItemId('sub_test_123');

      expect(result).toBe('si_abc123');
      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test_123', {
        expand: ['items'],
      });
    });

    it('should return null when no items exist', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        items: { data: [] },
      });

      const result = await getSubscriptionItemId('sub_empty');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // createPortalSession
  // =========================================================================

  describe('createPortalSession', () => {
    it('should create a portal session', async () => {
      mockBillingPortalSessionsCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test_portal',
      });

      const result = await createPortalSession({
        customerId: 'cus_123',
        returnUrl: 'https://getkontext.com/pricing',
      });

      expect(result.url).toBe('https://billing.stripe.com/session/test_portal');
      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledOnce();
      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://getkontext.com/pricing',
      });
    });

    it('should throw on empty customerId', async () => {
      await expect(
        createPortalSession({
          customerId: '',
          returnUrl: 'https://getkontext.com/pricing',
        }),
      ).rejects.toThrow('Customer ID is required');
    });
  });

  // =========================================================================
  // getCheckoutSession
  // =========================================================================

  describe('getCheckoutSession', () => {
    it('should retrieve and return session details', async () => {
      mockCheckoutSessionsRetrieve.mockResolvedValue({
        status: 'complete',
        customer: 'cus_abc',
        subscription: 'sub_xyz',
        customer_email: 'user@example.com',
      });

      const result = await getCheckoutSession('cs_test_123');

      expect(result.status).toBe('complete');
      expect(result.customer).toBe('cus_abc');
      expect(result.subscription).toBe('sub_xyz');
      expect(result.customerEmail).toBe('user@example.com');

      expect(mockCheckoutSessionsRetrieve).toHaveBeenCalledWith('cs_test_123', {
        expand: ['subscription'],
      });
    });

    it('should handle object customer/subscription references', async () => {
      mockCheckoutSessionsRetrieve.mockResolvedValue({
        status: 'complete',
        customer: { id: 'cus_obj' },
        subscription: { id: 'sub_obj' },
        customer_email: null,
      });

      const result = await getCheckoutSession('cs_test_obj');

      expect(result.customer).toBe('cus_obj');
      expect(result.subscription).toBe('sub_obj');
      expect(result.customerEmail).toBeNull();
    });

    it('should throw on empty session ID', async () => {
      await expect(getCheckoutSession('')).rejects.toThrow('Session ID is required');
    });
  });

  // =========================================================================
  // Webhook - Signature Verification
  // =========================================================================

  describe('constructWebhookEvent', () => {
    it('should call stripe.webhooks.constructEvent with correct params', () => {
      const mockEvent = { id: 'evt_123', type: 'checkout.session.completed' };
      mockWebhooksConstructEvent.mockReturnValue(mockEvent);

      const result = constructWebhookEvent('raw_payload', 'sig_header');

      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        'raw_payload',
        'sig_header',
        'whsec_MOCK_REDACTED_000',
      );
      expect(result).toEqual(mockEvent);
    });

    it('should propagate Stripe signature verification errors', () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });

      expect(() => constructWebhookEvent('bad_payload', 'bad_sig')).toThrow(
        'Webhook signature verification failed',
      );
    });
  });

  // =========================================================================
  // Webhook - Event Handling
  // =========================================================================

  describe('handleWebhookEvent', () => {
    it('should handle checkout.session.completed and activate pro', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_pro_1',
            customer_email: 'new-pro@example.com',
            subscription: 'sub_new_1',
            metadata: { tier: 'pro', billing_model: 'metered' },
          },
        },
      });

      const result = await handleWebhookEvent('payload', 'sig');

      expect(result.type).toBe('checkout.session.completed');
      expect(result.handled).toBe(true);
      expect(result.data?.['action']).toBe('activate_pro');
      expect(result.data?.['customerId']).toBe('cus_pro_1');
      expect(result.data?.['customerEmail']).toBe('new-pro@example.com');
      expect(result.data?.['subscriptionId']).toBe('sub_new_1');
    });

    it('should handle customer.subscription.updated', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_updated_1',
            customer: 'cus_updated_1',
            status: 'active',
            current_period_end: 1700000000,
          },
        },
      });

      const result = await handleWebhookEvent('payload', 'sig');

      expect(result.type).toBe('customer.subscription.updated');
      expect(result.handled).toBe(true);
      expect(result.data?.['action']).toBe('update_subscription');
      expect(result.data?.['status']).toBe('active');
    });

    it('should handle customer.subscription.deleted and downgrade to free', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_cancelled_1',
            customer: 'cus_cancelled_1',
          },
        },
      });

      const result = await handleWebhookEvent('payload', 'sig');

      expect(result.type).toBe('customer.subscription.deleted');
      expect(result.handled).toBe(true);
      expect(result.data?.['action']).toBe('downgrade_to_free');
      expect(result.data?.['customerId']).toBe('cus_cancelled_1');
    });

    it('should handle invoice.payment_succeeded', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_success_1',
            customer: 'cus_paid_1',
            amount_paid: 1000, // $10 = 5K events above free tier
          },
        },
      });

      const result = await handleWebhookEvent('payload', 'sig');

      expect(result.type).toBe('invoice.payment_succeeded');
      expect(result.handled).toBe(true);
      expect(result.data?.['action']).toBe('payment_succeeded');
      expect(result.data?.['amountPaid']).toBe(1000);
    });

    it('should handle invoice.payment_failed', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_failed_1',
            customer: 'cus_failed_1',
            attempt_count: 2,
          },
        },
      });

      const result = await handleWebhookEvent('payload', 'sig');

      expect(result.type).toBe('invoice.payment_failed');
      expect(result.handled).toBe(true);
      expect(result.data?.['action']).toBe('payment_failed');
      expect(result.data?.['attemptCount']).toBe(2);
    });

    it('should return handled=false for unknown event types', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      });

      const result = await handleWebhookEvent('payload', 'sig');

      expect(result.type).toBe('some.unknown.event');
      expect(result.handled).toBe(false);
      expect(result.data).toBeUndefined();
    });

    it('should throw when signature verification fails', async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(handleWebhookEvent('bad', 'bad')).rejects.toThrow('Invalid signature');
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('Error handling', () => {
    it('should propagate Stripe API errors from checkout creation', async () => {
      mockCheckoutSessionsCreate.mockRejectedValue(
        new Error('Your card was declined'),
      );

      await expect(
        createCheckoutSession({
          customerEmail: 'user@test.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('Your card was declined');
    });

    it('should propagate Stripe API errors from portal creation', async () => {
      mockBillingPortalSessionsCreate.mockRejectedValue(
        new Error('No such customer: cus_invalid'),
      );

      await expect(
        createPortalSession({
          customerId: 'cus_invalid',
          returnUrl: 'https://example.com',
        }),
      ).rejects.toThrow('No such customer: cus_invalid');
    });

    it('should propagate Stripe API errors from session retrieval', async () => {
      mockCheckoutSessionsRetrieve.mockRejectedValue(
        new Error('No such checkout session'),
      );

      await expect(getCheckoutSession('cs_bad')).rejects.toThrow(
        'No such checkout session',
      );
    });

    it('should propagate Stripe API errors from usage reporting', async () => {
      mockSubscriptionItemsCreateUsageRecord.mockRejectedValue(
        new Error('No such subscription item'),
      );

      await expect(reportUsage('si_bad', 25_000)).rejects.toThrow(
        'No such subscription item',
      );
    });
  });
});
