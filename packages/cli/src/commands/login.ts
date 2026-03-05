// ============================================================================
// kontext login — authenticate with getkontext.com
// ============================================================================

import { createInterface } from 'readline';
import { setProfile, maskApiKey, getActiveProfile, getCredentialPath } from '../credentials.js';
import { printBanner, success, error, info, isTTY, createSpinner, green, dim, bold, cyan } from '../ui.js';

export interface LoginArgs {
  json: boolean;
  apiKey?: string;
}

const DEFAULT_API_URL = 'https://api.getkontext.com';

// ---------------------------------------------------------------------------
// API key validation
// ---------------------------------------------------------------------------

interface UsageResponse {
  plan: string;
  eventCount: number;
  limit: number | string;
  billing: {
    freeEvents: number;
    billableEvents: number;
    estimatedCostUsd: string;
  };
}

async function validateApiKey(key: string, apiUrl: string): Promise<{ valid: boolean; usage?: UsageResponse; error?: string }> {
  try {
    const res = await fetch(`${apiUrl}/v1/usage`, {
      headers: { 'Authorization': `Bearer ${key}`, 'X-Project-Id': 'cli' },
    });
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };
    if (!res.ok) return { valid: false, error: `Server error (${res.status})` };
    const data = await res.json() as UsageResponse;
    return { valid: true, usage: data };
  } catch (err) {
    return { valid: false, error: `Could not reach ${apiUrl}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Interactive prompt (masked input)
// ---------------------------------------------------------------------------

function promptApiKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    // Mask input by intercepting keystrokes
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);

    let input = '';
    process.stdout.write(`  Paste your API key ${dim('(from https://getkontext.com/pricing)')}: `);

    const onData = (char: Buffer) => {
      const c = char.toString('utf8');
      if (c === '\n' || c === '\r') {
        // Done
        stdin.removeListener('data', onData);
        if (stdin.setRawMode) stdin.setRawMode(wasRaw ?? false);
        process.stdout.write('\n');
        rl.close();
        resolve(input.trim());
      } else if (c === '\u0003') {
        // Ctrl+C
        stdin.removeListener('data', onData);
        if (stdin.setRawMode) stdin.setRawMode(wasRaw ?? false);
        rl.close();
        reject(new Error('Cancelled'));
      } else if (c === '\u007f' || c === '\b') {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (c.charCodeAt(0) >= 32) {
        // Printable character — show asterisk
        input += c;
        process.stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

// ---------------------------------------------------------------------------
// Non-interactive key read (piped stdin)
// ---------------------------------------------------------------------------

function readStdinKey(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data.trim()); });
    process.stdin.resume();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runLogin(args: LoginArgs): Promise<void> {
  const apiUrl = process.env['KONTEXT_API_URL'] ?? DEFAULT_API_URL;

  // Check if already logged in
  const existing = getActiveProfile();

  // Get the API key
  let apiKey = args.apiKey;

  if (!apiKey && !args.json) {
    printBanner();

    if (existing) {
      info(`Currently logged in as ${cyan(maskApiKey(existing.apiKey))} (${existing.plan ?? 'free'})\n`);
    }
  }

  if (!apiKey) {
    if (isTTY()) {
      // Offer to open browser
      process.stdout.write(`  ${dim("Don't have an API key?")} Run ${bold('kontext login --open')} to get one.\n\n`);
      try {
        apiKey = await promptApiKey();
      } catch {
        process.stdout.write('\n');
        process.exit(130); // SIGINT convention
      }
    } else {
      // Piped input
      apiKey = await readStdinKey();
    }
  }

  if (!apiKey) {
    error('No API key provided');
    process.exit(2);
  }

  // Validate
  const spinner = !args.json && isTTY() ? await createSpinner('Validating...') : null;
  spinner?.start();

  const result = await validateApiKey(apiKey, apiUrl);

  if (!result.valid) {
    if (args.json) {
      spinner?.stop();
      process.stdout.write(JSON.stringify({ authenticated: false, error: result.error }, null, 2) + '\n');
    } else if (spinner) {
      spinner.fail(result.error ?? 'Validation failed');
    } else {
      error(result.error ?? 'Validation failed');
    }
    process.exit(1);
  }

  // Save credentials
  setProfile('default', {
    apiKey,
    apiUrl,
    createdAt: new Date().toISOString(),
    plan: result.usage?.plan,
  });

  const credPath = getCredentialPath();

  if (args.json) {
    process.stdout.write(JSON.stringify({
      authenticated: true,
      plan: result.usage?.plan,
      usage: result.usage,
      credentialPath: credPath,
      profile: 'default',
    }, null, 2) + '\n');
    return;
  }

  spinner?.stop();
  process.stdout.write('\n');
  success(bold('Authenticated') + '\n');

  const usage = result.usage;
  if (usage) {
    const limit = typeof usage.limit === 'number' ? usage.limit.toLocaleString() : usage.limit;
    process.stdout.write(`    ${dim('Plan:')}        ${green(usage.plan)}\n`);
    process.stdout.write(`    ${dim('Events:')}      ${usage.eventCount.toLocaleString()} / ${limit}\n`);
    process.stdout.write(`    ${dim('Saved to:')}    ${dim(credPath)}\n`);
  }

  process.stdout.write(`\n  Run ${bold('kontext verify')} to log your first transaction.\n\n`);
}
