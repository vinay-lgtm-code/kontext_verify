'use client';

import { useEffect, useState, useCallback } from 'react';
import type { VerificationEvent } from '@/lib/dashboard-api';
import { getVerificationEvents } from '@/lib/dashboard-api';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EvidenceDrawer } from '@/components/dashboard/evidence-drawer';

export default function PaymentsPage() {
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VerificationEvent | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

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

  return (
    <>
      <ActivityFeed events={events} onSelectEvent={setSelectedEvent} />

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
    </>
  );
}
