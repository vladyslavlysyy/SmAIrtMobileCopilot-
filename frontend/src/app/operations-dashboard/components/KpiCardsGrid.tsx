'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Navigation, TrendingUp } from 'lucide-react';
import { api, type MetricsResponse } from '@/lib/api';

interface KpiCardsGridProps {
  dateFilter: 'today' | 'all';
  refreshToken?: number;
  technicianId?: number;
}

export default function KpiCardsGrid({ dateFilter, refreshToken, technicianId }: KpiCardsGridProps) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setIsLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const params = dateFilter === 'today'
          ? { dateFrom: today, dateTo: today, technicianId }
          : { technicianId };
        const data = await api.getMetrics(params);
        if (!cancelled) {
          setMetrics(data);
        }
      } catch {
        if (!cancelled) {
          setMetrics(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [dateFilter, refreshToken, technicianId]);

  const kmTotal = useMemo(
    () => (metrics?.km_por_tecnico ?? []).reduce((acc, t) => acc + (t.km_total ?? 0), 0),
    [metrics]
  );

  const cards = [
    {
      id: 'done',
      title: 'Completades',
      value: metrics?.completades ?? 0,
      subtitle: 'visites',
      icon: <CheckCircle2 size={24} className="text-mobility-accent/60" />,       
    },
    {
      id: 'pending',
      title: 'Pendents',
      value: metrics?.pendentes ?? 0,
      subtitle: 'visites',
      icon: <Clock size={24} className="text-mobility-accent/60" />,
    },
    {
      id: 'progress',
      title: 'Programades',
      value: metrics?.programades ?? 0,
      subtitle: 'visites',
      icon: <TrendingUp size={24} className="text-mobility-accent/60" />,
    },
    {
      id: 'km',
      title: 'Km totals',
      value: kmTotal.toFixed(1),
      subtitle: 'km',
      icon: <Navigation size={24} className="text-mobility-accent/60" />,
    },
    {
      id: 'hours',
      title: 'Hores efectives',
      value: (metrics?.horas_efectivas_total ?? 0).toFixed(1),
      subtitle: 'h',
      icon: <Clock size={24} className="text-mobility-accent/60" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">      
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-mobility-surface shadow-sm rounded-xl p-5 border border-mobility-border"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-mobility-muted">
                {card.title}
              </span>
            </div>
            <div className="flex-shrink-0">{card.icon}</div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums font-mono text-mobility-accent">
            {isLoading ? '...' : card.value}
            <span className="text-sm font-normal text-mobility-muted font-sans">{' '}{card.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
