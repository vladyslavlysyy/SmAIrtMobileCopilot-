'use client';

import React from 'react';
import { Target, Activity, Clock, Navigation } from 'lucide-react';
import type { MetricsResponse } from '@/lib/api';

interface MetricsKpiGridProps {
  metrics: MetricsResponse | null;
  isLoading: boolean;
}

export default function MetricsKpiGrid({ metrics, isLoading }: MetricsKpiGridProps) {

  const total = (metrics?.completades ?? 0) + (metrics?.pendentes ?? 0) + (metrics?.en_progreso ?? 0);
  const completions = metrics?.completades ?? 0;
  const completionRate = total > 0 ? (completions / total) * 100 : 0;
  
  const totalKm = metrics?.km_por_tecnico?.reduce((acc, curr) => acc + curr.km_total, 0) ?? 0;

  const cards = [
    {
      title: 'Taxa de finalització',
      value: `${completionRate.toFixed(1)}%`,
      subtitle: `${completions} de ${total} complertes`,
      icon: Target,
      color: 'bg-mobility-accent text-white'
    },
    {
      title: 'Intervencions en Curs',
      value: `${metrics?.en_progreso ?? 0}`,
      subtitle: 'Visites actualment actives',
      icon: Activity,
      color: 'bg-mobility-accent text-white'
    },
    {
      title: 'Hores Efectives',
      value: `${metrics?.horas_efectivas_total?.toFixed(1) ?? 0}h`,
      subtitle: 'Temps total treballat',
      icon: Clock,
      color: 'bg-mobility-accent text-white'
    },
    {
      title: 'Quilometratge Total',
      value: `${totalKm.toFixed(1)} km`,
      subtitle: 'Distància recorreguda avui',
      icon: Navigation,
      color: 'bg-mobility-accent text-white'
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
            <h3 className="text-3xl font-black text-mobility-primary tracking-tight mb-1">{isLoading ? '--' : card.value}</h3>
            <p className="text-sm font-semibold text-mobility-primary mb-0.5">{card.title}</p>
            <p className="text-xs text-mobility-muted">{isLoading ? 'Carregant dades...' : card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
