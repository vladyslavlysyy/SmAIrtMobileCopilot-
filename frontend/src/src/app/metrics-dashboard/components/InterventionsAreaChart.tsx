'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { date: '25 Feb', completades: 8, pendents: 3, imprevistos: 1 },
  { date: '26 Feb', completades: 11, pendents: 4, imprevistos: 0 },
  { date: '27 Feb', completades: 7, pendents: 5, imprevistos: 2 },
  { date: '28 Feb', completades: 9, pendents: 3, imprevistos: 1 },
  { date: '01 Mar', completades: 13, pendents: 2, imprevistos: 0 },
  { date: '03 Mar', completades: 10, pendents: 4, imprevistos: 1 },
  { date: '05 Mar', completades: 6, pendents: 7, imprevistos: 3 },
  { date: '07 Mar', completades: 12, pendents: 3, imprevistos: 0 },
  { date: '10 Mar', completades: 14, pendents: 2, imprevistos: 1 },
  { date: '12 Mar', completades: 9, pendents: 5, imprevistos: 2 },
  { date: '14 Mar', completades: 11, pendents: 4, imprevistos: 0 },
  { date: '17 Mar', completades: 15, pendents: 3, imprevistos: 1 },
  { date: '19 Mar', completades: 8, pendents: 6, imprevistos: 2 },
  { date: '21 Mar', completades: 13, pendents: 2, imprevistos: 0 },
  { date: '24 Mar', completades: 10, pendents: 4, imprevistos: 1 },
  { date: '26 Mar', completades: 7, pendents: 5, imprevistos: 2 },
];

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={`tt-${entry.name}`} className="flex items-center justify-between gap-4 text-xs mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-foreground">{entry.name}</span>
          </div>
          <span className="font-mono font-bold tabular-nums text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function InterventionsAreaChart() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="mb-5">
        <h3 className="font-semibold text-foreground text-base">Intervencions per Dia</h3>
        <p className="text-muted-foreground text-xs mt-0.5">Completades vs. pendents vs. imprevistos · Últims 30 dies</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCompletades" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPendents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradImprevistos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="completades"
            name="Completades"
            stroke="#16a34a"
            strokeWidth={2}
            fill="url(#gradCompletades)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="pendents"
            name="Pendents"
            stroke="#d97706"
            strokeWidth={2}
            fill="url(#gradPendents)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="imprevistos"
            name="Imprevistos"
            stroke="#dc2626"
            strokeWidth={2}
            fill="url(#gradImprevistos)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}