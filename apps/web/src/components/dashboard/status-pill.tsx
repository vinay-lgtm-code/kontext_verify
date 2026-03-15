export function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'verified' ? 'verified' :
    status === 'warning' ? 'warning' :
    status === 'blocked' ? 'blocked' :
    'unverified';

  return <span className={`dash-pill ${cls}`}>{status}</span>;
}
