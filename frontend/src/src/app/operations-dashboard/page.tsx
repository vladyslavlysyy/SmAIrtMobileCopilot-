import React from 'react';
import AppLayout from '@/components/ui/AppLayout';
import OperationsHeader from './components/OperationsHeader';
import KpiCardsGrid from './components/KpiCardsGrid';
import ContingencyBanner from './components/ContingencyBanner';
import InterventionQueue from './components/InterventionQueue';
import MapPanel from './components/MapPanel';
import AISuggestionsPanel from './components/AISuggestionsPanel';

export default function OperationsDashboard() {
  return (
    // Hemos quitado el role="operations" de aquí también:
    <AppLayout>
      <div className="flex flex-col h-full min-h-screen bg-background">
        <OperationsHeader />
        <div className="flex-1 px-6 pb-6 space-y-5 max-w-screen-2xl mx-auto w-full">
          <ContingencyBanner />
          <KpiCardsGrid />
          <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 2xl:col-span-2">
              <InterventionQueue />
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