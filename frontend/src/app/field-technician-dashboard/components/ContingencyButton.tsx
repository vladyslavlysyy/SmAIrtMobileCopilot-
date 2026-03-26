'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Car,
  Package,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

const contingencyTypes = [
  {
    id: 'traffic',
    label: 'Trànsit / Accident',
    icon: Car,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  {
    id: 'material',
    label: 'Falta de material',
    icon: Package,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    id: 'delay',
    label: 'Retard en visita',
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 'other',
    label: 'Altre imprevisto',
    icon: MessageSquare,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
];

export default function ContingencyButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState('30');

  const handleSubmit = () => {
    if (!selectedType) {
      toast?.error("Selecciona el tipus d'imprevisto");
      return;
    }
    setIsSending(true);
    // Backend: POST /api/contingencies { technicianId, type: selectedType, description, delayMinutes }
    setTimeout(() => {
      setIsSending(false);
      setIsOpen(false);
      setSelectedType(null);
      setDescription('');
      toast?.success('Imprevisto reportat a Operacions', {
        description: "El departament ha rebut l'avís i proposa alternatives.",
      });
    }, 1500);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold rounded-xl transition-all duration-150 shadow-lg shadow-red-900/20"
      >
        <AlertTriangle size={18} />
        Reportar Imprevisto
      </button>
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <h3 className="font-bold text-foreground">Reportar Imprevisto</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Tipus d&apos;imprevisto <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {contingencyTypes?.map((type) => {
                    const Icon = type?.icon;
                    const isSelected = selectedType === type?.id;
                    return (
                      <button
                        key={`ctype-${type?.id}`}
                        onClick={() => setSelectedType(type?.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 text-left
                          ${
                            isSelected
                              ? `${type?.bg} ${type?.border} ${type?.color}`
                              : 'bg-muted/40 border-border text-muted-foreground hover:border-border/80'
                          }`}
                      >
                        <Icon size={16} className={isSelected ? type?.color : ''} />
                        <span className="text-xs font-medium">{type?.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delay estimate */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Retard estimat
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Quants minuts de retard preveus?
                </p>
                <div className="relative">
                  <select
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(e?.target?.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="15">15 minuts</option>
                    <option value="30">30 minuts</option>
                    <option value="45">45 minuts</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30min</option>
                    <option value="120">2 hores o més</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Descripció (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e?.target?.value)}
                  placeholder="Descriu breument la situació per ajudar a operacions a replantejar..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <AlertTriangle size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Operacions rebrà l&apos;avís immediatament i proposarà alternatives de
                  replantejament per a les visites afectades.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex items-center gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSending || !selectedType}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-150 active:scale-95
                  ${
                    isSending || !selectedType
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviant...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Reportar a Operacions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
