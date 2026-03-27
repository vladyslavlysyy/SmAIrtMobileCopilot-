'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const mockData = [
  { tech: 'Joan', km: 120 },
  { tech: 'Maria', km: 230 },
  { tech: 'Pere', km: 85 },
  { tech: 'Anna', km: 154 },
  { tech: 'Lluis', km: 190 },
];

export default function KmBarChart() {
  return (
    <div className="bg-mobility-surface shadow-sm/90 rounded-xl border border-mobility-border p-5">
      <div className="mb-5">
        <h3 className="font-semibold text-mobility-primary text-base">Km Recorreguts (Simulat)</h3>
        <p className="text-mobility-muted text-xs mt-0.5">Top T?cnics</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={mockData}>
          <CartesianGrid stroke="#1e3a5a" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="tech"
            tick={{ fontSize: 11, fill: '#8fa3bc' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#8fa3bc' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#13233a', borderColor: '#1e3a5a', color: '#fff' }} 
            itemStyle={{ color: '#3b82f6' }}
            cursor={{ fill: '#1e3a5a', opacity: 0.4 }}
          />
          <Bar dataKey="km" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
