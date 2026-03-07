import { Hono } from 'hono';

export const webhookRoutes = new Hono();

// Provider webhook ingestion (Circle, Stripe, etc.)
webhookRoutes.post('/circle', async (c) => {
  const payload = await c.req.json();
  // TODO: Verify Circle webhook signature, map to StageEvent, append to attempt
  return c.json({ received: true, provider: 'circle', eventType: payload['type'] ?? 'unknown' });
});

webhookRoutes.post('/stripe', async (c) => {
  const payload = await c.req.json();
  // TODO: Verify Stripe webhook signature, handle billing events
  return c.json({ received: true, provider: 'stripe', eventType: payload['type'] ?? 'unknown' });
});

webhookRoutes.post('/x402', async (c) => {
  const payload = await c.req.json();
  // TODO: Verify x402 callback, map to StageEvent
  return c.json({ received: true, provider: 'x402', eventType: payload['type'] ?? 'unknown' });
});
