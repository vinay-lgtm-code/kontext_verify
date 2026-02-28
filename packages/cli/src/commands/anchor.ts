// ============================================================================
// kontext anchor — anchor terminal digest on-chain (Base)
// ============================================================================

import { FileStorage } from 'kontext-sdk';
import type { ActionLog } from 'kontext-sdk';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

interface AnchorArgs {
  rpc: string;
  contract: string;
  key: string;
  json: boolean;
}

export async function runAnchor(args: AnchorArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);

  // Load terminal digest from persisted actions
  const rawActions = await storage.load('kontext:actions');
  const actions: ActionLog[] = Array.isArray(rawActions) ? rawActions : [];

  if (actions.length === 0) {
    process.stderr.write('No actions found. Run "kontext verify" first to create a digest chain.\n');
    process.exit(2);
  }

  // Get terminal digest (last action's digest)
  const sorted = [...actions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const lastAction = sorted[sorted.length - 1]!;
  const terminalDigest = lastAction.digest ?? GENESIS_HASH;

  if (terminalDigest === GENESIS_HASH) {
    process.stderr.write('Digest chain is empty. Run "kontext verify" first.\n');
    process.exit(2);
  }

  // Dynamic import of on-chain module
  const { anchorDigest } = await import('kontext-sdk/dist/onchain.mjs').catch(async () => {
    // Fallback: try direct SDK import
    const mod = await import('kontext-sdk');
    return { anchorDigest: (mod as any).anchorDigest };
  });

  const result = await anchorDigest(
    {
      rpcUrl: args.rpc,
      contractAddress: args.contract,
      privateKey: args.key,
    },
    terminalDigest,
    'cli',
  );

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(`Digest:          ${result.digest.slice(0, 16)}...\n`);
    process.stdout.write(`TX Hash:         ${result.txHash}\n`);
    process.stdout.write(`Block:           ${result.blockNumber}\n`);
    process.stdout.write(`Chain:           ${result.chain}\n`);
    process.stdout.write(`Contract:        ${result.contractAddress}\n`);
    process.stdout.write(`Anchored on-chain.\n`);
  }
}
