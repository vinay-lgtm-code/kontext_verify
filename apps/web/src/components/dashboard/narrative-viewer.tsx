'use client';

import { useEffect, useState, useCallback } from 'react';
import { getNarrative, updateNarrative, reviewNarrative, exportNarrativePDF } from '@/lib/dashboard-api';

interface NarrativeData {
  narrative_id: string;
  event_id: string;
  evidence_bundle_id: string;
  template: string;
  sections: Record<string, string>;
  markdown: string;
  status: string;
  analyst_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: string | null;
  generated_by: string;
  llm_provider: string | null;
  llm_model: string | null;
  llm_tokens_used: number | null;
  generation_time_ms: number | null;
  digest_reference: string;
  chain_index_reference: number;
  created_at: string;
}

interface NarrativeViewerProps {
  narrativeId: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  generating: 'var(--dash-text-3)',
  draft: 'var(--dash-amber)',
  reviewed: 'var(--dash-blue, #3b82f6)',
  approved: 'var(--dash-green)',
  failed: 'var(--dash-red)',
};

const SECTION_TITLES: Record<string, string> = {
  transaction_summary: 'Transaction Summary',
  sanctions_screening: 'Sanctions Screening',
  policy_evaluation: 'Policy Evaluation',
  trust_assessment: 'Trust Assessment',
  tamper_evidence: 'Tamper Evidence',
};

export function NarrativeViewer({ narrativeId, onClose }: NarrativeViewerProps) {
  const [narrative, setNarrative] = useState<NarrativeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNarrative = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNarrative(narrativeId);
      setNarrative(data);
      setNotes(data.analyst_notes ?? '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [narrativeId]);

  useEffect(() => { loadNarrative(); }, [loadNarrative]);

  async function handleSaveSection() {
    if (!narrative || !editingSection) return;
    setSaving(true);
    try {
      const updated = { ...narrative.sections, [editingSection]: editText };
      const result = await updateNarrative(narrativeId, { sections: updated });
      setNarrative(result);
      setEditingSection(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const result = await updateNarrative(narrativeId, { analyst_notes: notes });
      setNarrative(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(decision: 'approved' | 'changes_requested') {
    setSaving(true);
    try {
      const result = await reviewNarrative(narrativeId, decision, notes || undefined);
      setNarrative(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      await exportNarrativePDF(narrativeId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--dash-text-3)' }}>
        Loading narrative...
      </div>
    );
  }

  if (!narrative) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--dash-red)' }}>
        {error ?? 'Narrative not found'}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
              color: '#fff', background: STATUS_COLORS[narrative.status] ?? 'var(--dash-text-3)',
            }}>
              {narrative.status.toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 11, color: 'var(--dash-text-3)' }}>
              {narrative.narrative_id}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {narrative.template.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Narrative
          </div>
          <div style={{ fontSize: 12, color: 'var(--dash-text-2)', marginTop: 2 }}>
            Generated {new Date(narrative.created_at).toLocaleString()}
            {narrative.llm_provider && ` via ${narrative.llm_provider}/${narrative.llm_model}`}
            {narrative.generation_time_ms && ` (${narrative.generation_time_ms}ms)`}
          </div>
        </div>
        <button className="dash-btn dash-btn-secondary" onClick={onClose} style={{ fontSize: 13 }}>
          Close
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--dash-red)', fontSize: 12, marginBottom: 12, padding: 8, background: 'var(--dash-red-bg, #fff0f0)', borderRadius: 4 }}>
          {error}
        </div>
      )}

      {/* Evidence reference (locked) */}
      <div className="dash-drawer-section" style={{ marginBottom: 16 }}>
        <div className="dash-drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M12 6V4a4 4 0 0 0-8 0v2H3v8h10V6h-1zM6 4a2 2 0 1 1 4 0v2H6V4z" fill="currentColor"/></svg>
          Evidence Reference (Immutable)
        </div>
        <div style={{ fontSize: 12, color: 'var(--dash-text-2)', fontFamily: 'var(--font-plex-mono), monospace' }}>
          <div>Event: {narrative.event_id}</div>
          <div>Bundle: {narrative.evidence_bundle_id}</div>
          <div>Digest: {narrative.digest_reference.slice(0, 32)}...</div>
          <div>Chain Index: #{narrative.chain_index_reference}</div>
        </div>
      </div>

      {/* Narrative sections */}
      {Object.entries(narrative.sections).map(([key, content]) => (
        <div key={key} className="dash-drawer-section" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="dash-drawer-section-title">
              {SECTION_TITLES[key] ?? key}
            </div>
            {editingSection !== key && (
              <button
                onClick={() => { setEditingSection(key); setEditText(content); }}
                style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--dash-text-3)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Edit
              </button>
            )}
          </div>
          {editingSection === key ? (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{
                  width: '100%', minHeight: 100, padding: 8, fontSize: 13,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  border: '1px solid var(--dash-border)', borderRadius: 4,
                  background: 'var(--dash-surface)', resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="dash-btn dash-btn-primary" onClick={handleSaveSection} disabled={saving} style={{ fontSize: 12, padding: '4px 12px' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="dash-btn dash-btn-secondary" onClick={() => setEditingSection(null)} style={{ fontSize: 12, padding: '4px 12px' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--dash-text-1)', whiteSpace: 'pre-wrap' }}>
              {content || '(empty)'}
            </div>
          )}
        </div>
      ))}

      {/* Analyst notes */}
      <div className="dash-drawer-section" style={{ marginBottom: 16 }}>
        <div className="dash-drawer-section-title">Analyst Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for the review record..."
          style={{
            width: '100%', minHeight: 60, padding: 8, fontSize: 13,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            border: '1px solid var(--dash-border)', borderRadius: 4,
            background: 'var(--dash-surface)', resize: 'vertical',
          }}
        />
        <button className="dash-btn dash-btn-secondary" onClick={handleSaveNotes} disabled={saving} style={{ fontSize: 12, padding: '4px 12px', marginTop: 6 }}>
          Save Notes
        </button>
      </div>

      {/* Review actions */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--dash-border)', paddingTop: 16 }}>
        {narrative.status !== 'approved' && (
          <button className="dash-btn dash-btn-primary" onClick={() => handleReview('approved')} disabled={saving} style={{ fontSize: 13 }}>
            Approve
          </button>
        )}
        {narrative.status !== 'approved' && (
          <button className="dash-btn dash-btn-secondary" onClick={() => handleReview('changes_requested')} disabled={saving} style={{ fontSize: 13 }}>
            Request Changes
          </button>
        )}
        {narrative.status === 'approved' && (
          <button className="dash-btn dash-btn-primary" onClick={handleExport} style={{ fontSize: 13 }}>
            Export Narrative
          </button>
        )}
      </div>
    </div>
  );
}
