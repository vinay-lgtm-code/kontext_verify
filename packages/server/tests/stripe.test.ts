// ============================================================================
// Stripe Integration Tests
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

vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
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
  }));
  return { default: StripeMock, __esModule: true };
});

// Import after mocks and env are set
import {
  createCheckoutSession,
  createPortalSession,
  getCheckoutSession,
  handleWebhookEvent,
  constructWebhookEvent,
  PRO_PLAN_CONFIG,
} from '../src/stripe.js';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // PRO_PLAN_CONFIG
  // =========================================================================

  describe('PRO_PLAN_CONFIG', () => {
    it('should define the correct product name', () => {
      expect(PRO_PLAN_CONFIG.product.name).toBe('Kontext Pro');
    });

    it('should set price to $199 (19900 cents)', () => {
      expect(PRO_PLAN_CONFIG.price.amount).toBe(19900);
      expect(PRO_PLAN_CONFIG.price.currency).toBe('usd');
    });

    it('should be a monthly recurring price', () => {
      expect(PRO_PLAN_CONFIG.price.interval).toBe('month');
    });

    it('should be per-seat', () => {
      expect(PRO_PLAN_CONFIG.price.perSeat).toBe(true);
    });

    it('should have pro tier metadata with 100K events limit', () => {
      expect(PRO_PLAN_CONFIG.metadata.tier).toBe('pro');
      expect(PRO_PLAN_CONFIG.metadata.events_limit).toBe('100000');
    });
  });

  // =========================================================================
  // createCheckoutSession
  // =========================================================================

  describe('createCheckoutSession', () => {
    it('should create a checkout session with correct parameters', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      const result = await createCheckoutSession({
        customerEmail: 'dev@company.com',
        seats: 2,
        successUrl: 'https://app.kontext.dev/checkout/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://app.kontext.dev/checkout/cancel',
      });

      expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(result.sessionId).toBe('cs_test_123');

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledOnce();
      const callArgs = mockCheckoutSessionsCreate.mock.calls[0]![0];
      expect(callArgs.mode).toBe('subscription');
      expect(callArgs.customer_email).toBe('dev@company.com');
      expect(callArgs.line_items).toEqual([
        { price: 'price_MOCK_REDACTED_000', quantity: 2 },
      ]);
      expect(callArgs.allow_promotion_codes).toBe(true);
      expect(callArgs.billing_address_collection).toBe('required');
      expect(callArgs.metadata.tier).toBe('pro');
      expect(callArgs.metadata.events_limit).toBe('100000');
      expect(callArgs.metadata.seats).toBe('2');
    });

    it('should default to 1 seat', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/pay/cs_test_456',
      });

      await createCheckoutSession({
        customerEmail: 'solo@dev.com',
        successUrl: 'https://app.kontext.dev/success',
        cancelUrl: 'https://app.kontext.dev/cancel',
      });

      const callArgs = mockCheckoutSessionsCreate.mock.calls[0]![0];
      expect(callArgs.line_items[0].quantity).toBe(1);
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
        seats: 5,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const callArgs = mockCheckoutSessionsCreate.mock.calls[0]![0];
      expect(callArgs.subscription_data.metadata.tier).toBe('pro');
      expect(callArgs.subscription_data.metadata.seats).toBe('5');
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
        returnUrl: 'https://app.kontext.dev/pricing',
      });

      expect(result.url).toBe('https://billing.stripe.com/session/test_portal');
      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledOnce();
      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.kontext.dev/pricing',
      });
    });

    it('should throw on empty customerId', async () => {
      await expect(
        createPortalSession({
          customerId: '',
          returnUrl: 'https://app.kontext.dev/pricing',
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
            metadata: { tier: 'pro', events_limit: '100000', seats: '1' },
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
            amount_paid: 19900,
          },
        },
      });

      const result = await handleWebhookEvent('payload', 'sig');

      expect(result.type).toBe('invoice.payment_succeeded');
      expect(result.handled).toBe(true);
      expect(result.data?.['action']).toBe('payment_succeeded');
      expect(result.data?.['amountPaid']).toBe(19900);
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
  });
});
