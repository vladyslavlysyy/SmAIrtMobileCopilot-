'use client';

import React from 'react';
import { Zap, MapPin, AlertTriangle } from 'lucide-react';

const routeLegs = [
  {
    id: 'leg-1',
    from: 'Inici (Tarragona)',
    to: 'CST Onze de Setembre',
    km: 0,
    batteryStart: 92,
    batteryEnd: 89,
  },
  {
    id: 'leg-2',
    from: 'CST Onze de Setembre',
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
    to: 'Recarrega Salou',
    km: 5,
    batteryStart: 72,
    batteryEnd: 55,
  },
  {
    id: 'leg-5',
    from: 'Recarrega Salou',
    to: 'Ajunt. Tarragona',
    km: 18,
    batteryStart: 85,
    batteryEnd: 72,
  },
  {
    id: 'leg-6',
    from: 'Ajunt. Tarragona',
    to: 'Poligon Vila-seca',
    km: 8,
    batteryStart: 72,
    batteryEnd: 58,
  },
  {
    id: 'leg-7',
    from: 'Poligon Vila-seca',
    to: 'Residencial Ponent',
    km: 12,
    batteryStart: 58,
    batteryEnd: 45,
  },
];

function getBatteryColor(val: number) {
  if (val >= 30) return 'bg-mobility-accent text-white';
  if (val >= 15) return 'bg-amber-400 text-white';
  return 'bg-red-500 text-white';
}

function getBatteryTextColor(val: number) {
  if (val >= 30) return 'text-mobility-accent';
  if (val >= 15) return 'text-mobility-accent';
  return 'text-red-600';
}

export default function BatteryAutonomyCard() {
  const currentBattery = 72;
  const minBattery = Math.min(...routeLegs.map((l) => l.batteryEnd));

  return (
    <div className="bg-mobility-surface shadow-sm rounded-xl border border-mobility-border overflow-hidden">
      <div className="px-5 py-4 border-b border-mobility-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mobility-accent text-white/20 rounded-lg">
              <Zap size={18} className="text-mobility-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-mobility-primary text-sm">Autonomia del Vehicle</h3>
              <p className="text-mobility-muted text-xs">Renault Zoe | Autonomia max: 395 km</p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold font-mono tabular-nums font-mono ${getBatteryTextColor(currentBattery)}`}
            >
              {currentBattery}%
            </p>
            <p className="text-sm font-semibold text-mobility-primary">~{Math.round(currentBattery * 3.95)} km</p>
          </div>
        </div>

        {/* Main battery bar */}
        <div className="mt-4">
          <div className="h-3 bg-mobility-background rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,200,81,0.5)] ${getBatteryColor(currentBattery)}`}
              style={{ width: `${currentBattery}%` }}
            />
          </div>
          {minBattery < 30 && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-mobility-accent">
              <AlertTriangle size={14} />
              <span>
                Bateria m?nima prevista: <span className="font-bold font-mono">{minBattery}%</span>{' '}
                | Recarrega planificada
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Route legs */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-semibold text-mobility-muted uppercase tracking-wider mb-4">
          Consum per tram
        </p>
        <div className="space-y-3">
          {routeLegs.map((leg) => {
            const isRecharge = leg.batteryEnd > leg.batteryStart;
            const delta = leg.batteryEnd - leg.batteryStart;
            return (
              <div key={leg.id} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">    
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-mobility-muted flex-shrink-0" />
                      <p className="text-xs text-mobility-primary truncate">{leg.to}</p>   
                    </div>
                    <span className="text-xs text-mobility-muted flex-shrink-0 font-mono">
                      {leg.km} km
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-mobility-primary bg-opacity-50 rounded-full overflow-hidden">
                    {isRecharge ? (
                      <div
                        className="h-1.5 bg-mobility-accent text-white rounded-full"
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
                    className={`text-xs font-mono font-bold tabular-nums font-mono ${isRecharge ? 'text-mobility-accent' : getBatteryTextColor(leg.batteryEnd)}`}
                  >
                    {isRecharge ? `+${delta}%` : `${delta}%`}
                  </span>
                  <p className="text-[10px] font-mono tabular-nums font-mono text-mobility-muted mt-0.5">
                    {leg.batteryEnd}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 py-4 border-t border-mobility-border bg-mobility-primary grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-mobility-muted mb-1">Km totals</p>
          <p className="font-bold font-mono text-sm tabular-nums font-mono text-mobility-primary">68 km</p>
        </div>
        <div className="text-center border-x border-mobility-border">
          <p className="text-[10px] uppercase tracking-wider text-mobility-muted mb-1">Recarregues</p>
          <p className="font-bold font-mono text-sm tabular-nums font-mono text-mobility-accent">1 parada</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-mobility-muted mb-1">Fi jornada</p>
          <p className="font-bold font-mono text-sm tabular-nums font-mono text-mobility-primary">45%</p>
        </div>
      </div>
    </div>
  );
}
