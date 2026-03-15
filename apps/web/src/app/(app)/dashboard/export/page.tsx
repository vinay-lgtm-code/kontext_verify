'use client';

import { useState } from 'react';
import { createAuditExport } from '@/lib/dashboard-api';

export default function ExportPage() {
  const [format, setFormat] = useState('json');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ export_id: string; event_count: number } | null>(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await createAuditExport({
        format,
        date_range: {
          from: new Date(dateFrom).toISOString(),
          to: new Date(dateTo + 'T23:59:59Z').toISOString(),
        },
      });

      setResult({ export_id: data.export_id, event_count: data.event_count });

      // Auto-download JSON
      if (format === 'json' && data.data) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kontext-audit-${dateFrom}-to-${dateTo}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dash-export-form">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 4 }}>
          Generate Audit Export
        </div>
        <div style={{ fontSize: 13, color: 'var(--dash-text-2)', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
          Export verification events with cryptographic proof chain for regulatory review.
        </div>
      </div>

      <div className="dash-form-group">
        <label className="dash-form-label">Format</label>
        <select className="dash-select" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="json">JSON (with digest proofs)</option>
          <option value="pdf" disabled>PDF (coming soon)</option>
          <option value="signed_package" disabled>Signed Package (coming soon)</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="dash-form-group">
          <label className="dash-form-label">From</label>
          <input
            type="date"
            className="dash-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="dash-form-group">
          <label className="dash-form-label">To</label>
          <input
            type="date"
            className="dash-input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      <button
        className="dash-btn dash-btn-primary"
        onClick={handleExport}
        disabled={loading}
        style={{ marginTop: 8 }}
      >
        {loading ? 'Generating...' : 'Export Audit Trail'}
      </button>

      {error && (
        <div style={{ color: 'var(--dash-red)', fontSize: 13, marginTop: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <div style={{ color: 'var(--dash-green)', fontWeight: 500, marginBottom: 4 }}>
            Export complete
          </div>
          <div style={{ color: 'var(--dash-text-2)', fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 }}>
            Export ID: {result.export_id}
          </div>
          <div style={{ color: 'var(--dash-text-2)', fontSize: 12 }}>
            {result.event_count} events exported
          </div>
        </div>
      )}
    </div>
  );
}
