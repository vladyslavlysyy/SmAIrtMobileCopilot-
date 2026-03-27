'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricsResponse } from '@/lib/api';

interface KmBarChartProps {
  metrics: MetricsResponse | null;
  isLoading: boolean;
}

export default function KmBarChart({ metrics, isLoading }: KmBarChartProps) {
  const chartData = useMemo(
    () =>
      (metrics?.km_por_tecnico ?? []).map((row) => ({
        tech: row.technician_name,
        km: Number(row.km_total.toFixed(2)),
      })),
    [metrics]
  );

  return (
    <div className="bg-mobility-surface shadow-sm/90 rounded-xl border border-mobility-border p-5">
      <div className="mb-5">
        <h3 className="font-semibold text-mobility-primary text-base">Km recorreguts</h3>
        <p className="text-mobility-muted text-xs mt-0.5">Per tècnic (API metrics)</p>
      </div>
      {isLoading ? <p className="text-xs text-mobility-muted mb-2">Carregant dades...</p> : null}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid stroke="hsl(var(--mobility-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="tech"
            tick={{ fontSize: 11, fill: 'hsl(var(--mobility-muted))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--mobility-muted))' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--mobility-surface))',
              borderColor: 'hsl(var(--mobility-border))',
              color: 'hsl(var(--mobility-text))',
            }}
            itemStyle={{ color: 'hsl(var(--mobility-accent))' }}
            cursor={{ fill: 'hsl(var(--mobility-border))', opacity: 0.35 }}
          />
          <Bar dataKey="km" fill="hsl(var(--mobility-accent))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
