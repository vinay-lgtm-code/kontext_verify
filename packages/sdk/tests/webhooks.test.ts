import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookManager } from '../src/webhooks.js';
import type { AnomalyEvent, Task, TrustScore } from '../src/types.js';

function createMockFetch(statusCode = 200) {
  return vi.fn().mockResolvedValue({
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
  });
}

function createAnomalyEvent(overrides: Partial<AnomalyEvent> = {}): AnomalyEvent {
  return {
    id: 'anomaly-1',
    type: 'unusualAmount',
    severity: 'high',
    description: 'Unusual amount detected',
    agentId: 'agent-1',
    actionId: 'action-1',
    detectedAt: new Date().toISOString(),
    data: { amount: '50000' },
    reviewed: false,
    ...overrides,
  };
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'test-project',
    description: 'Test task',
    agentId: 'agent-1',
    status: 'confirmed',
    requiredEvidence: ['txHash'],
    providedEvidence: { txHash: '0xabc' },
    correlationId: 'corr-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
    expiresAt: null,
    metadata: {},
    ...overrides,
  };
}

function createTrustScore(overrides: Partial<TrustScore> = {}): TrustScore {
  return {
    agentId: 'agent-1',
    score: 75,
    factors: [
      { name: 'history_depth', score: 80, weight: 0.15, description: 'Test' },
    ],
    computedAt: new Date().toISOString(),
    level: 'high',
    ...overrides,
  };
}

describe('WebhookManager', () => {
  describe('registration', () => {
    it('should register a webhook', () => {
      const manager = new WebhookManager();
      const webhook = manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.events).toEqual(['anomaly.detected']);
      expect(webhook.active).toBe(true);
    });

    it('should reject empty URL', () => {
      const manager = new WebhookManager();
      expect(() =>
        manager.register({ url: '', events: ['anomaly.detected'] }),
      ).toThrow('URL is required');
    });

    it('should reject empty events', () => {
      const manager = new WebhookManager();
      expect(() =>
        manager.register({ url: 'https://example.com/webhook', events: [] }),
      ).toThrow('At least one event type');
    });

    it('should unregister a webhook', () => {
      const manager = new WebhookManager();
      const webhook = manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      expect(manager.unregister(webhook.id)).toBe(true);
      expect(manager.getWebhook(webhook.id)).toBeUndefined();
    });

    it('should return false when unregistering non-existent webhook', () => {
      const manager = new WebhookManager();
      expect(manager.unregister('nonexistent')).toBe(false);
    });

    it('should enable/disable webhooks', () => {
      const manager = new WebhookManager();
      const webhook = manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      const disabled = manager.setActive(webhook.id, false);
      expect(disabled?.active).toBe(false);

      const enabled = manager.setActive(webhook.id, true);
      expect(enabled?.active).toBe(true);
    });

    it('should list all webhooks', () => {
      const manager = new WebhookManager();
      manager.register({
        url: 'https://example.com/webhook1',
        events: ['anomaly.detected'],
      });
      manager.register({
        url: 'https://example.com/webhook2',
        events: ['task.confirmed'],
      });

      expect(manager.getWebhooks().length).toBe(2);
    });
  });

  describe('anomaly notifications', () => {
    it('should deliver anomaly events to subscribed webhooks', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      const results = await manager.notifyAnomalyDetected(createAnomalyEvent());

      expect(results.length).toBe(1);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[0]).toBe('https://example.com/webhook');
      const body = JSON.parse(callArgs[1].body);
      expect(body.event).toBe('anomaly.detected');
      expect(body.data.anomalyId).toBe('anomaly-1');
    });

    it('should not deliver to webhooks not subscribed to the event', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['task.confirmed'], // Not subscribed to anomaly.detected
      });

      const results = await manager.notifyAnomalyDetected(createAnomalyEvent());

      expect(results.length).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not deliver to disabled webhooks', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      const webhook = manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      manager.setActive(webhook.id, false);

      const results = await manager.notifyAnomalyDetected(createAnomalyEvent());

      expect(results.length).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('task notifications', () => {
    it('should deliver task confirmed events', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['task.confirmed'],
      });

      const results = await manager.notifyTaskConfirmed(createTask());

      expect(results.length).toBe(1);
      expect(results[0]!.success).toBe(true);

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toBe('task.confirmed');
      expect(body.data.taskId).toBe('task-1');
    });

    it('should deliver task failed events', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['task.failed'],
      });

      const results = await manager.notifyTaskFailed(
        createTask({ status: 'failed' }),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.success).toBe(true);

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toBe('task.failed');
    });
  });

  describe('trust score notifications', () => {
    it('should deliver trust score change events', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['trust.score_changed'],
      });

      const results = await manager.notifyTrustScoreChanged(createTrustScore(), 60);

      expect(results.length).toBe(1);
      expect(results[0]!.success).toBe(true);

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toBe('trust.score_changed');
      expect(body.data.score).toBe(75);
      expect(body.data.previousScore).toBe(60);
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Connection refused'));
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      const manager = new WebhookManager(
        { maxRetries: 3, baseDelayMs: 1 }, // Use 1ms delay for testing
        mockFetch as unknown as typeof fetch,
      );

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      const results = await manager.notifyAnomalyDetected(createAnomalyEvent());

      expect(results.length).toBe(1);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.attempts).toBe(3); // 2 failures + 1 success
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should report failure after all retries exhausted', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const manager = new WebhookManager(
        { maxRetries: 2, baseDelayMs: 1 },
        mockFetch as unknown as typeof fetch,
      );

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      const results = await manager.notifyAnomalyDetected(createAnomalyEvent());

      expect(results.length).toBe(1);
      expect(results[0]!.success).toBe(false);
      expect(results[0]!.attempts).toBe(3); // 1 initial + 2 retries
      expect(results[0]!.error).toBe('Connection refused');
    });

    it('should retry on non-OK HTTP status', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ok: false, status: 503 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      const manager = new WebhookManager(
        { maxRetries: 2, baseDelayMs: 1 },
        mockFetch as unknown as typeof fetch,
      );

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      const results = await manager.notifyAnomalyDetected(createAnomalyEvent());

      expect(results[0]!.success).toBe(true);
      expect(results[0]!.attempts).toBe(2);
    });
  });

  describe('delivery results', () => {
    it('should track delivery results', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      const webhook = manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      await manager.notifyAnomalyDetected(createAnomalyEvent());
      await manager.notifyAnomalyDetected(createAnomalyEvent());

      const allResults = manager.getDeliveryResults();
      expect(allResults.length).toBe(2);

      const webhookResults = manager.getDeliveryResults(webhook.id);
      expect(webhookResults.length).toBe(2);
    });
  });

  describe('multiple webhooks', () => {
    it('should deliver to all matching webhooks', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook1',
        events: ['anomaly.detected'],
      });
      manager.register({
        url: 'https://example.com/webhook2',
        events: ['anomaly.detected', 'task.confirmed'],
      });
      manager.register({
        url: 'https://example.com/webhook3',
        events: ['task.confirmed'], // Not subscribed to anomaly
      });

      const results = await manager.notifyAnomalyDetected(createAnomalyEvent());

      expect(results.length).toBe(2);
      expect(results.every((r) => r.success)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('HMAC signature', () => {
    it('should include signature header when secret is provided', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
        secret: 'my-secret-key',
      });

      await manager.notifyAnomalyDetected(createAnomalyEvent());

      const headers = mockFetch.mock.calls[0]![1].headers;
      expect(headers['X-Kontext-Signature']).toBeDefined();
      expect(headers['X-Kontext-Signature']).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should not include signature header when no secret is provided', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
      });

      await manager.notifyAnomalyDetected(createAnomalyEvent());

      const headers = mockFetch.mock.calls[0]![1].headers;
      expect(headers['X-Kontext-Signature']).toBeUndefined();
    });
  });

  describe('verifySignature (timing-safe)', () => {
    it('should return true for a valid signature', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);
      const secret = 'my-webhook-secret';

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
        secret,
      });

      await manager.notifyAnomalyDetected(createAnomalyEvent());

      const callArgs = mockFetch.mock.calls[0]!;
      const body = callArgs[1].body as string;
      const signature = callArgs[1].headers['X-Kontext-Signature'] as string;

      expect(WebhookManager.verifySignature(body, signature, secret)).toBe(true);
    });

    it('should return false for a tampered payload', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);
      const secret = 'my-webhook-secret';

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
        secret,
      });

      await manager.notifyAnomalyDetected(createAnomalyEvent());

      const callArgs = mockFetch.mock.calls[0]!;
      const signature = callArgs[1].headers['X-Kontext-Signature'] as string;

      expect(WebhookManager.verifySignature('{"tampered":true}', signature, secret)).toBe(false);
    });

    it('should return false for wrong secret', async () => {
      const mockFetch = createMockFetch();
      const manager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

      manager.register({
        url: 'https://example.com/webhook',
        events: ['anomaly.detected'],
        secret: 'correct-secret',
      });

      await manager.notifyAnomalyDetected(createAnomalyEvent());

      const callArgs = mockFetch.mock.calls[0]!;
      const body = callArgs[1].body as string;
      const signature = callArgs[1].headers['X-Kontext-Signature'] as string;

      expect(WebhookManager.verifySignature(body, signature, 'wrong-secret')).toBe(false);
    });

    it('should return false for mismatched length signature', () => {
      expect(WebhookManager.verifySignature('{}', 'short', 'secret')).toBe(false);
    });
  });
});
