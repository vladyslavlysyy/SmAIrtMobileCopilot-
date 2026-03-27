'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { getStatusLabelCa, getVisitTypeLabelCa } from '@/lib/labels';

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending': return 'bg-amber-200/75 text-amber-950 font-mono border-amber-400 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-400/40';
    case 'in_progress': return 'bg-cyan-200/75 text-cyan-950 font-mono border-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-100 dark:border-cyan-400/40';
    case 'completed': return 'bg-emerald-200/75 text-emerald-950 font-mono border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-400/40';
    case 'cancelled': return 'bg-red-200/75 text-red-950 font-mono border-red-400 dark:bg-red-500/20 dark:text-red-100 dark:border-red-400/40';
    default: return 'bg-mobility-background text-mobility-primary font-mono border-mobility-border';
  }
}

function getVisitTypeBadge(type: string) {
  switch (type) {
    case 'correctivo_critico':
      return 'px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-200/75 text-red-950 border border-red-400 dark:bg-red-500/20 dark:text-red-100 dark:border-red-400/40';
    case 'correctivo_no_critico':
      return 'px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-200/75 text-amber-950 border border-amber-400 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-400/40';
    case 'diagnosi':
      return 'px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-200/75 text-cyan-950 border border-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-100 dark:border-cyan-400/40';
    case 'puesta_en_marcha':
      return 'px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-violet-200/75 text-violet-950 border border-violet-400 dark:bg-violet-500/20 dark:text-violet-100 dark:border-violet-400/40';
    case 'preventivo':
      return 'px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-200/75 text-emerald-950 border border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-400/40';
    default:
      return 'px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-mobility-background text-mobility-primary border border-mobility-border';
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
                    <span className={getVisitTypeBadge(v.visit_type)}>
                      {getVisitTypeLabelCa(v.visit_type)}
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
                      {getStatusLabelCa(v.status)}
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
