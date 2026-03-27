'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Layers, Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { toast } from 'sonner';
import { api, type RouteResponse, type Visit } from '@/lib/api';
import { getStatusLabelCa, getVisitTypeLabelCa } from '@/lib/labels';
import { useAppStore } from '@/store/appStore';

interface MapPanelProps {
  dashboardFullHeight?: boolean;
}

type Bounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

type FocusTarget = {
  lat: number;
  lon: number;
  zoom: number;
  token: number;
};

function getPriorityColor(type: Visit['visit_type']) {
  switch (type) {
    case 'correctivo_critico': return 'critical';
    case 'correctivo_no_critico': return 'urgent';
    case 'diagnosi': return 'diagnosis';
    case 'puesta_en_marcha': return 'startup';
    case 'preventivo': return 'preventive';
    default: return 'default';
  }
}

function buildMarkerIcon(type: Visit['visit_type']) {
  const colorClass = getPriorityColor(type);
  return L.divIcon({
    className: 'map-pin-wrapper',
    html: `<div class="map-pin ${colorClass}"></div>`,
    iconSize: [20, 28],
    iconAnchor: [10, 28],
    tooltipAnchor: [0, -22],
  });
}

function MapViewportController({
  fitBounds,
  autoFitToken,
  focusTarget,
}: {
  fitBounds: Bounds | null;
  autoFitToken: number;
  focusTarget: FocusTarget | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!fitBounds) return;
    map.fitBounds(
      [
        [fitBounds.minLat, fitBounds.minLon],
        [fitBounds.maxLat, fitBounds.maxLon],
      ],
      { padding: [40, 40], maxZoom: 14 }
    );
  }, [autoFitToken, fitBounds, map]);

  useEffect(() => {
    if (!focusTarget) return;
    map.flyTo([focusTarget.lat, focusTarget.lon], focusTarget.zoom, { duration: 0.8 });
  }, [focusTarget, map]);

  return null;
}

export default function MapPanel({ dashboardFullHeight = false }: MapPanelProps) {
  const { visits, technicians, loadVisits, loadTechnicians } = useAppStore();
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<number | 'all'>('all');
  const [fitScope, setFitScope] = useState<'combined' | 'points' | 'route' | 'tech-day'>('combined');
  const [fitDate, setFitDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [autoFitToken, setAutoFitToken] = useState(0);

  useEffect(() => {
    if (visits.length === 0) {
      loadVisits();
    }
  }, [visits.length, loadVisits]);

  useEffect(() => {
    if (technicians.length === 0) {
      loadTechnicians();
    }
  }, [technicians.length, loadTechnicians]);

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

  const techOptions = useMemo(() => Array.from(groupedByTech.keys()), [groupedByTech]);

  useEffect(() => {
    if (selectedTech === 'all') return;
    if (!techOptions.includes(selectedTech)) {
      setSelectedTech('all');
    }
  }, [selectedTech, techOptions]);

  const scopedVisits = useMemo(() => {
    if (selectedTech === 'all') return visits;
    return visits.filter((v) => v.technician_id === selectedTech);
  }, [selectedTech, visits]);

  const geoVisits = useMemo(
    () =>
      scopedVisits.filter(
        (v): v is Visit & { latitude: number; longitude: number } =>
          typeof v.latitude === 'number' && typeof v.longitude === 'number'
      ),
    [scopedVisits]
  );

  const geoVisitsForFitDay = useMemo(
    () =>
      scopedVisits
        .filter((v) => v.planned_date?.slice(0, 10) === fitDate)
        .filter(
          (v): v is Visit & { latitude: number; longitude: number } =>
            typeof v.latitude === 'number' && typeof v.longitude === 'number'
        ),
    [fitDate, scopedVisits]
  );

  const routeCoords = useMemo(() => route?.coordenadas_ruta ?? [], [route]);

  const visibleGeoVisits = useMemo(() => {
    if (fitScope === 'route') return [];
    if (fitScope === 'tech-day') return geoVisitsForFitDay;
    return geoVisits;
  }, [fitScope, geoVisits, geoVisitsForFitDay]);

  const showRouteData = fitScope !== 'points';
  const showPointData = fitScope !== 'route';

  const bounds = useMemo<Bounds | null>(() => {
    const points: Array<{ latitude: number; longitude: number }> = [];
    if (fitScope === 'combined') {
      points.push(...visibleGeoVisits);
      points.push(...routeCoords);
    } else if (fitScope === 'points') {
      points.push(...visibleGeoVisits);
    } else if (fitScope === 'route') {
      points.push(...routeCoords);
    } else {
      points.push(...visibleGeoVisits);
    }

    if (points.length === 0) return null;

    return {
      minLat: Math.min(...points.map((p) => p.latitude)),
      maxLat: Math.max(...points.map((p) => p.latitude)),
      minLon: Math.min(...points.map((p) => p.longitude)),
      maxLon: Math.max(...points.map((p) => p.longitude)),
    };
  }, [fitScope, routeCoords, visibleGeoVisits]);

  const mapZoom = useMemo(() => {
    if (!bounds) return 12;
    const latSpan = Math.max(0.0001, bounds.maxLat - bounds.minLat);
    const lonSpan = Math.max(0.0001, bounds.maxLon - bounds.minLon);
    const maxSpan = Math.max(latSpan, lonSpan);

    if (maxSpan < 0.01) return 14;
    if (maxSpan < 0.03) return 13;
    if (maxSpan < 0.08) return 12;
    if (maxSpan < 0.2) return 11;
    if (maxSpan < 0.5) return 10;
    return 9;
  }, [bounds]);

  const mapCenter = useMemo(() => {
    if (bounds) {
      return {
        latitude: (bounds.minLat + bounds.maxLat) / 2,
        longitude: (bounds.minLon + bounds.maxLon) / 2,
      };
    }
    return { latitude: 41.1189, longitude: 1.2445 };
  }, [bounds]);

  useEffect(() => {
    setAutoFitToken((v) => v + 1);
  }, [selectedTech, fitScope, fitDate, route?.coordenadas_ruta?.length, scopedVisits.length]);

  const technicianNameById = useMemo(() => {
    const map = new Map<number, string>();
    technicians.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [technicians]);

  const formatTechLabel = (id: number) => {
    const name = technicianNameById.get(id);
    return name ? `${name} (T${id})` : `Tècnic ${id}`;
  };

  const handleComputeRoute = async (silent = false) => {
    const activeTech = selectedTech === 'all' ? firstTech : selectedTech;
    if (!activeTech) {
      setRoute(null);
      return;
    }

    const ids = groupedByTech.get(activeTech) ?? [];
    if (ids.length === 0) {
      setRoute(null);
      return;
    }

    setLoadingRoute(true);
    try {
      const data = await api.calculateRoute({
        technician_id: activeTech,
        visit_ids_ordered: ids,
        origen: { latitude: 41.1189, longitude: 1.2445 },
      });
      setRoute(data);
      if (!silent) {
        toast.success('Ruta recalculada');
      }
    } catch (e) {
      setRoute(null);
      if (!silent) {
        toast.error(e instanceof Error ? e.message : 'Error calculant ruta');
      }
    } finally {
      setLoadingRoute(false);
    }
  };

  useEffect(() => {
    if (!showRouteData) {
      setRoute(null);
      setLoadingRoute(false);
      return;
    }

    void handleComputeRoute(true);
  }, [showRouteData, selectedTech, fitScope, fitDate, visits.length]);

  const formatPointLabel = (visit: Visit) => {
    if (visit.address && visit.address.trim()) return visit.address;
    if (visit.postal_code && visit.postal_code.trim()) return `CP ${visit.postal_code}`;
    if (typeof visit.latitude === 'number' && typeof visit.longitude === 'number') {
      return `${visit.latitude.toFixed(4)}, ${visit.longitude.toFixed(4)}`;
    }
    return 'Sense adreça';
  };

  const renderEmptyMap = () => {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800">
        <div className="absolute left-4 bottom-4 text-xs text-white/90 bg-black/30 rounded-lg px-3 py-2 border border-white/15">
          Sense dades geogràfiques per mostrar el mapa
        </div>
      </div>
    );
  };

  const handleFocusVisit = (visit: Visit) => {
    if (typeof visit.latitude !== 'number' || typeof visit.longitude !== 'number') {
      toast.error('Aquesta visita no té coordenades per centrar el mapa');
      return;
    }

    const nextToken = focusToken + 1;
    setFocusToken(nextToken);
    setFocusTarget({
      lat: visit.latitude,
      lon: visit.longitude,
      zoom: Math.max(mapZoom + 1, 14),
      token: nextToken,
    });
  };

  const handleFocusSegment = (segment: RouteResponse['segmentos'][number], index: number) => {
    const destinationVisit = scopedVisits.find((v) => v.id === segment.hasta) ?? visits.find((v) => v.id === segment.hasta);
    if (destinationVisit && typeof destinationVisit.latitude === 'number' && typeof destinationVisit.longitude === 'number') {
      handleFocusVisit(destinationVisit);
      return;
    }

    const destinationCoord = routeCoords[index + 1] ?? routeCoords[routeCoords.length - 1];
    if (!destinationCoord) {
      toast.error('No hi ha coordenades de destí per aquest segment');
      return;
    }

    const nextToken = focusToken + 1;
    setFocusToken(nextToken);
    setFocusTarget({
      lat: destinationCoord.latitude,
      lon: destinationCoord.longitude,
      zoom: Math.max(mapZoom + 1, 14),
      token: nextToken,
    });
  };

  const renderInteractiveMap = () => {
    if (!bounds || (visibleGeoVisits.length === 0 && (!showRouteData || routeCoords.length < 2))) {
      return renderEmptyMap();
    }

    return (
      <MapContainer
        center={[mapCenter.latitude, mapCenter.longitude]}
        zoom={mapZoom}
        className="absolute inset-0 h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showRouteData && route?.coordenadas_ruta && route.coordenadas_ruta.length > 1 && (
          <Polyline
            positions={route.coordenadas_ruta.map((c) => [c.latitude, c.longitude] as [number, number])}
            pathOptions={{ color: '#00A2DB', weight: 4 }}
          />
        )}

        {showPointData && visibleGeoVisits.map((visit) => (
          <Marker
            key={visit.id}
            position={[visit.latitude, visit.longitude]}
            icon={buildMarkerIcon(visit.visit_type)}
          >
            <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
              #{visit.id} · {formatPointLabel(visit)}
            </Tooltip>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold mb-1">Visita #{visit.id}</p>
                <p>Tipus: {getVisitTypeLabelCa(visit.visit_type)}</p>
                <p>Estat: {getStatusLabelCa(visit.status)}</p>
                <p>Localització: {formatPointLabel(visit)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapViewportController
          fitBounds={bounds}
          autoFitToken={autoFitToken}
          focusTarget={focusTarget}
        />
      </MapContainer>
    );
  };

  const panelPointVisits = useMemo(() => {
    if (!showPointData) return [];
    if (fitScope === 'tech-day') {
      return scopedVisits.filter((v) => v.planned_date?.slice(0, 10) === fitDate);
    }
    return scopedVisits;
  }, [showPointData, fitScope, fitDate, scopedVisits]);

  const handleCenterMap = () => {
    // Re-apply fitBounds using current visual scope priority.
    setAutoFitToken((v) => v + 1);
  };

  const renderInfoPanel = (compact: boolean, topOffsetClass: string) => (
    <div
      className={`absolute right-2 ${topOffsetClass} bg-mobility-surface shadow-sm/90 backdrop-blur-md rounded-xl border border-mobility-border/50 shadow-2xl z-[1200] flex flex-col max-h-[calc(100%-32px)] ${
        compact ? 'w-80' : 'w-[380px]'
      }`}
    >
      <div className="px-4 py-3 border-b border-mobility-border/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-mobility-primary text-sm">Ruta Operativa</h3>
          <p className="text-mobility-muted text-xs">Visites visibles: {visits.length}</p>
        </div>
        {loadingRoute && (
          <span className="text-[11px] text-cyan-300 font-medium">Calculant...</span>
        )}
      </div>

      <div className="p-4 overflow-y-auto scrollbar-thin">
          <div className="mb-4">
            <label className="text-[11px] uppercase tracking-wide text-mobility-muted">Tècnic</label>
            <select
              value={String(selectedTech)}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedTech(value === 'all' ? 'all' : Number(value));
              }}
              className="mt-1 w-full rounded-lg border border-mobility-border bg-mobility-background px-2.5 py-2 text-xs text-mobility-primary"
            >
              <option value="all">Tots els tècnics</option>
              {techOptions.map((id) => (
                <option key={id} value={id}>{formatTechLabel(id)}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2">
            <label className="text-[11px] uppercase tracking-wide text-mobility-muted">Configuració visual</label>

            <select
              value={fitScope}
              onChange={(e) => setFitScope(e.target.value as 'combined' | 'points' | 'route' | 'tech-day')}
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-2.5 py-2 text-xs text-mobility-primary"
            >
              <option value="combined">Ajuste bounds: tècnic + ruta</option>
              <option value="points">Ajuste bounds: punts del tècnic</option>
              <option value="route">Ajuste bounds: només ruta</option>
              <option value="tech-day">Ajuste bounds: tècnic + dia</option>
            </select>

            {fitScope === 'tech-day' && (
              <input
                type="date"
                value={fitDate}
                onChange={(e) => setFitDate(e.target.value)}
                className="w-full rounded-lg border border-mobility-border bg-mobility-background px-2.5 py-2 text-xs text-mobility-primary"
              />
            )}
          </div>

        <div className="flex items-center gap-2 text-xs text-mobility-primary mb-4 bg-mobility-primary/50 p-2 rounded-lg border border-mobility-border">
          <Layers size={14} className="text-mobility-accent" />
          <span>Tècnics actius: <strong className="text-mobility-accent">{groupedByTech.size}</strong></span>
        </div>

        {showRouteData ? (
          route ? (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg border border-mobility-border bg-mobility-primary">
                  <p className="text-white mb-1">Distància</p>
                  <p className="font-bold text-lg text-white tabular-nums font-mono">{route.distancia_total_km.toFixed(1)} <span className="text-xs text-white">km</span></p>
                </div>
                <div className="p-3 rounded-lg border border-mobility-border bg-mobility-primary">
                  <p className="text-white mb-1">Temps</p>
                  <p className="font-bold text-lg text-white tabular-nums font-mono">{route.tiempo_total_min.toFixed(0)} <span className="text-xs text-white">min</span></p>
                </div>
              </div>

              <button
                onClick={handleCenterMap}
                className="w-full px-3 py-2 rounded-lg bg-cyan-500/95 border border-cyan-300 text-slate-950 text-xs font-semibold hover:bg-cyan-400"
              >
                <span className="inline-flex items-center gap-1.5"><Crosshair size={12} /> Centrar mapa</span>
              </button>

            </div>
          ) : (
            loadingRoute ? null : <div className="text-xs text-mobility-primary p-4 text-center bg-mobility-primary border border-mobility-border border-dashed rounded-lg mb-4">Ruta no disponible per la configuració actual</div>
          )
        ) : null}

        {showPointData && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-mobility-muted mb-2">Punts</p>
            <div className="divide-y divide-mobility-border/60 border border-mobility-border bg-mobility-primary/30 rounded-lg">
              {panelPointVisits.slice(0, compact ? 5 : 9).map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleFocusVisit(v)}
                  className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-mobility-background/70 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    v.visit_type.includes('critico') ? 'bg-red-500' :
                    v.visit_type.includes('diagnosi') ? 'bg-amber-500' : 'bg-mobility-accent'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-mobility-primary truncate">#{v.id} {'->'} {formatPointLabel(v)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`relative bg-[#0d1520] rounded-xl border border-mobility-border overflow-hidden ${
          dashboardFullHeight
            ? 'h-[54vh] min-h-[320px] sm:h-[62vh] sm:min-h-[420px] md:h-[70vh] lg:h-[78vh] xl:h-[82vh] 2xl:h-[86vh]'
            : 'h-[600px]'
        }`}
      >
        {renderInteractiveMap()}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(13,21,32,0.22) 0%, rgba(13,21,32,0.34) 100%)' }}
        />

        {!fullscreen && (
          <>
            <div className="absolute left-[3rem] z-[1200] flex items-center gap-2" style={{ top: '0.875rem' }}>
              <button
                onClick={() => setFullscreen(true)}
                className="px-3 py-2 rounded-lg bg-mobility-surface/90 border border-mobility-border text-xs text-mobility-primary hover:bg-mobility-surface"
              >
                <span className="inline-flex items-center gap-1.5"><Maximize2 size={12} /> Pantalla completa</span>
              </button>
            </div>

            {renderInfoPanel(true, 'top-2')}
          </>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed left-0 z-[4000] w-screen bg-mobility-primary"
          style={{
            top: 'calc(-1.25rem - env(safe-area-inset-top))',
            height: 'calc(100dvh + 1.25rem + env(safe-area-inset-top))',
          }}
        >
          {renderInteractiveMap()}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(13,21,32,0.18) 0%, rgba(13,21,32,0.3) 100%)' }}
          />

          <div
            className="fixed left-[3rem] z-[4200] flex items-center gap-2"
            style={{ top: 'calc(0.875rem + env(safe-area-inset-top))' }}
          >
            <button
              onClick={() => setFullscreen(false)}
              className="px-3 py-2 rounded-lg bg-mobility-surface/90 border border-mobility-border text-xs text-mobility-primary hover:bg-mobility-surface"
            >
              <span className="inline-flex items-center gap-1.5"><Minimize2 size={12} /> Tancar</span>
            </button>
          </div>

          {renderInfoPanel(false, 'top-2')}
        </div>
      )}

      <style jsx global>{`
        .map-pin-wrapper {
          background: transparent;
          border: 0;
        }

        .map-pin {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.35);
          transform: translateY(-3px);
        }

        .map-pin.critical { background: #ef4444; }
        .map-pin.urgent { background: #f97316; }
        .map-pin.diagnosis { background: #f59e0b; }
        .map-pin.startup { background: #0ea5e9; }
        .map-pin.preventive { background: #10b981; }
        .map-pin.default { background: #94a3b8; }
      `}</style>
    </>
  );
}
