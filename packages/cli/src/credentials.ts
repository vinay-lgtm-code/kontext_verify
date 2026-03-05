// ============================================================================
// Credential storage — ~/.kontext/credentials.json
// ============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Profile {
  apiKey: string;
  apiUrl: string;
  createdAt: string;
  plan?: string;
}

export interface CredentialFile {
  version: 1;
  profiles: Record<string, Profile>;
  activeProfile: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function getCredentialPath(): string {
  return join(homedir(), '.kontext', 'credentials.json');
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export function readCredentials(): CredentialFile | null {
  const path = getCredentialPath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    const data = JSON.parse(raw) as CredentialFile;
    if (data.version !== 1 || typeof data.profiles !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeCredentials(creds: CredentialFile): void {
  const path = getCredentialPath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(path, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// Profile management
// ---------------------------------------------------------------------------

function defaultCredentials(): CredentialFile {
  return { version: 1, profiles: {}, activeProfile: 'default' };
}

export function getActiveProfile(): Profile | null {
  const creds = readCredentials();
  if (!creds) return null;
  return creds.profiles[creds.activeProfile] ?? null;
}

export function setProfile(name: string, profile: Profile): void {
  const creds = readCredentials() ?? defaultCredentials();
  creds.profiles[name] = profile;
  creds.activeProfile = name;
  writeCredentials(creds);
}

export function removeProfile(name: string): void {
  const creds = readCredentials();
  if (!creds) return;
  delete creds.profiles[name];
  if (creds.activeProfile === name) {
    const remaining = Object.keys(creds.profiles);
    creds.activeProfile = remaining[0] ?? 'default';
  }
  writeCredentials(creds);
}

// ---------------------------------------------------------------------------
// API key resolution (precedence chain)
// ---------------------------------------------------------------------------

export function resolveApiKey(flags?: { apiKey?: string }): string | null {
  // 1. Explicit flag
  if (flags?.apiKey) return flags.apiKey;

  // 2. Environment variable
  const envKey = process.env['KONTEXT_API_KEY'];
  if (envKey) return envKey;

  // 3. Global credentials file
  const profile = getActiveProfile();
  if (profile) return profile.apiKey;

  // 4. Project-local credentials file
  const localPath = join(process.cwd(), '.kontext', 'credentials.json');
  if (existsSync(localPath)) {
    try {
      const raw = readFileSync(localPath, 'utf8');
      const data = JSON.parse(raw) as CredentialFile;
      const localProfile = data.profiles[data.activeProfile];
      if (localProfile) return localProfile.apiKey;
    } catch {
      // ignore malformed local credentials
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function maskApiKey(key: string): string {
  if (key.length <= 12) return '****';
  return key.slice(0, 8) + '****' + key.slice(-4);
}
