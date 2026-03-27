'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Play, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { api, type Visit } from '@/lib/api';

interface InterventionQueueProps {
  onlyPending: boolean;
  onDataChanged?: () => Promise<void> | void;
}

function getPriorityColor(priority: number) {
  if (priority >= 80) return 'bg-red-500 text-white';
  if (priority >= 50) return 'bg-amber-400 text-white';
  return 'bg-mobility-accent text-white';
}

function getPriorityValue(visit: Visit) {
  if (typeof visit.last_priority_score === 'number') return visit.last_priority_score;

  switch (visit.visit_type) {
    case 'critical_corrective':
      return 95;
    case 'non_critical_corrective':
      return 75;
    case 'diagnosis':
      return 60;
    case 'commissioning':
      return 45;
    case 'maintenance':
    default:
      return 30;
  }
}

function formatVisitType(type: Visit['visit_type']) {
  return type.replace(/_/g, ' ');
}

function formatStatus(status: Visit['status']) {
  if (status === 'pending') return 'pendent';
  if (status === 'in_progress') return 'en curs';
  if (status === 'completed') return 'completada';
  if (status === 'cancelled') return 'cancelada';
  if (status === 'blocked') return 'bloquejada';
  return String(status).replace(/_/g, ' ');
}

function getVisitTypeBadge(type: Visit['visit_type']) {
  switch (type) {
    case 'critical_corrective':
      return 'bg-red-100/60 text-red-700 font-mono border border-red-200/30';
    case 'non_critical_corrective':
      return 'bg-amber-100/60 text-amber-700 font-mono border border-amber-200/40';
    case 'diagnosis':
      return 'bg-cyan-100/70 text-cyan-700 font-mono border border-cyan-200/40';
    case 'commissioning':
      return 'bg-cyan-100/70 text-cyan-700 font-mono border border-cyan-200/40';
    case 'maintenance':
      return 'bg-emerald-100/60 text-emerald-700 font-mono border border-emerald-200/40';
    default:
      return 'bg-mobility-background text-mobility-muted font-mono border border-mobility-border';
  }
}

function getStatusBadge(status: Visit['status']) {
  switch (status) {
    case 'pending': return 'bg-amber-100/60 text-amber-700 font-mono border border-amber-200/40';
    case 'in_progress': return 'bg-cyan-100/70 text-cyan-700 font-mono border border-cyan-200/40';
    case 'completed': return 'bg-emerald-100/60 text-emerald-700 font-mono border border-emerald-200/40';
    case 'cancelled': return 'bg-red-100/60 text-red-700 font-mono border border-red-200/30';
    default: return 'bg-mobility-background text-mobility-muted font-mono border border-mobility-border';
  }
}

export default function InterventionQueue({ onlyPending, onDataChanged }: InterventionQueueProps) {
  const { visits, technicians, loadVisits, loadTechnicians, isLoading } = useAppStore();

  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress'>('pending');
  const [techFilter, setTechFilter] = useState<number | 'all'>('all');
  const [assigningVisitId, setAssigningVisitId] = useState<number | null>(null);
  const [assignTechByVisit, setAssignTechByVisit] = useState<Record<number, number | 'auto'>>({});

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    if (onlyPending) {
      setFilter('pending');
    }
  }, [onlyPending]);

  const techs = useMemo(() => {
    const ids = new Set<number>();
    technicians.forEach((t) => ids.add(t.id));
    visits.forEach((v) => {
      if (v.technician_id !== null) ids.add(v.technician_id);
    });
    return Array.from(ids) as number[];
  }, [technicians, visits]);

  const filteredVisits = useMemo(() => {
    return visits
      .filter((v) => {
        if (onlyPending && v.status !== 'pending') return false;
        if (filter !== 'all' && v.status !== filter) return false;
        if (techFilter !== 'all' && v.technician_id !== techFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const pA = getPriorityValue(a);
        const pB = getPriorityValue(b);
        return pB - pA;
      });
  }, [visits, filter, techFilter, onlyPending]);

  const handleRunOptimizer = async () => {
    try {
      const byTech = new Map<number, number[]>();
      visits.forEach((v) => {
        if (v.technician_id === null) return;
        const list = byTech.get(v.technician_id) ?? [];
        list.push(v.id);
        byTech.set(v.technician_id, list);
      });

      if (byTech.size === 0) {
        toast.error('No hi ha tecnics amb visites assignades');
        return;
      }

      const origin = { latitude: 41.1189, longitude: 1.2445 };
      const routes = await Promise.all(
        Array.from(byTech.entries()).map(([technicianId, visitIds]) =>
          api.calculateRoute({
            technician_id: technicianId,
            visit_ids_ordered: visitIds,
            origen: origin,
          })
        )
      );

      const distance = routes.reduce((acc, r) => acc + r.distancia_total_km, 0);
      const minutes = routes.reduce((acc, r) => acc + r.tiempo_total_min, 0);

      toast.success(`Optimització completada: ${distance.toFixed(1)} km · ${Math.round(minutes)} min`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No s\'ha pogut optimitzar la ruta');
    }
  };

  const handleAssignTech = async (visitId: number) => {
    try {
      setAssigningVisitId(visitId);
      const planning = await api.planningAssign({ visit_id: visitId });
      const selectedTech = assignTechByVisit[visitId] ?? 'auto';

      let candidate = planning.candidates[0];
      if (selectedTech === 'auto') {
        candidate = planning.candidates.find((c) => c.technician_id === planning.recommended.technician_id) ?? planning.candidates[0];
      } else {
        candidate = planning.candidates.find((c) => c.technician_id === selectedTech) ?? planning.candidates[0];
      }

      if (!candidate) {
        toast.error('No hi ha candidats per a l\'assignació');
        return;
      }

      await api.planningConfirm({
        visit_id: visitId,
        technician_id: candidate.technician_id,
        proposed_date: candidate.proposed_date,
        insertion_index: candidate.insertion_index,
      });

      if (onDataChanged) {
        await onDataChanged();
      } else {
        await loadVisits();
      }
      toast.success(`Visita #${visitId} assignada a tecnic ${candidate.technician_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No s\'ha pogut assignar la visita');
    } finally {
      setAssigningVisitId(null);
    }
  };

  return (
    <div className="bg-mobility-surface shadow-sm rounded-xl border border-mobility-border h-[600px] flex flex-col">
      {/* HEADER */}
      <div className="p-4 border-b border-mobility-border bg-mobility-surface shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-mobility-primary tracking-tight flex items-center gap-2">
            Cua d'Intervencions
            <span className="bg-mobility-accent text-white text-xs px-2 py-0.5 rounded-full font-mono">
              {filteredVisits.length}
            </span>
          </h2>
          <p className="text-mobility-muted text-xs mt-0.5">Priorització intel·ligent FSM</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex bg-mobility-background p-1 rounded-lg border border-mobility-border">
            <button
              onClick={() => setFilter('all')}
              disabled={onlyPending}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === 'all' ? 'bg-mobility-accent text-white shadow-sm' : 'text-mobility-muted hover:text-mobility-primary'
              }`}
            >
              Totes
            </button>
            <button
              onClick={() => setFilter('pending')}
              disabled={onlyPending}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === 'pending' ? 'bg-mobility-accent text-white shadow-sm' : 'text-mobility-muted hover:text-mobility-primary'
              }`}
            >
              Pendents
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              disabled={onlyPending}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === 'in_progress' ? 'bg-mobility-accent text-white shadow-sm' : 'text-mobility-muted hover:text-mobility-primary'
              }`}
            >
              En curs
            </button>
          </div>

          <select
            value={String(techFilter)}
            onChange={(e) => {
              const value = e.target.value;
              setTechFilter(value === 'all' ? 'all' : Number(value));
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-mobility-border bg-mobility-background text-mobility-primary"
          >
            <option value="all">Tots els tecnics</option>
            {techs.map((t) => (
              <option key={t} value={t}>{`Tecnic ${t}`}</option>
            ))}
          </select>

          <button
            onClick={handleRunOptimizer}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mobility-accent text-white hover:brightness-110 text-xs font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(0,162,219,0.2)]"
          >
            <Play size={14} className={isLoading ? 'animate-pulse' : ''} />
            Optimitzar
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="sticky top-0 bg-mobility-background border-b border-mobility-border shadow-sm z-10">
            <tr className="text-mobility-muted text-xs font-semibold">
              <th className="px-4 py-3 font-medium">Prioritat</th>
              <th className="px-4 py-3 font-medium">Visita</th>
              <th className="px-4 py-3 font-medium">Estat</th>
              <th className="px-4 py-3 font-medium">Tecnic</th>
              <th className="px-4 py-3 font-medium">Localització</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mobility-border/60">
            {filteredVisits.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-mobility-muted">
                  No hi ha intervencions que coincideixin.
                </td>
              </tr>
            ) : (
              filteredVisits.map((visit) => {
                const priority = getPriorityValue(visit);
                const isSelected = selectedVisitId === visit.id;

                return (
                  <React.Fragment key={visit.id}>
                    <tr 
                      className={`bg-mobility-surface shadow-sm hover:bg-mobility-background hover:text-mobility-primary transition-colors cursor-pointer ${isSelected ? 'bg-mobility-background' : ''}`}
                      onClick={() => setSelectedVisitId(isSelected ? null : visit.id)}
                    >
                      <td className="px-4 py-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${getPriorityColor(priority)}`}>
                          {Math.round(priority)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-mobility-primary mb-0.5">#{visit.id}</p>
                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${getVisitTypeBadge(visit.visit_type)}`}>
                          {formatVisitType(visit.visit_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${getStatusBadge(visit.status)}`}>
                          {formatStatus(visit.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {visit.technician_id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-mobility-primary border border-mobility-border flex items-center justify-center text-[10px] text-mobility-accent font-bold">
                              T{visit.technician_id}
                            </div>
                          </div>
                        ) : (
                          <span className="text-mobility-accent/80 text-xs flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Sense assignar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-mobility-primary truncate max-w-[220px]">{visit.address || visit.postal_code || 'Sense adreça'}</p>
                      </td>
                    </tr>
                    
                    {isSelected && (
                      <tr className="bg-mobility-background border-l-2 border-mobility-accent/50">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="flex items-center justify-between bg-mobility-primary p-3 rounded-lg border border-mobility-border/50">
                            <div>
                              <p className="text-xs text-mobility-primary font-medium mb-1">Assignació manual</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={String(assignTechByVisit[visit.id] ?? 'auto')}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setAssignTechByVisit((prev) => ({
                                    ...prev,
                                    [visit.id]: value === 'auto' ? 'auto' : Number(value),
                                  }));
                                }}
                                className="px-2.5 py-1.5 text-xs rounded-lg border border-mobility-border bg-mobility-background text-mobility-primary"
                              >
                                <option value="auto">IA recomanat</option>
                                {techs.map((t) => (
                                  <option key={t} value={t}>{`Tecnic ${t}`}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignTech(visit.id)}
                                disabled={assigningVisitId === visit.id}
                                className="px-3 py-1.5 bg-mobility-accent hover:brightness-110 text-white text-xs font-semibold rounded border border-mobility-accent/30 disabled:opacity-60"
                              >
                                {assigningVisitId === visit.id ? 'Assignant...' : 'Assignar'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
