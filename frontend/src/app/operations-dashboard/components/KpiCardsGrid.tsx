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
        setError(e instanceof Error ? e.message : "No s'han pogut carregar les mètriques");
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
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
        <AlertCircle size={16} className="text-red-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">Error KPI</p>
          <p className="text-xs text-red-600">{error}</p>
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
      icon: <CheckCircle2 size={16} className="text-green-600" />,
      box: 'bg-green-50 border-green-200',
      valueClass: 'text-green-700',
    },
    {
      id: 'pending',
      title: 'Pendents',
      value: metrics?.pendentes ?? 0,
      subtitle: 'visites',
      icon: <Clock size={16} className="text-amber-600" />,
      box: 'bg-amber-50 border-amber-200',
      valueClass: 'text-amber-700',
    },
    {
      id: 'progress',
      title: 'En progrés',
      value: metrics?.en_progreso ?? 0,
      subtitle: 'actives',
      icon: <TrendingUp size={16} className="text-blue-600" />,
      box: 'bg-blue-50 border-blue-200',
      valueClass: 'text-blue-700',
    },
    {
      id: 'km',
      title: 'Km totals',
      value: kmTotal.toFixed(1),
      subtitle: 'km',
      icon: <Navigation size={16} className="text-indigo-600" />,
      box: 'bg-indigo-50 border-indigo-200',
      valueClass: 'text-indigo-700',
    },
    {
      id: 'hours',
      title: 'Hores efectives',
      value: (metrics?.horas_efectivas_total ?? 0).toFixed(1),
      subtitle: 'h',
      icon: <Clock size={16} className="text-teal-600" />,
      box: 'bg-teal-50 border-teal-200',
      valueClass: 'text-teal-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`rounded-xl border p-4 ${card.box} ${loading ? 'opacity-70' : ''}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-white/70">{card.icon}</div>
          </div>
          <div className={`text-2xl font-bold tabular-nums font-mono ${card.valueClass}`}>
            {card.value}
            <span className="text-sm font-normal ml-1 opacity-70">{card.subtitle}</span>
          </div>
          <p className="text-xs font-semibold text-foreground/80 mt-1">{card.title}</p>
        </div>
      ))}
    </div>
  );
}
