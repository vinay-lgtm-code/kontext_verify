'use client';

import { useEffect, useState, useCallback } from 'react';
import type { KpiData, VerificationEvent } from '@/lib/dashboard-api';
import { getKpis, getVerificationEvents } from '@/lib/dashboard-api';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EvidenceDrawer } from '@/components/dashboard/evidence-drawer';

export default function DashboardOverview() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VerificationEvent | null>(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [kpiData, eventsData] = await Promise.all([
        getKpis(),
        getVerificationEvents({ limit: 20 }),
      ]);
      setKpis(kpiData);
      setEvents(eventsData.events);
      setError('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch data';
      if (msg !== 'Not authenticated') setError(msg);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <>
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 6,
            color: 'var(--dash-red)',
            fontSize: 13,
            marginBottom: 16,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          {error}
        </div>
      )}

      <KpiStrip data={kpis} />
      <ActivityFeed events={events} onSelectEvent={setSelectedEvent} />

      {selectedEvent && (
        <EvidenceDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
