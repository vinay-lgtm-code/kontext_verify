import * as fs from 'fs';
import * as path from 'path';
import type { WorkspaceProfile } from '@kontext/core';

interface WorkspaceOptions {
  json: boolean;
  configPath?: string;
}

function findProfile(configPath?: string): WorkspaceProfile | null {
  const candidates = configPath
    ? [configPath]
    : [
        path.resolve(process.cwd(), '.kontext', 'profile.json'),
        path.resolve(process.cwd(), 'kontext.config.json'),
      ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      return JSON.parse(content) as WorkspaceProfile;
    }
  }
  return null;
}

export async function runWorkspace(options: WorkspaceOptions): Promise<void> {
  const profile = findProfile(options.configPath);

  if (!profile) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ error: 'No workspace profile found. Run `kontext init` first.' }) + '\n');
    } else {
      process.stdout.write('No workspace profile found. Run `kontext init` to create one.\n');
    }
    return;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(profile, null, 2) + '\n');
    return;
  }

  process.stdout.write(`\nWorkspace: ${profile.name}\n`);
  process.stdout.write(`ID: ${profile.workspaceId}\n`);
  process.stdout.write(`Version: ${profile.version}\n`);
  process.stdout.write(`Archetypes: ${profile.archetypes.join(', ')}\n`);
  process.stdout.write(`Chains: ${profile.chains.join(', ')}\n`);
  process.stdout.write(`Assets: ${profile.assets.join(', ')}\n`);
  process.stdout.write(`Policy posture: ${profile.policyPosture}\n`);
  process.stdout.write(`Created: ${profile.createdAt}\n`);
  process.stdout.write(`Updated: ${profile.updatedAt}\n\n`);

  if (Object.keys(profile.policies).length > 0) {
    process.stdout.write('Policies:\n');
    for (const [archetype, policy] of Object.entries(profile.policies)) {
      if (policy) {
        process.stdout.write(`  ${archetype}: max tx $${policy.maxTransactionAmount}, daily $${policy.dailyAggregateLimit}\n`);
      }
    }
    process.stdout.write('\n');
  }
}
