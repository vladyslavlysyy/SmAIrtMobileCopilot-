'use client';

import React, { useMemo, useState } from 'react';
import { Route, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, type LoteRecommendationResponse, type UserInfo } from '@/lib/api';

interface LoteCreationProps {
  onAssigned?: () => Promise<void> | void;
}

export default function LoteCreation({ onAssigned }: LoteCreationProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [form, setForm] = useState({
    startLat: '41.1189',
    startLon: '1.2445',
    endLat: '41.1189',
    endLon: '1.2445',
    targetDate: today,
    limitHours: '8',
  });

  const [recommendation, setRecommendation] = useState<LoteRecommendationResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [technicians, setTechnicians] = useState<UserInfo[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [startTime, setStartTime] = useState('08:00');

  const parseNumber = (raw: string) => Number(raw.trim());

  const loadTechnicians = async () => {
    const users = await api.getUsers();
    const techUsers = users.filter((u) => u.is_technician && u.technician_id !== null);
    setTechnicians(techUsers);
    if (!selectedTechnicianId && techUsers.length > 0) {
      setSelectedTechnicianId(String(techUsers[0].technician_id));
    }
  };

  const validateForm = (): string | null => {
    const startLat = parseNumber(form.startLat);
    const startLon = parseNumber(form.startLon);
    const endLat = parseNumber(form.endLat);
    const endLon = parseNumber(form.endLon);
    const limitHours = parseNumber(form.limitHours);

    if (!Number.isFinite(startLat) || startLat < -90 || startLat > 90) return 'Latitud inicial invalida';
    if (!Number.isFinite(startLon) || startLon < -180 || startLon > 180) return 'Longitud inicial invalida';
    if (!Number.isFinite(endLat) || endLat < -90 || endLat > 90) return 'Latitud final invalida';
    if (!Number.isFinite(endLon) || endLon < -180 || endLon > 180) return 'Longitud final invalida';
    if (!form.targetDate) return 'La fecha es obligatoria';
    if (!Number.isFinite(limitHours) || limitHours <= 0) return 'El limite de horas debe ser mayor que 0';
    return null;
  };

  const handleGenerate = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setIsGenerating(true);
      await loadTechnicians();

      const generated = await api.recommendLote({
        origen: {
          latitude: parseNumber(form.startLat),
          longitude: parseNumber(form.startLon),
        },
        destino: {
          latitude: parseNumber(form.endLat),
          longitude: parseNumber(form.endLon),
        },
        target_date: form.targetDate,
        limite_horas: parseNumber(form.limitHours),
      });

      setRecommendation(generated);
      toast.success('Ruta optimizada generada (recomendacion)');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar la ruta optimizada');
      setRecommendation(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssign = async () => {
    if (!recommendation || recommendation.paradas_ordenadas.length === 0) {
      toast.error('Primero genera una recomendacion con visitas');
      return;
    }

    const techId = Number(selectedTechnicianId);
    if (!Number.isFinite(techId) || techId <= 0) {
      toast.error('Selecciona un tecnico valido');
      return;
    }

    try {
      setIsAssigning(true);
      const visitIds = recommendation.paradas_ordenadas.map((p) => p.visit_id);
      const result = await api.assignRouteAdmin({
        technician_id: techId,
        visit_ids_ordered: visitIds,
        target_date: form.targetDate,
        hora_inici: startTime,
      });

      toast.success(
        `Ruta asignada. ${result.visits_assigned} visitas actualizadas a estado SCHEDULED.`
      );
      setRecommendation(null);
      if (onAssigned) {
        await onAssigned();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo asignar la ruta recomendada');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <section className="bg-mobility-surface border border-mobility-border rounded-xl shadow-sm p-4 space-y-4">
      <div>
        <h3 className="text-base font-bold text-mobility-primary flex items-center gap-2">
          <Route size={16} className="text-mobility-accent" />
          Lote Creation
        </h3>
        <p className="text-xs text-mobility-muted">
          Genera una ruta optimizada como recomendacion. El admin decide despues si asignarla.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-mobility-muted">Latitud inicio</span>
          <input
            value={form.startLat}
            onChange={(e) => setForm((prev) => ({ ...prev, startLat: e.target.value }))}
            className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-mobility-muted">Longitud inicio</span>
          <input
            value={form.startLon}
            onChange={(e) => setForm((prev) => ({ ...prev, startLon: e.target.value }))}
            className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-mobility-muted">Latitud fin</span>
          <input
            value={form.endLat}
            onChange={(e) => setForm((prev) => ({ ...prev, endLat: e.target.value }))}
            className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-mobility-muted">Longitud fin</span>
          <input
            value={form.endLon}
            onChange={(e) => setForm((prev) => ({ ...prev, endLon: e.target.value }))}
            className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-mobility-muted">Fecha objetivo</span>
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm((prev) => ({ ...prev, targetDate: e.target.value }))}
            className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-mobility-muted">Limite horas</span>
          <input
            type="number"
            step="0.5"
            min="1"
            value={form.limitHours}
            onChange={(e) => setForm((prev) => ({ ...prev, limitHours: e.target.value }))}
            className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-3 py-2 text-sm rounded-lg bg-mobility-accent text-white font-semibold hover:brightness-110 disabled:opacity-60"
        >
          {isGenerating ? 'Generando...' : 'Generar ruta optimizada'}
        </button>
      </div>

      {recommendation && (
        <div className="space-y-3 border-t border-mobility-border pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-mobility-background px-3 py-2 border border-mobility-border">
              <div className="text-xs text-mobility-muted">Distancia</div>
              <div className="font-semibold text-mobility-primary">{recommendation.resumen.distancia_km} km</div>
            </div>
            <div className="rounded-lg bg-mobility-background px-3 py-2 border border-mobility-border">
              <div className="text-xs text-mobility-muted">Tiempo total</div>
              <div className="font-semibold text-mobility-primary">{recommendation.resumen.tiempo_total_min} min</div>
            </div>
            <div className="rounded-lg bg-mobility-background px-3 py-2 border border-mobility-border">
              <div className="text-xs text-mobility-muted">Horas</div>
              <div className="font-semibold text-mobility-primary">{recommendation.resumen.horas_totales} h</div>
            </div>
            <div className="rounded-lg bg-mobility-background px-3 py-2 border border-mobility-border">
              <div className="text-xs text-mobility-muted">Visitas</div>
              <div className="font-semibold text-mobility-primary">{recommendation.resumen.tareas_realizadas}</div>
            </div>
          </div>

          <div className="rounded-lg border border-mobility-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-mobility-background text-mobility-muted">
                <tr>
                  <th className="text-left px-3 py-2">Orden</th>
                  <th className="text-left px-3 py-2">Visit ID</th>
                  <th className="text-left px-3 py-2">Score IA</th>
                  <th className="text-left px-3 py-2">Duracion</th>
                </tr>
              </thead>
              <tbody>
                {recommendation.paradas_ordenadas.map((stop, index) => (
                  <tr key={`${stop.visit_id}-${index}`} className="border-t border-mobility-border">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">#{stop.visit_id}</td>
                    <td className="px-3 py-2">{stop.score_ia}</td>
                    <td className="px-3 py-2">{stop.estimated_duration} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="space-y-1">
              <span className="text-xs text-mobility-muted">Tecnico objetivo</span>
              <select
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
              >
                <option value="">Selecciona tecnico</option>
                {technicians.map((t) => (
                  <option key={t.id} value={String(t.technician_id)}>
                    {t.name} (T{t.technician_id})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-mobility-muted">Hora inicio plan</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
              />
            </label>

            <button
              onClick={handleAssign}
              disabled={isAssigning || recommendation.paradas_ordenadas.length === 0}
              className="h-[42px] px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white font-semibold hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <UserCheck size={16} />
              {isAssigning ? 'Asignando...' : 'Asignar recomendacion'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
