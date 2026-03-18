'use client';

interface ReserveEvidenceProps {
  /** Reserve snapshot data from an action log with type 'reserve_snapshot' */
  snapshot: {
    token: string;
    chain: string;
    onChainSupply: string;
    publishedReserves?: string;
    delta?: string;
    reconciliationStatus: 'matched' | 'delta_within_tolerance' | 'discrepancy' | 'unverified';
    snapshotBlockNumber: number;
    snapshotBlockHash: string;
    timestamp: string;
  };
  /** Digest chain index of the snapshot action */
  chainIndex?: number;
}

export function ReserveEvidence({ snapshot, chainIndex }: ReserveEvidenceProps) {
  const isOk =
    snapshot.reconciliationStatus === 'matched' ||
    snapshot.reconciliationStatus === 'delta_within_tolerance';

  const statusColor = isOk
    ? 'var(--dash-green, #22c55e)'
    : snapshot.reconciliationStatus === 'discrepancy'
      ? 'var(--dash-red, #ef4444)'
      : 'var(--dash-text-3, #6b7280)';

  const statusLabel = {
    matched: 'Matched',
    delta_within_tolerance: 'Within tolerance',
    discrepancy: 'Discrepancy',
    unverified: 'Unverified',
  }[snapshot.reconciliationStatus];

  const pctDelta = snapshot.delta
    ? `${(parseFloat(snapshot.delta) * 100).toFixed(4)}%`
    : undefined;

  return (
    <div className="dash-drawer-section">
      <div className="dash-drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Reserve State at Time of Payment
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            boxShadow: isOk ? `0 0 6px ${statusColor}` : undefined,
            flexShrink: 0,
          }}
        />
      </div>

      <Row label="Token" value={snapshot.token} />
      <Row label="Chain" value={snapshot.chain} />
      <Row
        label="On-Chain Supply"
        value={formatSupply(snapshot.onChainSupply)}
        mono
      />
      {snapshot.publishedReserves && (
        <Row
          label="Published Reserves"
          value={formatSupply(snapshot.publishedReserves)}
          mono
        />
      )}
      {pctDelta && (
        <Row label="Delta" value={pctDelta} mono />
      )}
      <Row
        label="Status"
        value={statusLabel}
        color={statusColor}
      />
      <Row
        label="Block"
        value={`#${snapshot.snapshotBlockNumber.toLocaleString()}`}
        mono
      />

      <div style={{ marginTop: 10 }}>
        <div
          className="dash-drawer-label"
          style={{ fontSize: 11, marginBottom: 4 }}
        >
          Block Hash Proof
        </div>
        <div
          style={{
            fontFamily: 'var(--font-plex-mono), monospace',
            fontSize: 11,
            color: 'var(--dash-text-2)',
            wordBreak: 'break-all',
          }}
        >
          {snapshot.snapshotBlockHash}
        </div>
      </div>

      {chainIndex !== undefined && (
        <div style={{ marginTop: 8 }}>
          <div
            className="dash-drawer-label"
            style={{ fontSize: 11, marginBottom: 4 }}
          >
            Digest Chain Index
          </div>
          <div
            style={{
              fontFamily: 'var(--font-plex-mono), monospace',
              fontSize: 13,
            }}
          >
            #{chainIndex}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSupply(value: string): string {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return n.toLocaleString('en-US');
}

function Row({
  label,
  value,
  mono,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="dash-drawer-row">
      <span className="dash-drawer-label">{label}</span>
      <span
        className="dash-drawer-value"
        style={{
          ...(mono ? { fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 } : {}),
          ...(color ? { color } : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}
