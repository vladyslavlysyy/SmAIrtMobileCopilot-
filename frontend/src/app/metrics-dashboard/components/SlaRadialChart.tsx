'use client';

import React from 'react';
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';

export default function SlaRadialChart() {
  const data = [
    { name: 'SLA Complert', value: 85, fill: '#00c851' }
  ];

  return (
    <div className="bg-mobility-surface shadow-sm/90 rounded-xl border border-mobility-border p-5 flex flex-col items-center justify-center">
      <div className="w-full mb-2">
        <h3 className="font-semibold text-mobility-primary text-base">Compliment SLA</h3>
        <p className="text-mobility-muted text-xs mt-0.5">?ltims 30 dies</p>
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
              background={{ fill: '#1e3a5a' }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-mobility-primary">85%</span>
          <span className="text-[10px] text-mobility-accent font-medium uppercase tracking-wider mt-1 border border-mobility-accent/30 bg-cyan-100/70 px-2 py-0.5 rounded-full">
            ?ptim
          </span>
        </div>
      </div>
    </div>
  );
}
