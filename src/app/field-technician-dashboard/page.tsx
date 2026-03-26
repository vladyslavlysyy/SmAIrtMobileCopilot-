'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/ui/AppLayout';
import TechnicianHeader from './components/TechnicianHeader';
import WeeklyCalendarStrip from './components/WeeklyCalendarStrip';
import RouteTimeline from './components/RouteTimeline';
import BatteryAutonomyCard from './components/BatteryAutonomyCard';
import ContingencyButton from './components/ContingencyButton';

export default function TeamManagementPage() {
  // Por defecto, vemos a Marc
  const [selectedTech, setSelectedTech] = useState('Marc Puigdomènech');

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-background">
        
        {/* Cabecera interactiva */}
        <TechnicianHeader selectedTech={selectedTech} onSelect={setSelectedTech} />
        
        {/* Usamos key={selectedTech} para que Next.js "recargue" todo esto al cambiar de persona */}
        <div key={selectedTech} className="flex-1 px-4 md:px-6 pb-6 mt-6 space-y-5 max-w-screen-2xl mx-auto w-full animate-fade-in">
          <WeeklyCalendarStrip />
          <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
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