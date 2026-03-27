'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { api, type Visit } from '@/lib/api';
import { getStatusLabelCa, getVisitTypeLabelCa } from '@/lib/labels';

interface InterventionQueueProps {
  forcedStatusFilter?: Visit['status'] | 'scheduled' | 'all';
  onDataChanged?: () => Promise<void> | void;
  refreshToken?: number;
}

function getPriorityColor(priority: number) {
  if (priority >= 80) return 'bg-red-500 text-white';
  if (priority >= 50) return 'bg-amber-400 text-white';
  return 'bg-mobility-accent text-white';
}

function getPriorityValue(visit: Visit) {
  if (typeof visit.last_priority_score === 'number') return visit.last_priority_score;

  switch (visit.visit_type) {
    case 'correctivo_critico':
      return 95;
    case 'correctivo_no_critico':
      return 75;
    case 'diagnosi':
      return 60;
    case 'puesta_en_marcha':
      return 45;
    case 'preventivo':
    default:
      return 30;
  }
}

function formatVisitType(type: Visit['visit_type']) {
  return getVisitTypeLabelCa(type);
}

function formatStatus(status: Visit['status']) {
  return getStatusLabelCa(status);
}

function formatLocation(value: Visit) {
  if (value.address && value.address.trim()) {
    const parts = value.address
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    }
    return value.address;
  }

  return 'Barri i ciutat no disponibles';
}

function getVisitTypeBadge(type: Visit['visit_type']) {
  switch (type) {
    case 'correctivo_critico':
      return 'bg-red-200/75 text-red-950 font-mono border border-red-400 dark:bg-red-500/20 dark:text-red-100 dark:border-red-400/40';
    case 'correctivo_no_critico':
      return 'bg-amber-200/75 text-amber-950 font-mono border border-amber-400 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-400/40';
    case 'diagnosi':
      return 'bg-cyan-200/75 text-cyan-950 font-mono border border-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-100 dark:border-cyan-400/40';
    case 'puesta_en_marcha':
      return 'bg-violet-200/75 text-violet-950 font-mono border border-violet-400 dark:bg-violet-500/20 dark:text-violet-100 dark:border-violet-400/40';
    case 'preventivo':
      return 'bg-emerald-200/75 text-emerald-950 font-mono border border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-400/40';
    default:
      return 'bg-mobility-background text-mobility-primary font-mono border border-mobility-border';
  }
}

function getStatusBadge(status: Visit['status']) {
  if (String(status).toLowerCase() === 'scheduled') {
    return 'bg-indigo-200/75 text-indigo-950 font-mono border border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-100 dark:border-indigo-400/40';
  }
  switch (status) {
    case 'pending': return 'bg-amber-200/75 text-amber-950 font-mono border border-amber-400 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-400/40';
    case 'in_progress': return 'bg-cyan-200/75 text-cyan-950 font-mono border border-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-100 dark:border-cyan-400/40';
    case 'completed': return 'bg-emerald-200/75 text-emerald-950 font-mono border border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-400/40';
    case 'cancelled': return 'bg-red-200/75 text-red-950 font-mono border border-red-400 dark:bg-red-500/20 dark:text-red-100 dark:border-red-400/40';
    default: return 'bg-mobility-background text-mobility-primary font-mono border border-mobility-border';
  }
}

export default function InterventionQueue({ forcedStatusFilter = 'all', onDataChanged, refreshToken = 0 }: InterventionQueueProps) {
  const { visits, technicians, loadVisits, loadTechnicians } = useAppStore();

  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [techFilter, setTechFilter] = useState<number | 'all'>('all');
  const [assigningVisitId, setAssigningVisitId] = useState<number | null>(null);
  const [assignTechByVisit, setAssignTechByVisit] = useState<Record<number, number | 'auto'>>({});

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    setSelectedVisitId(null);
  }, [refreshToken]);

  const techs = useMemo(() => technicians.map((t) => t.id), [technicians]);

  const filteredVisits = useMemo(() => {
    return visits
      .filter((v) => {
        if (forcedStatusFilter !== 'all' && String(v.status).toLowerCase() !== forcedStatusFilter) return false;
        if (techFilter !== 'all' && v.technician_id !== techFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const pA = getPriorityValue(a);
        const pB = getPriorityValue(b);
        return pB - pA;
      });
  }, [visits, techFilter, forcedStatusFilter]);

  const handleAssignTech = async (visitId: number) => {
    try {
      setAssigningVisitId(visitId);
      const selectedTech = assignTechByVisit[visitId] ?? 'auto';
      const visit = visits.find((v) => v.id === visitId);
      if (!visit) {
        toast.error('No s\'ha trobat la visita');
        return;
      }

      // Manual reassignment path: direct update without planning proposal.
      if (selectedTech !== 'auto') {
        if (!techs.includes(selectedTech)) {
          toast.error('El tecnic seleccionat no existeix a la BD');
          return;
        }

        const targetDate = new Date(visit.planned_date).toISOString().slice(0, 10);
        const targetHour = new Date(visit.planned_date).toTimeString().slice(0, 5);

        try {
          // Primary path: dedicated single-visit assignment endpoint.
          await api.manualAssignVisit({
            visit_id: visitId,
            technician_id: selectedTech,
            target_date: targetDate,
            hora_inici: targetHour,
          });
        } catch (assignRouteError) {
          const msg = assignRouteError instanceof Error ? assignRouteError.message : '';
          const isNotFound = msg.toLowerCase().includes('not found') || msg.includes('404');

          if (!isNotFound) {
            throw assignRouteError;
          }

          try {
            // Compatibility with backend versions exposing /ruta/assignar.
            await api.assignRouteAdmin({
              technician_id: selectedTech,
              visit_ids_ordered: [visitId],
              target_date: targetDate,
              hora_inici: targetHour,
            });
          } catch {
            // Compatibility with backend versions that expose /visits/reassign.
            await api.reassignVisit({
              visit_id: visitId,
              technician_id: selectedTech,
            });
          }
        }

        if (onDataChanged) {
          await onDataChanged();
        } else {
          await loadVisits();
        }
        toast.success(`Visita #${visitId} reassignada a tecnic ${selectedTech}`);
        return;
      }

      const planning = await api.planningAssign({ visit_id: visitId });

      let candidate = planning.candidates[0];
      candidate = planning.candidates.find((c) => c.technician_id === planning.recommended.technician_id) ?? planning.candidates[0];

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
      const message = e instanceof Error ? e.message : 'No s\'ha pogut assignar la visita';

      const selectedTech = assignTechByVisit[visitId] ?? 'auto';
      const isNotFound = message.toLowerCase().includes('not found') || message.includes('404');
      if (selectedTech !== 'auto' && isNotFound && techs.includes(selectedTech)) {
        try {
          const visit = visits.find((v) => v.id === visitId);
          const proposedDate = visit
            ? new Date(visit.planned_date).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

          await api.planningConfirm({
            visit_id: visitId,
            technician_id: selectedTech,
            proposed_date: proposedDate,
            insertion_index: 0,
          });

          if (onDataChanged) {
            await onDataChanged();
          } else {
            await loadVisits();
          }
          toast.success(`Visita #${visitId} reassignada a tecnic ${selectedTech}`);
          return;
        } catch {
          // If fallback also fails, show original message below.
        }
      }

      toast.error(message);
    } finally {
      setAssigningVisitId(null);
    }
  };

  return (
    <div className="bg-mobility-surface shadow-sm rounded-xl border border-mobility-border h-[68vh] min-h-[420px] sm:h-[600px] flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="p-3 sm:p-4 border-b border-mobility-border bg-mobility-surface shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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
          <select
            value={String(techFilter)}
            onChange={(e) => {
              const value = e.target.value;
              setTechFilter(value === 'all' ? 'all' : Number(value));
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-mobility-border bg-mobility-background text-mobility-primary"
          >
            <option value="all">Tots els tecnics</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{`${t.name} (T${t.id})`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-auto overflow-x-auto scrollbar-thin rounded-b-xl">
        <table className="w-full min-w-[680px] text-left text-xs sm:text-sm whitespace-nowrap">
          <thead className="sticky top-0 bg-mobility-background border-b border-mobility-border shadow-sm z-10">
            <tr className="text-mobility-muted text-sm font-bold">
              <th className="px-4 py-3 text-center">Prioritat</th>
              <th className="px-4 py-3 text-center">Visita</th>
              <th className="px-4 py-3 text-center">Estat</th>
              <th className="px-4 py-3 text-center">Tècnic</th>
              <th className="px-4 py-3 text-center">Localització</th>
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
                      <td className="px-4 py-3 text-center">
                        <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${getPriorityColor(priority)}`}>
                          {Math.round(priority)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="font-bold text-mobility-primary mb-0.5">#{visit.id}</p>
                        <span className={`px-2 py-1 rounded-full text-[11px] uppercase font-bold tracking-wider ${getVisitTypeBadge(visit.visit_type)}`}>
                          {formatVisitType(visit.visit_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[11px] uppercase font-bold tracking-wider ${getStatusBadge(visit.status)}`}>
                          {formatStatus(visit.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {visit.technician_id ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-6 h-6 rounded bg-mobility-accent border border-mobility-accent/70 flex items-center justify-center text-[11px] text-white font-bold">
                              T{visit.technician_id}
                            </div>
                          </div>
                        ) : (
                          <span className="text-mobility-accent/80 text-xs flex items-center justify-center gap-1">
                            <AlertTriangle size={12} />
                            Sense assignar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-mobility-primary truncate max-w-[220px] mx-auto">{formatLocation(visit)}</p>
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
                                {technicians.map((t) => (
                                  <option key={t.id} value={t.id}>{`${t.name} (T${t.id})`}</option>
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
