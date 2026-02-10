import { describe, it, expect, afterEach, vi } from 'vitest';
import { Kontext, UsdcCompliance, CCTPTransferManager, WebhookManager } from '../src/index.js';
import type {
  LogTransactionInput,
  AnomalyEvent,
  Chain,
} from '../src/types.js';

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

function createTx(overrides: Partial<LogTransactionInput> = {}): LogTransactionInput {
  return {
    txHash: '0x' + 'a'.repeat(64),
    chain: 'base',
    amount: '100',
    token: 'USDC',
    from: '0x' + '1'.repeat(40),
    to: '0x' + '2'.repeat(40),
    agentId: 'agent-1',
    ...overrides,
  };
}

function createMockFetch(statusCode = 200) {
  return vi.fn().mockResolvedValue({
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
  });
}

// ============================================================================
// USDC Compliance Checks Across All Supported Chains
// ============================================================================

describe('USDC Compliance - All Chains', () => {
  const allChains: Chain[] = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];

  it('should support all expected chains', () => {
    const supported = UsdcCompliance.getSupportedChains();
    for (const chain of allChains) {
      expect(supported).toContain(chain);
    }
    expect(supported.length).toBeGreaterThanOrEqual(5);
  });

  it('should have USDC contract addresses for all expected chains', () => {
    for (const chain of allChains) {
      const address = UsdcCompliance.getContractAddress(chain);
      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  for (const chain of allChains) {
    it(`should pass a compliant USDC transaction on ${chain}`, () => {
      const result = UsdcCompliance.checkTransaction(createTx({ chain }));
      expect(result.compliant).toBe(true);
      expect(result.riskLevel).toBe('low');
      const chainCheck = result.checks.find((c) => c.name === 'chain_support');
      expect(chainCheck?.passed).toBe(true);
    });

    it(`should flag non-USDC tokens on ${chain}`, () => {
      const result = UsdcCompliance.checkTransaction(createTx({ chain, token: 'DAI' }));
      const tokenCheck = result.checks.find((c) => c.name === 'token_type');
      expect(tokenCheck?.passed).toBe(false);
      expect(tokenCheck?.severity).toBe('high');
    });

    it(`should flag large transactions requiring EDD on ${chain}`, () => {
      const result = UsdcCompliance.checkTransaction(createTx({ chain, amount: '5000' }));
      const eddCheck = result.checks.find((c) => c.name === 'enhanced_due_diligence');
      expect(eddCheck?.severity).toBe('medium');
    });

    it(`should flag reporting-threshold transactions on ${chain}`, () => {
      const result = UsdcCompliance.checkTransaction(createTx({ chain, amount: '10000' }));
      const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
      expect(reportCheck?.severity).toBe('medium');
    });

    it(`should flag large transactions on ${chain}`, () => {
      const result = UsdcCompliance.checkTransaction(createTx({ chain, amount: '75000' }));
      const reportCheck = result.checks.find((c) => c.name === 'reporting_threshold');
      expect(reportCheck?.severity).toBe('high');
    });
  }

  it('should flag unsupported chain', () => {
    const result = UsdcCompliance.checkTransaction(
      createTx({ chain: 'solana' as Chain }),
    );
    const chainCheck = result.checks.find((c) => c.name === 'chain_support');
    expect(chainCheck?.passed).toBe(false);
    expect(chainCheck?.severity).toBe('medium');
  });

  it('should flag invalid addresses across chains', () => {
    for (const chain of allChains) {
      const result = UsdcCompliance.checkTransaction(
        createTx({ chain, from: 'bad-addr' }),
      );
      expect(result.checks.find((c) => c.name === 'address_format_sender')?.passed).toBe(false);
    }
  });

  it('should provide recommendations for clean transactions', () => {
    const result = UsdcCompliance.checkTransaction(createTx({ amount: '50' }));
    expect(result.recommendations).toContain('Transaction passes all compliance checks. Safe to proceed.');
  });

  it('should provide block recommendation for critical failures', () => {
    const result = UsdcCompliance.checkTransaction(createTx({ amount: 'invalid' }));
    expect(result.recommendations.some((r) => r.includes('BLOCK'))).toBe(true);
  });
});

// ============================================================================
// CCTP Cross-Chain Transfer Full Lifecycle
// ============================================================================

describe('CCTP Cross-Chain Transfer Full Lifecycle', () => {
  it('should complete full lifecycle: initiate -> attest -> confirm', () => {
    const manager = new CCTPTransferManager();

    // Step 1: Validate
    const validation = manager.validateTransfer({
      sourceChain: 'ethereum',
      destinationChain: 'base',
      amount: '5000',
      token: 'USDC',
      sender: '0x' + '1'.repeat(40),
      recipient: '0x' + '2'.repeat(40),
      sourceTxHash: '0x' + 'a'.repeat(64),
      agentId: 'agent-1',
    });
    expect(validation.valid).toBe(true);

    // Step 2: Initiate
    const transfer = manager.initiateTransfer({
      sourceChain: 'ethereum',
      destinationChain: 'base',
      amount: '5000',
      token: 'USDC',
      sender: '0x' + '1'.repeat(40),
      recipient: '0x' + '2'.repeat(40),
      sourceTxHash: '0x' + 'a'.repeat(64),
      agentId: 'agent-1',
    });
    expect(transfer.status).toBe('pending');
    expect(transfer.sourceDomain).toBe(0);
    expect(transfer.destinationDomain).toBe(6);

    // Step 3: Attest
    const attested = manager.recordAttestation({
      transferId: transfer.id,
      messageHash: '0x' + 'b'.repeat(64),
      metadata: { attestationService: 'circle-iris' },
    });
    expect(attested.status).toBe('attested');
    expect(attested.messageHash).toBe('0x' + 'b'.repeat(64));
    expect(attested.attestedAt).toBeDefined();

    // Step 4: Confirm
    const confirmed = manager.confirmTransfer({
      transferId: transfer.id,
      destinationTxHash: '0x' + 'c'.repeat(64),
      metadata: { destinationBlock: 12345 },
    });
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.destinationTxHash).toBe('0x' + 'c'.repeat(64));
    expect(confirmed.confirmedAt).toBeDefined();

    // Step 5: Verify audit trail
    const auditEntry = manager.getAuditEntry(transfer.id);
    expect(auditEntry).toBeDefined();
    expect(auditEntry!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should track multiple transfers across different chain pairs', () => {
    const manager = new CCTPTransferManager();
    const chainPairs: [Chain, Chain][] = [
      ['ethereum', 'base'],
      ['base', 'arbitrum'],
      ['polygon', 'optimism'],
      ['arbitrum', 'ethereum'],
      ['optimism', 'polygon'],
    ];

    const transfers = chainPairs.map(([source, dest]) =>
      manager.initiateTransfer({
        sourceChain: source,
        destinationChain: dest,
        amount: '1000',
        token: 'USDC',
        sender: '0x' + '1'.repeat(40),
        recipient: '0x' + '2'.repeat(40),
        sourceTxHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
        agentId: 'agent-1',
        correlationId: 'multi-chain-batch',
      }),
    );

    expect(transfers.length).toBe(5);
    expect(transfers.every((t) => t.status === 'pending')).toBe(true);

    const correlated = manager.getTransfersByCorrelation('multi-chain-batch');
    expect(correlated.length).toBe(5);
  });

  it('should link source and destination actions and build complete audit trail', () => {
    const manager = new CCTPTransferManager();

    const transfer = manager.initiateTransfer({
      sourceChain: 'ethereum',
      destinationChain: 'base',
      amount: '2000',
      token: 'USDC',
      sender: '0x' + '1'.repeat(40),
      recipient: '0x' + '2'.repeat(40),
      sourceTxHash: '0x' + 'a'.repeat(64),
      agentId: 'agent-1',
    });

    // Link source action
    manager.linkAction(transfer.id, 'src-action-id', 'source');

    // Attest and confirm
    manager.recordAttestation({
      transferId: transfer.id,
      messageHash: '0x' + 'b'.repeat(64),
    });
    manager.confirmTransfer({
      transferId: transfer.id,
      destinationTxHash: '0x' + 'c'.repeat(64),
    });

    // Link destination action
    manager.linkAction(transfer.id, 'dst-action-id', 'destination');

    const entry = manager.getAuditEntry(transfer.id);
    expect(entry!.linked).toBe(true);
    expect(entry!.sourceActionId).toBe('src-action-id');
    expect(entry!.destinationActionId).toBe('dst-action-id');
    expect(entry!.transfer.status).toBe('confirmed');
    expect(entry!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle failure during lifecycle', () => {
    const manager = new CCTPTransferManager();

    const transfer = manager.initiateTransfer({
      sourceChain: 'ethereum',
      destinationChain: 'polygon',
      amount: '500',
      token: 'USDC',
      sender: '0x' + '1'.repeat(40),
      recipient: '0x' + '2'.repeat(40),
      sourceTxHash: '0x' + 'a'.repeat(64),
      agentId: 'agent-1',
    });

    const failed = manager.failTransfer(transfer.id, 'Circle attestation timeout');
    expect(failed.status).toBe('failed');
    expect(failed.metadata['failureReason']).toBe('Circle attestation timeout');

    const auditEntry = manager.getAuditEntry(transfer.id);
    expect(auditEntry!.durationMs).toBeNull();
  });

  it('should validate all supported chain pairs', () => {
    const manager = new CCTPTransferManager();
    const chains = CCTPTransferManager.getSupportedChains();

    for (const source of chains) {
      for (const dest of chains) {
        if (source === dest) continue;
        const result = manager.validateTransfer({
          sourceChain: source,
          destinationChain: dest,
          amount: '100',
          token: 'USDC',
          sender: '0x' + '1'.repeat(40),
          recipient: '0x' + '2'.repeat(40),
          sourceTxHash: '0x' + 'a'.repeat(64),
          agentId: 'agent-1',
        });
        expect(result.valid).toBe(true);
      }
    }
  });
});

// ============================================================================
// x402 Payment Verification Flow
// ============================================================================

describe('x402 Payment Verification Flow', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should log x402 HTTP payment with headers as metadata', async () => {
    kontext = createClient();

    // Simulate x402 payment header data
    const x402Headers = {
      'X-Payment-Token': 'USDC',
      'X-Payment-Amount': '0.50',
      'X-Payment-Chain': 'base',
      'X-Payment-TxHash': '0x' + 'f'.repeat(64),
      'X-Payment-From': '0x' + '1'.repeat(40),
      'X-Payment-To': '0x' + '2'.repeat(40),
    };

    const action = await kontext.log({
      type: 'x402_payment',
      description: 'x402 HTTP payment for API access',
      agentId: 'x402-agent',
      metadata: {
        protocol: 'x402',
        httpStatus: 402,
        headers: x402Headers,
        endpoint: '/api/v1/resource',
        method: 'GET',
      },
    });

    expect(action.type).toBe('x402_payment');
    expect(action.metadata['protocol']).toBe('x402');
    expect(action.metadata['httpStatus']).toBe(402);
    expect((action.metadata['headers'] as Record<string, string>)['X-Payment-Token']).toBe('USDC');
    expect(action.digest).toBeDefined();
  });

  it('should log the corresponding USDC transaction for x402 payment', async () => {
    kontext = createClient();

    // Log the action first
    const action = await kontext.log({
      type: 'x402_payment',
      description: 'x402 payment initiated',
      agentId: 'x402-agent',
      correlationId: 'x402-session-001',
    });

    // Then log the on-chain transaction
    const tx = await kontext.logTransaction({
      txHash: '0x' + 'f'.repeat(64),
      chain: 'base',
      amount: '0.50',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'x402-agent',
      correlationId: 'x402-session-001',
      metadata: {
        protocol: 'x402',
        resource: '/api/v1/premium-data',
      },
    });

    expect(tx.correlationId).toBe('x402-session-001');
    expect(tx.amount).toBe('0.50');
    expect(action.correlationId).toBe('x402-session-001');
  });

  it('should verify x402 payment appears in audit export', async () => {
    kontext = createClient();

    await kontext.log({
      type: 'x402_payment',
      description: 'x402 payment',
      agentId: 'x402-agent',
      metadata: { protocol: 'x402' },
    });

    await kontext.logTransaction({
      txHash: '0x' + 'f'.repeat(64),
      chain: 'base',
      amount: '0.50',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'x402-agent',
    });

    const exportResult = await kontext.export({ format: 'json' });
    const parsed = JSON.parse(exportResult.data);

    // Both the action and the transaction (which also produces an action) should be present
    expect(parsed.actions.length).toBeGreaterThanOrEqual(2);
    expect(parsed.transactions.length).toBe(1);
  });
});

// ============================================================================
// Google UCP/A2A Transaction Verification Flow
// ============================================================================

describe('Google UCP/A2A Transaction Verification Flow', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should log a UCP payload and compute trust score', async () => {
    kontext = createClient();

    // Simulate a Google UCP (Universal Checkout Protocol) payload
    const ucpPayload = {
      protocol: 'google_ucp',
      sessionId: 'ucp-session-123',
      merchantId: 'merchant-456',
      buyerAgentId: 'buyer-agent-789',
      itemDescription: 'Digital service subscription',
      amount: '29.99',
      currency: 'USDC',
    };

    // Log the UCP action
    const action = await kontext.log({
      type: 'ucp_transaction',
      description: 'Google UCP payment verification',
      agentId: 'buyer-agent-789',
      metadata: ucpPayload,
    });

    expect(action.type).toBe('ucp_transaction');
    expect(action.metadata['protocol']).toBe('google_ucp');

    // Compute trust score for the buyer agent
    const trustScore = await kontext.getTrustScore('buyer-agent-789');
    expect(trustScore.agentId).toBe('buyer-agent-789');
    expect(trustScore.score).toBeGreaterThanOrEqual(0);
    expect(trustScore.score).toBeLessThanOrEqual(100);
    expect(trustScore.level).toBeDefined();
  });

  it('should log A2A (Agent-to-Agent) transaction and verify trust', async () => {
    kontext = createClient();

    // Log multiple A2A interactions to build history
    for (let i = 0; i < 5; i++) {
      await kontext.log({
        type: 'a2a_interaction',
        description: `A2A message exchange ${i + 1}`,
        agentId: 'agent-a',
        metadata: {
          protocol: 'google_a2a',
          counterpartyAgent: 'agent-b',
          messageType: 'task_request',
        },
      });
    }

    // Log the payment transaction
    const tx = await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '150',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'agent-a',
      metadata: {
        protocol: 'google_a2a',
        taskId: 'a2a-task-123',
      },
    });

    expect(tx.metadata['protocol']).toBe('google_a2a');

    // Evaluate transaction risk
    const evaluation = await kontext.evaluateTransaction({
      txHash: tx.txHash,
      chain: tx.chain,
      amount: tx.amount,
      token: tx.token,
      from: tx.from,
      to: tx.to,
      agentId: tx.agentId,
    });

    expect(evaluation.riskScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.riskScore).toBeLessThanOrEqual(100);
    expect(['approve', 'review', 'block']).toContain(evaluation.recommendation);
  });

  it('should build trust over time for UCP agents', async () => {
    kontext = createClient();

    // Create confirmed tasks for the agent
    const task = await kontext.createTask({
      description: 'UCP payment fulfillment',
      agentId: 'ucp-agent',
      requiredEvidence: ['txHash'],
    });

    await kontext.confirmTask({
      taskId: task.id,
      evidence: { txHash: '0x' + 'a'.repeat(64) },
    });

    // Log transaction history
    for (let i = 0; i < 5; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(63) + i.toString(),
        chain: 'base',
        amount: '100',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'ucp-agent',
      });
    }

    const trustScore = await kontext.getTrustScore('ucp-agent');
    expect(trustScore.score).toBeGreaterThan(0);
    expect(trustScore.factors.length).toBeGreaterThan(0);

    // Check that task completion factor is present
    const taskFactor = trustScore.factors.find((f) => f.name === 'task_completion');
    expect(taskFactor).toBeDefined();
    expect(taskFactor!.score).toBeGreaterThan(50); // Completed task should boost score
  });
});

// ============================================================================
// Stripe Agentic Commerce Flow
// ============================================================================

describe('Stripe Agentic Commerce Flow', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should log Stripe payment intent verification', async () => {
    kontext = createClient();

    // Simulate Stripe payment intent metadata
    const stripeMetadata = {
      paymentIntentId: 'pi_1234567890',
      stripeCustomerId: 'cus_abc123',
      paymentMethodType: 'card',
      amount: 2999, // Stripe uses cents
      currency: 'usd',
      status: 'succeeded',
      metadata: {
        orderId: 'order-789',
        agentId: 'commerce-agent-1',
      },
    };

    const action = await kontext.log({
      type: 'stripe_payment_intent',
      description: 'Stripe payment intent verified',
      agentId: 'commerce-agent-1',
      metadata: {
        provider: 'stripe',
        ...stripeMetadata,
      },
    });

    expect(action.type).toBe('stripe_payment_intent');
    expect(action.metadata['provider']).toBe('stripe');
    expect(action.metadata['paymentIntentId']).toBe('pi_1234567890');
    expect(action.digest).toBeDefined();
  });

  it('should verify audit trail for Stripe-related transactions', async () => {
    kontext = createClient();

    // Log the Stripe action
    await kontext.log({
      type: 'stripe_payment',
      description: 'Stripe payment processed',
      agentId: 'stripe-agent',
      correlationId: 'stripe-flow-001',
      metadata: {
        provider: 'stripe',
        paymentIntentId: 'pi_abc',
        amount: 5000,
        currency: 'usd',
      },
    });

    // Log the corresponding on-chain stablecoin settlement
    await kontext.logTransaction({
      txHash: '0x' + 'd'.repeat(64),
      chain: 'base',
      amount: '50.00',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'stripe-agent',
      correlationId: 'stripe-flow-001',
      metadata: {
        provider: 'stripe',
        paymentIntentId: 'pi_abc',
        settlementType: 'crypto_payout',
      },
    });

    // Export and verify
    const exportResult = await kontext.export({ format: 'json' });
    const parsed = JSON.parse(exportResult.data);

    expect(parsed.actions.length).toBeGreaterThanOrEqual(2);
    expect(parsed.transactions.length).toBe(1);

    // Verify digest chain integrity
    const digestVerification = kontext.verifyDigestChain();
    expect(digestVerification.valid).toBe(true);
  });

  it('should compute trust score for Stripe agent patterns', async () => {
    kontext = createClient();

    // Build a history of Stripe-pattern transactions
    for (let i = 0; i < 10; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(62) + i.toString().padStart(2, '0'),
        chain: 'base',
        amount: '50.00',
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'stripe-agent',
        metadata: { provider: 'stripe', settlementBatch: i },
      });
    }

    const trustScore = await kontext.getTrustScore('stripe-agent');
    expect(trustScore.agentId).toBe('stripe-agent');
    expect(trustScore.score).toBeGreaterThanOrEqual(0);

    // Consistent amounts should yield a good consistency score
    const consistencyFactor = trustScore.factors.find((f) => f.name === 'transaction_consistency');
    expect(consistencyFactor).toBeDefined();
    expect(consistencyFactor!.score).toBeGreaterThan(60);
  });
});

// ============================================================================
// End-to-End: Log -> Detect -> Webhook -> Export -> Verify
// ============================================================================

describe('End-to-End: Log -> Detect Anomaly -> Fire Webhook -> Export -> Verify Digest', () => {
  let kontext: ReturnType<typeof createClient>;

  afterEach(async () => {
    await kontext.destroy();
  });

  it('should complete the full end-to-end flow', async () => {
    kontext = createClient();
    const detectedAnomalies: AnomalyEvent[] = [];

    // Step 1: Enable anomaly detection
    kontext.enableAnomalyDetection({
      rules: ['unusualAmount', 'roundAmount'],
      thresholds: { maxAmount: '1000' },
    });

    kontext.onAnomaly((anomaly) => {
      detectedAnomalies.push(anomaly);
    });

    // Step 2: Log a normal action
    const normalAction = await kontext.log({
      type: 'initialization',
      description: 'Agent system initialized',
      agentId: 'e2e-agent',
    });
    expect(normalAction.digest).toBeDefined();

    // Step 3: Log a normal transaction
    const normalTx = await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'e2e-agent',
    });
    expect(normalTx.digest).toBeDefined();

    // Step 4: Log a suspicious transaction that triggers anomaly
    const suspiciousTx = await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'ethereum',
      amount: '50000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '3'.repeat(40),
      agentId: 'e2e-agent',
    });

    // Verify anomaly was detected
    expect(detectedAnomalies.length).toBeGreaterThan(0);
    expect(detectedAnomalies.some((a) => a.type === 'unusualAmount')).toBe(true);

    // Step 5: Set up webhook manager and fire anomaly notification
    const mockFetch = createMockFetch();
    const webhookManager = new WebhookManager({}, mockFetch as unknown as typeof fetch);

    webhookManager.register({
      url: 'https://example.com/kontext-webhook',
      events: ['anomaly.detected'],
    });

    const webhookResults = await webhookManager.notifyAnomalyDetected(detectedAnomalies[0]!);
    expect(webhookResults.length).toBe(1);
    expect(webhookResults[0]!.success).toBe(true);

    // Verify webhook payload
    const callArgs = mockFetch.mock.calls[0]!;
    const webhookBody = JSON.parse(callArgs[1].body);
    expect(webhookBody.event).toBe('anomaly.detected');
    expect(webhookBody.data.severity).toBeDefined();

    // Step 6: Export audit data
    const exportResult = await kontext.export({
      format: 'json',
      includeAnomalies: true,
      includeTasks: true,
    });

    const parsed = JSON.parse(exportResult.data);
    expect(parsed.actions.length).toBeGreaterThanOrEqual(3); // 1 action + 2 transactions
    expect(parsed.transactions.length).toBe(2);
    expect(parsed.anomalies.length).toBeGreaterThan(0);

    // Step 7: Verify digest chain integrity
    const digestVerification = kontext.verifyDigestChain();
    expect(digestVerification.valid).toBe(true);
    expect(digestVerification.linksVerified).toBeGreaterThanOrEqual(3);

    // Step 8: Export and verify digest chain independently
    const exportedChain = kontext.exportDigestChain();
    expect(exportedChain.genesisHash).toBe('0'.repeat(64));
    expect(exportedChain.links.length).toBeGreaterThanOrEqual(3);
    expect(exportedChain.terminalDigest).toBe(kontext.getTerminalDigest());
  });

  it('should maintain digest chain integrity across many operations', async () => {
    kontext = createClient();

    // Enable anomaly detection
    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '5000' },
    });

    // Perform many operations
    for (let i = 0; i < 20; i++) {
      await kontext.log({
        type: 'batch_action',
        description: `Batch action ${i}`,
        agentId: 'batch-agent',
      });
    }

    for (let i = 0; i < 10; i++) {
      await kontext.logTransaction({
        txHash: '0x' + 'a'.repeat(62) + i.toString().padStart(2, '0'),
        chain: 'base',
        amount: (100 + i * 50).toString(),
        token: 'USDC',
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        agentId: 'batch-agent',
      });
    }

    // Verify the entire chain
    const verification = kontext.verifyDigestChain();
    expect(verification.valid).toBe(true);
    expect(verification.linksVerified).toBe(30); // 20 actions + 10 transactions

    // Terminal digest should be a valid SHA-256 hash
    const terminalDigest = kontext.getTerminalDigest();
    expect(terminalDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate compliance report for the full flow', async () => {
    kontext = createClient();

    // Enable anomaly detection
    kontext.enableAnomalyDetection({
      rules: ['unusualAmount'],
      thresholds: { maxAmount: '500' },
    });

    // Log various actions and transactions
    await kontext.log({
      type: 'agent_start',
      description: 'Agent started',
      agentId: 'report-agent',
    });

    await kontext.logTransaction({
      txHash: '0x' + 'a'.repeat(64),
      chain: 'base',
      amount: '100',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'report-agent',
    });

    await kontext.logTransaction({
      txHash: '0x' + 'b'.repeat(64),
      chain: 'ethereum',
      amount: '5000',
      token: 'USDC',
      from: '0x' + '1'.repeat(40),
      to: '0x' + '2'.repeat(40),
      agentId: 'report-agent',
    });

    // Create and confirm a task
    const task = await kontext.createTask({
      description: 'Verify payment',
      agentId: 'report-agent',
      requiredEvidence: ['txHash'],
    });
    await kontext.confirmTask({
      taskId: task.id,
      evidence: { txHash: '0x' + 'a'.repeat(64) },
    });

    // Generate report
    const report = await kontext.generateReport({
      type: 'compliance',
      period: {
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      },
    });

    expect(report.type).toBe('compliance');
    expect(report.summary.totalActions).toBeGreaterThanOrEqual(3);
    expect(report.summary.totalTransactions).toBe(2);
    expect(report.summary.totalTasks).toBe(1);
    expect(report.summary.confirmedTasks).toBe(1);
    expect(report.summary.totalAnomalies).toBeGreaterThan(0);
  });
});
