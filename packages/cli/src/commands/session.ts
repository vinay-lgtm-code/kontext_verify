// ============================================================================
// kontext session — manage delegated agent sessions (provenance layer 1)
// ============================================================================

import { Kontext, FileStorage } from 'kontext-sdk';

interface SessionArgs {
  subcommand: string;
  agent?: string;
  delegatedBy?: string;
  scope?: string;
  expiresIn?: string;
  maxAmount?: string;
  sessionId?: string;
  json: boolean;
}

export async function runSession(args: SessionArgs): Promise<void> {
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
        if (!args.agent) {
          process.stderr.write('Usage: kontext session create --agent <id> --delegated-by <principal> --scope <caps>\n');
          process.exit(2);
        }
        if (!args.delegatedBy) {
          process.stderr.write('Usage: kontext session create --agent <id> --delegated-by <principal> --scope <caps>\n');
          process.exit(2);
        }
        if (!args.scope) {
          process.stderr.write('Usage: kontext session create --agent <id> --delegated-by <principal> --scope <caps>\n');
          process.exit(2);
        }

        const scope = args.scope.split(',').map((s) => s.trim());
        const session = await kontext.createAgentSession({
          agentId: args.agent,
          delegatedBy: args.delegatedBy,
          scope,
          ...(args.expiresIn ? { expiresIn: parseInt(args.expiresIn, 10) } : {}),
          ...(args.maxAmount ? { constraints: { maxAmount: args.maxAmount } } : {}),
        });

        await kontext.flush();

        if (args.json) {
          process.stdout.write(JSON.stringify(session, null, 2) + '\n');
        } else {
          process.stdout.write(`Session:         ${session.sessionId}\n`);
          process.stdout.write(`Agent:           ${session.agentId}\n`);
          process.stdout.write(`Delegated by:    ${session.delegatedBy}\n`);
          process.stdout.write(`Scope:           ${session.scope.join(', ')}\n`);
          process.stdout.write(`Status:          ${session.status}\n`);
          if (session.expiresAt) {
            process.stdout.write(`Expires:         ${session.expiresAt}\n`);
          }
          if (session.constraints?.maxAmount) {
            process.stdout.write(`Max amount:      ${session.constraints.maxAmount}\n`);
          }
          process.stdout.write(`Digest:          ${session.digest ? session.digest.slice(0, 16) + '...' : 'n/a'}\n`);
          process.stdout.write(`Persisted to:    ${dataDir}/store.json\n`);
        }
        break;
      }

      case 'list': {
        const sessions = kontext.getAgentSessions();

        if (args.json) {
          process.stdout.write(JSON.stringify(sessions, null, 2) + '\n');
        } else {
          if (sessions.length === 0) {
            process.stdout.write('No sessions found.\n');
          } else {
            for (const s of sessions) {
              process.stdout.write(`${s.sessionId}  ${s.status.padEnd(8)}  ${s.agentId}  delegated-by:${s.delegatedBy}  scope:[${s.scope.join(',')}]\n`);
            }
          }
        }
        break;
      }

      case 'end': {
        const sessionId = args.sessionId;
        if (!sessionId) {
          process.stderr.write('Usage: kontext session end <sessionId>\n');
          process.exit(2);
        }

        const ended = await kontext.endAgentSession(sessionId);
        await kontext.flush();

        if (args.json) {
          process.stdout.write(JSON.stringify(ended, null, 2) + '\n');
        } else {
          process.stdout.write(`Session:         ${ended.sessionId}\n`);
          process.stdout.write(`Status:          ${ended.status}\n`);
          process.stdout.write(`Ended at:        ${ended.endedAt}\n`);
          process.stdout.write(`Persisted to:    ${dataDir}/store.json\n`);
        }
        break;
      }

      default:
        process.stderr.write('Usage: kontext session <create|list|end> [options]\n');
        process.exit(2);
    }
  } finally {
    await kontext.destroy();
  }
}
