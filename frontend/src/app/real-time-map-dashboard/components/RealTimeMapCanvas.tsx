'use client';

import React, { useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import type { TechnicianTrack, SimulatedPosition } from '@/lib/realtime-tech-simulator';
import type { Charger } from '@/lib/api';

interface RealTimeMapCanvasProps {
  tracks: TechnicianTrack[];
  positions: SimulatedPosition[];
  loading: boolean;
  chargers: Charger[];
}

function getTechColor(id: number): string {
  const hue = ((id * 137.508) % 360 + 360) % 360;
  return `hsl(${hue.toFixed(1)} 80% 48%)`;
}

function techIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px);">
        <svg width="26" height="30" viewBox="0 0 26 30" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,0.35));">
          <circle cx="13" cy="5" r="4" fill="${color}" />
          <rect x="10" y="9" width="6" height="10" rx="3" fill="${color}" />
          <rect x="6" y="10" width="4" height="9" rx="2" fill="${color}" />
          <rect x="16" y="10" width="4" height="9" rx="2" fill="${color}" />
          <rect x="9" y="18" width="4" height="10" rx="2" fill="${color}" />
          <rect x="13" y="18" width="4" height="10" rx="2" fill="${color}" />
        </svg>
        <div style="margin-top:2px;padding:1px 6px;border-radius:999px;background:${color};color:#fff;font-size:10px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,0.2);">${label}</div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 34],
  });
}

function chargerIcon(isImported: boolean) {
  const bg = isImported ? '#f59e0b' : '#0ea5e9';
  return L.divIcon({
    className: '',
    html: `
      <div style="width:18px;height:18px;border-radius:999px;background:${bg};border:1px solid #0f172a;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:12px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,0.25);">⚡</div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function RealTimeMapCanvas({ tracks, positions, loading, chargers }: RealTimeMapCanvasProps) {
  const center = useMemo<[number, number]>(() => {
    if (positions.length > 0) {
      return [positions[0].latitude, positions[0].longitude];
    }
    const firstTrackPoint = tracks[0]?.path[0];
    if (firstTrackPoint) return [firstTrackPoint.latitude, firstTrackPoint.longitude];
    return [41.1189, 1.2445];
  }, [positions, tracks]);

  return (
    <div className="relative h-[82vh] min-h-[680px] rounded-xl overflow-hidden border border-mobility-border">
      <MapContainer center={center} zoom={11} className="absolute inset-0 h-full w-full" zoomControl>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {tracks.map((track) => (
          <Polyline
            key={`line-${track.technicianId}`}
            positions={track.path.map((p) => [p.latitude, p.longitude] as [number, number])}
            pathOptions={{ color: getTechColor(track.technicianId), weight: 3, opacity: 0.5 }}
          />
        ))}

        {chargers
          .filter(
            (c): c is Charger & { latitude: number; longitude: number } =>
              typeof c.latitude === 'number' && typeof c.longitude === 'number'
          )
          .map((c) => {
            const isImported =
              c.source === 'dgt_imported' ||
              c.source === 'osm_imported' ||
              String(c.zone ?? '').toUpperCase().startsWith('DGT');
            return (
              <Marker
                key={`charger-${c.id}`}
                position={[c.latitude, c.longitude]}
                icon={chargerIcon(isImported)}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{c.name || `Punt de recarrega #${c.id}`}</p>
                    <p>Tipus: {isImported ? 'Importat' : 'Intern'}</p>
                    <p>Zona: {c.zone || 'N/A'}</p>
                    <p>Ref: {c.postal_code || 'N/A'}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {positions.map((pos) => (
          <Marker
            key={`marker-${pos.technicianId}`}
            position={[pos.latitude, pos.longitude]}
            icon={techIcon(getTechColor(pos.technicianId), pos.technicianName.split(' ')[0] || 'Tech')}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{pos.technicianName}</p>
                <p>Tecnic ID: {pos.technicianId}</p>
                <p>Tram: {pos.segmentIndex + 1}</p>
                <p>Progres: {(pos.progress * 100).toFixed(0)}%</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-mobility-background/40 text-mobility-muted text-sm">
          Carregant dades de rutes...
        </div>
      ) : null}

      {!loading && tracks.length === 0 ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">
          Sense rutes de tecnics, mostrant carregadors
        </div>
      ) : null}
    </div>
  );
}
