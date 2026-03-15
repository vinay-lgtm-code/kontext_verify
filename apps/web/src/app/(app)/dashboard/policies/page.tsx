'use client';

import { useEffect, useState } from 'react';
import type { PolicyData, PolicyViolation } from '@/lib/dashboard-api';
import { getPolicies, getPolicyViolations } from '@/lib/dashboard-api';
import { StatusPill } from '@/components/dashboard/status-pill';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPolicies(), getPolicyViolations()])
      .then(([polData, violData]) => {
        setPolicies(polData.policies);
        setTotalEvents(polData.total_events_today);
        setViolations(violData.violations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activePolicies = policies.filter((p) => p.enabled).length;
  const totalViolations = policies.reduce((s, p) => s + p.violations_today, 0);
  const blockedCount = violations.filter((v) => v.status === 'blocked').length;
  const affectedPct = totalEvents > 0
    ? Math.round((100 * totalViolations) / totalEvents * 10) / 10
    : 0;

  return (
    <>
      {/* Summary Strip */}
      <div className="dash-summary-grid">
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Active Policies</div>
          <div className="dash-kpi-value blue">{activePolicies}</div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Violations Today</div>
          <div className={`dash-kpi-value ${totalViolations > 0 ? 'amber' : 'green'}`}>
            {totalViolations}
          </div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Blocked Payouts</div>
          <div className={`dash-kpi-value ${blockedCount > 0 ? 'red' : 'green'}`}>
            {blockedCount}
          </div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Payments Affected</div>
          <div className="dash-kpi-value amber">{affectedPct}%</div>
        </div>
      </div>

      {/* Policy Rules Table */}
      <div style={{ marginBottom: 24 }}>
        <div className="dash-feed-title" style={{ marginBottom: 12 }}>Policy Rules</div>
        {loading ? (
          <div style={{ color: 'var(--dash-text-3)', fontSize: 13, textAlign: 'center', padding: 40 }}>
            Loading policies...
          </div>
        ) : (
          <div className="dash-table">
            <div className="dash-table-header dash-cols-6">
              <span>Rule</span>
              <span>Type</span>
              <span>Coverage</span>
              <span>Violations</span>
              <span>Impact</span>
              <span>Live</span>
            </div>

            {policies.map((policy) => (
              <div key={policy.policy_id} className="dash-table-row dash-cols-6">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{policy.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-plex-mono), monospace', color: 'var(--dash-text-3)' }}>
                    {policy.policy_id}
                  </div>
                </div>

                <span>
                  <span className={`dash-chip ${policy.type}`}>{policy.type}</span>
                </span>

                <span style={{ fontSize: 12, color: 'var(--dash-text-2)' }}>
                  {policy.description}
                </span>

                <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 13, color: policy.violations_today > 0 ? 'var(--dash-amber)' : 'var(--dash-text-2)' }}>
                  {policy.violations_today}
                </span>

                <div>
                  <div className="dash-trust-bar">
                    <div className="dash-trust-track">
                      <div
                        className="dash-trust-fill high"
                        style={{
                          width: `${Math.min(policy.impact_pct, 100)}%`,
                          background: 'var(--dash-accent)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-plex-mono), monospace', color: 'var(--dash-text-2)', minWidth: 32, textAlign: 'right' }}>
                      {policy.impact_pct}%
                    </span>
                  </div>
                </div>

                <div>
                  <ToggleSwitch on={policy.enabled} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Violations */}
      {violations.length > 0 && (
        <div>
          <div className="dash-feed-title" style={{ marginBottom: 12 }}>Recent Violations</div>
          <div className="dash-table">
            <div className="dash-table-header dash-cols-5">
              <span>Time</span>
              <span>Agent</span>
              <span>Rule Triggered</span>
              <span>Amount</span>
              <span>Outcome</span>
            </div>

            {violations.map((v) => (
              <div key={v.event_id} className="dash-table-row dash-cols-5">
                <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12, color: 'var(--dash-text-2)' }}>
                  {formatTime(v.created_at)}
                </span>
                <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 }}>
                  {v.agent_id}
                </span>
                <span style={{ fontSize: 12, color: 'var(--dash-text-2)' }}>
                  {v.policy_violations.length > 0 ? v.policy_violations[0] : v.policy_warnings[0] ?? 'policy violation'}
                </span>
                <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 }}>
                  {v.token} {parseFloat(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <StatusPill status={v.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div className={`dash-toggle ${on ? 'on' : ''}`}>
      <div className="dash-toggle-knob" />
    </div>
  );
}
