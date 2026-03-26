'use client';

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/components/ui/AppLayout';
import TechnicianHeader from './components/TechnicianHeader';
import RouteTimeline from './components/RouteTimeline';
import BatteryAutonomyCard from './components/BatteryAutonomyCard';
import ContingencyButton from './components/ContingencyButton';
import WeeklyCalendarStrip from './components/WeeklyCalendarStrip';
import { useAppStore } from '@/store/appStore';

export default function FieldTechnicianDashboardPage() {
  const { technicians, selectedTechnicianId, isLoading, loadTechnicians, setSelectedTechnician } =
    useAppStore();

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    if (!selectedTechnicianId && technicians.length > 0) {
      setSelectedTechnician(technicians[0].id);
    }
  }, [selectedTechnicianId, technicians, setSelectedTechnician]);

  if (isLoading && technicians.length === 0) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] pb-8 bg-background">
        <TechnicianHeader
          technicians={technicians}
          selectedTechId={selectedTechnicianId}
          onSelect={setSelectedTechnician}
        />

        <div
          key={selectedTechnicianId ?? 'no-tech'}
          className="flex-1 p-6 max-w-screen-2xl mx-auto w-full animate-fade-in"
        >
          <WeeklyCalendarStrip />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            <div className="xl:col-span-2 space-y-6">
              <RouteTimeline />
            </div>
            <div className="xl:col-span-1 space-y-4">
              <BatteryAutonomyCard />
              <ContingencyButton />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
