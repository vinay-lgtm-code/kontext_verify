'use client';

import { useState, useCallback } from 'react';
import {
  createBulkExport,
  getExportProgress,
  type ExportTemplate,
  type ExportFormat,
  type BulkExportFilters,
  type ExportProgressResponse,
} from '@/lib/dashboard-api';

// ---------------------------------------------------------------------------
// Template descriptions for the UI
// ---------------------------------------------------------------------------

const TEMPLATES: { value: ExportTemplate; label: string; description: string }[] = [
  {
    value: 'examiner',
    label: 'Examiner',
    description: 'Full compliance packet — all fields. Used by bank examiners.',
  },
  {
    value: 'diligence',
    label: 'Due Diligence',
    description: 'Payment details + screening + policy evaluation. For compliance officers.',
  },
  {
    value: 'incident',
    label: 'Incident Response',
    description: 'Flagged/blocked events only with anomaly details. For investigations.',
  },
  {
    value: 'redacted',
    label: 'Redacted',
    description: 'PII-safe — truncated addresses, hashed agent IDs. For external sharing.',
  },
];

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
];

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-populate filters from the current dashboard view */
  defaultFilters?: BulkExportFilters;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportDialog({ open, onClose, defaultFilters }: ExportDialogProps) {
  const [template, setTemplate] = useState<ExportTemplate>('examiner');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [dateFrom, setDateFrom] = useState(defaultFilters?.date_from ?? '');
  const [dateTo, setDateTo] = useState(defaultFilters?.date_to ?? '');
  const [status, setStatus] = useState(defaultFilters?.status ?? '');
  const [agentId, setAgentId] = useState(defaultFilters?.agent_id ?? '');
  const [chain, setChain] = useState(defaultFilters?.chain ?? '');

  const [exportId, setExportId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(null);

    try {
      const filters: BulkExportFilters = {};
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (status) filters.status = status;
      if (agentId) filters.agent_id = agentId;
      if (chain) filters.chain = chain;

      const result = await createBulkExport(template, format, filters);
      setExportId(result.export_id);

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const p = await getExportProgress(result.export_id);
          setProgress(p);

          if (p.status === 'complete' || p.status === 'failed') {
            clearInterval(pollInterval);
            setLoading(false);

            if (p.status === 'failed') {
              setError(p.error ?? 'Export failed');
            }
          }
        } catch {
          clearInterval(pollInterval);
          setLoading(false);
          setError('Failed to check export progress');
        }
      }, 2000);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }, [template, format, dateFrom, dateTo, status, agentId, chain]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#FFF8F0] border-2 border-black shadow-[4px_4px_0_0_#000] max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Export Evidence</h2>
            <button
              onClick={onClose}
              className="text-2xl leading-none hover:opacity-60"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Template selector */}
          <fieldset className="mb-4">
            <legend className="text-sm font-bold mb-2 uppercase tracking-wide">Template</legend>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <label
                  key={t.value}
                  className={`block border-2 border-black p-3 cursor-pointer transition-shadow ${
                    template === t.value ? 'bg-yellow-100 shadow-[2px_2px_0_0_#000]' : 'hover:bg-yellow-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.value}
                    checked={template === t.value}
                    onChange={() => setTemplate(t.value)}
                    className="mr-2"
                  />
                  <span className="font-bold">{t.label}</span>
                  <p className="text-xs text-gray-600 mt-1 ml-5">{t.description}</p>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Format selector */}
          <fieldset className="mb-4">
            <legend className="text-sm font-bold mb-2 uppercase tracking-wide">Format</legend>
            <div className="flex gap-3">
              {FORMATS.map((f) => (
                <label
                  key={f.value}
                  className={`flex-1 text-center border-2 border-black p-2 cursor-pointer font-mono text-sm ${
                    format === f.value ? 'bg-yellow-100 shadow-[2px_2px_0_0_#000]' : 'hover:bg-yellow-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f.value}
                    checked={format === f.value}
                    onChange={() => setFormat(f.value)}
                    className="sr-only"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Filters */}
          <fieldset className="mb-4">
            <legend className="text-sm font-bold mb-2 uppercase tracking-wide">Filters (optional)</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border-2 border-black p-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border-2 border-black p-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border-2 border-black p-1.5 text-sm bg-white"
                >
                  <option value="">All</option>
                  <option value="verified">Verified</option>
                  <option value="warning">Warning</option>
                  <option value="blocked">Blocked</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Chain</label>
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="w-full border-2 border-black p-1.5 text-sm bg-white"
                >
                  <option value="">All</option>
                  <option value="base">Base</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="solana">Solana</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600 block mb-1">Agent ID</label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="e.g. payout-agent-v2"
                  className="w-full border-2 border-black p-1.5 text-sm bg-white"
                />
              </div>
            </div>
          </fieldset>

          {/* Progress */}
          {progress && (
            <div className="mb-4 border-2 border-black p-3 bg-white">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-mono">{exportId}</span>
                <span className={
                  progress.status === 'complete'
                    ? 'text-green-700 font-bold'
                    : progress.status === 'failed'
                      ? 'text-red-700 font-bold'
                      : 'text-yellow-700'
                }>
                  {progress.status.toUpperCase()}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 border border-black h-4">
                <div
                  className="bg-yellow-400 h-full transition-all border-r border-black"
                  style={{ width: `${progress.progress_pct}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">{progress.progress_pct}% complete</div>
              {progress.download_url && (
                <a
                  href={progress.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-bold underline text-blue-700"
                >
                  Download Export
                </a>
              )}
              {progress.event_count != null && progress.status === 'complete' && (
                <div className="text-xs text-gray-600 mt-1">
                  {progress.event_count} events exported
                  {progress.file_size_bytes ? ` (${(progress.file_size_bytes / 1024).toFixed(1)} KB)` : ''}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 border-2 border-red-600 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex-1 bg-black text-white border-2 border-black p-2.5 font-bold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0_0_#666]"
            >
              {loading ? 'Exporting...' : 'Export'}
            </button>
            <button
              onClick={onClose}
              className="border-2 border-black p-2.5 font-bold text-sm hover:bg-gray-100 shadow-[2px_2px_0_0_#000]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
