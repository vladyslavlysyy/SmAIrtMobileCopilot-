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

  const visible = items.filter((i) => !dismissed.includes(i.id));

  if (visible.length === 0) return null;

  const handleReplan = async (item: Imprevisto) => {
    if (!technicianId) {
      toast.error('No hi ha tècnic disponible');
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

  return (
    <div className="space-y-2">
      {visible.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200"
        >
          <div className="p-1.5 rounded-lg flex-shrink-0 bg-amber-100">
            <AlertTriangle size={16} className="text-amber-700" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Imprevist detectat
            </p>
            <p className="text-sm font-medium text-amber-900">
              {item.descripcion ?? 'Sense descripció'}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Visita #{item.visit_id} · {item.tipo} · {item.tiempo_perdido_min ?? 0} min
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleReplan(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700"
            >
              <RefreshCw size={12} />
              Replanificar
            </button>

            <button
              onClick={() => setDismissed((prev) => [...prev, item.id])}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-black/5"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
