// ============================================================================
// Kontext SDK - Utility Functions
// ============================================================================

/**
 * Generate a unique identifier.
 * Uses crypto.randomUUID when available, falls back to a timestamp-based ID.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Generate an ISO 8601 timestamp string for the current moment.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Check whether a date falls within a given date range.
 */
export function isWithinDateRange(
  date: string | Date,
  start: Date,
  end: Date,
): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d >= start && d <= end;
}

/**
 * Parse a numeric string amount to a number, returning NaN for invalid inputs.
 */
export function parseAmount(amount: string): number {
  const parsed = parseFloat(amount);
  return parsed;
}

/**
 * Validate an Ethereum-style hex address.
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a transaction hash (64 hex characters with 0x prefix).
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Convert an array of objects to a CSV string.
 */
export function toCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) return '';

  const firstRecord = records[0];
  if (!firstRecord) return '';

  const headers = Object.keys(firstRecord);
  const headerRow = headers.join(',');

  const rows = records.map((record) => {
    return headers
      .map((header) => {
        const value = record[header];
        if (value === null || value === undefined) return '';
        const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
        // Escape CSV values containing commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Determine the current hour (0-23) in UTC.
 */
export function getCurrentHourUtc(): number {
  return new Date().getUTCHours();
}

/**
 * Clamp a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
