import * as fs from 'fs';
import * as path from 'path';
import { defaultWorkspaceProfile, PAYMENT_PRESETS } from '@kontext/core';
import type { Archetype, Chain, SettlementAsset } from '@kontext/core';

const ARCHETYPES: Archetype[] = ['payroll', 'remittance', 'invoicing', 'treasury', 'micropayments'];
const CHAINS: Chain[] = ['base', 'ethereum', 'solana'];
const ASSETS: SettlementAsset[] = ['USDC', 'EURC', 'USDT'];

function parseMultiSelect(input: string, options: string[]): string[] {
  return input
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => options.includes(s));
}

async function ask(
  rl: { question: (prompt: string) => Promise<string> },
  prompt: string,
  fallback?: string,
): Promise<string> {
  const suffix = fallback !== undefined ? ` [${fallback}]` : '';
  const response = (await rl.question(`${prompt}${suffix}: `)).trim();
  return response === '' && fallback !== undefined ? fallback : response;
}

export async function runInit(): Promise<void> {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    process.stdout.write('\nKontext Workspace Setup\n');
    process.stdout.write('Configure your payment control plane.\n\n');

    const workspaceId = await ask(rl, 'Workspace ID', path.basename(process.cwd()));
    const name = await ask(rl, 'Workspace name', workspaceId);

    // Archetype selection
    process.stdout.write('\nPayment archetypes (comma-separated):\n');
    ARCHETYPES.forEach((a, i) => {
      if (a === 'micropayments') {
        process.stdout.write(`  ${i + 1}. ${a} (micro-payments, max $100)\n`);
      } else {
        const preset = PAYMENT_PRESETS[a];
        process.stdout.write(`  ${i + 1}. ${a} (max tx: $${preset.policy.maxTransactionAmount})\n`);
      }
    });
    const archetypeInput = await ask(rl, 'Select archetypes (e.g. "payroll,invoicing" or numbers "1,3")', 'invoicing');
    let archetypes = parseMultiSelect(archetypeInput, ARCHETYPES) as Archetype[];
    if (archetypes.length === 0) {
      // Try parsing as numbers
      const nums = archetypeInput.split(',').map((s) => parseInt(s.trim(), 10) - 1);
      archetypes = nums.filter((n) => n >= 0 && n < ARCHETYPES.length).map((n) => ARCHETYPES[n]!) as Archetype[];
    }
    if (archetypes.length === 0) archetypes = ['invoicing'];

    // Chain selection
    process.stdout.write('\nChains (comma-separated):\n');
    CHAINS.forEach((c, i) => process.stdout.write(`  ${i + 1}. ${c}\n`));
    const chainInput = await ask(rl, 'Select chains', 'base');
    let chains = parseMultiSelect(chainInput, CHAINS) as Chain[];
    if (chains.length === 0) chains = ['base'];

    // Asset selection
    process.stdout.write('\nSettlement assets (comma-separated):\n');
    ASSETS.forEach((a, i) => process.stdout.write(`  ${i + 1}. ${a}\n`));
    const assetInput = await ask(rl, 'Select assets', 'USDC');
    let assets = parseMultiSelect(assetInput, ASSETS.map((a) => a.toLowerCase()));
    if (assets.length === 0) assets = ['usdc'];
    const normalizedAssets = assets.map((a) => a.toUpperCase()) as SettlementAsset[];

    // Policy posture
    const postureInput = await ask(rl, 'Policy posture (monitor/enforce)', 'enforce');
    const policyPosture = postureInput === 'monitor' ? 'monitor' as const : 'enforce' as const;

    // Build profile
    const profile = defaultWorkspaceProfile(workspaceId, name, archetypes);
    profile.chains = chains;
    profile.assets = normalizedAssets;
    profile.policyPosture = policyPosture;

    // Write config
    const configDir = path.resolve(process.cwd(), '.kontext');
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    const configPath = path.resolve(configDir, 'profile.json');
    fs.writeFileSync(configPath, JSON.stringify(profile, null, 2) + '\n', 'utf-8');

    process.stdout.write(`\nWorkspace profile saved to ${configPath}\n`);
    process.stdout.write(`Archetypes: ${archetypes.join(', ')}\n`);
    process.stdout.write(`Chains: ${chains.join(', ')}\n`);
    process.stdout.write(`Assets: ${normalizedAssets.join(', ')}\n`);
    process.stdout.write(`Policy posture: ${policyPosture}\n\n`);
    process.stdout.write('Next: use kontext-sdk to start recording payment attempts.\n\n');
  } finally {
    rl.close();
  }
}
