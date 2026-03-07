// ============================================================================
// Kontext Demo — Payment Control Plane (Phase A)
// ============================================================================
// Demonstrates the full payment attempt lifecycle:
//   1. Workspace profile creation
//   2. Payment attempt start -> 8-stage lifecycle -> completion
//   3. Policy authorization via ReceiptLedger
//   4. Provider adapter event normalization
//   5. Attempt filtering and listing
//   6. Digest chain verification
//
// Run with: pnpm start (from packages/demo/)

import {
  Kontext,
  defaultWorkspaceProfile,
  STAGE_ORDER,
  EVMAdapter,
  DigestChain,
  verifyExportedChain,
} from 'kontext-sdk';
import type {
  StartAttemptInput,
} from 'kontext-sdk';

// ============================================================================
// Utilities
// ============================================================================

function divider(title: string): void {
  const line = '='.repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function stageIcon(status: string): string {
  switch (status) {
    case 'succeeded': return '\x1b[32m[OK]\x1b[0m';
    case 'failed': return '\x1b[31m[FAIL]\x1b[0m';
    case 'review': return '\x1b[33m[REVIEW]\x1b[0m';
    case 'pending': return '\x1b[90m[...]\x1b[0m';
    default: return `[${status}]`;
  }
}

// Simulated addresses
const TREASURY_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18';
const VENDOR_A = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72';
const VENDOR_B = '0xdD2FD4581271e230360230F9337D5c0430Bf44C0';
const PAYROLL_ADDR = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

// ============================================================================
// Main Demo
// ============================================================================

async function main(): Promise<void> {
  console.log(`
  ╔══════════════════════════════════════════════════════════════════╗
  ║                                                                  ║
  ║        Kontext — Cross-Surface Payment Control Plane             ║
  ║                                                                  ║
  ║   8-stage payment lifecycle for stablecoin transfers              ║
  ║   Base | Ethereum | Solana — USDC, EURC, USDT                    ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝
  `);

  // --------------------------------------------------------------------------
  // Step 1: Create Workspace Profile
  // --------------------------------------------------------------------------
  divider('STEP 1: Workspace Profile');

  const profile = defaultWorkspaceProfile(
    'demo-workspace',
    'Acme Treasury',
    ['invoicing', 'treasury'],
  );

  console.log(`  Workspace:  ${profile.name} (${profile.workspaceId})`);
  console.log(`  Archetypes: ${profile.archetypes.join(', ')}`);
  console.log(`  Chains:     ${profile.chains.join(', ')}`);
  console.log(`  Assets:     ${profile.assets.join(', ')}`);
  console.log(`  Posture:    ${profile.policyPosture}`);
  console.log(`  Policies:`);
  for (const [arch, policy] of Object.entries(profile.policies)) {
    if (policy) {
      console.log(`    ${arch}: max tx $${policy.maxTransactionAmount}, daily limit $${policy.dailyAggregateLimit}`);
    }
  }

  // --------------------------------------------------------------------------
  // Step 2: Initialize SDK
  // --------------------------------------------------------------------------
  divider('STEP 2: Initialize SDK');

  const kontext = Kontext.inMemory({
    projectId: 'demo-workspace',
    environment: 'development',
  });

  console.log('  SDK initialized (in-memory mode)');
  console.log('  Stage taxonomy: ' + STAGE_ORDER.join(' -> '));

  // --------------------------------------------------------------------------
  // Step 3: Happy Path — Full Payment Lifecycle
  // --------------------------------------------------------------------------
  divider('STEP 3: Full Payment Lifecycle (Invoicing)');

  console.log('  Scenario: $5,000 USDC invoice payment from treasury to vendor\n');

  // Start attempt
  const attempt = await kontext.start({
    workspaceRef: 'demo-workspace',
    appRef: 'treasury-bot',
    archetype: 'invoicing',
    intentCurrency: 'USD',
    settlementAsset: 'USDC',
    chain: 'base',
    senderRefs: { address: TREASURY_WALLET, name: 'Treasury' },
    recipientRefs: { address: VENDOR_A, name: 'Vendor A', invoiceId: 'INV-2026-042' },
    executionSurface: 'sdk',
  });

  console.log(`  [intent]     Attempt started: ${attempt.attemptId}`);
  console.log(`               State: ${attempt.finalState}`);
  await sleep(100);

  // Authorize
  const { receipt } = await kontext.authorize(attempt.attemptId, {
    chain: 'base',
    token: 'USDC',
    amount: '5000',
    from: TREASURY_WALLET.toLowerCase(),
    to: VENDOR_A.toLowerCase(),
    actorId: 'treasury-bot',
  });
  console.log(`  [authorize]  Decision: ${receipt.decision.toUpperCase()} (receipt: ${receipt.receiptId})`);
  await sleep(100);

  // Prepare
  await kontext.record(attempt.attemptId, 'prepare', {
    status: 'succeeded',
    actorSide: 'provider',
    code: 'CIRCLE_WALLET_READY',
    message: 'Circle wallet funded and ready for transfer',
    timestamp: new Date().toISOString(),
  });
  console.log(`  [prepare]    Circle wallet ready`);
  await sleep(100);

  // Transmit (broadcast)
  const txHash = '0x' + 'a'.repeat(62) + '42';
  await kontext.broadcast(attempt.attemptId, txHash, 'base');
  console.log(`  [transmit]   Broadcast: ${shortAddr(txHash)}`);
  await sleep(200);

  // Confirm
  await kontext.confirm(attempt.attemptId, {
    txHash,
    blockNumber: 18234567,
    confirmations: 12,
    chain: 'base',
  });
  console.log(`  [confirm]    Confirmed at block 18234567`);
  await sleep(100);

  // Recipient credit
  await kontext.credit(attempt.attemptId, {
    confirmedAt: new Date().toISOString(),
    providerRef: 'circle-transfer-001',
  });
  console.log(`  [credit]     Recipient credited`);
  await sleep(100);

  // Reconcile
  await kontext.record(attempt.attemptId, 'reconcile', {
    status: 'succeeded',
    actorSide: 'internal',
    code: 'RECONCILED',
    message: 'Payment reconciled with invoice INV-2026-042',
    timestamp: new Date().toISOString(),
    payload: { invoiceId: 'INV-2026-042', matchScore: 1.0 },
  });
  console.log(`  [reconcile]  Matched to INV-2026-042`);

  // Final state
  const completed = await kontext.get(attempt.attemptId);
  console.log(`\n  Final State: \x1b[32m${completed!.finalState.toUpperCase()}\x1b[0m`);
  console.log(`  Stage Events: ${completed!.stageEvents.length}`);

  // Print stage timeline
  console.log(`\n  Timeline:`);
  for (const e of completed!.stageEvents) {
    console.log(`    ${e.stage.padEnd(18)} ${stageIcon(e.status)} ${e.code}: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Step 4: Failed Payment (Policy Block)
  // --------------------------------------------------------------------------
  divider('STEP 4: Blocked Payment (Policy Violation)');

  console.log('  Scenario: $60,000 USDC — exceeds max transaction limit\n');

  const blocked = await kontext.start({
    workspaceRef: 'demo-workspace',
    appRef: 'treasury-bot',
    archetype: 'treasury',
    intentCurrency: 'USD',
    settlementAsset: 'USDC',
    chain: 'base',
    senderRefs: { address: TREASURY_WALLET },
    recipientRefs: { address: VENDOR_B },
    executionSurface: 'sdk',
  });

  console.log(`  [intent]     Attempt started: ${blocked.attemptId}`);

  const { attempt: blockedAttempt, receipt: blockReceipt } = await kontext.authorize(blocked.attemptId, {
    chain: 'base',
    token: 'USDC',
    amount: '60000',
    from: TREASURY_WALLET.toLowerCase(),
    to: VENDOR_B.toLowerCase(),
    actorId: 'treasury-bot',
  });

  console.log(`  [authorize]  Decision: \x1b[31m${blockReceipt.decision.toUpperCase()}\x1b[0m`);

  const authEvent = blockedAttempt.stageEvents.find(e => e.stage === 'authorize');
  if (authEvent) {
    console.log(`               Code: ${authEvent.code}`);
    console.log(`               Message: ${authEvent.message}`);
  }

  if (blockReceipt.violations.length > 0) {
    console.log(`  Violations:`);
    for (const v of blockReceipt.violations) {
      console.log(`    - [${v.severity}] ${v.code}: ${v.message}`);
    }
  }

  console.log(`\n  Final State: \x1b[31m${blockedAttempt.finalState.toUpperCase()}\x1b[0m`);

  // --------------------------------------------------------------------------
  // Step 5: Multiple Attempts + Listing
  // --------------------------------------------------------------------------
  divider('STEP 5: Batch Operations + Listing');

  const payrollInputs: StartAttemptInput[] = [
    {
      workspaceRef: 'demo-workspace',
      appRef: 'payroll-bot',
      archetype: 'invoicing',
      intentCurrency: 'USD',
      settlementAsset: 'USDC',
      chain: 'base',
      senderRefs: { address: TREASURY_WALLET },
      recipientRefs: { address: PAYROLL_ADDR, name: 'Employee 1' },
      executionSurface: 'sdk',
    },
    {
      workspaceRef: 'demo-workspace',
      appRef: 'payroll-bot',
      archetype: 'invoicing',
      intentCurrency: 'EUR',
      settlementAsset: 'EURC',
      chain: 'ethereum',
      senderRefs: { address: TREASURY_WALLET },
      recipientRefs: { address: VENDOR_B, name: 'EU Vendor' },
      executionSurface: 'sdk',
    },
  ];

  for (const input of payrollInputs) {
    const a = await kontext.start(input);
    console.log(`  Started: ${a.attemptId} (${a.archetype} on ${a.chain})`);
  }

  // List all attempts
  const all = kontext.list();
  console.log(`\n  Total attempts: ${all.length}`);
  console.log(`  ─────────────────────────────────────────────────────────`);

  for (const a of all) {
    const stages = a.stageEvents.length;
    const state = a.finalState.padEnd(10);
    console.log(`  ${a.attemptId.slice(0, 20).padEnd(20)} ${state} ${a.archetype.padEnd(12)} ${a.chain.padEnd(8)} stages:${stages}`);
  }

  // Filter by archetype
  const invoicing = kontext.list({ archetype: 'invoicing' });
  console.log(`\n  Invoicing attempts: ${invoicing.length}`);

  // Filter by chain
  const ethOnly = kontext.list({ chain: 'ethereum' });
  console.log(`  Ethereum attempts: ${ethOnly.length}`);

  // Filter by final state
  const failed = kontext.list({ finalState: 'blocked' });
  console.log(`  Blocked attempts: ${failed.length}`);

  // --------------------------------------------------------------------------
  // Step 6: Provider Adapter (EVM)
  // --------------------------------------------------------------------------
  divider('STEP 6: Provider Adapter — EVM Event Normalization');

  const evmAdapter = new EVMAdapter();
  const evmEvents = [
    evmAdapter.normalizeEvent({
      type: 'prepare',
      gasEstimate: '21000',
      timestamp: new Date().toISOString(),
    }),
    evmAdapter.normalizeEvent({
      type: 'transmit',
      txHash: '0xfeed1234' + '0'.repeat(56),
      timestamp: new Date().toISOString(),
    }),
    evmAdapter.normalizeEvent({
      type: 'confirm',
      txHash: '0xfeed1234' + '0'.repeat(56),
      blockNumber: 18234999,
      confirmations: 12,
      timestamp: new Date().toISOString(),
    }),
  ];

  for (const event of evmEvents) {
    console.log(`  ${event.stage.padEnd(12)} ${stageIcon(event.status)} ${event.code}: ${event.message}`);
  }
  console.log(`  Provider: ${evmAdapter.name}`);

  // --------------------------------------------------------------------------
  // Step 7: Digest Chain
  // --------------------------------------------------------------------------
  divider('STEP 7: Tamper-Evident Digest Chain');

  console.log('  Kontext digest chain: SHA-256 rolling hash over all events');
  console.log('  Formula: H_n = SHA-256(H_{n-1} || Serialize(Event) || Salt)\n');

  // Use the lower-level DigestChain directly for demo
  const digestChain = new DigestChain();
  const now = new Date().toISOString();
  const baseAction = { timestamp: now, projectId: 'demo', agentId: 'bot', correlationId: 'c1', metadata: {} };

  const actions = [
    { ...baseAction, id: 'act_1', type: 'intent', description: 'Start $5,000 USDC payment' },
    { ...baseAction, id: 'act_2', type: 'authorize', description: 'Policy check: ALLOW' },
    { ...baseAction, id: 'act_3', type: 'transmit', description: 'Broadcast tx 0xabc...' },
    { ...baseAction, id: 'act_4', type: 'confirm', description: 'Confirmed at block 18234567' },
  ];

  for (const action of actions) {
    digestChain.append(action);
  }

  const genesisHash = '0'.repeat(64);
  const links = digestChain.getLinks();
  const terminalDigest = digestChain.getTerminalDigest();

  console.log(`  Genesis Hash: ${genesisHash.slice(0, 24)}...`);
  console.log(`  Links: ${links.length}`);
  console.log(`  Terminal Digest: ${terminalDigest.slice(0, 24)}...`);

  for (const link of links) {
    console.log(`    [${link.sequence}] ${link.digest.slice(0, 32)}... (${link.actionId})`);
  }

  const exportedChain = { genesisHash, links: [...links], terminalDigest };
  const verification = verifyExportedChain(exportedChain, actions);
  const validIcon = verification.valid ? '\x1b[32mVALID\x1b[0m' : '\x1b[31mINVALID\x1b[0m';
  console.log(`\n  Chain Integrity: ${validIcon}`);
  console.log(`  Links Verified: ${verification.linksVerified}`);

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  divider('DEMO COMPLETE');

  console.log('  Phase A Payment Control Plane — all components functional:\n');
  console.log('    [x] Workspace profiles with archetype-specific policies');
  console.log('    [x] PaymentAttempt lifecycle (8 stages)');
  console.log('    [x] Policy authorization (ReceiptLedger integration)');
  console.log('    [x] Stage event recording and ordering validation');
  console.log('    [x] Provider adapter event normalization (EVM)');
  console.log('    [x] Attempt listing with filters');
  console.log('    [x] Tamper-evident digest chain');
  console.log('    [x] Happy path: intent -> reconcile (succeeded)');
  console.log('    [x] Blocked path: policy violation (blocked)');
  console.log('');
  console.log('  Next: Phase B — notifications, CSV export, ops dashboard');
  console.log('');
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
