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
      correctivo_critico: 5,
      correctivo_no_critico: 4,
      diagnosi: 3,
      puesta_en_marcha: 2,
      preventivo: 1,
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
    <div className="bg-mobility-surface shadow-sm rounded-xl border border-mobility-border overflow-hidden shadow-[0_0_15px_rgba(0,200,81,0.05)]">
      <div className="px-5 py-4 border-b border-mobility-border flex items-center justify-between bg-mobility-primary/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-mobility-accent text-white/20 rounded-lg">
            <Sparkles size={16} className="text-mobility-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-mobility-primary text-sm">Suggeriments IA</h3>
            <p className="text-mobility-muted text-xs">{suggestions.length} recomanacions</p>
          </div>
        </div>
        <button
          onClick={loadSuggestions}
          className="p-2 text-mobility-muted hover:text-mobility-primary hover:bg-mobility-background rounded-lg transition-colors border border-transparent hover:border-mobility-border"
          title="Actualitzar suggeriments"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />     
        </button>
      </div>

      <div className="p-4 max-h-[350px] overflow-y-auto scrollbar-thin space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-mobility-accent border-t-transparent animate-spin mb-3"></div>
            <p className="text-sm text-mobility-muted">Generant optimització...</p>
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-mobility-primary/30 rounded-xl border border-mobility-border/50">
            <CheckCircle2 size={32} className="text-mobility-accent mb-3 opacity-80" />
            <p className="text-sm font-medium text-mobility-primary mb-1">Xarxa optimitzada</p>
            <p className="text-xs text-mobility-muted">No hi ha suggeriments pendents per aplicar.</p>
          </div>
        )}

        {!loading && suggestions.map((s) => (
          <div key={s.visit.id} className="relative bg-mobility-background overflow-hidden rounded-xl border-l-2 border-l-mobility-accent border border-mobility-border p-4 transition-all hover:border-mobility-accent/50 shadow-sm">
            <div className="absolute top-0 right-0 p-2 bg-mobility-accent/10 rounded-bl-lg">
              <Sparkles size={12} className="text-mobility-accent" />
            </div>
            
            <div className="pr-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-mobility-primary text-sm">Visita #{s.visit.id}</span>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-mobility-background text-mobility-muted rounded-md border border-mobility-border">
                  {PRIORITY_LABELS[s.visit.visit_type]}
                </span>
              </div>
              
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-mobility-muted w-16">Tecnic:</span>
                  <span className="font-medium text-mobility-primary">{s.planning.recommended.technician_name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-mobility-muted w-16">Moment:</span>
                  <span className="text-mobility-primary">{new Date(s.planning.recommended.proposed_date).toLocaleString('ca-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-mobility-muted w-16">Posició:</span>
                  <span className="text-mobility-primary">#{s.planning.recommended.insertion_index} en ruta</span>
                </div>
              </div>
              
              <button
                onClick={() => applySuggestion(s)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-mobility-accent text-white rounded-lg hover:brightness-110 transition-all"
              >
                Aplicar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
