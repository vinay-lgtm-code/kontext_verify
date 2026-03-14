// ============================================================================
// kontext init — interactive wizard for project setup
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';

const TOKENS = ['USDC', 'USDT', 'DAI', 'EURC'] as const;
const CHAINS = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'] as const;
const MODES = ['post-send', 'pre-send', 'both'] as const;
const ENVIRONMENTS = ['production', 'staging', 'development'] as const;
const WALLET_PROVIDERS = ['none', 'circle', 'coinbase', 'metamask'] as const;

const DEFAULT_RPC: Record<string, string> = {
  base: 'https://mainnet.base.org',
  ethereum: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

const CIRCLE_API_BASE = 'https://api.circle.com';
const CDP_API_BASE = 'https://api.cdp.coinbase.com';

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
      walletProvider: { type: 'none' },
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
    process.stdout.write('    - Wallet provider setup (Circle, Coinbase, MetaMask)\n');
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

    // -----------------------------------------------------------------------
    // Wallet Provider
    // -----------------------------------------------------------------------

    process.stdout.write('\n  ? Wallet provider:\n');
    process.stdout.write('    none     — manual wallet management (viem, ethers, etc.)\n');
    process.stdout.write('    circle   — Circle Programmable Wallets\n');
    process.stdout.write('    coinbase — Coinbase Developer Platform (CDP) Wallets\n');
    process.stdout.write('    metamask — MetaMask Embedded Wallets (Node.js)\n');
    const providerRaw = (await ask('    (default: none): ')) || 'none';
    const provider = (WALLET_PROVIDERS as readonly string[]).includes(providerRaw)
      ? providerRaw
      : 'none';

    let walletProvider: Record<string, unknown> = { type: 'none' };
    const secretsToStore: Record<string, string> = {};

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

    // -----------------------------------------------------------------------
    // Secrets Storage (only if a provider was selected)
    // -----------------------------------------------------------------------

    let secretsStorageConfig: Record<string, string> | undefined;

    if (provider !== 'none' && Object.keys(secretsToStore).length > 0) {
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

      // Attach secretsStorage to walletProvider config
      if (secretsStorageConfig) {
        walletProvider['secretsStorage'] = secretsStorageConfig;
      }
    }

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
      walletProvider,
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
    if (provider !== 'none') {
      const envLabel = provider === 'circle'
        ? (walletProvider as Record<string, unknown>)['circleEnvironment']
        : provider === 'coinbase'
          ? (walletProvider as Record<string, unknown>)['cdpEnvironment']
          : (walletProvider as Record<string, unknown>)['web3AuthNetwork'];
      process.stdout.write(`  ✓ Wallet provider: ${provider} (${envLabel})\n`);
    }

    process.stdout.write('\n  Next: add 2 lines to your code:\n\n');
    process.stdout.write("    import { Kontext, withKontextCompliance } from 'kontext-sdk';\n");
    process.stdout.write('    const kontext = Kontext.init();\n');
    process.stdout.write('    const client = withKontextCompliance(rawClient, kontext);\n');
    process.stdout.write('\n');
  } finally {
    close();
  }
}
