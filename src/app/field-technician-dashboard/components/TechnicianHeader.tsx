'use client';

import React, { useState } from 'react';
import { User, MapPin, Zap, Clock, Phone, X, Eye, ChevronDown, Check, Users } from 'lucide-react';
import { toast } from 'sonner';

// BASE DE DATOS FINTICIA DEL EQUIPO (Con toda la info intacta)
const TECHNICIANS = [
  { name: 'Marc Puigdomènech', vehicle: 'Renault Zoe · E-1247-TGN', status: 'En servei actiu', loc: 'Tarragona Centre', progress: '2 de 7 visites', pct: '28.6%', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/40' },
  { name: 'Laia Ferré', vehicle: 'Nissan Kangoo · E-9988-BCN', status: 'En servei actiu', loc: 'Reus Nord', progress: '4 de 6 visites', pct: '66.6%', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/40' },
  { name: 'Jordi Casals', vehicle: 'Peugeot e-Vito · E-3344-LLE', status: 'En pausa (Dinar)', loc: 'Salou', progress: '3 de 8 visites', pct: '37.5%', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' },
  { name: 'Núria Valls', vehicle: 'Renault Kangoo ZE · E-1122-GIR', status: 'Finalitzat', loc: 'Base Tarragona', progress: '5 de 5 visites', pct: '100%', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/40' },
  { name: 'Pau Ribas', vehicle: 'Nissan Leaf · E-5566-TAR', status: 'En ruta', loc: 'Cambrils', progress: '1 de 4 visites', pct: '25%', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
];

interface TechHeaderProps {
  selectedTech?: string;
  onSelect?: (techName: string) => void;
}

export default function TechnicianHeader({ selectedTech = 'Marc Puigdomènech', onSelect }: TechHeaderProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  // Encontramos los datos del técnico actual
  const techData = TECHNICIANS.find(t => t.name === selectedTech) || TECHNICIANS[0];

  const handleCall = (contact: string) => {
    setShowCallModal(false);
    toast.success(`Trucant a ${contact}...`, { description: 'Connexió establerta. Durada màxima: 10 min.' });
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-5 border-b border-slate-700 relative overflow-visible z-20">
        
        {/* Etiqueta Admin */}
        <div className="absolute top-0 right-0 bg-blue-600/20 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1 uppercase tracking-wider">
          <Eye size={10} /> Vista de Supervisió Admin
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 max-w-screen-2xl mx-auto mt-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-400/50 flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                
                {/* SELECTOR INTERACTIVO DE TÉCNICO */}
                <div className="relative">
                  <button 
                    onClick={() => setShowSelector(!showSelector)}
                    className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 -ml-2 rounded-lg transition-colors group"
                  >
                    <h1 className="text-white font-bold text-lg">{techData.name}</h1>
                    <ChevronDown size={14} className="text-slate-400 group-hover:text-white transition-colors" />
                  </button>

                  {/* El desplegable */}
                  {showSelector && onSelect && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSelector(false)} />
                      <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3 py-2 border-b border-slate-700/50 mb-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Users size={12}/> El teu Equip
                          </p>
                        </div>
                        {TECHNICIANS.map(t => (
                          <button
                            key={t.name}
                            onClick={() => { onSelect(t.name); setShowSelector(false); }}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/50 transition-colors text-left"
                          >
                            <span className={`text-sm font-medium ${t.name === selectedTech ? 'text-blue-400' : 'text-slate-200'}`}>
                              {t.name}
                            </span>
                            {t.name === selectedTech && <Check size={16} className="text-blue-400" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <span className={`px-2 py-0.5 ${techData.bg} border ${techData.border} ${techData.color} text-xs font-medium rounded-full`}>
                  {techData.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="flex items-center gap-1"><MapPin size={12} />{techData.loc}</span>
                <span className="flex items-center gap-1"><Clock size={12} />Torn: 08:00 – 17:00</span>
                <span className="flex items-center gap-1"><Zap size={12} />{techData.vehicle}</span>
              </div>
            </div>
          </div>

          {/* Botones y reloj de la derecha que te había quitado */}
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

        {/* Barra de progreso original que cambia dinámicamente */}
        <div className="mt-4 max-w-screen-2xl mx-auto">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Progrés de la jornada</span>
            <span className="font-mono">{techData.progress}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600/50">
            <div 
              className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700 ease-out" 
              style={{ width: techData.pct }} 
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>08:00</span>
            <span className="text-cyan-400 font-medium">↑ Ara: 11:36</span>
            <span>17:00</span>
          </div>
        </div>
      </div>

      {/* Modal de llamadas original */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Phone size={16} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-foreground">Contactar {techData.name.split(' ')[0]}</h3>
              </div>
              <button onClick={() => setShowCallModal(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Selecciona l'acció:</p>
              {[
                { name: `Trucar a ${techData.name}`, role: 'Mòbil d\'empresa', ext: '600 123 456' },
                { name: 'Enviar missatge urgent', role: 'Notificació a l\'App', ext: 'App Push' },
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