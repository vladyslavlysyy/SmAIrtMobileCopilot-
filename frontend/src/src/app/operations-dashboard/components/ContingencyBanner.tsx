'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';

const contingencies = [
  {
    id: 'cont-001',
    type: 'traffic',
    message: 'Accident a la N-340 km 1156 — Tècnic Marc Puigdomènech afectat. Retard estimat: 45 min.',
    time: '10:47',
    technician: 'Marc Puigdomènech',
    impact: '3 visites en risc',
    severity: 'high',
  },
  {
    id: 'cont-002',
    type: 'material',
    message: 'Falta connector Mennekes Tipus 2 per a SAT-2847. Tècnic Laia Ferré sense material necessari.',
    time: '11:12',
    technician: 'Laia Ferré',
    impact: '1 visita bloquejada',
    severity: 'medium',
  },
];

export default function ContingencyBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = contingencies.filter((c) => !dismissed.includes(c.id));

  if (visible.length === 0) return null;

  const handleReplan = (id: string) => {
    // Backend: POST /api/operations/contingencies/:id/replan
    toast.success('Replantejament iniciat', {
      description: 'La IA ha generat 2 alternatives. Revisa el panell de suggeriments.',
    });
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
    toast.info('Imprevisto arxivat');
  };

  return (
    <div className="space-y-2">
      {visible.map((c) => (
        <div
          key={c.id}
          className={`flex items-start gap-3 p-4 rounded-xl border animate-slide-up
            ${c.severity === 'high' ?'bg-red-50 border-red-200' :'bg-amber-50 border-amber-200'
            }`}
        >
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${c.severity === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle size={16} className={c.severity === 'high' ? 'text-red-600 animate-pulse-warning' : 'text-amber-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-bold uppercase tracking-wide ${c.severity === 'high' ? 'text-red-700' : 'text-amber-700'}`}>
                Imprevisto detectat
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={10} />
                {c.time}
              </span>
            </div>
            <p className={`text-sm font-medium ${c.severity === 'high' ? 'text-red-800' : 'text-amber-800'}`}>
              {c.message}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Impacte: <span className="font-semibold">{c.impact}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleReplan(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 active:scale-95
                ${c.severity === 'high' ?'bg-red-600 text-white hover:bg-red-700' :'bg-amber-600 text-white hover:bg-amber-700'
                }`}
            >
              <RefreshCw size={12} />
              Replantejar
            </button>
            <button
              onClick={() => handleDismiss(c.id)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-black/5 transition-all duration-150"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}