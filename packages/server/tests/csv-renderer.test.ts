// ============================================================================
// CSV Renderer Tests (RFC 4180 compliance)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { renderCSV } from '../src/export/csv-renderer.js';

describe('renderCSV', () => {
  // --- Basic rendering ---

  it('renders basic CSV with headers and rows', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];
    const columns = ['name', 'age'];
    const buf = renderCSV(rows, columns);
    const text = buf.toString('utf-8');

    expect(text).toBe('name,age\r\nAlice,30\r\nBob,25\r\n');
  });

  it('returns a Buffer instance', () => {
    const buf = renderCSV([{ a: 1 }], ['a']);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('renders header-only when rows is empty', () => {
    const buf = renderCSV([], ['col1', 'col2']);
    const text = buf.toString('utf-8');

    expect(text).toBe('col1,col2\r\n');
  });

  // --- RFC 4180: field with comma ---

  it('quotes field containing a comma', () => {
    const rows = [{ val: 'hello, world' }];
    const buf = renderCSV(rows, ['val']);
    const text = buf.toString('utf-8');

    expect(text).toContain('"hello, world"');
  });

  // --- RFC 4180: field with double quote ---

  it('escapes double quotes by doubling them', () => {
    const rows = [{ val: 'say "hi"' }];
    const buf = renderCSV(rows, ['val']);
    const text = buf.toString('utf-8');

    expect(text).toContain('"say ""hi"""');
  });

  // --- RFC 4180: field with newline ---

  it('quotes field containing a newline', () => {
    const rows = [{ val: 'line1\nline2' }];
    const buf = renderCSV(rows, ['val']);
    const text = buf.toString('utf-8');

    expect(text).toContain('"line1\nline2"');
  });

  it('quotes field containing a carriage return', () => {
    const rows = [{ val: 'line1\rline2' }];
    const buf = renderCSV(rows, ['val']);
    const text = buf.toString('utf-8');

    expect(text).toContain('"line1\rline2"');
  });

  // --- Empty/null field values ---

  it('renders null field values as empty string', () => {
    const rows = [{ a: null, b: 'ok' }];
    const buf = renderCSV(rows as any, ['a', 'b']);
    const text = buf.toString('utf-8');

    expect(text).toBe('a,b\r\n,ok\r\n');
  });

  it('renders undefined field values as empty string', () => {
    const rows = [{ a: undefined, b: 'ok' }];
    const buf = renderCSV(rows as any, ['a', 'b']);
    const text = buf.toString('utf-8');

    expect(text).toBe('a,b\r\n,ok\r\n');
  });

  it('renders missing column keys as empty string', () => {
    const rows = [{ b: 'val' }];
    const buf = renderCSV(rows, ['a', 'b']);
    const text = buf.toString('utf-8');

    expect(text).toBe('a,b\r\n,val\r\n');
  });

  // --- Unicode characters ---

  it('preserves unicode characters', () => {
    const rows = [{ name: 'Konig' }, { name: 'Konig' }];
    const buf = renderCSV(rows, ['name']);
    const text = buf.toString('utf-8');

    expect(text).toContain('Konig');
  });

  it('preserves CJK characters', () => {
    const rows = [{ val: '\u4F60\u597D\u4E16\u754C' }];
    const buf = renderCSV(rows, ['val']);
    const text = buf.toString('utf-8');

    expect(text).toContain('\u4F60\u597D\u4E16\u754C');
  });

  it('preserves emoji characters', () => {
    const rows = [{ val: 'test \uD83D\uDE80 data' }];
    const buf = renderCSV(rows, ['val']);
    const text = buf.toString('utf-8');

    expect(text).toContain('test \uD83D\uDE80 data');
  });

  // --- Column ordering ---

  it('column ordering matches header ordering', () => {
    const rows = [{ z: 'last', a: 'first', m: 'middle' }];
    const columns = ['a', 'm', 'z'];
    const buf = renderCSV(rows, columns);
    const lines = buf.toString('utf-8').split('\r\n');

    expect(lines[0]).toBe('a,m,z');
    expect(lines[1]).toBe('first,middle,last');
  });

  it('reversed column order reverses output', () => {
    const rows = [{ x: '1', y: '2' }];
    const buf1 = renderCSV(rows, ['x', 'y']);
    const buf2 = renderCSV(rows, ['y', 'x']);

    const line1 = buf1.toString('utf-8').split('\r\n')[1];
    const line2 = buf2.toString('utf-8').split('\r\n')[1];

    expect(line1).toBe('1,2');
    expect(line2).toBe('2,1');
  });

  // --- Large dataset ---

  it('handles 1000 rows without crashing', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({
      id: `row_${i}`,
      value: `val_${i}`,
    }));
    const buf = renderCSV(rows, ['id', 'value']);
    const text = buf.toString('utf-8');
    const lines = text.split('\r\n').filter((l) => l.length > 0);

    // 1 header + 1000 data rows
    expect(lines).toHaveLength(1001);
  });

  // --- Edge cases ---

  it('handles field that is only a double quote', () => {
    const rows = [{ val: '"' }];
    const buf = renderCSV(rows, ['val']);
    const text = buf.toString('utf-8');

    expect(text).toContain('""""');
  });

  it('handles numeric values by converting to string', () => {
    const rows = [{ n: 42, f: 3.14 }];
    const buf = renderCSV(rows as any, ['n', 'f']);
    const text = buf.toString('utf-8');

    expect(text).toBe('n,f\r\n42,3.14\r\n');
  });

  it('handles boolean values', () => {
    const rows = [{ ok: true, nope: false }];
    const buf = renderCSV(rows as any, ['ok', 'nope']);
    const text = buf.toString('utf-8');

    expect(text).toBe('ok,nope\r\ntrue,false\r\n');
  });
});
