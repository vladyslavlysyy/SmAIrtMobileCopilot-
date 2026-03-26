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
    toast.info('Setmana següent');
  };

  const label = `${days[0]?.date.toLocaleDateString('ca-ES')} - ${days[6]?.date.toLocaleDateString('ca-ES')}`;

  return (
    <div className="bg-card rounded-xl border border-border px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-foreground text-sm">Calendari setmanal</h2>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
          >
            Avui
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-3">
          <AlertCircle size={14} className="text-red-500" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className={`grid grid-cols-7 gap-2 ${isLoading ? 'opacity-50' : ''}`}>
        {days.map((day) => {
          const isSelected = selectedDay === day.id;
          const isToday = day.id === new Date().toISOString().split('T')[0];
          return (
            <button
              key={day.id}
              onClick={() => {
                setSelectedDay(day.id);
                toast.info(`${day.label} ${day.shortDate}`, {
                  description: `${day.visits} visites`,
                });
              }}
              className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${isSelected ? 'bg-primary text-white' : 'hover:bg-muted text-foreground'}`}
            >
              <span
                className={`text-xs font-medium mb-1 ${isSelected ? 'text-blue-200' : 'text-muted-foreground'}`}
              >
                {day.label}
              </span>
              <span
                className={`text-lg font-bold leading-none mb-1.5 ${isToday && !isSelected ? 'text-primary' : ''}`}
              >
                {day.shortDate}
              </span>
              <span
                className={`text-xs font-mono ${isSelected ? 'text-blue-200' : 'text-muted-foreground'}`}
              >
                {day.visits}v
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
