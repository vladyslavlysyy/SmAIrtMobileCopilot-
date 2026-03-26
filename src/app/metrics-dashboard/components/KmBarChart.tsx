'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  } from 'recharts';

const data = [
  { technician: 'Marc P.', kmViatge: 312, kmTreball: 48, recàrregues: 2 },
  { technician: 'Laia F.', kmViatge: 287, kmTreball: 52, recàrregues: 1 },
  { technician: 'Jordi C.', kmViatge: 198, kmTreball: 38, recàrregues: 1 },
  { technician: 'Núria V.', kmViatge: 145, kmTreball: 22, recàrregues: 0 },
  { technician: 'Pau R.', kmViatge: 234, kmTreball: 41, recàrregues: 2 },
];

const weeklyData = [
  { week: 'S.08 Mar', marc: 68, laia: 72, jordi: 45, nuria: 31, pau: 55 },
  { week: 'S.15 Mar', marc: 82, laia: 61, jordi: 52, nuria: 28, pau: 67 },
  { week: 'S.22 Mar', marc: 74, laia: 79, jordi: 38, nuria: 35, pau: 58 },
  { week: 'S.29 Mar', marc: 88, laia: 75, jordi: 63, nuria: 51, pau: 54 },
];

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={`kmtt-${entry.dataKey}`} className="flex items-center justify-between gap-4 text-xs mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-foreground">{entry.name}</span>
          </div>
          <span className="font-mono font-bold tabular-nums">{entry.value} km</span>
        </div>
      ))}
    </div>
  );
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

export default function KmBarChart() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-foreground text-base">Km Recorreguts per Tècnic</h3>
          <p className="text-muted-foreground text-xs mt-0.5">Evolució setmanal · Últimes 4 setmanes</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            Marc P.
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-600" />
            Laia F.
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            Jordi C.
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-violet-600" />
            Núria V.
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-cyan-600" />
            Pau R.
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            unit=" km"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="marc" name="Marc P." fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="laia" name="Laia F." fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="jordi" name="Jordi C." fill="#d97706" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="nuria" name="Núria V." fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="pau" name="Pau R." fill="#0891b2" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary row */}
      <div className="mt-4 grid grid-cols-5 gap-3 pt-4 border-t border-border">
        {data.map((tech, idx) => (
          <div key={`techsum-${tech.technician}`} className="text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: COLORS[idx] }} />
            <p className="text-xs font-semibold text-foreground font-mono tabular-nums">{tech.kmViatge} km</p>
            <p className="text-xs text-muted-foreground">{tech.technician}</p>
            <p className="text-xs text-cyan-600 font-medium">{tech.recàrregues} rec.</p>
          </div>
        ))}
      </div>
    </div>
  );
}