'use client';

import React, { useState } from 'react';
import { AlertTriangle, Clock, MapPin, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, type ImprevistoSubmitRequest } from '@/lib/api';

export default function ContingencyButton({ technicianId }: { technicianId?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ImprevistoSubmitRequest>>({
    tipo: 'incidencia_adicional',
    descripcion: '',
    tiempo_perdido_min: 30,
    visit_id: 1 // Default or dynamically fetched
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      await api.submitImprevisto({
        visit_id: formData.visit_id || 1,
        tipo: formData.tipo || 'incidencia_adicional',
        descripcion: formData.descripcion || '',
        tiempo_perdido_min: formData.tiempo_perdido_min || 30
      });
      
      toast.success('Imprevist notificat', {
        description: 'La ruta s\'esta reajustant...'
      });
      setIsOpen(false);
    } catch (error) {
      toast.error('Error al notificar l\'imprevist');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center p-4 bg-mobility-accent text-white hover:brightness-110 rounded-full shadow-[0_6px_20px_rgba(0,162,219,0.35)] transition-transform hover:scale-105 active:scale-95"
      >
        <AlertTriangle size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mobility-primary/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-mobility-surface shadow-sm border border-mobility-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-mobility-border bg-mobility-background">
              <div className="flex items-center gap-2 text-mobility-primary font-bold">
                <AlertTriangle size={20} />
                <h2>Notificar Imprevist</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-mobility-primary rounded-lg text-mobility-muted hover:text-mobility-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-mobility-muted mb-2">
                  Tipus d'Imprevist
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'trafico', icon: MapPin, label: 'Transit' },
                    { id: 'material', icon: Wrench, label: 'Material' },
                    { id: 'cliente', icon: AlertTriangle, label: 'Client' },
                    { id: 'incidencia_adicional', icon: Clock, label: 'Altres' }
                  ].map((type) => {
                    const isSelected = formData.tipo === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: type.id as any })}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-mobility-accent/10 border-mobility-accent text-mobility-primary'
                            : 'bg-mobility-background border-mobility-border text-mobility-muted hover:border-mobility-accent/40'
                        }`}
                      >
                        <type.icon size={20} className="mb-1.5" />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-mobility-muted mb-1.5">
                  Temps addicional estimat (minuts)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={formData.tiempo_perdido_min}
                  onChange={(e) => setFormData({ ...formData, tiempo_perdido_min: parseInt(e.target.value) })}
                  className="w-full bg-mobility-background border border-mobility-border rounded-xl px-4 py-2.5 text-mobility-primary placeholder-mobility-muted focus:outline-none focus:border-mobility-accent focus:ring-1 focus:ring-mobility-accent/30 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-mobility-muted mb-1.5">
                  Descripcio de la situacio
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Explica breument que ha passat..."
                  rows={3}
                  className="w-full bg-mobility-background border border-mobility-border rounded-xl px-4 py-3 text-mobility-primary placeholder-mobility-muted/70 focus:outline-none focus:border-mobility-accent focus:ring-1 focus:ring-mobility-accent/30 transition-all resize-none text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-mobility-accent text-white hover:brightness-110 active:brightness-95 font-bold rounded-xl transition-all shadow-[0_8px_20px_rgba(0,162,219,0.28)] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Enviant...</span>
                  ) : (
                    <>
                      <AlertTriangle size={18} />
                      Notificar al Centre de Control
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
