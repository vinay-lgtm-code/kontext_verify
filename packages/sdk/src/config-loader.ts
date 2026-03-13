// ============================================================================
// Kontext SDK - Config File Loader
// ============================================================================
// Discovers and loads kontext.config.json, walking up from cwd to root.

import * as fs from 'fs';
import * as path from 'path';
import type { Chain, Token, Environment } from './types.js';

const CONFIG_FILENAME = 'kontext.config.json';

/** Shape of the kontext.config.json file */
export interface KontextConfigFile {
  $schema?: string;
  projectId: string;
  agentId?: string;
  environment?: Environment;
  wallets?: string[];
  tokens?: Token[];
  chains?: Chain[];
  rpcEndpoints?: Partial<Record<Chain, string>>;
  mode?: 'post-send' | 'pre-send' | 'both';
  corridors?: {
    from?: string;
    to?: string;
  };
  thresholds?: {
    alertAmount?: string;
    ctrAmount?: string;
  };
  apiKey?: string;
}

/**
 * Discover and load kontext.config.json by walking up from startDir.
 * Returns the parsed config file contents, or null if not found.
 */
export function loadConfigFile(startDir?: string): KontextConfigFile | null {
  const dir = startDir ?? process.cwd();
  const filePath = findConfigFile(dir);
  if (!filePath) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as KontextConfigFile;
    if (!parsed.projectId || typeof parsed.projectId !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Walk up from dir looking for kontext.config.json.
 * Returns the full path if found, null otherwise.
 */
function findConfigFile(dir: string): string | null {
  let current = path.resolve(dir);
  const root = path.parse(current).root;

  while (true) {
    const candidate = path.join(current, CONFIG_FILENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current || current === root) {
      return null;
    }
    current = parent;
  }
}
