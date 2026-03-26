'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Navigation, TrendingUp } from 'lucide-react';
import { api, type MetricsResponse } from '@/lib/api';

export default function MetricsKpiGrid() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const m = await api.getMetrics({});
        if (!active) return;
        setData(m);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Error carregant mètriques');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
        <AlertCircle size={16} className="text-red-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">Error de mètriques</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const kmTotal = data?.km_por_tecnico.reduce((a, b) => a + b.km_total, 0) ?? 0;

  const cards = [
    {
      id: 'c1',
      label: 'Completades',
      value: data?.completades ?? 0,
      suffix: 'visites',
      icon: <CheckCircle2 size={16} className="text-green-600" />,
      cls: 'bg-green-50 border-green-200 text-green-700',
    },
    {
      id: 'c2',
      label: 'Pendents',
      value: data?.pendentes ?? 0,
      suffix: 'visites',
      icon: <Clock size={16} className="text-amber-600" />,
      cls: 'bg-amber-50 border-amber-200 text-amber-700',
    },
    {
      id: 'c3',
      label: 'En progrés',
      value: data?.en_progreso ?? 0,
      suffix: 'visites',
      icon: <TrendingUp size={16} className="text-blue-600" />,
      cls: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      id: 'c4',
      label: 'Km totals',
      value: kmTotal.toFixed(1),
      suffix: 'km',
      icon: <Navigation size={16} className="text-indigo-600" />,
      cls: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    },
    {
      id: 'c5',
      label: 'Hores efectives',
      value: (data?.horas_efectivas_total ?? 0).toFixed(1),
      suffix: 'h',
      icon: <Clock size={16} className="text-teal-600" />,
      cls: 'bg-teal-50 border-teal-200 text-teal-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((k) => (
        <div key={k.id} className={`rounded-xl border p-4 ${k.cls} ${loading ? 'opacity-60' : ''}`}>
          <div className="mb-2">{k.icon}</div>
          <div className="text-2xl font-bold tabular-nums font-mono">
            {k.value}
            <span className="text-sm font-normal ml-1 opacity-70">{k.suffix}</span>
          </div>
          <p className="text-xs font-semibold text-foreground/80 mt-1">{k.label}</p>
        </div>
      ))}
    </div>
  );
}
