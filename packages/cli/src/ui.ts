// ============================================================================
// Terminal UI utilities — colors, banners, spinners
// ============================================================================

import pc from 'picocolors';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

// ---------------------------------------------------------------------------
// Unicode detection
// ---------------------------------------------------------------------------

export function isUnicodeSupported(): boolean {
  if (process.env['NO_UNICODE'] === '1') return false;
  if (process.platform === 'win32') {
    return Boolean(process.env['WT_SESSION']) || // Windows Terminal
      Boolean(process.env['TERMINUS_SUBLIME']) ||
      process.env['ConEmuTask'] === '{cmd::Cmder}' ||
      process.env['TERM_PROGRAM'] === 'Terminus-Sublime' ||
      process.env['TERM_PROGRAM'] === 'vscode' ||
      process.env['TERM'] === 'xterm-256color' ||
      process.env['TERM'] === 'alacritty' ||
      process.env['TERMINAL_EMULATOR'] === 'JetBrains-JediTerm';
  }
  return process.env['TERM'] !== 'linux'; // linux console has limited unicode
}

// ---------------------------------------------------------------------------
// ASCII Art Banners
// ---------------------------------------------------------------------------

const BANNER_UNICODE = `
    ██╗  ██╗ ██████╗ ███╗   ██╗████████╗███████╗██╗  ██╗████████╗
    ██║ ██╔╝██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝
    █████╔╝ ██║   ██║██╔██╗ ██║   ██║   █████╗   ╚███╔╝    ██║
    ██╔═██╗ ██║   ██║██║╚██╗██║   ██║   ██╔══╝   ██╔██╗    ██║
    ██║  ██╗╚██████╔╝██║ ╚████║   ██║   ███████╗██╔╝ ██╗   ██║
    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝
`;

const BANNER_ASCII = `
     _  __  ___  _   _ _____ _______  _______
    | |/ / / _ \\| \\ | |_   _| ____\\ \\/ /_   _|
    | ' / | | | |  \\| | | | |  _|  \\  /  | |
    | . \\ | |_| | |\\  | | | | |___ /  \\  | |
    |_|\\_\\ \\___/|_| \\_| |_| |_____/_/\\_\\ |_|
`;

export function printBanner(): void {
  if (!isTTY()) return;
  const banner = isUnicodeSupported() ? BANNER_UNICODE : BANNER_ASCII;
  process.stdout.write(pc.green(banner));
  process.stdout.write(pc.dim(`    v${pkg.version} — compliance audit trail for AI agents\n\n`));
}

// ---------------------------------------------------------------------------
// TTY detection
// ---------------------------------------------------------------------------

export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY);
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

export const green = pc.green;
export const dim = pc.dim;
export const bold = pc.bold;
export const red = pc.red;
export const cyan = pc.cyan;
export const yellow = pc.yellow;

// ---------------------------------------------------------------------------
// Formatted output
// ---------------------------------------------------------------------------

const CHECK = isUnicodeSupported() ? '✓' : '+';
const CROSS = isUnicodeSupported() ? '✗' : 'x';
const INFO_MARK = isUnicodeSupported() ? '●' : '*';

export function success(msg: string): void {
  process.stdout.write(`  ${pc.green(CHECK)} ${msg}\n`);
}

export function error(msg: string): void {
  process.stderr.write(`  ${pc.red(CROSS)} ${msg}\n`);
}

export function info(msg: string): void {
  process.stdout.write(`  ${pc.cyan(INFO_MARK)} ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

export async function createSpinner(text: string) {
  const { default: ora } = await import('ora');
  return ora({ text, indent: 2 });
}
