'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';

interface DayCell {
  id: string;
  date: Date;
  label: string;
  shortDate: string;
  visits: number;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const dayNames = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];

export default function WeeklyCalendarStrip() {
  const { currentUser, selectedTechnicianId, loadWeeklyVisits, isLoading, error } = useAppStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<Record<string, number>>({});

  const technicianId = selectedTechnicianId ?? currentUser?.selectedTechnicianId;

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);

  const days = useMemo<DayCell[]>(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(weekStart, i);
      const key = date.toISOString().split('T')[0];
      return {
        id: key,
        date,
        label: dayNames[date.getDay()],
        shortDate: String(date.getDate()).padStart(2, '0'),
        visits: weeklySummary[key] ?? 0,
      };
    });
  }, [weekStart, weeklySummary]);

  useEffect(() => {
    if (!technicianId) return;
    const key = weekStart.toISOString().split('T')[0];
    loadWeeklyVisits(key, technicianId).then(setWeeklySummary);
  }, [technicianId, weekStart, loadWeeklyVisits]);

  const handlePrev = () => {
    setWeekOffset((v) => v - 1);
    toast.info('Setmana anterior');
  };

  const handleNext = () => {
    setWeekOffset((v) => v + 1);
    toast.info('Setmana seg?ent');
  };

  const label = `${days[0]?.date.toLocaleDateString('ca-ES')} - ${days[6]?.date.toLocaleDateString('ca-ES')}`;

  return (
    <div className="bg-mobility-surface shadow-sm border border-mobility-border rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-mobility-primary text-sm">Calendari setmanal</h2>
          <p className="text-mobility-muted text-xs">{label}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 text-mobility-muted hover:text-mobility-primary hover:bg-mobility-background hover:text-mobility-primary rounded-lg transition"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2 py-1 text-xs font-medium text-mobility-primary hover:text-mobility-accent hover:bg-mobility-background hover:text-mobility-primary rounded-md transition"
          >
            Avui
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 text-mobility-muted hover:text-mobility-primary hover:bg-mobility-background hover:text-mobility-primary rounded-lg transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-500/50 rounded-lg mb-3">
          <AlertCircle size={14} className="text-red-600" />
          <p className="text-xs text-mobility-primary">{error}</p>
        </div>
      )}

      <div className={`grid grid-cols-7 gap-2 ${isLoading ? 'opacity-50' : ''}`}>
        {days.map((day) => {
          const isToday = day.id === new Date().toISOString().split('T')[0];    
          // Default selection to today if not selected explicitly
          const isSelected = selectedDay === day.id || (selectedDay === null && isToday);

          return (
            <button
              key={day.id}
              onClick={() => {
                setSelectedDay(day.id);
                toast.info(`${day.label} ${day.shortDate}`, {
                  description: `${day.visits} visites`,
                });
              }}
              className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                isSelected
                  ? 'bg-mobility-accent text-white text-mobility-primary border border-mobility-accent shadow-[0_0_10px_rgba(0,200,81,0.2)]'
                  : 'bg-mobility-primary hover:bg-mobility-background hover:text-mobility-primary text-mobility-primary border border-mobility-border'
              }`}
            >
              {isToday && !isSelected && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-mobility-accent text-white" />
              )}

              <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-mobility-primary/90' : 'text-mobility-muted'}`}>
                {day.label}
              </span>
              <span className="text-lg font-bold leading-none mb-2">
                {day.shortDate}
              </span>

              {day.visits > 0 ? (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] ${
                  isSelected ? 'bg-white text-mobility-accent' : 'bg-cyan-100/70 text-cyan-700 font-mono'
                }`}>
                  {day.visits}
                </span>
              ) : (
                <span className="text-[10px] text-transparent px-1.5 py-0.5">0</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
