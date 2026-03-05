// ============================================================================
// kontext logout — remove stored credentials
// ============================================================================

import { getActiveProfile, removeProfile, maskApiKey, getCredentialPath } from '../credentials.js';
import { success, info, dim } from '../ui.js';

export interface LogoutArgs {
  json: boolean;
}

export async function runLogout(args: LogoutArgs): Promise<void> {
  const profile = getActiveProfile();

  if (!profile) {
    if (args.json) {
      process.stdout.write(JSON.stringify({ loggedOut: false, reason: 'not_logged_in' }, null, 2) + '\n');
    } else {
      info('Not logged in. Nothing to do.\n');
    }
    return;
  }

  const key = maskApiKey(profile.apiKey);
  removeProfile('default');

  if (args.json) {
    process.stdout.write(JSON.stringify({ loggedOut: true, removedKey: key }, null, 2) + '\n');
  } else {
    success(`Logged out ${dim(`(${key})`)}`);
    process.stdout.write(`    ${dim('Removed from:')} ${dim(getCredentialPath())}\n\n`);
  }
}
