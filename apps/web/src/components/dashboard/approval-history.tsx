'use client';

import { useEffect, useState } from 'react';
import { getEventApprovals, type ApprovalChainStep } from '@/lib/dashboard-api';

interface ApprovalHistoryProps {
  eventId: string;
  /** If provided, use inline data instead of fetching from API */
  steps?: ApprovalChainStep[];
}

export function ApprovalHistory({ eventId, steps: inlineSteps }: ApprovalHistoryProps) {
  const [steps, setSteps] = useState<ApprovalChainStep[]>(inlineSteps ?? []);
  const [loading, setLoading] = useState(!inlineSteps);

  useEffect(() => {
    if (inlineSteps) {
      setSteps(inlineSteps);
      return;
    }

    setLoading(true);
    getEventApprovals(eventId)
      .then((data) => setSteps(data.approvals))
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }, [eventId, inlineSteps]);

  if (loading) {
    return (
      <div style={{ padding: 12, color: 'var(--dash-text-3)', fontSize: 13 }}>
        Loading approval chain...
      </div>
    );
  }

  if (steps.length === 0) {
    return null;
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical timeline line */}
      <div style={{
        position: 'absolute',
        left: 7,
        top: 4,
        bottom: 4,
        width: 2,
        background: 'var(--dash-border, #e5e7eb)',
      }} />

      {steps.map((step, i) => {
        const dotColor = step.decision === 'approved'
          ? 'var(--dash-green, #16a34a)'
          : step.decision === 'rejected'
            ? 'var(--dash-red, #dc2626)'
            : 'var(--dash-text-3, #9ca3af)';

        return (
          <div key={step.approval_id ?? i} style={{ position: 'relative', paddingBottom: i < steps.length - 1 ? 16 : 0, paddingLeft: 16 }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute',
              left: -16,
              top: 4,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: dotColor,
              border: '2px solid var(--dash-bg, #fff)',
            }} />

            <div style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  Step {step.step_index + 1}: {step.decision}
                </span>
                {step.approver_role && (
                  <span style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'var(--dash-bg-2, #f3f4f6)',
                    color: 'var(--dash-text-3)',
                  }}>
                    {step.approver_role}
                  </span>
                )}
              </div>
              {step.approver_id && (
                <div style={{ fontSize: 12, color: 'var(--dash-text-3)', fontFamily: 'var(--font-plex-mono), monospace' }}>
                  by {step.approver_id}
                </div>
              )}
              {step.reason && (
                <div style={{ fontSize: 12, color: 'var(--dash-text-2)', marginTop: 4, fontStyle: 'italic' }}>
                  &quot;{step.reason}&quot;
                </div>
              )}
              {step.decided_at && (
                <div style={{ fontSize: 11, color: 'var(--dash-text-3)', marginTop: 2 }}>
                  {new Date(step.decided_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
