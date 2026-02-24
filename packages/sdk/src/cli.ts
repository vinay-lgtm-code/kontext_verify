// ============================================================================
// kontext CLI — compliance audit trail for AI agent stablecoin payments
// ============================================================================

import type { Token } from './types.js';

const VERSION = '0.6.0';
const VALID_TOKENS = ['USDC', 'USDT', 'DAI', 'EURC', 'USDP', 'USDG'];

// ---------------------------------------------------------------------------
// Argument parser (zero deps)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { command: string; positional: string[]; flags: Record<string, string | boolean> } {
  const args = argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  // Find the command (first non-flag argument)
  let command = '';
  let startIdx = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('-')) {
      // Parse this flag before finding command
      const key = arg.startsWith('--') ? arg.slice(2) : arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      command = arg;
      startIdx = i + 1;
      break;
    }
  }

  for (let i = startIdx; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function flag(flags: Record<string, string | boolean>, key: string, alias?: string): string | undefined {
  const val = flags[key] ?? (alias ? flags[alias] : undefined);
  if (typeof val === 'string') return val;
  return undefined;
}

function boolFlag(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true || flags[key] === 'true';
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp(): void {
  process.stdout.write(`kontext v${VERSION} — compliance audit trail for AI agent stablecoin payments

Usage: kontext <command> [options]

Commands:
  check <addr> [<to>]  Stateless OFAC + threshold compliance check
  verify              Log transaction + compliance check + digest proof
  reason <text>       Log agent reasoning into digest chain
  cert                Export compliance certificate
  audit               Verify digest chain integrity
  sync [--full]       Fetch latest OFAC SDN list from U.S. Treasury
                        --full  One-time: download entire SDN XML, parse ALL
                                sanctioned entities + digital currency addresses
  mcp                 Start MCP server for Claude Code / Cursor / Windsurf

Global flags:
  --json              Output structured JSON
  --help, -h          Show help
  --version, -v       Show version

Examples:
  npx kontext-sdk check 0xAddress --amount 5000 --token USDC
  npx kontext-sdk check 0xSender 0xReceiver --amount 5000 --token USDC
  npx kontext-sdk verify --tx 0xabc --amount 500 --token USDC --from 0xA --to 0xB --agent my-bot
  npx kontext-sdk reason "Price within budget" --agent my-bot --step 1
  npx kontext-sdk cert --agent my-bot --output cert.json
  npx kontext-sdk audit --verify
  npx kontext-sdk sync
  npx kontext-sdk mcp

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

  switch (command) {
    case 'check': {
      const from = positional[0];
      const to = positional[1];
      if (!from) {
        process.stderr.write('Usage: kontext check <address> [<to>] [--amount <number>] [--token <symbol>]\n');
        process.exit(2);
      }
      const amount = flag(flags, 'amount') ?? '0';
      const token = (flag(flags, 'token') ?? 'USDC').toUpperCase();
      if (!VALID_TOKENS.includes(token)) {
        process.stderr.write(`Invalid token: ${token}. Must be one of: ${VALID_TOKENS.join(', ')}\n`);
        process.exit(2);
      }
      const { runCheck } = await import('./commands/check.js');
      runCheck({ from, to, amount, token: token as Token, json });
      break;
    }

    case 'verify': {
      const tx = flag(flags, 'tx');
      const amount = flag(flags, 'amount');
      const from = flag(flags, 'from');
      const to = flag(flags, 'to');
      const agent = flag(flags, 'agent') ?? 'cli';
      const session = flag(flags, 'session');
      const token = (flag(flags, 'token') ?? 'USDC').toUpperCase();
      if (!tx || !amount || !from || !to) {
        process.stderr.write('Usage: kontext verify --tx <hash> --amount <number> --token <symbol> --from <addr> --to <addr> --agent <id>\n');
        process.exit(2);
      }
      if (!VALID_TOKENS.includes(token)) {
        process.stderr.write(`Invalid token: ${token}. Must be one of: ${VALID_TOKENS.join(', ')}\n`);
        process.exit(2);
      }
      const { runVerify } = await import('./commands/verify.js');
      await runVerify({ tx, amount, token: token as Token, from, to, agent, session, json });
      break;
    }

    case 'reason': {
      const text = positional[0];
      if (!text) {
        process.stderr.write('Usage: kontext reason "<text>" --agent <id> [--session <id>] [--step <n>]\n');
        process.exit(2);
      }
      const agent = flag(flags, 'agent') ?? 'cli';
      const session = flag(flags, 'session');
      const stepStr = flag(flags, 'step');
      const step = stepStr !== undefined ? parseInt(stepStr, 10) : undefined;
      const { runReason } = await import('./commands/reason.js');
      await runReason({ text, agent, session, step, json });
      break;
    }

    case 'cert': {
      const agent = flag(flags, 'agent');
      if (!agent) {
        process.stderr.write('Usage: kontext cert --agent <id> [--output <file>]\n');
        process.exit(2);
      }
      const output = flag(flags, 'output') ?? flag(flags, 'o');
      const { runCert } = await import('./commands/cert.js');
      await runCert({ agent, output, json });
      break;
    }

    case 'audit': {
      const { runAudit } = await import('./commands/audit.js');
      await runAudit({ json });
      break;
    }

    case 'sync': {
      const full = boolFlag(flags, 'full');
      const { runSync } = await import('./commands/sync.js');
      await runSync({ json, full });
      break;
    }

    case 'mcp': {
      const { runMcp } = await import('./commands/mcp.js');
      await runMcp();
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
