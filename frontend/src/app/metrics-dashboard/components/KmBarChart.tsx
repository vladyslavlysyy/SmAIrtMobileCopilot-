'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, type MetricsResponse } from '@/lib/api';

export default function KmBarChart() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    api
      .getMetrics({})
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const data = useMemo(() => {
    if (!metrics) return [];
    return metrics.km_por_tecnico.map((r) => ({ technician: r.technician_name, km: r.km_total }));
  }, [metrics]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="mb-5">
        <h3 className="font-semibold text-foreground text-base">Km per tècnic</h3>
        <p className="text-muted-foreground text-xs mt-0.5">Font: /api/v1/metrics</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="technician"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar dataKey="km" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
