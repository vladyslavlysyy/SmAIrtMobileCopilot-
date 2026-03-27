'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Navigation, TrendingUp } from 'lucide-react';
import { api, type MetricsResponse } from '@/lib/api';

export default function KpiCardsGrid() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getMetrics({});
        if (!active) return;
        setMetrics(data);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "No s'han pogut carregar les metriques");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const kmTotal = useMemo(() => {
    if (!metrics) return 0;
    return metrics.km_por_tecnico.reduce((acc, row) => acc + row.km_total, 0);  
  }, [metrics]);

  if (error) {
    return (
      <div className="p-4 bg-mobility-surface shadow-sm border border-red-200 rounded-xl flex items-start gap-2">
        <AlertCircle size={16} className="text-red-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-600">Error KPI</p>   

          <p className="text-xs text-red-600/80">{error}</p>
        </div>
      </div>
    );
  }

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
      title: 'En progrés',
      value: metrics?.en_progreso ?? 0,
      subtitle: 'actives',
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
          className={`bg-mobility-surface shadow-sm rounded-xl p-5 border border-mobility-border ${loading ? 'opacity-70 animate-pulse bg-mobility-background' : ''}`}
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
            {card.value}
            <span className="text-sm font-normal text-mobility-muted font-sans">{' '}{card.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
