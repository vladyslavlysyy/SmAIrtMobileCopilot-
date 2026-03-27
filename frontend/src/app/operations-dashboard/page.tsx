'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/ui/AppLayout';
import OperationsHeader from './components/OperationsHeader';
import KpiCardsGrid from './components/KpiCardsGrid';
import ContingencyBanner from './components/ContingencyBanner';
import LoteCreation from './components/LoteCreation';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import type { VisitStatus } from '@/lib/api';

type DashboardStatusFilter = VisitStatus | 'scheduled' | 'all';

export default function OperationsDashboard() {
  const { visits, loadAllVisits } = useAppStore();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('pending');

  const refreshVisits = useCallback(
    async (showToast = false) => {
      await loadAllVisits();
      if (showToast) {
        toast.success('Dades actualitzades');
      }
      setRefreshNonce((v) => v + 1);
    },
    [loadAllVisits]
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
          <KpiCardsGrid
            dateFilter={dateFilter}
            refreshToken={refreshNonce}
            technicianId={undefined}
          />
          <LoteCreation onAssigned={() => refreshVisits(false)} />
        </div>
      </div>
    </AppLayout>
  );
}
