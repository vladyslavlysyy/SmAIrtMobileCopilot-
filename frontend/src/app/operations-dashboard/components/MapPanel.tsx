'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api, type RouteResponse } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function MapPanel() {
  const { visits, loadVisits } = useAppStore();
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (visits.length === 0) {
      loadVisits();
    }
  }, [visits.length, loadVisits]);

  const groupedByTech = useMemo(() => {
    const m = new Map<number, number[]>();
    visits.forEach((v) => {
      if (v.technician_id === null) return;
      const list = m.get(v.technician_id) ?? [];
      list.push(v.id);
      m.set(v.technician_id, list);
    });
    return m;
  }, [visits]);

  const firstTech = useMemo(() => {
    const key = groupedByTech.keys().next();
    return key.done ? null : key.value;
  }, [groupedByTech]);

  const handleComputeRoute = async () => {
    if (!firstTech) {
      toast.error('No hi ha tècnic amb visites');
      return;
    }

    const ids = groupedByTech.get(firstTech) ?? [];
    if (ids.length === 0) {
      toast.error('No hi ha visites per calcular ruta');
      return;
    }

    setLoadingRoute(true);
    try {
      const data = await api.calculateRoute({
        technician_id: firstTech,
        visit_ids_ordered: ids,
        origen: { latitude: 41.1189, longitude: 1.2445 },
      });
      setRoute(data);
      toast.success('Ruta recalculada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error calculant ruta');
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Mapa / Ruta operativa</h3>
          <p className="text-muted-foreground text-xs">Visites carregades: {visits.length}</p>
        </div>
        <button
          onClick={handleComputeRoute}
          disabled={loadingRoute}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg disabled:opacity-50"
          title="Recalcular ruta"
        >
          <RefreshCw size={14} className={loadingRoute ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Layers size={13} />
          <span>Tècnics amb ruta: {groupedByTech.size}</span>
        </div>

        {route ? (
          <div className="space-y-2">
            <div className="text-xs p-2 rounded-lg bg-muted border border-border">
              <p>
                Distància total:{' '}
                <span className="font-semibold">{route.distancia_total_km.toFixed(1)} km</span>
              </p>
              <p>
                Temps total:{' '}
                <span className="font-semibold">{route.tiempo_total_min.toFixed(0)} min</span>
              </p>
              <p>
                Punts de ruta:{' '}
                <span className="font-semibold">{route.coordenadas_ruta.length}</span>
              </p>
            </div>
            <div className="max-h-32 overflow-auto border border-border rounded-lg divide-y divide-border">
              {route.segmentos.map((s, idx) => (
                <div
                  key={`${s.desde}-${s.hasta}-${idx}`}
                  className="px-2 py-1.5 text-xs flex items-center justify-between"
                >
                  <span>
                    {s.desde} → {s.hasta}
                  </span>
                  <span className="text-muted-foreground">
                    {s.distancia_km.toFixed(1)} km · {s.tiempo_min.toFixed(0)} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded-lg border border-border">
            Prem &quot;recalcular&quot; per obtenir coordenades i segments des de l&apos;API.
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-foreground mb-2">Visites</p>
          <div className="max-h-28 overflow-auto divide-y divide-border border border-border rounded-lg">
            {visits.slice(0, 8).map((v) => (
              <div key={v.id} className="px-2 py-1.5 text-xs flex items-center justify-between">
                <span>
                  #{v.id} · T{v.technician_id ?? 'N/A'}
                </span>
                <span className="text-muted-foreground truncate ml-2">
                  {v.address ?? 'Sense adreça'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
