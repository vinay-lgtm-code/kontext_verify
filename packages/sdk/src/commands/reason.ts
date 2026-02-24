// ============================================================================
// kontext reason — log agent reasoning into digest chain
// ============================================================================

import { Kontext } from '../client.js';
import { FileStorage } from '../storage.js';

interface ReasonArgs {
  text: string;
  agent: string;
  session?: string;
  step?: number;
  json: boolean;
}

export async function runReason(args: ReasonArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);
  const kontext = Kontext.init({
    projectId: 'cli',
    environment: 'production',
    storage,
  });

  await kontext.restore();

  const entry = await kontext.logReasoning({
    agentId: args.agent,
    sessionId: args.session,
    step: args.step,
    action: 'cli-reason',
    reasoning: args.text,
  });

  await kontext.flush();

  if (args.json) {
    process.stdout.write(JSON.stringify(entry, null, 2) + '\n');
  } else {
    const stepStr = args.step !== undefined ? `Step ${args.step}` : 'Step ?';
    const digest = kontext.getTerminalDigest();
    process.stdout.write(`Reasoning logged | ${stepStr} | Digest: ${digest.slice(0, 16)}...\n`);
  }

  await kontext.destroy();
}
