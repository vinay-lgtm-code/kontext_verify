// ============================================================================
// kontext reconcile — on-chain reserve supply reconciliation
// ============================================================================

import { Kontext, FileStorage } from 'kontext-sdk';
import type { Token, Chain, ReserveSnapshot } from 'kontext-sdk';

interface ReconcileArgs {
  token: Token;
  chain: Chain;
  rpc: string;
  published?: string;
  tolerance?: string;
  agent: string;
  json: boolean;
}

export async function runReconcile(args: ReconcileArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);
  const kontext = Kontext.init({
    projectId: 'cli',
    environment: 'production',
    storage,
  });

  await kontext.restore();

  const snapshot = await kontext.logReserveSnapshot({
    token: args.token,
    chain: args.chain,
    rpcUrl: args.rpc,
    publishedReserves: args.published,
    tolerance: args.tolerance ? parseFloat(args.tolerance) : undefined,
    agentId: args.agent,
  });

  const chainLength = kontext.verifyDigestChain().valid
    ? kontext.exportDigestChain().links.length
    : 0;

  await kontext.flush();
  await kontext.destroy();

  if (args.json) {
    process.stdout.write(JSON.stringify({ ...snapshot, digestChainIndex: chainLength }, null, 2) + '\n');
    return;
  }

  printHumanReadable(snapshot, chainLength);
}

function formatNumber(n: string): string {
  const num = parseFloat(n);
  if (isNaN(num)) return n;
  return num.toLocaleString('en-US');
}

function statusLabel(status: ReserveSnapshot['reconciliationStatus']): string {
  switch (status) {
    case 'matched': return '\u2713 matched';
    case 'delta_within_tolerance': return '\u2713 within tolerance';
    case 'discrepancy': return '\u2717 discrepancy';
    case 'unverified': return '? unverified (no published reserves)';
    default: return status;
  }
}

function printHumanReadable(s: ReserveSnapshot, chainIndex: number): void {
  const lines = [
    '',
    'Reserve Reconciliation',
    `  token          ${s.token}`,
    `  chain          ${s.chain}`,
    `  block          #${s.snapshotBlockNumber.toLocaleString()}`,
    `  block_hash     ${s.snapshotBlockHash.slice(0, 18)}...`,
    `  supply         ${formatNumber(s.onChainSupply)}`,
  ];

  if (s.publishedReserves !== undefined) {
    lines.push(`  published      ${formatNumber(s.publishedReserves)}`);
  }
  if (s.delta !== undefined) {
    const pct = (parseFloat(s.delta) * 100).toFixed(4);
    lines.push(`  delta          ${pct}%`);
  }

  lines.push(`  status         ${statusLabel(s.reconciliationStatus)}`);
  lines.push(`  digest         #${chainIndex} in chain`);
  lines.push('');

  process.stdout.write(lines.join('\n') + '\n');
}
