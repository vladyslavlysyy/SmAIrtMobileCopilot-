'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Navigation,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, PRIORITY_LABELS, type RouteResponse, type Visit } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

function getVisitBadgeClass(visitType: Visit['visit_type']) {
  if (visitType === 'correctivo_critico') return 'badge-correctiu-critic';
  if (visitType === 'correctivo_no_critico') return 'badge-correctiu-no-critic';
  if (visitType === 'diagnosi') return 'badge-diagnosi';
  if (visitType === 'puesta_en_marcha') return 'badge-posada-marxa';
  return 'badge-preventiu';
}

function toUiStatus(status: Visit['status']): 'pendent' | 'en-curs' | 'completat' {
  if (status === 'completed') return 'completat';
  if (status === 'in_progress') return 'en-curs';
  return 'pendent';
}

export default function RouteTimeline() {
  const { currentUser, selectedTechnicianId, visits, isLoading, error, loadVisits } = useAppStore();

  const [expandedVisitId, setExpandedVisitId] = useState<number | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, 'pendent' | 'en-curs' | 'completat'>>(
    {}
  );
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);

  const technicianId = selectedTechnicianId ?? currentUser?.selectedTechnicianId;

  useEffect(() => {
    if (!technicianId) return;
    loadVisits(undefined, technicianId);
  }, [technicianId, loadVisits]);

  useEffect(() => {
    const next: Record<number, 'pendent' | 'en-curs' | 'completat'> = {};
    visits.forEach((v) => {
      next[v.id] = toUiStatus(v.status);
    });
    setStatusMap(next);
  }, [visits]);

  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const aOrder = a.route_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.route_order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime();
    });
  }, [visits]);

  const completedCount = Object.values(statusMap).filter((s) => s === 'completat').length;

  const handleStart = (id: number) => {
    setStatusMap((prev) => ({ ...prev, [id]: 'en-curs' }));
    toast.success('Visita iniciada');
  };

  const handleComplete = async (visit: Visit) => {
    try {
      await api.submitReport({
        visit_id: visit.id,
        report_type: 'correctivo',
        content_json: JSON.stringify({ note: 'Completed from technician timeline' }),
      });
      setStatusMap((prev) => ({ ...prev, [visit.id]: 'completat' }));
      toast.success('Informe enviat');
    } catch (e) {
      const message = e instanceof Error ? e.message : "No s'ha pogut enviar l'informe";
      toast.error(message);
    }
  };

  const handleNavigate = async () => {
    if (!technicianId) {
      toast.error('Selecciona un tècnic');
      return;
    }

    const pendingIds = sortedVisits.filter((v) => statusMap[v.id] !== 'completat').map((v) => v.id);

    if (pendingIds.length === 0) {
      toast.info('No hi ha visites pendents');
      return;
    }

    try {
      const route = await api.calculateRoute({
        technician_id: technicianId,
        visit_ids_ordered: pendingIds,
        origen: { latitude: 41.1189, longitude: 1.2445 },
      });
      setRouteData(route);
      toast.success(`Ruta calculada (${route.distancia_total_km.toFixed(1)} km)`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "No s'ha pogut calcular la ruta";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-muted rounded-lg" />
          <div className="h-16 bg-muted rounded-lg" />
          <div className="h-16 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-red-500 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Error al carregar visites</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground text-base">Ruta del dia</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            {sortedVisits.length} visites · {completedCount}/{sortedVisits.length} completades ·{' '}
            {routeData ? `${routeData.distancia_total_km.toFixed(1)} km` : 'sense ruta'}
          </p>
        </div>
        <button
          onClick={handleNavigate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          <Navigation size={14} />
          Calcular ruta
        </button>
      </div>

      <div className="divide-y divide-border max-h-[620px] overflow-y-auto scrollbar-thin">
        {sortedVisits.length === 0 && (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            No hi ha visites planificades
          </div>
        )}

        {sortedVisits.map((visit, index) => {
          const expanded = expandedVisitId === visit.id;
          const uiStatus = statusMap[visit.id] ?? 'pendent';

          return (
            <div key={visit.id} className={uiStatus === 'en-curs' ? 'bg-blue-50/40' : ''}>
              <div
                onClick={() => setExpandedVisitId(expanded ? null : visit.id)}
                className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-muted/30"
              >
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1">
                  {uiStatus === 'completat' ? (
                    <CheckCircle2 size={16} className="text-green-600" />
                  ) : uiStatus === 'en-curs' ? (
                    <PlayCircle size={16} className="text-blue-600" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getVisitBadgeClass(visit.visit_type)}`}
                      >
                        {PRIORITY_LABELS[visit.visit_type]}
                      </span>
                      <span className="text-xs text-muted-foreground">#{visit.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      {new Date(visit.planned_date).toLocaleTimeString('ca-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <MapPin size={12} className="text-muted-foreground" />
                    <span className="truncate">{visit.address ?? 'Adreça no disponible'}</span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    Durada estimada: {visit.estimated_duration} min · Codi postal:{' '}
                    {visit.postal_code ?? 'N/D'}
                  </p>
                </div>
              </div>

              {expanded && (
                <div className="px-5 pb-5 ml-12">
                  <div className="bg-muted/40 rounded-xl p-4 border border-border">
                    <div className="flex gap-2 flex-wrap">
                      {uiStatus === 'pendent' && (
                        <button
                          onClick={() => handleStart(visit.id)}
                          className="px-3 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
                        >
                          Iniciar visita
                        </button>
                      )}
                      {uiStatus === 'en-curs' && (
                        <button
                          onClick={() => handleComplete(visit)}
                          className="px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          Finalitzar i enviar informe
                        </button>
                      )}
                      {uiStatus === 'completat' && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 border border-green-200 px-2.5 py-1 rounded-md">
                          Completada
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
