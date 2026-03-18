'use client';

import { useEffect, useState } from 'react';
import type { VerificationEvent } from '@/lib/dashboard-mock';
import { getVerificationEvents, getEvidence, subscribeMockEvents } from '@/lib/dashboard-mock';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EvidenceDrawer } from '@/components/dashboard/evidence-drawer';

export default function PaymentsPage() {
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VerificationEvent | null>(null);
  const [hasMore] = useState(false);

  useEffect(() => {
    getVerificationEvents({ limit: 50 }).then((data) => setEvents(data.events));
  }, []);

  // Simulate live incoming events
  useEffect(() => {
    const unsub = subscribeMockEvents((newEvent) => {
      setEvents((prev) => [newEvent, ...prev]);
    });
    return unsub;
  }, []);

  return (
    <>
      <ActivityFeed events={events} onSelectEvent={setSelectedEvent} />

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="dash-btn dash-btn-secondary">Load More</button>
        </div>
      )}

      {selectedEvent && (
        <EvidenceDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          fetchEvidence={getEvidence}
        />
      )}
    </>
  );
}
