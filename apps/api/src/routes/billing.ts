import { Hono } from 'hono';

export const billingRoutes = new Hono();

// Billing / subscription management stubs
billingRoutes.get('/usage', async (c) => {
  // TODO: Fetch usage from Firestore metering
  return c.json({
    plan: 'free',
    eventsUsed: 0,
    eventsLimit: 20000,
    period: new Date().toISOString().slice(0, 7),
  });
});

billingRoutes.post('/checkout', async (c) => {
  // TODO: Create Stripe checkout session for PAYG upgrade
  return c.json({ status: 'stub', message: 'Stripe checkout — not yet implemented' });
});

billingRoutes.get('/plan', async (c) => {
  return c.json({ plan: 'free', features: ['core-logging', 'digest-chain', 'base-chain'] });
});
