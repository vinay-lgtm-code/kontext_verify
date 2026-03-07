import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface LoginOptions {
  json: boolean;
}

export async function runLogin(options: LoginOptions): Promise<void> {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    process.stdout.write('\nKontext Cloud Login\n\n');

    const apiKey = (await rl.question('API key (sk_...): ')).trim();
    if (!apiKey) {
      process.stderr.write('API key is required.\n');
      process.exit(2);
    }

    // Store credentials
    const kontextDir = path.join(os.homedir(), '.kontext');
    if (!fs.existsSync(kontextDir)) fs.mkdirSync(kontextDir, { recursive: true });

    const credPath = path.join(kontextDir, 'credentials.json');
    const creds = { apiKey, createdAt: new Date().toISOString() };
    fs.writeFileSync(credPath, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });

    if (options.json) {
      process.stdout.write(JSON.stringify({ status: 'authenticated', credentialsPath: credPath }) + '\n');
    } else {
      process.stdout.write(`Authenticated. Credentials saved to ${credPath}\n\n`);
    }
  } finally {
    rl.close();
  }
}
