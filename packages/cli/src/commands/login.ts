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

/**
 * Read stored credential (JWT or API key).
 * Checks env var → OS keychain → fallback file.
 * Returns JWT (ey...) if available, else raw API key (sk_...).
 */
export function keychainLoad(): string | null {
  // 1. Environment variable (GCP Compute / Cloud Run / CI)
  const envKey = process.env['KONTEXT_API_KEY'];
  if (envKey?.startsWith('sk_') || envKey?.startsWith('ey')) return envKey;

  // 2. macOS Keychain
  if (isMac()) {
    try {
      const cred = execFileSync('security', [
        'find-generic-password',
        '-a', ACCOUNT_NAME,
        '-s', SERVICE_NAME,
        '-w',
      ], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      if (cred.startsWith('sk_') || cred.startsWith('ey')) return cred;
    } catch { /* not found */ }
  }

  // 3. Linux secret-tool
  if (isLinux()) {
    try {
      const cred = execFileSync('secret-tool', [
        'lookup',
        'service', SERVICE_NAME,
        'username', ACCOUNT_NAME,
      ], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      if (cred.startsWith('sk_') || cred.startsWith('ey')) return cred;
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
      const cred = Buffer.from(buf.map((b, i) => b ^ (parseInt(machineId[i % 64]!, 16)))).toString('utf-8');
      if (cred.startsWith('sk_') || cred.startsWith('ey')) return cred;
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
  userId: string | null;
  role?: string;
  keyPrefix: string | null;
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

/**
 * Exchange a raw API key for a short-lived JWT pair via POST /v1/auth/token.
 * Graceful fallback: if server doesn't support JWT exchange, store raw key.
 */
async function exchangeForJwt(apiKey: string): Promise<{ accessToken: string; role: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken?: string; role?: string };
    if (data.accessToken) return { accessToken: data.accessToken, role: data.role ?? 'admin' };
    return null;
  } catch {
    return null;
  }
}

/** Decode JWT payload without verification (display only — not a security check). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const padded = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>;
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

  // Exchange API key for JWT (shorter-lived, carries role). Graceful fallback to raw key.
  let credToStore: string = apiKey;
  let role: string = profile.role ?? 'admin';
  const jwtResult = await exchangeForJwt(apiKey);
  if (jwtResult) {
    credToStore = jwtResult.accessToken;
    role = jwtResult.role;
  }

  const storageType = await keychainStore(credToStore);
  const storageLabel = storageType === 'keychain' ? 'OS keychain' : FALLBACK_CRED_FILE;

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ...profile, role, stored: storageLabel }, null, 2) + '\n');
    return;
  }

  process.stdout.write(`  ✓ Authenticated (${profile.plan} plan, ${role})\n`);
  process.stdout.write(`  ✓ ${profile.monthlyEventCount.toLocaleString()} events this month\n`);
  process.stdout.write(`  ✓ Credentials stored securely in ${storageLabel}\n`);
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
  const cred = keychainLoad();
  if (!cred) {
    process.stderr.write('\n  Not logged in. Run: npx @kontext-sdk/cli login\n\n');
    process.exit(1);
  }

  // If JWT: decode role locally (no network). If API key: hit /v1/account.
  let role: string | undefined;
  let orgId: string | null = null;
  if (cred.startsWith('ey')) {
    const jwt = decodeJwtPayload(cred);
    role = jwt?.['role'] as string | undefined;
    orgId = jwt?.['orgId'] as string | null ?? null;
    const exp = jwt?.['exp'] as number | undefined;
    if (exp && exp * 1000 < Date.now()) {
      process.stderr.write('\n  Session expired. Run: npx @kontext-sdk/cli login\n\n');
      process.exit(1);
    }
  }

  const profile = await validateApiKey(cred);
  if (!profile) {
    process.stderr.write('\n  Stored credentials are invalid. Run: npx @kontext-sdk/cli login\n\n');
    process.exit(1);
  }

  const displayRole = role ?? profile.role ?? 'admin';
  const displayOrg = orgId ?? profile.orgId;

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ...profile, role: displayRole }, null, 2) + '\n');
    return;
  }

  process.stdout.write('\n');
  process.stdout.write(`  Plan:        ${profile.plan}\n`);
  process.stdout.write(`  Role:        ${displayRole}\n`);
  process.stdout.write(`  Events:      ${profile.monthlyEventCount.toLocaleString()} this month\n`);
  if (profile.keyPrefix) process.stdout.write(`  Key prefix:  ${profile.keyPrefix}\n`);
  if (displayOrg) process.stdout.write(`  Org:         ${displayOrg}\n`);
  process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Team commands
// ---------------------------------------------------------------------------

export async function runTeamInvite(
  email: string,
  role: string,
  opts: { json: boolean },
): Promise<void> {
  const cred = keychainLoad();
  if (!cred) {
    process.stderr.write('\n  Not logged in. Run: npx @kontext-sdk/cli login\n\n');
    process.exit(1);
  }

  if (!['admin', 'staff-dev', 'staff-risk'].includes(role)) {
    process.stderr.write(`\n  Invalid role: ${role}. Must be admin, staff-dev, or staff-risk.\n\n`);
    process.exit(1);
  }

  const res = await fetch(`${API_BASE}/v1/auth/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cred}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, role }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    process.stderr.write(`\n  Error: ${err.error ?? 'Failed to create invite'}\n\n`);
    process.exit(1);
  }

  const data = await res.json() as { inviteUrl: string; expiresIn: string };

  if (opts.json) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return;
  }

  process.stdout.write('\n');
  process.stdout.write(`  ✓ Invite created for ${email} (${role})\n`);
  process.stdout.write(`  ✓ Send them this link (expires in ${data.expiresIn}):\n\n`);
  process.stdout.write(`    ${data.inviteUrl}\n\n`);
}

export async function runTeamList(opts: { json: boolean }): Promise<void> {
  const cred = keychainLoad();
  if (!cred) {
    process.stderr.write('\n  Not logged in. Run: npx @kontext-sdk/cli login\n\n');
    process.exit(1);
  }

  const res = await fetch(`${API_BASE}/v1/team/members`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${cred}` },
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 403) {
    process.stderr.write('\n  Team management requires admin role.\n\n');
    process.exit(1);
  }
  if (!res.ok) {
    process.stderr.write('\n  Failed to fetch team members.\n\n');
    process.exit(1);
  }

  const data = await res.json() as { members: Array<{ email: string; role: string; status: string; joined_at: string | null }> };

  if (opts.json) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return;
  }

  process.stdout.write('\n  Team members:\n\n');
  for (const m of data.members) {
    const joined = m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'pending';
    process.stdout.write(`    ${m.email.padEnd(40)} ${m.role.padEnd(12)} ${m.status.padEnd(10)} ${joined}\n`);
  }
  process.stdout.write('\n');
}

export async function runTeamRevoke(userId: string, opts: { json: boolean }): Promise<void> {
  const cred = keychainLoad();
  if (!cred) {
    process.stderr.write('\n  Not logged in. Run: npx @kontext-sdk/cli login\n\n');
    process.exit(1);
  }

  const res = await fetch(`${API_BASE}/v1/team/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${cred}` },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    process.stderr.write(`\n  Error: ${err.error ?? 'Failed to revoke access'}\n\n`);
    process.exit(1);
  }

  const data = await res.json() as { keysRevoked: number };

  if (opts.json) {
    process.stdout.write(JSON.stringify({ revoked: true, userId, keysRevoked: data.keysRevoked }, null, 2) + '\n');
    return;
  }

  process.stdout.write(`\n  ✓ Access revoked for ${userId} (${data.keysRevoked} API key(s) revoked)\n\n`);
}
