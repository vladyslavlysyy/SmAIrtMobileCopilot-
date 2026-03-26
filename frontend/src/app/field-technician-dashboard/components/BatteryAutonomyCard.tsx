'use client';

import React from 'react';
import { Zap, MapPin, AlertTriangle } from 'lucide-react';

const routeLegs = [
  {
    id: 'leg-1',
    from: 'Inici (Tarragona)',
    to: 'CST Oncè de Setembre',
    km: 0,
    batteryStart: 92,
    batteryEnd: 89,
  },
  {
    id: 'leg-2',
    from: 'CST Oncè de Setembre',
    to: 'CST Av. Roma',
    km: 3,
    batteryStart: 89,
    batteryEnd: 84,
  },
  {
    id: 'leg-3',
    from: 'CST Av. Roma',
    to: 'Hotel Salou',
    km: 22,
    batteryStart: 84,
    batteryEnd: 72,
  },
  {
    id: 'leg-4',
    from: 'Hotel Salou',
    to: 'Recàrrega Salou',
    km: 5,
    batteryStart: 72,
    batteryEnd: 55,
  },
  {
    id: 'leg-5',
    from: 'Recàrrega Salou',
    to: 'Ajunt. Tarragona',
    km: 18,
    batteryStart: 85,
    batteryEnd: 72,
  },
  {
    id: 'leg-6',
    from: 'Ajunt. Tarragona',
    to: 'Polígon Vila-seca',
    km: 8,
    batteryStart: 72,
    batteryEnd: 58,
  },
  {
    id: 'leg-7',
    from: 'Polígon Vila-seca',
    to: 'Residencial Ponent',
    km: 12,
    batteryStart: 58,
    batteryEnd: 45,
  },
];

function getBatteryColor(val: number) {
  if (val >= 60) return 'bg-green-500';
  if (val >= 30) return 'bg-amber-500';
  return 'bg-red-500';
}

function getBatteryTextColor(val: number) {
  if (val >= 60) return 'text-green-600';
  if (val >= 30) return 'text-amber-600';
  return 'text-red-600';
}

export default function BatteryAutonomyCard() {
  const currentBattery = 72;
  const minBattery = Math.min(...routeLegs.map((l) => l.batteryEnd));

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-100 rounded-lg">
              <Zap size={14} className="text-cyan-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Autonomia del Vehicle</h3>
              <p className="text-muted-foreground text-xs">Renault Zoe · Autonomia màx: 395 km</p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-xl font-bold font-mono tabular-nums ${getBatteryTextColor(currentBattery)}`}
            >
              {currentBattery}%
            </p>
            <p className="text-xs text-muted-foreground">~{Math.round(currentBattery * 3.95)}km</p>
          </div>
        </div>

        {/* Main battery bar */}
        <div className="mt-3">
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getBatteryColor(currentBattery)}`}
              style={{ width: `${currentBattery}%` }}
            />
          </div>
          {minBattery < 30 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700">
              <AlertTriangle size={12} />
              <span>
                Bateria mínima prevista: <span className="font-bold font-mono">{minBattery}%</span>{' '}
                — Recàrrega planificada
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Route legs */}
      <div className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Consum per tram
        </p>
        {routeLegs.map((leg) => {
          const isRecharge = leg.batteryEnd > leg.batteryStart;
          const delta = leg.batteryEnd - leg.batteryStart;
          return (
            <div key={leg.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <MapPin size={10} className="text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground truncate">{leg.to}</p>
                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0 font-mono">
                    {leg.km}km
                  </span>
                </div>
                <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  {isRecharge ? (
                    <div
                      className="h-1.5 bg-cyan-400 rounded-full"
                      style={{ width: `${leg.batteryEnd}%` }}
                    />
                  ) : (
                    <div
                      className={`h-1.5 rounded-full ${getBatteryColor(leg.batteryEnd)}`}
                      style={{ width: `${leg.batteryEnd}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right w-16">
                <span
                  className={`text-xs font-mono font-semibold tabular-nums ${isRecharge ? 'text-cyan-600' : getBatteryTextColor(leg.batteryEnd)}`}
                >
                  {isRecharge ? `+${delta}%` : `${delta}%`}
                </span>
                <p className="text-xs font-mono tabular-nums text-muted-foreground">
                  {leg.batteryEnd}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Km totals</p>
          <p className="font-bold font-mono text-sm tabular-nums text-foreground">68 km</p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-xs text-muted-foreground">Recàrregues</p>
          <p className="font-bold font-mono text-sm tabular-nums text-cyan-600">1 parada</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Fi jornada</p>
          <p className="font-bold font-mono text-sm tabular-nums text-foreground">45%</p>
        </div>
      </div>
    </div>
  );
}
