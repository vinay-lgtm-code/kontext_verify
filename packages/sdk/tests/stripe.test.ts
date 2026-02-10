import { describe, it, expect, afterEach, vi } from 'vitest';
import { Kontext, WebhookManager } from '../src/index.js';
import type { AnomalyEvent } from '../src/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createClient() {
  return Kontext.init({
    projectId: 'test-project',
    environment: 'development',
    plan: 'enterprise',
  });
}

function createMockFetch(statusCode = 200) {
  return vi.fn().mockResolvedValue({
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
  });
}

/**
 * Simulate a Stripe-style metadata object.
 * In real Stripe integrations, metadata is a flat key-value Record<string, string>.
 */
function createStripeMetadata(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    orderId: 'order_12345',
    customerId: 'cus_abc123',
    agentId: 'stripe-agent',
    productName: 'Premium API Access',
    ...overrides,
  };
}

// ============================================================================
// Stripe Payment Intent Metadata Logging
// ============================================================================

describe('Stripe Payment Intent Metadata Logging', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should log a Stripe payment intent with all metadata fields', async () => {
    kontext = createClient();

    const action = await kontext.log({
      type: 'stripe_payment_intent',
      description: 'Payment intent pi_1234 succeeded',
      agentId: 'stripe-agent',
      metadata: {
        paymentIntentId: 'pi_1234567890abcdef',
        amount: 4999,
        currency: 'usd',
        status: 'succeeded',
        paymentMethodType: 'card',
        customerId: 'cus_abc123',
        receiptEmail: 'customer@example.com',
        stripeMetadata: createStripeMetadata(),
      },
    });

    expect(action.id).toBeDefined();
    expect(action.type).toBe('stripe_payment_intent');
    expect(action.metadata['paymentIntentId']).toBe('pi_1234567890abcdef');
    expect(action.metadata['amount']).toBe(4999);
    expect(action.metadata['currency']).toBe('usd');
    expect(action.metadata['status']).toBe('succeeded');
  });

  it('should log Stripe checkout session completion', async () => {
    kontext = createClient();

    const action = await kontext.log({
      type: 'stripe_checkout_session',
      description: 'Checkout session cs_test_123 completed',
      agentId: 'stripe-agent',
      metadata: {
        sessionId: 'cs_test_123',
        mode: 'payment',
        paymentStatus: 'paid',
        amountTotal: 2999,
        currency: 'usd',
        customerEmail: 'buyer@example.com',
        lineItems: [
          { name: 'Widget A', quantity: 1, amount: 2999 },
        ],
      },
    });

    expect(action.type).toBe('stripe_checkout_session');
    expect(action.metadata['sessionId']).toBe('cs_test_123');
    expect(action.metadata['paymentStatus']).toBe('paid');
  });

  it('should log Stripe subscription creation', async () => {
    kontext = createClient();

    const action = await kontext.log({
      type: 'stripe_subscription',
      description: 'Subscription sub_123 created',
      agentId: 'stripe-agent',
      metadata: {
        subscriptionId: 'sub_123',
        customerId: 'cus_abc',
        priceId: 'price_monthly_49',
        status: 'active',
        currentPeriodEnd: '2026-03-05T00:00:00Z',
        interval: 'month',
        amount: 4900,
        currency: 'usd',
      },
    });

    expect(action.type).toBe('stripe_subscription');
    expect(action.metadata['subscriptionId']).toBe('sub_123');
    expect(action.metadata['status']).toBe('active');
  });

  it('should log Stripe refund event', async () => {
    kontext = createClient();

    const action = await kontext.log({
      type: 'stripe_refund',
      description: 'Refund re_123 processed',
      agentId: 'stripe-agent',
      metadata: {
        refundId: 're_123',
        paymentIntentId: 'pi_original_456',
        amount: 2999,
        currency: 'usd',
        reason: 'requested_by_customer',
        status: 'succeeded',
      },
    });

    expect(action.type).toBe('stripe_refund');
    expect(action.metadata['refundId']).toBe('re_123');
    expect(action.metadata['reason']).toBe('requested_by_customer');
  });
});

// ============================================================================
// Stripe Audit ID Attachment
// ============================================================================

describe('Stripe Audit ID Attachment', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should attach Kontext audit ID to Stripe-style metadata object', async () => {
    kontext = createClient();

    // Log the action and get the audit ID
    const action = await kontext.log({
      type: 'stripe_payment_intent',
      description: 'Payment logged',
      agentId: 'stripe-agent',
      metadata: {
        paymentIntentId: 'pi_test_123',
      },
    });

    // Simulate attaching the Kontext action ID to a Stripe metadata object
    const stripeMetadata = createStripeMetadata();
    const enrichedMetadata = {
      ...stripeMetadata,
      kontextAuditId: action.id,
      kontextDigest: action.digest ?? '',
      kontextCorrelationId: action.correlationId,
    };

    // Verify the enriched metadata contains all expected fields
    expect(enrichedMetadata.kontextAuditId).toBe(action.id);
    expect(enrichedMetadata.kontextDigest).toBeDefined();
    expect(enrichedMetadata.kontextCorrelationId).toBe(action.correlationId);
    expect(enrichedMetadata.orderId).toBe('order_12345');
  });

  it('should correlate Stripe payment with on-chain settlement using correlation ID', async () => {
    kontext = createClient();
    const correlationId = 'stripe-settlement-001';

    // Log Stripe payment intent
    const stripeAction = await kontext.log({
      type: 'stripe_payment_intent',
      description: 'Stripe payment pi_abc succeeded',
      agentId: 'stripe-agent',
      correlationId,
      metadata: {
        paymentIntentId: 'pi_abc',
        amount: 5000,
        currency: 'usd',
      },
    });

    // Log the corresponding USDC settlement transaction
    const settlementTx = await kontext.logTransaction({
      txHash: '0x' + 'e'.repeat(64),
      chain: 'base',
      amount: '50.00',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-agent',
      correlationId,
      metadata: {
        paymentIntentId: 'pi_abc',
        settlementType: 'fiat_to_crypto',
      },
    });

    // Both should share the same correlation ID
    expect(stripeAction.correlationId).toBe(correlationId);
    expect(settlementTx.correlationId).toBe(correlationId);

    // Export and find both records linked
    const result = await kontext.export({ format: 'json' });
    const parsed = JSON.parse(result.data);

    const correlatedActions = parsed.actions.filter(
      (a: { correlationId: string }) => a.correlationId === correlationId,
    );
    expect(correlatedActions.length).toBe(2); // Stripe action + settlement action
  });

  it('should preserve Kontext digest across Stripe metadata roundtrip', async () => {
    kontext = createClient();

    const action = await kontext.log({
      type: 'stripe_payment',
      description: 'Payment for order',
      agentId: 'stripe-agent',
    });

    // Simulate writing digest to Stripe metadata and reading it back
    const stripeMetadataWrite: Record<string, string> = {
      ...createStripeMetadata(),
      kontextDigest: action.digest ?? '',
    };

    // Simulate reading back from Stripe
    const stripeMetadataRead = { ...stripeMetadataWrite };

    expect(stripeMetadataRead['kontextDigest']).toBe(action.digest);
    expect(stripeMetadataRead['kontextDigest']).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ============================================================================
// Trust Scoring for Stripe-Pattern Transactions
// ============================================================================

describe('Trust Scoring for Stripe-Pattern Transactions', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should build trust with consistent Stripe settlement amounts', async () => {
    kontext = createClient();

    // Simulate consistent Stripe settlements (same amount)
    for (let i = 0; i < 15; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(62) + i.toString().padStart(2, '0'),
        chain: 'base',
        amount: '49.99',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'stripe-settler',
        metadata: { provider: 'stripe' },
      });
    }

    const score = await kontext.getTrustScore('stripe-settler');
    expect(score.score).toBeGreaterThan(0);

    // Consistent amounts should produce a good consistency factor
    const consistencyFactor = score.factors.find((f) => f.name === 'transaction_consistency');
    expect(consistencyFactor).toBeDefined();
    // CV should be very low for identical amounts, so score should be high
    expect(consistencyFactor!.score).toBeGreaterThan(80);
  });

  it('should flag inconsistent Stripe settlements with anomaly detection', async () => {
    kontext = createClient();
    const anomalies: AnomalyEvent[] = [];

    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '500' },
    });

    kontext.onAnomaly((a) => anomalies.push(a));

    // Normal settlements
    for (let i = 0; i < 3; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(62) + i.toString().padStart(2, '0'),
        chain: 'base',
        amount: '50.00',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'stripe-settler',
      });
    }

    // Suspicious large settlement
    await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'base',
      amount: '25000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-settler',
      metadata: { provider: 'stripe', suspicious: true },
    });

    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies.some((a) => a.type === 'unusualAmount')).toBe(true);
  });

  it('should evaluate risk for a large Stripe payout transaction', async () => {
    kontext = createClient();

    const evaluation = await kontext.evaluateTransaction({
      txHash: '0x' + 'f'.repeat(64),
      chain: 'ethereum',
      amount: '75000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-payout-agent',
    });

    expect(evaluation.riskScore).toBeGreaterThan(0);
    expect(evaluation.factors.length).toBeGreaterThan(0);

    const amountFactor = evaluation.factors.find((f) => f.name === 'amount_risk');
    expect(amountFactor).toBeDefined();
    expect(amountFactor!.score).toBeGreaterThan(50); // Large amount = higher risk
  });

  it('should improve trust with confirmed Stripe-related tasks', async () => {
    kontext = createClient();

    // Log transactions
    for (let i = 0; i < 5; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(63) + i.toString(),
        chain: 'base',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'stripe-agent',
      });
    }

    // Get baseline score
    const baselineScore = await kontext.getTrustScore('stripe-agent');

    // Create and confirm tasks
    for (let i = 0; i < 3; i++) {
      const task = await kontext.createTask({
        description: `Verify Stripe settlement ${i}`,
        agentId: 'stripe-agent',
        requiredEvidence: ['txHash', 'receipt'],
      });

      await kontext.confirmTask({
        taskId: task.id,
        evidence: {
          txHash: '0x' + 'c'.repeat(63) + i.toString(),
          receipt: { status: 'confirmed', provider: 'stripe' },
        },
      });
    }

    // Score should reflect improved compliance adherence
    const improvedScore = await kontext.getTrustScore('stripe-agent');
    const complianceFactor = improvedScore.factors.find((f) => f.name === 'compliance_adherence');
    expect(complianceFactor).toBeDefined();
    expect(complianceFactor!.score).toBeGreaterThanOrEqual(50);
  });
});

// ============================================================================
// Webhook Delivery for Stripe-Related Events
// ============================================================================

describe('Webhook Delivery for Stripe-Related Events', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should fire webhook on anomaly from Stripe transaction', async () => {
    kontext = createClient();
    const detectedAnomalies: AnomalyEvent[] = [];

    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '1000' },
    });

    kontext.onAnomaly((a) => detectedAnomalies.push(a));

    // Log a suspicious Stripe settlement
    await kontext.logTransaction({
      txHash: '0x' + 'f'.repeat(64),
      chain: 'base',
      amount: '99999',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-agent',
      metadata: { provider: 'stripe', paymentIntentId: 'pi_suspicious' },
    });

    expect(detectedAnomalies.length).toBeGreaterThan(0);

    // Fire webhook
    const mockFetch = createMockFetch();
    const webhookManager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

    webhookManager.register({
      url: 'https://stripe-webhook-handler.example.com/kontext',
      events: ['anomaly.detected'],
      metadata: { integration: 'stripe' },
    });

    const results = await webhookManager.notifyAnomalyDetected(detectedAnomalies[0]!);
    expect(results.length).toBe(1);
    expect(results[0]!.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.event).toBe('anomaly.detected');
    expect(body.data.agentId).toBe('stripe-agent');
  });

  it('should fire webhook when Stripe-related task is confirmed', async () => {
    kontext = createClient();

    const task = await kontext.createTask({
      description: 'Verify Stripe payout settlement',
      agentId: 'stripe-agent',
      requiredEvidence: ['txHash'],
      metadata: { provider: 'stripe', paymentIntentId: 'pi_payout_123' },
    });

    const confirmed = await kontext.confirmTask({
      taskId: task.id,
      evidence: { txHash: '0x' + 'a'.repeat(64) },
    });

    // Deliver webhook
    const mockFetch = createMockFetch();
    const webhookManager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

    webhookManager.register({
      url: 'https://stripe-webhook-handler.example.com/kontext',
      events: ['task.confirmed'],
    });

    const results = await webhookManager.notifyTaskConfirmed(confirmed);
    expect(results.length).toBe(1);
    expect(results[0]!.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.event).toBe('task.confirmed');
    expect(body.data.taskId).toBe(task.id);
    expect(body.data.agentId).toBe('stripe-agent');
  });

  it('should fire webhook when Stripe agent trust score changes', async () => {
    kontext = createClient();

    // Build agent history
    for (let i = 0; i < 5; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(63) + i.toString(),
        chain: 'base',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'stripe-agent',
      });
    }

    const trustScore = await kontext.getTrustScore('stripe-agent');

    // Fire trust score webhook
    const mockFetch = createMockFetch();
    const webhookManager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

    webhookManager.register({
      url: 'https://stripe-webhook-handler.example.com/kontext',
      events: ['trust.score_changed'],
    });

    const results = await webhookManager.notifyTrustScoreChanged(trustScore, 50);
    expect(results.length).toBe(1);
    expect(results[0]!.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.event).toBe('trust.score_changed');
    expect(body.data.agentId).toBe('stripe-agent');
    expect(body.data.previousScore).toBe(50);
    expect(typeof body.data.score).toBe('number');
  });

  it('should deliver to multiple Stripe webhook endpoints', async () => {
    const mockFetch = createMockFetch();
    const webhookManager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

    // Register multiple endpoints for different Stripe event types
    webhookManager.register({
      url: 'https://alerts.example.com/kontext',
      events: ['anomaly.detected'],
      metadata: { purpose: 'fraud-alerts' },
    });

    webhookManager.register({
      url: 'https://ops.example.com/kontext',
      events: ['anomaly.detected', 'task.confirmed', 'task.failed'],
      metadata: { purpose: 'operations' },
    });

    webhookManager.register({
      url: 'https://analytics.example.com/kontext',
      events: ['trust.score_changed'],
      metadata: { purpose: 'analytics' },
    });

    // Fire anomaly event
    const anomaly: AnomalyEvent = {
      id: 'anomaly-stripe-1',
      type: 'unusualAmount',
      severity: 'high',
      description: 'Unusual Stripe settlement',
      agentId: 'stripe-agent',
      actionId: 'action-1',
      detectedAt: new Date().toISOString(),
      data: { amount: '50000', provider: 'stripe' },
      reviewed: false,
    };

    const results = await webhookManager.notifyAnomalyDetected(anomaly);
    expect(results.length).toBe(2); // Two webhooks subscribe to anomaly.detected
    expect(results.every((r) => r.success)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should retry failed Stripe webhook deliveries', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new Error('Stripe endpoint temporarily unavailable'));
      }
      return Promise.resolve({ ok: true, status: 200 });
    });

    const webhookManager = new WebhookManager(
      { maxRetries: 3, baseDelayMs: 1 },
      mockFetch as unknown as typeof fetch,
    );

    webhookManager.register({
      url: 'https://stripe-webhook-handler.example.com/kontext',
      events: ['anomaly.detected'],
    });

    const anomaly: AnomalyEvent = {
      id: 'anomaly-retry-test',
      type: 'unusualAmount',
      severity: 'medium',
      description: 'Test retry',
      agentId: 'stripe-agent',
      actionId: 'action-1',
      detectedAt: new Date().toISOString(),
      data: {},
      reviewed: false,
    };

    const results = await webhookManager.notifyAnomalyDetected(anomaly);
    expect(results.length).toBe(1);
    expect(results[0]!.success).toBe(true);
    expect(results[0]!.attempts).toBe(3);
  });
});

// ============================================================================
// Stripe + USDC Compliance Integration
// ============================================================================

describe('Stripe + USDC Compliance Integration', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should run USDC compliance check on Stripe settlement transaction', async () => {
    kontext = createClient();

    const tx = {
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base' as const,
      amount: '15000',
      token: 'USDC' as const,
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-agent',
    };

    // Run USDC compliance check
    const complianceResult = kontext.checkUsdcCompliance(tx);

    expect(complianceResult.compliant).toBe(true);
    expect(complianceResult.checks.length).toBeGreaterThan(0);

    // Should flag for reporting since 15000 > 10000 threshold
    const reportCheck = complianceResult.checks.find((c) => c.name === 'reporting_threshold');
    expect(reportCheck?.severity).toBe('medium');

    // Should recommend CTR filing
    expect(
      complianceResult.recommendations.some((r) => r.includes('Currency Transaction Report')),
    ).toBe(true);

    // Also log the transaction
    const loggedTx = await kontext.logTransaction(tx);
    expect(loggedTx.type).toBe('transaction');
    expect(loggedTx.amount).toBe('15000');
  });

  it('should generate CTR for Stripe settlements exceeding threshold', async () => {
    kontext = createClient();

    // Log multiple Stripe settlement transactions
    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '12000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-agent',
      metadata: { provider: 'stripe', settlementBatch: 1 },
    });

    await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'ethereum',
      amount: '25000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-agent',
      metadata: { provider: 'stripe', settlementBatch: 2 },
    });

    const ctr = await kontext.generateCTRReport({
      type: 'ctr',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(ctr.type).toBe('ctr');
    expect(ctr.transactions.length).toBe(2);
    expect(parseFloat(ctr.totalCashIn)).toBe(37000);
    expect(ctr.conductors.length).toBe(1);
    expect(ctr.conductors[0]!.agentId).toBe('stripe-agent');
  });
});
