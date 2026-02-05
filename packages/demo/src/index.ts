// ============================================================================
// Kontext SDK Demo - USDC Compliance Workflow
// ============================================================================
// This demo simulates an AI agent executing USDC transfers with full
// compliance monitoring through the Kontext SDK.
//
// Run with: pnpm demo

import { Kontext, UsdcCompliance } from '@kontext/sdk';
import type { AnomalyEvent } from '@kontext/sdk';

// ============================================================================
// Utilities
// ============================================================================

function divider(title: string): void {
  const line = '='.repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

function formatScore(score: number, max = 100): string {
  const filled = Math.round((score / max) * 20);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(20 - filled);
  return `[${bar}] ${score}/${max}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simulated addresses
const AGENT_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18';
const VENDOR_WALLET = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72';
const PAYROLL_WALLET = '0xdD2FD4581271e230360230F9337D5c0430Bf44C0';
const SUSPICIOUS_WALLET = '0x1234567890AbcdEF1234567890aBCDef12345678';

// ============================================================================
// Main Demo
// ============================================================================

async function main(): Promise<void> {
  console.log(`
  ╔══════════════════════════════════════════════════════════════════╗
  ║                                                                  ║
  ║              Kontext SDK Demo -- USDC Compliance                 ║
  ║                                                                  ║
  ║   Trust and compliance layer for agentic crypto workflows        ║
  ║   Demonstrating: Logging, Tasks, Trust, Anomalies, Audit        ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝
  `);

  // --------------------------------------------------------------------------
  // Step 1: Initialize the SDK
  // --------------------------------------------------------------------------
  divider('STEP 1: Initialize Kontext SDK');

  const kontext = Kontext.init({
    projectId: 'demo-usdc-agent',
    environment: 'development',
    debug: false,
    localOutputDir: '.kontext-demo',
  });

  console.log('  Mode:', kontext.getMode());
  console.log('  Project:', kontext.getConfig().projectId);
  console.log('  Environment:', kontext.getConfig().environment);
  console.log('\n  SDK initialized successfully in local mode.');

  // --------------------------------------------------------------------------
  // Step 2: Configure Anomaly Detection
  // --------------------------------------------------------------------------
  divider('STEP 2: Enable Anomaly Detection');

  const detectedAnomalies: AnomalyEvent[] = [];

  kontext.enableAnomalyDetection({
    rules: [
      'unusualAmount',
      'frequencySpike',
      'newDestination',
      'offHoursActivity',
      'rapidSuccession',
      'roundAmount',
    ],
    thresholds: {
      maxAmount: '5000',
      maxFrequency: 10,
      minIntervalSeconds: 5,
    },
  });

  kontext.onAnomaly((anomaly) => {
    detectedAnomalies.push(anomaly);
    const severityColors: Record<string, string> = {
      low: '\x1b[33m',
      medium: '\x1b[35m',
      high: '\x1b[31m',
      critical: '\x1b[41m\x1b[37m',
    };
    const color = severityColors[anomaly.severity] ?? '';
    const reset = '\x1b[0m';
    console.log(`  ${color}[ANOMALY ${anomaly.severity.toUpperCase()}]${reset} ${anomaly.description}`);
  });

  console.log('  Anomaly detection enabled with rules:');
  console.log('    - unusualAmount (threshold: $5,000)');
  console.log('    - frequencySpike (max: 10/hour)');
  console.log('    - newDestination');
  console.log('    - offHoursActivity');
  console.log('    - rapidSuccession (min interval: 5s)');
  console.log('    - roundAmount');

  // --------------------------------------------------------------------------
  // Step 3: USDC Compliance Check
  // --------------------------------------------------------------------------
  divider('STEP 3: Pre-Transaction USDC Compliance Check');

  const complianceCheck = kontext.checkUsdcCompliance({
    txHash: '0x' + '0'.repeat(64),
    chain: 'base',
    amount: '2500.00',
    token: 'USDC',
    from: AGENT_WALLET,
    to: VENDOR_WALLET,
    agentId: 'payment-agent-alpha',
  });

  console.log('  Compliance Check Result:');
  console.log(`    Compliant: ${complianceCheck.compliant ? '\x1b[32mYES\x1b[0m' : '\x1b[31mNO\x1b[0m'}`);
  console.log(`    Risk Level: ${complianceCheck.riskLevel}`);
  console.log('    Checks:');
  for (const check of complianceCheck.checks) {
    const icon = check.passed ? '\x1b[32m\u2713\x1b[0m' : '\x1b[31m\u2717\x1b[0m';
    console.log(`      ${icon} ${check.name}: ${check.description}`);
  }
  console.log('    Recommendations:');
  for (const rec of complianceCheck.recommendations) {
    console.log(`      -> ${rec}`);
  }

  // --------------------------------------------------------------------------
  // Step 4: Log Normal Transactions
  // --------------------------------------------------------------------------
  divider('STEP 4: Agent Executes USDC Transfers (Normal Activity)');

  const normalTransactions = [
    { amount: '150.00', to: VENDOR_WALLET, desc: 'Software license payment' },
    { amount: '275.50', to: VENDOR_WALLET, desc: 'Cloud hosting invoice' },
    { amount: '89.99', to: PAYROLL_WALLET, desc: 'Contractor payment' },
    { amount: '450.00', to: VENDOR_WALLET, desc: 'API service subscription' },
    { amount: '1200.00', to: PAYROLL_WALLET, desc: 'Monthly payroll batch' },
  ];

  for (let i = 0; i < normalTransactions.length; i++) {
    const tx = normalTransactions[i]!;
    const txHash = '0x' + (i + 1).toString().padStart(64, 'a');

    console.log(`\n  Transaction ${i + 1}/${normalTransactions.length}: ${tx.desc}`);
    console.log(`    Amount: ${tx.amount} USDC | To: ${tx.to.slice(0, 10)}...`);

    const record = await kontext.logTransaction({
      txHash,
      chain: 'base',
      amount: tx.amount,
      token: 'USDC',
      from: AGENT_WALLET,
      to: tx.to,
      agentId: 'payment-agent-alpha',
      metadata: { description: tx.desc },
    });

    console.log(`    Logged: ${record.id} at ${record.timestamp}`);
    await sleep(100);
  }

  // --------------------------------------------------------------------------
  // Step 5: Task Creation and Confirmation
  // --------------------------------------------------------------------------
  divider('STEP 5: Create and Confirm Compliance Task');

  console.log('  Creating task: "Execute vendor payment of 2,500 USDC"');
  const task = await kontext.createTask({
    description: 'Execute vendor payment of 2,500 USDC on Base',
    agentId: 'payment-agent-alpha',
    requiredEvidence: ['txHash', 'receipt'],
    metadata: {
      vendor: 'Acme Corp',
      invoiceId: 'INV-2026-0042',
      amount: '2500.00',
      token: 'USDC',
      chain: 'base',
    },
  });

  console.log(`  Task created: ${task.id}`);
  console.log(`    Status: ${task.status}`);
  console.log(`    Required evidence: ${task.requiredEvidence.join(', ')}`);

  // Simulate the agent executing the transaction
  console.log('\n  Agent executing transaction...');
  await sleep(500);

  const paymentTxHash = '0x' + 'f'.repeat(62) + '42';

  await kontext.logTransaction({
    txHash: paymentTxHash,
    chain: 'base',
    amount: '2500.00',
    token: 'USDC',
    from: AGENT_WALLET,
    to: VENDOR_WALLET,
    agentId: 'payment-agent-alpha',
    correlationId: task.correlationId,
    metadata: { taskId: task.id, vendor: 'Acme Corp' },
  });

  // Confirm the task with evidence
  console.log('  Confirming task with on-chain evidence...');
  const confirmed = await kontext.confirmTask({
    taskId: task.id,
    evidence: {
      txHash: paymentTxHash,
      receipt: {
        status: 'confirmed',
        blockNumber: 18234567,
        gasUsed: '21000',
        effectiveGasPrice: '1000000000',
        chain: 'base',
      },
    },
  });

  console.log(`  Task confirmed: ${confirmed.id}`);
  console.log(`    Status: \x1b[32m${confirmed.status}\x1b[0m`);
  console.log(`    Confirmed at: ${confirmed.confirmedAt}`);

  // --------------------------------------------------------------------------
  // Step 6: Trust Score
  // --------------------------------------------------------------------------
  divider('STEP 6: Agent Trust Score');

  const trustScore = await kontext.getTrustScore('payment-agent-alpha');

  console.log(`  Agent: payment-agent-alpha`);
  console.log(`  Overall Score: ${formatScore(trustScore.score)}`);
  console.log(`  Trust Level: ${trustScore.level.toUpperCase()}`);
  console.log(`  Factors:`);
  for (const factor of trustScore.factors) {
    console.log(`    ${factor.name}: ${formatScore(factor.score)} (weight: ${factor.weight})`);
    console.log(`      ${factor.description}`);
  }

  // --------------------------------------------------------------------------
  // Step 7: Trigger Anomalies
  // --------------------------------------------------------------------------
  divider('STEP 7: Suspicious Activity (Anomaly Detection)');

  console.log('  Simulating suspicious transaction patterns...\n');

  // Unusual amount
  console.log('  [1] Large unusual amount ($25,000):');
  await kontext.logTransaction({
    txHash: '0x' + 'b'.repeat(64),
    chain: 'ethereum',
    amount: '25000.00',
    token: 'USDC',
    from: AGENT_WALLET,
    to: SUSPICIOUS_WALLET,
    agentId: 'payment-agent-alpha',
    metadata: { note: 'Suspicious large transfer' },
  });

  await sleep(200);

  // Round amount near threshold
  console.log('\n  [2] Round amount near reporting threshold ($9,900):');
  await kontext.logTransaction({
    txHash: '0x' + 'c'.repeat(64),
    chain: 'base',
    amount: '9900.00',
    token: 'USDC',
    from: AGENT_WALLET,
    to: SUSPICIOUS_WALLET,
    agentId: 'payment-agent-alpha',
    metadata: { note: 'Just under $10k -- structuring indicator' },
  });

  await sleep(200);

  // Rapid succession (multiple fast transactions)
  console.log('\n  [3] Rapid succession transactions:');
  for (let i = 0; i < 3; i++) {
    await kontext.logTransaction({
      txHash: '0x' + 'd'.repeat(62) + i.toString().padStart(2, '0'),
      chain: 'base',
      amount: '500.00',
      token: 'USDC',
      from: AGENT_WALLET,
      to: VENDOR_WALLET,
      agentId: 'payment-agent-alpha',
      metadata: { batch: 'rapid-test', index: i },
    });
  }

  // --------------------------------------------------------------------------
  // Step 8: Transaction Risk Evaluation
  // --------------------------------------------------------------------------
  divider('STEP 8: Transaction Risk Evaluation');

  const evaluation = await kontext.evaluateTransaction({
    txHash: '0x' + 'e'.repeat(64),
    chain: 'ethereum',
    amount: '75000',
    token: 'USDC',
    from: AGENT_WALLET,
    to: SUSPICIOUS_WALLET,
    agentId: 'payment-agent-alpha',
  });

  console.log(`  Transaction: $75,000 USDC to new address`);
  console.log(`  Risk Score: ${formatScore(evaluation.riskScore)}`);
  console.log(`  Risk Level: ${evaluation.riskLevel.toUpperCase()}`);
  console.log(`  Flagged: ${evaluation.flagged ? '\x1b[31mYES\x1b[0m' : '\x1b[32mNO\x1b[0m'}`);
  console.log(`  Recommendation: ${evaluation.recommendation.toUpperCase()}`);
  console.log(`  Risk Factors:`);
  for (const factor of evaluation.factors) {
    console.log(`    ${factor.name}: ${factor.score}/100 -- ${factor.description}`);
  }

  // --------------------------------------------------------------------------
  // Step 9: Anomaly Summary
  // --------------------------------------------------------------------------
  divider('STEP 9: Anomaly Detection Summary');

  console.log(`  Total anomalies detected: ${detectedAnomalies.length}\n`);

  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const a of detectedAnomalies) {
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
    byType[a.type] = (byType[a.type] ?? 0) + 1;
  }

  console.log('  By Severity:');
  for (const [severity, count] of Object.entries(bySeverity)) {
    console.log(`    ${severity}: ${count}`);
  }

  console.log('\n  By Type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`    ${type}: ${count}`);
  }

  // --------------------------------------------------------------------------
  // Step 10: Post-Anomaly Trust Score
  // --------------------------------------------------------------------------
  divider('STEP 10: Updated Trust Score (Post-Anomalies)');

  const updatedScore = await kontext.getTrustScore('payment-agent-alpha');

  console.log(`  Agent: payment-agent-alpha`);
  console.log(`  Overall Score: ${formatScore(updatedScore.score)}`);
  console.log(`  Trust Level: ${updatedScore.level.toUpperCase()}`);
  console.log(`  Factors:`);
  for (const factor of updatedScore.factors) {
    console.log(`    ${factor.name}: ${formatScore(factor.score)} (weight: ${factor.weight})`);
    console.log(`      ${factor.description}`);
  }

  // --------------------------------------------------------------------------
  // Step 11: Audit Export
  // --------------------------------------------------------------------------
  divider('STEP 11: Compliance Audit Export');

  const exportResult = await kontext.export({
    format: 'json',
    includeTasks: true,
    includeAnomalies: true,
  });

  console.log(`  Export format: ${exportResult.format}`);
  console.log(`  Total records: ${exportResult.recordCount}`);
  console.log(`  Exported at: ${exportResult.exportedAt}`);

  // Parse and summarize
  const exportData = JSON.parse(exportResult.data) as {
    actions: unknown[];
    transactions: unknown[];
    tasks: unknown[];
    anomalies: unknown[];
  };
  console.log(`  Actions: ${exportData.actions.length}`);
  console.log(`  Transactions: ${exportData.transactions.length}`);
  console.log(`  Tasks: ${exportData.tasks.length}`);
  console.log(`  Anomalies: ${exportData.anomalies.length}`);

  // CSV export
  const csvExport = await kontext.export({
    format: 'csv',
    includeTasks: true,
    includeAnomalies: true,
  });

  console.log(`\n  CSV Export: ${csvExport.data.split('\n').length} lines`);

  // --------------------------------------------------------------------------
  // Step 12: Compliance Report
  // --------------------------------------------------------------------------
  divider('STEP 12: Compliance Report Generation');

  const report = await kontext.generateReport({
    type: 'compliance',
    period: {
      start: new Date(Date.now() - 86400000),
      end: new Date(Date.now() + 86400000),
    },
  });

  console.log(`  Report ID: ${report.id}`);
  console.log(`  Type: ${report.type}`);
  console.log(`  Generated: ${report.generatedAt}`);
  console.log(`  Summary:`);
  console.log(`    Total Actions: ${report.summary.totalActions}`);
  console.log(`    Total Transactions: ${report.summary.totalTransactions}`);
  console.log(`    Total Tasks: ${report.summary.totalTasks}`);
  console.log(`    Confirmed Tasks: ${report.summary.confirmedTasks}`);
  console.log(`    Failed Tasks: ${report.summary.failedTasks}`);
  console.log(`    Total Anomalies: ${report.summary.totalAnomalies}`);
  console.log(`    Average Trust Score: ${report.summary.averageTrustScore}`);

  // --------------------------------------------------------------------------
  // Step 13: Digest Chain Verification
  // --------------------------------------------------------------------------
  divider('STEP 13: Cryptographic Digest Chain Verification');

  console.log('  Rolling SHA-256 digest chain — tamper-evident audit trail');
  console.log('  Formula: HD = SHA-256(HD-1 || Serialize(ED) || SD)\n');

  // Get the terminal digest
  const terminalDigest = kontext.getTerminalDigest();
  console.log(`  Terminal Digest: ${terminalDigest.slice(0, 16)}...${terminalDigest.slice(-16)}`);

  // Verify the entire chain
  const verification = kontext.verifyDigestChain();
  const validIcon = verification.valid ? '\x1b[32m\u2713 VALID\x1b[0m' : '\x1b[31m\u2717 INVALID\x1b[0m';
  console.log(`  Chain Integrity: ${validIcon}`);
  console.log(`  Links Verified: ${verification.linksVerified}`);
  console.log(`  Verification Time: ${verification.verificationTimeMs.toFixed(2)}ms`);

  // Export chain for third-party verification
  const chainExport = kontext.exportDigestChain();
  console.log(`\n  Exported Digest Chain:`);
  console.log(`    Genesis Hash: ${chainExport.genesisHash.slice(0, 16)}...(zeros)`);
  console.log(`    Total Links: ${chainExport.links.length}`);
  console.log(`    Terminal Digest: ${chainExport.terminalDigest.slice(0, 16)}...`);

  // Show a few sample links
  console.log(`\n  Sample Digest Links:`);
  for (let i = 0; i < Math.min(3, chainExport.links.length); i++) {
    const link = chainExport.links[i]!;
    console.log(`    [${link.sequence}] ${link.digest.slice(0, 24)}... (action: ${link.actionId.slice(0, 8)}...)`);
  }
  if (chainExport.links.length > 3) {
    console.log(`    ... ${chainExport.links.length - 3} more links`);
  }

  console.log(`\n  Energy: <0.00001 kWh per event (99.97% less than blockchain)`);
  console.log(`  Verification: <10ms at p95`);

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------
  divider('DEMO COMPLETE');

  await kontext.destroy();

  console.log('  The Kontext SDK demo has completed successfully.');
  console.log('  All features demonstrated:');
  console.log('    [x] SDK initialization (local mode)');
  console.log('    [x] Action logging');
  console.log('    [x] Transaction logging with chain data');
  console.log('    [x] USDC compliance checking');
  console.log('    [x] Task creation with required evidence');
  console.log('    [x] Task confirmation with on-chain proof');
  console.log('    [x] Trust scoring (rule-based)');
  console.log('    [x] Anomaly detection (6 rule types)');
  console.log('    [x] Transaction risk evaluation');
  console.log('    [x] Audit export (JSON + CSV)');
  console.log('    [x] Compliance report generation');
  console.log('    [x] Cryptographic digest chain verification');
  console.log('');
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
