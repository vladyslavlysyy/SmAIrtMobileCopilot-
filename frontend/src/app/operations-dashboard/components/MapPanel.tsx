'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Layers, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api, type RouteResponse, type Visit } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

function getPriorityMarker(type: Visit['visit_type']) {
  switch (type) {
    case 'correctivo_critico': return 'red-pushpin';
    case 'correctivo_no_critico': return 'orange-pushpin';
    case 'diagnosi': return 'yellow-pushpin';
    case 'puesta_en_marcha': return 'blue-pushpin';
    case 'preventivo': return 'lightblue1';
    default: return 'lightblue1';
  }
}

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

  const geoVisits = useMemo(
    () =>
      visits.filter(
        (v): v is Visit & { latitude: number; longitude: number } =>
          typeof v.latitude === 'number' && typeof v.longitude === 'number'
      ),
    [visits]
  );

  const mapCenter = useMemo(() => {
    if (route?.coordenadas_ruta?.length) {
      return route.coordenadas_ruta[0];
    }
    if (geoVisits.length > 0) {
      const total = geoVisits.reduce(
        (acc, v) => ({ latitude: acc.latitude + v.latitude, longitude: acc.longitude + v.longitude }),
        { latitude: 0, longitude: 0 }
      );
      return {
        latitude: total.latitude / geoVisits.length,
        longitude: total.longitude / geoVisits.length,
      };
    }
    return { latitude: 41.1189, longitude: 1.2445 };
  }, [geoVisits, route]);

  const staticMapUrl = useMemo(() => {
    const base = new URL('https://staticmap.openstreetmap.de/staticmap.php');
    base.searchParams.set('center', `${mapCenter.latitude},${mapCenter.longitude}`);
    base.searchParams.set('zoom', '12');
    base.searchParams.set('size', '1200x700');
    base.searchParams.set('maptype', 'mapnik');

    if (geoVisits.length > 0) {
      const markers = geoVisits
        .slice(0, 30)
        .map((v) => `${v.latitude},${v.longitude},${getPriorityMarker(v.visit_type)}`)
        .join('|');
      base.searchParams.set('markers', markers);
    }

    if (route?.coordenadas_ruta?.length && route.coordenadas_ruta.length > 1) {
      const points = route.coordenadas_ruta
        .slice(0, 80)
        .map((c) => `${c.latitude},${c.longitude}`)
        .join('|');
      base.searchParams.set('path', `color:0x00A2DB|weight:4|${points}`);
    }

    return base.toString();
  }, [geoVisits, mapCenter, route]);

  const handleComputeRoute = async () => {
    if (!firstTech) {
      toast.error('No hi ha tecnic amb visites');
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
    <div className="relative bg-[#0d1520] rounded-xl border border-mobility-border h-[600px] overflow-hidden">
      <img
        src={staticMapUrl}
        alt="Mapa operatiu"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(13,21,32,0.22) 0%, rgba(13,21,32,0.34) 100%)' }}
      />

      <div className="absolute top-4 right-4 w-80 bg-mobility-surface shadow-sm/90 backdrop-blur-md rounded-xl border border-mobility-border/50 shadow-2xl z-10 flex flex-col max-h-[calc(100%-32px)]">
        <div className="px-4 py-3 border-b border-mobility-border/50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-mobility-primary text-sm">Ruta Operativa</h3>
            <p className="text-mobility-muted text-xs">Visites visibles: {visits.length}</p>
          </div>
          <button
            onClick={handleComputeRoute}
            disabled={loadingRoute}
            className="p-2 text-mobility-primary bg-mobility-primary rounded-lg hover:bg-mobility-accent text-white transition-colors border border-mobility-border disabled:opacity-50"
            title="Recalcular ruta"
          >
            <RefreshCw size={14} className={loadingRoute ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto scrollbar-thin">
          <div className="flex items-center gap-2 text-xs text-mobility-primary mb-4 bg-mobility-primary/50 p-2 rounded-lg border border-mobility-border">
            <Layers size={14} className="text-mobility-accent" />
            <span>Tecnics actius: <strong className="text-mobility-accent">{groupedByTech.size}</strong></span>
          </div>

          {route ? (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg border border-mobility-border bg-mobility-primary">
                  <p className="text-mobility-muted mb-1">Distància</p>
                  <p className="font-bold text-lg text-mobility-primary tabular-nums font-mono">{route.distancia_total_km.toFixed(1)} <span className="text-xs">km</span></p>
                </div>
                <div className="p-3 rounded-lg border border-mobility-border bg-mobility-primary">
                  <p className="text-mobility-muted mb-1">Temps</p>
                  <p className="font-bold text-lg text-mobility-primary tabular-nums font-mono">{route.tiempo_total_min.toFixed(0)} <span className="text-xs">min</span></p>
                </div>
              </div>

              <div className="border border-mobility-border bg-mobility-primary/50 rounded-lg p-2 max-h-32 overflow-y-auto scrollbar-thin divide-y divide-mobility-border/60">
                {route.segmentos.map((s, idx) => (
                  <div
                    key={`${s.desde}-${s.hasta}-${idx}`}
                    className="py-2 text-xs flex items-center justify-between"
                  >
                    <span className="text-mobility-primary/90">
                      {s.desde} <span className="text-mobility-muted mx-1">{'->'}</span> {s.hasta}
                    </span>
                    <span className="text-mobility-muted whitespace-nowrap ml-2">
                      {s.distancia_km.toFixed(1)}km
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-mobility-primary p-4 text-center bg-mobility-primary border border-mobility-border border-dashed rounded-lg mb-4">
              Prem <strong className="text-mobility-accent">recalcular</strong> per generar la ruta
            </div>
          )}

          <a
            href={`https://www.openstreetmap.org/?mlat=${mapCenter.latitude}&mlon=${mapCenter.longitude}#map=12/${mapCenter.latitude}/${mapCenter.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mb-3 flex items-center justify-center gap-1.5 text-xs bg-mobility-background border border-mobility-border rounded-lg px-3 py-2 text-mobility-primary hover:border-mobility-accent/50"
          >
            Obrir mapa gran
            <ExternalLink size={12} />
          </a>

          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-mobility-muted mb-2">Punts</p> 
            <div className="divide-y divide-mobility-border/60 border border-mobility-border bg-mobility-primary/30 rounded-lg">
              {visits.slice(0, 5).map((v) => (
                <div key={v.id} className="px-3 py-2 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    v.visit_type.includes('critico') ? 'bg-red-500' : 
                    v.visit_type.includes('diagnosi') ? 'bg-amber-500' : 'bg-mobility-accent'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-mobility-primary truncate">#{v.id} {'->'} {v.address ?? 'Sense adreça'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
