'use client';

import { useEffect, useState } from 'react';
import type { VerificationEvent, EvidenceBundle } from '@/lib/dashboard-api';
import { getEvidence } from '@/lib/dashboard-api';
import { StatusPill } from './status-pill';
import { ReserveEvidence } from './reserve-evidence';
import { NarratorButton } from './narrator-button';

interface EvidenceDrawerProps {
  event: VerificationEvent;
  onClose: () => void;
  fetchEvidence?: (eventId: string) => Promise<EvidenceBundle>;
}

export function EvidenceDrawer({ event, onClose, fetchEvidence }: EvidenceDrawerProps) {
  const [bundle, setBundle] = useState<EvidenceBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = fetchEvidence ?? getEvidence;
    fetcher(event.event_id)
      .then(setBundle)
      .catch(() => setBundle(null))
      .finally(() => setLoading(false));
  }, [event.event_id, fetchEvidence]);

  return (
    <>
      <div className="dash-drawer-overlay" onClick={onClose} />
      <div className="dash-drawer">
        {/* Header */}
        <div className="dash-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <StatusPill status={event.status} />
              <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 11, color: 'var(--dash-text-3)' }}>
                {event.event_id}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              {bundle?.render_headline ?? (event.status === 'verified' ? 'Verified payout' : 'Payout')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--dash-text-2)', fontFamily: 'var(--font-dm-sans), sans-serif', marginTop: 2 }}>
              {bundle?.render_subheadline ?? `${event.payment_token} ${parseFloat(event.payment_amount).toLocaleString()} by ${event.agent_id}`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--dash-text-3)',
              cursor: 'pointer',
              fontSize: 20,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="dash-drawer-section" style={{ textAlign: 'center', color: 'var(--dash-text-3)', padding: 40 }}>
            Loading evidence bundle...
          </div>
        ) : (
          <>
            {/* Payment Details */}
            <div className="dash-drawer-section">
              <div className="dash-drawer-section-title">Payment Details</div>
              {event.payment_rail === 'card' ? (
                <Row label="Authorization ID" value={event.payment_card_authorization_id ?? 'N/A'} mono />
              ) : (
                <Row label="Transaction Hash" value={event.payment_tx_hash ?? 'N/A'} mono />
              )}
              <Row label="Network" value={event.instrument_network ?? event.payment_chain} />
              <Row label="Rail" value={event.payment_rail} />
              <Row label="Amount" value={`${event.payment_token} ${parseFloat(event.payment_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
              <Row label="Route" value={event.workflow} />
              <Row label="Agent" value={event.agent_id} mono />
              {event.payment_destination_country && (
                <Row label="Destination" value={event.payment_destination_country} />
              )}
              {event.payment_merchant_name && (
                <Row label="Merchant" value={event.payment_merchant_name} />
              )}
              {event.payment_merchant_country && (
                <Row label="Merchant Country" value={event.payment_merchant_country} />
              )}
            </div>

            {/* Instrument Details (card/token rail) */}
            {event.instrument_id && (
              <div className="dash-drawer-section">
                <div className="dash-drawer-section-title">Instrument</div>
                <Row label="Instrument ID" value={event.instrument_type === 'virtual_card' ? `****${event.payment_card_last4 ?? ''}` : event.instrument_id} mono />
                <Row label="Type" value={event.instrument_type ?? 'N/A'} />
                <Row label="Network" value={event.instrument_network ?? 'N/A'} />
                {event.instrument_issuer && (
                  <Row label="Issuer" value={event.instrument_issuer} />
                )}
                {event.payment_merchant_category_code && (
                  <Row label="MCC" value={event.payment_merchant_category_code} mono />
                )}
                {event.payment_three_d_secure && (
                  <Row label="3D Secure" value={event.payment_three_d_secure} />
                )}
                {bundle?.scope_evaluation && (
                  <Row
                    label="Scope Check"
                    value={bundle.scope_evaluation.within_scope ? 'Within scope' : `Violations: ${bundle.scope_evaluation.violations.join('; ')}`}
                  />
                )}
              </div>
            )}

            {/* Authorization & Screening */}
            <div className="dash-drawer-section">
              <div className="dash-drawer-section-title">Authorization & Screening</div>
              <Row label="Authorization" value={bundle?.authorization_type ?? 'policy-scoped-agent'} />
              <Row label="OFAC Status" value={event.ofac_status} />
              <Row label="Screening Provider" value={event.screening_provider ?? 'kontext-ofac-v1'} />
              <Row label="Trust Score" value={`${event.trust_score} (${event.trust_band})`} />
            </div>

            {/* Policy Evaluation */}
            {bundle && (
              <div className="dash-drawer-section">
                <div className="dash-drawer-section-title">Policy Evaluation</div>
                <Row label="Decision" value={bundle.policy_trace.decision} />
                <Row label="Rules Evaluated" value={String(bundle.policy_trace.rules_evaluated)} />
                {bundle.policy_trace.passed_rules.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {bundle.policy_trace.passed_rules.map((r: string) => (
                      <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                        <span className="dash-dot green" />
                        <span style={{ fontFamily: 'var(--font-plex-mono), monospace', color: 'var(--dash-text-2)' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
                {bundle.policy_trace.failed_rules.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {bundle.policy_trace.failed_rules.map((r: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                        <span className="dash-dot red" />
                        <span style={{ fontFamily: 'var(--font-plex-mono), monospace', color: 'var(--dash-red)' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
                {bundle.policy_trace.warning_rules.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {bundle.policy_trace.warning_rules.map((r: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                        <span className="dash-dot amber" />
                        <span style={{ fontFamily: 'var(--font-plex-mono), monospace', color: 'var(--dash-amber)' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cryptographic Proof */}
            {bundle && (
              <div className="dash-drawer-section">
                <div className="dash-drawer-section-title">
                  Cryptographic Proof
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className="dash-drawer-label" style={{ fontSize: 11, marginBottom: 4 }}>Intent Hash</div>
                  <div className="dash-drawer-hash">{bundle.intent_hash_value}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className="dash-drawer-label" style={{ fontSize: 11, marginBottom: 4 }}>Record Hash</div>
                  <div className="dash-drawer-hash">{bundle.record_hash}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className="dash-drawer-label" style={{ fontSize: 11, marginBottom: 4 }}>Previous Hash</div>
                  <div className="dash-drawer-hash">{bundle.previous_record_hash}</div>
                </div>
                <div>
                  <div className="dash-drawer-label" style={{ fontSize: 11, marginBottom: 4 }}>Chain Index</div>
                  <div style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 13 }}>{bundle.chain_index}</div>
                </div>

                <div className="dash-terminal-digest">
                  <div>
                    <div className="dash-terminal-digest-label">Terminal Digest</div>
                    <div className="dash-terminal-digest-value">
                      {bundle.record_hash.slice(0, 32)}...
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 11, color: 'var(--dash-text-3)', marginLeft: 'auto' }}>
                    #{bundle.chain_index}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

            {/* Reserve State at Time of Payment */}
            {bundle?.reserve_snapshot && (
              <ReserveEvidence
                snapshot={bundle.reserve_snapshot}
                chainIndex={bundle.chain_index}
              />
            )}

        {/* Footer */}
        <div className="dash-drawer-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="dash-btn dash-btn-secondary" onClick={onClose}>
            Close
          </button>
          <NarratorButton eventId={event.event_id} />
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="dash-drawer-row">
      <span className="dash-drawer-label">{label}</span>
      <span
        className="dash-drawer-value"
        style={mono ? { fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
