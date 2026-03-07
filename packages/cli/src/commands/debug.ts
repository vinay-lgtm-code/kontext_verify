import type { PaymentAttempt, StageEvent } from '@kontext/core';
import { STAGE_ORDER } from '@kontext/core';
import * as fs from 'fs';
import * as path from 'path';
import type { LogsOptions } from './logs.js';

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

function statusSymbol(status: string): string {
  switch (status) {
    case 'succeeded': return '[OK]';
    case 'failed': return '[FAIL]';
    case 'review': return '[REVIEW]';
    case 'pending': return '[...]';
    default: return `[${status.toUpperCase()}]`;
  }
}

function renderDebugAttempt(attempt: PaymentAttempt): void {
  process.stdout.write(`\n  ${attempt.attemptId}  ${attempt.finalState.toUpperCase()}\n`);
  process.stdout.write(`  ${attempt.archetype} | ${attempt.chain} | ${attempt.settlementAsset} | ${attempt.executionSurface}\n`);

  const sAddr = attempt.senderRefs['address'] as string | undefined;
  const rAddr = attempt.recipientRefs['address'] as string | undefined;
  if (sAddr || rAddr) {
    process.stdout.write(`  ${sAddr ?? '?'} -> ${rAddr ?? '?'}\n`);
  }

  process.stdout.write(`  Created: ${attempt.createdAt}\n`);

  // Stage timeline with failures highlighted
  if (attempt.stageEvents.length > 0) {
    process.stdout.write('  Timeline:\n');
    for (const e of attempt.stageEvents) {
      const sym = statusSymbol(e.status);
      const elapsed = e.timestamp.slice(11, 23);
      const prefix = e.status === 'failed' ? '  >> ' : '     ';
      process.stdout.write(`${prefix}${e.stage.padEnd(18)} ${sym.padEnd(10)} ${elapsed} ${e.actorSide}: ${e.code} - ${e.message}\n`);

      // Show payload for failures
      if (e.status === 'failed' && e.payload) {
        for (const [k, v] of Object.entries(e.payload)) {
          process.stdout.write(`        ${k}: ${JSON.stringify(v)}\n`);
        }
      }
    }
  }

  // Identify issues
  const failures = attempt.stageEvents.filter((e) => e.status === 'failed');
  const reviews = attempt.stageEvents.filter((e) => e.status === 'review');

  if (failures.length > 0) {
    process.stdout.write(`  Issues: ${failures.length} failure(s)\n`);
    for (const f of failures) {
      process.stdout.write(`    - ${f.stage}: ${f.code} — ${f.message}\n`);
    }
  }

  if (reviews.length > 0) {
    process.stdout.write(`  Pending review: ${reviews.length}\n`);
    for (const r of reviews) {
      process.stdout.write(`    - ${r.stage}: ${r.code} — ${r.message}\n`);
    }
  }
}

export async function runDebug(opts: LogsOptions): Promise<void> {
  const limit = opts.last ? parseInt(opts.last, 10) : 10;
  const attempts = loadAttempts(opts.configPath);
  const filtered = attempts.filter((a) => matchesFilter(a, opts));
  const shown = filtered.slice(0, limit);

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      total: filtered.length,
      returned: shown.length,
      attempts: shown.map((a) => ({
        ...a,
        _debug: {
          currentStage: currentStage(a),
          failures: a.stageEvents.filter((e) => e.status === 'failed'),
          reviews: a.stageEvents.filter((e) => e.status === 'review'),
        },
      })),
    }, null, 2) + '\n');
    return;
  }

  process.stdout.write(`\nDebug: ${shown.length} of ${filtered.length} attempts\n`);
  process.stdout.write('─'.repeat(60) + '\n');

  if (shown.length === 0) {
    process.stdout.write('No attempts found matching filters.\n\n');
    return;
  }

  for (const a of shown) {
    renderDebugAttempt(a);
  }

  process.stdout.write('\n');
}
