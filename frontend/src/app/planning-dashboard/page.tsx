'use client';

import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';
import AppLayout from '@/components/ui/AppLayout';
import ManualTaskPanel from '../operations-dashboard/components/ManualTaskPanel';
import AdminCalendarPanel from '../operations-dashboard/components/AdminCalendarPanel';
import { useAppStore } from '@/store/appStore';
import type { Visit } from '@/lib/api';

export default function PlanningDashboard() {
  const { loadAllVisits } = useAppStore();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [focusDateIso, setFocusDateIso] = useState<string | null>(null);

  const refreshPlanning = useCallback(async (showToast = false) => {
    setRefreshNonce((v) => v + 1);
    await loadAllVisits();
    if (showToast) {
      toast.success('Planificació actualitzada');
    }
  }, [loadAllVisits]);

  const handleTaskCreated = useCallback(async (createdVisit: Visit) => {
    if (createdVisit?.planned_date) {
      setFocusDateIso(createdVisit.planned_date);
    }
    await refreshPlanning(true);
  }, [refreshPlanning]);

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-mobility-background">
        <div className="bg-mobility-surface border-b border-mobility-border px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-mobility-primary tracking-tight">Planificació operativa</h1>
            <p className="text-mobility-muted text-xs sm:text-sm">
              Calendari comú, calendari per tècnic i gestió manual de tasques.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap" />
        </div>

        <div className="flex-1 px-3 sm:px-4 lg:px-6 pt-[0.9cm] sm:pt-[1.2cm] lg:pt-[1.5cm] pb-6 space-y-[0.9cm] sm:space-y-[1.2cm] lg:space-y-[1.5cm] max-w-screen-2xl mx-auto w-full">
          <ManualTaskPanel onTaskCreated={handleTaskCreated} />
          <AdminCalendarPanel
            refreshNonce={refreshNonce}
            focusDateIso={focusDateIso}
            onSlotUpdated={() => refreshPlanning(false)}
          />
        </div>
      </div>
    </AppLayout>
  );
}
