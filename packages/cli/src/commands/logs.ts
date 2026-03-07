import { MemoryStorage, ReceiptLedger, AttemptLedger, FileStorage } from '@kontext/core';
import type { PaymentAttempt, AttemptFilter, StageName, FinalState, Archetype, Chain } from '@kontext/core';
import * as fs from 'fs';
import * as path from 'path';

export interface LogsOptions {
  json: boolean;
  configPath?: string;
  last?: string;
  sender?: string;
  recipient?: string;
  archetype?: string;
  stage?: string;
  state?: string;
  chain?: string;
  from?: string;
  to?: string;
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function currentStage(attempt: PaymentAttempt): string {
  if (attempt.stageEvents.length === 0) return 'intent';
  return attempt.stageEvents[attempt.stageEvents.length - 1]!.stage;
}

function matchesFilter(attempt: PaymentAttempt, opts: LogsOptions): boolean {
  if (opts.sender) {
    const sAddr = (attempt.senderRefs['address'] as string ?? '').toLowerCase();
    if (!sAddr.includes(opts.sender.toLowerCase())) return false;
  }
  if (opts.recipient) {
    const rAddr = (attempt.recipientRefs['address'] as string ?? '').toLowerCase();
    if (!rAddr.includes(opts.recipient.toLowerCase())) return false;
  }
  if (opts.archetype && attempt.archetype !== opts.archetype) return false;
  if (opts.chain && attempt.chain !== opts.chain) return false;
  if (opts.state && attempt.finalState !== opts.state) return false;
  if (opts.stage && currentStage(attempt) !== opts.stage) return false;
  if (opts.from && attempt.createdAt < opts.from) return false;
  if (opts.to && attempt.createdAt > opts.to) return false;
  return true;
}

function loadAttempts(configPath?: string): PaymentAttempt[] {
  // Try to load from .kontext/attempts/ directory
  const baseDir = configPath
    ? path.dirname(configPath)
    : path.resolve(process.cwd(), '.kontext');

  const attemptsDir = path.join(baseDir, 'attempts');
  if (!fs.existsSync(attemptsDir)) return [];

  const attempts: PaymentAttempt[] = [];
  for (const file of fs.readdirSync(attemptsDir)) {
    if (file.endsWith('.json')) {
      const content = fs.readFileSync(path.join(attemptsDir, file), 'utf-8');
      attempts.push(JSON.parse(content) as PaymentAttempt);
    }
  }

  return attempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function runLogs(opts: LogsOptions): Promise<void> {
  const limit = opts.last ? parseInt(opts.last, 10) : 20;
  const attempts = loadAttempts(opts.configPath);

  const filtered = attempts.filter((a) => matchesFilter(a, opts));
  const shown = filtered.slice(0, limit);

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      total: filtered.length,
      returned: shown.length,
      attempts: shown,
    }, null, 2) + '\n');
    return;
  }

  process.stdout.write(`\nPayment Attempts (${shown.length} of ${filtered.length})\n`);

  if (shown.length === 0) {
    process.stdout.write('No attempts found matching filters.\n\n');
    return;
  }

  process.stdout.write('\n');
  process.stdout.write('  ID                  State       Stage            Archetype     Chain   Created\n');
  process.stdout.write('  ─────────────────── ─────────── ──────────────── ──────────── ─────── ────────────────────\n');

  for (const a of shown) {
    const id = a.attemptId.padEnd(19);
    const state = a.finalState.padEnd(11);
    const stage = currentStage(a).padEnd(16);
    const arch = a.archetype.padEnd(12);
    const chain = a.chain.padEnd(7);
    const created = a.createdAt.slice(0, 19);
    process.stdout.write(`  ${id} ${state} ${stage} ${arch} ${chain} ${created}\n`);
  }

  process.stdout.write(`\nTip: run \`kontext trace <attemptId>\` for stage-by-stage details.\n\n`);
}
