// ============================================================================
// Kontext + x402 Protocol Integration Example
// ============================================================================
// Shows how to verify x402 micropayment transactions using Kontext for
// compliance, audit logging, and tamper-evident digest chains.
//
// The x402 protocol enables HTTP 402-based micropayments where API
// responses are gated behind on-chain stablecoin payments. This example
// shows how to integrate Kontext compliance checks into that flow.
//
// Prerequisites:
//   npm install kontext-sdk
//
// Run:
//   npx tsx examples/x402-protocol/index.ts
// ============================================================================

import { Kontext, UsdcCompliance, FileStorage } from 'kontext-sdk';

// 1. Initialize Kontext with file-based persistence
const kontext = Kontext.init({
  projectId: 'x402-gateway',
  environment: 'development',
  storage: new FileStorage('./x402-kontext-data'),
});

await kontext.restore();

// 2. Enable anomaly detection for micropayment patterns
kontext.enableAnomalyDetection({
  rules: ['unusualAmount', 'frequencySpike', 'rapidSuccession'],
  thresholds: {
    maxAmount: '100',        // micropayments should be small
    maxFrequency: 100,       // high frequency expected for micropayments
    minIntervalSeconds: 1,   // but not too rapid
  },
});

// 3. Define the x402 payment verification flow
interface X402PaymentHeader {
  /** Base64-encoded payment payload */
  paymentPayload: string;
  /** On-chain transaction hash proving payment */
  txHash: string;
  /** Payer address */
  payer: string;
  /** Amount in USDC */
  amount: string;
  /** Chain the payment was made on */
  chain: 'base' | 'ethereum';
  /** Resource being purchased */
  resource: string;
}

/**
 * Verify an x402 micropayment and log it through Kontext.
 * Returns whether the payment is valid and compliant.
 */
async function verifyX402Payment(
  payment: X402PaymentHeader,
): Promise<{ valid: boolean; reason?: string; taskId?: string }> {
  const agentId = 'x402-verifier';

  // Step 1: OFAC sanctions screening on the payer address
  if (UsdcCompliance.isSanctioned(payment.payer)) {
    const details = UsdcCompliance.checkSanctionsDetailed(payment.payer);

    await kontext.log({
      type: 'x402_sanctions_block',
      description: `x402 payment from sanctioned address ${payment.payer} (${details.listMatch})`,
      agentId,
      metadata: {
        payer: payment.payer,
        amount: payment.amount,
        resource: payment.resource,
        sanctionsList: details.listMatch,
      },
    });

    return {
      valid: false,
      reason: `Payer address is on ${details.listMatch} sanctions list`,
    };
  }

  // Step 2: Run full compliance check
  const compliance = kontext.checkUsdcCompliance({
    txHash: payment.txHash,
    chain: payment.chain,
    amount: payment.amount,
    token: 'USDC',
    from: payment.payer,
    to: '0xGatewayReceiver00000000000000000000000001',
    agentId,
  });

  if (!compliance.compliant) {
    await kontext.log({
      type: 'x402_compliance_block',
      description: `x402 payment blocked: ${compliance.recommendations[0]}`,
      agentId,
      metadata: { payment, compliance: compliance.checks },
    });

    return { valid: false, reason: compliance.recommendations[0] };
  }

  // Step 3: Create a tracked task for this payment verification
  const task = await kontext.createTask({
    description: `Verify x402 payment of ${payment.amount} USDC for ${payment.resource}`,
    agentId,
    requiredEvidence: ['txHash'],
    metadata: {
      resource: payment.resource,
      payer: payment.payer,
      chain: payment.chain,
    },
  });

  // Step 4: Log the transaction through Kontext
  await kontext.logTransaction({
    txHash: payment.txHash,
    chain: payment.chain,
    amount: payment.amount,
    token: 'USDC',
    from: payment.payer,
    to: '0xGatewayReceiver00000000000000000000000001',
    agentId,
    metadata: {
      protocol: 'x402',
      resource: payment.resource,
      taskId: task.id,
    },
  });

  // Step 5: Confirm the task with the tx hash as evidence
  await kontext.confirmTask({
    taskId: task.id,
    evidence: { txHash: payment.txHash },
  });

  return { valid: true, taskId: task.id };
}

// ============================================================================
// Simulate a series of x402 micropayments
// ============================================================================

console.log('=== x402 Micropayment Verification with Kontext ===\n');

// Simulate 5 legitimate micropayments
const payments: X402PaymentHeader[] = [
  {
    paymentPayload: Buffer.from('payment-1').toString('base64'),
    txHash: '0x' + 'a1'.repeat(32),
    payer: '0x' + '1'.repeat(40),
    amount: '0.50',
    chain: 'base',
    resource: '/api/v1/ai-inference',
  },
  {
    paymentPayload: Buffer.from('payment-2').toString('base64'),
    txHash: '0x' + 'b2'.repeat(32),
    payer: '0x' + '1'.repeat(40),
    amount: '1.00',
    chain: 'base',
    resource: '/api/v1/image-gen',
  },
  {
    paymentPayload: Buffer.from('payment-3').toString('base64'),
    txHash: '0x' + 'c3'.repeat(32),
    payer: '0x' + '2'.repeat(40),
    amount: '0.25',
    chain: 'base',
    resource: '/api/v1/embeddings',
  },
  // This one should be BLOCKED -- payer is a Tornado Cash address
  {
    paymentPayload: Buffer.from('payment-4').toString('base64'),
    txHash: '0x' + 'd4'.repeat(32),
    payer: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    amount: '0.10',
    chain: 'base',
    resource: '/api/v1/ai-inference',
  },
  {
    paymentPayload: Buffer.from('payment-5').toString('base64'),
    txHash: '0x' + 'e5'.repeat(32),
    payer: '0x' + '3'.repeat(40),
    amount: '2.00',
    chain: 'ethereum',
    resource: '/api/v1/ai-inference',
  },
];

for (const payment of payments) {
  const result = await verifyX402Payment(payment);
  const status = result.valid ? 'ACCEPTED' : 'BLOCKED';
  console.log(
    `[${status}] ${payment.amount} USDC from ${payment.payer.slice(0, 10)}... for ${payment.resource}` +
    (result.reason ? ` -- ${result.reason}` : ''),
  );
}

// ============================================================================
// Generate compliance summary
// ============================================================================

console.log('\n=== Compliance Summary ===\n');

// Trust score for the verifier agent
const score = await kontext.getTrustScore('x402-verifier');
console.log(`Verifier trust score: ${score.score}/100 (${score.level})`);

// Export audit trail
const auditExport = await kontext.export({ format: 'json', includeAnomalies: true });
const auditData = JSON.parse(auditExport.data);
console.log(`Total actions logged: ${auditData.actions.length}`);
console.log(`Total transactions: ${auditData.transactions.length}`);
console.log(`Anomalies detected: ${auditData.anomalies.length}`);

// Digest chain integrity
const verification = kontext.verifyDigestChain();
console.log(`Digest chain valid: ${verification.valid} (${verification.linksVerified} links)`);
console.log(`Terminal digest: ${kontext.getTerminalDigest().slice(0, 16)}...`);

// Persist state and shut down
await kontext.flush();
await kontext.destroy();

console.log('\nAll state persisted. Audit trail available in ./x402-kontext-data/');
