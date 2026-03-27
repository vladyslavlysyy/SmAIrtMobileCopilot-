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
      { name: 'En progr?s', value: metrics.en_progreso },
    ];
  }, [metrics]);

  return (
    <div className="bg-mobility-surface shadow-sm/90 rounded-xl border border-mobility-border p-5">
      <div className="mb-5">
        <h3 className="font-semibold text-mobility-primary text-base">Intervencions</h3>
        <p className="text-mobility-muted text-xs mt-0.5">Distribuci? actual (API metrics)</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <CartesianGrid stroke="#1e3a5a" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#8fa3bc' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#8fa3bc' }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#13233a', borderColor: '#1e3a5a', color: '#fff' }} 
            itemStyle={{ color: '#00c851' }}
          />
          <Area type="monotone" dataKey="value" stroke="#00c851" fill="#00c851" fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
