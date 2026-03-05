// ============================================================================
// kontext whoami — show current auth status and usage
// ============================================================================

import { resolveApiKey, maskApiKey, getCredentialPath } from '../credentials.js';
import { printBanner, success, info, error, isTTY, createSpinner, dim, green, cyan, bold } from '../ui.js';

export interface WhoamiArgs {
  json: boolean;
}

interface UsageResponse {
  plan: string;
  eventCount: number;
  limit: number | string;
  remainingEvents: number | string;
  usagePercentage: number;
  billing: {
    model: string;
    freeEvents: number;
    billableEvents: number;
    estimatedCostUsd: string;
    pricePerThousand: string;
  };
  x402: {
    eventsPaid: number;
    totalUsdcReceived: string;
    lastPaymentAt: string | null;
  };
}

const DEFAULT_API_URL = 'https://api.getkontext.com';

export async function runWhoami(args: WhoamiArgs): Promise<void> {
  const apiKey = resolveApiKey();

  if (!apiKey) {
    if (args.json) {
      process.stdout.write(JSON.stringify({ authenticated: false }, null, 2) + '\n');
    } else {
      if (isTTY()) printBanner();
      info(`Not logged in. Run ${bold('kontext login')} to authenticate.\n`);
    }
    return;
  }

  const apiUrl = process.env['KONTEXT_API_URL'] ?? DEFAULT_API_URL;
  const spinner = !args.json && isTTY() ? await createSpinner('Fetching account info...') : null;
  spinner?.start();

  try {
    const res = await fetch(`${apiUrl}/v1/usage`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Project-Id': 'cli' },
    });

    if (!res.ok) {
      spinner?.fail(`Server returned ${res.status}`);
      if (!spinner) error(`Server returned ${res.status}`);
      if (args.json) {
        process.stdout.write(JSON.stringify({ authenticated: false, error: `HTTP ${res.status}` }, null, 2) + '\n');
      }
      process.exit(1);
    }

    const usage = await res.json() as UsageResponse;
    spinner?.stop();

    if (args.json) {
      process.stdout.write(JSON.stringify({
        authenticated: true,
        apiKey: maskApiKey(apiKey),
        ...usage,
      }, null, 2) + '\n');
      return;
    }

    if (isTTY()) printBanner();

    success(bold('Authenticated') + '\n');

    const limit = typeof usage.limit === 'number' ? usage.limit.toLocaleString() : usage.limit;
    const remaining = typeof usage.remainingEvents === 'number'
      ? usage.remainingEvents.toLocaleString()
      : usage.remainingEvents;

    process.stdout.write(`    ${dim('API Key:')}     ${cyan(maskApiKey(apiKey))}\n`);
    process.stdout.write(`    ${dim('Plan:')}        ${green(usage.plan)}\n`);
    process.stdout.write(`    ${dim('Events:')}      ${usage.eventCount.toLocaleString()} / ${limit}\n`);
    process.stdout.write(`    ${dim('Remaining:')}   ${remaining}\n`);

    if (usage.billing.billableEvents > 0) {
      process.stdout.write(`    ${dim('Billing:')}     ${usage.billing.billableEvents.toLocaleString()} billable events (~$${usage.billing.estimatedCostUsd})\n`);
    }

    if (usage.x402.eventsPaid > 0) {
      process.stdout.write(`    ${dim('x402:')}        ${usage.x402.eventsPaid} events via USDC ($${usage.x402.totalUsdcReceived})\n`);
    }

    process.stdout.write(`    ${dim('Credentials:')} ${dim(getCredentialPath())}\n\n`);

  } catch (err) {
    spinner?.fail(`Could not reach ${apiUrl}`);
    if (!spinner) error(`Could not reach ${apiUrl}: ${err instanceof Error ? err.message : String(err)}`);
    if (args.json) {
      process.stdout.write(JSON.stringify({ authenticated: false, error: String(err) }, null, 2) + '\n');
    }
    process.exit(1);
  }
}
