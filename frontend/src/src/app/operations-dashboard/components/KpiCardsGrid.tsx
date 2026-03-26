'use client';

import React from 'react';
import { AlertTriangle, Clock, Navigation, Users, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const kpis = [
  {
    id: 'kpi-critics',
    label: 'Correctius Crítics Pendents',
    value: '3',
    unit: 'intervencions',
    trend: '+1 vs ahir',
    trendUp: false,
    icon: AlertTriangle,
    color: 'red',
    bgClass: 'bg-red-50 border-red-200',
    iconClass: 'text-red-600 bg-red-100',
    valueClass: 'text-red-700',
    trendClass: 'text-red-600',
    detail: 'SLA en risc: 2',
  },
  {
    id: 'kpi-sla',
    label: 'Taxa Compliment SLA',
    value: '87.3',
    unit: '%',
    trend: '-4.2% vs setmana passada',
    trendUp: false,
    icon: Clock,
    color: 'amber',
    bgClass: 'bg-amber-50 border-amber-200',
    iconClass: 'text-amber-600 bg-amber-100',
    valueClass: 'text-amber-700',
    trendClass: 'text-amber-600',
    detail: 'Objectiu: 95%',
  },
  {
    id: 'kpi-km',
    label: 'Km Planificats Avui',
    value: '342',
    unit: 'km',
    trend: '-28 km vs ahir',
    trendUp: true,
    icon: Navigation,
    color: 'blue',
    bgClass: 'bg-blue-50 border-blue-200',
    iconClass: 'text-blue-600 bg-blue-100',
    valueClass: 'text-blue-700',
    trendClass: 'text-blue-600',
    detail: '4 tècnics actius',
  },
  {
    id: 'kpi-tecnics',
    label: 'Tècnics Disponibles',
    value: '4',
    unit: 'de 5',
    trend: '1 de baixa mèdica',
    trendUp: false,
    icon: Users,
    color: 'indigo',
    bgClass: 'bg-indigo-50 border-indigo-200',
    iconClass: 'text-indigo-600 bg-indigo-100',
    valueClass: 'text-indigo-700',
    trendClass: 'text-slate-500',
    detail: '19 visites assignades',
  },
  {
    id: 'kpi-completades',
    label: 'Completades Avui',
    value: '7',
    unit: 'de 26',
    trend: '+2 vs torn matí',
    trendUp: true,
    icon: CheckCircle2,
    color: 'green',
    bgClass: 'bg-green-50 border-green-200',
    iconClass: 'text-green-600 bg-green-100',
    valueClass: 'text-green-700',
    trendClass: 'text-green-600',
    detail: '26.9% completat',
  },
  {
    id: 'kpi-temps',
    label: 'Temps Mitjà Resolució',
    value: '2.4',
    unit: 'h',
    trend: '-0.3h vs setmana passada',
    trendUp: true,
    icon: TrendingUp,
    color: 'teal',
    bgClass: 'bg-teal-50 border-teal-200',
    iconClass: 'text-teal-600 bg-teal-100',
    valueClass: 'text-teal-700',
    trendClass: 'text-teal-600',
    detail: 'Objectiu: < 3h',
  },
];

export default function KpiCardsGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      {kpis?.map((kpi) => {
        const Icon = kpi?.icon;
        return (
          <div
            key={kpi?.id}
            className={`rounded-xl border p-4 ${kpi?.bgClass} transition-all duration-150 hover:shadow-md cursor-default`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi?.iconClass}`}>
                <Icon size={16} />
              </div>
              <span className={`text-xs font-medium ${kpi?.trendClass} flex items-center gap-0.5`}>
                {kpi?.trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              </span>
            </div>
            <div className={`text-2xl font-bold tabular-nums font-mono ${kpi?.valueClass} mb-0.5`}>
              {kpi?.value}
              <span className="text-sm font-normal ml-1 opacity-70">{kpi?.unit}</span>
            </div>
            <p className="text-xs font-semibold text-foreground/80 leading-tight mb-1">{kpi?.label}</p>
            <p className="text-xs text-muted-foreground">{kpi?.detail}</p>
          </div>
        );
      })}
    </div>
  );
}