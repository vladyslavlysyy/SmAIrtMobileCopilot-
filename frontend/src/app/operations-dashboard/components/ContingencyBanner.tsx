'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Imprevisto } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function ContingencyBanner() {
  const { visits, loadVisits } = useAppStore();
  const [items, setItems] = useState<Imprevisto[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  const technicianId = useMemo(() => {
    const first = visits.find((v) => v.technician_id !== null);
    return first?.technician_id ?? null;
  }, [visits]);

  useEffect(() => {
    if (visits.length === 0) {
      loadVisits();
    }
  }, [visits.length, loadVisits]);

  useEffect(() => {
    if (!technicianId) return;

    let active = true;
    const fetchData = async () => {
      try {
        const data = await api.getImprevistos(technicianId);
        if (active) setItems(data);
      } catch {
        if (active) setItems([]);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [technicianId]);

  const visible = useMemo(() => {
    const normalized = items
      .filter((i) => !dismissed.includes(i.id))
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    const unique = new Map<string, Imprevisto>();
    for (const item of normalized) {
      const key = `${item.visit_id}|${item.tipo}|${item.descripcion ?? ''}`;
      if (!unique.has(key)) unique.set(key, item);
    }

    return Array.from(unique.values()).slice(0, 4);
  }, [dismissed, items]);

  if (visible.length === 0) return null;

  const handleReplan = async (item: Imprevisto) => {
    if (!technicianId) {
      toast.error('No hi ha tecnic disponible');
      return;
    }

    const routeIds = visits
      .filter((v) => v.technician_id === technicianId)
      .map((v) => v.id)
      .slice(0, 10);

    try {
      await api.assignIncidence({
        tecnico_id: technicianId,
        ubicacion_actual: { latitude: 41.1189, longitude: 1.2445 },
        ruta_actual_ids: routeIds,
        nueva_incidencia_id: item.visit_id,
      });
      toast.success('Replanificació llançada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error de replanificació'); 
    }
  };

  const formatTipo = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t === 'trafico') return 'trafic';
    if (t === 'incidencia_adicional') return 'incidencia addicional';
    return t.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-3 mb-6">
      {visible.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-4 p-4 rounded-xl border bg-red-50 border-red-200/70 shadow-[0_0_15px_rgba(239,68,68,0.12)]"
        >
          <div className="p-2 rounded-xl flex-shrink-0 bg-red-100/60 text-red-700 font-mono border border-red-200/30">
            <div className="relative">
              <AlertTriangle size={20} className="text-red-600 relative z-10" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">
              Imprevist detectat
            </p>
            <p className="text-sm font-medium text-mobility-primary">
              {item.descripcion ?? 'Sense descripció'}
            </p>
            <p className="text-xs text-mobility-primary/70 mt-1 flex items-center gap-2">
              <span className="bg-mobility-background px-2 py-0.5 rounded-full">Visita #{item.visit_id}</span>
              <span>·</span>
              <span>{formatTipo(item.tipo)}</span>
              <span>·</span>
              <span className="text-mobility-accent">{item.tiempo_perdido_min ?? 0} min perduts</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={() => handleReplan(item)}
              className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <RefreshCw size={14} />
              Replanificar
            </button>

            <button
              onClick={() => setDismissed((prev) => [...prev, item.id])}        
              className="p-2 text-mobility-muted hover:text-mobility-primary rounded-lg hover:bg-mobility-background transition-colors"
              title="Descarta"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
