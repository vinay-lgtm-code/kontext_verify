// ============================================================================
// kontext login / logout / whoami — GCP-backed CLI authentication
// ============================================================================
//
// Security model:
//   - API keys validated against api.getkontext.com (Cloud Run → Firestore)
//   - Keys stored in OS keychain via execFileSync (no shell interpolation)
//   - Fallback: ~/.kontext/.credentials with chmod 0600 + obfuscation
//   - Credential reads: KONTEXT_API_KEY env → OS keychain → fallback file
//
// ============================================================================

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';

const API_BASE = process.env['KONTEXT_API_URL'] ?? 'https://api.getkontext.com';
const SERVICE_NAME = 'kontext-cli';
const ACCOUNT_NAME = 'kontext';
const FALLBACK_CRED_DIR = path.join(os.homedir(), '.kontext');
const FALLBACK_CRED_FILE = path.join(FALLBACK_CRED_DIR, '.credentials');

// ---------------------------------------------------------------------------
// OS keychain helpers — all shell calls use execFileSync with arg arrays
// ---------------------------------------------------------------------------

function isMac(): boolean {
  return process.platform === 'darwin';
}

function isLinux(): boolean {
  return process.platform === 'linux';
}

/** Store API key in OS keychain. Returns 'keychain' or 'file'. */
async function keychainStore(apiKey: string): Promise<'keychain' | 'file'> {
  if (isMac()) {
    try {
      // Remove existing entry silently
      try {
        execFileSync('security', [
          'delete-generic-password',
          '-a', ACCOUNT_NAME,
          '-s', SERVICE_NAME,
        ], { stdio: 'pipe' });
      } catch { /* not found — fine */ }
      execFileSync('security', [
        'add-generic-password',
        '-a', ACCOUNT_NAME,
        '-s', SERVICE_NAME,
        '-w', apiKey,
      ], { stdio: 'pipe' });
      return 'keychain';
    } catch { /* fall through */ }
  }

  if (isLinux()) {
    try {
      execFileSync('secret-tool', [
        'store',
        '--label=Kontext CLI',
        'service', SERVICE_NAME,
        'username', ACCOUNT_NAME,
      ], { input: apiKey, stdio: ['pipe', 'pipe', 'pipe'] });
      return 'keychain';
    } catch { /* secret-tool not installed */ }
  }

  return keychainStoreFallback(apiKey);
}

function keychainStoreFallback(apiKey: string): 'file' {
  if (!fs.existsSync(FALLBACK_CRED_DIR)) {
    fs.mkdirSync(FALLBACK_CRED_DIR, { recursive: true });
  }
  // XOR-obfuscate with machine-derived key (prevents casual plaintext read)
  const machineId = crypto.createHash('sha256')
    .update(os.hostname() + os.userInfo().username)
    .digest('hex');
  const obfuscated = Buffer.from(Buffer.from(apiKey).map((b, i) => b ^ (parseInt(machineId[i % 64]!, 16))));
  fs.writeFileSync(FALLBACK_CRED_FILE, obfuscated.toString('hex'), { mode: 0o600 });
  return 'file';
}

/** Read API key — checks env var, then OS keychain, then fallback file. */
export function keychainLoad(): string | null {
  // 1. Environment variable (GCP Compute / Cloud Run / CI)
  const envKey = process.env['KONTEXT_API_KEY'];
  if (envKey?.startsWith('sk_')) return envKey;

  // 2. macOS Keychain
  if (isMac()) {
    try {
      const key = execFileSync('security', [
        'find-generic-password',
        '-a', ACCOUNT_NAME,
        '-s', SERVICE_NAME,
        '-w',
      ], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      if (key.startsWith('sk_')) return key;
    } catch { /* not found */ }
  }

  // 3. Linux secret-tool
  if (isLinux()) {
    try {
      const key = execFileSync('secret-tool', [
        'lookup',
        'service', SERVICE_NAME,
        'username', ACCOUNT_NAME,
      ], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      if (key.startsWith('sk_')) return key;
    } catch { /* not found */ }
  }

  // 4. Obfuscated fallback file
  if (fs.existsSync(FALLBACK_CRED_FILE)) {
    try {
      const machineId = crypto.createHash('sha256')
        .update(os.hostname() + os.userInfo().username)
        .digest('hex');
      const hex = fs.readFileSync(FALLBACK_CRED_FILE, 'utf-8').trim();
      const buf = Buffer.from(hex, 'hex');
      const key = Buffer.from(buf.map((b, i) => b ^ (parseInt(machineId[i % 64]!, 16)))).toString('utf-8');
      if (key.startsWith('sk_')) return key;
    } catch { /* corrupted */ }
  }

  return null;
}

/** Remove API key from OS keychain and fallback file. */
function keychainDelete(): boolean {
  let removed = false;

  if (isMac()) {
    try {
      execFileSync('security', [
        'delete-generic-password',
        '-a', ACCOUNT_NAME,
        '-s', SERVICE_NAME,
      ], { stdio: 'pipe' });
      removed = true;
    } catch { /* not found */ }
  }

  if (isLinux()) {
    try {
      execFileSync('secret-tool', [
        'clear',
        'service', SERVICE_NAME,
        'username', ACCOUNT_NAME,
      ], { stdio: 'pipe' });
      removed = true;
    } catch { /* not found */ }
  }

  if (fs.existsSync(FALLBACK_CRED_FILE)) {
    fs.unlinkSync(FALLBACK_CRED_FILE);
    removed = true;
  }

  return removed;
}

// ---------------------------------------------------------------------------
// API validation
// ---------------------------------------------------------------------------

export interface AccountProfile {
  authenticated: boolean;
  plan: string;
  orgId: string | null;
  keyPrefix: string;
  monthlyEventCount: number;
  billingPeriodStart: string;
}

export async function validateApiKey(apiKey: string): Promise<AccountProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/account`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Project-Id': 'cli',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json() as AccountProfile;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Masked password prompt
// ---------------------------------------------------------------------------

function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // Non-interactive: read line from stdin
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }
    process.stdout.write(question);
    process.stdin.setRawMode!(true);
    process.stdin.resume();
    let input = '';
    const handler = (char: Buffer): void => {
      const ch = char.toString();
      if (ch === '\r' || ch === '\n') {
        process.stdin.setRawMode!(false);
        process.stdin.removeListener('data', handler);
        process.stdout.write('\n');
        resolve(input);
      } else if (ch === '\u0003') {
        process.exit(1);
      } else if (ch === '\u007f') {
        if (input.length > 0) { input = input.slice(0, -1); process.stdout.write('\b \b'); }
      } else {
        input += ch;
        process.stdout.write('•');
      }
    };
    process.stdin.on('data', handler);
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export async function runLogin(opts: { json: boolean }): Promise<void> {
  process.stdout.write('\n  The verification layer for agents and humans that move money\n\n');

  const apiKey = await promptSecret('  ? API key (sk_live_...): ');
  if (!apiKey) {
    process.stderr.write('  No API key entered.\n');
    process.exit(1);
  }

  process.stdout.write('  Verifying with api.getkontext.com...\n');
  const profile = await validateApiKey(apiKey);

  if (!profile) {
    process.stderr.write('  Invalid API key. Check your key at getkontext.com/settings/api-keys\n\n');
    process.exit(1);
  }

  const storageType = await keychainStore(apiKey);
  const storageLabel = storageType === 'keychain' ? 'OS keychain' : FALLBACK_CRED_FILE;

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ...profile, stored: storageLabel }, null, 2) + '\n');
    return;
  }

  process.stdout.write(`  ✓ Authenticated (${profile.plan} plan)\n`);
  process.stdout.write(`  ✓ ${profile.monthlyEventCount.toLocaleString()} events this month\n`);
  process.stdout.write(`  ✓ Key stored securely in ${storageLabel}\n`);
  if (storageType === 'file') {
    process.stdout.write('\n  ⚠ OS keychain not available — stored in obfuscated file (chmod 0600).\n');
    process.stdout.write('    For CI/CD, set KONTEXT_API_KEY environment variable instead.\n');
  }
  process.stdout.write('\n');
}

export async function runLogout(opts: { json: boolean }): Promise<void> {
  const removed = keychainDelete();

  if (opts.json) {
    process.stdout.write(JSON.stringify({ loggedOut: removed }, null, 2) + '\n');
    return;
  }

  process.stdout.write(removed
    ? '\n  ✓ Credentials removed\n\n'
    : '\n  No stored credentials found.\n\n');
}

export async function runWhoami(opts: { json: boolean }): Promise<void> {
  const apiKey = keychainLoad();
  if (!apiKey) {
    process.stderr.write('\n  Not logged in. Run: npx @kontext-sdk/cli login\n\n');
    process.exit(1);
  }

  const profile = await validateApiKey(apiKey);
  if (!profile) {
    process.stderr.write('\n  Stored credentials are invalid. Run: npx @kontext-sdk/cli login\n\n');
    process.exit(1);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(profile, null, 2) + '\n');
    return;
  }

  process.stdout.write('\n');
  process.stdout.write(`  Plan:        ${profile.plan}\n`);
  process.stdout.write(`  Events:      ${profile.monthlyEventCount.toLocaleString()} this month\n`);
  process.stdout.write(`  Key prefix:  ${profile.keyPrefix}\n`);
  if (profile.orgId) {
    process.stdout.write(`  Org:         ${profile.orgId}\n`);
  }
  process.stdout.write('\n');
}
