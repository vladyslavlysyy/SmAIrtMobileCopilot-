'use client';

import React, { useMemo, useState } from 'react';
import { Download, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';

export default function OperationsHeader() {
  const { visits, loadVisits, isLoading } = useAppStore();
  const [dateFilter, setDateFilter] = useState('today');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleRefresh = async () => {
    const date = dateFilter === 'today' ? today : undefined;
    await loadVisits(date);
    toast.success('Dades actualitzades');
  };

  const handleExport = () => {
    const headers = ['id', 'visit_type', 'status', 'planned_date', 'technician_id', 'address'];
    const rows = visits.map((v) => [
      v.id,
      v.visit_type,
      v.status,
      v.planned_date,
      v.technician_id ?? '',
      v.address ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visits_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          Centre de Control Operatiu
        </h1>
        <p className="text-muted-foreground text-sm">
          {visits.length} visites carregades des del backend
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg"
        >
          <option value="today">Avui</option>
          <option value="all">Totes</option>
        </select>

        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg">
          <Filter size={14} />
          Filtres
        </button>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Actualitzar
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>
    </div>
  );
}
