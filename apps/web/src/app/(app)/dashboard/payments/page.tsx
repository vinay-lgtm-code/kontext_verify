'use client';

import { useEffect, useState, useCallback } from 'react';
import type { VerificationEvent, TeamMember } from '@/lib/dashboard-api';
import { getVerificationEvents, getRole, getTeamMembers, assignEvent } from '@/lib/dashboard-api';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EvidenceDrawer } from '@/components/dashboard/evidence-drawer';

export default function PaymentsPage() {
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VerificationEvent | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | null>(null); // eventId being assigned
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignError, setAssignError] = useState('');
  const role = getRole();
  const isAdmin = role === 'admin';

  const fetchData = useCallback(async (loadMore = false) => {
    try {
      const data = await getVerificationEvents({
        limit: 50,
        cursor: loadMore && cursor ? cursor : undefined,
      });
      if (loadMore) {
        setEvents((prev) => [...prev, ...data.events]);
      } else {
        setEvents(data.events);
      }
      setCursor(data.next_cursor);
      setHasMore(!!data.next_cursor);
    } catch {
      // silently fail on poll
    }
  }, [cursor]);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load team members when admin opens the assign panel
  useEffect(() => {
    if (!isAdmin) return;
    getTeamMembers()
      .then((data) => setTeamMembers(data.members.filter((m) => m.status === 'active')))
      .catch(() => {});
  }, [isAdmin]);

  const handleAssign = async (eventId: string, userId: string) => {
    setAssignError('');
    try {
      await assignEvent(eventId, userId);
      setAssignTarget(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Assignment failed');
    }
  };

  return (
    <>
      <ActivityFeed
        events={events}
        onSelectEvent={setSelectedEvent}
        onAssignEvent={isAdmin ? (eventId) => setAssignTarget(eventId) : undefined}
      />

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            className="dash-btn dash-btn-secondary"
            onClick={() => fetchData(true)}
          >
            Load More
          </button>
        </div>
      )}

      {selectedEvent && (
        <EvidenceDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Assign panel (admin only) */}
      {isAdmin && assignTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setAssignTarget(null)}
        >
          <div
            style={{
              background: 'var(--dash-surface)',
              border: '1px solid var(--dash-border)',
              borderRadius: 8,
              padding: 24,
              minWidth: 320,
              maxWidth: 420,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              Assign event to team member
            </div>
            {teamMembers.length === 0 ? (
              <div style={{ color: 'var(--dash-text-3)', fontSize: 13 }}>No active team members found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teamMembers.map((m) => (
                  <button
                    key={m.user_id}
                    className="dash-btn dash-btn-secondary"
                    style={{ textAlign: 'left', justifyContent: 'flex-start', gap: 8 }}
                    onClick={() => handleAssign(assignTarget, m.user_id)}
                  >
                    <span style={{ fontFamily: 'var(--font-plex-mono), monospace', fontSize: 12 }}>{m.email}</span>
                    <span style={{ fontSize: 11, color: 'var(--dash-text-3)', marginLeft: 'auto' }}>{m.role}</span>
                  </button>
                ))}
              </div>
            )}
            {assignError && (
              <div style={{ color: 'var(--dash-red)', fontSize: 12, marginTop: 12 }}>{assignError}</div>
            )}
            <button
              className="dash-btn dash-btn-secondary"
              style={{ marginTop: 16, width: '100%' }}
              onClick={() => setAssignTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
