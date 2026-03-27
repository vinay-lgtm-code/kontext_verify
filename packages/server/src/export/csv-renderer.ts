// ============================================================================
// Kontext Server — CSV Renderer (RFC 4180 compliant)
// ============================================================================
// Renders rows into a properly escaped CSV Buffer.

/**
 * Escape a CSV field per RFC 4180:
 * - If field contains comma, newline, or double quote, wrap in double quotes
 * - Double quotes within are escaped by doubling them
 */
function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Render an array of row objects into an RFC 4180-compliant CSV Buffer.
 *
 * @param rows     Transformed row objects from a template
 * @param columns  Ordered column names (used for header + field ordering)
 * @returns        Buffer containing the complete CSV file
 */
export function renderCSV(rows: Record<string, unknown>[], columns: string[]): Buffer {
  const lines: string[] = [];

  // Header row
  lines.push(columns.map(escapeField).join(','));

  // Data rows
  for (const row of rows) {
    const fields = columns.map((col) => escapeField(row[col]));
    lines.push(fields.join(','));
  }

  return Buffer.from(lines.join('\r\n') + '\r\n', 'utf-8');
}
