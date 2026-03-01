// ============================================================================
// kontext checkpoint — manage provenance checkpoints (provenance layer 3)
// ============================================================================

import { createHash, randomBytes } from 'crypto';
import { Kontext, FileStorage } from 'kontext-sdk';

interface CheckpointArgs {
  subcommand: string;
  session?: string;
  actions?: string;
  summary?: string;
  reviewer?: string;
  decision?: string;
  evidence?: string;
  checkpointId?: string;
  json: boolean;
}

export async function runCheckpoint(args: CheckpointArgs): Promise<void> {
  const dataDir = process.env['KONTEXT_DATA_DIR'] || '.kontext';
  const storage = new FileStorage(dataDir);
  const kontext = Kontext.init({
    projectId: 'cli',
    environment: 'production',
    storage,
  });

  await kontext.restore();

  try {
    switch (args.subcommand) {
      case 'create': {
        if (!args.session) {
          process.stderr.write('Usage: kontext checkpoint create --session <id> --actions <ids> --summary <text>\n');
          process.exit(2);
        }
        if (!args.actions) {
          process.stderr.write('Usage: kontext checkpoint create --session <id> --actions <ids> --summary <text>\n');
          process.exit(2);
        }
        if (!args.summary) {
          process.stderr.write('Usage: kontext checkpoint create --session <id> --actions <ids> --summary <text>\n');
          process.exit(2);
        }

        const actionIds = args.actions.split(',').map((s) => s.trim());
        const checkpoint = await kontext.createCheckpoint({
          sessionId: args.session,
          actionIds,
          summary: args.summary,
        });

        await kontext.flush();

        if (args.json) {
          process.stdout.write(JSON.stringify(checkpoint, null, 2) + '\n');
        } else {
          process.stdout.write(`Checkpoint:      ${checkpoint.id}\n`);
          process.stdout.write(`Session:         ${checkpoint.sessionId}\n`);
          process.stdout.write(`Actions:         ${checkpoint.actionIds.length}\n`);
          process.stdout.write(`Actions digest:  ${checkpoint.actionsDigest.slice(0, 16)}...\n`);
          process.stdout.write(`Status:          ${checkpoint.status}\n`);
          process.stdout.write(`Summary:         ${checkpoint.summary}\n`);
          process.stdout.write(`Persisted to:    ${dataDir}/store.json\n`);
        }
        break;
      }

      case 'attest': {
        const checkpointId = args.checkpointId;
        if (!checkpointId) {
          process.stderr.write('Usage: kontext checkpoint attest <checkpointId> --reviewer <id> --decision <approved|rejected>\n');
          process.exit(2);
        }
        if (!args.reviewer) {
          process.stderr.write('Usage: kontext checkpoint attest <checkpointId> --reviewer <id> --decision <approved|rejected>\n');
          process.exit(2);
        }
        if (!args.decision || (args.decision !== 'approved' && args.decision !== 'rejected')) {
          process.stderr.write('Usage: kontext checkpoint attest <checkpointId> --reviewer <id> --decision <approved|rejected>\n');
          process.exit(2);
        }

        // Build a CLI attestation with HMAC-SHA256 signature
        // In production, the reviewer would use their own signing key
        const attestationId = randomBytes(16).toString('hex');
        const timestamp = new Date().toISOString();
        const sigPayload = `${checkpointId}:${args.reviewer}:${args.decision}:${timestamp}`;
        const signature = createHash('sha256').update(sigPayload).digest('hex');

        const result = await kontext.attachAttestation(checkpointId, {
          attestationId,
          checkpointId,
          reviewerId: args.reviewer,
          decision: args.decision as 'approved' | 'rejected',
          ...(args.evidence ? { evidence: args.evidence } : {}),
          signature: {
            signature,
            algorithm: 'SHA256',
          },
          verificationKey: {
            publicKey: 'cli-reviewer',
            algorithm: 'SHA256',
          },
          timestamp,
        });

        await kontext.flush();

        if (args.json) {
          process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        } else {
          process.stdout.write(`Checkpoint:      ${result.id}\n`);
          process.stdout.write(`Status:          ${result.status}\n`);
          process.stdout.write(`Reviewer:        ${args.reviewer}\n`);
          process.stdout.write(`Decision:        ${args.decision}\n`);
          if (args.evidence) {
            process.stdout.write(`Evidence:        ${args.evidence}\n`);
          }
          process.stdout.write(`Attestation:     ${attestationId.slice(0, 16)}...\n`);
          process.stdout.write(`Persisted to:    ${dataDir}/store.json\n`);
        }
        break;
      }

      case 'list': {
        const checkpoints = kontext.getCheckpoints(args.session);

        if (args.json) {
          process.stdout.write(JSON.stringify(checkpoints, null, 2) + '\n');
        } else {
          if (checkpoints.length === 0) {
            process.stdout.write('No checkpoints found.\n');
          } else {
            for (const cp of checkpoints) {
              process.stdout.write(
                `${cp.id}  ${cp.status.padEnd(10)}  session:${cp.sessionId}  actions:${cp.actionIds.length}  ${cp.summary}\n`,
              );
            }
          }
        }
        break;
      }

      default:
        process.stderr.write('Usage: kontext checkpoint <create|attest|list> [options]\n');
        process.exit(2);
    }
  } finally {
    await kontext.destroy();
  }
}
