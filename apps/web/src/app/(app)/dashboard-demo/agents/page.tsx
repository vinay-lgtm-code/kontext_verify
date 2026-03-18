'use client';

import { useEffect, useState } from 'react';
import type { AgentData } from '@/lib/dashboard-mock';
import { getAgents } from '@/lib/dashboard-mock';

function formatVolume(amount: string): string {
  const num = parseFloat(amount);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function trustBand(score: number | null): 'high' | 'medium' | 'low' {
  if (score == null) return 'medium';
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

function trustColor(band: string): string {
  return band === 'high' ? 'var(--dash-green)' :
         band === 'medium' ? 'var(--dash-amber)' :
         'var(--dash-red)';
}

function statusDotColor(status: string): string {
  return status === 'verified' ? 'green' :
         status === 'warning' ? 'amber' :
         status === 'blocked' ? 'red' : 'amber';
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgents()
      .then((data) => setAgents(data.agents))
      .finally(() => setLoading(false));
  }, []);

  const totalPayouts = agents.reduce((s: number, a: AgentData) => s + a.payout_count_24h, 0);
  const avgTrust = agents.length > 0
    ? Math.round(agents.reduce((s: number, a: AgentData) => s + (a.trust_score_avg ?? 0), 0) / agents.length)
    : null;
  const totalAnomalies = agents.reduce((s: number, a: AgentData) => s + a.anomaly_count_24h, 0);

  return (
    <>
      <div className="dash-summary-grid">
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Active Agents</div>
          <div className="dash-kpi-value blue">{agents.length}</div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Avg Trust Score</div>
          <div className="dash-kpi-value" style={{ color: avgTrust ? trustColor(trustBand(avgTrust)) : 'var(--dash-text-3)' }}>
            {avgTrust ?? '--'}
          </div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Anomalies 24h</div>
          <div className={`dash-kpi-value ${totalAnomalies > 0 ? 'red' : 'green'}`}>
            {totalAnomalies}
          </div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-kpi-label">Payouts 24h</div>
          <div className="dash-kpi-value blue">{totalPayouts}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--dash-text-3)', fontSize: 13, textAlign: 'center', padding: 40 }}>
          Loading agents...
        </div>
      ) : (
        <div className="dash-agent-grid">
          {agents.map((agent) => {
            const band = trustBand(agent.trust_score_avg);
            return (
              <div key={agent.agent_id} className={`dash-agent-card trust-${band}`}>
                <div className="dash-agent-header">
                  <div>
                    <div className="dash-agent-name">{agent.agent_id}</div>
                    <div className="dash-agent-type">
                      {agent.agent_type ?? 'unknown'} &middot; {agent.actor_type ?? 'autonomous-agent'}
                    </div>
                  </div>
                  <div className="dash-agent-trust-badge" style={{ color: trustColor(band) }}>
                    {agent.trust_score_avg ?? '--'}
                  </div>
                </div>

                <div className="dash-agent-stats">
                  <div className="dash-agent-stat">
                    <div className="dash-agent-stat-value">{agent.payout_count_24h}</div>
                    <div className="dash-agent-stat-label">Payouts 24h</div>
                  </div>
                  <div className="dash-agent-stat">
                    <div className="dash-agent-stat-value">{formatVolume(agent.volume_24h_usd)}</div>
                    <div className="dash-agent-stat-label">Volume 24h</div>
                  </div>
                  <div className="dash-agent-stat">
                    <div className="dash-agent-stat-value" style={{ color: agent.anomaly_count_24h > 0 ? 'var(--dash-red)' : undefined }}>
                      {agent.anomaly_count_24h}
                    </div>
                    <div className="dash-agent-stat-label">Anomalies</div>
                  </div>
                </div>

                <div className="dash-agent-body">
                  {agent.recent_events.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="dash-agent-section-label">Recent Activity</div>
                      <div className="dash-agent-events">
                        {agent.recent_events.slice(0, 3).map((ev) => (
                          <div key={ev.event_id} className="dash-agent-event">
                            <span className={`dash-dot ${statusDotColor(ev.status)}`} />
                            <span>{ev.token} {parseFloat(ev.amount).toLocaleString()}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--dash-text-3)' }}>
                              {formatTime(ev.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="dash-agent-section-label">Authorized Scopes</div>
                    <div className="dash-agent-scopes">
                      {agent.authorized_chains.map((c) => (
                        <span key={c} className="dash-scope-tag">{c}</span>
                      ))}
                      {agent.authorized_tokens.map((t) => (
                        <span key={t} className="dash-scope-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dash-agent-footer">
                  Last seen: {formatTime(agent.last_seen)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
