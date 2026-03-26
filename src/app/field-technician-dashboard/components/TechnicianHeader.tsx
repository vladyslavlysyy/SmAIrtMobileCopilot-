'use client';

import React, { useState } from 'react';
import { User, MapPin, Zap, Clock, Phone, X } from 'lucide-react';
import { toast } from 'sonner';

export default function TechnicianHeader() {
  const [showCallModal, setShowCallModal] = useState(false);

  const handleCall = (contact: string) => {
    setShowCallModal(false);
    toast.success(`Trucant a ${contact}...`, { description: 'Connexió establerta. Durada màxima: 10 min.' });
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-5 border-b border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-400/50 flex items-center justify-center">
              <User size={22} className="text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-white font-bold text-lg">Marc Puigdomènech</h1>
                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-medium rounded-full">
                  En servei
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="flex items-center gap-1"><MapPin size={12} />Tarragona Centre</span>
                <span className="flex items-center gap-1"><Clock size={12} />Torn: 08:00 – 17:00</span>
                <span className="flex items-center gap-1"><Zap size={12} />Renault Zoe · E-1247-TGN</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-slate-400 text-xs">Dijous, 26 de Març</p>
              <p className="text-white font-bold text-lg font-mono tabular-nums">11:36</p>
            </div>
            <button
              onClick={() => setShowCallModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-all duration-150 active:scale-95"
            >
              <Phone size={14} />
              Operacions
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 max-w-screen-2xl mx-auto">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Progrés de la jornada</span>
            <span className="font-mono">2 de 7 visites completades</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: '28.6%' }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>08:00</span>
            <span className="text-cyan-400 font-medium">↑ Ara: 11:36</span>
            <span>17:00</span>
          </div>
        </div>
      </div>

      {/* Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Phone size={16} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-foreground">Contactar Operacions</h3>
              </div>
              <button onClick={() => setShowCallModal(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Selecciona el contacte:</p>
              {[
                { name: 'Central Operacions', role: 'Coordinació general', ext: '900 123 456' },
                { name: 'Responsable de Torn', role: 'Supervisió directa', ext: '900 123 457' },
                { name: 'Suport Tècnic', role: 'Assistència remota', ext: '900 123 458' },
              ].map((contact) => (
                <button
                  key={contact.name}
                  onClick={() => handleCall(contact.name)}
                  className="w-full flex items-center justify-between p-3 bg-muted/40 border border-border rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-all group"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{contact.ext}</span>
                    <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                      <Phone size={12} className="text-green-600 group-hover:text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border">
              <button onClick={() => setShowCallModal(false)} className="w-full py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all">
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}