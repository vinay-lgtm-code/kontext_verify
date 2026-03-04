// ============================================================================
// Kontext Server - Stripe Checkout + Metered Billing Integration
// ============================================================================
// Handles Stripe Checkout sessions, Customer Portal, webhook processing,
// and metered usage reporting for the Pro plan ($2/1K events above 20K free).

import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Stripe Client Initialization
// ---------------------------------------------------------------------------

// Env vars are read lazily via getters so that test stubs take effect.
function getSecretKey(): string {
  return process.env['STRIPE_SECRET_KEY'] ?? '';
}

function getWebhookSecret(): string {
  return process.env['STRIPE_WEBHOOK_SECRET'] ?? '';
}

function getProPriceId(): string {
  return process.env['STRIPE_PRO_PRICE_ID'] ?? '';
}

function getStripeClient(): Stripe {
  const key = getSecretKey();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
}

// ---------------------------------------------------------------------------
// Pro Plan Configuration — Metered Billing ($2/1K events above 20K free)
// ---------------------------------------------------------------------------

/** Free tier threshold — first 20K events per month are always free */
export const FREE_TIER_EVENTS = 20_000;

/** Price per 1K events above free tier, in cents */
export const PRICE_PER_1K_EVENTS_CENTS = 200; // $2.00

export const PRO_PLAN_CONFIG = {
  product: {
    name: 'Kontext Pro',
    description: 'Usage-based compliance logging for AI agents. $2/1K events above 20K free. All chains, advanced anomaly rules, unified screening, CSV export, cloud persistence.',
  },
  price: {
    unitAmount: PRICE_PER_1K_EVENTS_CENTS, // $2.00 per 1K events
    currency: 'usd',
    interval: 'month' as const,
    usageType: 'metered' as const,
  },
  metadata: {
    tier: 'pro',
    billing_model: 'metered',
    free_tier_events: String(FREE_TIER_EVENTS),
    price_per_1k: '$2.00',
  },
} as const;

// ---------------------------------------------------------------------------
// Checkout Session Creation — Metered Subscription
// ---------------------------------------------------------------------------

export interface CreateCheckoutSessionParams {
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<{ url: string; sessionId: string }> {
  const { customerEmail, successUrl, cancelUrl } = params;

  if (!customerEmail || !customerEmail.includes('@')) {
    throw new Error('A valid email address is required');
  }

  const priceId = getProPriceId();
  if (!priceId) {
    throw new Error('STRIPE_PRO_PRICE_ID environment variable is required');
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [
      {
        price: priceId,
        // No quantity for metered pricing — usage is reported separately
      },
    ],
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    success_url: successUrl.replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}'),
    cancel_url: cancelUrl,
    metadata: {
      ...PRO_PLAN_CONFIG.metadata,
    },
    subscription_data: {
      metadata: {
        ...PRO_PLAN_CONFIG.metadata,
      },
    },
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

// ---------------------------------------------------------------------------
// Metered Usage Reporting
// ---------------------------------------------------------------------------

/**
 * Report metered usage to Stripe for a subscription.
 * Only reports usage above the free tier (20K events).
 *
 * @param subscriptionItemId - The Stripe subscription item ID (si_xxx)
 * @param totalEventsThisPeriod - Total events used this billing period
 * @returns The number of billable units reported (in 1K event blocks)
 */
export async function reportUsage(
  subscriptionItemId: string,
  totalEventsThisPeriod: number,
): Promise<{ billableUnits: number; reported: boolean }> {
  // Only bill for events above the free tier
  const billableEvents = Math.max(0, totalEventsThisPeriod - FREE_TIER_EVENTS);

  if (billableEvents === 0) {
    return { billableUnits: 0, reported: false };
  }

  // Round up to nearest 1K block
  const billableUnits = Math.ceil(billableEvents / 1000);

  const stripe = getStripeClient();

  await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity: billableUnits,
    timestamp: 'now',
    action: 'set', // 'set' replaces total for the period (idempotent)
  });

  return { billableUnits, reported: true };
}

/**
 * Get the subscription item ID from a subscription.
 * Needed for reporting metered usage.
 */
export async function getSubscriptionItemId(
  subscriptionId: string,
): Promise<string | null> {
  const stripe = getStripeClient();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items'],
  });

  const item = subscription.items.data[0];
  return item?.id ?? null;
}

// ---------------------------------------------------------------------------
// Customer Portal Session
// ---------------------------------------------------------------------------

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export async function createPortalSession(
  params: CreatePortalSessionParams,
): Promise<{ url: string }> {
  const { customerId, returnUrl } = params;

  if (!customerId) {
    throw new Error('Customer ID is required');
  }

  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

// ---------------------------------------------------------------------------
// Checkout Session Retrieval
// ---------------------------------------------------------------------------

export async function getCheckoutSession(sessionId: string): Promise<{
  status: string | null;
  customer: string | null;
  subscription: string | null;
  customerEmail: string | null;
}> {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  return {
    status: session.status ?? null,
    customer: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    subscription: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
    customerEmail: session.customer_email ?? null,
  };
}

// ---------------------------------------------------------------------------
// Webhook Handler
// ---------------------------------------------------------------------------

export interface WebhookResult {
  type: string;
  handled: boolean;
  data?: Record<string, unknown>;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function handleWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Promise<WebhookResult> {
  const event = constructWebhookEvent(payload, signature);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Activate Pro plan for the customer
      return {
        type: event.type,
        handled: true,
        data: {
          action: 'activate_pro',
          customerId: session.customer,
          customerEmail: session.customer_email,
          subscriptionId: session.subscription,
          metadata: session.metadata,
        },
      };
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      return {
        type: event.type,
        handled: true,
        data: {
          action: 'update_subscription',
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        },
      };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // Downgrade to Free plan
      return {
        type: event.type,
        handled: true,
        data: {
          action: 'downgrade_to_free',
          customerId: subscription.customer,
          subscriptionId: subscription.id,
        },
      };
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      return {
        type: event.type,
        handled: true,
        data: {
          action: 'payment_succeeded',
          customerId: invoice.customer,
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
        },
      };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      return {
        type: event.type,
        handled: true,
        data: {
          action: 'payment_failed',
          customerId: invoice.customer,
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count,
        },
      };
    }

    default:
      return {
        type: event.type,
        handled: false,
      };
  }
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export { getStripeClient, getSecretKey, getWebhookSecret, getProPriceId };
