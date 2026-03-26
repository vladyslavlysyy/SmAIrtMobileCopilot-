'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { api, type MetricsResponse } from '@/lib/api';

export default function SlaRadialChart() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    api
      .getMetrics({})
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const data = useMemo(() => {
    if (!metrics) return [];
    return metrics.sla_por_tipo.map((row, idx) => ({
      name: row.visit_type,
      value: row.porcentaje_sla,
      fill: ['#dc2626', '#d97706', '#2563eb', '#7c3aed', '#0891b2'][idx % 5],
    }));
  }, [metrics]);

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground text-base">SLA per tipus</h3>
        <p className="text-muted-foreground text-xs mt-0.5">Percentatge SLA des de backend</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f1f5f9' }} />
          <Tooltip />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
            <span className="font-mono text-xs font-bold tabular-nums" style={{ color: item.fill }}>
              {item.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
