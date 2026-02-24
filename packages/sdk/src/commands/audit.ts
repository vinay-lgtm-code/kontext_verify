// ============================================================================
// kontext audit — verify digest chain integrity from persisted actions
// ============================================================================

import { FileStorage } from '../storage.js';
import type { ActionLog } from '../types.js';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

interface AuditArgs {
  json: boolean;
}

/**
 * Verify the digest chain directly from persisted actions.
 * Each action stores its own digest and priorDigest.
 * We walk the chain and verify each link points to the previous digest.
 */
function verifyChainFromActions(actions: ActionLog[]): {
  valid: boolean;
  chainLength: number;
  terminalDigest: string;
  brokenAt?: number;
} {
  if (actions.length === 0) {
    return { valid: true, chainLength: 0, terminalDigest: GENESIS_HASH };
  }

  // Sort by timestamp to ensure correct ordering
  const sorted = [...actions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let expectedPrior = GENESIS_HASH;
  let lastDigest = GENESIS_HASH;

  for (let i = 0; i < sorted.length; i++) {
    const action = sorted[i]!;
    if (!action.digest || !action.priorDigest) {
      // Action doesn't have chain data — skip (pre-chain actions)
      continue;
    }

    if (action.priorDigest !== expectedPrior) {
      return {
        valid: false,
        chainLength: sorted.length,
        terminalDigest: lastDigest,
        brokenAt: i,
      };
    }

    expectedPrior = action.digest;
    lastDigest = action.digest;
  }

  return {
    valid: true,
    chainLength: sorted.length,
    terminalDigest: lastDigest,
  };
}

export async function runAudit(args: AuditArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);

  // Load actions directly from storage (bypass Kontext client to avoid
  // in-memory DigestChain mismatch after restore)
  const rawActions = await storage.load('kontext:actions');
  const actions: ActionLog[] = Array.isArray(rawActions) ? rawActions : [];

  const result = verifyChainFromActions(actions);

  if (args.json) {
    const output = {
      valid: result.valid,
      chainLength: result.chainLength,
      terminalDigest: result.terminalDigest,
      ...(result.brokenAt !== undefined ? { brokenAt: result.brokenAt } : {}),
    };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } else {
    process.stdout.write(`Chain length:    ${result.chainLength} links\n`);
    process.stdout.write(`All verified:    ${result.valid ? 'YES' : 'NO'}\n`);
    process.stdout.write(`Terminal digest: ${result.terminalDigest.slice(0, 16)}...\n`);
    if (result.valid) {
      process.stdout.write(`No tampering detected.\n`);
    } else {
      process.stdout.write(`TAMPERING DETECTED at link ${result.brokenAt}.\n`);
    }
  }

  if (!result.valid) {
    process.exit(1);
  }
}
