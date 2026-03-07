import { createHash } from 'crypto';

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseAmount(amount: string): number {
  return Number.parseFloat(amount);
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function toDayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      out[key] = sortDeep(input[key]);
    }
    return out;
  }

  return value;
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
