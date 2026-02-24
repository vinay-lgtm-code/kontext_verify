// ============================================================================
// kontext verify — log + compliance check + digest proof
// ============================================================================

import { Kontext } from '../client.js';
import { FileStorage } from '../storage.js';
import type { Token, Chain } from '../types.js';

interface VerifyArgs {
  tx: string;
  amount: string;
  token: Token;
  from: string;
  to: string;
  agent: string;
  session?: string;
  json: boolean;
}

export async function runVerify(args: VerifyArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);
  const kontext = Kontext.init({
    projectId: 'cli',
    environment: 'production',
    storage,
  });

  await kontext.restore();

  const result = await kontext.verify({
    txHash: args.tx,
    chain: 'base' as Chain,
    amount: args.amount,
    token: args.token,
    from: args.from,
    to: args.to,
    agentId: args.agent,
    sessionId: args.session,
  });

  await kontext.flush();

  if (args.json) {
    const output = {
      compliant: result.compliant,
      riskLevel: result.riskLevel,
      checks: result.checks.map((c) => ({
        name: c.name,
        passed: c.passed,
        severity: c.severity,
      })),
      digestProof: result.digestProof,
      transaction: {
        id: result.transaction.id,
        txHash: result.transaction.txHash,
        timestamp: result.transaction.timestamp,
      },
      recommendations: result.recommendations,
    };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } else {
    const passed = result.checks.filter((c) => c.passed).length;
    const failed = result.checks.filter((c) => !c.passed).length;

    process.stdout.write(`Compliant:       ${result.compliant}\n`);
    process.stdout.write(`Checks:          ${passed} passed, ${failed} failed\n`);
    process.stdout.write(`Risk Level:      ${result.riskLevel}\n`);
    process.stdout.write(`Digest:          ${result.digestProof.terminalDigest.slice(0, 16)}...\n`);
    process.stdout.write(`Persisted to:    ${dataDir}/store.json\n`);
  }

  await kontext.destroy();

  if (!result.compliant) {
    process.exit(1);
  }
}
