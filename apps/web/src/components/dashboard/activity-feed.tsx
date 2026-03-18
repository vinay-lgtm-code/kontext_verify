'use client';

import { useState } from 'react';
import type { VerificationEvent } from '@/lib/dashboard-api';
import { StatusPill } from './status-pill';
import { TrustBar } from './trust-bar';

interface ActivityFeedProps {
  events: VerificationEvent[];
  onSelectEvent: (event: VerificationEvent) => void;
  onAssignEvent?: (eventId: string) => void;
}

const FILTERS = ['All', 'Verified', 'Warnings', 'Blocked'] as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatAmount(amount: string, token: string): string {
  const num = parseFloat(amount);
  return `${token} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getNetworkDisplay(event: VerificationEvent): string {
  return event.instrument_network ?? event.payment_chain;
}

function getRailLabel(rail: string): { text: string; color: string } {
  switch (rail) {
    case 'card': return { text: 'card', color: 'var(--dash-accent)' };
    case 'stablecoin': return { text: 'on-chain', color: 'var(--dash-green)' };
    case 'fiat': return { text: 'wire', color: 'var(--dash-amber)' };
    default: return { text: rail, color: 'var(--dash-text-3)' };
  }
}

export function ActivityFeed({ events, onSelectEvent, onAssignEvent }: ActivityFeedProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const filtered =
    filter === 'All' ? events :
    filter === 'Verified' ? events.filter((e) => e.status === 'verified') :
    filter === 'Warnings' ? events.filter((e) => e.status === 'warning') :
    events.filter((e) => e.status === 'blocked');

  return (
    <div>
      <div className="dash-feed-header">
        <span className="dash-feed-title">Live Activity</span>
        <div className="dash-filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`dash-filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-table">
        <div className={`dash-table-header ${onAssignEvent ? 'dash-cols-8' : 'dash-cols-7'}`}>
          <span>Time</span>
          <span>Agent</span>
          <span>Route</span>
          <span>Amount</span>
          <span>Trust</span>
          <span>Network</span>
          <span>Status</span>
          {onAssignEvent && <span>Assign</span>}
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--dash-text-3)',
              fontSize: 13,
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            No events yet — integrate the SDK to see data here
          </div>
        ) : (
          filtered.map((event) => (
            <div
              key={event.event_id}
              className={`dash-table-row ${onAssignEvent ? 'dash-cols-8' : 'dash-cols-7'}`}
              onClick={() => onSelectEvent(event)}
            >
              <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12, color: 'var(--dash-text-2)' }}>
                {formatTime(event.created_at)}
              </span>
              <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 }}>
                {event.agent_id}
              </span>
              <span style={{ fontSize: 12, color: 'var(--dash-text-2)' }}>
                {event.workflow}
              </span>
              <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 }}>
                {formatAmount(event.payment_amount, event.payment_token)}
              </span>
              <TrustBar score={event.trust_score} />
              <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 11, color: 'var(--dash-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {getNetworkDisplay(event)}
                <span style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.06)',
                  color: getRailLabel(event.payment_rail).color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {getRailLabel(event.payment_rail).text}
                </span>
              </span>
              <StatusPill status={event.status} />
              {onAssignEvent && (
                <button
                  className="dash-btn dash-btn-secondary"
                  style={{ fontSize: 11, padding: '2px 8px', height: 'auto' }}
                  onClick={(e) => { e.stopPropagation(); onAssignEvent(event.event_id); }}
                >
                  Assign
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
