'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Navigation, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const kpis = [
  {
    id: 'mkpi-completades',
    label: 'Intervencions Completades',
    value: '183',
    subvalue: 'de 211 planificades',
    trend: '+12 vs mes anterior',
    trendPositive: true,
    icon: CheckCircle2,
    bgClass: 'bg-green-50 border-green-200',
    iconClass: 'text-green-600 bg-green-100',
    valueClass: 'text-green-700',
    trendClass: 'text-green-600',
    detail: '86.7% taxa de completació',
  },
  {
    id: 'mkpi-pendents',
    label: 'Pendents / En Risc SLA',
    value: '28',
    subvalue: 'intervencions obertes',
    trend: '5 en risc SLA',
    trendPositive: false,
    icon: AlertTriangle,
    bgClass: 'bg-amber-50 border-amber-200',
    iconClass: 'text-amber-600 bg-amber-100',
    valueClass: 'text-amber-700',
    trendClass: 'text-amber-600',
    detail: '3 crítiques sense assignar',
  },
  {
    id: 'mkpi-km',
    label: 'Km Recorreguts (mes)',
    value: '8.742',
    subvalue: 'km totals',
    trend: '-342 km vs mes anterior',
    trendPositive: true,
    icon: Navigation,
    bgClass: 'bg-blue-50 border-blue-200',
    iconClass: 'text-blue-600 bg-blue-100',
    valueClass: 'text-blue-700',
    trendClass: 'text-blue-600',
    detail: 'Estalvi: ~68kg CO₂',
  },
  {
    id: 'mkpi-hores',
    label: 'Hores Efectives Treball',
    value: '312',
    subvalue: 'hores facturables',
    trend: '+18h vs mes anterior',
    trendPositive: true,
    icon: Clock,
    bgClass: 'bg-indigo-50 border-indigo-200',
    iconClass: 'text-indigo-600 bg-indigo-100',
    valueClass: 'text-indigo-700',
    trendClass: 'text-indigo-600',
    detail: 'Ratio efectiu: 78%',
  },
  {
    id: 'mkpi-sla',
    label: 'Compliment SLA Global',
    value: '87.3',
    subvalue: '%',
    trend: '-4.2% vs mes anterior',
    trendPositive: false,
    icon: TrendingUp,
    bgClass: 'bg-red-50 border-red-200',
    iconClass: 'text-red-600 bg-red-100',
    valueClass: 'text-red-700',
    trendClass: 'text-red-600',
    detail: 'Objectiu: 95% — Atenció!',
  },
];

export default function MetricsKpiGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      {kpis?.map((kpi) => {
        const Icon = kpi?.icon;
        return (
          <div
            key={kpi?.id}
            className={`rounded-xl border p-4 ${kpi?.bgClass} hover:shadow-md transition-all duration-150 cursor-default`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi?.iconClass}`}>
                <Icon size={16} />
              </div>
              <span className={`text-xs ${kpi?.trendClass} flex items-center gap-0.5`}>
                {kpi?.trendPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              </span>
            </div>
            <div className={`text-2xl font-bold tabular-nums font-mono ${kpi?.valueClass} mb-0.5`}>
              {kpi?.value}
              <span className="text-sm font-normal ml-1 opacity-70">{kpi?.subvalue}</span>
            </div>
            <p className="text-xs font-semibold text-foreground/80 leading-tight mb-1">{kpi?.label}</p>
            <p className="text-xs text-muted-foreground">{kpi?.detail}</p>
            <p className={`text-xs mt-1 font-medium ${kpi?.trendClass}`}>{kpi?.trend}</p>
          </div>
        );
      })}
    </div>
  );
}