'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Clock, Navigation, TrendingUp } from 'lucide-react';
import type { Visit } from '@/lib/api';

interface KpiCardsGridProps {
  visits: Visit[];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function KpiCardsGrid({ visits }: KpiCardsGridProps) {
  const completed = useMemo(
    () => visits.filter((v) => String(v.status).toLowerCase() === 'completed').length,
    [visits]
  );

  const pending = useMemo(
    () => visits.filter((v) => String(v.status).toLowerCase() === 'pending').length,
    [visits]
  );

  const inProgress = useMemo(
    () => visits.filter((v) => String(v.status).toLowerCase() === 'in_progress').length,
    [visits]
  );

  const hoursTotal = useMemo(() => {
    const minutes = visits.reduce((acc, v) => acc + (v.estimated_duration ?? 0), 0);
    return minutes / 60;
  }, [visits]);

  const kmTotal = useMemo(() => {
    const byTech = new Map<number, Array<Visit & { latitude: number; longitude: number }>>();

    visits.forEach((v) => {
      if (
        v.technician_id === null ||
        typeof v.latitude !== 'number' ||
        typeof v.longitude !== 'number'
      ) {
        return;
      }
      const list = byTech.get(v.technician_id) ?? [];
      list.push(v as Visit & { latitude: number; longitude: number });
      byTech.set(v.technician_id, list);
    });

    let total = 0;
    byTech.forEach((techVisits) => {
      const ordered = [...techVisits].sort(
        (a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
      );
      for (let i = 1; i < ordered.length; i += 1) {
        total += haversineKm(
          ordered[i - 1].latitude,
          ordered[i - 1].longitude,
          ordered[i].latitude,
          ordered[i].longitude
        );
      }
    });

    return total;
  }, [visits]);

  const cards = [
    {
      id: 'done',
      title: 'Completades',
      value: completed,
      subtitle: 'visites',
      icon: <CheckCircle2 size={24} className="text-mobility-accent/60" />,       
    },
    {
      id: 'pending',
      title: 'Pendents',
      value: pending,
      subtitle: 'visites',
      icon: <Clock size={24} className="text-mobility-accent/60" />,
    },
    {
      id: 'progress',
      title: 'En progrés',
      value: inProgress,
      subtitle: 'actives',
      icon: <TrendingUp size={24} className="text-mobility-accent/60" />,
    },
    {
      id: 'km',
      title: 'Km totals',
      value: kmTotal.toFixed(1),
      subtitle: 'km',
      icon: <Navigation size={24} className="text-mobility-accent/60" />,
    },
    {
      id: 'hours',
      title: 'Hores efectives',
      value: hoursTotal.toFixed(1),
      subtitle: 'h',
      icon: <Clock size={24} className="text-mobility-accent/60" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">      
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-mobility-surface shadow-sm rounded-xl p-5 border border-mobility-border"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-mobility-muted">
                {card.title}
              </span>
            </div>
            <div className="flex-shrink-0">{card.icon}</div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums font-mono text-mobility-accent">
            {card.value}
            <span className="text-sm font-normal text-mobility-muted font-sans">{' '}{card.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
