import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { attemptRoutes } from './routes/attempts.js';
import { webhookRoutes } from './routes/webhooks.js';
import { billingRoutes } from './routes/billing.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env['KONTEXT_CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'kontext-api', version: '1.0.0' }));
app.get('/health', (c) => c.json({ status: 'healthy' }));

// Routes
app.route('/auth', authRoutes);
app.route('/v1/workspaces', workspaceRoutes);
app.route('/v1/attempts', attemptRoutes);
app.route('/v1/webhooks', webhookRoutes);
app.route('/v1/billing', billingRoutes);

const port = Number(process.env['PORT'] ?? 8080);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Kontext API running on port ${port}`);
});

export { app };
