import type { PaymentAttempt, StageEvent } from '@kontext/core';
import { STAGE_ORDER } from '@kontext/core';
import * as fs from 'fs';
import * as path from 'path';

interface TraceOptions {
  attemptId: string;
  json: boolean;
  configPath?: string;
}

function loadAttempt(attemptId: string, configPath?: string): PaymentAttempt | null {
  const baseDir = configPath
    ? path.dirname(configPath)
    : path.resolve(process.cwd(), '.kontext');

  // Direct file lookup
  const filePath = path.join(baseDir, 'attempts', `${attemptId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PaymentAttempt;
  }

  // Scan directory for matching ID
  const attemptsDir = path.join(baseDir, 'attempts');
  if (!fs.existsSync(attemptsDir)) return null;

  for (const file of fs.readdirSync(attemptsDir)) {
    if (file.endsWith('.json')) {
      const content = fs.readFileSync(path.join(attemptsDir, file), 'utf-8');
      const attempt = JSON.parse(content) as PaymentAttempt;
      if (attempt.attemptId === attemptId) return attempt;
    }
  }

  return null;
}

function statusIcon(status: string): string {
  switch (status) {
    case 'succeeded': return '[OK]';
    case 'failed': return '[FAIL]';
    case 'review': return '[REVIEW]';
    case 'pending': return '[...]';
    case 'collect_info': return '[INFO]';
    default: return `[${status}]`;
  }
}

function renderTimeline(events: StageEvent[]): void {
  // Show all 8 stages, marking which ones have events
  const eventsByStage = new Map<string, StageEvent[]>();
  for (const e of events) {
    const existing = eventsByStage.get(e.stage) ?? [];
    existing.push(e);
    eventsByStage.set(e.stage, existing);
  }

  for (const stage of STAGE_ORDER) {
    const stageEvents = eventsByStage.get(stage);
    if (!stageEvents || stageEvents.length === 0) {
      process.stdout.write(`  ${stage.padEnd(18)} --\n`);
    } else {
      for (const e of stageEvents) {
        const icon = statusIcon(e.status);
        const time = e.timestamp.slice(11, 23);
        process.stdout.write(`  ${stage.padEnd(18)} ${icon.padEnd(10)} ${time}  ${e.actorSide.padEnd(10)} ${e.code}: ${e.message}\n`);
      }
    }
  }
}

export async function runTrace(options: TraceOptions): Promise<void> {
  const attempt = loadAttempt(options.attemptId, options.configPath);

  if (!attempt) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ error: `Attempt not found: ${options.attemptId}` }) + '\n');
    } else {
      process.stderr.write(`Attempt not found: ${options.attemptId}\n`);
    }
    return;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(attempt, null, 2) + '\n');
    return;
  }

  process.stdout.write(`\nPayment Attempt Trace: ${attempt.attemptId}\n`);
  process.stdout.write(`${'─'.repeat(60)}\n`);
  process.stdout.write(`Archetype:   ${attempt.archetype}\n`);
  process.stdout.write(`Chain:       ${attempt.chain}\n`);
  process.stdout.write(`Asset:       ${attempt.settlementAsset}\n`);
  process.stdout.write(`Currency:    ${attempt.intentCurrency}\n`);
  process.stdout.write(`State:       ${attempt.finalState}\n`);
  process.stdout.write(`Surface:     ${attempt.executionSurface}\n`);
  process.stdout.write(`Workspace:   ${attempt.workspaceRef}\n`);
  process.stdout.write(`App:         ${attempt.appRef}\n`);
  process.stdout.write(`Created:     ${attempt.createdAt}\n`);
  process.stdout.write(`Updated:     ${attempt.updatedAt}\n`);

  if (Object.keys(attempt.senderRefs).length > 0) {
    process.stdout.write(`Sender:      ${JSON.stringify(attempt.senderRefs)}\n`);
  }
  if (Object.keys(attempt.recipientRefs).length > 0) {
    process.stdout.write(`Recipient:   ${JSON.stringify(attempt.recipientRefs)}\n`);
  }

  process.stdout.write(`\nStage Timeline (${attempt.stageEvents.length} events):\n`);
  process.stdout.write(`${'─'.repeat(60)}\n`);

  if (attempt.stageEvents.length === 0) {
    process.stdout.write('  No stage events recorded.\n');
  } else {
    renderTimeline(attempt.stageEvents);
  }

  if (attempt.linkedReceiptIds && attempt.linkedReceiptIds.length > 0) {
    process.stdout.write(`\nLinked Receipts: ${attempt.linkedReceiptIds.join(', ')}\n`);
  }

  process.stdout.write('\n');
}
