// ============================================================================
// kontext CLI — compliance audit trail for AI agent stablecoin payments
// ============================================================================

import type { Token } from 'kontext-sdk';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };
const VERSION = pkg.version;

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
  anchor              Anchor terminal digest on-chain (Base)
  attest              Exchange A2A compliance attestation with counterparty
  session           Manage delegated agent sessions
                      create  --agent --delegated-by --scope <caps>
                      list
                      end <sessionId>
  checkpoint        Manage provenance checkpoints
                      create  --session --actions --summary
                      attest  <checkpointId> --reviewer --decision
                      list    [--session <id>]
  sync [--full]       Fetch latest OFAC SDN list from U.S. Treasury
                        --full  One-time: download entire SDN XML, parse ALL
                                sanctioned entities + digital currency addresses
  mcp                 Start MCP server for Claude Code / Cursor / Windsurf

Global flags:
  --json              Output structured JSON
  --help, -h          Show help
  --version, -v       Show version

Examples:
  npx @kontext-sdk/cli check 0xAddress --amount 5000 --token USDC
  npx @kontext-sdk/cli check 0xSender 0xReceiver --amount 5000 --token USDC
  npx @kontext-sdk/cli verify --tx 0xabc --amount 500 --token USDC --from 0xA --to 0xB --agent my-bot
  npx @kontext-sdk/cli reason "Price within budget" --agent my-bot --step 1
  npx @kontext-sdk/cli cert --agent my-bot --output cert.json
  npx @kontext-sdk/cli audit --verify
  npx @kontext-sdk/cli anchor --rpc https://sepolia.base.org --contract 0x... --key 0x...
  npx @kontext-sdk/cli attest --endpoint https://agent-b.app --agent my-bot
  npx @kontext-sdk/cli sync
  npx @kontext-sdk/cli mcp

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

    case 'anchor': {
      const rpc = flag(flags, 'rpc');
      const contract = flag(flags, 'contract');
      const key = flag(flags, 'key');
      if (!rpc || !contract || !key) {
        process.stderr.write('Usage: kontext anchor --rpc <url> --contract <addr> --key <privkey> [--json]\n');
        process.exit(2);
      }
      const { runAnchor } = await import('./commands/anchor.js');
      await runAnchor({ rpc, contract, key, json });
      break;
    }

    case 'attest': {
      const endpoint = flag(flags, 'endpoint');
      if (!endpoint) {
        process.stderr.write('Usage: kontext attest --endpoint <url> [--agent <id>] [--counterparty-agent <id>] [--json]\n');
        process.exit(2);
      }
      const agent = flag(flags, 'agent') ?? 'cli';
      const counterpartyAgent = flag(flags, 'counterparty-agent');
      const { runAttest } = await import('./commands/attest.js');
      await runAttest({ endpoint, agent, counterpartyAgent, json });
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

    case 'session': {
      const subcommand = positional[0] ?? '';
      const agent = flag(flags, 'agent');
      const delegatedBy = flag(flags, 'delegated-by');
      const scope = flag(flags, 'scope');
      const expiresIn = flag(flags, 'expires-in');
      const maxAmount = flag(flags, 'max-amount');
      const sessionId = positional[1] ?? flag(flags, 'session');
      const { runSession } = await import('./commands/session.js');
      await runSession({ subcommand, agent, delegatedBy, scope, expiresIn, maxAmount, sessionId, json });
      break;
    }

    case 'checkpoint': {
      const subcommand = positional[0] ?? '';
      const sessionArg = flag(flags, 'session');
      const actions = flag(flags, 'actions');
      const summary = flag(flags, 'summary');
      const reviewer = flag(flags, 'reviewer');
      const decision = flag(flags, 'decision');
      const evidence = flag(flags, 'evidence');
      const checkpointId = positional[1] ?? flag(flags, 'checkpoint');
      const { runCheckpoint } = await import('./commands/checkpoint.js');
      await runCheckpoint({ subcommand, session: sessionArg, actions, summary, reviewer, decision, evidence, checkpointId, json });
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
