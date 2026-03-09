import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface LogoutOptions {
  json: boolean;
}

export function runLogout(options: LogoutOptions): void {
  const credPath = path.join(os.homedir(), '.kontext', 'credentials.json');

  if (fs.existsSync(credPath)) {
    fs.unlinkSync(credPath);
    if (options.json) {
      process.stdout.write(JSON.stringify({ status: 'logged_out' }) + '\n');
    } else {
      process.stdout.write('Logged out. Credentials removed.\n');
    }
  } else {
    if (options.json) {
      process.stdout.write(JSON.stringify({ status: 'not_authenticated' }) + '\n');
    } else {
      process.stdout.write('Not currently authenticated.\n');
    }
  }
}
