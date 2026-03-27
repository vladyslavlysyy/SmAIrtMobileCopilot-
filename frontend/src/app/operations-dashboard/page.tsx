'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/ui/AppLayout';
import OperationsHeader from './components/OperationsHeader';
import KpiCardsGrid from './components/KpiCardsGrid';
import ContingencyBanner from './components/ContingencyBanner';
import InterventionQueue from './components/InterventionQueue';
import MapPanel from './components/MapPanel';
import AISuggestionsPanel from './components/AISuggestionsPanel';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import type { VisitStatus } from '@/lib/api';

type DashboardStatusFilter = VisitStatus | 'scheduled' | 'all';

export default function OperationsDashboard() {
  const { visits, loadVisits, loadAllVisits, isLoading } = useAppStore();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('pending');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const refreshVisits = useCallback(
    async (showToast = false) => {
      if (dateFilter === 'today') {
        await loadVisits(today);
      } else {
        await loadAllVisits();
      }
      if (showToast) {
        toast.success('Dades actualitzades');
      }
      setRefreshNonce((v) => v + 1);
    },
    [dateFilter, loadAllVisits, loadVisits, today]
  );

  useEffect(() => {
    void refreshVisits(false);
  }, [refreshVisits]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshVisits(false);
    }, 30000);

    return () => clearInterval(timer);
  }, [refreshVisits]);

  const visibleCount = useMemo(() => {
    if (statusFilter === 'all') return visits.length;
    return visits.filter((v) => String(v.status).toLowerCase() === statusFilter).length;
  }, [statusFilter, visits]);

  const filteredVisits = useMemo(() => {
    if (statusFilter === 'all') return visits;
    return visits.filter((v) => String(v.status).toLowerCase() === statusFilter);
  }, [statusFilter, visits]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-screen bg-mobility-background">
        <OperationsHeader
          dateFilter={dateFilter}
          statusFilter={statusFilter}
          visibleCount={visibleCount}
          totalCount={visits.length}
          onDateFilterChange={setDateFilter}
          onStatusFilterChange={setStatusFilter}
        />
        <div className="flex-1 px-3 sm:px-4 lg:px-6 pt-[0.9cm] sm:pt-[1.2cm] lg:pt-[1.5cm] pb-8 space-y-[0.9cm] sm:space-y-[1.2cm] lg:space-y-[1.5cm] max-w-screen-2xl mx-auto w-full">
          <ContingencyBanner />
          <KpiCardsGrid visits={filteredVisits} />
          <InterventionQueue
            key={`queue-${refreshNonce}`}
            forcedStatusFilter={statusFilter}
            onDataChanged={() => refreshVisits(false)}
          />

          <section className="pt-2 md:pt-3 border-t border-mobility-border/60">
            <div className="rounded-2xl p-3 md:p-4 bg-gradient-to-b from-transparent via-mobility-background/70 to-[#0d1520]/10">
              <MapPanel dashboardFullHeight />
            </div>
          </section>

          <div className="max-w-xl pt-1">
            <AISuggestionsPanel />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
