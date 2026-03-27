'use client';

import React, { useMemo } from 'react';
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';
import type { MetricsResponse } from '@/lib/api';

interface SlaRadialChartProps {
  metrics: MetricsResponse | null;
  isLoading: boolean;
}

export default function SlaRadialChart({ metrics, isLoading }: SlaRadialChartProps) {
  const slaValue = useMemo(() => {
    const rows = metrics?.sla_por_tipo ?? [];
    if (rows.length === 0) return 0;
    const totalVisits = rows.reduce((acc, row) => acc + row.total, 0);
    if (totalVisits === 0) return 0;
    const weighted = rows.reduce(
      (acc, row) => acc + (row.porcentaje_sla * row.total) / totalVisits,
      0
    );
    return Number(weighted.toFixed(1));
  }, [metrics]);

  const badgeText = slaValue >= 90 ? 'Excel·lent' : slaValue >= 75 ? 'Bo' : 'Millorable';
  const data = [{ name: 'SLA Complert', value: slaValue, fill: '#00c851' }];

  return (
    <div className="bg-mobility-surface shadow-sm/90 rounded-xl border border-mobility-border p-5 flex flex-col items-center justify-center">
      <div className="w-full mb-2">
        <h3 className="font-semibold text-mobility-primary text-base">Compliment SLA</h3>
        <p className="text-mobility-muted text-xs mt-0.5">Mitjana ponderada per tipus (API)</p>
      </div>
      
      <div className="relative w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="75%" 
            outerRadius="100%" 
            barSize={12} 
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            {/* Background circle simulating a track */}
            <RadialBar
              background={{ fill: 'hsl(var(--mobility-border))' }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-mobility-primary">{isLoading ? '--' : `${slaValue}%`}</span>
          <span className="text-[10px] text-mobility-accent font-medium uppercase tracking-wider mt-1 border border-mobility-accent/30 bg-mobility-background px-2 py-0.5 rounded-full">
            {isLoading ? 'Carregant' : badgeText}
          </span>
        </div>
      </div>
    </div>
  );
}
