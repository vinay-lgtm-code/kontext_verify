import { Hono } from 'hono';
import { AttemptLedger, ReceiptLedger, MemoryStorage } from '@kontext/core';
import type { StartAttemptInput, StageEvent } from '@kontext/core';
import { fireNotifications } from '../services/notifications.js';
import type { NotificationConfig } from '../services/notifications.js';

export const attemptRoutes = new Hono();

// In-memory ledger (will be replaced by Firestore-backed)
const storage = new MemoryStorage();
const config = {
  projectId: 'kontext-api',
  environment: 'production' as const,
  policy: {
    maxTransactionAmount: '50000',
    dailyAggregateLimit: '200000',
    sanctionsEnabled: true,
    blockedRecipients: [] as string[],
    blockedSenders: [] as string[],
    allowedRecipients: [] as string[],
    requiredMetadataByPaymentType: {},
  },
};
const receiptLedger = ReceiptLedger.init(config, storage);
const attemptLedger = new AttemptLedger(receiptLedger, storage);

attemptRoutes.post('/', async (c) => {
  const input = await c.req.json<StartAttemptInput>();
  const attempt = await attemptLedger.startAttempt(input);
  return c.json(attempt, 201);
});

attemptRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const attempt = await attemptLedger.getAttempt(id);
  if (!attempt) return c.json({ error: 'Attempt not found' }, 404);
  return c.json(attempt);
});

// Workspace notification configs — in production, loaded from Firestore
const workspaceNotifications = new Map<string, NotificationConfig>();

attemptRoutes.put('/:id/notifications', async (c) => {
  const id = c.req.param('id');
  const config = await c.req.json<NotificationConfig>();
  workspaceNotifications.set(id, config);
  return c.json({ status: 'ok', workspaceRef: id });
});

attemptRoutes.put('/:id/stages', async (c) => {
  const id = c.req.param('id');
  const event = await c.req.json<StageEvent>();
  try {
    const updated = await attemptLedger.appendStageEvent(id, event);

    // Fire notifications if configured
    const notifConfig = workspaceNotifications.get(updated.workspaceRef);
    let notification;
    if (notifConfig) {
      notification = await fireNotifications(notifConfig, updated, event);
    }

    return c.json({ ...updated, notification });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

attemptRoutes.post('/sync', async (c) => {
  // TODO: Bulk sync from local SDK
  return c.json({ status: 'stub', message: 'Bulk sync — not yet implemented' });
});
