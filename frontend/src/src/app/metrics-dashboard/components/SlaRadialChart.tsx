'use client';

import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const slaData = [
  { name: 'Correctiu Crític', value: 78, fill: '#dc2626', target: 99 },
  { name: 'Correctiu No Crític', value: 85, fill: '#d97706', target: 95 },
  { name: 'Preventiu', value: 94, fill: '#2563eb', target: 90 },
  { name: 'Posada en Marxa', value: 97, fill: '#7c3aed', target: 95 },
  { name: 'Diagnosi', value: 91, fill: '#0891b2', target: 90 },
];

interface TooltipPayload {
  payload: {
    name: string;
    value: number;
    target: number;
    fill: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const meetsTarget = d.value >= d.target;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 min-w-[200px]">
      <p className="text-xs font-bold text-foreground mb-2">{d.name}</p>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">Compliment actual</span>
        <span className="font-mono font-bold tabular-nums" style={{ color: d.fill }}>{d.value}%</span>
      </div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-muted-foreground">Objectiu SLA</span>
        <span className="font-mono font-bold tabular-nums text-foreground">{d.target}%</span>
      </div>
      <div className={`text-xs font-semibold px-2 py-1 rounded-md text-center ${meetsTarget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {meetsTarget ? '✓ Objectiu assolit' : '✗ Per sota de l\'objectiu'}
      </div>
    </div>
  );
}

export default function SlaRadialChart() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground text-base">Compliment SLA per Tipus</h3>
        <p className="text-muted-foreground text-xs mt-0.5">Taxa de resolució dins termini · Últims 30 dies</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          data={slaData}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            background={{ fill: '#f1f5f9' }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="space-y-2 mt-2">
        {slaData.map((item) => {
          const meetsTarget = item.value >= item.target;
          return (
            <div key={`sla-${item.name}`} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
              <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-xs font-bold tabular-nums" style={{ color: item.fill }}>
                  {item.value}%
                </span>
                <span className={`text-xs ${meetsTarget ? 'text-green-600' : 'text-red-600'}`}>
                  {meetsTarget ? '✓' : '✗'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-muted-foreground">Global SLA</span>
          <span className="font-mono font-bold text-sm tabular-nums text-amber-600">87.3%</span>
        </div>
        <div className="mt-1.5 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-2 bg-amber-500 rounded-full" style={{ width: '87.3%' }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Objectiu: 95% — Diferència: -7.7%</p>
      </div>
    </div>
  );
}