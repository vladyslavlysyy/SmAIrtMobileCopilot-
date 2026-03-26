'use client';

import React, { useState } from 'react';
import { Layers, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const mapPoints = [
  { id: 'mp-001', x: 48, y: 52, type: 'critic', label: 'SAT-2847', municipality: 'Tarragona' },
  { id: 'mp-002', x: 62, y: 38, type: 'assignat', label: 'SAT-2851', municipality: 'Reus' },
  { id: 'mp-003', x: 72, y: 65, type: 'assignat', label: 'SAT-2863', municipality: 'Salou' },
  { id: 'mp-004', x: 55, y: 42, type: 'preventiu', label: 'P-1204', municipality: 'Tarragona' },
  { id: 'mp-005', x: 40, y: 60, type: 'preventiu', label: 'P-1205', municipality: 'Tarragona' },
  { id: 'mp-006', x: 80, y: 45, type: 'posada', label: 'C041', municipality: 'Cambrils' },
  { id: 'mp-007', x: 58, y: 30, type: 'pendent', label: 'SAT-2871', municipality: 'Vila-seca' },
  { id: 'mp-008', x: 35, y: 45, type: 'pendent', label: 'SAT-2879', municipality: 'Tarragona' },
  { id: 'mp-009', x: 68, y: 55, type: 'operatiu', label: 'OP-112', municipality: 'Salou' },
  { id: 'mp-010', x: 25, y: 35, type: 'operatiu', label: 'OP-087', municipality: 'Tarragona' },
  { id: 'mp-011', x: 88, y: 72, type: 'operatiu', label: 'OP-203', municipality: 'Cambrils' },
];

const routeColors = ['#2563eb', '#16a34a', '#d97706', '#7c3aed'];

export default function MapPanel() {
  const [activeLayer, setActiveLayer] = useState<'all' | 'critic' | 'routes'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getPointColor = (type: string) => {
    switch (type) {
      case 'critic': return '#dc2626';
      case 'assignat': return '#2563eb';
      case 'preventiu': return '#2563eb';
      case 'posada': return '#7c3aed';
      case 'pendent': return '#d97706';
      case 'operatiu': return '#16a34a';
      default: return '#64748b';
    }
  };

  const getPointSize = (type: string) => {
    if (type === 'critic') return 10;
    if (type === 'pendent') return 8;
    return 6;
  };

  const visiblePoints = activeLayer === 'critic'
    ? mapPoints.filter((p) => p.type === 'critic' || p.type === 'pendent')
    : mapPoints;

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, parseFloat((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))));

  const mapContent = (
    <>
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Roads */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="20%" y1="0" x2="80%" y2="100%" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="0" y1="30%" x2="100%" y2="70%" stroke="#e2e8f0" strokeWidth="1" />
      </svg>
      {/* Routes */}
      {activeLayer === 'routes' && (
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <polyline points="48%,52% 55%,42% 40%,60% 35%,45%" fill="none" stroke={routeColors[0]} strokeWidth="2" strokeDasharray="4 2" opacity="0.7" />
          <polyline points="62%,38% 58%,30% 55%,42%" fill="none" stroke={routeColors[1]} strokeWidth="2" strokeDasharray="4 2" opacity="0.7" />
          <polyline points="72%,65% 80%,45% 88%,72%" fill="none" stroke={routeColors[2]} strokeWidth="2" strokeDasharray="4 2" opacity="0.7" />
        </svg>
      )}
      {/* Points */}
      {visiblePoints.map((point) => {
        const color = getPointColor(point.type);
        const size = getPointSize(point.type);
        const isHovered = hoveredPoint === point.id;
        return (
          <div
            key={point.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            onMouseEnter={() => setHoveredPoint(point.id)}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {point.type === 'critic' && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ backgroundColor: color, width: size * 3, height: size * 3, margin: `-${size}px` }} />
            )}
            <div
              className="rounded-full border-2 border-white shadow-md transition-transform duration-150"
              style={{ width: size * 2, height: size * 2, backgroundColor: color, transform: isHovered ? 'scale(1.5)' : 'scale(1)' }}
            />
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-xl pointer-events-none">
                <p className="font-semibold">{point.label}</p>
                <p className="text-slate-300">{point.municipality}</p>
              </div>
            )}
          </div>
        );
      })}
      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 text-white text-xs rounded-md font-mono">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Mapa de la Xarxa</h3>
            <p className="text-muted-foreground text-xs">Camp de Tarragona · {mapPoints.length} punts actius</p>
          </div>
          <div className="flex items-center gap-1.5">
            {(['all', 'critic', 'routes'] as const).map((layer) => (
              <button
                key={`layer-${layer}`}
                onClick={() => setActiveLayer(layer)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150
                  ${activeLayer === layer ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {layer === 'all' ? 'Tot' : layer === 'critic' ? 'Crítics' : 'Rutes'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative bg-slate-100 h-52 overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-200 origin-center"
            style={{ transform: `scale(${zoom})` }}
          >
            {mapContent}
          </div>
          {/* Controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 2.5}
              className="w-7 h-7 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted transition-colors shadow-sm disabled:opacity-40"
              title="Apropar"
            >
              <ZoomIn size={12} className="text-muted-foreground" />
            </button>
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="w-7 h-7 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted transition-colors shadow-sm disabled:opacity-40"
              title="Allunyar"
            >
              <ZoomOut size={12} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="w-7 h-7 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
              title="Restablir zoom"
            >
              <Layers size={12} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="w-7 h-7 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
              title="Pantalla completa"
            >
              <Maximize2 size={12} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-wrap gap-3 border-t border-border bg-muted/30">
          {[
            { color: '#dc2626', label: 'Crític' },
            { color: '#d97706', label: 'Pendent' },
            { color: '#2563eb', label: 'Assignat' },
            { color: '#7c3aed', label: 'Posada en Marxa' },
            { color: '#16a34a', label: 'Operatiu' },
          ].map((item) => (
            <div key={`legend-${item.label}`} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-4xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">Mapa de la Xarxa · Camp de Tarragona</h3>
              <div className="flex items-center gap-2">
                {(['all', 'critic', 'routes'] as const).map((layer) => (
                  <button
                    key={`fs-layer-${layer}`}
                    onClick={() => setActiveLayer(layer)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150
                      ${activeLayer === layer ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {layer === 'all' ? 'Tot' : layer === 'critic' ? 'Crítics' : 'Rutes'}
                  </button>
                ))}
                <button onClick={() => setIsFullscreen(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg ml-2">
                  ✕
                </button>
              </div>
            </div>
            <div className="relative bg-slate-100 h-[60vh] overflow-hidden">
              <div className="absolute inset-0 transition-transform duration-200 origin-center" style={{ transform: `scale(${zoom})` }}>
                {mapContent}
              </div>
              <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
                <button onClick={handleZoomIn} disabled={zoom >= 2.5} className="w-8 h-8 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted shadow-sm disabled:opacity-40">
                  <ZoomIn size={14} className="text-muted-foreground" />
                </button>
                <button onClick={handleZoomOut} disabled={zoom <= 0.5} className="w-8 h-8 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted shadow-sm disabled:opacity-40">
                  <ZoomOut size={14} className="text-muted-foreground" />
                </button>
                <button onClick={() => setZoom(1)} className="w-8 h-8 bg-card border border-border rounded-md flex items-center justify-center hover:bg-muted shadow-sm">
                  <Layers size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}