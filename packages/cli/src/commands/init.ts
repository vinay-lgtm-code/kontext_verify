// ============================================================================
// kontext init — interactive wizard for project setup
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const TOKENS = ['USDC', 'USDT', 'DAI', 'EURC'] as const;
const CHAINS = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'] as const;
const MODES = ['post-send', 'pre-send', 'both'] as const;
const ENVIRONMENTS = ['production', 'staging', 'development'] as const;

const DEFAULT_RPC: Record<string, string> = {
  base: 'https://mainnet.base.org',
  ethereum: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

// ---------------------------------------------------------------------------
// Zero-dep readline prompt
// ---------------------------------------------------------------------------

function createPrompt(): { ask: (q: string) => Promise<string>; close: () => void } {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    ask: (question: string) =>
      new Promise<string>((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
      }),
    close: () => rl.close(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runInit(opts: { json: boolean }): Promise<void> {
  const configPath = path.join(process.cwd(), 'kontext.config.json');

  if (fs.existsSync(configPath)) {
    if (!opts.json) {
      process.stdout.write('\n  kontext.config.json already exists in this directory.\n');
      process.stdout.write('  Delete it first to re-initialize.\n\n');
    } else {
      process.stdout.write(JSON.stringify({ error: 'kontext.config.json already exists' }) + '\n');
    }
    return;
  }

  if (opts.json) {
    // Non-interactive mode: output a template
    const template = {
      $schema: 'https://getkontext.com/schema/config.json',
      projectId: 'my-project',
      agentId: 'my-agent',
      environment: 'production',
      wallets: [],
      tokens: ['USDC'],
      chains: ['base'],
      rpcEndpoints: { base: DEFAULT_RPC['base'] },
      mode: 'post-send',
    };
    fs.writeFileSync(configPath, JSON.stringify(template, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ created: configPath, config: template }) + '\n');
    return;
  }

  const { ask, close } = createPrompt();

  try {
    process.stdout.write('\n  Kontext — compliance logging for agents that move money\n\n');

    // Project name
    const projectId = (await ask('  ? Project name: ')) || 'my-project';

    // Agent ID
    const agentId = (await ask('  ? Agent ID: ')) || `${projectId}-agent`;

    // Wallet addresses
    const walletsRaw = await ask('  ? Wallet addresses to monitor (comma-separated, or skip): ');
    const wallets = walletsRaw
      ? walletsRaw.split(',').map((w) => w.trim()).filter(Boolean)
      : [];

    // Tokens
    process.stdout.write(`  ? Which tokens? [${TOKENS.join(', ')}]\n`);
    const tokensRaw = (await ask('    (comma-separated, default: USDC): ')) || 'USDC';
    const tokens = tokensRaw
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter((t) => (TOKENS as readonly string[]).includes(t));
    if (tokens.length === 0) tokens.push('USDC');

    // Chains
    process.stdout.write(`  ? Which chains? [${CHAINS.join(', ')}]\n`);
    const chainsRaw = (await ask('    (comma-separated, default: base): ')) || 'base';
    const chains = chainsRaw
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter((c) => (CHAINS as readonly string[]).includes(c));
    if (chains.length === 0) chains.push('base');

    // Mode
    process.stdout.write('  ? Compliance mode:\n');
    process.stdout.write('    post-send  — log after tx, never blocks (recommended)\n');
    process.stdout.write('    pre-send   — screen before tx, blocks if non-compliant\n');
    process.stdout.write('    both       — pre-send screening + post-send logging\n');
    const modeRaw = (await ask('    (default: post-send): ')) || 'post-send';
    const mode = (MODES as readonly string[]).includes(modeRaw) ? modeRaw : 'post-send';

    // RPC endpoints
    const rpcEndpoints: Record<string, string> = {};
    if (wallets.length > 0) {
      process.stdout.write('\n  RPC endpoints (needed for wallet monitoring):\n');
      for (const chain of chains) {
        const defaultRpc = DEFAULT_RPC[chain] ?? '';
        const rpc = (await ask(`  ? RPC for ${chain} (default: ${defaultRpc}): `)) || defaultRpc;
        if (rpc) rpcEndpoints[chain] = rpc;
      }
    }

    // Countries (optional)
    process.stdout.write('\n');
    const fromCountry = await ask('  ? From country (optional, for corridor compliance): ');
    const toCountry = await ask('  ? To country (optional): ');

    // Environment
    const envRaw = (await ask(`  ? Environment [${ENVIRONMENTS.join('/')}] (default: production): `)) || 'production';
    const environment = (ENVIRONMENTS as readonly string[]).includes(envRaw) ? envRaw : 'production';

    // Build config
    const config: Record<string, unknown> = {
      $schema: 'https://getkontext.com/schema/config.json',
      projectId,
      agentId,
      environment,
      wallets,
      tokens,
      chains,
      mode,
    };

    if (Object.keys(rpcEndpoints).length > 0) {
      config['rpcEndpoints'] = rpcEndpoints;
    }

    if (fromCountry || toCountry) {
      const corridors: Record<string, string> = {};
      if (fromCountry) corridors['from'] = fromCountry;
      if (toCountry) corridors['to'] = toCountry;
      config['corridors'] = corridors;
    }

    // Write file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

    // Create .kontext directory
    const kontextDir = path.join(process.cwd(), '.kontext');
    if (!fs.existsSync(kontextDir)) {
      fs.mkdirSync(kontextDir, { recursive: true });
    }

    // Summary
    process.stdout.write('\n');
    process.stdout.write('  ✓ Created kontext.config.json\n');
    process.stdout.write('  ✓ Created .kontext/ directory\n');
    if (wallets.length > 0) {
      process.stdout.write(`  ✓ Monitoring ${wallets.length} wallet${wallets.length > 1 ? 's' : ''} on ${chains.join(', ')}\n`);
    }
    process.stdout.write(`  ✓ Tokens: ${tokens.join(', ')}\n`);
    process.stdout.write(`  ✓ Mode: ${mode}\n`);

    process.stdout.write('\n  Next: add 2 lines to your code:\n\n');
    process.stdout.write("    import { Kontext, withKontextCompliance } from 'kontext-sdk';\n");
    process.stdout.write('    const kontext = Kontext.init();\n');
    process.stdout.write('    const client = withKontextCompliance(rawClient, kontext);\n');
    process.stdout.write('\n');
  } finally {
    close();
  }
}
