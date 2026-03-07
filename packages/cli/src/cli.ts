// ============================================================================
// kontext CLI — payment control plane for stablecoin payments
// ============================================================================

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };
const VERSION = pkg.version;

// ---------------------------------------------------------------------------
// Argument parser (zero deps)
// ---------------------------------------------------------------------------

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (!command && !arg.startsWith('-')) {
      command = arg;
      continue;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    positional.push(arg);
  }

  return { command, positional, flags };
}

export function flag(flags: Record<string, string | boolean>, key: string, alias?: string): string | undefined {
  const val = flags[key] ?? (alias ? flags[alias] : undefined);
  return typeof val === 'string' ? val : undefined;
}

export function boolFlag(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true || flags[key] === 'true';
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp(): void {
  process.stdout.write(`kontext v${VERSION} — payment control plane for stablecoin payments

Usage: kontext <command> [options]

Commands:
  init                     Interactive workspace setup (archetypes, chains, assets)
  login                    Authenticate with Kontext cloud
  logout                   Clear local session
  workspace                Show current workspace info
  logs                     List payment attempts with filters
  trace <attemptId>        Full stage-by-stage trace of a payment attempt
  debug                    Incident debugging (rich output with stage timeline)

Global flags:
  --json                   Output structured JSON
  --config <path>          Path to kontext.config.json
  --help, -h               Show help
  --version, -v            Show version

Log filters:
  --last <n>               Last N attempts (default: 20)
  --sender <addr>          Filter by sender address
  --recipient <addr>       Filter by recipient address
  --archetype <type>       Filter by archetype (payroll, remittance, invoicing, treasury, micropayments)
  --stage <name>           Filter by current stage
  --state <state>          Filter by final state (pending, succeeded, failed, review, blocked, refunded)
  --chain <chain>          Filter by chain (base, ethereum, solana)
  --from <date>            Start date (ISO or YYYY-MM-DD)
  --to <date>              End date (ISO or YYYY-MM-DD)

Examples:
  kontext init
  kontext logs --last 10 --state failed
  kontext trace att_abc123
  kontext debug --sender 0xA --from 2026-03-01

Regulatory responsibility remains with the operator.
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { command, positional, flags } = parseArgs(process.argv);
  const json = boolFlag(flags, 'json');

  if (boolFlag(flags, 'version') || boolFlag(flags, 'v')) {
    process.stdout.write(`kontext v${VERSION}\n`);
    return;
  }

  if (boolFlag(flags, 'help') || boolFlag(flags, 'h') || command === 'help' || command === '') {
    printHelp();
    return;
  }

  const configPath = flag(flags, 'config');

  switch (command) {
    case 'init': {
      const { runInit } = await import('./commands/init.js');
      await runInit();
      break;
    }

    case 'login': {
      const { runLogin } = await import('./commands/login.js');
      await runLogin({ json });
      break;
    }

    case 'logout': {
      const { runLogout } = await import('./commands/logout.js');
      runLogout({ json });
      break;
    }

    case 'workspace': {
      const { runWorkspace } = await import('./commands/workspace.js');
      await runWorkspace({ json, configPath });
      break;
    }

    case 'logs': {
      const { runLogs } = await import('./commands/logs.js');
      await runLogs({
        json,
        configPath,
        last: flag(flags, 'last', 'n'),
        sender: flag(flags, 'sender'),
        recipient: flag(flags, 'recipient'),
        archetype: flag(flags, 'archetype'),
        stage: flag(flags, 'stage'),
        state: flag(flags, 'state'),
        chain: flag(flags, 'chain'),
        from: flag(flags, 'from'),
        to: flag(flags, 'to'),
      });
      break;
    }

    case 'trace': {
      const attemptId = positional[0];
      if (!attemptId) {
        process.stderr.write('Usage: kontext trace <attemptId> [--json]\n');
        process.exit(2);
      }
      const { runTrace } = await import('./commands/trace.js');
      await runTrace({ attemptId, json, configPath });
      break;
    }

    case 'debug': {
      const { runDebug } = await import('./commands/debug.js');
      await runDebug({
        json,
        configPath,
        last: flag(flags, 'last', 'n'),
        sender: flag(flags, 'sender'),
        recipient: flag(flags, 'recipient'),
        archetype: flag(flags, 'archetype'),
        stage: flag(flags, 'stage'),
        state: flag(flags, 'state'),
        chain: flag(flags, 'chain'),
        from: flag(flags, 'from'),
        to: flag(flags, 'to'),
      });
      break;
    }

    default:
      process.stderr.write(`Unknown command: ${command}\nRun 'kontext --help' for usage.\n`);
      process.exit(2);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
