'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/ui/AppLayout';
import OperationsHeader from './components/OperationsHeader';
import KpiCardsGrid from './components/KpiCardsGrid';
import ContingencyBanner from './components/ContingencyBanner';
import InterventionQueue from './components/InterventionQueue';
import MapPanel from './components/MapPanel';
import AISuggestionsPanel from './components/AISuggestionsPanel';
import AdminCalendarPanel from './components/AdminCalendarPanel';
import ManualTaskPanel from './components/ManualTaskPanel';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';

export default function OperationsDashboard() {
  const { visits, loadVisits, loadAllVisits, isLoading } = useAppStore();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [filterMode, setFilterMode] = useState<
    'today_all' | 'today_pending' | 'all_all' | 'all_pending'
  >('today_all');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dateFilter = useMemo<'today' | 'all'>(() => (filterMode.startsWith('today') ? 'today' : 'all'), [filterMode]);
  const onlyPending = useMemo(() => filterMode.endsWith('pending'), [filterMode]);

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
    if (!onlyPending) return visits.length;
    return visits.filter((v) => v.status === 'pending').length;
  }, [onlyPending, visits]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-screen bg-mobility-background">
        <OperationsHeader
          filterMode={filterMode}
          visibleCount={visibleCount}
          totalCount={visits.length}
          isLoadingData={isLoading}
          onFilterModeChange={async (value) => {
            setFilterMode(value);
          }}
          onRefresh={() => refreshVisits(true)}
        />
        <div className="flex-1 px-6 pb-6 space-y-5 max-w-screen-2xl mx-auto w-full">
          <ManualTaskPanel onTaskCreated={() => refreshVisits(true)} />
          <AdminCalendarPanel refreshNonce={refreshNonce} onlyPending={onlyPending} />
          <ContingencyBanner />
          <KpiCardsGrid />
          <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 2xl:col-span-2">
              <InterventionQueue
                key={`queue-${refreshNonce}`}
                onlyPending={onlyPending}
                onDataChanged={() => refreshVisits(false)}
              />
            </div>
            <div className="xl:col-span-1 2xl:col-span-1 space-y-5">
              <MapPanel />
              <AISuggestionsPanel />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
