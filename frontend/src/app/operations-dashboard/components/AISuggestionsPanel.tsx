'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, PRIORITY_LABELS, type PlanningAssignResponse, type Visit } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

interface Suggestion {
  visit: Visit;
  planning: PlanningAssignResponse;
}

export default function AISuggestionsPanel() {
  const { visits, loadVisits } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const pendingTop = useMemo(() => {
    const score: Record<Visit['visit_type'], number> = {
      critical_corrective: 5,
      non_critical_corrective: 4,
      diagnosis: 3,
      commissioning: 2,
      maintenance: 1,
    };
    return [...visits]
      .filter((v) => v.status === 'pending')
      .sort((a, b) => score[b.visit_type] - score[a.visit_type])
      .slice(0, 3);
  }, [visits]);

  const loadSuggestions = async () => {
    if (visits.length === 0) {
      await loadVisits();
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        pendingTop.map(async (visit) => {
          const planning = await api.planningAssign({ visit_id: visit.id });
          return { visit, planning };
        })
      );
      setSuggestions(results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No s'han pogut generar suggeriments");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits.length]);

  const applySuggestion = async (s: Suggestion) => {
    const r = s.planning.recommended;
    try {
      await api.planningConfirm({
        visit_id: s.visit.id,
        technician_id: r.technician_id,
        proposed_date: r.proposed_date,
        insertion_index: r.insertion_index,
      });
      toast.success(`Visita #${s.visit.id} assignada a ${r.technician_name}`);
      await loadVisits();
      await loadSuggestions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No s'ha pogut aplicar suggeriment");
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Sparkles size={14} className="text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Suggeriments IA</h3>
            <p className="text-muted-foreground text-xs">{suggestions.length} recomanacions</p>
          </div>
        </div>
        <button
          onClick={loadSuggestions}
          className="p-1.5 text-muted-foreground hover:text-violet-600 hover:bg-violet-50 rounded-lg"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="divide-y divide-border max-h-72 overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="p-4 text-xs text-muted-foreground">Generant suggeriments...</div>
        )}

        {!loading && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <CheckCircle2 size={32} className="text-green-400 mb-2" />
            <p className="text-sm font-medium text-foreground">No hi ha suggeriments pendents</p>
          </div>
        )}

        {suggestions.map((s) => (
          <div key={s.visit.id} className="p-4 hover:bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Visita #{s.visit.id} · {PRIORITY_LABELS[s.visit.visit_type]}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Recomanat: {s.planning.recommended.technician_name} ·{' '}
              {new Date(s.planning.recommended.proposed_date).toLocaleString('ca-ES')} · pos{' '}
              {s.planning.recommended.insertion_index}
            </p>
            <button
              onClick={() => applySuggestion(s)}
              className="mt-3 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20"
            >
              Aplicar recomanació
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
