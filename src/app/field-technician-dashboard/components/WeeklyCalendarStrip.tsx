'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface WeekDay {
  id: string;
  label: string;
  date: string;
  month: string;
  visits: number;
  status: string;
}

const generateWeek = (offset: number): WeekDay[] => {
  const base = [
    { label: 'Dl', visits: 5, status: 'completat' },
    { label: 'Dt', visits: 6, status: 'completat' },
    { label: 'Dc', visits: 4, status: 'completat' },
    { label: 'Dj', visits: 7, status: 'avui' },
    { label: 'Dv', visits: 5, status: 'planificat' },
    { label: 'Ds', visits: 0, status: 'lliure' },
    { label: 'Dg', visits: 0, status: 'lliure' },
  ];
  const startDate = new Date(2026, 2, 23); // March 23, 2026
  startDate.setDate(startDate.getDate() + offset * 7);
  return base.map((d, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const status = offset === 0 ? d.status : offset > 0 ? (i < 5 ? 'planificat' : 'lliure') : 'completat';
    const visits = offset === 0 ? d.visits : offset > 0 ? (i < 5 ? Math.floor(Math.random() * 5) + 3 : 0) : (i < 5 ? Math.floor(Math.random() * 6) + 2 : 0);
    return {
      id: `day-${offset}-${i}`,
      label: d.label,
      date: String(date.getDate()).padStart(2, '0'),
      month: date.toLocaleString('ca-ES', { month: 'short' }),
      visits,
      status,
    };
  });
};

const WEEK_LABELS: Record<number, string> = {
  '-1': 'Setmana del 16 al 22 de Març 2026',
  '0': 'Setmana del 23 al 29 de Març 2026',
  '1': 'Setmana del 30 Mar al 5 d\'Abr 2026',
  '2': 'Setmana del 6 al 12 d\'Abril 2026',
};

export default function WeeklyCalendarStrip() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState('day-0-3');

  const weekDays = generateWeek(weekOffset);
  const weekLabel = WEEK_LABELS[weekOffset] ?? `Setmana ${weekOffset > 0 ? '+' : ''}${weekOffset}`;

  const handlePrevWeek = () => {
    setWeekOffset((w) => w - 1);
    setSelectedDay(`day-${weekOffset - 1}-3`);
    toast.info('Setmana anterior carregada');
  };

  const handleNextWeek = () => {
    setWeekOffset((w) => w + 1);
    setSelectedDay(`day-${weekOffset + 1}-3`);
    toast.info('Setmana següent carregada');
  };

  return (
    <div className="bg-card rounded-xl border border-border px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-foreground text-sm">Calendari Setmanal</h2>
          <p className="text-muted-foreground text-xs">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-150"
            title="Setmana anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => { setWeekOffset(0); setSelectedDay('day-0-3'); toast.info('Tornat a la setmana actual'); }}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
          >
            Avui
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-150"
            title="Setmana següent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isSelected = selectedDay === day.id;
          const isToday = day.status === 'avui';
          return (
            <button
              key={day.id}
              onClick={() => {
                if (day.status !== 'lliure') {
                  setSelectedDay(day.id);
                  if (day.visits > 0) {
                    toast.info(`${day.label} ${day.date} ${day.month}`, { description: `${day.visits} visites planificades` });
                  }
                }
              }}
              className={`flex flex-col items-center p-2.5 rounded-xl transition-all duration-150
                ${isSelected
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : day.status === 'lliure' ? 'text-muted-foreground cursor-default' : 'hover:bg-muted text-foreground'
                }`}
            >
              <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-blue-200' : 'text-muted-foreground'}`}>
                {day.label}
              </span>
              <span className={`text-lg font-bold leading-none mb-1.5 ${isToday && !isSelected ? 'text-primary' : ''}`}>
                {day.date}
              </span>
              {day.visits > 0 ? (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {Array.from({ length: Math.min(day.visits, 4) }).map((_, i) => (
                    <div
                      key={`dot-${day.id}-${i}`}
                      className={`w-1.5 h-1.5 rounded-full
                        ${isSelected ? 'bg-white/60' :
                          day.status === 'completat' ? 'bg-green-400' :
                          day.status === 'avui' ? 'bg-blue-500' : 'bg-amber-400'
                        }`}
                    />
                  ))}
                  {day.visits > 4 && (
                    <span className={`text-xs font-mono ${isSelected ? 'text-blue-200' : 'text-muted-foreground'}`}>
                      +{day.visits - 4}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
              )}
              {day.visits > 0 && (
                <span className={`text-xs mt-1 font-mono tabular-nums ${isSelected ? 'text-blue-200' : 'text-muted-foreground'}`}>
                  {day.visits}v
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}