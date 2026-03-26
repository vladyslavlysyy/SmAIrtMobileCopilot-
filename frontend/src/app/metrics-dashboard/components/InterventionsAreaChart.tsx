'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type MetricsResponse } from '@/lib/api';

export default function InterventionsAreaChart() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    api
      .getMetrics({})
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const chartData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Completades', value: metrics.completades },
      { name: 'Pendents', value: metrics.pendentes },
      { name: 'En progrés', value: metrics.en_progreso },
    ];
  }, [metrics]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="mb-5">
        <h3 className="font-semibold text-foreground text-base">Intervencions</h3>
        <p className="text-muted-foreground text-xs mt-0.5">Distribució actual (API metrics)</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#93c5fd" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
