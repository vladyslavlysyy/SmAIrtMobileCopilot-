'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface BatchPlannerFormProps {
  onAssigned?: () => Promise<void> | void;
}

export default function BatchPlannerForm({ onAssigned }: BatchPlannerFormProps) {
  const [visitId, setVisitId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssign = async () => {
    const vId = Number(visitId);
    const tId = Number(technicianId);

    if (!Number.isFinite(vId) || vId <= 0 || !Number.isFinite(tId) || tId <= 0) {
      toast.error('Introdueix IDs valids');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.manualAssignVisit({
        visit_id: vId,
        technician_id: tId,
      });
      toast.success('Assignacio manual aplicada');
      setVisitId('');
      setTechnicianId('');
      if (onAssigned) {
        await onAssigned();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No s\'ha pogut assignar la visita');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-mobility-border bg-white/90 p-4">
      <h3 className="text-sm font-semibold text-mobility-primary">Assignacio rapida</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={visitId}
          onChange={(e) => setVisitId(e.target.value)}
          placeholder="ID visita"
          className="rounded-lg border border-mobility-border px-3 py-2 text-sm"
          inputMode="numeric"
        />
        <input
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          placeholder="ID tecnic"
          className="rounded-lg border border-mobility-border px-3 py-2 text-sm"
          inputMode="numeric"
        />
        <button
          type="button"
          onClick={handleAssign}
          disabled={isSubmitting}
          className="rounded-lg bg-mobility-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Assignant...' : 'Assignar'}
        </button>
      </div>
    </section>
  );
}
