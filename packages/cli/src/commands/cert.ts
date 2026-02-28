// ============================================================================
// kontext cert — export compliance certificate
// ============================================================================

import { Kontext, FileStorage } from 'kontext-sdk';
import type { ActionLog } from 'kontext-sdk';
import * as fs from 'fs';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

interface CertArgs {
  agent: string;
  output?: string;
  json: boolean;
}

function verifyChainFromActions(actions: ActionLog[]): { valid: boolean; terminalDigest: string; chainLength: number } {
  if (actions.length === 0) {
    return { valid: true, terminalDigest: GENESIS_HASH, chainLength: 0 };
  }
  const sorted = [...actions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  let expectedPrior = GENESIS_HASH;
  let lastDigest = GENESIS_HASH;
  for (const action of sorted) {
    if (!action.digest || !action.priorDigest) continue;
    if (action.priorDigest !== expectedPrior) {
      return { valid: false, terminalDigest: lastDigest, chainLength: sorted.length };
    }
    expectedPrior = action.digest;
    lastDigest = action.digest;
  }
  return { valid: true, terminalDigest: lastDigest, chainLength: sorted.length };
}

export async function runCert(args: CertArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);
  const kontext = Kontext.init({
    projectId: 'cli',
    environment: 'production',
    storage,
  });

  await kontext.restore();

  // Generate certificate (trust score, action counts come from client)
  const cert = await kontext.generateComplianceCertificate({
    agentId: args.agent,
    includeReasoning: true,
  });

  // Override digest chain verification with direct action-based verification
  // (the in-memory DigestChain is empty after restore — verify from stored digests)
  const actions = kontext.getActions();
  const chainVerification = verifyChainFromActions(actions);

  const fixedCert = {
    ...cert,
    digestChain: {
      terminalDigest: chainVerification.terminalDigest,
      chainLength: chainVerification.chainLength,
      verified: chainVerification.valid,
    },
    disclaimer: 'Regulatory responsibility remains with the operator.',
  };

  if (args.output) {
    fs.writeFileSync(args.output, JSON.stringify(fixedCert, null, 2), 'utf-8');
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(fixedCert, null, 2) + '\n');
  } else {
    process.stdout.write(`Certificate generated\n`);
    process.stdout.write(`Actions: ${cert.summary.actions} | Trust Score: ${cert.trustScore}/100 | Chain: ${chainVerification.valid ? 'VALID' : 'INVALID'}\n`);
    process.stdout.write(`SHA-256: ${cert.contentHash.slice(0, 16)}...\n`);
    if (args.output) {
      process.stdout.write(`Saved to: ${args.output}\n`);
    }
  }

  await kontext.destroy();
}
