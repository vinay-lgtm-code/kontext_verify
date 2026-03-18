'use client';

import { useEffect, useState } from 'react';
import type { KpiData, VerificationEvent } from '@/lib/dashboard-mock';
import { getKpis, getVerificationEvents, getEvidence, subscribeMockEvents } from '@/lib/dashboard-mock';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EvidenceDrawer } from '@/components/dashboard/evidence-drawer';

export default function DashboardDemoOverview() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VerificationEvent | null>(null);

  useEffect(() => {
    getKpis().then(setKpis);
    getVerificationEvents({ limit: 20 }).then((data) => setEvents(data.events));
  }, []);

  // Simulate live incoming events
  useEffect(() => {
    const unsub = subscribeMockEvents((newEvent) => {
      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
      setKpis((prev) =>
        prev
          ? { ...prev, verified_payouts_today: prev.verified_payouts_today + 1 }
          : prev,
      );
    });
    return unsub;
  }, []);

  return (
    <>
      <KpiStrip data={kpis} />
      <ActivityFeed events={events} onSelectEvent={setSelectedEvent} />

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
