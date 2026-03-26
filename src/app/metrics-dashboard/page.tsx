import React from 'react';
import AppLayout from '@/components/ui/AppLayout';
import MetricsHeader from './components/MetricsHeader';
import MetricsKpiGrid from './components/MetricsKpiGrid';
import InterventionsAreaChart from './components/InterventionsAreaChart';
import KmBarChart from './components/KmBarChart';
import SlaRadialChart from './components/SlaRadialChart';
import RecentInterventionsTable from './components/RecentInterventionsTable';

export default function MetricsDashboard() {
  return (
    // Hemos quitado el role="operations" de aquí:
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-background">
        <MetricsHeader />
        <div className="flex-1 px-6 pb-6 space-y-5 max-w-screen-2xl mx-auto w-full">
          <MetricsKpiGrid />
          <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <InterventionsAreaChart />
            </div>
            <div className="xl:col-span-1">
              <SlaRadialChart />
            </div>
          </div>
          <KmBarChart />
          <RecentInterventionsTable />
        </div>
      </div>
    </AppLayout>
  );
}