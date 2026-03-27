export function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'verified' ? 'verified' :
    status === 'warning' ? 'warning' :
    status === 'blocked' ? 'blocked' :
    status === 'pending_review' ? 'pending-review' :
    'unverified';

  const label = status === 'pending_review' ? 'pending review' : status;

  return <span className={`dash-pill ${cls}`}>{label}</span>;
}
