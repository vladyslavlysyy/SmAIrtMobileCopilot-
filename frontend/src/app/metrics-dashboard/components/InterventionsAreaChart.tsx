'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricsResponse } from '@/lib/api';

interface InterventionsAreaChartProps {
  metrics: MetricsResponse | null;
  isLoading: boolean;
}

export default function InterventionsAreaChart({ metrics, isLoading }: InterventionsAreaChartProps) {

  const chartData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Completades', value: metrics.completades },
      { name: 'Pendents', value: metrics.pendentes },
      { name: 'En progrés', value: metrics.en_progreso },
    ];
  }, [metrics]);

  return (
    <div className="bg-mobility-surface shadow-sm/90 rounded-xl border border-mobility-border p-5">
      <div className="mb-5">
        <h3 className="font-semibold text-mobility-primary text-base">Intervencions</h3>
        <p className="text-mobility-muted text-xs mt-0.5">Distribució actual segons backend</p>
      </div>
      {isLoading ? <p className="text-xs text-mobility-muted mb-2">Carregant dades...</p> : null}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <CartesianGrid stroke="hsl(var(--mobility-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'hsl(var(--mobility-muted))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--mobility-muted))' }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--mobility-surface))',
              borderColor: 'hsl(var(--mobility-border))',
              color: 'hsl(var(--mobility-text))',
            }}
            itemStyle={{ color: 'hsl(var(--mobility-accent))' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--mobility-accent))"
            fill="hsl(var(--mobility-accent))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
