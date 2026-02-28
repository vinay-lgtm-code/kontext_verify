// ============================================================================
// kontext attest — A2A attestation exchange with counterparty agent
// ============================================================================

import { FileStorage } from 'kontext-sdk';
import type { ActionLog } from 'kontext-sdk';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

interface AttestArgs {
  endpoint: string;
  agent: string;
  counterpartyAgent?: string;
  json: boolean;
}

export async function runAttest(args: AttestArgs): Promise<void> {
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

  // Dynamic import of attestation module
  const { exchangeAttestation } = await import('kontext-sdk/dist/attestation.mjs').catch(async () => {
    const mod = await import('kontext-sdk');
    return { exchangeAttestation: (mod as any).exchangeAttestation };
  });

  const result = await exchangeAttestation(
    {
      endpoint: args.endpoint,
      ...(args.counterpartyAgent ? { agentId: args.counterpartyAgent } : {}),
    },
    {
      senderDigest: terminalDigest,
      senderAgentId: args.agent,
      amount: '0',
      timestamp: new Date().toISOString(),
    },
  );

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(`Attested:        ${result.attested}\n`);
    process.stdout.write(`Agent:           ${result.agentId}\n`);
    process.stdout.write(`Digest:          ${result.digest.slice(0, 16)}...\n`);
    process.stdout.write(`Timestamp:       ${result.timestamp}\n`);
    if (result.attested) {
      process.stdout.write(`Counterparty attestation received.\n`);
    } else {
      process.stdout.write(`Counterparty did not attest.\n`);
    }
  }
}
