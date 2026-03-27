'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Visit } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

interface AdminCalendarPanelProps {
  refreshNonce: number;
  focusDateIso?: string | null;
  onSlotUpdated?: () => Promise<void> | void;
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function getVisitTone(visit: Visit, theme: 'light' | 'dark'): { container: string; badge: string } {
  const isDark = theme === 'dark';

  if (visit.status === 'completed') {
    return {
      container: isDark
        ? 'bg-emerald-500/15 border-emerald-400/30 border-l-emerald-400'
        : 'bg-emerald-200/80 border-emerald-400 border-l-emerald-700',
      badge: isDark
        ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
        : 'bg-emerald-300 text-slate-950 border border-emerald-500',
    };
  }
  if (visit.visit_type === 'correctivo_critico') {
    return {
      container: isDark
        ? 'bg-rose-500/15 border-rose-400/30 border-l-rose-400'
        : 'bg-rose-200/80 border-rose-400 border-l-rose-700',
      badge: isDark
        ? 'bg-rose-500/20 text-rose-100 border border-rose-400/30'
        : 'bg-rose-300 text-slate-950 border border-rose-500',
    };
  }
  if (visit.visit_type === 'correctivo_no_critico' || visit.status === 'pending') {
    return {
      container: isDark
        ? 'bg-amber-500/15 border-amber-400/30 border-l-amber-400'
        : 'bg-amber-200/80 border-amber-400 border-l-amber-700',
      badge: isDark
        ? 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
        : 'bg-amber-300 text-slate-950 border border-amber-500',
    };
  }
  if (visit.visit_type === 'diagnosi') {
    return {
      container: isDark
        ? 'bg-violet-500/15 border-violet-400/30 border-l-violet-400'
        : 'bg-violet-200/80 border-violet-400 border-l-violet-700',
      badge: isDark
        ? 'bg-violet-500/20 text-violet-100 border border-violet-400/30'
        : 'bg-violet-300 text-slate-950 border border-violet-500',
    };
  }

  return {
    container: isDark
      ? 'bg-cyan-500/15 border-cyan-400/30 border-l-cyan-400'
      : 'bg-cyan-200/80 border-cyan-400 border-l-cyan-700',
    badge: isDark
      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30'
      : 'bg-cyan-300 text-slate-950 border border-cyan-500',
  };
}

export default function AdminCalendarPanel({
  refreshNonce,
  focusDateIso,
  onSlotUpdated,
}: AdminCalendarPanelProps) {
  const { technicians, loadTechnicians } = useAppStore();
  const detectTheme = () =>
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.documentElement.classList.contains('theme-dark'))
      ? 'dark'
      : 'light';
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    detectTheme()
  );
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [scope, setScope] = useState<'week' | 'pending'>('week');
  const [calendarMode, setCalendarMode] = useState<'common' | 'technician'>('common');
  const [selectedTechnician, setSelectedTechnician] = useState<number | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [weekVisits, setWeekVisits] = useState<Visit[]>([]);
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);

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

  const onlyPending = useMemo(() => scope === 'pending', [scope]);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    const html = document.documentElement;
    const syncTheme = () => {
      setTheme(
        html.classList.contains('dark') || html.classList.contains('theme-dark') ? 'dark' : 'light'
      );
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!focusDateIso) return;
    const target = new Date(focusDateIso);
    if (Number.isNaN(target.getTime())) return;
    setWeekStart(startOfWeek(target));
  }, [focusDateIso]);

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

  const activeCalendarByDay = useMemo(
    () => (calendarMode === 'common' ? allCalendarByDay : technicianCalendarByDay),
    [allCalendarByDay, calendarMode, technicianCalendarByDay]
  );

  const calendarTitle = calendarMode === 'common' ? 'Calendari comú' : 'Calendari per tècnic';
  const calendarSubtitle =
    calendarMode === 'common'
      ? 'Vista global de totes les visites'
      : `Vista de: ${selectedTechnicianName}`;

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

  const handleAddTaskToSlot = async (dateKey: string) => {
    if (calendarMode !== 'technician' || selectedTechnician === 'all') {
      toast.error('Selecciona primer un tècnic concret');
      return;
    }

    const rawVisitId = window.prompt('Introdueix l\'ID de la visita independent que vols afegir al slot');
    if (!rawVisitId) return;

    const visitId = Number(rawVisitId.trim());
    if (!Number.isFinite(visitId) || visitId <= 0) {
      toast.error('ID de visita invàlid');
      return;
    }

    try {
      setIsUpdatingSlot(true);
      const result = await api.addVisitToSlotAndRecalculate({
        technician_id: selectedTechnician,
        visit_id: visitId,
        target_date: dateKey,
      });

      toast.success(
        `Slot recalculat: ${result.visits_assigned} visites replanificades per T${selectedTechnician}.`
      );

      if (onSlotUpdated) {
        await onSlotUpdated();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No s\'ha pogut actualitzar el slot');
    } finally {
      setIsUpdatingSlot(false);
    }
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
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'week' | 'pending')}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-mobility-border bg-mobility-background text-mobility-primary"
          >
            <option value="week">Setmana completa</option>
            <option value="pending">Només pendents</option>
          </select>
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

      <div className="rounded-xl border border-mobility-border bg-mobility-surface shadow-sm overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b border-mobility-border/70 bg-mobility-background/50">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <h4 className="text-sm font-semibold text-mobility-primary">{calendarTitle}</h4>
            {calendarMode === 'technician' && (
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
            )}
          </div>
          <p className="text-xs text-mobility-muted">{calendarSubtitle}</p>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <div className="grid grid-cols-7 min-w-[980px] bg-mobility-background/35">
            {weekDays.map((day) => {
              const key = formatDateKey(day);
              const visits = activeCalendarByDay.get(key) ?? [];
              const isToday = key === formatDateKey(new Date());

              return (
                <div key={`${calendarMode}-${key}`} className="min-h-[320px] border-r border-mobility-border/70 last:border-r-0 bg-mobility-surface">
                  <div className={`px-3 py-2.5 border-b border-mobility-border/70 ${isToday ? 'bg-cyan-50 dark:bg-cyan-500/15' : 'bg-mobility-background/50'}`}>
                    <p className="text-[10px] uppercase tracking-wide text-mobility-muted font-semibold">
                      {day.toLocaleDateString('ca-ES', { weekday: 'short' })}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isToday ? 'text-cyan-700 dark:text-cyan-200' : 'text-mobility-primary'}`}>
                        {day.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-mobility-muted">{visits.length}</span>
                        {calendarMode === 'technician' && selectedTechnician !== 'all' && (
                          <button
                            type="button"
                            onClick={() => handleAddTaskToSlot(key)}
                            disabled={isUpdatingSlot}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-mobility-border bg-mobility-surface text-mobility-primary hover:bg-mobility-background disabled:opacity-60"
                            title="Afegir tasca independent al slot i recalcular ruta"
                          >
                            {isUpdatingSlot ? '...' : '+ tasca'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-2">
                    {visits.length === 0 ? (
                      <p className="text-[11px] text-mobility-muted px-1 py-2">Sense tasques</p>
                    ) : (
                      visits.map((visit) => {
                        const tone = getVisitTone(visit, theme);
                        return (
                          <div key={visit.id} className={`rounded-lg border border-l-4 px-2.5 py-2 ${tone.container}`}>
                            <p className="text-[11px] font-semibold text-mobility-primary leading-tight">
                              {formatTime(visit.planned_date)} · #{visit.id}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold tracking-tight ${tone.badge}`}>
                                {getVisitTypeLabel(visit.visit_type)}
                              </span>
                              <span className="text-[10px] text-mobility-muted">T{visit.technician_id ?? '-'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading && <p className="text-xs text-mobility-muted">Carregant calendari...</p>}
    </div>
  );
}
