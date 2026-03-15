import type { KpiData } from '@/lib/dashboard-api';

export function KpiStrip({ data }: { data: KpiData | null }) {
  if (!data) {
    return (
      <div className="dash-kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-kpi-card">
            <div className="dash-kpi-label">Loading...</div>
            <div className="dash-kpi-value" style={{ color: 'var(--dash-text-3)' }}>--</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dash-kpi-grid">
      <div className="dash-kpi-card">
        <div className="dash-kpi-label">Verified Today</div>
        <div className="dash-kpi-value green">
          {data.verified_payouts_today.toLocaleString()}
        </div>
      </div>

      <div className="dash-kpi-card danger">
        <div className="dash-kpi-label">Unverified</div>
        <div className="dash-kpi-value red">
          {data.unverified_payouts_today}
        </div>
      </div>

      <div className="dash-kpi-card">
        <div className="dash-kpi-label">Org Trust Score</div>
        <div className="dash-kpi-value blue">
          {data.org_trust_score ?? '--'}
        </div>
      </div>

      <div className="dash-kpi-card">
        <div className="dash-kpi-label">Sanctions Alerts</div>
        <div className={`dash-kpi-value ${data.sanctions_alerts_today === 0 ? 'green' : 'red'}`}>
          {data.sanctions_alerts_today}
        </div>
      </div>

      <div className="dash-kpi-card warning">
        <div className="dash-kpi-label">Policy Violations</div>
        <div className="dash-kpi-value amber">
          {data.policy_violations_today}
        </div>
      </div>

      <div className="dash-kpi-card">
        <div className="dash-kpi-label">Coverage 7d</div>
        <div className="dash-kpi-value blue">
          {data.coverage_pct_7d != null ? `${data.coverage_pct_7d}%` : '--'}
        </div>
      </div>
    </div>
  );
}
