'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending': return 'bg-amber-100/60 text-amber-700 font-mono border-amber-200/40';
    case 'in_progress': return 'bg-cyan-100/70 text-cyan-700 font-mono border-cyan-200/40';
    case 'completed': return 'bg-emerald-100/60 text-emerald-700 font-mono border-emerald-200/40';
    case 'cancelled': return 'bg-red-100/60 text-red-700 font-mono border-red-200/30';
    default: return 'bg-mobility-background text-mobility-muted font-mono border-mobility-border';
  }
}

function getVisitTypeBadge(type: string) {
  switch (type) {
    case 'correctivo_critico': return 'text-red-600';
    case 'preventivo': return 'text-mobility-accent';
    default: return 'text-mobility-primary';
  }
}

export default function RecentInterventionsTable() {
  const { visits, loadVisits, isLoading } = useAppStore();

  useEffect(() => {
    if (visits.length === 0) loadVisits();
  }, [visits.length, loadVisits]);

  const recent = [...visits].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div className="bg-mobility-surface shadow-sm border border-mobility-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-mobility-border bg-mobility-surface border-b border-mobility-border shadow-sm">
        <h3 className="font-bold text-mobility-primary tracking-tight flex items-center gap-2">
          Darreres Intervencions
          <span className="bg-mobility-accent text-white text-mobility-primary text-[10px] px-1.5 py-0.5 rounded-full">
            Top 5
          </span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-mobility-background sticky top-0">
            <tr className="text-mobility-muted text-xs font-semibold">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Tipus</th>
              <th className="px-4 py-3">Tecnic</th>
              <th className="px-4 py-3">Estat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mobility-border/60">
            {isLoading && recent.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-mobility-muted animate-pulse">
                  Carregant...
                </td>
              </tr>
            ) : recent.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-mobility-muted">
                  No hi ha intervencions registrades.
                </td>
              </tr>
            ) : (
              recent.map((v) => (
                <tr key={v.id} className="hover:bg-mobility-background hover:text-mobility-primary transition-colors group">
                  <td className="px-4 py-3 font-bold text-mobility-primary">#{v.id}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${getVisitTypeBadge(v.visit_type)}`}>
                      {v.visit_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-mobility-primary border border-mobility-border flex items-center justify-center text-[10px] font-bold text-mobility-accent">
                        T{v.technician_id ?? '?'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${getStatusBadge(v.status)}`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
