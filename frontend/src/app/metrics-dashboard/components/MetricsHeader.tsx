'use client';

import React from 'react';
import { Download, CalendarDays, Filter } from 'lucide-react';

export default function MetricsHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-mobility-surface shadow-sm/90 p-6 rounded-2xl border border-mobility-border">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-mobility-primary mb-1">
          Rendiment Global
        </h1>
        <p className="text-sm text-mobility-muted">
          Analisi detallat de temps, vehicles i resolucions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-2 bg-mobility-primary hover:bg-mobility-background hover:text-mobility-primary text-mobility-primary text-sm font-medium rounded-lg border border-mobility-border transition-colors">
          <CalendarDays size={16} className="text-mobility-muted" />
          <span>Ultims 30 dies</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 bg-mobility-primary hover:bg-mobility-background hover:text-mobility-primary text-mobility-primary text-sm font-medium rounded-lg border border-mobility-border transition-colors">
          <Filter size={16} className="text-mobility-muted" />
          <span>Filtres</span>
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-mobility-accent text-white hover:brightness-110 text-sm font-medium rounded-lg shadow-sm transition-colors cursor-not-allowed opacity-50">
          <Download size={16} />
          <span>Exportar</span>
        </button>
      </div>
    </div>
  );
}
