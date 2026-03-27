'use client';

import { useState } from 'react';
import { generateNarrative } from '@/lib/dashboard-api';

const TEMPLATES = [
  { value: 'occ', label: 'OCC Examination' },
  { value: 'cfpb', label: 'CFPB Consumer Protection' },
  { value: 'state_banking', label: 'State Banking Dept' },
  { value: 'mica', label: 'EU MiCA' },
  { value: 'internal_audit', label: 'Internal Audit' },
] as const;

interface NarratorButtonProps {
  eventId: string;
  onGenerated?: (narrativeId: string) => void;
}

export function NarratorButton({ eventId, onGenerated }: NarratorButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(template: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await generateNarrative(eventId, template);
      setOpen(false);
      onGenerated?.(result.narrative_id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="dash-btn dash-btn-primary"
        onClick={() => setOpen(!open)}
        disabled={loading}
        style={{ fontSize: 13, padding: '6px 14px' }}
      >
        {loading ? 'Generating...' : 'Generate Narrative'}
      </button>

      {open && !loading && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: 'var(--dash-surface)', border: '2px solid var(--dash-border)',
          borderRadius: 8, padding: 8, zIndex: 100, minWidth: 220,
          boxShadow: '3px 3px 0 var(--dash-border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--dash-text-3)', marginBottom: 6, fontWeight: 600 }}>
            Select template
          </div>
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleGenerate(t.value)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', padding: '6px 8px',
                fontSize: 13, cursor: 'pointer', borderRadius: 4,
                fontFamily: 'var(--font-dm-sans), sans-serif',
                color: 'var(--dash-text-1)',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--dash-hover)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--dash-red)', fontSize: 12, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}
