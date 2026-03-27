'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Visit } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

interface AdminCalendarPanelProps {
  refreshNonce: number;
  onlyPending: boolean;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(iso: string): Date {
  return new Date(iso);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
}

function getVisitTypeLabel(type: Visit['visit_type']): string {
  return type.replace(/_/g, ' ');
}

export default function AdminCalendarPanel({ refreshNonce, onlyPending }: AdminCalendarPanelProps) {
  const { technicians, loadTechnicians } = useAppStore();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [calendarMode, setCalendarMode] = useState<'common' | 'technician'>('common');
  const [selectedTechnician, setSelectedTechnician] = useState<number | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [weekVisits, setWeekVisits] = useState<Visit[]>([]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });
  }, [weekStart]);

  const weekRange = useMemo(() => {
    const from = formatDateKey(weekDays[0]);
    const to = formatDateKey(weekDays[6]);
    return { from, to };
  }, [weekDays]);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        try {
          const data = await api.getAllVisits({
            dateFrom: weekRange.from,
            dateTo: weekRange.to,
          });
          setWeekVisits(data);
        } catch (e) {
          const message = e instanceof Error ? e.message.toLowerCase() : '';
          const isNotFound = message.includes('not found') || message.includes('404');

          if (!isNotFound) {
            throw e;
          }

          // Compatibility fallback for backends without /visits/all.
          const daily = await Promise.all(
            weekDays.map((day) => api.getVisits(formatDateKey(day)))
          );
          const merged = daily.flat();
          const unique = Array.from(new Map(merged.map((v) => [v.id, v])).values());
          setWeekVisits(unique);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No s\'ha pogut carregar el calendari');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [refreshNonce, weekDays, weekRange.from, weekRange.to]);

  const allCalendarByDay = useMemo(() => {
    const grouped = new Map<string, Visit[]>();

    weekDays.forEach((d) => grouped.set(formatDateKey(d), []));

    weekVisits.forEach((visit) => {
      if (onlyPending && visit.status !== 'pending') return;
      const key = formatDateKey(parseDate(visit.planned_date));
      if (!grouped.has(key)) return;
      const current = grouped.get(key) ?? [];
      current.push(visit);
      grouped.set(key, current);
    });

    grouped.forEach((value, key) => {
      grouped.set(
        key,
        value.sort((a, b) => parseDate(a.planned_date).getTime() - parseDate(b.planned_date).getTime())
      );
    });

    return grouped;
  }, [weekDays, weekVisits, onlyPending]);

  const technicianCalendarByDay = useMemo(() => {
    if (selectedTechnician === 'all') return allCalendarByDay;

    const grouped = new Map<string, Visit[]>();
    weekDays.forEach((d) => grouped.set(formatDateKey(d), []));

    weekVisits.forEach((visit) => {
      if (onlyPending && visit.status !== 'pending') return;
      if (visit.technician_id !== selectedTechnician) return;
      const key = formatDateKey(parseDate(visit.planned_date));
      if (!grouped.has(key)) return;
      const current = grouped.get(key) ?? [];
      current.push(visit);
      grouped.set(key, current);
    });

    grouped.forEach((value, key) => {
      grouped.set(
        key,
        value.sort((a, b) => parseDate(a.planned_date).getTime() - parseDate(b.planned_date).getTime())
      );
    });

    return grouped;
  }, [allCalendarByDay, selectedTechnician, weekDays, weekVisits, onlyPending]);

  const selectedTechnicianName = useMemo(() => {
    if (selectedTechnician === 'all') return 'Tots els tècnics';
    const found = technicians.find((t) => t.id === selectedTechnician);
    return found ? `${found.name} (T${found.id})` : `Tècnic ${selectedTechnician}`;
  }, [selectedTechnician, technicians]);

  const goPrevWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() - 7);
    setWeekStart(next);
  };

  const goNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    setWeekStart(next);
  };

  return (
    <div className="bg-mobility-surface border border-mobility-border rounded-xl shadow-sm p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-mobility-primary flex items-center gap-2">
            <CalendarDays size={16} className="text-mobility-accent" />
            Planificació setmanal
          </h3>
          <p className="text-xs text-mobility-muted">
            Calendari comú i calendari per tècnic amb totes les tasques assignades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrevWeek}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-mobility-border bg-mobility-background text-mobility-primary hover:bg-mobility-surface"
          >
            Setmana anterior
          </button>
          <button
            onClick={goNextWeek}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-mobility-border bg-mobility-background text-mobility-primary hover:bg-mobility-surface"
          >
            Setmana següent
          </button>
        </div>
      </div>

      <div className="text-xs text-mobility-muted">
        Rang: {weekRange.from} a {weekRange.to}
      </div>

      <div className="inline-flex bg-mobility-background rounded-lg border border-mobility-border p-1">
        <button
          onClick={() => setCalendarMode('common')}
          className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
            calendarMode === 'common' ? 'bg-mobility-accent text-white' : 'text-mobility-muted'
          }`}
        >
          Calendari comú
        </button>
        <button
          onClick={() => setCalendarMode('technician')}
          className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
            calendarMode === 'technician' ? 'bg-mobility-accent text-white' : 'text-mobility-muted'
          }`}
        >
          Calendari per tècnic
        </button>
      </div>

      {calendarMode === 'common' ? (
        <div className="rounded-lg border border-mobility-border bg-mobility-background p-3">
          <h4 className="text-sm font-semibold text-mobility-primary mb-3">Calendari comú (tots)</h4>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = formatDateKey(day);
              const visits = allCalendarByDay.get(key) ?? [];
              return (
                <div key={key} className="min-h-[170px] rounded-lg border border-mobility-border/70 bg-mobility-surface p-2">
                  <div className="text-[11px] font-semibold text-mobility-primary mb-2">
                    {day.toLocaleDateString('ca-ES', { weekday: 'short', day: '2-digit' })}
                  </div>
                  <div className="space-y-1.5">
                    {visits.length === 0 ? (
                      <p className="text-[11px] text-mobility-muted">Sense tasques</p>
                    ) : (
                      visits.map((visit) => (
                        <div key={visit.id} className="rounded-md border border-mobility-border bg-mobility-background px-2 py-1">
                          <p className="text-[11px] font-semibold text-mobility-primary">
                            #{visit.id} · {formatTime(visit.planned_date)}
                          </p>
                          <p className="text-[10px] text-mobility-muted">
                            T{visit.technician_id ?? '-'} · {getVisitTypeLabel(visit.visit_type)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-mobility-border bg-mobility-background p-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-sm font-semibold text-mobility-primary">Calendari per tècnic</h4>
            <select
              value={String(selectedTechnician)}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedTechnician(value === 'all' ? 'all' : Number(value));
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-mobility-border bg-mobility-surface text-mobility-primary"
            >
              <option value="all">Tots els tècnics</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{`${t.name} (T${t.id})`}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-mobility-muted mb-2">Vista de: {selectedTechnicianName}</p>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = formatDateKey(day);
              const visits = technicianCalendarByDay.get(key) ?? [];
              return (
                <div key={`${key}-tech`} className="min-h-[170px] rounded-lg border border-mobility-border/70 bg-mobility-surface p-2">
                  <div className="text-[11px] font-semibold text-mobility-primary mb-2">
                    {day.toLocaleDateString('ca-ES', { weekday: 'short', day: '2-digit' })}
                  </div>
                  <div className="space-y-1.5">
                    {visits.length === 0 ? (
                      <p className="text-[11px] text-mobility-muted">Sense tasques</p>
                    ) : (
                      visits.map((visit) => (
                        <div key={visit.id} className="rounded-md border border-mobility-border bg-mobility-background px-2 py-1">
                          <p className="text-[11px] font-semibold text-mobility-primary">
                            #{visit.id} · {formatTime(visit.planned_date)}
                          </p>
                          <p className="text-[10px] text-mobility-muted">{getVisitTypeLabel(visit.visit_type)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading && <p className="text-xs text-mobility-muted">Carregant calendari...</p>}
    </div>
  );
}
