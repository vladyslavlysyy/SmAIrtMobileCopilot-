'use client';

import type { Visit } from '@/lib/api';
import { getVisitTypeLabelCa } from '@/lib/labels';

interface InterventionQueueListProps {
  visits: Visit[];
}

export default function InterventionQueueList({ visits }: InterventionQueueListProps) {
  const sorted = [...visits].sort((a, b) => {
    const scoreA = a.last_priority_score ?? 0;
    const scoreB = b.last_priority_score ?? 0;
    return scoreB - scoreA;
  });

  return (
    <section className="rounded-2xl border border-mobility-border bg-white/90 p-4">
      <h3 className="text-sm font-semibold text-mobility-primary">Cua d&apos;intervencions</h3>
      <ul className="mt-3 space-y-2">
        {sorted.slice(0, 8).map((visit) => (
          <li key={visit.id} className="rounded-lg bg-mobility-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-mobility-primary">
                #{visit.id} · {getVisitTypeLabelCa(visit.visit_type)}
              </span>
              <span className="text-xs text-mobility-secondary">
                score {Math.round(visit.last_priority_score ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-xs text-mobility-secondary">
              Tecnic: {visit.technician_id ?? 'Sense assignar'}
            </div>
          </li>
        ))}
        {sorted.length === 0 ? (
          <li className="rounded-lg bg-mobility-background p-3 text-xs text-mobility-secondary">
            No hi ha intervencions pendents.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
