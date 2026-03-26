'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronRight, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const suggestions = [
  {
    id: 'sug-001',
    priority: 'urgent',
    title: 'Assignar SAT-2847 immediatament',
    description: 'El correctiu crític de Tarragona porta 2h sense tècnic. SLA vence a les 12:00. Núria Valls és la més propera (5km).',
    action: 'Assignar a Núria Valls',
    confidence: 97,
  },
  {
    id: 'sug-002',
    priority: 'high',
    title: 'Agrupar visites Reus-Vila-seca',
    description: 'SAT-2851 i SAT-2871 estan a 8km de distància. Assignar-les a Laia Ferré estalviaria 23km i ~35min.',
    action: 'Agrupar i optimitzar',
    confidence: 89,
  },
  {
    id: 'sug-003',
    priority: 'medium',
    title: 'Replantejar ruta Marc Puigdomènech',
    description: 'Degut al trànsit a la N-340, proposem canviar l\'ordre de les visites: primer Salou, després Cambrils.',
    action: 'Aplicar ruta alternativa',
    confidence: 84,
  },
  {
    id: 'sug-004',
    priority: 'info',
    title: 'Preventius Reus per setmana vinent',
    description: '3 manteniments preventius a Reus poden agrupar-se en una sola jornada. Planificar per al 31/03.',
    action: 'Planificar jornada',
    confidence: 76,
  },
];

const priorityStyles: Record<string, { dot: string; label: string; badge: string }> = {
  urgent: { dot: 'bg-red-500', label: 'Urgent', badge: 'bg-red-100 text-red-700' },
  high: { dot: 'bg-amber-500', label: 'Alta', badge: 'bg-amber-100 text-amber-700' },
  medium: { dot: 'bg-blue-500', label: 'Mitjana', badge: 'bg-blue-100 text-blue-700' },
  info: { dot: 'bg-slate-400', label: 'Info', badge: 'bg-slate-100 text-slate-600' },
};

export default function AISuggestionsPanel() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);

  const visible = suggestions.filter((s) => !dismissed.includes(s.id));

  const handleApply = (id: string, action: string) => {
    setApplied((prev) => [...prev, id]);
    // Backend: POST /api/ai/suggestions/:id/apply
    toast.success(`Acció aplicada: ${action}`, { description: 'El pla s\'ha actualitzat automàticament.' });
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
    toast.info('Suggeriment descartat');
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
            <p className="text-muted-foreground text-xs">{visible.length} accions recomanades</p>
          </div>
        </div>
        <button
          onClick={() => toast.info('Analitzant dades...', { description: 'Generant nous suggeriments.' })}
          className="p-1.5 text-muted-foreground hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all duration-150"
          title="Actualitzar suggeriments"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="divide-y divide-border max-h-72 overflow-y-auto scrollbar-thin">
        {visible.map((sug) => {
          const style = priorityStyles[sug.priority];
          const isApplied = applied.includes(sug.id);
          return (
            <div key={sug.id} className={`p-4 transition-all duration-150 ${isApplied ? 'bg-green-50/50' : 'hover:bg-muted/30'}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`}></span>
                  <h4 className="text-sm font-semibold text-foreground truncate">{sug.title}</h4>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                    {sug.confidence}%
                  </span>
                  <button
                    onClick={() => handleDismiss(sug.id)}
                    className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{sug.description}</p>
              {isApplied ? (
                <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                  <CheckCircle2 size={12} />
                  Aplicat correctament
                </div>
              ) : (
                <button
                  onClick={() => handleApply(sug.id, sug.action)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {sug.action}
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <CheckCircle2 size={32} className="text-green-400 mb-2" />
            <p className="text-sm font-medium text-foreground">Tot optimitzat</p>
            <p className="text-xs text-muted-foreground mt-1">No hi ha suggeriments pendents</p>
          </div>
        )}
      </div>
    </div>
  );
}