'use client';

import React from 'react';
import { Download, Filter } from 'lucide-react';
import type { Technician } from '@/lib/api';

interface MetricsHeaderProps {
  dateFrom: string;
  dateTo: string;
  technicianId?: number;
  technicians: Technician[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onTechnicianIdChange: (value: number | undefined) => void;
  isLoading: boolean;
}

export default function MetricsHeader({
  dateFrom,
  dateTo,
  technicianId,
  technicians,
  onDateFromChange,
  onDateToChange,
  onTechnicianIdChange,
  isLoading,
}: MetricsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-mobility-surface shadow-sm/90 p-6 rounded-2xl border border-mobility-border">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-mobility-primary mb-1">
          Rendiment global
        </h1>
        <p className="text-sm text-mobility-muted">
          Anàlisi detallada de temps, vehicles i resolucions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 px-3 py-2 bg-mobility-background text-mobility-primary text-sm font-medium rounded-lg border border-mobility-border">
          <span className="text-mobility-muted text-xs">Des de</span>
          <input
            type="date"
            className="bg-transparent outline-none text-sm text-mobility-primary"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 px-3 py-2 bg-mobility-background text-mobility-primary text-sm font-medium rounded-lg border border-mobility-border">
          <span className="text-mobility-muted text-xs">Fins</span>
          <input
            type="date"
            className="bg-transparent outline-none text-sm text-mobility-primary"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 px-3 py-2 bg-mobility-background text-mobility-primary text-sm font-medium rounded-lg border border-mobility-border">
          <Filter size={16} className="text-mobility-muted" />
          <select
            className="bg-transparent outline-none text-sm text-mobility-primary"
            value={technicianId ?? ''}
            onChange={(e) => {
              const nextValue = e.target.value;
              onTechnicianIdChange(nextValue ? Number(nextValue) : undefined);
            }}
          >
            <option value="">Tots els tècnics</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </label>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-mobility-accent text-white hover:brightness-110 text-sm font-medium rounded-lg shadow-sm transition-colors cursor-not-allowed opacity-50"
          disabled
          title="Exportació pendent d'implementació"
        >
          <Download size={16} />
          <span>{isLoading ? 'Actualitzant...' : 'Exportar'}</span>
        </button>
      </div>
    </div>
  );
}
