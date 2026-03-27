'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPendingApprovals, submitApprovalDecision, type PendingApproval } from '@/lib/dashboard-api';
import { StatusPill } from './status-pill';

export function ApprovalQueue() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPendingApprovals();
      setApprovals(data.approvals);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  async function handleDecision(approvalId: string, decision: 'approved' | 'rejected') {
    if (!reason.trim()) {
      setError('Reason is required for all approval decisions');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await submitApprovalDecision(approvalId, decision, reason.trim());
      setReason('');
      setActiveId(null);
      await fetchApprovals();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="dash-card" style={{ padding: 40, textAlign: 'center', color: 'var(--dash-text-3)' }}>
        Loading pending approvals...
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="dash-card" style={{ padding: 40, textAlign: 'center', color: 'var(--dash-text-3)' }}>
        No pending approvals
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          padding: '10px 16px',
          marginBottom: 16,
          background: 'var(--dash-red-bg, #fef2f2)',
          color: 'var(--dash-red, #dc2626)',
          borderRadius: 6,
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {approvals.map((approval) => {
          const isActive = activeId === approval.approval_id;
          const amountFormatted = approval.payment_amount
            ? parseFloat(approval.payment_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
            : '0.00';

          return (
            <div key={approval.approval_id} className="dash-card" style={{ padding: 16 }}>
              {/* Summary row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusPill status={approval.event_status ?? 'unverified'} />
                  <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 11, color: 'var(--dash-text-3)' }}>
                    {approval.event_id}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--dash-text-3)' }}>
                  Step {approval.step_index + 1} of {approval.total_steps}
                </span>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--dash-text-2)', marginBottom: 12 }}>
                <span>
                  <strong>{approval.payment_token ?? 'USDC'}</strong> {amountFormatted}
                </span>
                <span>Chain: {approval.payment_chain ?? 'base'}</span>
                {approval.agent_id && <span>Agent: {approval.agent_id}</span>}
                {approval.trust_score !== null && <span>Trust: {approval.trust_score}</span>}
              </div>

              {/* Action area */}
              {!isActive ? (
                <button
                  className="dash-btn dash-btn-primary"
                  onClick={() => { setActiveId(approval.approval_id); setReason(''); setError(null); }}
                  style={{ fontSize: 13 }}
                >
                  Review
                </button>
              ) : (
                <div style={{ borderTop: '1px solid var(--dash-border, #e5e7eb)', paddingTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--dash-text-2)' }}>
                    Reason (required)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a reason for your decision..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--dash-border, #d1d5db)',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="dash-btn"
                      onClick={() => handleDecision(approval.approval_id, 'approved')}
                      disabled={submitting || !reason.trim()}
                      style={{
                        background: 'var(--dash-green, #16a34a)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 16px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting || !reason.trim() ? 0.5 : 1,
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Approve'}
                    </button>
                    <button
                      className="dash-btn"
                      onClick={() => handleDecision(approval.approval_id, 'rejected')}
                      disabled={submitting || !reason.trim()}
                      style={{
                        background: 'var(--dash-red, #dc2626)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 16px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting || !reason.trim() ? 0.5 : 1,
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Reject'}
                    </button>
                    <button
                      className="dash-btn dash-btn-secondary"
                      onClick={() => { setActiveId(null); setReason(''); setError(null); }}
                      style={{ fontSize: 13 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
