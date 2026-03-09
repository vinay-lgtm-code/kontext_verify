import { Hono } from 'hono';
import { AttemptLedger, ReceiptLedger, MemoryStorage } from '@kontext/core';
import type { PaymentAttempt, AttemptFilter, FinalState, Archetype, Chain } from '@kontext/core';

export const exportRoutes = new Hono();

// Shared ledger reference — in production, inject via middleware
const storage = new MemoryStorage();
const config = {
  projectId: 'kontext-api',
  environment: 'production' as const,
  policy: {
    maxTransactionAmount: '50000',
    dailyAggregateLimit: '200000',
    sanctionsEnabled: true,
    blockedRecipients: [] as string[],
    blockedSenders: [] as string[],
    allowedRecipients: [] as string[],
    requiredMetadataByPaymentType: {},
  },
};
const receiptLedger = ReceiptLedger.init(config, storage);
const attemptLedger = new AttemptLedger(receiptLedger, storage);

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function attemptToCSVRow(attempt: PaymentAttempt): string {
  const stages = attempt.stageEvents.map((e) => `${e.stage}:${e.status}`).join('; ');
  const sender = attempt.senderRefs['address'] as string ?? '';
  const recipient = attempt.recipientRefs['address'] as string ?? '';

  const fields = [
    attempt.attemptId,
    attempt.archetype,
    attempt.chain,
    attempt.settlementAsset,
    attempt.intentCurrency,
    sender,
    recipient,
    attempt.finalState,
    attempt.executionSurface,
    stages,
    attempt.createdAt,
    attempt.updatedAt,
  ];

  return fields.map((f) => escapeCSV(String(f))).join(',');
}

const CSV_HEADER = 'attemptId,archetype,chain,asset,currency,sender,recipient,state,surface,stages,createdAt,updatedAt';

exportRoutes.get('/attempts', async (c) => {
  const format = c.req.query('format') ?? 'json';
  const archetype = c.req.query('archetype') as Archetype | undefined;
  const chain = c.req.query('chain') as Chain | undefined;
  const state = c.req.query('state') as FinalState | undefined;
  const since = c.req.query('since');
  const until = c.req.query('until');

  const filter: AttemptFilter = {};
  if (archetype) filter.archetype = archetype;
  if (chain) filter.chain = chain;
  if (state) filter.finalState = state;
  if (since) filter.since = since;
  if (until) filter.until = until;

  const attempts = attemptLedger.listAttempts(filter);

  if (format === 'csv') {
    const rows = [CSV_HEADER, ...attempts.map(attemptToCSVRow)];
    const csv = rows.join('\n') + '\n';

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kontext-attempts-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return c.json({
    total: attempts.length,
    exportedAt: new Date().toISOString(),
    format: 'json',
    filters: { archetype, chain, state, since, until },
    attempts,
  });
});
