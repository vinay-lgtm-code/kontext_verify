export function TrustBar({ score }: { score: number }) {
  const band =
    score >= 70 ? 'high' :
    score >= 40 ? 'medium' :
    'low';

  return (
    <div className="dash-trust-bar">
      <div className="dash-trust-track">
        <div
          className={`dash-trust-fill ${band}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="dash-trust-score" style={{
        color: band === 'high' ? 'var(--dash-green)' :
               band === 'medium' ? 'var(--dash-amber)' :
               'var(--dash-red)',
      }}>
        {score}
      </span>
    </div>
  );
}
