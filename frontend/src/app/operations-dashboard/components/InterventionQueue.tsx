'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, MapPin, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type PlanningAssignResponse,
  type Visit,
} from '@/lib/api';
import { useAppStore } from '@/store/appStore';

function sortByPriority(visits: Visit[]) {
  const priority: Record<Visit['visit_type'], number> = {
    critical_corrective: 5,
    non_critical_corrective: 4,
    diagnosis: 3,
    commissioning: 2,
    maintenance: 1,
  };
  return [...visits].sort((a, b) => {
    const pa = priority[a.visit_type] ?? 0;
    const pb = priority[b.visit_type] ?? 0;
    if (pa !== pb) return pb - pa;
    return new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime();
  });
}

export default function InterventionQueue() {
  const { visits, isLoading, error, loadVisits } = useAppStore();
  const [selected, setSelected] = useState<Visit | null>(null);
  const [assignData, setAssignData] = useState<PlanningAssignResponse | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const sorted = useMemo(() => sortByPriority(visits), [visits]);

  const handleAssign = async (visit: Visit) => {
    setSelected(visit);
    setAssignLoading(true);
    try {
      const data = await api.planningAssign({ visit_id: visit.id });
      setAssignData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No s'ha pogut calcular candidats");
      setAssignData(null);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!assignData || !selected) return;
    const r = assignData.recommended;
    try {
      await api.planningConfirm({
        visit_id: selected.id,
        technician_id: r.technician_id,
        proposed_date: r.proposed_date,
        insertion_index: r.insertion_index,
      });
      toast.success(`Assignada a ${r.technician_name}`);
      setAssignData(null);
      setSelected(null);
      await loadVisits();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No s'ha pogut confirmar assignació");
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground text-base">Cua d&apos;intervencions</h2>
          <p className="text-muted-foreground text-xs">
            {sorted.length} visites ordenades per prioritat
          </p>
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={14} className="text-red-600 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="divide-y divide-border max-h-[560px] overflow-y-auto">
        {sorted.length === 0 && !isLoading && (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            No hi ha intervencions
          </div>
        )}

        {sorted.map((visit) => (
          <div key={visit.id} className="px-5 py-4 hover:bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-md">
                    #{visit.id}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {PRIORITY_LABELS[visit.visit_type]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABELS[visit.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm mt-1">
                  <MapPin size={12} className="text-muted-foreground" />
                  <span className="truncate">{visit.address ?? 'Adreça no disponible'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock size={11} />
                  {new Date(visit.planned_date).toLocaleString('ca-ES')}
                  <span>·</span>
                  <span>{visit.estimated_duration} min</span>
                </div>
              </div>

              <button
                onClick={() => handleAssign(visit)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20"
              >
                <UserCheck size={12} />
                Planificar
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="border-t border-border p-4 bg-muted/30">
          <p className="text-sm font-semibold text-foreground mb-2">
            Assignació per visita #{selected.id}
          </p>

          {assignLoading && <p className="text-xs text-muted-foreground">Calculant candidats...</p>}

          {!assignLoading && assignData && (
            <>
              <div className="space-y-2 mb-3">
                {assignData.candidates.map((c) => (
                  <div
                    key={`${c.technician_id}-${c.insertion_index}`}
                    className="p-2 bg-card border border-border rounded-md text-xs"
                  >
                    <span className="font-semibold">{c.technician_name}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {new Date(c.proposed_date).toLocaleString('ca-ES')} · pos{' '}
                      {c.insertion_index}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="px-3 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
                >
                  Confirmar recomanació
                </button>
                <button
                  onClick={() => {
                    setSelected(null);
                    setAssignData(null);
                  }}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted"
                >
                  Tancar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
