// ============================================================================
// kontext init — interactive wizard for project setup
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';
import { keychainLoad, validateApiKey } from './login.js';

const AGENT_TYPES = ['recurring', 'single-use'] as const;
const OFAC_MODES = ['pre-send', 'post-send'] as const;
const ALL_ANOMALY_RULES = [
  'unusualAmount', 'frequencySpike', 'newDestination',
  'offHoursActivity', 'rapidSuccession', 'roundAmount', 'reserveDiscrepancy',
] as const;

const TOKENS = ['USDC', 'USDT', 'DAI', 'EURC'] as const;
const CHAINS = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'arc'] as const;
const MODES = ['post-send', 'pre-send', 'both'] as const;
const ENVIRONMENTS = ['production', 'staging', 'development'] as const;
const WALLET_PROVIDERS = ['none', 'circle', 'coinbase', 'metamask'] as const;
const FUNDING_SOURCES = ['crypto', 'cards', 'ach', 'treasury'] as const;
const ACH_PROVIDERS = ['plaid', 'moov', 'stripe_treasury', 'modern_treasury', 'column'] as const;
const CARD_ISSUERS = ['ramp', 'lithic', 'marqeta', 'stripe_issuing', 'crossmint', 'other'] as const;
const TREASURY_PROVIDERS = ['stripe_treasury', 'modern_treasury', 'column', 'other'] as const;

const SCREENING_PROVIDERS = ['built-in', 'chainalysis', 'trm', 'opensanctions'] as const;

// ---------------------------------------------------------------------------
// RPC provider presets
// ---------------------------------------------------------------------------

// Arc is testnet-only (mainnet targeting mid-2026). Placeholder RPC.
const DEFAULT_RPC: Record<string, string> = {
  base: 'https://mainnet.base.org',
  ethereum: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  arc: 'https://rpc.arc.network',
};

const CIRCLE_API_BASE = 'https://api.circle.com';
const CDP_API_BASE = 'https://api.cdp.coinbase.com';

const ALCHEMY_RPC: Record<string, string> = {
  base: 'https://base-mainnet.g.alchemy.com/v2/{key}',
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/{key}',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/{key}',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/{key}',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2/{key}',
  avalanche: 'https://avax-mainnet.g.alchemy.com/v2/{key}',
};

const INFURA_RPC: Record<string, string> = {
  base: 'https://base-mainnet.infura.io/v3/{key}',
  ethereum: 'https://mainnet.infura.io/v3/{key}',
  polygon: 'https://polygon-mainnet.infura.io/v3/{key}',
  arbitrum: 'https://arbitrum-mainnet.infura.io/v3/{key}',
  optimism: 'https://optimism-mainnet.infura.io/v3/{key}',
  avalanche: 'https://avalanche-mainnet.infura.io/v3/{key}',
};

const RPC_PROVIDERS = ['public', 'alchemy', 'infura', 'custom'] as const;

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
// API Validation helpers
// ---------------------------------------------------------------------------

async function validateCircleCredentials(apiKey: string, entitySecret: string): Promise<boolean> {
  try {
    const res = await fetch(`${CIRCLE_API_BASE}/v1/w3s/config/entity`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Entity-Secret': entitySecret,
      },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function validateCdpCredentials(apiKeyId: string, apiKeySecret: string): Promise<boolean> {
  try {
    // Build minimal JWT for validation
    const header = { alg: 'EdDSA', typ: 'JWT', kid: apiKeyId };
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      iss: apiKeyId,
      sub: apiKeyId,
      aud: ['cdp'],
      iat: nowSec,
      exp: nowSec + 120,
      jti: crypto.randomUUID(),
    };
    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const jwt = `${b64Header}.${b64Payload}.${apiKeySecret.slice(0, 32)}`;

    const res = await fetch(`${CDP_API_BASE}/v1/evm/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Secrets storage helpers
// ---------------------------------------------------------------------------

function writeEnvFile(envPath: string, secrets: Record<string, string>): void {
  const absPath = path.resolve(envPath);
  let content = '';

  if (fs.existsSync(absPath)) {
    content = fs.readFileSync(absPath, 'utf-8');
  } else {
    content = '# Kontext SDK secrets — do not commit this file\n';
  }

  for (const [key, value] of Object.entries(secrets)) {
    // Skip if key already exists in the file
    if (content.includes(`${key}=`)) continue;
    content += `${key}=${value}\n`;
  }

  // Ensure parent directory exists
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(absPath, content);
}

// ---------------------------------------------------------------------------
// Setup file generation
// ---------------------------------------------------------------------------

const ACH_ADAPTER_MAP: Record<string, string> = {
  plaid: 'PlaidAchAdapter',
  moov: 'MoovAchAdapter',
  stripe_treasury: 'StripeTreasuryAchAdapter',
  modern_treasury: 'ModernTreasuryAchAdapter',
  column: 'ColumnAchAdapter',
};

function generateSetupFile(
  mode: string,
  screeningProviders: string[],
  isTypeScript: boolean,
  opts: {
    agentName?: string;
    agentType?: string;
    paymentReference?: string;
    approvalThreshold?: string;
    anomalyRules?: string[];
    anomalyThresholds?: Record<string, unknown>;
    fundingSources?: string[];
    achProvider?: string;
    cardIssuer?: string;
    treasuryProvider?: string;
  } = {},
): string {
  const ext = isTypeScript ? 'ts' : 'js';
  const lines: string[] = [
    `// Auto-generated by \`npx kontext init\``,
    `// The verification layer for agents and humans that move money`,
  ];

  const byokProviders = screeningProviders.filter((p) => p !== 'built-in');
  const hasBYOK = byokProviders.length > 0;
  const isPreSend = mode === 'pre-send' || mode === 'both';

  // Build import list
  const imports: string[] = ['Kontext'];
  if (isPreSend) imports.push('withKontextCompliance');
  if (byokProviders.includes('chainalysis')) imports.push('ChainalysisFreeAPIProvider');
  if (byokProviders.includes('trm')) imports.push('TRMLabsProvider');
  if (byokProviders.includes('opensanctions')) imports.push('OpenSanctionsProvider');

  // ACH monitoring imports
  const achAdapterName = opts.achProvider ? ACH_ADAPTER_MAP[opts.achProvider] : undefined;
  if (achAdapterName) {
    imports.push('AchMonitor');
    imports.push(achAdapterName);
  }

  if (isPreSend) {
    lines.push(`// Import this file in your entry point to start compliance monitoring.`);
    lines.push(`// Wrap your viem client with withKontextCompliance for pre-send screening.`);
  } else {
    lines.push(`// Import this file in your entry point to start compliance monitoring.`);
  }

  lines.push(`import { ${imports.join(', ')} } from 'kontext-sdk';`);

  if (hasBYOK) {
    lines.push(`import config from './kontext.config.json'${isTypeScript ? ' with { type: "json" }' : ''};`);
  }

  lines.push('');

  // Build init call
  if (hasBYOK) {
    const providerLines: string[] = [];
    if (byokProviders.includes('chainalysis')) {
      providerLines.push(`    new ChainalysisFreeAPIProvider({ apiKey: config.screening.chainalysisApiKey })`);
    }
    if (byokProviders.includes('trm')) {
      providerLines.push(`    new TRMLabsProvider({ apiKey: config.screening.trmApiKey })`);
    }
    if (byokProviders.includes('opensanctions')) {
      providerLines.push(`    new OpenSanctionsProvider({ apiKey: config.screening.opensanctionsApiKey })`);
    }

    if (isPreSend) {
      lines.push(`export const kontext = Kontext.init({`);
    } else {
      lines.push(`Kontext.init({`);
    }
    lines.push(`  screening: {`);
    lines.push(`    providers: [`);
    lines.push(providerLines.join(',\n'));
    lines.push(`    ],`);
    lines.push(`    consensus: 'ANY_MATCH',`);
    lines.push(`  },`);
    lines.push(`});`);
  } else {
    if (isPreSend) {
      lines.push(`export const kontext = Kontext.init({`);
    } else {
      lines.push(`const kontext = Kontext.init({`);
    }
    lines.push(`  apiKey: process.env.KONTEXT_API_KEY,`);
    if (opts.approvalThreshold) {
      lines.push(`  approvalThreshold: '${opts.approvalThreshold}',`);
    }
    if (opts.anomalyRules && opts.anomalyRules.length > 0) {
      lines.push(`  anomalyRules: ${JSON.stringify(opts.anomalyRules)},`);
      if (opts.anomalyThresholds && Object.keys(opts.anomalyThresholds).length > 0) {
        lines.push(`  anomalyThresholds: ${JSON.stringify(opts.anomalyThresholds)},`);
      }
    }
    lines.push(`});`);
    if (!isPreSend) lines.push(`export default kontext;`);
  }

  if (isPreSend) {
    lines.push(`export { withKontextCompliance };`);
    lines.push(`export default kontext;`);
  }

  // Single-use agent convenience comment
  if (opts.paymentReference) {
    lines.push('');
    lines.push(`// Single-use agent: tag all transactions with paymentReference`);
    lines.push(`// kontext.verify({ ..., paymentReference: '${opts.paymentReference}', metadata: { agentName: '${opts.agentName ?? ''}' } })`);
  }

  // ACH monitoring setup
  if (achAdapterName && opts.achProvider) {
    lines.push('');
    lines.push('// ACH monitoring — forward provider webhooks to verify()');
    lines.push(`const achAdapter = new ${achAdapterName}();`);
    lines.push(`const achMonitor = new AchMonitor(kontext, {`);
    lines.push(`  provider: '${opts.achProvider}',`);
    lines.push(`  providerConfig: {},`);
    lines.push(`}, achAdapter);`);
    lines.push('');
    lines.push('// In your webhook handler:');
    lines.push('// const results = await achMonitor.handleWebhook(req.body, req.headers);');
    lines.push('export { achMonitor };');
  }

  // Virtual card usage hint
  if (opts.cardIssuer) {
    lines.push('');
    lines.push('// Virtual card compliance — use verify() with paymentMethod: "card"');
    lines.push('// kontext.verify({ amount, from, to, agentId, paymentMethod: "card",');
    lines.push(`//   instrument: { instrumentId: "...", instrumentType: "virtual_card", instrumentNetwork: "visa", instrumentIssuer: "${opts.cardIssuer}" }`);
    lines.push('// });');
  }

  // Treasury usage hint
  if (opts.treasuryProvider) {
    lines.push('');
    lines.push('// Treasury operations — use verify() with paymentMethod: "ach" or "bank"');
    lines.push('// kontext.verify({ amount, from, to, agentId, paymentMethod: "ach", achSecCode: "CCD" });');
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runInit(opts: { json: boolean; force?: boolean }): Promise<void> {
  const configPath = path.join(process.cwd(), 'kontext.config.json');

  // --json: print starter config template to stdout (works from any context)
  if (opts.json) {
    const template = {
      $schema: 'https://getkontext.com/schema/config.json',
      projectId: 'my-project',
      agentId: 'my-project-agent',
      environment: 'production',
      wallets: [],
      tokens: ['USDC'],
      chains: ['base'],
      rpcEndpoints: { base: DEFAULT_RPC['base'] },
      mode: 'post-send',
      fundingSources: ['crypto'],
      walletProvider: { type: 'none' },
      cardIssuer: null,
      achProvider: null,
      treasuryProvider: null,
    };
    process.stdout.write(JSON.stringify({ template }, null, 2) + '\n');
    return;
  }

  // Existing config check
  if (fs.existsSync(configPath)) {
    if (opts.force) {
      fs.unlinkSync(configPath);
    } else {
      process.stdout.write('\n  kontext.config.json already exists in this directory.\n');
      process.stdout.write('  Delete it first or use --force to re-initialize.\n\n');
      return;
    }
  }

  // Interactive terminal required
  if (!process.stdin.isTTY) {
    process.stdout.write('\n');
    process.stdout.write('  Kontext requires interactive mode for project initialization.\n\n');
    process.stdout.write('  The setup wizard walks you through:\n');
    process.stdout.write('    - Project name and agent ID\n');
    process.stdout.write('    - Chain and token selection\n');
    process.stdout.write('    - Compliance mode (post-send / pre-send / both)\n');
    process.stdout.write('    - Funding sources (crypto wallets, virtual cards, ACH, treasury)\n');
    process.stdout.write('    - API key scope guidance and credential validation\n');
    process.stdout.write('    - Secret storage location (.env, GCP, AWS, Vault)\n\n');
    process.stdout.write('  These decisions involve credentials and security settings\n');
    process.stdout.write('  that require human review.\n\n');
    process.stdout.write('  To start:  run `kontext init` in an interactive terminal.\n');
    process.stdout.write('  To preview config schema:  run `kontext init --json`.\n\n');
    return;
  }

  const { ask, close } = createPrompt();

  try {
    process.stdout.write('\n  The verification layer for agents and humans that move money\n\n');

    // ── Authentication ────────────────────────────────────────────────────────
    let authProfile: { plan: string; keyPrefix: string } | null = null;
    const savedKey = keychainLoad();
    if (savedKey) {
      const profile = await validateApiKey(savedKey);
      if (profile) {
        authProfile = profile;
        process.stdout.write(`  ✓ Signed in (${profile.plan} plan)\n`);
        const useIt = (await ask('  ? Continue as this account? [Y/n]: ')).toLowerCase();
        if (useIt === 'n' || useIt === 'no') {
          authProfile = null;
        }
        process.stdout.write('\n');
      }
    }

    if (!authProfile) {
      process.stdout.write('  ? Do you have a Kontext account?\n');
      process.stdout.write('      1) Log in with API key\n');
      process.stdout.write('      2) Create an account — getkontext.com/signup\n');
      process.stdout.write('      3) Skip (local mode)\n');
      const authChoice = (await ask('    (default: 3): ')) || '3';

      if (authChoice === '1' || authChoice === '2') {
        if (authChoice === '2') {
          process.stdout.write('\n  Open your browser: https://getkontext.com/signup\n');
          process.stdout.write('  Paste your API key below once you have it.\n\n');
        }
        const apiKey = await ask('  ? API key (sk_live_...): ');
        if (apiKey) {
          process.stdout.write('  Verifying with api.getkontext.com...\n');
          const profile = await validateApiKey(apiKey);
          if (profile) {
            authProfile = profile;
            // Store in keychain
            const { default: childProcess } = await import('child_process');
            try {
              childProcess.execFileSync('security', [
                'delete-generic-password', '-a', 'kontext', '-s', 'kontext-cli',
              ], { stdio: 'pipe' });
            } catch { /* not found */ }
            try {
              childProcess.execFileSync('security', [
                'add-generic-password', '-a', 'kontext', '-s', 'kontext-cli', '-w', apiKey,
              ], { stdio: 'pipe' });
              process.stdout.write('  ✓ Authenticated — key stored securely in OS keychain\n\n');
            } catch {
              process.stdout.write('  ✓ Authenticated (key not stored — set KONTEXT_API_KEY env var)\n\n');
            }
          } else {
            process.stdout.write('  ⚠ Could not validate API key — continuing in local mode\n\n');
          }
        }
      } else {
        process.stdout.write('\n');
      }
    }

    // ── Project setup ─────────────────────────────────────────────────────────

    // Project name
    const projectId = (await ask('  ? Project name: ')) || 'my-project';

    // Agent ID
    const agentId = (await ask('  ? Agent ID: ')) || `${projectId}-agent`;

    // ── Agent identity ────────────────────────────────────────────────────────

    process.stdout.write('\n  ? Agent type:\n');
    process.stdout.write('      recurring    — a persistent agent running continuously\n');
    process.stdout.write('                     (treasury bot, payment processor, DeFi strategy)\n');
    process.stdout.write('      single-use   — an agent for one specific task or payment run\n');
    process.stdout.write('                     (payroll disbursement, batch settlement, invoice)\n');
    const agentTypeRaw = (await ask('    (default: recurring): ')) || 'recurring';
    const agentType = (AGENT_TYPES as readonly string[]).includes(agentTypeRaw) ? agentTypeRaw : 'recurring';

    const agentName = await ask('  ? Agent display name (shown in dashboard and reports): ');

    let paymentReference: string | undefined;
    if (agentType === 'single-use') {
      const ref = await ask('  ? Payment name / reference (or enter to use agent name): ');
      paymentReference = ref || agentName || agentId;
    }

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

    // RPC provider selection (only when wallets configured)
    const rpcEndpoints: Record<string, string> = {};
    if (wallets.length > 0) {
      process.stdout.write('\n  ? RPC provider:\n');
      process.stdout.write('      public   — free, rate-limited (default)\n');
      process.stdout.write('      alchemy  — requires API key\n');
      process.stdout.write('      infura   — requires API key (MetaMask default)\n');
      process.stdout.write('      custom   — enter URLs per chain\n');
      const rpcProviderRaw = (await ask('    (default: public): ')) || 'public';
      const rpcProvider = (RPC_PROVIDERS as readonly string[]).includes(rpcProviderRaw)
        ? rpcProviderRaw
        : 'public';

      if (rpcProvider === 'public') {
        for (const chain of chains) {
          const rpc = DEFAULT_RPC[chain];
          if (rpc) rpcEndpoints[chain] = rpc;
        }
      } else if (rpcProvider === 'alchemy' || rpcProvider === 'infura') {
        const providerMap = rpcProvider === 'alchemy' ? ALCHEMY_RPC : INFURA_RPC;
        const providerName = rpcProvider === 'alchemy' ? 'Alchemy' : 'Infura';
        const apiKey = await ask(`  ? ${providerName} API key: `);

        for (const chain of chains) {
          const template = providerMap[chain];
          if (template && apiKey) {
            rpcEndpoints[chain] = template.replace('{key}', apiKey);
          } else {
            // Fall back to public RPC for unsupported chains (e.g., Arc)
            const fallback = DEFAULT_RPC[chain];
            if (fallback) rpcEndpoints[chain] = fallback;
          }
        }
      } else {
        // custom — prompt per chain (original behavior)
        process.stdout.write('\n  RPC endpoints (needed for wallet monitoring):\n');
        for (const chain of chains) {
          const defaultRpc = DEFAULT_RPC[chain] ?? '';
          const rpc = (await ask(`  ? RPC for ${chain} (default: ${defaultRpc}): `)) || defaultRpc;
          if (rpc) rpcEndpoints[chain] = rpc;
        }
      }
    }

    // Countries (optional)
    process.stdout.write('\n');
    const fromCountry = await ask('  ? From country (optional, for corridor compliance): ');
    const toCountry = await ask('  ? To country (optional): ');

    // Environment
    const envRaw = (await ask(`  ? Environment [${ENVIRONMENTS.join('/')}] (default: production): `)) || 'production';
    const environment = (ENVIRONMENTS as readonly string[]).includes(envRaw) ? envRaw : 'production';

    // -----------------------------------------------------------------------
    // Funding Sources
    // -----------------------------------------------------------------------

    process.stdout.write('\n  ─── Funding Sources ────────────────────────────────────────────────\n\n');
    process.stdout.write('  ? Which funding sources does your agent use? (comma-separated, or skip)\n');
    process.stdout.write('      crypto     — crypto wallets (Circle, Coinbase, MetaMask)\n');
    process.stdout.write('      cards      — virtual cards (Ramp Agent Cards, Lithic, Marqeta, Stripe Issuing)\n');
    process.stdout.write('      ach        — ACH transfers (Plaid, Moov, Column, Modern Treasury, Stripe Treasury)\n');
    process.stdout.write('      treasury   — treasury/cash management (Stripe Treasury, Modern Treasury, Column)\n');
    const fundingRaw = (await ask('    (default: crypto): ')) || 'crypto';
    const fundingSources: string[] = fundingRaw === 'skip'
      ? []
      : fundingRaw
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s) => (FUNDING_SOURCES as readonly string[]).includes(s));

    const secretsToStore: Record<string, string> = {};

    // ----- Crypto Wallets -----
    let walletProvider: Record<string, unknown> = { type: 'none' };
    let provider = 'none';

    if (fundingSources.includes('crypto')) {
      process.stdout.write('\n  ? Wallet provider:\n');
      process.stdout.write('    none     — manual wallet management (viem, ethers, etc.)\n');
      process.stdout.write('    circle   — Circle Programmable Wallets\n');
      process.stdout.write('    coinbase — Coinbase Developer Platform (CDP) Wallets\n');
      process.stdout.write('    metamask — MetaMask Embedded Wallets (Node.js)\n');
      const providerRaw = (await ask('    (default: none): ')) || 'none';
      provider = (WALLET_PROVIDERS as readonly string[]).includes(providerRaw)
        ? providerRaw
        : 'none';

      if (provider === 'circle') {
        // ----- Circle Programmable Wallets -----
        process.stdout.write('\n  Circle Programmable Wallets setup:\n');
        process.stdout.write('  Create a restricted API key at developer.circle.com with these scopes:\n');
        process.stdout.write('    - wallets:read\n');
        process.stdout.write('    - wallets:execute\n');
        process.stdout.write('    - transactions:read\n\n');

        const circleApiKey = await ask('  ? Circle API Key (restricted key): ');

        // Entity Secret
        process.stdout.write('  ? Entity Secret (32-byte hex):\n');
        process.stdout.write('    1) Enter an existing entity secret\n');
        process.stdout.write('    2) Generate a new one\n');
        const entityChoice = (await ask('    (default: 2 — generate): ')) || '2';
        let entitySecret: string;
        if (entityChoice === '1') {
          entitySecret = await ask('  ? Entity Secret: ');
        } else {
          entitySecret = crypto.randomBytes(32).toString('hex');
          process.stdout.write(`  Generated entity secret: ${entitySecret}\n`);
          process.stdout.write('  Save this entity secret securely. You cannot recover it later.\n');
        }

        // Circle environment
        const circleEnvRaw = (await ask('  ? Circle environment [sandbox/production] (default: production): ')) || 'production';
        const circleEnvironment = circleEnvRaw === 'sandbox' ? 'sandbox' : 'production';

        // Validate credentials (best-effort)
        if (circleApiKey) {
          process.stdout.write('  Validating Circle credentials...\n');
          const valid = await validateCircleCredentials(circleApiKey, entitySecret);
          if (valid) {
            process.stdout.write('  ✓ Circle credentials validated\n');
          } else {
            process.stdout.write('  ⚠ Could not validate Circle credentials (will save config anyway)\n');
          }
        }

        // Wallet set name (optional)
        const walletSetName = await ask('  ? Wallet Set name (optional): ');

        secretsToStore['CIRCLE_API_KEY'] = circleApiKey;
        secretsToStore['CIRCLE_ENTITY_SECRET'] = entitySecret;

        walletProvider = {
          type: 'circle',
          apiKeyEnvVar: 'CIRCLE_API_KEY',
          entitySecretEnvVar: 'CIRCLE_ENTITY_SECRET',
          circleEnvironment,
          ...(walletSetName ? { walletSetName } : {}),
        };
      } else if (provider === 'coinbase') {
        // ----- Coinbase Developer Platform -----
        process.stdout.write('\n  Coinbase Developer Platform (CDP) setup:\n');
        process.stdout.write('  Create a Secret API Key at portal.cdp.coinbase.com:\n');
        process.stdout.write('    - Use Ed25519 signature algorithm (recommended)\n');
        process.stdout.write('    - Save API Key ID + API Key Secret\n');
        process.stdout.write('  Then generate a Wallet Secret in the Server Wallet dashboard.\n\n');

        const cdpApiKeyId = await ask('  ? CDP API Key ID: ');
        const cdpApiKeySecret = await ask('  ? CDP API Key Secret: ');
        const cdpWalletSecret = await ask('  ? CDP Wallet Secret: ');

        // CDP environment
        const cdpEnvRaw = (await ask('  ? CDP environment [testnet/mainnet] (default: testnet): ')) || 'testnet';
        const cdpEnvironment = cdpEnvRaw === 'mainnet' ? 'mainnet' : 'testnet';

        // Validate credentials (best-effort)
        if (cdpApiKeyId && cdpApiKeySecret) {
          process.stdout.write('  Validating CDP credentials...\n');
          const valid = await validateCdpCredentials(cdpApiKeyId, cdpApiKeySecret);
          if (valid) {
            process.stdout.write('  ✓ CDP credentials validated\n');
          } else {
            process.stdout.write('  ⚠ Could not validate CDP credentials (will save config anyway)\n');
          }
        }

        secretsToStore['CDP_API_KEY_ID'] = cdpApiKeyId;
        secretsToStore['CDP_API_KEY_SECRET'] = cdpApiKeySecret;
        secretsToStore['CDP_WALLET_SECRET'] = cdpWalletSecret;

        walletProvider = {
          type: 'coinbase',
          apiKeyIdEnvVar: 'CDP_API_KEY_ID',
          apiKeySecretEnvVar: 'CDP_API_KEY_SECRET',
          walletSecretEnvVar: 'CDP_WALLET_SECRET',
          cdpEnvironment,
        };
      } else if (provider === 'metamask') {
        // ----- MetaMask Embedded Wallets -----
        process.stdout.write('\n  MetaMask Embedded Wallets setup:\n');
        process.stdout.write('  Set up MetaMask Embedded Wallets at dashboard.web3auth.io:\n');
        process.stdout.write('    - Create a project and get your Client ID\n');
        process.stdout.write('    - Configure a Custom auth connection (save the Connection ID)\n');
        process.stdout.write('    - Network: sapphire_mainnet (production) or sapphire_devnet (testing)\n');
        process.stdout.write('  Infura RPC access is pre-integrated — no separate key needed.\n\n');

        const metamaskClientId = await ask('  ? Client ID: ');
        const authConnectionId = await ask('  ? Auth Connection ID: ');

        // Web3Auth network
        const networkRaw = (await ask('  ? Web3Auth network [sapphire_mainnet/sapphire_devnet] (default: sapphire_mainnet): ')) || 'sapphire_mainnet';
        const web3AuthNetwork = networkRaw === 'sapphire_devnet' ? 'sapphire_devnet' : 'sapphire_mainnet';

        // Validate credentials (best-effort — requires @web3auth/node-sdk)
        process.stdout.write('  Validating MetaMask credentials...\n');
        try {
          // @ts-expect-error -- optional dependency, may not be installed
          const mod = await import('@web3auth/node-sdk');
          const Web3Auth = mod.default ?? mod.Web3Auth ?? mod;
          const w3a = new Web3Auth({ clientId: metamaskClientId, web3AuthNetwork });
          await w3a.init();
          process.stdout.write('  ✓ MetaMask credentials validated\n');
        } catch {
          process.stdout.write('  ⚠ Could not validate (@web3auth/node-sdk not installed or invalid credentials)\n');
        }

        secretsToStore['METAMASK_CLIENT_ID'] = metamaskClientId;

        walletProvider = {
          type: 'metamask',
          clientIdEnvVar: 'METAMASK_CLIENT_ID',
          authConnectionId,
          web3AuthNetwork,
        };
      }
    }

    // ----- Virtual Cards -----
    let cardIssuerConfig: Record<string, unknown> | undefined;

    if (fundingSources.includes('cards')) {
      process.stdout.write('\n  ? Card issuer:\n');
      process.stdout.write('    ramp             — Ramp Agent Cards (Visa Intelligent Commerce)\n');
      process.stdout.write('    lithic           — Lithic developer card issuing\n');
      process.stdout.write('    marqeta          — Marqeta card issuing platform\n');
      process.stdout.write('    stripe_issuing   — Stripe Issuing\n');
      process.stdout.write('    crossmint        — Crossmint / Lobster.cash scoped cards\n');
      process.stdout.write('    other            — other card issuer\n');
      const issuerRaw = (await ask('    (default: other): ')) || 'other';
      const issuer = (CARD_ISSUERS as readonly string[]).includes(issuerRaw) ? issuerRaw : 'other';

      const issuerApiKey = await ask('  ? Card issuer API key (optional, for webhook validation): ');
      if (issuerApiKey) {
        secretsToStore['CARD_ISSUER_API_KEY'] = issuerApiKey;
      }

      cardIssuerConfig = {
        issuer,
        ...(issuerApiKey ? { apiKeyEnvVar: 'CARD_ISSUER_API_KEY' } : {}),
      };
    }

    // ----- ACH Banking Provider -----
    let achProviderConfig: Record<string, unknown> | undefined;

    if (fundingSources.includes('ach')) {
      process.stdout.write('\n  ? ACH banking provider:\n');
      process.stdout.write('    plaid            — Plaid Transfer webhooks\n');
      process.stdout.write('    moov             — Moov transfer webhooks\n');
      process.stdout.write('    stripe_treasury  — Stripe Treasury ACH events\n');
      process.stdout.write('    modern_treasury  — Modern Treasury payment orders\n');
      process.stdout.write('    column           — Column bank ACH transfers\n');
      const achRaw = (await ask('    (default: plaid): ')) || 'plaid';
      const achProvider = (ACH_PROVIDERS as readonly string[]).includes(achRaw) ? achRaw : 'plaid';

      if (achProvider === 'plaid') {
        process.stdout.write('\n  Plaid Transfer setup:\n');
        process.stdout.write('  Create API keys at dashboard.plaid.com:\n');
        process.stdout.write('    - Client ID + Secret (Sandbox or Production)\n');
        process.stdout.write('    - Configure Transfer webhook URL\n\n');
        const plaidClientId = await ask('  ? Plaid Client ID: ');
        const plaidSecret = await ask('  ? Plaid Secret: ');
        const plaidWebhookSecret = await ask('  ? Plaid Webhook Secret (optional): ');
        if (plaidClientId) secretsToStore['PLAID_CLIENT_ID'] = plaidClientId;
        if (plaidSecret) secretsToStore['PLAID_SECRET'] = plaidSecret;
        if (plaidWebhookSecret) secretsToStore['PLAID_WEBHOOK_SECRET'] = plaidWebhookSecret;
        achProviderConfig = {
          provider: 'plaid',
          clientIdEnvVar: 'PLAID_CLIENT_ID',
          secretEnvVar: 'PLAID_SECRET',
          ...(plaidWebhookSecret ? { webhookSecretEnvVar: 'PLAID_WEBHOOK_SECRET' } : {}),
        };
      } else if (achProvider === 'moov') {
        process.stdout.write('\n  Moov setup:\n');
        process.stdout.write('  Create API credentials at dashboard.moov.io\n\n');
        const moovAccountId = await ask('  ? Moov Account ID: ');
        const moovApiKey = await ask('  ? Moov API Key: ');
        const moovWebhookSecret = await ask('  ? Moov Webhook Secret (optional): ');
        if (moovAccountId) secretsToStore['MOOV_ACCOUNT_ID'] = moovAccountId;
        if (moovApiKey) secretsToStore['MOOV_API_KEY'] = moovApiKey;
        if (moovWebhookSecret) secretsToStore['MOOV_WEBHOOK_SECRET'] = moovWebhookSecret;
        achProviderConfig = {
          provider: 'moov',
          accountIdEnvVar: 'MOOV_ACCOUNT_ID',
          apiKeyEnvVar: 'MOOV_API_KEY',
          ...(moovWebhookSecret ? { webhookSecretEnvVar: 'MOOV_WEBHOOK_SECRET' } : {}),
        };
      } else if (achProvider === 'stripe_treasury') {
        process.stdout.write('\n  Stripe Treasury ACH setup:\n');
        process.stdout.write('  Use your Stripe secret key from dashboard.stripe.com/apikeys\n\n');
        const stripeKey = await ask('  ? Stripe Secret Key (sk_live_... or sk_test_...): ');
        const stripeWebhookSecret = await ask('  ? Stripe Webhook Secret (whsec_...): ');
        if (stripeKey) secretsToStore['STRIPE_SECRET_KEY'] = stripeKey;
        if (stripeWebhookSecret) secretsToStore['STRIPE_WEBHOOK_SECRET'] = stripeWebhookSecret;
        achProviderConfig = {
          provider: 'stripe_treasury',
          apiKeyEnvVar: 'STRIPE_SECRET_KEY',
          ...(stripeWebhookSecret ? { webhookSecretEnvVar: 'STRIPE_WEBHOOK_SECRET' } : {}),
        };
      } else if (achProvider === 'modern_treasury') {
        process.stdout.write('\n  Modern Treasury setup:\n');
        process.stdout.write('  Create API keys at app.moderntreasury.com/developers\n\n');
        const mtApiKey = await ask('  ? Modern Treasury API Key: ');
        const mtOrgId = await ask('  ? Modern Treasury Organization ID: ');
        const mtWebhookKey = await ask('  ? Modern Treasury Webhook Key (optional): ');
        if (mtApiKey) secretsToStore['MT_API_KEY'] = mtApiKey;
        if (mtOrgId) secretsToStore['MT_ORG_ID'] = mtOrgId;
        if (mtWebhookKey) secretsToStore['MT_WEBHOOK_KEY'] = mtWebhookKey;
        achProviderConfig = {
          provider: 'modern_treasury',
          apiKeyEnvVar: 'MT_API_KEY',
          orgIdEnvVar: 'MT_ORG_ID',
          ...(mtWebhookKey ? { webhookKeyEnvVar: 'MT_WEBHOOK_KEY' } : {}),
        };
      } else if (achProvider === 'column') {
        process.stdout.write('\n  Column bank setup:\n');
        process.stdout.write('  Create API keys at dashboard.column.com\n\n');
        const columnApiKey = await ask('  ? Column API Key: ');
        const columnWebhookSecret = await ask('  ? Column Webhook Secret (optional): ');
        if (columnApiKey) secretsToStore['COLUMN_API_KEY'] = columnApiKey;
        if (columnWebhookSecret) secretsToStore['COLUMN_WEBHOOK_SECRET'] = columnWebhookSecret;
        achProviderConfig = {
          provider: 'column',
          apiKeyEnvVar: 'COLUMN_API_KEY',
          ...(columnWebhookSecret ? { webhookSecretEnvVar: 'COLUMN_WEBHOOK_SECRET' } : {}),
        };
      }
    }

    // ----- Treasury / Cash Management -----
    let treasuryProviderConfig: Record<string, unknown> | undefined;

    if (fundingSources.includes('treasury')) {
      process.stdout.write('\n  ? Treasury provider:\n');
      process.stdout.write('    stripe_treasury  — Stripe Treasury (financial accounts, flows)\n');
      process.stdout.write('    modern_treasury  — Modern Treasury (ledger, payment orders)\n');
      process.stdout.write('    column           — Column (bank accounts, book transfers)\n');
      process.stdout.write('    other            — other treasury provider\n');
      const treasuryRaw = (await ask('    (default: stripe_treasury): ')) || 'stripe_treasury';
      const treasuryProvider = (TREASURY_PROVIDERS as readonly string[]).includes(treasuryRaw)
        ? treasuryRaw : 'stripe_treasury';

      if (achProviderConfig && achProviderConfig['provider'] === treasuryProvider) {
        process.stdout.write(`  ✓ Reusing ${treasuryProvider} credentials from ACH setup\n`);
        treasuryProviderConfig = { provider: treasuryProvider, sharedWithAch: true };
      } else if (treasuryProvider === 'stripe_treasury') {
        // Only prompt if not already collected via ACH
        if (!secretsToStore['STRIPE_SECRET_KEY']) {
          process.stdout.write('\n  Stripe Treasury setup:\n');
          const stripeKey = await ask('  ? Stripe Secret Key (sk_live_... or sk_test_...): ');
          if (stripeKey) secretsToStore['STRIPE_SECRET_KEY'] = stripeKey;
        }
        treasuryProviderConfig = { provider: 'stripe_treasury', apiKeyEnvVar: 'STRIPE_SECRET_KEY' };
      } else if (treasuryProvider === 'modern_treasury') {
        if (!secretsToStore['MT_API_KEY']) {
          process.stdout.write('\n  Modern Treasury setup:\n');
          const mtApiKey = await ask('  ? Modern Treasury API Key: ');
          const mtOrgId = await ask('  ? Modern Treasury Organization ID: ');
          if (mtApiKey) secretsToStore['MT_API_KEY'] = mtApiKey;
          if (mtOrgId) secretsToStore['MT_ORG_ID'] = mtOrgId;
        }
        treasuryProviderConfig = { provider: 'modern_treasury', apiKeyEnvVar: 'MT_API_KEY', orgIdEnvVar: 'MT_ORG_ID' };
      } else if (treasuryProvider === 'column') {
        if (!secretsToStore['COLUMN_API_KEY']) {
          process.stdout.write('\n  Column bank setup:\n');
          const columnApiKey = await ask('  ? Column API Key: ');
          if (columnApiKey) secretsToStore['COLUMN_API_KEY'] = columnApiKey;
        }
        treasuryProviderConfig = { provider: 'column', apiKeyEnvVar: 'COLUMN_API_KEY' };
      } else {
        const otherName = await ask('  ? Treasury provider name: ');
        treasuryProviderConfig = { provider: otherName || 'other' };
      }
    }

    // -----------------------------------------------------------------------
    // Secrets Storage (only if any provider has secrets)
    // -----------------------------------------------------------------------

    let secretsStorageConfig: Record<string, string> | undefined;

    if (Object.keys(secretsToStore).length > 0) {
      process.stdout.write('\n  ? Where should secrets be stored?\n');
      process.stdout.write('    1) .env file (default — local, gitignored)\n');
      process.stdout.write('    2) Custom file path\n');
      process.stdout.write('    3) GCP Secret Manager\n');
      process.stdout.write('    4) AWS Secrets Manager\n');
      process.stdout.write('    5) HashiCorp Vault\n');
      const storageChoice = (await ask('    (default: 1): ')) || '1';

      switch (storageChoice) {
        case '2': {
          const customPath = await ask('  ? File path (relative or absolute): ');
          const resolvedPath = customPath || '.env.kontext';
          writeEnvFile(resolvedPath, secretsToStore);
          secretsStorageConfig = { type: 'file', path: resolvedPath };
          process.stdout.write(`  ✓ Secrets saved to ${resolvedPath}\n`);
          break;
        }

        case '3': {
          const gcpProject = await ask('  ? GCP Project ID: ');
          process.stdout.write('\n  Store these secrets in GCP Secret Manager:\n');
          for (const [key, value] of Object.entries(secretsToStore)) {
            process.stdout.write(`    gcloud secrets create ${key} --data-file=- <<< "${value}"\n`);
          }
          process.stdout.write('  Then grant your Cloud Run service account access.\n');
          secretsStorageConfig = { type: 'gcp-secret-manager', project: gcpProject };
          break;
        }

        case '4': {
          const awsRegion = await ask('  ? AWS Region: ');
          process.stdout.write('\n  Store these secrets in AWS Secrets Manager:\n');
          for (const key of Object.keys(secretsToStore)) {
            process.stdout.write(`    aws secretsmanager create-secret --name ${key} --secret-string "..."\n`);
          }
          secretsStorageConfig = { type: 'aws-secrets-manager', region: awsRegion };
          break;
        }

        case '5': {
          const vaultAddress = await ask('  ? Vault address: ');
          process.stdout.write('\n  Store these secrets in Vault:\n');
          const kvPairs = Object.entries(secretsToStore).map(([k, v]) => `${k}="${v}"`).join(' ');
          process.stdout.write(`    vault kv put secret/kontext ${kvPairs}\n`);
          secretsStorageConfig = { type: 'hashicorp-vault', address: vaultAddress };
          break;
        }

        default: {
          // Option 1: .env file
          writeEnvFile('.env', secretsToStore);
          secretsStorageConfig = { type: 'dotenv', path: '.env' };
          process.stdout.write('  ✓ Secrets saved to .env\n');
          break;
        }
      }

      // Attach secretsStorage to walletProvider config (for backwards compatibility)
      if (secretsStorageConfig && provider !== 'none') {
        walletProvider['secretsStorage'] = secretsStorageConfig;
      }
    }

    // Screening providers (multi-select)
    process.stdout.write('\n  ? Screening providers (comma-separated, or skip):\n');
    process.stdout.write('      built-in       — free, limited (~40 addresses, ~19K entities)\n');
    process.stdout.write('      chainalysis    — free API key (address screening, all chains)\n');
    process.stdout.write('      trm            — free API key (address screening, 25 chains)\n');
    process.stdout.write('      opensanctions  — paid API key (address + entity, 290K+ entities)\n');
    const screeningRaw = (await ask('    (default: built-in): ')) || 'built-in';
    const screeningSelections = screeningRaw === 'skip'
      ? []
      : screeningRaw
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s) => (SCREENING_PROVIDERS as readonly string[]).includes(s));
    if (screeningSelections.length === 0 && screeningRaw !== 'skip') {
      screeningSelections.push('built-in');
    }

    // Collect API keys for selected BYOK providers
    const screeningConfig: Record<string, unknown> = {};
    const byokProviders = screeningSelections.filter((s) => s !== 'built-in');

    if (byokProviders.length > 0) {
      process.stdout.write('\n');
      if (byokProviders.includes('chainalysis')) {
        const key = await ask('  ? Chainalysis API key: ');
        if (key) screeningConfig['chainalysisApiKey'] = key;
      }
      if (byokProviders.includes('trm')) {
        const key = await ask('  ? TRM Labs API key: ');
        if (key) screeningConfig['trmApiKey'] = key;
      }
      if (byokProviders.includes('opensanctions')) {
        const key = await ask('  ? OpenSanctions API key: ');
        if (key) screeningConfig['opensanctionsApiKey'] = key;
      }
    }

    // ── Policy configuration ──────────────────────────────────────────────────

    process.stdout.write('\n  ─── Policy configuration ───────────────────────────────────────────\n\n');

    process.stdout.write('  ? Approval threshold (USD):\n');
    process.stdout.write('    Transfers above this amount pause for human confirmation.\n');
    process.stdout.write('    BSA Travel Rule threshold: $3,000.\n');
    const approvalThresholdRaw = await ask('    (press enter to skip): ');
    const approvalThreshold = approvalThresholdRaw && !isNaN(parseFloat(approvalThresholdRaw))
      ? approvalThresholdRaw : undefined;

    process.stdout.write('\n  ? Spend threshold (USD):\n');
    process.stdout.write('    Fire an anomaly alert when a single transaction exceeds this amount.\n');
    process.stdout.write('    BSA CTR reporting threshold: $10,000.\n');
    const spendThresholdRaw = (await ask('    (default: 10000): ')) || '10000';
    const spendThreshold = !isNaN(parseFloat(spendThresholdRaw)) ? spendThresholdRaw : '10000';

    process.stdout.write('\n  ? OFAC authorization mode:\n');
    process.stdout.write('      pre-send   — screen sender/recipient before transfer; block if sanctioned\n');
    process.stdout.write('      post-send  — log OFAC status after transfer (audit trail only)\n');
    const ofacModeRaw = (await ask('    (default: pre-send): ')) || 'pre-send';
    const ofacMode = (OFAC_MODES as readonly string[]).includes(ofacModeRaw) ? ofacModeRaw : 'pre-send';

    process.stdout.write('\n  ? Anomaly detection rules (comma-separated, \'all\', or skip):\n');
    process.stdout.write('      unusualAmount      — flag transactions above the spend threshold\n');
    process.stdout.write('      frequencySpike     — flag when tx rate exceeds N per hour\n');
    process.stdout.write('      newDestination     — flag transfers to previously unseen addresses\n');
    process.stdout.write('      offHoursActivity   — flag activity during configured off-hours (UTC)\n');
    process.stdout.write('      rapidSuccession    — flag transactions that happen too close together\n');
    process.stdout.write('      roundAmount        — flag potential structuring (amounts near $10K, $3K)\n');
    process.stdout.write('      reserveDiscrepancy — flag when on-chain supply diverges from reserves\n');
    const anomalyRaw = (await ask('    (default: unusualAmount, frequencySpike): ')) || 'unusualAmount,frequencySpike';
    let anomalyRules: string[] = [];
    if (anomalyRaw !== 'skip') {
      if (anomalyRaw === 'all') {
        anomalyRules = [...ALL_ANOMALY_RULES];
      } else {
        anomalyRules = anomalyRaw
          .split(',')
          .map((r) => r.trim())
          .filter((r) => (ALL_ANOMALY_RULES as readonly string[]).includes(r));
        if (anomalyRules.length === 0) anomalyRules = ['unusualAmount', 'frequencySpike'];
      }
    }

    const anomalyThresholds: Record<string, unknown> = { maxAmount: spendThreshold };

    if (anomalyRules.includes('frequencySpike')) {
      const freqRaw = (await ask('  ? Max transactions per hour (default: 30): ')) || '30';
      const freq = parseInt(freqRaw, 10);
      if (!isNaN(freq)) anomalyThresholds['maxFrequency'] = freq;
    }

    if (anomalyRules.includes('rapidSuccession')) {
      const secRaw = (await ask('  ? Min seconds between transactions (default: 10): ')) || '10';
      const sec = parseInt(secRaw, 10);
      if (!isNaN(sec)) anomalyThresholds['minIntervalSeconds'] = sec;
    }

    if (anomalyRules.includes('offHoursActivity')) {
      const hoursRaw = (await ask('  ? Off-hours UTC (default: 22,23,0,1,2,3,4,5): ')) || '22,23,0,1,2,3,4,5';
      const hours = hoursRaw.split(',').map((h) => parseInt(h.trim(), 10)).filter((h) => !isNaN(h));
      if (hours.length > 0) anomalyThresholds['offHours'] = hours;
    }

    const policies: Record<string, unknown> = {
      ...(approvalThreshold ? { approvalThreshold } : {}),
      spendThreshold,
      ofacMode,
      ...(anomalyRules.length > 0 ? {
        anomalyRules,
        anomalyThresholds,
      } : {}),
    };

    // Build config
    const config: Record<string, unknown> = {
      $schema: 'https://getkontext.com/schema/config.json',
      projectId,
      agentId,
      ...(agentName ? { agentName } : {}),
      agentType,
      ...(paymentReference ? { paymentReference } : {}),
      environment,
      wallets,
      tokens,
      chains,
      mode,
      ...(fundingSources.length > 0 ? { fundingSources } : {}),
      walletProvider,
      ...(cardIssuerConfig ? { cardIssuer: cardIssuerConfig } : {}),
      ...(achProviderConfig ? { achProvider: achProviderConfig } : {}),
      ...(treasuryProviderConfig ? { treasuryProvider: treasuryProviderConfig } : {}),
    };

    if (secretsStorageConfig) {
      config['secretsStorage'] = secretsStorageConfig;
    }

    if (Object.keys(rpcEndpoints).length > 0) {
      config['rpcEndpoints'] = rpcEndpoints;
    }

    if (fromCountry || toCountry) {
      const corridors: Record<string, string> = {};
      if (fromCountry) corridors['from'] = fromCountry;
      if (toCountry) corridors['to'] = toCountry;
      config['corridors'] = corridors;
    }

    if (screeningSelections.length > 0) {
      config['screening'] = {
        providers: screeningSelections,
        ...screeningConfig,
      };
    }

    if (Object.keys(policies).length > 0) {
      config['policies'] = policies;
    }

    // Write config file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

    // Create .kontext directory
    const kontextDir = path.join(process.cwd(), '.kontext');
    if (!fs.existsSync(kontextDir)) {
      fs.mkdirSync(kontextDir, { recursive: true });
    }

    // Generate kontext setup file
    const isTypeScript = fs.existsSync(path.join(process.cwd(), 'tsconfig.json'));
    const setupExt = isTypeScript ? 'ts' : 'js';
    const setupPath = path.join(process.cwd(), `kontext.${setupExt}`);
    const setupContent = generateSetupFile(mode, screeningSelections, isTypeScript, {
      agentName: agentName || undefined,
      agentType,
      paymentReference,
      approvalThreshold,
      anomalyRules: anomalyRules.length > 0 ? anomalyRules : undefined,
      anomalyThresholds: anomalyRules.length > 0 ? anomalyThresholds : undefined,
      fundingSources: fundingSources.length > 0 ? fundingSources : undefined,
      achProvider: achProviderConfig ? String(achProviderConfig['provider']) : undefined,
      cardIssuer: cardIssuerConfig ? String(cardIssuerConfig['issuer']) : undefined,
      treasuryProvider: treasuryProviderConfig ? String(treasuryProviderConfig['provider']) : undefined,
    });
    fs.writeFileSync(setupPath, setupContent);

    // Summary
    process.stdout.write('\n');
    if (authProfile) {
      process.stdout.write(`  ✓ Authenticated (${authProfile.plan} plan)\n`);
    }
    process.stdout.write('  ✓ Created kontext.config.json\n');
    process.stdout.write(`  ✓ Created kontext.${setupExt}\n`);
    process.stdout.write('  ✓ Created .kontext/ directory\n');
    if (agentName) {
      process.stdout.write(`  ✓ Agent: ${agentName} (${agentType})\n`);
    }
    if (paymentReference) {
      process.stdout.write(`  ✓ Payment reference: ${paymentReference}\n`);
    }
    if (wallets.length > 0) {
      process.stdout.write(`  ✓ Monitoring ${wallets.length} wallet${wallets.length > 1 ? 's' : ''} on ${chains.join(', ')}\n`);
    }
    process.stdout.write(`  ✓ Tokens: ${tokens.join(', ')} | Chains: ${chains.join(', ')} | Mode: ${mode}\n`);
    process.stdout.write(`  ✓ OFAC: ${ofacMode} screening\n`);
    if (approvalThreshold) {
      process.stdout.write(`  ✓ Approval threshold: $${approvalThreshold}\n`);
    }
    process.stdout.write(`  ✓ Spend alert: $${spendThreshold}\n`);
    if (anomalyRules.length > 0) {
      process.stdout.write(`  ✓ Anomaly rules: ${anomalyRules.join(', ')}\n`);
    }
    if (fundingSources.length > 0) {
      process.stdout.write(`  ✓ Funding sources: ${fundingSources.join(', ')}\n`);
    }
    if (provider !== 'none') {
      const envLabel = provider === 'circle'
        ? (walletProvider as Record<string, unknown>)['circleEnvironment']
        : provider === 'coinbase'
          ? (walletProvider as Record<string, unknown>)['cdpEnvironment']
          : (walletProvider as Record<string, unknown>)['web3AuthNetwork'];
      process.stdout.write(`  ✓ Wallet provider: ${provider} (${envLabel})\n`);
    }
    if (cardIssuerConfig) {
      process.stdout.write(`  ✓ Card issuer: ${cardIssuerConfig['issuer']}\n`);
    }
    if (achProviderConfig) {
      process.stdout.write(`  ✓ ACH provider: ${achProviderConfig['provider']}\n`);
    }
    if (treasuryProviderConfig) {
      process.stdout.write(`  ✓ Treasury provider: ${treasuryProviderConfig['provider']}\n`);
    }
    if (screeningSelections.length > 0) {
      process.stdout.write(`  ✓ Screening: ${screeningSelections.join(', ')}\n`);
    }

    // Coverage warning for built-in only
    if (screeningSelections.includes('built-in') && byokProviders.length === 0) {
      process.stdout.write('\n  ⚠ Built-in screening covers ~3% of OFAC crypto addresses.\n');
      process.stdout.write('    For production, consider adding a screening provider key.\n');
    }

    // Mode-aware integration message
    const isPreSend = mode === 'pre-send' || mode === 'both';
    process.stdout.write('\n  Add to your entry file:\n\n');
    if (isPreSend) {
      process.stdout.write("    import { kontext, withKontextCompliance } from './kontext'\n");
      process.stdout.write('    const client = withKontextCompliance(rawClient, kontext)\n');
    } else {
      process.stdout.write("    import './kontext'\n");
    }

    process.stdout.write('\n  The verification layer for agents and humans that move money.\n\n');
  } finally {
    close();
  }
}
