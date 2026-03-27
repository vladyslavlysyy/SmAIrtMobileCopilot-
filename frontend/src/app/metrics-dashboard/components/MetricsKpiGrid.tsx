'use client';

import React, { useEffect, useState } from 'react';
import { Target, Activity, Clock, Navigation } from 'lucide-react';
import { api, type MetricsResponse } from '@/lib/api';

export default function MetricsKpiGrid() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await api.getMetrics({ dateFrom: today, dateTo: today });
        setMetrics(res);
      } catch (err) {}
    };
    fetchMetrics();
  }, []);

  const total = (metrics?.completades ?? 0) + (metrics?.pendentes ?? 0) + (metrics?.en_progreso ?? 0);
  const completions = metrics?.completades ?? 0;
  const completionRate = total > 0 ? (completions / total) * 100 : 0;
  
  const totalKm = metrics?.km_por_tecnico?.reduce((acc, curr) => acc + curr.km_total, 0) ?? 0;

  const cards = [
    {
      title: 'Taxa de Finalitzaci?',
      value: `${completionRate.toFixed(1)}%`,
      subtitle: `${completions} de ${total} complertes`,
      icon: Target,
      color: 'bg-mobility-accent text-white text-mobility-primary'
    },
    {
      title: 'Intervencions en Curs',
      value: `${metrics?.en_progreso ?? 0}`,
      subtitle: 'Visites actualment actives',
      icon: Activity,
      color: 'bg-mobility-accent text-white text-mobility-primary'
    },
    {
      title: 'Hores Efectives',
      value: `${metrics?.horas_efectivas_total?.toFixed(1) ?? 0}h`,
      subtitle: 'Temps total treballat',
      icon: Clock,
      color: 'bg-mobility-accent text-white text-mobility-primary'
    },
    {
      title: 'Quilometratge Total',
      value: `${totalKm.toFixed(1)} km`,
      subtitle: 'Dist?ncia recorreguda avui',
      icon: Navigation,
      color: 'bg-mobility-accent text-white text-mobility-primary'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-mobility-surface shadow-sm border border-mobility-border rounded-xl p-5 hover:bg-mobility-background hover:text-mobility-primary transition-colors group">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg ${card.color} shadow-sm group-hover:scale-105 transition-transform`}>
              <card.icon size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-mobility-primary tracking-tight mb-1">{card.value}</h3>
            <p className="text-sm font-semibold text-mobility-primary mb-0.5">{card.title}</p>
            <p className="text-xs text-mobility-muted">{card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
