import { Hono } from 'hono';

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  // TODO: Verify Identity Platform token
  return c.json({ status: 'stub', message: 'Identity Platform login — not yet implemented' });
});

authRoutes.post('/logout', async (c) => {
  return c.json({ status: 'ok' });
});

authRoutes.get('/whoami', async (c) => {
  return c.json({ authenticated: false, message: 'Not authenticated' });
});
