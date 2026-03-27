"use client";

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/ui/AppLayout';
import MetricsHeader from './components/MetricsHeader';
import MetricsKpiGrid from './components/MetricsKpiGrid';
import InterventionsAreaChart from './components/InterventionsAreaChart';
import KmBarChart from './components/KmBarChart';
import SlaRadialChart from './components/SlaRadialChart';
import RecentInterventionsTable from './components/RecentInterventionsTable';
import { api, type MetricsResponse, type Technician } from '@/lib/api';

function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDefaultRange() {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateTo.getDate() - 30);
  return {
    dateFrom: formatDateOnly(dateFrom),
    dateTo: formatDateOnly(dateTo),
  };
}

export default function MetricsDashboard() {
  const defaults = useMemo(() => getDefaultRange(), []);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [technicianId, setTechnicianId] = useState<number | undefined>(undefined);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTechnicians()
      .then(setTechnicians)
      .catch(() => setTechnicians([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setIsLoadingMetrics(true);
      setMetricsError(null);
      try {
        const data = await api.getMetrics({
          dateFrom,
          dateTo,
          technicianId,
        });
        if (!cancelled) {
          setMetrics(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMetrics(null);
          setMetricsError(error instanceof Error ? error.message : 'No s\'han pogut carregar les metriques');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMetrics(false);
        }
      }
    }

    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, technicianId]);

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-mobility-background">
        <MetricsHeader
          dateFrom={dateFrom}
          dateTo={dateTo}
          technicianId={technicianId}
          technicians={technicians}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onTechnicianIdChange={setTechnicianId}
          isLoading={isLoadingMetrics}
        />
        <div className="flex-1 px-3 sm:px-4 lg:px-6 pt-[0.9cm] sm:pt-[1.2cm] lg:pt-[1.5cm] pb-6 space-y-[0.9cm] sm:space-y-[1.2cm] lg:space-y-[1.5cm] max-w-screen-2xl mx-auto w-full">
          {metricsError ? (
            <div className="bg-red-100 text-red-800 border border-red-200 rounded-xl px-4 py-3 text-sm">
              {metricsError}
            </div>
          ) : null}

          <MetricsKpiGrid metrics={metrics} isLoading={isLoadingMetrics} />
          <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <InterventionsAreaChart metrics={metrics} isLoading={isLoadingMetrics} />
            </div>
            <div className="xl:col-span-1">
              <SlaRadialChart metrics={metrics} isLoading={isLoadingMetrics} />
            </div>
          </div>
          <KmBarChart metrics={metrics} isLoading={isLoadingMetrics} />
          <RecentInterventionsTable
            dateFrom={dateFrom}
            dateTo={dateTo}
            technicianId={technicianId}
          />
        </div>
      </div>
    </AppLayout>
  );
}
